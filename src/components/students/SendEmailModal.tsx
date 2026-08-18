import React, { useState } from 'react';
import { Student } from '../../types';
import { useData } from '../../context/DataContext';
import { Mail, Send, X, CheckCircle, AlertCircle, Sparkles, FileText, Bell } from 'lucide-react';

interface SendEmailModalProps {
  student: Student | null;
  onClose: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({ student, onClose }) => {
  const { academyConfig } = useData();

  const [toEmail, setToEmail] = useState(student?.email || '');
  const [subject, setSubject] = useState(`Comunicado BJJCRON — ${academyConfig.name || 'Academia Jiu-Jitsu'}`);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!student) return null;

  const handleApplyTemplate = (type: 'PAYMENT' | 'GRADUATION' | 'GENERAL') => {
    if (type === 'PAYMENT') {
      setSubject(`Aviso de Mensalidade — ${academyConfig.name}`);
      setBody(
        `Olá, ${student.name}!\n\nLembramos que a sua mensalidade do plano de Jiu-Jitsu está disponível para pagamento.\n\nPara manter seus treinos e presença em dia no tatame, favor efetuar o pagamento via PIX ou na recepção da academia.\n\nQualquer dúvida, estamos à disposição!\nOss!`
      );
    } else if (type === 'GRADUATION') {
      setSubject(`Convocação para Graduação de Faixa/Grau — ${academyConfig.name}`);
      setBody(
        `Parabéns, ${student.name}!\n\nVocê atingiu a frequência e o tempo de treino necessários para a sua nova graduação no Jiu-Jitsu (${student.belt}).\n\nContamos com a sua presença na próxima cerimônia de entrega de graus/faixas.\n\nTraga seu kimono oficial e continue firme no tatame!\nOss!`
      );
    } else {
      setSubject(`Comunicado Geral aos Atletas — ${academyConfig.name}`);
      setBody(
        `Atenção, ${student.name}!\n\nGostariamos de informar um aviso importante sobre os horários e eventos da nossa academia.\n\nFique atento aos próximos treinos e avisos nos murais.\n\nBons treinos!\nOss!`
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, insira o e-mail do aluno.' });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o assunto e a mensagem antes de enviar.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    let smtpConfig = null;
    try {
      const savedLocal = localStorage.getItem('bjjcron_smtp_config');
      if (savedLocal) {
        smtpConfig = JSON.parse(savedLocal);
      }
    } catch (e) {}

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          name: student.name,
          subject,
          body,
          academyName: academyConfig.name || 'BJJCRON Jiu-Jitsu',
          smtpConfig,
        }),
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Não foi possível ler a resposta do servidor.',
      }));

      if (response.ok && data?.success) {
        setFeedback({
          type: 'success',
          message: data.message || `E-mail enviado com SUCESSO via Gmail para ${toEmail}!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data?.message || 'Falha ao enviar e-mail pelo servidor. Verifique suas configurações em Configurações > Servidor de E-mail ou use o botão amarelo "Abrir no Gmail" abaixo.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha de comunicação com o servidor. Utilize o botão "Abrir no Gmail" abaixo para enviar diretamente de sua conta.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg">Enviar E-mail para Aluno</h3>
              <p className="text-xs text-slate-400">
                Notificação direta para <strong className="text-amber-300">{student.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <p className="text-xs font-medium leading-relaxed">{feedback.message}</p>
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Modelos Prontos de Mensagem:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('PAYMENT')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-[11px] font-bold text-slate-200 hover:text-amber-300 transition-all text-center flex flex-col items-center gap-1"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                Mensalidade
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('GRADUATION')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-[11px] font-bold text-slate-200 hover:text-amber-300 transition-all text-center flex flex-col items-center gap-1"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                Graduação
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('GENERAL')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-[11px] font-bold text-slate-200 hover:text-amber-300 transition-all text-center flex flex-col items-center gap-1"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                Aviso Geral
              </button>
            </div>
          </div>

          {/* Recipient Email */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">E-mail do Aluno:</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="exemplo@email.com"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Assunto do E-mail:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Digite o assunto"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mensagem:</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Escreva a mensagem que será enviada para a caixa de e-mail do aluno..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {/* Direct Gmail/Email Client Option */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="text-xs text-amber-200">
              <strong className="block text-amber-300 font-bold">💡 Envio Garantido via Gmail:</strong>
              <span className="text-[11px] text-slate-300">Abre seu Gmail com o e-mail do aluno e mensagem preenchidos para envio imediato.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!toEmail.trim()) {
                  setFeedback({ type: 'error', message: 'Por favor, insira o e-mail do aluno.' });
                  return;
                }
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(gmailUrl, '_blank');
                setFeedback({
                  type: 'success',
                  message: 'Janela do Gmail aberta! Clique em "Enviar" no seu Gmail para disparar o e-mail.',
                });
              }}
              className="shrink-0 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Abrir no Gmail
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoUrl;
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              Outro E-mail (Outlook/Apple)
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar pelo Servidor
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
