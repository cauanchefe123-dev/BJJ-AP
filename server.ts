import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, desc, or } from 'drizzle-orm';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_ATTENDANCE,
  INITIAL_PAYMENTS,
  INITIAL_BELT_REQUESTS,
  INITIAL_TRAINING_LOGS,
  INITIAL_TEACHER_OBSERVATIONS,
  INITIAL_ACADEMY_CONFIG,
  INITIAL_USERS,
} from './src/data/mockData.ts';

// Ensure uploads/videos directory exists on server
const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = 3000;

// Dynamic SMTP configuration (can be updated via UI or via environment variables)
let dynamicSmtpConfig: {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromName?: string;
  enabled?: boolean;
} = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER || process.env.GMAIL_USER || '',
  pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '',
  fromName: 'BJJCRON Sistema Jiu-Jitsu',
  enabled: Boolean(process.env.SMTP_USER || process.env.GMAIL_USER)
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // CORS headers for local development and iframe preview
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Serve uploads directory statically for streaming videos
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    acceptRanges: true,
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      } else if (filePath.endsWith('.mov')) {
        res.setHeader('Content-Type', 'video/quicktime');
      }
    }
  }));

  // ==========================================
  // VIDEO SERVER UPLOAD ENDPOINT
  // ==========================================
  app.post('/api/upload-video', express.raw({ limit: '500mb', type: '*/*' }), (req, res) => {
    try {
      const rawFilename = (req.query.filename as string) || (req.headers['x-filename'] as string) || 'video.mp4';
      const cleanName = rawFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}_${cleanName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      // Case 1: Binary Buffer from express.raw
      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        fs.writeFileSync(filePath, req.body);
        const serverUrl = `/uploads/videos/${uniqueFileName}`;
        console.log(`[VIDEO UPLOAD] Vídeo salvo com SUCESSO (${req.body.length} bytes): ${serverUrl}`);
        return res.json({ success: true, url: serverUrl });
      }

      // Case 2: JSON body with base64 fileData
      if (req.body && typeof req.body === 'object' && req.body.fileData) {
        const base64Data = req.body.fileData.replace(/^data:video\/\w+;base64,/, '').replace(/^data:application\/octet-stream;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        const serverUrl = `/uploads/videos/${uniqueFileName}`;
        console.log(`[VIDEO UPLOAD] Vídeo (Base64) salvo com SUCESSO: ${serverUrl}`);
        return res.json({ success: true, url: serverUrl });
      }

      // Case 3: Stream Pipe Fallback
      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        const serverUrl = `/uploads/videos/${uniqueFileName}`;
        console.log(`[VIDEO STREAM UPLOAD] Vídeo salvo com SUCESSO: ${serverUrl}`);
        return res.json({ success: true, url: serverUrl });
      });

      writeStream.on('error', (err) => {
        console.error('[VIDEO STREAM UPLOAD ERROR]', err);
        return res.status(500).json({ error: 'Erro ao gravar arquivo de vídeo: ' + err.message });
      });
    } catch (err: any) {
      console.error('[VIDEO UPLOAD ROUTE ERROR]', err?.message);
      return res.status(500).json({ error: 'Erro interno ao processar upload.' });
    }
  });

  // ==========================================
  // SMTP CONFIG & RECOVERY EMAIL ENDPOINTS
  // ==========================================
  app.get('/api/config/smtp', (req, res) => {
    res.json({
      host: dynamicSmtpConfig.host,
      port: dynamicSmtpConfig.port,
      user: dynamicSmtpConfig.user,
      fromName: dynamicSmtpConfig.fromName,
      enabled: dynamicSmtpConfig.enabled || Boolean(dynamicSmtpConfig.user && dynamicSmtpConfig.pass)
    });
  });

  app.post('/api/config/smtp', (req, res) => {
    const { host, port, user, pass, fromName } = req.body;
    const cleanUser = (user || '').trim();
    const cleanPass = (pass || '').trim().replace(/\s+/g, '');

    dynamicSmtpConfig = {
      host: host || 'smtp.gmail.com',
      port: Number(port) || 587,
      user: cleanUser,
      pass: cleanPass,
      fromName: fromName || 'BJJCRON ACADEMY',
      enabled: Boolean(cleanUser && cleanPass)
    };
    console.log(`[SMTP CONFIG UPDATED] user: ${dynamicSmtpConfig.user}, host: ${dynamicSmtpConfig.host}`);
    res.json({ success: true, config: { user: dynamicSmtpConfig.user, host: dynamicSmtpConfig.host, enabled: dynamicSmtpConfig.enabled } });
  });

  app.post('/api/config/smtp/test', async (req, res) => {
    try {
      const { host, port, user, pass, fromName, testEmail } = req.body;
      const smtpUser = (user || dynamicSmtpConfig.user || '').trim();
      const smtpPass = (pass || dynamicSmtpConfig.pass || '').trim().replace(/\s+/g, '');
      const smtpHost = host || dynamicSmtpConfig.host || 'smtp.gmail.com';
      const smtpPort = Number(port || dynamicSmtpConfig.port) || 587;
      const senderName = fromName || dynamicSmtpConfig.fromName || 'BJJCRON ACADEMY';

      if (!smtpUser || !smtpPass) {
        return res.status(400).json({
          success: false,
          message: 'Informe o E-mail e a Senha de App do Gmail (16 caracteres) antes de testar.'
        });
      }

      const isGmail = smtpHost.includes('gmail');
      const cleanPass = smtpPass.trim().replace(/\s+/g, '');

      // Try Port 465 (SSL/TLS) first, then Port 587 (STARTTLS)
      let sendResult: any = null;
      let lastError: any = null;

      const attemptPorts = isGmail
        ? [
            { host: 'smtp.gmail.com', port: 465, secure: true },
            { host: 'smtp.gmail.com', port: 587, secure: false }
          ]
        : [
            { host: smtpHost, port: smtpPort, secure: smtpPort === 465 },
            { host: smtpHost, port: 587, secure: false }
          ];

      for (const pConfig of attemptPorts) {
        try {
          console.log(`[SMTP TEST] Testando ${pConfig.host}:${pConfig.port} (secure: ${pConfig.secure})...`);
          const transporter = nodemailer.createTransport({
            ...pConfig,
            auth: { user: smtpUser, pass: cleanPass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
            tls: { rejectUnauthorized: false }
          });

          const targetRecipient = (testEmail || smtpUser).trim();

          const info = await transporter.sendMail({
            from: `"${senderName}" <${smtpUser}>`,
            to: targetRecipient,
            subject: '✅ BJJCRON — Conexão de E-mail Testada com Sucesso!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #334155;">
                <h2 style="color: #f59e0b; margin-top: 0; font-size: 20px;">✓ Servidor de E-mail Ativo!</h2>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                  O sistema <strong>BJJCRON</strong> conectou com sucesso à sua conta do Gmail (<strong>${smtpUser}</strong>) via porta ${pConfig.port}.
                </p>
                <div style="background: #1e293b; border: 1px solid #10b981; padding: 16px; border-radius: 12px; margin: 16px 0; color: #10b981; font-weight: bold; font-size: 13px;">
                  ✓ Disparos automáticos ativados para mensalidades, cobranças e avisos aos atletas.
                </div>
                <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
                <span style="font-size: 11px; color: #64748b;">E-mail gerado pelo BJJCRON em ${new Date().toLocaleString('pt-BR')}</span>
              </div>
            `
          });

          sendResult = { messageId: info.messageId, targetRecipient, port: pConfig.port };
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[SMTP TEST FAILED port ${pConfig.port}]`, err?.message);
        }
      }

      if (sendResult) {
        // Update in-memory config if test succeeds
        dynamicSmtpConfig = {
          host: smtpHost,
          port: sendResult.port,
          user: smtpUser,
          pass: cleanPass,
          fromName: senderName,
          enabled: true
        };

        return res.json({
          success: true,
          message: `E-mail de teste entregue com SUCESSO via porta ${sendResult.port} para ${sendResult.targetRecipient}! Verifique a caixa de entrada.`
        });
      }

      console.error('[SMTP TEST ERROR FINAL]', lastError?.message);
      let errMsg = lastError?.message || 'Erro ao conectar ao servidor de e-mail.';
      if (errMsg.includes('535') || errMsg.includes('BadCredentials') || errMsg.includes('Username and Password not accepted')) {
        errMsg = 'Senha de App incorreta ou rejeitada pelo Google. Ative a "Verificação em duas etapas" no Google e crie uma "Senha de app" de 16 caracteres em myaccount.google.com/apppasswords.';
      }
      return res.status(400).json({
        success: false,
        message: `Falha na autenticação do Gmail: ${errMsg}`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Erro interno ao testar SMTP: ${err?.message}`
      });
    }
  });

  app.post('/api/auth/recover-password', async (req, res) => {
    try {
      const { email, code, name, smtpConfig } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, message: 'E-mail e código são obrigatórios.' });
      }

      const recipientEmail = String(email).trim().toLowerCase();
      const recipientName = name || 'Atleta BJJCRON';

      const smtp = smtpConfig || dynamicSmtpConfig;
      const smtpUser = (smtp.user || '').trim();
      const smtpPass = (smtp.pass || '').trim().replace(/\s+/g, '');
      const smtpHost = smtp.host || 'smtp.gmail.com';
      const smtpPort = Number(smtp.port) || 587;
      const senderName = smtp.fromName || 'BJJCRON ACADEMY';

      const htmlContent = `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #f59e0b; color: #090d16; font-weight: 900; font-size: 20px; padding: 8px 20px; border-radius: 8px; letter-spacing: 2px;">
              BJJCRON
            </div>
          </div>
          <h2 style="color: #f59e0b; margin-bottom: 8px; font-size: 22px;">Recuperação de Senha</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Olá, <strong>${recipientName}</strong>.<br/>
            Recebemos uma solicitação para redefinir a senha da sua conta no sistema <strong>BJJCRON</strong>.
          </p>
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
            <span style="display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Seu Código de Segurança:</span>
            <span style="display: inline-block; font-size: 36px; font-weight: bold; color: #f59e0b; letter-spacing: 6px; font-family: monospace;">
              ${code}
            </span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
            Digite este código na tela de recuperação do sistema BJJCRON para criar uma nova senha.<br/>
            <em>Se você não solicitou esta redefinição, desconsidere este e-mail.</em>
          </p>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
          <div style="text-align: center; font-size: 11px; color: #64748b;">
            © ${new Date().getFullYear()} BJJCRON — Sistema Profissional para Academias de Jiu-Jitsu
          </div>
        </div>
      `;

      if (smtpUser && smtpPass) {
        try {
          console.log(`[BJJCRON EMAIL] Enviando e-mail REAL via SMTP (${smtpHost}) para ${recipientEmail}...`);
          const isGmail = smtpHost.includes('gmail');
          const transporter = nodemailer.createTransport(
            isGmail
              ? {
                  service: 'gmail',
                  auth: { user: smtpUser, pass: smtpPass },
                  connectionTimeout: 4000,
                  greetingTimeout: 4000,
                  socketTimeout: 5000,
                  tls: { rejectUnauthorized: false }
                }
              : {
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: { user: smtpUser, pass: smtpPass },
                  connectionTimeout: 4000,
                  greetingTimeout: 4000,
                  socketTimeout: 5000,
                  tls: { rejectUnauthorized: false }
                }
          );

          const mailOptions = {
            from: `"${senderName}" <${smtpUser}>`,
            to: recipientEmail,
            subject: `BJJCRON — Código de Recuperação: ${code}`,
            html: htmlContent
          };

          const info = await transporter.sendMail(mailOptions);
          console.log(`[BJJCRON EMAIL] E-mail enviado com sucesso via SMTP! MessageId: ${info.messageId}`);
          return res.json({
            success: true,
            method: 'smtp',
            message: `E-mail de recuperação enviado para ${recipientEmail}! Verifique sua caixa de entrada.`
          });
        } catch (smtpErr: any) {
          console.error(`[BJJCRON EMAIL] Erro SMTP:`, smtpErr?.message);
        }
      }

      // Fallback: Web Relay API
      try {
        const relayRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: `BJJCRON — Código de Recuperação: ${code}`,
            _template: 'box',
            Mensagem: `Seu código de segurança do BJJCRON é: ${code}. Digite na tela de recuperação para redefinir sua senha.`,
            Usuario: recipientName,
            Codigo_Verificacao: code,
          })
        });
        if (relayRes.ok) {
          return res.json({
            success: true,
            method: 'relay',
            message: `E-mail de recuperação enviado para ${recipientEmail}! Verifique a caixa de entrada ou spam.`
          });
        }
      } catch (e) {}

      // Ultimate Fallback
      return res.json({
        success: true,
        method: 'local_simulate',
        message: `Código de recuperação gerado: ${code}.`
      });
    } catch (error: any) {
      console.error(`[BJJCRON EMAIL] Erro ao enviar e-mail:`, error?.message);
      res.json({
        success: true,
        method: 'local_simulate',
        message: `Código de verificação gerado.`
      });
    }
  });

  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, name, subject, body, academyName, smtpConfig } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, message: 'E-mail, assunto e corpo são obrigatórios.' });
      }

      const recipientEmail = String(to).trim().toLowerCase();
      const recipientName = name || 'Atleta BJJCRON';
      const senderAcademy = academyName || 'BJJCRON Jiu-Jitsu';

      const smtp = smtpConfig || dynamicSmtpConfig;
      const smtpUser = (smtp.user || '').trim();
      const smtpPass = (smtp.pass || '').trim().replace(/\s+/g, '');
      const smtpHost = smtp.host || 'smtp.gmail.com';
      const smtpPort = Number(smtp.port) || 587;
      const senderName = smtp.fromName || senderAcademy;

      const formattedBody = String(body).replace(/\n/g, '<br/>');

      const htmlContent = `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #f59e0b; color: #090d16; font-weight: 900; font-size: 20px; padding: 8px 20px; border-radius: 8px; letter-spacing: 2px;">
              ${senderAcademy}
            </div>
          </div>
          <h2 style="color: #f59e0b; margin-bottom: 12px; font-size: 20px;">${subject}</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Olá, <strong>${recipientName}</strong>!
          </p>
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: left; margin: 20px 0; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
            ${formattedBody}
          </div>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
          <div style="text-align: center; font-size: 11px; color: #64748b;">
            © ${new Date().getFullYear()} ${senderAcademy} — Sistema Profissional BJJCRON
          </div>
        </div>
      `;

      // Attempt SMTP dispatch with dual ports (465 & 587)
      if (smtpUser && smtpPass) {
        const isGmail = smtpHost.includes('gmail');
        const cleanPass = smtpPass.trim().replace(/\s+/g, '');

        const attemptPorts = isGmail
          ? [
              { host: 'smtp.gmail.com', port: 465, secure: true },
              { host: 'smtp.gmail.com', port: 587, secure: false }
            ]
          : [
              { host: smtpHost, port: smtpPort, secure: smtpPort === 465 },
              { host: smtpHost, port: 587, secure: false }
            ];

        let sendResult: any = null;
        let lastError: any = null;

        for (const pConfig of attemptPorts) {
          try {
            console.log(`[BJJCRON EMAIL ALUNO] Disparando e-mail via ${pConfig.host}:${pConfig.port} para ${recipientEmail}...`);
            const transporter = nodemailer.createTransport({
              ...pConfig,
              auth: { user: smtpUser, pass: cleanPass },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 10000,
              tls: { rejectUnauthorized: false }
            });

            const info = await transporter.sendMail({
              from: `"${senderName}" <${smtpUser}>`,
              to: recipientEmail,
              subject: subject,
              html: htmlContent
            });

            sendResult = { messageId: info.messageId, port: pConfig.port };
            console.log(`[BJJCRON EMAIL ALUNO] Sucesso no envio SMTP via porta ${pConfig.port}! MessageId: ${info.messageId}`);
            break;
          } catch (smtpErr: any) {
            lastError = smtpErr;
            console.error(`[BJJCRON EMAIL ALUNO] Falha no SMTP porta ${pConfig.port}:`, smtpErr?.message);
          }
        }

        if (sendResult) {
          return res.json({
            success: true,
            method: 'smtp',
            message: `✅ E-mail enviado com SUCESSO via Gmail (${smtpUser}) para ${recipientEmail}! Verifique a caixa de entrada (ou spam) do aluno.`
          });
        }

        let errDetail = lastError?.message || 'Falha de conexão com o Gmail.';
        if (errDetail.includes('535') || errDetail.includes('BadCredentials') || errDetail.includes('Username and Password not accepted')) {
          errDetail = 'Senha de App incorreta ou rejeitada pelo Google. Ative a "Verificação em duas etapas" no Google e crie uma "Senha de app" de 16 caracteres em myaccount.google.com/apppasswords.';
        }

        return res.status(400).json({
          success: false,
          message: `❌ Falha ao enviar e-mail via servidor (${smtpUser}): ${errDetail}`
        });
      }

      // If no SMTP configured
      return res.status(400).json({
        success: false,
        message: '⚠️ Servidor de e-mail não configurado. Cadastre seu Gmail e Senha de App de 16 caracteres em Configurações > Servidor de E-mail, ou use o botão "Abrir no Gmail" abaixo.'
      });
    } catch (error: any) {
      console.error(`[BJJCRON EMAIL ALUNO] Erro geral:`, error?.message);
      return res.status(500).json({
        success: false,
        message: `Erro interno ao enviar e-mail: ${error?.message || 'Erro no servidor'}`
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, reason: 'NOT_FOUND', message: 'Por favor, informe seu e-mail.' });
      }
      const cleanEmail = String(email).trim().toLowerCase();

      // 1) Find user in schema.users
      let userList = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));
      let targetUser = userList[0];

      // 2) If not in schema.users, check students table in Postgres!
      if (!targetUser) {
        const studentList = await db.select().from(schema.students);
        const matchingStudent = studentList.find(s => s.email && s.email.trim().toLowerCase() === cleanEmail);
        if (matchingStudent) {
          const [created] = await db.insert(schema.users).values({
            uid: `uid-std-${matchingStudent.id}-${Date.now()}`,
            name: matchingStudent.name,
            email: cleanEmail,
            role: 'ALUNO',
            avatarUrl: matchingStudent.photoUrl || '',
            studentId: String(matchingStudent.id),
            phone: matchingStudent.phone || '',
            approvalStatus: 'APPROVED',
            password: password || '123',
            isActivated: true,
          }).returning();
          targetUser = created;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          reason: 'NOT_FOUND',
          message: 'E-mail não cadastrado! Por favor, solicite seu cadastro ao Mestre ou crie uma conta.'
        });
      }

      const inputPass = password ? String(password).trim() : '';
      const userPass = targetUser.password ? String(targetUser.password).trim() : '';

      // Validate password if user has password configured and it's not default '123'
      if (userPass && inputPass && userPass !== inputPass && userPass !== '123') {
        return res.status(401).json({
          success: false,
          reason: 'WRONG_PASSWORD',
          message: 'Senha incorreta. Verifique sua senha e tente novamente.'
        });
      }

      let finalPassword = userPass || inputPass || '123';
      if ((userPass === '123' || !userPass) && inputPass) {
        finalPassword = inputPass;
      }

      // Ensure user is activated in DB
      const [updatedUser] = await db.update(schema.users)
        .set({
          isActivated: true,
          password: finalPassword,
          approvalStatus: targetUser.approvalStatus || 'APPROVED'
        })
        .where(eq(schema.users.id, targetUser.id))
        .returning();

      return res.json({
        success: true,
        user: formatUserFromDb(updatedUser),
        message: `Bem-vindo(a) de volta, ${updatedUser.name}!`
      });
    } catch (err: any) {
      console.error('Error in /api/auth/login:', err?.message);
      return res.status(500).json({ success: false, message: 'Erro no servidor ao realizar login.' });
    }
  });

  app.post('/api/auth/first-access', async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
      }
      const cleanEmail = String(email).trim().toLowerCase();

      // 1) Verify if user exists in schema.users
      let userList = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));
      let targetUser = userList[0];

      // 2) If not found in users, check students table in Postgres!
      if (!targetUser) {
        const studentList = await db.select().from(schema.students);
        const matchingStudent = studentList.find(s => s.email && s.email.trim().toLowerCase() === cleanEmail);
        if (matchingStudent) {
          const [created] = await db.insert(schema.users).values({
            uid: `uid-std-${matchingStudent.id}-${Date.now()}`,
            name: matchingStudent.name,
            email: cleanEmail,
            role: 'ALUNO',
            avatarUrl: matchingStudent.photoUrl || '',
            studentId: String(matchingStudent.id),
            phone: matchingStudent.phone || '',
            approvalStatus: 'APPROVED',
            password: newPassword || '123',
            isActivated: true,
          }).returning();
          targetUser = created;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'E-mail não cadastrado no sistema! Por favor, realize o seu cadastro antes de acessar sua conta.'
        });
      }

      // Update user in Postgres
      const [updatedUser] = await db.update(schema.users)
        .set({
          password: newPassword || '123',
          isActivated: true,
          approvalStatus: 'APPROVED'
        })
        .where(eq(schema.users.id, targetUser.id))
        .returning();

      // Also update student approvalStatus in students table if linked
      if (targetUser.studentId) {
        const stdIdNum = parseInt(targetUser.studentId, 10);
        if (!isNaN(stdIdNum)) {
          await db.update(schema.students)
            .set({ approvalStatus: 'APPROVED' })
            .where(eq(schema.students.id, stdIdNum));
        }
      }

      res.json({
        success: true,
        user: formatUserFromDb(updatedUser),
        message: `Conta ativada com sucesso! Bem-vindo(a), ${updatedUser.name}.`
      });
    } catch (err: any) {
      console.error('Error activating first access:', err?.message);
      res.status(500).json({ success: false, message: 'Erro no servidor ao ativar o 1º acesso.' });
    }
  });

  // Health Check Endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Try a simple select to ensure DB connection
      const count = await db.select().from(schema.academies).limit(1);
      res.json({ status: 'ok', database: 'connected', postgres: true });
    } catch (error: any) {
      console.warn('Database check warning on /api/health:', error?.message);
      res.json({ status: 'ok', database: 'fallback_or_disconnected', error: error?.message });
    }
  });

  // ==========================================
  // ACADEMY CONFIG ENDPOINTS
  // ==========================================
  app.get('/api/academy-config', async (req, res) => {
    try {
      const records = await db.select().from(schema.academies).limit(1);
      if (records.length > 0) {
        const row = records[0];
        res.json({
          name: row.name,
          fantasyName: row.fantasyName,
          cnpj: row.cnpj || '',
          headCoachName: row.headCoachName || '',
          headCoachBelt: (row.headCoachBelt || 'PRETA') as any,
          phone: row.phone || '',
          email: row.email || '',
          address: row.address || '',
          logoUrl: row.logoUrl || '',
          pixKey: row.pixKey || '',
          graduationCriteria: INITIAL_ACADEMY_CONFIG.graduationCriteria,
          supabaseConfig: INITIAL_ACADEMY_CONFIG.supabaseConfig,
        });
      } else {
        // Seed default academy if empty
        const [inserted] = await db.insert(schema.academies).values({
          name: INITIAL_ACADEMY_CONFIG.name,
          fantasyName: INITIAL_ACADEMY_CONFIG.fantasyName,
          cnpj: INITIAL_ACADEMY_CONFIG.cnpj,
          headCoachName: INITIAL_ACADEMY_CONFIG.headCoachName,
          headCoachBelt: INITIAL_ACADEMY_CONFIG.headCoachBelt,
          phone: INITIAL_ACADEMY_CONFIG.phone,
          email: INITIAL_ACADEMY_CONFIG.email,
          address: INITIAL_ACADEMY_CONFIG.address,
          logoUrl: INITIAL_ACADEMY_CONFIG.logoUrl,
          pixKey: INITIAL_ACADEMY_CONFIG.pixKey,
        }).returning();

        res.json({
          name: inserted.name,
          fantasyName: inserted.fantasyName,
          cnpj: inserted.cnpj || '',
          headCoachName: inserted.headCoachName || '',
          headCoachBelt: (inserted.headCoachBelt || 'PRETA') as any,
          phone: inserted.phone || '',
          email: inserted.email || '',
          address: inserted.address || '',
          logoUrl: inserted.logoUrl || '',
          pixKey: inserted.pixKey || '',
          graduationCriteria: INITIAL_ACADEMY_CONFIG.graduationCriteria,
          supabaseConfig: INITIAL_ACADEMY_CONFIG.supabaseConfig,
        });
      }
    } catch (err: any) {
      console.warn('Error fetching /api/academy-config from Postgres:', err?.message);
      res.json(INITIAL_ACADEMY_CONFIG);
    }
  });

  app.put('/api/academy-config', async (req, res) => {
    try {
      const data = req.body;
      const records = await db.select().from(schema.academies).limit(1);
      if (records.length > 0) {
        await db.update(schema.academies)
          .set({
            name: data.name,
            fantasyName: data.fantasyName,
            cnpj: data.cnpj,
            headCoachName: data.headCoachName,
            headCoachBelt: data.headCoachBelt,
            phone: data.phone,
            email: data.email,
            address: data.address,
            logoUrl: data.logoUrl,
            pixKey: data.pixKey,
          })
          .where(eq(schema.academies.id, records[0].id));
      } else {
        await db.insert(schema.academies).values({
          name: data.name,
          fantasyName: data.fantasyName,
          cnpj: data.cnpj,
          headCoachName: data.headCoachName,
          headCoachBelt: data.headCoachBelt,
          phone: data.phone,
          email: data.email,
          address: data.address,
          logoUrl: data.logoUrl,
          pixKey: data.pixKey,
        });
      }
      res.json({ success: true, config: data });
    } catch (err: any) {
      console.error('Error updating academy config:', err?.message);
      res.status(500).json({ error: 'Failed to save to database' });
    }
  });

  // ==========================================
  // USERS ENDPOINTS
  // ==========================================
  app.get('/api/users', async (req, res) => {
    try {
      let all = await db.select().from(schema.users).orderBy(desc(schema.users.id));
      if (all.length === 0) {
        const cauanAdmin = INITIAL_USERS.find(u => u.email.includes('cauanchefe123'));
        if (cauanAdmin) {
          await db.insert(schema.users).values({
            uid: `uid-cauan-${Date.now()}`,
            name: cauanAdmin.name,
            email: cauanAdmin.email,
            role: 'ADMIN',
            avatarUrl: cauanAdmin.avatarUrl || '',
            studentId: null,
            phone: cauanAdmin.phone || '',
            approvalStatus: 'APPROVED',
            password: cauanAdmin.password || '123',
            isActivated: true,
          }).onConflictDoNothing();
          all = await db.select().from(schema.users).orderBy(desc(schema.users.id));
        }
      }
      res.json(all.map(formatUserFromDb));
    } catch (err: any) {
      console.error('Error fetching users:', err?.message);
      res.status(500).json({ error: 'Failed to fetch users from database' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const u = req.body;
      const [inserted] = await db.insert(schema.users).values({
        uid: u.uid || `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: u.name,
        email: u.email,
        role: u.role || 'ALUNO',
        avatarUrl: u.avatarUrl || '',
        studentId: u.studentId ? String(u.studentId) : null,
        phone: u.phone || '',
        approvalStatus: u.approvalStatus || 'APPROVED',
        password: u.password || '123',
        isActivated: u.isActivated ?? true,
      }).returning();
      res.status(201).json(formatUserFromDb(inserted));
    } catch (err: any) {
      console.error('Error creating user:', err?.message);
      res.status(500).json({ error: 'Failed to create user in database' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const u = req.body;
      const [updated] = await db.update(schema.users)
        .set({
          name: u.name,
          email: u.email,
          role: u.role,
          avatarUrl: u.avatarUrl,
          studentId: u.studentId ? String(u.studentId) : null,
          phone: u.phone,
          approvalStatus: u.approvalStatus,
          password: u.password,
          isActivated: u.isActivated,
        })
        .where(eq(schema.users.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.json(formatUserFromDb(updated));
    } catch (err: any) {
      console.error('Error updating user:', err?.message);
      res.status(500).json({ error: 'Failed to update user in database' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(schema.users).where(eq(schema.users.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting user:', err?.message);
      res.status(500).json({ error: 'Failed to delete user from database' });
    }
  });

  // ==========================================
  // STUDENTS ENDPOINTS
  // ==========================================
  app.get('/api/students', async (req, res) => {
    try {
      const all = await db.select().from(schema.students).orderBy(desc(schema.students.id));
      res.json(all.map(formatStudentFromDb));
    } catch (err: any) {
      console.warn('Postgres /api/students fallback:', err?.message);
      res.json([]);
    }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const s = req.body;
      const [inserted] = await db.insert(schema.students).values({
        registrationNumber: s.registrationNumber || `BJJ-${Date.now()}`,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        cpf: s.cpf || '',
        birthDate: s.birthDate || '',
        photoUrl: s.photoUrl || '',
        belt: s.belt || 'BRANCA',
        stripes: s.stripes || 0,
        startDate: s.startDate || new Date().toISOString().split('T')[0],
        totalClassesAttended: s.totalClassesAttended || 0,
        classesSinceLastGraduation: s.classesSinceLastGraduation || 0,
        weightCategory: s.weightCategory || 'MÉDIO',
        ageCategory: s.ageCategory || 'ADULTO',
        active: s.active ?? true,
        notes: s.notes || '',
        emergencyContact: s.emergencyContact || '',
        planName: s.planName || 'Mensal Padrão',
        planPrice: s.planPrice || 150,
        paymentDueDateDay: s.paymentDueDateDay || 10,
        paymentStatus: s.paymentStatus || 'PAGO',
        lastPaymentDate: s.lastPaymentDate || '',
        qrCodeToken: s.qrCodeToken || `token-${Date.now()}`,
        approvalStatus: s.approvalStatus || 'PENDING',
      }).returning();

      if (s.email && s.email.trim()) {
        try {
          const cleanEmail = s.email.trim().toLowerCase();
          const existing = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));
          if (existing.length === 0) {
            await db.insert(schema.users).values({
              uid: `uid-std-${inserted.id}-${Date.now()}`,
              name: s.name,
              email: cleanEmail,
              role: 'ALUNO',
              avatarUrl: s.photoUrl || '',
              studentId: String(inserted.id),
              phone: s.phone || '',
              approvalStatus: s.approvalStatus || 'APPROVED',
              password: '123',
              isActivated: false,
            });
          }
        } catch (uErr) {
          console.warn('Erro ao criar usuário para aluno no Postgres:', uErr);
        }
      }

      res.json(formatStudentFromDb(inserted));
    } catch (err: any) {
      console.error('Error creating student in Postgres:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed to create student' });
    }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      const idStr = req.params.id;
      const cleanIdStr = idStr.trim();
      const idNum = parseInt(cleanIdStr, 10);
      const numericPart = parseInt(cleanIdStr.replace(/\D/g, ''), 10);

      const updates = req.body;
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
      if (updates.birthDate !== undefined) dbUpdates.birthDate = updates.birthDate;
      if (updates.photoUrl !== undefined) dbUpdates.photoUrl = updates.photoUrl;
      if (updates.belt !== undefined) dbUpdates.belt = updates.belt;
      if (updates.stripes !== undefined) dbUpdates.stripes = updates.stripes;
      if (updates.startDate !== undefined) dbUpdates.startDate = updates.startDate;
      if (updates.totalClassesAttended !== undefined) dbUpdates.totalClassesAttended = updates.totalClassesAttended;
      if (updates.classesSinceLastGraduation !== undefined) dbUpdates.classesSinceLastGraduation = updates.classesSinceLastGraduation;
      if (updates.weightCategory !== undefined) dbUpdates.weightCategory = updates.weightCategory;
      if (updates.ageCategory !== undefined) dbUpdates.ageCategory = updates.ageCategory;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.emergencyContact !== undefined) dbUpdates.emergencyContact = updates.emergencyContact;
      if (updates.planName !== undefined) dbUpdates.planName = updates.planName;
      if (updates.planPrice !== undefined) dbUpdates.planPrice = updates.planPrice;
      if (updates.paymentDueDateDay !== undefined) dbUpdates.paymentDueDateDay = updates.paymentDueDateDay;
      if (updates.paymentStatus !== undefined) dbUpdates.paymentStatus = updates.paymentStatus;
      if (updates.lastPaymentDate !== undefined) dbUpdates.lastPaymentDate = updates.lastPaymentDate;
      if (updates.approvalStatus !== undefined) dbUpdates.approvalStatus = updates.approvalStatus;

      const conditions = [];
      if (!isNaN(idNum)) conditions.push(eq(schema.students.id, idNum));
      if (!isNaN(numericPart)) conditions.push(eq(schema.students.id, numericPart));
      conditions.push(eq(schema.students.registrationNumber, cleanIdStr));
      if (updates.email) conditions.push(eq(schema.students.email, updates.email.trim().toLowerCase()));

      if (conditions.length > 0) {
        await db.update(schema.students).set(dbUpdates).where(or(...conditions)).catch(() => {});
      }

      // Also update matching user in schema.users table
      if (dbUpdates.name || dbUpdates.email || dbUpdates.phone || dbUpdates.photoUrl || dbUpdates.approvalStatus) {
        const userUpdates: any = {};
        if (dbUpdates.name) userUpdates.name = dbUpdates.name;
        if (dbUpdates.email) userUpdates.email = dbUpdates.email.trim().toLowerCase();
        if (dbUpdates.phone) userUpdates.phone = dbUpdates.phone;
        if (dbUpdates.photoUrl) userUpdates.avatarUrl = dbUpdates.photoUrl;
        if (dbUpdates.approvalStatus) userUpdates.approvalStatus = dbUpdates.approvalStatus;

        const userConditions = [
          eq(schema.users.studentId, cleanIdStr),
          eq(schema.users.studentId, `std-${cleanIdStr}`),
        ];
        if (!isNaN(idNum)) userConditions.push(eq(schema.users.studentId, String(idNum)));
        if (!isNaN(numericPart)) userConditions.push(eq(schema.users.studentId, String(numericPart)));
        if (updates.email) userConditions.push(eq(schema.users.email, updates.email.trim().toLowerCase()));
        if (cleanIdStr.includes('@')) userConditions.push(eq(schema.users.email, cleanIdStr.toLowerCase()));

        await db.update(schema.users).set(userUpdates).where(or(...userConditions)).catch(() => {});
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error updating student:', err?.message);
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      const idStr = req.params.id;
      const idNum = parseInt(idStr, 10);
      const cleanIdStr = idStr.trim();
      const condition = !isNaN(idNum)
        ? or(
            eq(schema.students.id, idNum),
            eq(schema.students.registrationNumber, cleanIdStr),
            eq(schema.students.email, cleanIdStr.toLowerCase())
          )
        : or(
            eq(schema.students.registrationNumber, cleanIdStr),
            eq(schema.students.email, cleanIdStr.toLowerCase())
          );
      await db.delete(schema.students).where(condition);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting student:', err?.message);
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // TEACHERS ENDPOINTS
  // ==========================================
  app.get('/api/teachers', async (req, res) => {
    try {
      const all = await db.select().from(schema.teachers).orderBy(desc(schema.teachers.id));
      res.json(all.map(formatTeacherFromDb));
    } catch (err: any) {
      console.warn('Postgres /api/teachers fallback:', err?.message);
      res.json([]);
    }
  });

  app.post('/api/teachers', async (req, res) => {
    try {
      const t = req.body;
      const [inserted] = await db.insert(schema.teachers).values({
        name: t.name,
        email: t.email,
        phone: t.phone || '',
        belt: t.belt || 'PRETA',
        degrees: t.degrees || 0,
        specialty: t.specialty || 'BJJ',
        cref: t.cref || '',
        photoUrl: t.photoUrl || '',
        bio: t.bio || '',
        active: t.active ?? true,
        startDate: t.startDate || new Date().toISOString().split('T')[0],
      }).returning();
      res.json(formatTeacherFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/teachers/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      const updates = req.body;
      if (!isNaN(idNum)) {
        await db.update(schema.teachers).set(updates).where(eq(schema.teachers.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.teachers).where(eq(schema.teachers.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // CLASSES ENDPOINTS
  // ==========================================
  app.get('/api/classes', async (req, res) => {
    try {
      const all = await db.select().from(schema.classes);
      res.json(all.map(formatClassFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/classes', async (req, res) => {
    try {
      const c = req.body;
      const [inserted] = await db.insert(schema.classes).values({
        title: c.title,
        professorId: c.professorId || '1',
        professorName: c.professorName || 'Mestre',
        daysOfWeek: JSON.stringify(c.daysOfWeek || [1, 3, 5]),
        time: c.time || '19:00',
        durationMinutes: c.durationMinutes || 90,
        category: c.category || 'FUNDAMENTAL',
        maxCapacity: c.maxCapacity || 30,
        active: c.active ?? true,
        description: c.description || '',
      }).returning();
      res.json(formatClassFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/classes/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      const updates = req.body;
      if (!isNaN(idNum)) {
        await db.update(schema.classes).set(updates).where(eq(schema.classes.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/classes/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.classes).where(eq(schema.classes.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // ATTENDANCES ENDPOINTS
  // ==========================================
  app.get('/api/attendances', async (req, res) => {
    try {
      const all = await db.select().from(schema.attendances).orderBy(desc(schema.attendances.id));
      res.json(all.map(formatAttendanceFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/attendances', async (req, res) => {
    try {
      const a = req.body;
      const [inserted] = await db.insert(schema.attendances).values({
        studentId: a.studentId,
        studentName: a.studentName,
        classId: a.classId,
        className: a.className,
        date: a.date || new Date().toISOString().split('T')[0],
        timestamp: a.timestamp || new Date().toLocaleTimeString(),
        method: a.method || 'QR_CODE_STUDENT',
        verifiedBy: a.verifiedBy || '',
      }).returning();
      res.json(formatAttendanceFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/attendances/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.attendances).where(eq(schema.attendances.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // PAYMENTS ENDPOINTS
  // ==========================================
  app.get('/api/payments', async (req, res) => {
    try {
      const all = await db.select().from(schema.payments).orderBy(desc(schema.payments.id));
      res.json(all.map(formatPaymentFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/payments', async (req, res) => {
    try {
      const p = req.body;
      const [inserted] = await db.insert(schema.payments).values({
        studentId: p.studentId,
        studentName: p.studentName,
        amount: p.amount,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate || '',
        status: p.status || 'PENDENTE',
        paymentMethod: p.paymentMethod || 'PIX',
        referenceMonth: p.referenceMonth,
        receiptUrl: p.receiptUrl || '',
        pixCode: p.pixCode || '',
      }).returning();
      res.json(formatPaymentFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/payments/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      const updates = req.body;
      if (!isNaN(idNum)) {
        await db.update(schema.payments).set(updates).where(eq(schema.payments.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/payments/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.payments).where(eq(schema.payments.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // BELT REQUESTS ENDPOINTS
  // ==========================================
  app.get('/api/belt-requests', async (req, res) => {
    try {
      const all = await db.select().from(schema.beltRequests).orderBy(desc(schema.beltRequests.id));
      res.json(all.map(formatBeltRequestFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/belt-requests', async (req, res) => {
    try {
      const b = req.body;
      const [inserted] = await db.insert(schema.beltRequests).values({
        studentId: b.studentId,
        studentName: b.studentName,
        currentBelt: b.currentBelt,
        currentStripes: b.currentStripes,
        requestedBelt: b.requestedBelt,
        requestedStripes: b.requestedStripes,
        requestDate: b.requestDate || new Date().toISOString().split('T')[0],
        notes: b.notes || '',
        status: b.status || 'PENDING',
      }).returning();
      res.json(formatBeltRequestFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/belt-requests/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      const updates = req.body;
      if (!isNaN(idNum)) {
        await db.update(schema.beltRequests).set(updates).where(eq(schema.beltRequests.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/belt-requests/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.beltRequests).where(eq(schema.beltRequests.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // TRAINING LOGS ENDPOINTS
  // ==========================================
  app.get('/api/training-logs', async (req, res) => {
    try {
      const all = await db.select().from(schema.trainingLogs).orderBy(desc(schema.trainingLogs.id));
      res.json(all.map(formatTrainingLogFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/training-logs', async (req, res) => {
    try {
      const l = req.body;
      const [inserted] = await db.insert(schema.trainingLogs).values({
        studentId: l.studentId,
        date: l.date || new Date().toISOString().split('T')[0],
        durationMinutes: l.durationMinutes || 60,
        techniquesLearned: JSON.stringify(l.techniquesLearned || []),
        roundsCount: l.roundsCount || 4,
        notes: l.notes || '',
        moodRating: l.moodRating || 5,
      }).returning();
      res.json(formatTrainingLogFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/training-logs/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.trainingLogs).where(eq(schema.trainingLogs.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // TEACHER OBSERVATIONS ENDPOINTS
  // ==========================================
  app.get('/api/teacher-observations', async (req, res) => {
    try {
      const all = await db.select().from(schema.teacherObservations).orderBy(desc(schema.teacherObservations.id));
      res.json(all.map(formatObservationFromDb));
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post('/api/teacher-observations', async (req, res) => {
    try {
      const o = req.body;
      const [inserted] = await db.insert(schema.teacherObservations).values({
        studentId: o.studentId,
        studentName: o.studentName || '',
        teacherId: o.teacherId,
        teacherName: o.teacherName,
        date: o.date || new Date().toISOString().split('T')[0],
        title: o.title,
        content: o.content,
        category: o.category || 'GERAL',
      }).returning();
      res.json(formatObservationFromDb(inserted));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/teacher-observations/:id', async (req, res) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (!isNaN(idNum)) {
        await db.delete(schema.teacherObservations).where(eq(schema.teacherObservations.id, idNum));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // RESET / CLEAR ENDPOINTS
  // ==========================================
  app.post('/api/reset-data', async (req, res) => {
    try {
      await db.delete(schema.attendances);
      await db.delete(schema.payments);
      await db.delete(schema.beltRequests);
      await db.delete(schema.trainingLogs);
      await db.delete(schema.teacherObservations);
      await db.delete(schema.classes);
      await db.delete(schema.students);
      await db.delete(schema.teachers);
      await db.delete(schema.users);

      // Re-seed all tables
      for (const u of INITIAL_USERS) {
        await db.insert(schema.users).values({
          uid: `uid-${u.id}-${Date.now()}`,
          name: u.name,
          email: u.email,
          role: u.role || 'ALUNO',
          avatarUrl: u.avatarUrl || '',
          studentId: u.studentId ? String(u.studentId) : null,
          phone: u.phone || '',
          approvalStatus: u.approvalStatus || 'APPROVED',
          password: u.password || '123',
          isActivated: u.isActivated ?? true,
        }).onConflictDoNothing();
      }
      for (const s of INITIAL_STUDENTS) {
        await db.insert(schema.students).values({
          registrationNumber: s.registrationNumber,
          name: s.name, email: s.email, phone: s.phone, cpf: s.cpf,
          birthDate: s.birthDate, photoUrl: s.photoUrl, belt: s.belt,
          stripes: s.stripes, startDate: s.startDate,
          totalClassesAttended: s.totalClassesAttended,
          classesSinceLastGraduation: s.classesSinceLastGraduation,
          weightCategory: s.weightCategory, ageCategory: s.ageCategory,
          active: s.active, notes: s.notes, emergencyContact: s.emergencyContact,
          planName: s.planName, planPrice: s.planPrice,
          paymentDueDateDay: s.paymentDueDateDay, paymentStatus: s.paymentStatus,
          lastPaymentDate: s.lastPaymentDate, qrCodeToken: s.qrCodeToken,
          approvalStatus: s.approvalStatus || 'APPROVED',
        }).onConflictDoNothing();
      }
      for (const t of INITIAL_TEACHERS) {
        await db.insert(schema.teachers).values({
          name: t.name, email: t.email, phone: t.phone, belt: t.belt,
          degrees: t.degrees, specialty: t.specialty, cref: t.cref,
          photoUrl: t.photoUrl, bio: t.bio, active: t.active, startDate: t.startDate,
        }).onConflictDoNothing();
      }
      for (const c of INITIAL_CLASSES) {
        await db.insert(schema.classes).values({
          title: c.title, professorId: c.professorId, professorName: c.professorName,
          daysOfWeek: JSON.stringify(c.daysOfWeek), time: c.time,
          durationMinutes: c.durationMinutes, category: c.category,
          maxCapacity: c.maxCapacity, active: c.active, description: c.description,
        }).onConflictDoNothing();
      }
      for (const a of INITIAL_ATTENDANCE) {
        await db.insert(schema.attendances).values({
          studentId: a.studentId, studentName: a.studentName, classId: a.classId,
          className: a.className, date: a.date, timestamp: a.timestamp,
          method: a.method, verifiedBy: a.verifiedBy,
        }).onConflictDoNothing();
      }
      for (const p of INITIAL_PAYMENTS) {
        await db.insert(schema.payments).values({
          studentId: p.studentId, studentName: p.studentName, amount: p.amount,
          dueDate: p.dueDate, paymentDate: p.paymentDate, status: p.status,
          paymentMethod: p.paymentMethod, referenceMonth: p.referenceMonth,
          receiptUrl: p.receiptUrl, pixCode: p.pixCode,
        }).onConflictDoNothing();
      }

      res.json({ success: true, message: 'All tables reset to default BJJCRON data' });
    } catch (err: any) {
      console.error('Error in /api/reset-data:', err?.message);
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/clear-all-data', async (req, res) => {
    try {
      await db.delete(schema.attendances);
      await db.delete(schema.payments);
      await db.delete(schema.beltRequests);
      await db.delete(schema.trainingLogs);
      await db.delete(schema.teacherObservations);
      await db.delete(schema.classes);
      await db.delete(schema.students);
      await db.delete(schema.teachers);
      await db.delete(schema.users);
      res.json({ success: true, message: 'All tables emptied (Zero tests/robots)' });
    } catch (err: any) {
      console.error('Error in /api/clear-all-data:', err?.message);
      res.status(500).json({ error: err?.message });
    }
  });

  // ==========================================
  // SPOTIFY INTEGRATION ENDPOINTS (PKCE + Code Flow)
  // ==========================================
  app.get('/api/spotify/callback', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
<head><title>BJJCRON Spotify Auth</title></head>
<body style="background:#090d16;color:#10b981;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <h2 style="margin-bottom:8px;">Conectando Spotify ao Tatame...</h2>
    <p style="color:#94a3b8;font-size:14px;">Autenticado com sucesso! Fechando janela...</p>
  </div>
  <script>
    try {
      var hash = window.location.hash.substring(1);
      var hashParams = new URLSearchParams(hash);
      var searchParams = new URLSearchParams(window.location.search);
      
      var accessToken = hashParams.get('access_token');
      var expiresIn = hashParams.get('expires_in') || '3600';
      var code = searchParams.get('code') || hashParams.get('code');
      var error = searchParams.get('error') || hashParams.get('error');

      if (window.opener) {
        if (code) {
          window.opener.postMessage({ 
            type: 'SPOTIFY_AUTH_CODE', 
            code: code 
          }, '*');
        } else if (accessToken) {
          window.opener.postMessage({ 
            type: 'SPOTIFY_AUTH_SUCCESS', 
            accessToken: accessToken, 
            expiresIn: parseInt(expiresIn, 10) 
          }, '*');
        } else if (error) {
          window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: error }, '*');
        }
        setTimeout(function() { window.close(); }, 800);
      } else {
        if (accessToken) {
          localStorage.setItem('bjjcron_spotify_access_token', accessToken);
          localStorage.setItem('bjjcron_spotify_expires_at', String(Date.now() + parseInt(expiresIn, 10) * 1000));
        }
        window.location.href = '/';
      }
    } catch (e) {
      console.error(e);
    }
  </script>
</body>
</html>`);
  });

  app.post('/api/spotify/exchange', express.json(), async (req, res) => {
    try {
      const { code, client_id, redirect_uri, code_verifier } = req.body;
      const clientId = client_id || process.env.SPOTIFY_CLIENT_ID || '6fa5891513034ba082ef1ece2ee6cbde';
      
      const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect_uri || `${req.protocol}://${req.get('host')}/api/spotify/callback`,
        client_id: clientId,
        code_verifier: code_verifier || ''
      });

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to exchange token' });
    }
  });

  // Version check endpoint for PWA / Mobile live updates
  const SERVER_BUILD_ID = Date.now().toString();
  app.get('/api/version', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({
      version: SERVER_BUILD_ID,
      timestamp: Date.now(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Serve Service Worker with strict no-cache so phones detect changes immediately
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
  });

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
  });

  // Vite Middleware or Static Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BJJCRON Server running on http://0.0.0.0:${PORT} (PostgreSQL + Express)`);
  });
}

// Helpers for Drizzle -> Frontend types formatting
function formatStudentFromDb(row: any) {
  return {
    id: String(row.id),
    registrationNumber: row.registrationNumber,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    cpf: row.cpf || '',
    birthDate: row.birthDate || '',
    photoUrl: row.photoUrl || '',
    belt: row.belt as any,
    stripes: row.stripes || 0,
    startDate: row.startDate || '',
    totalClassesAttended: row.totalClassesAttended || 0,
    classesSinceLastGraduation: row.classesSinceLastGraduation || 0,
    weightCategory: row.weightCategory || 'MÉDIO',
    ageCategory: row.ageCategory || 'ADULTO',
    active: row.active ?? true,
    notes: row.notes || '',
    emergencyContact: row.emergencyContact || '',
    planName: row.planName || 'Mensal Padrão',
    planPrice: row.planPrice || 150,
    paymentDueDateDay: row.paymentDueDateDay || 10,
    paymentStatus: row.paymentStatus || 'PAGO',
    lastPaymentDate: row.lastPaymentDate || '',
    qrCodeToken: row.qrCodeToken || '',
    approvalStatus: row.approvalStatus || 'APPROVED',
  };
}

function formatTeacherFromDb(row: any) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    belt: row.belt as any,
    degrees: row.degrees || 0,
    specialty: row.specialty || '',
    cref: row.cref || '',
    photoUrl: row.photoUrl || '',
    bio: row.bio || '',
    active: row.active ?? true,
    startDate: row.startDate || '',
  };
}

function formatClassFromDb(row: any) {
  let days: number[] = [1, 3, 5];
  try {
    if (typeof row.daysOfWeek === 'string') {
      days = JSON.parse(row.daysOfWeek);
    } else if (Array.isArray(row.daysOfWeek)) {
      days = row.daysOfWeek;
    }
  } catch (e) {}
  return {
    id: String(row.id),
    title: row.title,
    professorId: row.professorId,
    professorName: row.professorName,
    daysOfWeek: days,
    time: row.time,
    durationMinutes: row.durationMinutes,
    category: row.category as any,
    maxCapacity: row.maxCapacity,
    active: row.active ?? true,
    description: row.description || '',
  };
}

function formatAttendanceFromDb(row: any) {
  return {
    id: String(row.id),
    studentId: row.studentId,
    studentName: row.studentName,
    classId: row.classId,
    className: row.className,
    date: row.date,
    timestamp: row.timestamp,
    method: row.method as any,
    verifiedBy: row.verifiedBy || '',
  };
}

function formatPaymentFromDb(row: any) {
  return {
    id: String(row.id),
    studentId: row.studentId,
    studentName: row.studentName,
    amount: row.amount,
    dueDate: row.dueDate,
    paymentDate: row.paymentDate || '',
    status: row.status as any,
    paymentMethod: row.paymentMethod as any,
    referenceMonth: row.referenceMonth,
    receiptUrl: row.receiptUrl || '',
    pixCode: row.pixCode || '',
  };
}

function formatBeltRequestFromDb(row: any) {
  return {
    id: String(row.id),
    studentId: row.studentId,
    studentName: row.studentName,
    currentBelt: row.currentBelt as any,
    currentStripes: row.currentStripes || 0,
    requestedBelt: row.requestedBelt as any,
    requestedStripes: row.requestedStripes || 0,
    requestDate: row.requestDate,
    notes: row.notes || '',
    status: row.status as any,
    reviewedBy: row.reviewedBy || '',
    reviewedAt: row.reviewedAt || '',
  };
}

function formatTrainingLogFromDb(row: any) {
  let techniques: string[] = [];
  try {
    if (typeof row.techniquesLearned === 'string') {
      techniques = JSON.parse(row.techniquesLearned);
    } else if (Array.isArray(row.techniquesLearned)) {
      techniques = row.techniquesLearned;
    }
  } catch (e) {}
  return {
    id: String(row.id),
    studentId: row.studentId,
    date: row.date,
    durationMinutes: row.durationMinutes,
    techniquesLearned: techniques,
    roundsCount: row.roundsCount || 4,
    notes: row.notes || '',
    moodRating: row.moodRating || 5,
  };
}

function formatObservationFromDb(row: any) {
  return {
    id: String(row.id),
    studentId: row.studentId,
    studentName: row.studentName || '',
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    date: row.date,
    title: row.title,
    content: row.content,
    category: row.category as any,
  };
}

function formatUserFromDb(row: any) {
  return {
    id: String(row.id),
    uid: row.uid || '',
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'ALUNO',
    avatarUrl: row.avatarUrl || '',
    studentId: row.studentId ? String(row.studentId) : undefined,
    phone: row.phone || '',
    password: row.password || '123',
    approvalStatus: row.approvalStatus || 'APPROVED',
    isActivated: row.isActivated ?? true,
  };
}

startServer();
