import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { saveAcademyToList } from '../academies/AcademyLinkView';
import { BeltType } from '../../types';
import { 
  Settings, Save, RefreshCw, Database, Shield, CheckCircle2, AlertCircle, 
  Upload, Image as ImageIcon, Sparkles, Users, UserCheck, UserX, Mail, 
  Phone, Clock, BadgeAlert, Award, ChevronRight, Trash2
} from 'lucide-react';

const LOGO_PRESETS = [
  {
    name: 'BJJ Shield Gold',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Jiu-Jitsu Crest',
    url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Black Belt Team',
    url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Tatame Lion',
    url: 'https://images.unsplash.com/photo-1564410267841-915d8e4d71ea?auto=format&fit=crop&q=80&w=300',
  },
];

export const AcademySettings: React.FC = () => {
  const { 
    academyConfig, 
    updateAcademyConfig, 
    resetToDefaultData, 
    clearAllDataToEmpty, 
    students, 
    updateStudent 
  } = useData();
  const { approveUser, rejectUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'smtp' | 'requests'>('info');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: academyConfig.name,
    fantasyName: academyConfig.fantasyName,
    cnpj: academyConfig.cnpj,
    headCoachName: academyConfig.headCoachName,
    phone: academyConfig.phone,
    email: academyConfig.email,
    address: academyConfig.address,
    pixKey: academyConfig.pixKey,
    logoUrl: academyConfig.logoUrl || '',
    supabaseUrl: academyConfig.supabaseConfig?.url || '',
    supabaseAnonKey: academyConfig.supabaseConfig?.anonKey || '',
  });

  const [smtpData, setSmtpData] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    fromName: academyConfig.fantasyName || academyConfig.name || 'BJJCRON ACADEMY',
  });
  const [smtpStatus, setSmtpStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingSmtp, setSavingSmtp] = useState(false);

  React.useEffect(() => {
    // Try fetching from server first, fallback to localStorage
    const savedLocal = localStorage.getItem('bjjcron_smtp_config');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        setSmtpData(prev => ({
          ...prev,
          ...parsed,
        }));
      } catch (e) {}
    }

    fetch('/api/config/smtp')
      .then(r => r.json())
      .then(data => {
        if (data && data.user) {
          setSmtpData(prev => ({
            ...prev,
            host: data.host || 'smtp.gmail.com',
            port: data.port || 587,
            user: data.user || '',
            fromName: data.fromName || 'BJJCRON ACADEMY',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSmtp(true);
    setSmtpStatus(null);

    const payload = {
      ...smtpData,
      fromName: smtpData.fromName || formData.fantasyName || formData.name || 'BJJCRON ACADEMY'
    };

    // Always persist locally for immediate resilience
    try {
      localStorage.setItem('bjjcron_smtp_config', JSON.stringify(payload));
    } catch (e) {}

    try {
      // First save config
      await fetch('/api/config/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Then test connection live
      const testRes = await fetch('/api/config/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const testData = await testRes.json();

      if (testRes.ok && testData?.success) {
        setSmtpStatus({
          type: 'success',
          message: `✅ Servidor Gmail ativado com SUCESSO! E-mail de teste enviado para ${payload.user}. Os disparos para atletas já estão ativos!`
        });
      } else {
        setSmtpStatus({
          type: 'error',
          message: testData?.message || '❌ Falha de autenticação no Gmail. Verifique a Senha de App de 16 caracteres.'
        });
      }
    } catch (err: any) {
      setSmtpStatus({
        type: 'success',
        message: '✅ Configurações salvas com sucesso no navegador!'
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);

  const pendingStudents = students.filter(s => s.approvalStatus === 'PENDING');

  const handleApproveStudent = (studentId: string, studentName: string) => {
    approveUser(studentId);
    updateStudent(studentId, { approvalStatus: 'APPROVED', active: true });
    setToastMsg(`✅ Aluno(a) ${studentName} aceito(a) na equipe! Agora ele já pode visualizar sua evolução em tempo real.`);
    setTimeout(() => setToastMsg(null), 6000);
  };

  const handleRejectStudent = (studentId: string, studentName: string) => {
    if (confirm(`Deseja recusa e remover a solicitação de ${studentName}?`)) {
      rejectUser(studentId);
      updateStudent(studentId, { approvalStatus: 'REJECTED', active: false });
      setToastMsg(`❌ Solicitação de ${studentName} foi recusada.`);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
              setFormData(prev => ({ ...prev, logoUrl: compressedUrl }));
            } else {
              setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
            }
          } catch (err) {
            setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
          }
        };
        img.onerror = () => {
          setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAcademyConfig({
      name: formData.name,
      fantasyName: formData.fantasyName,
      cnpj: formData.cnpj,
      headCoachName: formData.headCoachName,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      pixKey: formData.pixKey,
      logoUrl: formData.logoUrl,
      supabaseConfig: {
        url: formData.supabaseUrl,
        anonKey: formData.supabaseAnonKey,
        connected: Boolean(formData.supabaseUrl && formData.supabaseAnonKey),
      },
    });

    saveAcademyToList({
      name: formData.name,
      fantasyName: formData.fantasyName,
      logoUrl: formData.logoUrl,
      headCoachName: formData.headCoachName,
      address: formData.address,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getBeltColorBadge = (belt: BeltType) => {
    switch (belt) {
      case 'BRANCA':
        return 'bg-slate-100 text-slate-900 border border-slate-300';
      case 'AZUL':
        return 'bg-blue-600 text-white';
      case 'ROXA':
        return 'bg-purple-600 text-white';
      case 'MARROM':
        return 'bg-amber-800 text-white';
      case 'PRETA':
        return 'bg-slate-950 text-amber-400 border border-amber-500/50';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Academia, Logo & Solicitações da Equipe
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure dados da sua equipe, logomarca oficial e aprove solicitações de entrada de novos alunos.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'info'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Dados & Logo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'smtp'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            📧 Servidor de E-mail
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Solicitações na Equipe
            {pendingStudents.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'requests' 
                  ? 'bg-slate-950 text-amber-400' 
                  : 'bg-amber-500 text-slate-950 animate-pulse'
              }`}>
                {pendingStudents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Configurações salvas com sucesso!
        </div>
      )}

      {/* TAB 1: ACADEMY INFO & LOGO */}
      {activeTab === 'info' && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 text-xs shadow-lg">
          {/* Academy Logo Section */}
          <div className="space-y-4 border-b border-slate-800 pb-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Logo Oficial da Academia / Equipe
              </h4>
              <span className="text-[10px] text-slate-400">
                Exibido na barra lateral, carteirinhas e comprovantes
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              {/* Logo Preview Box */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-amber-500/60 p-1 flex items-center justify-center overflow-hidden shadow-xl">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo da Academia"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Shield className="w-8 h-8 text-amber-400 mx-auto mb-1" />
                      <span className="text-[9px] font-bold text-slate-400 block">Sem Logo</span>
                    </div>
                  )}
                </div>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 text-white text-[10px] shadow-md hover:bg-rose-500 transition-all"
                    title="Remover Logo"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Upload Options */}
              <div className="flex-1 space-y-3 w-full">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">
                    1. Enviar arquivo do computador ou celular:
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all">
                    <Upload className="w-4 h-4" />
                    Upload da Logomarca (PNG / JPG / WebP)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">
                    2. Ou insira a URL da Imagem da Logo:
                  </label>
                  <input
                    type="url"
                    placeholder="https://sua-academia.com/logo.png"
                    value={formData.logoUrl}
                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Logo Presets */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] font-semibold block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Modelos de Escudos Pré-definidos:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {LOGO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: preset.url })}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[10px] text-slate-300 transition-all"
                      >
                        <img src={preset.url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academy Info */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-amber-400 border-b border-slate-800 pb-2">
              Dados Gerais da Academia
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Razão Social / Nome Oficial</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome Fantasia do Tatame</label>
                <input
                  type="text"
                  value={formData.fantasyName}
                  onChange={e => setFormData({ ...formData, fantasyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Mestre / Head Coach Responsável</label>
                <input
                  type="text"
                  value={formData.headCoachName}
                  onChange={e => setFormData({ ...formData, headCoachName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Chave PIX Oficial para Mensalidades</label>
                <input
                  type="text"
                  value={formData.pixKey}
                  onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp Contato</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Endereço da Academia</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Configuração de Servidor de E-mail (SMTP / Gmail) */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-amber-400">
                    Configuração de E-mail da Academia (SMTP / Gmail Automático)
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Cadastre o e-mail da sua academia para que o servidor envie notificações de mensalidade e recuperação de senha diretamente para os alunos.
                  </p>
                </div>
              </div>
            </div>

            {smtpStatus && (
              <div className={`p-3 rounded-xl border text-xs font-bold ${
                smtpStatus.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                {smtpStatus.message}
              </div>
            )}

            {/* Informações explicativas passo a passo */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200/90 space-y-1">
              <strong className="block text-amber-300 font-bold">📌 Como configurar com Gmail em 3 passos:</strong>
              <p>1. Acesse <strong>myaccount.google.com</strong> e vá em <strong>Segurança</strong>.</p>
              <p>2. Certifique-se de que a <strong>Verificação em 2 etapas</strong> está ativada.</p>
              <p>3. Pesquise por <strong>"Senhas de App"</strong> (App Passwords) no topo da conta Google, crie uma nova para "E-mail" e cole os 16 caracteres gerados no campo <em>"Senha de App do Gmail"</em> abaixo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-slate-300 font-bold block mb-1">E-mail do Remetente (ex: academia@gmail.com)</label>
                <input
                  type="email"
                  placeholder="suaacademia@gmail.com"
                  value={smtpData.user}
                  onChange={e => setSmtpData({ ...smtpData, user: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Senha de App do Gmail (16 caracteres)</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={smtpData.pass}
                  onChange={e => setSmtpData({ ...smtpData, pass: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Servidor SMTP (Host)</label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={smtpData.host}
                  onChange={e => setSmtpData({ ...smtpData, host: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Porta SMTP</label>
                <input
                  type="number"
                  placeholder="587"
                  value={smtpData.port}
                  onChange={e => setSmtpData({ ...smtpData, port: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-bold block mb-1">Nome Exibido no Remetente</label>
                <input
                  type="text"
                  placeholder="BJJCRON Jiu-Jitsu Academy"
                  value={smtpData.fromName}
                  onChange={e => setSmtpData({ ...smtpData, fromName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSmtp()}
                  disabled={savingSmtp}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingSmtp ? 'Salvando...' : 'Ativar E-mail Automático no Servidor'}
                </button>
              </div>
            </div>
          </div>

          {/* Supabase Integration Box */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-emerald-400">
                Conexão Supabase DB (Opcional)
              </h4>
            </div>
            <p className="text-slate-400 text-[11px]">
              O BJJCRON utiliza armazenamento persistente local (`localStorage`). Se desejar conectar a um projeto Supabase real, insira suas credenciais abaixo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={formData.supabaseUrl}
                  onChange={e => setFormData({ ...formData, supabaseUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Supabase Anon Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={formData.supabaseAnonKey}
                  onChange={e => setFormData({ ...formData, supabaseAnonKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SERVIDOR DE E-MAIL (GMAIL / SMTP) */}
      {activeTab === 'smtp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 text-xs shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-400">
                Configuração do Servidor de E-mails da Academia
              </h3>
              <p className="text-slate-400 text-xs">
                Cadastre o e-mail oficial da sua academia para disparar cobranças, avisos e notificações de graduação direto do servidor.
              </p>
            </div>
          </div>

          {smtpStatus && (
            <div className={`p-4 rounded-xl border text-xs font-bold ${
              smtpStatus.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {smtpStatus.message}
            </div>
          )}

          {/* Guia Profissional Passo a Passo do Gmail / SMTP */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Guia Oficial de Configuração de E-mail Automático (Gmail / SMTP)
              </h4>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Integração Nativa BJJCRON
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[11px] font-black">1</span>
                    Segurança Google
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Acesse <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold hover:text-amber-300">myaccount.google.com</a> no seu e-mail.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Passo 01/04</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[11px] font-black">2</span>
                    Autenticação 2FA
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Ative a <strong>Verificação em duas etapas</strong> na aba de Segurança.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Passo 02/04</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[11px] font-black">3</span>
                    Gerar Senha de App
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Pesquise por <strong>"Senhas de App"</strong> na busca da conta e crie uma para <em>BJJCRON</em>.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Passo 03/04</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[11px] font-black">4</span>
                    Cadastrar e Salvar
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Copie a chave de <strong>16 caracteres</strong> gerada e insira no formulário abaixo.
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Passo 04/04</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <div>
              <label className="text-slate-300 font-bold block mb-1.5">E-mail do Remetente (Gmail da Academia)</label>
              <input
                type="email"
                placeholder="suaacademia@gmail.com"
                value={smtpData.user}
                onChange={e => setSmtpData({ ...smtpData, user: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Senha de App do Gmail (16 caracteres)</label>
              <input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={smtpData.pass}
                onChange={e => setSmtpData({ ...smtpData, pass: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Servidor SMTP (Host)</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpData.host}
                onChange={e => setSmtpData({ ...smtpData, host: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Porta SMTP</label>
              <input
                type="number"
                placeholder="587"
                value={smtpData.port}
                onChange={e => setSmtpData({ ...smtpData, port: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1.5">Nome Exibido no Remetente</label>
              <input
                type="text"
                placeholder="BJJCRON Jiu-Jitsu Academy"
                value={smtpData.fromName}
                onChange={e => setSmtpData({ ...smtpData, fromName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-3">
              <button
                type="button"
                onClick={() => handleSaveSmtp()}
                disabled={savingSmtp}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingSmtp ? 'Ativando...' : 'Ativar Servidor de E-mail Automático'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT REQUESTS & REAL-TIME EVOLUTION LINK */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 flex items-start gap-3">
            <BadgeAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-amber-300 text-sm mb-1">
                Solicitações Pendentes para Entrar na Equipe ({pendingStudents.length})
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Ao clicar em <strong className="text-emerald-400">"Aceitar na Equipe"</strong>, o aluno é automaticamente aprovado no sistema e o vínculo com a sua academia é ativado no mesmo instante. A partir desse momento, ele já poderá fazer login e visualizar sua <strong className="text-amber-400">evolução em tempo real</strong> (presenças, graduação, faixa e cronograma de treinos) no portal do aluno.
              </p>
            </div>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-200">
                Nenhuma solicitação pendente
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No momento, todos os alunos pré-cadastrados ou que solicitaram entrada na equipe já foram aprovados e estão ativados no sistema.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Voltar aos Dados da Academia
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingStudents.map(student => (
                <div
                  key={student.id}
                  className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 hover:border-amber-500/70 transition-all shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={student.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt={student.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400/80 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-extrabold text-slate-100 text-base">
                          {student.name}
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {student.registrationNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          SOLICITAÇÃO PENDENTE
                        </span>
                      </div>

                      {/* Belt & Category */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${getBeltColorBadge(student.belt)}`}>
                          Faixa {student.belt} ({student.stripes} {student.stripes === 1 ? 'Grau' : 'Graus'})
                        </span>
                        <span className="text-slate-400 text-xs">
                          • {student.ageCategory} - Peso {student.weightCategory}
                        </span>
                      </div>

                      {/* Contact & Date */}
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                        {student.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            {student.email}
                          </span>
                        )}
                        {student.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-amber-400" />
                            {student.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Data: {new Date(student.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {student.notes && (
                        <p className="text-xs text-amber-200/90 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/20 mt-2">
                          💬 <strong>Obs:</strong> {student.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRejectStudent(student.id, student.name)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs transition-all"
                    >
                      <UserX className="w-4 h-4" />
                      Recusar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveStudent(student.id, student.name)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                      <UserCheck className="w-4 h-4" />
                      Aceitar na Equipe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

