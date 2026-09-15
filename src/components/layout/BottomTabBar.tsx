import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStudentForUser } from '../../constants/avatar';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  IdCard,
  Trophy,
  Timer,
  Menu,
  Sparkles,
  MessageSquareQuote,
} from 'lucide-react';
import { MenuCategoryTab } from './NavigationMenuModal';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebar?: () => void;
  onOpenQuickScan?: () => void;
  onOpenMenuModal?: (initialCategory?: MenuCategoryTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
  onOpenQuickScan,
  onOpenMenuModal,
}) => {
  const { currentUser } = useAuth();
  const { students, teacherObservations, payments } = useData();

  if (!currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const isPendingStudent = currentUser.role === 'ALUNO' && (currentUser.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING');

  if (isPendingStudent) return null;

  // Total alert badges
  const pendingStudentsCount = currentUser.role === 'ADMIN' ? students.filter(s => s.approvalStatus === 'PENDING').length : 0;
  const overduePaymentsCount = currentUser.role === 'ADMIN' ? payments.filter(p => p.status === 'ATRASADO').length : 0;
  const unreadObsCount = currentUser.role === 'ALUNO' && currentStudent
    ? teacherObservations.filter(obs =>
        (obs.studentId === currentStudent.id || obs.studentId === currentUser.studentId || (obs.studentName && currentStudent.name && obs.studentName.toLowerCase() === currentStudent.name.toLowerCase())) &&
        !obs.read &&
        (!obs.readBy || !obs.readBy.includes(currentUser.id))
      ).length
    : 0;

  const totalMenuBadges = pendingStudentsCount + overduePaymentsCount + unreadObsCount;

  // Determine bottom navigation tabs per role
  let tabs: Array<{
    id: string;
    label: string;
    icon: any;
    isAction?: boolean;
    isMenuTrigger?: boolean;
    defaultCategory?: MenuCategoryTab;
  }> = [];

  if (currentUser.role === 'ALUNO') {
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'card', label: 'Carteirinha', icon: IdCard },
      { id: 'scan-action', label: 'Presença', icon: UserCheck, isAction: true },
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'observations', label: 'Obs Professor', icon: MessageSquareQuote },
    ];
  } else if (currentUser.role === 'PROFESSOR') {
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'attendance', label: 'Presenças', icon: UserCheck },
      { id: 'scan-action', label: 'Check-in', icon: UserCheck, isAction: true },
      { id: 'timer', label: 'Tatame', icon: Timer },
      { id: 'observations', label: 'Obs Alunos', icon: MessageSquareQuote },
    ];
  } else {
    // ADMIN
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'students', label: 'Alunos', icon: Users },
      { id: 'attendance', label: 'Frequência', icon: UserCheck },
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'observations', label: 'Obs do Mestre', icon: MessageSquareQuote },
    ];
  }

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.isMenuTrigger) {
      if (onOpenMenuModal) {
        onOpenMenuModal(tab.defaultCategory || 'training');
      } else if (onOpenSidebar) {
        onOpenSidebar();
      }
      return;
    }

    setActiveTab(tab.id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around lg:hidden print:hidden shadow-2xl safe-area-inset-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              onClick={() => onOpenQuickScan && onOpenQuickScan()}
              className="flex flex-col items-center justify-center -mt-5 relative group cursor-pointer focus:outline-none"
              title="Bater Frequência"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-black/40 border-2 border-slate-950 active:scale-95 transition-all">
                <Icon className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all cursor-pointer min-w-[50px] relative ${
              isActive
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={tab.label}
          >
            <div className="relative mb-0.5">
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />

              {/* Menu Badge */}
              {tab.isMenuTrigger && totalMenuBadges > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-950 shadow-xs">
                  {totalMenuBadges}
                </span>
              )}

              {/* Observations Badge */}
              {tab.id === 'observations' && unreadObsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-950 shadow-xs">
                  {unreadObsCount}
                </span>
              )}

              {/* Students Badge on Alunos Tab */}
              {tab.id === 'students' && pendingStudentsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-950 shadow-xs">
                  {pendingStudentsCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight truncate max-w-[65px] ${isActive ? 'text-amber-400 font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

