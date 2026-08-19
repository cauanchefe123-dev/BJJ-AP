import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DEFAULT_BLACK_GI_AVATAR, getUserAvatar, resolveStudentForUser } from '../../constants/avatar';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  QrCode,
  CalendarDays,
  IdCard,
  Trophy,
  Timer,
  BookOpen,
  FileBarChart2,
  Settings,
  LogOut,
  Award,
  MessageSquareQuote,
  Shield,
  GraduationCap,
  Edit3,
  Target,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenEditProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  onOpenEditProfile,
}) => {
  const { currentUser, logout } = useAuth();
  const { academyConfig, students } = useData();

  if (!currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const userAvatar = getUserAvatar(currentUser, currentStudent);
  const role = currentUser.role;

  const isPendingStudent = currentUser.role === 'ALUNO' && (currentUser.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING');

  // Categorized Navigation Items for pristine organization & easy visual scanning
  const mainNav = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'weekly-focus', label: 'Progresso & Técnicas', icon: Target, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'students-dashboard', label: 'Dashboard dos Alunos', icon: GraduationCap, roles: ['ADMIN'] },
  ];

  const trainingNav = [
    { id: 'attendance', label: 'Controle de Frequência', icon: UserCheck, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'classes', label: 'Turmas & Horários', icon: CalendarDays, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'timer', label: 'Cronômetro do Tatame', icon: Timer, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'ranking', label: 'Ranking da Academia', icon: Trophy, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'observations', label: 'Observações do Mestre', icon: MessageSquareQuote, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
  ];

  const studentSpecificNav = [
    { id: 'card', label: 'Carteirinha Digital', icon: IdCard, roles: ['ALUNO'] },
    { id: 'journal', label: 'Diário de Treinos', icon: BookOpen, roles: ['ALUNO'] },
    { id: 'academies', label: 'Vincular Academia', icon: Shield, roles: ['PROFESSOR', 'ALUNO'] },
  ];

  const adminNav = [
    { id: 'students', label: 'Alunos & Graduações', icon: Users, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'teachers', label: 'Professores & Staff', icon: UserCheck, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'reports', label: 'Relatórios & Métricas', icon: FileBarChart2, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
  ];

  const renderNavGroup = (title: string, items: typeof mainNav) => {
    if (isPendingStudent) {
      return null;
    }
    const visible = items.filter(item => item.roles.includes(role));
    if (visible.length === 0) return null;

    return (
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 mt-4 first:mt-1">
          {title}
        </p>
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 relative cursor-pointer group ${
                isActive
                  ? 'bg-slate-800/90 text-white font-bold border border-slate-700/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full shadow-xs"></span>
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 text-slate-200 flex flex-col justify-between transition-transform duration-200 ease-out lg:translate-x-0 print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-2 py-2.5 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={academyConfig.logoUrl || '/logo.svg'}
                alt={academyConfig.fantasyName || academyConfig.name || 'BJJCRON'}
                className="w-9 h-9 rounded-xl object-contain border border-slate-700/80 bg-slate-950 p-1 shrink-0 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-sm tracking-tight text-white truncate">
                  {academyConfig.fantasyName || 'BJJCRON'}
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold truncate uppercase">
                  {academyConfig.name || 'Jiu-Jitsu Academy'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden shrink-0 cursor-pointer"
              title="Fechar menu"
            >
              ✕
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mb-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2.5 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={userAvatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'PROFESSOR' ? 'Professor' : 'Atleta'}
                  </span>
                </div>
              </div>
            </div>

            {onOpenEditProfile && (
              <button
                onClick={onOpenEditProfile}
                className="p-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all text-xs font-bold shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Editar Perfil"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-0.5">
            {renderNavGroup('Principal', mainNav)}
            {renderNavGroup('Treino & Tatame', trainingNav)}
            {renderNavGroup('Área do Atleta', studentSpecificNav)}
            {renderNavGroup('Gestão & Configurações', adminNav)}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/70 space-y-2">
          <button
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg) await reg.update();
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
              } catch(e) {}
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-all active:scale-98 cursor-pointer"
            title="Atualizar aplicativo para a versão mais recente"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Atualizar App</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all active:scale-98 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
