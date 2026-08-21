import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getStoredAcademiesList } from '../academies/AcademyLinkView';
import { BeltType, AgeCategory, WeightCategory } from '../../types';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  UserPlus,
  KeyRound,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  User,
  ArrowRight,
  GraduationCap,
  Crown,
  Settings,
  Send
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    loginWithPassword,
    loginWithGoogle,
    firstAccessActivate,
    registerStudentSelfService,
    registerTeacherSelfService,
    registerAdminSelfService,
    deleteMyAccount,
    requestPasswordRecovery,
    resetPasswordWithCode,
    currentUser
  } = useAuth();
  const { academyConfig } = useData();

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOGIN' | 'FIRST_ACCESS' | 'RECOVER'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<'ALUNO' | 'PROFESSOR' | 'ADMIN'>('ALUNO');
  const availableAcademies = getStoredAcademiesList(academyConfig);

  // Form States - All clean without pre-filled test data
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessPassword, setFirstAccessPassword] = useState('');

  // Password Recovery State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'EMAIL' | 'CODE'>('EMAIL');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState<string | null>(null);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [simulatedEmailPopup, setSimulatedEmailPopup] = useState<{ email: string; code: string } | null>(null);

  // SMTP Configuration State (optional Gmail App Password setup)
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpConfigSaved, setSmtpConfigSaved] = useState(false);

  // Register Aluno State
  const [studentReg, setStudentReg] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    belt: 'BRANCA' as BeltType,
    ageCategory: 'ADULTO' as AgeCategory,
    weightCategory: 'MÉDIO' as WeightCategory,
    academyName: '',
  });

  // Register Teacher State
  const [teacherReg, setTeacherReg] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    belt: 'PRETA' as BeltType,
    degrees: 1,
    specialty: '',
  });

  // Register Master / Admin State
  const [adminReg, setAdminReg] = useState({
    name: '',
    academyName: '',
    email: '',
    phone: '',
    password: '',
    belt: 'PRETA' as BeltType,
  });

  // Alert Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const res = await loginWithPassword(loginEmail, loginPassword, rememberMe);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Login realizado com sucesso!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setFeedback({
        type: res.reason === 'PENDING' ? 'warning' : 'error',
        message: res.message || 'Falha na autenticação.'
      });
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setFeedback(null);
    try {
      const res = await loginWithGoogle(rememberMe);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Login com Google realizado com sucesso!' });
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setFeedback({
          type: res.reason === 'PENDING' ? 'warning' : 'error',
          message: res.message || 'Falha ao autenticar com a Conta Google.'
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro inesperado no login Google.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFirstAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!firstAccessEmail) return;

    const res = firstAccessActivate(firstAccessEmail, firstAccessPassword);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRecoveryEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!recoveryEmail) return;
    const res = requestPasswordRecovery(recoveryEmail);
    if (res.success) {
      setGeneratedRecoveryCode(res.code || '');
      setSimulatedEmailPopup({ email: recoveryEmail, code: res.code || '' });
      setRecoveryStep('CODE');
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRecoveryCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = resetPasswordWithCode(
      recoveryEmail,
      recoveryCodeInput,
      generatedRecoveryCode || '',
      recoveryNewPassword
    );
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setActiveTab('LOGIN');
      setLoginEmail(recoveryEmail);
      setLoginPassword(recoveryNewPassword);
      setSimulatedEmailPopup(null);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleSaveSmtpConfig = async () => {
    try {
      const res = await fetch('/api/config/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost || 'smtp.gmail.com',
          port: 587,
          user: smtpUser,
          pass: smtpPass,
          fromName: 'BJJCRON Jiu-Jitsu'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpConfigSaved(true);
        setFeedback({
          type: 'success',
          message: `Servidor SMTP configurado! O sistema agora enviará e-mails reais usando: ${smtpUser}`
        });
        setTimeout(() => setShowSmtpConfig(false), 1500);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao configurar servidor SMTP' });
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (selectedRole === 'ALUNO') {
      if (!studentReg.name.trim() || !studentReg.email.trim() || !studentReg.phone.trim() || !studentReg.password.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, preencha todos os campos obrigatórios (Nome, E-mail, Telefone e Senha).'
        });
        return;
      }
      const res = registerStudentSelfService(studentReg);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } else if (selectedRole === 'PROFESSOR') {
      if (!teacherReg.name.trim() || !teacherReg.email.trim() || !teacherReg.phone.trim() || !teacherReg.password.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, preencha todos os campos obrigatórios (Nome, E-mail, Telefone e Senha).'
        });
        return;
      }
      const res = registerTeacherSelfService(teacherReg);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } else if (selectedRole === 'ADMIN') {
      if (!adminReg.name.trim() || !adminReg.academyName.trim() || !adminReg.email.trim() || !adminReg.phone.trim() || !adminReg.password.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, preencha todos os campos obrigatórios (Nome da Academia, Nome, E-mail, Telefone e Senha).'
        });
        return;
      }
      const res = registerAdminSelfService(adminReg);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white space-y-6 shadow-2xl relative my-8">
        {/* Close Button if user is logged in */}
        {currentUser && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-0.5 mx-auto shadow-xl shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-100 tracking-tight">
            Portal de Cadastro & Acesso BJJCRON
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Cadastre-se para acessar como <span className="text-amber-400 font-bold">Mestre / Administrador</span>, <span className="text-blue-400 font-bold">Professor</span> ou <span className="text-emerald-400 font-bold">Aluno</span>.
          </p>
        </div>

        {/* Banner de Gerenciamento da Conta Atual */}
        {currentUser && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-bold shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Logado atualmente como:</p>
                <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  {currentUser.name}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentUser.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    currentUser.role === 'PROFESSOR' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {currentUser.role}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const res = deleteMyAccount();
                setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
                setActiveTab('REGISTER');
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              title="Excluir cadastro para recadastrar como outro perfil (Mestre, Professor ou Aluno)"
            >
              <X className="w-4 h-4 text-rose-400" />
              Excluir Conta & Recadastrar
            </button>
          </div>
        )}

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('REGISTER'); setFeedback(null); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'REGISTER'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar
          </button>

          <button
            onClick={() => { setActiveTab('LOGIN'); setFeedback(null); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LOGIN'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            Entrar
          </button>

          <button
            onClick={() => { setActiveTab('FIRST_ACCESS'); setFeedback(null); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'FIRST_ACCESS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            1º Acesso
          </button>
        </div>

        {/* Feedback Alert Box */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : feedback.type === 'warning'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">
                {feedback.type === 'success' ? 'Sucesso' : feedback.type === 'warning' ? 'Aguardando Liberação' : 'Atenção'}
              </p>
              <p className="text-slate-300 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* TAB 1: REGISTRATION */}
        {activeTab === 'REGISTER' && (
          <div className="space-y-5">
            {/* Role Choice Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Selecione o perfil que deseja cadastrar:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('ALUNO')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    selectedRole === 'ALUNO'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-xs">Aluno</span>
                  <span className="text-[10px] opacity-75">Atleta da Equipe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('PROFESSOR')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    selectedRole === 'PROFESSOR'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                  <span className="font-extrabold text-xs">Professor</span>
                  <span className="text-[10px] opacity-75">Instrutor de Turma</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    selectedRole === 'ADMIN'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-xs">Mestre / Admin</span>
                  <span className="text-[10px] opacity-75">Gestor / Dono</span>
                </button>
              </div>
            </div>

            {/* FORM FOR ALUNO */}
            {selectedRole === 'ALUNO' && (
              <div className="space-y-3.5 text-xs">
                {/* 1-Click Fast Register with Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-100 font-bold text-xs transition-all flex items-center justify-center gap-3 shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isGoogleLoading ? (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>{isGoogleLoading ? 'Criando conta com Google...' : 'Cadastrar com 1-Clique via Google'}</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-bold tracking-wider uppercase whitespace-nowrap">
                    ou preencha o formulário manual
                  </span>
                  <div className="border-t border-slate-800 w-full" />
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Cadastro de Novo Aluno / Atleta
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Preencha seus dados para criar sua conta de aluno.
                    </p>
                  </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu nome completo"
                    value={studentReg.name}
                    onChange={e => setStudentReg({ ...studentReg, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={studentReg.email}
                      onChange={e => setStudentReg({ ...studentReg, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      placeholder="(00) 00000-0000"
                      value={studentReg.phone}
                      onChange={e => setStudentReg({ ...studentReg, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Faixa Atual</label>
                    <select
                      value={studentReg.belt}
                      onChange={e => setStudentReg({ ...studentReg, belt: e.target.value as BeltType })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="BRANCA">Faixa Branca</option>
                      <option value="AZUL">Faixa Azul</option>
                      <option value="ROXA">Faixa Roxa</option>
                      <option value="MARROM">Faixa Marrom</option>
                      <option value="PRETA">Faixa Preta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Crie sua Senha *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={studentReg.password}
                      onChange={e => setStudentReg({ ...studentReg, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-amber-400 font-extrabold block text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Vincular-se à Academia / Equipe *
                  </label>
                  <select
                    value={studentReg.academyName || availableAcademies[0]?.name}
                    onChange={e => setStudentReg({ ...studentReg, academyName: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                  >
                    {availableAcademies.map(ac => (
                      <option key={ac.id} value={ac.name}>
                        {ac.name} — Prof. {ac.headCoachName} ({ac.city})
                      </option>
                    ))}
                  </select>

                  {/* Selected Academy Preview Card with Logo & Professor */}
                  {(() => {
                    const selectedAc = availableAcademies.find(
                      a => a.name === (studentReg.academyName || availableAcademies[0]?.name)
                    ) || availableAcademies[0];
                    if (!selectedAc) return null;
                    return (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                        <img
                          src={selectedAc.logoUrl}
                          alt={selectedAc.name}
                          className="w-10 h-10 rounded-lg object-cover border border-amber-400/80 shrink-0 bg-slate-900"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-100 truncate">{selectedAc.name}</p>
                          <p className="text-[11px] text-amber-400 font-semibold truncate">
                            Mestre / Prof: {selectedAc.headCoachName}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Cadastrar como Aluno
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

            {/* FORM FOR PROFESSOR */}
            {selectedRole === 'PROFESSOR' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    Cadastro de Professor / Instrutor
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Acesso para ministrar turmas, lançar presenças de aula e gerenciar alunos.
                  </p>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome Completo do Professor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu nome completo"
                    value={teacherReg.name}
                    onChange={e => setTeacherReg({ ...teacherReg, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={teacherReg.email}
                      onChange={e => setTeacherReg({ ...teacherReg, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      placeholder="(00) 00000-0000"
                      value={teacherReg.phone}
                      onChange={e => setTeacherReg({ ...teacherReg, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Graduação / Faixa</label>
                    <select
                      value={teacherReg.belt}
                      onChange={e => setTeacherReg({ ...teacherReg, belt: e.target.value as BeltType })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="PRETA">Faixa Preta</option>
                      <option value="MARROM">Faixa Marrom</option>
                      <option value="ROXA">Faixa Roxa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Crie sua Senha *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={teacherReg.password}
                      onChange={e => setTeacherReg({ ...teacherReg, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Especialidade / Estilo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Jiu-Jitsu, Gi & No-Gi"
                    value={teacherReg.specialty}
                    onChange={e => setTeacherReg({ ...teacherReg, specialty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Cadastrar como Professor
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* FORM FOR ADMIN / MESTRE */}
            {selectedRole === 'ADMIN' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Cadastro de Mestre / Administrador de Academia
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Acesso completo para gestão da sua academia, financeiro, turmas e graduações.
                  </p>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome da Sua Academia / Equipe *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Nome da sua academia"
                      value={adminReg.academyName}
                      onChange={e => setAdminReg({ ...adminReg, academyName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome do Mestre / Responsável *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu nome completo"
                    value={adminReg.name}
                    onChange={e => setAdminReg({ ...adminReg, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={adminReg.email}
                      onChange={e => setAdminReg({ ...adminReg, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      placeholder="(00) 00000-0000"
                      value={adminReg.phone}
                      onChange={e => setAdminReg({ ...adminReg, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Crie sua Senha de Acesso *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminReg.password}
                    onChange={e => setAdminReg({ ...adminReg, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Criar Conta de Mestre e Entrar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: LOGIN WITH PASSWORD */}
        {activeTab === 'LOGIN' && (
          <div className="space-y-4 text-xs">
            {/* Google Fast Sign-In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-100 font-bold text-xs transition-all flex items-center justify-center gap-3 shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Entrar com a Conta Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-bold tracking-wider uppercase whitespace-nowrap">
                ou com e-mail e senha
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold block">Senha de Acesso</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('RECOVER');
                      setRecoveryStep('EMAIL');
                      setRecoveryEmail(loginEmail);
                      setFeedback(null);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-semibold underline text-[11px] transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer accent-amber-500"
                  />
                  <span>Manter-me conectado neste dispositivo</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Entrar com E-mail
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: FIRST ACCESS */}
        {activeTab === 'FIRST_ACCESS' && (
          <form onSubmit={handleFirstAccessSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                Primeiro Acesso & Ativação de Conta
              </p>
              <p className="text-[11px] text-slate-300">
                Informe seu e-mail e crie sua senha de acesso. Sua conta será ativada instantaneamente para você entrar na plataforma!
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">E-mail Cadastrado *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={firstAccessEmail}
                  onChange={e => setFirstAccessEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Crie sua Senha *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Digite sua senha"
                  value={firstAccessPassword}
                  onChange={e => setFirstAccessPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Ativar Minha Conta & Entrar
            </button>
          </form>
        )}

        {/* TAB 4: PASSWORD RECOVERY */}
        {activeTab === 'RECOVER' && (
          <div className="space-y-4 text-xs">
            {recoveryStep === 'EMAIL' ? (
              <form onSubmit={handleRecoveryEmailSubmit} className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Recuperação de Senha por E-mail
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Digite o e-mail cadastrado na sua conta. Vamos enviar um código de segurança de 6 dígitos para redefinir sua senha.
                  </p>
                </div>

                {/* CONFIGURADOR SMTP OPCIONAL PARA ENVIO GMAIL REAL */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-xs font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      Configurar E-mail Remetente (Seu Gmail/SMTP)
                    </span>
                    <span className="text-[10px] text-amber-400/90 underline font-normal">
                      {showSmtpConfig ? 'Ocultar' : 'Configurar'}
                    </span>
                  </button>
                  {showSmtpConfig && (
                    <div className="p-3.5 border-t border-slate-800 space-y-3 bg-slate-950/80">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Para enviar as mensagens de recuperação direto pela sua conta do Gmail para a caixa dos seus alunos, digite seu e-mail e a <strong>Senha de App (16 letras)</strong> gerada no Google:
                      </p>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Seu E-mail Gmail Remetente</label>
                        <input
                          type="email"
                          placeholder="exemplo.academia@gmail.com"
                          value={smtpUser}
                          onChange={e => setSmtpUser(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Senha de App Google (16 caracteres)</label>
                        <input
                          type="password"
                          placeholder="xxxx xxxx xxxx xxxx"
                          value={smtpPass}
                          onChange={e => setSmtpPass(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveSmtpConfig}
                        className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Salvar e Ativar Envio Real pelo seu Gmail
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Seu E-mail Cadastrado *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Enviar Código por E-mail
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setFeedback(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all text-center"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRecoveryCodeSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Código Enviado para o seu E-mail
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Enviamos um código de 6 dígitos para <strong>{recoveryEmail}</strong>. Digite o código abaixo para criar sua nova senha.
                  </p>
                </div>

                {simulatedEmailPopup && (
                  <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs space-y-1.5 shadow-lg">
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-emerald-400" />
                        📧 E-mail Enviado (Simulador de Inbox)
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Agora
                      </span>
                    </div>
                    <p className="text-slate-200 text-[11px]">
                      Para: <strong className="text-white">{simulatedEmailPopup.email}</strong>
                    </p>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-extrabold">Seu código de recuperação:</p>
                        <p className="text-lg font-black text-amber-400 tracking-widest">{simulatedEmailPopup.code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecoveryCodeInput(simulatedEmailPopup.code)}
                        className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all"
                      >
                        Preencher Código
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Código de Segurança (6 dígitos) *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="000000"
                      value={recoveryCodeInput}
                      onChange={e => setRecoveryCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 font-mono text-center tracking-widest text-base font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nova Senha *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={3}
                      placeholder="Digite sua nova senha"
                      value={recoveryNewPassword}
                      onChange={e => setRecoveryNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Redefinir Senha & Entrar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStep('EMAIL');
                      setRecoveryCodeInput('');
                      setRecoveryNewPassword('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all text-center"
                  >
                    Voltar / Informar outro e-mail
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
