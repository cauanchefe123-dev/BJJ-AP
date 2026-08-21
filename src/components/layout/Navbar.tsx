import React, { useState } from 'react';
import { Menu, Bell, ShieldCheck, QrCode, Search, LogIn, UserCheck, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DEFAULT_BLACK_GI_AVATAR, getUserAvatar, resolveStudentForUser } from '../../constants/avatar';
import { NotificationCenter } from '../notifications/NotificationCenter';

interface NavbarProps {
  activeTab: string;
  onOpenSidebar: () => void;
  onOpenQuickScan?: () => void;
  onOpenDailyAttendance?: () => void;
  onOpenAuthModal?: () => void;
  isNotifOpen?: boolean;
  setIsNotifOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenSidebar,
  onOpenQuickScan,
  onOpenDailyAttendance,
  onOpenAuthModal,
  isNotifOpen: externalIsNotifOpen,
  setIsNotifOpen: externalSetIsNotifOpen,
}) => {
  const { currentUser, logout } = useAuth();
  const { academyConfig, students, payments, notifications } = useData();

  const [internalIsNotifOpen, setInternalIsNotifOpen] = useState(false);

  const isNotifOpen = externalIsNotifOpen !== undefined ? externalIsNotifOpen : internalIsNotifOpen;
  const setIsNotifOpen = externalSetIsNotifOpen || setInternalIsNotifOpen;

  const currentStudent = resolveStudentForUser(currentUser, students);
  const userAvatar = getUserAvatar(currentUser, currentStudent);

  const userId = currentUser?.id || 'guest';
  const unreadNotifsCount = notifications.filter(n => !n.readBy.includes(userId)).length;

  const tabTitles: Record<string, string> = {
    dashboard: 'Painel Geral',
    'weekly-focus': 'Progresso & Técnicas',
    'students-dashboard': 'Dashboard dos Alunos',
    attendance: 'Controle de Frequência',
    academies: 'Vincular Academia',
    students: 'Alunos & Graduações',
    teachers: 'Professores & Staff',
    classes: 'Turmas & Horários',
    card: 'Carteirinha Digital',
    journal: 'Diário de Treinos',
    observations: 'Observações do Professor',
    ranking: 'Ranking da Academia',
    timer: 'Cronômetro do Tatame',
    reports: 'Relatórios & Métricas',
    settings: 'Configurações',
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 text-white px-3.5 sm:px-6 py-3 flex items-center justify-between print:hidden shadow-md">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:bg-slate-800 lg:hidden shrink-0 transition-colors cursor-pointer"
            title="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img
                src={academyConfig.logoUrl || '/logo.svg'}
                alt="Logo"
                className="w-8 h-8 rounded-xl object-contain bg-slate-900 p-1 border border-slate-700/60 shadow-xs shrink-0"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight truncate">
                {tabTitles[activeTab] || 'BJJCRON'}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate font-medium">
                {academyConfig.fantasyName || academyConfig.name}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Daily Attendance Modal Button for Teachers/Admins */}
          {(currentUser?.role === 'PROFESSOR' || currentUser?.role === 'ADMIN') && onOpenDailyAttendance && (
            <button
              onClick={onOpenDailyAttendance}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs border border-slate-800 hover:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Ver Presenças do Dia"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Treinos de Hoje</span>
            </button>
          )}

          {/* Quick Checkin Button (Only for approved members) */}
          {onOpenQuickScan && !(currentUser?.role === 'ALUNO' && (currentUser?.approvalStatus === 'PENDING' || currentStudent?.approvalStatus === 'PENDING')) && (
            <button
              onClick={onOpenQuickScan}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/10 transition-all active:scale-95 cursor-pointer"
              title={currentUser?.role === 'ALUNO' ? 'Bater Frequência' : 'Registrar Presença'}
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span className="hidden sm:inline">
                {currentUser?.role === 'ALUNO' ? 'Bater Frequência' : 'Registrar Presença'}
              </span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-800 hover:border-slate-700 cursor-pointer shadow-xs"
            title="Notificações e Avisos"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Account / User Trigger Pill */}
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2.5 pl-3 border-l border-slate-800/80 hover:opacity-90 transition-all text-left cursor-pointer group"
            title="Gerenciar ou Trocar de Conta"
          >
            <div className="text-right hidden md:block">
              <span className="text-xs font-bold text-slate-200 block truncate max-w-[130px] group-hover:text-white transition-colors">
                {currentUser?.name || 'Entrar'}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center justify-end gap-1">
                <LogIn className="w-2.5 h-2.5" />
                {currentUser?.role === 'ADMIN' ? 'Administrador' : currentUser?.role === 'PROFESSOR' ? 'Professor' : 'Atleta'}
              </span>
            </div>

            <img
              src={userAvatar}
              alt="Avatar"
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700 group-hover:ring-amber-500/50 bg-slate-900 transition-all shadow-xs"
            />
          </button>
        </div>
      </header>

      {/* Notification Center Modal */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
