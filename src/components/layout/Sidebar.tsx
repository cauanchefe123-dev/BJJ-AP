import React, { useState } from 'react';
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
  Sparkles,
  Swords,
  Camera,
  CreditCard,
  ChevronDown,
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
  const { academyConfig, students, teacherObservations } = useData();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    training: true,
    student: true,
    management: true,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  if (!currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const userAvatar = getUserAvatar(currentUser, currentStudent);
  const role = currentUser.role;

  const isPendingStudent = currentUser.role === 'ALUNO' && (currentUser.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING');

  // Contagem de observações não lidas para o aluno atual
  const unreadObsCount = currentUser.role === 'ALUNO' && currentStudent
    ? teacherObservations.filter(obs =>
        (obs.studentId === currentStudent.id || obs.studentId === currentUser.studentId || (obs.studentName && currentStudent.name && obs.studentName.toLowerCase() === currentStudent.name.toLowerCase())) &&
        !obs.read &&
        (!obs.readBy || !obs.readBy.includes(currentUser.id))
      ).length
    : 0;

  // Categorized Navigation Items for pristine organization & easy visual scanning
  const mainNav = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'weekly-focus', label: 'Progresso & Técnicas', icon: Target, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'students-dashboard', label: 'Dashboard dos Alunos', icon: GraduationCap, roles: ['ADMIN'] },
  ];

  const trainingNav = [
    { id: 'gallery', label: 'Fotos dos Treinos', icon: Camera, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'graduations', label: 'Histórico & Graduações', icon: Award, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    { id: 'attendance', label: 'Controle de Frequência', icon: UserCheck, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'classes', label: 'Turmas & Horários', icon: CalendarDays, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'challenges', label: 'Desafios de Rola', icon: Swords, roles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
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
    { id: 'students', label: 'Alunos & Matrículas', icon: Users, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'teachers', label: 'Professores & Staff', icon: UserCheck, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'financial', label: 'Financeiro & Mensalidades', icon: CreditCard, roles: ['ADMIN'] },
    { id: 'reports', label: 'Relatórios & Métricas', icon: FileBarChart2, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
  ];

  const renderNavGroup = (
    key: string,
    title: string,
    icon: React.ElementType,
    items: typeof mainNav
  ) => {
    if (isPendingStudent) {
      return null;
    }
    const visible = items.filter(item => item.roles.includes(role));
    if (visible.length === 0) return null;

    const isGroupOpen = openSections[key] ?? true;
    const hasActiveChild = visible.some(item => item.id === activeTab);
    const GroupIcon = icon;

    return (
      <div key={key} className="mb-2">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
            hasActiveChild
              ? 'text-white bg-slate-800/80 border border-slate-700/70'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GroupIcon className={`w-4 h-4 shrink-0 ${hasActiveChild ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="truncate uppercase tracking-wider text-[11px] font-bold">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
              {visible.length}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isGroupOpen ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </div>
        </button>

        {/* Sub-items (Desce as opções quando aberto) */}
        {isGroupOpen && (
          <div className="mt-1 ml-3.5 pl-3 border-l-2 border-slate-800/80 space-y-1 py-1">
            {visible.map(item => {
              const ItemIcon = item.icon;
              const isActive = activeTab === item.id;
              const hasObservationBadge = item.id === 'observations' && unreadObsCount > 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer group ${
                    isActive
                      ? 'bg-[#0d213f] text-white font-semibold border border-blue-500/50 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {hasObservationBadge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-md animate-pulse shrink-0">
                      {unreadObsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs font-bold shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                title="Editar Perfil"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Accordion Groups */}
          <nav className="space-y-1">
            {renderNavGroup('main', 'Dashboards & Início', LayoutDashboard, mainNav)}
            {renderNavGroup('training', 'Treino & Tatame', Swords, trainingNav)}
            {renderNavGroup('student', 'Área do Atleta', IdCard, studentSpecificNav)}
            {renderNavGroup('management', 'Gestão & Administração', Shield, adminNav)}
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Atualizar aplicativo para a versão mais recente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Atualizar App</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-transparent hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
