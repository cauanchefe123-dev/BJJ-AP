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
  MessageSquareQuote,
} from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebar?: () => void;
  onOpenQuickScan?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickScan,
}) => {
  const { currentUser } = useAuth();
  const { students } = useData();

  if (!currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const isPendingStudent = currentUser.role === 'ALUNO' && (currentUser.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING');

  if (isPendingStudent) return null;

  // Determine bottom navigation tabs per role
  let tabs: Array<{ id: string; label: string; icon: any; isAction?: boolean }> = [];

  if (currentUser.role === 'ALUNO') {
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'card', label: 'Carteirinha', icon: IdCard },
      { id: 'scan-action', label: 'Presença', icon: UserCheck, isAction: true },
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'observations', label: 'Observações', icon: MessageSquareQuote },
    ];
  } else if (currentUser.role === 'PROFESSOR') {
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'attendance', label: 'Presenças', icon: UserCheck },
      { id: 'scan-action', label: 'Check-in', icon: UserCheck, isAction: true },
      { id: 'timer', label: 'Tatame', icon: Timer },
      { id: 'observations', label: 'Observações', icon: MessageSquareQuote },
    ];
  } else {
    // ADMIN
    tabs = [
      { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
      { id: 'students', label: 'Alunos', icon: Users },
      { id: 'attendance', label: 'Frequência', icon: UserCheck },
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'observations', label: 'Observações', icon: MessageSquareQuote },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around lg:hidden print:hidden shadow-2xl safe-area-inset-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.id === 'scan-action') {
          return (
            <button
              key={tab.id}
              onClick={() => onOpenQuickScan && onOpenQuickScan()}
              className="flex flex-col items-center justify-center -mt-5 relative group cursor-pointer focus:outline-none"
              title="Bater Frequência"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-slate-950 active:scale-95 transition-all">
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
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[54px] ${
              isActive
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={tab.label}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className={`text-[10px] tracking-tight truncate max-w-[62px] ${isActive ? 'text-amber-400 font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
