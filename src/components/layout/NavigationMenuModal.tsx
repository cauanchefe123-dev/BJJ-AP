import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStudentForUser, getUserAvatar } from '../../constants/avatar';
import {
  LayoutDashboard,
  Users,
  UserCheck,
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
  Target,
  RefreshCw,
  Swords,
  Camera,
  ChevronRight,
  X,
  CreditCard,
  CheckCircle2,
  Sparkles,
  QrCode,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Edit3,
} from 'lucide-react';

export type MenuCategoryTab = 'training' | 'students' | 'management' | 'general';

interface NavigationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tabId: string) => void;
  initialCategory?: MenuCategoryTab;
  onOpenEditProfile?: () => void;
  onOpenQuickScan?: () => void;
}

export const NavigationMenuModal: React.FC<NavigationMenuModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  initialCategory = 'training',
  onOpenEditProfile,
  onOpenQuickScan,
}) => {
  const { currentUser, logout } = useAuth();
  const { academyConfig, students, payments, teacherObservations } = useData();

  const [selectedCategory, setSelectedCategory] = useState<MenuCategoryTab>(initialCategory);

  // Sync initialCategory when opened
  React.useEffect(() => {
    if (isOpen && initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen || !currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const userAvatar = getUserAvatar(currentUser, currentStudent);
  const role = currentUser.role;

  // Pending counts
  const pendingStudentsCount = students.filter(s => s.approvalStatus === 'PENDING').length;
  const overduePaymentsCount = payments.filter(p => p.status === 'ATRASADO').length;
  const unreadObsCount = currentUser.role === 'ALUNO' && currentStudent
    ? teacherObservations.filter(obs =>
        (obs.studentId === currentStudent.id || obs.studentId === currentUser.studentId || (obs.studentName && currentStudent.name && obs.studentName.toLowerCase() === currentStudent.name.toLowerCase())) &&
        !obs.read &&
        (!obs.readBy || !obs.readBy.includes(currentUser.id))
      ).length
    : 0;

  // Options definition per category
  interface MenuOption {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    roles: Array<'ADMIN' | 'PROFESSOR' | 'ALUNO'>;
    badge?: string | number;
    badgeColor?: string;
  }

  const trainingOptions: MenuOption[] = [
    {
      id: 'attendance',
      title: role === 'ALUNO' ? 'Minha Frequência' : 'Controle de Frequência',
      description: role === 'ALUNO' ? 'Acompanhe suas aulas e presenças' : 'Chamada rápida diária e histórico de presenças',
      icon: UserCheck,
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'classes',
      title: 'Turmas & Horários',
      description: 'Grade horária de aulas, dias e instrutores',
      icon: CalendarDays,
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      roles: ['ADMIN', 'PROFESSOR'],
    },
    {
      id: 'timer',
      title: 'Cronômetro do Tatame',
      description: 'Timer oficial para rounds de rola e descansos (Exclusivo Professores)',
      icon: Timer,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      roles: ['ADMIN', 'PROFESSOR'],
    },
    {
      id: 'challenges',
      title: 'Desafios de Rola',
      description: 'Desafios no tatame entre atletas, histórico de rolas e estatísticas',
      icon: Swords,
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'gallery',
      title: 'Fotos dos Treinos',
      description: 'Galeria fotográfica de aulas, eventos e tatame',
      icon: Camera,
      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'weekly-focus',
      title: 'Progresso & Técnicas',
      description: 'Posições e estudos técnicos em foco na semana',
      icon: Target,
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'journal',
      title: 'Diário de Treinos',
      description: 'Anotações pessoais de técnicas e evolução',
      icon: BookOpen,
      color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      roles: ['ALUNO'],
    },
  ];

  const studentsOptions: MenuOption[] = [
    {
      id: 'students',
      title: 'Alunos & Matrículas',
      description: 'Cadastros, faixas, graus, contatos e dados',
      icon: Users,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      roles: ['ADMIN', 'PROFESSOR'],
      badge: pendingStudentsCount > 0 ? `${pendingStudentsCount} pendente${pendingStudentsCount > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'graduations',
      title: 'Histórico & Graduações',
      description: 'Linha do tempo de graus, certificados e faixas',
      icon: Award,
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'teachers',
      title: 'Professores & Staff',
      description: 'Instrutores, mestres e equipe da academia',
      icon: UserCheck,
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      roles: ['ADMIN', 'PROFESSOR'],
    },
    {
      id: 'card',
      title: 'Carteirinha Digital',
      description: 'Identificação oficial com QR Code de acesso',
      icon: IdCard,
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'students-dashboard',
      title: 'Dashboard dos Alunos',
      description: 'Visão analítica de status de matrículas e frequência',
      icon: GraduationCap,
      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      roles: ['ADMIN'],
    },
    {
      id: 'observations',
      title: role === 'ALUNO' ? 'Observações do Professor' : 'Observações do Mestre',
      description: role === 'ALUNO' ? 'Feedbacks e dicas deixadas para você' : 'Avisos e orientações aos alunos',
      icon: MessageSquareQuote,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
      badge: unreadObsCount > 0 ? `${unreadObsCount} nova${unreadObsCount > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-black animate-bounce',
    },
  ];

  const managementOptions: MenuOption[] = [
    {
      id: 'financial',
      title: 'Financeiro & Mensalidades',
      description: 'Controle de pagamentos, cobranças Pix e status',
      icon: CreditCard,
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      roles: ['ADMIN'],
      badge: overduePaymentsCount > 0 ? `${overduePaymentsCount} atraso${overduePaymentsCount > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'reports',
      title: 'Relatórios & Métricas',
      description: 'Estatísticas de frequência, retenção e crescimento',
      icon: FileBarChart2,
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      roles: ['ADMIN', 'PROFESSOR'],
    },
    {
      id: 'academies',
      title: 'Vincular Academia',
      description: 'Gestão de conexão entre filiais e unidades',
      icon: Shield,
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'settings',
      title: 'Configurações da Academia',
      description: 'Planos, regras de faixas, logo e dados cadastrais',
      icon: Settings,
      color: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      roles: ['ADMIN'],
    },
  ];

  const generalOptions: MenuOption[] = [
    {
      id: 'dashboard',
      title: role === 'ALUNO' ? 'Meu Painel' : 'Painel Geral',
      description: 'Visão executiva e resumo do dia da academia',
      icon: LayoutDashboard,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
    {
      id: 'ranking',
      title: 'Ranking da Academia',
      description: 'Classificação de assiduidade e pontos dos atletas',
      icon: Trophy,
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    },
  ];

  interface MenuCategoryItem {
    id: MenuCategoryTab;
    label: string;
    shortLabel: string;
    icon: any;
    options: MenuOption[];
    badgeCount?: number;
  }

  // Map category to options and label
  const rawCategories: MenuCategoryItem[] = [
    {
      id: 'training',
      label: 'Treino & Tatame',
      shortLabel: 'Treinos',
      icon: Swords,
      options: trainingOptions.filter(o => o.roles.includes(role)),
    },
    {
      id: 'students',
      label: role === 'ALUNO' ? 'Evolução & Avisos' : 'Alunos & Equipe',
      shortLabel: role === 'ALUNO' ? 'Atleta' : 'Alunos',
      icon: Users,
      options: studentsOptions.filter(o => o.roles.includes(role)),
      badgeCount: pendingStudentsCount + unreadObsCount,
    },
    {
      id: 'management',
      label: 'Gestão & Finanças',
      shortLabel: 'Gestão',
      icon: CreditCard,
      options: managementOptions.filter(o => o.roles.includes(role)),
      badgeCount: overduePaymentsCount,
    },
    {
      id: 'general',
      label: 'Geral & Mais',
      shortLabel: 'Geral',
      icon: Settings,
      options: generalOptions.filter(o => o.roles.includes(role)),
    },
  ];

  const categories: MenuCategoryItem[] = rawCategories.filter(c => c.options.length > 0 || c.id === 'general');

  // Selected options list
  const activeCategoryConfig = categories.find(c => c.id === selectedCategory) || categories[0];
  const activeOptions = activeCategoryConfig?.options || [];

  const handleSelectOption = (optionId: string) => {
    onNavigate(optionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center print:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-2xl bg-[#090e17] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Indicator */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img
                src={academyConfig.logoUrl || '/logo.svg'}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-slate-900 p-1.5 border border-slate-700/60 shadow-xs shrink-0"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight truncate">
                  Menu & Opções
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'PROFESSOR' ? 'Professor' : 'Aluno'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {academyConfig.fantasyName || academyConfig.name || 'BJJCRON'} • Selecione uma aba abaixo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="px-3 sm:px-5 pt-3 pb-2 bg-[#060a12] border-b border-slate-800/70">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isCatActive = selectedCategory === cat.id;
              const hasBadge = (cat.badgeCount || 0) > 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer select-none relative ${
                    isCatActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isCatActive ? 'stroke-[2.5]' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>

                  {hasBadge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                      isCatActive
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {cat.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              {activeCategoryConfig.label} ({activeOptions.length} opções)
            </span>
            <span className="text-[11px] text-slate-500">
              Clique em qualquer opção para abrir
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {activeOptions.map((option) => {
              const Icon = option.icon;
              const isCurrentlyActive = activeTab === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all group cursor-pointer relative overflow-hidden ${
                    isCurrentlyActive
                      ? 'bg-[#0d213f]/90 border-blue-500/60 shadow-lg shadow-blue-500/10'
                      : 'bg-[#0c1322]/80 hover:bg-[#111a2f] border-slate-800 hover:border-slate-700/90'
                  }`}
                >
                  {/* Left Icon */}
                  <div className={`p-2.5 rounded-xl border shrink-0 ${option.color} transition-transform group-hover:scale-105`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${isCurrentlyActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                        {option.title}
                      </span>
                      {isCurrentlyActive && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                          Aberto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {option.description}
                    </p>

                    {option.badge && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${option.badgeColor || 'bg-amber-500 text-slate-950 font-bold'}`}>
                          {option.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Chevron */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Quick Actions */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onOpenQuickScan && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickScan();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Bater Frequência</span>
              </button>
            )}

            {onOpenEditProfile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditProfile();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar Perfil</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition-all cursor-pointer"
              title="Atualizar App"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Atualizar</span>
            </button>

            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
