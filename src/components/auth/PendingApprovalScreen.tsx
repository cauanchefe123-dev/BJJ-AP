import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStudentForUser, getStudentAvatar } from '../../constants/avatar';
import { BeltBadge } from '../belts/BeltBadge';
import { Clock, ShieldAlert, LogOut, CheckCircle2, Phone, Mail, UserCheck, RefreshCw } from 'lucide-react';

interface PendingApprovalScreenProps {
  onOpenAuthModal?: () => void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ onOpenAuthModal }) => {
  const { currentUser, logout, deleteMyAccount } = useAuth();
  const { students, academyConfig } = useData();

  if (!currentUser) return null;

  const currentStudent = resolveStudentForUser(currentUser, students);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg animate-pulse">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Solicitação Enviada
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
              Aguardando Aprovação do Mestre
            </h2>
          </div>
        </div>

        {/* Academy Info Banner */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center gap-3.5">
          <img
            src={academyConfig.logoUrl || '/logo.svg'}
            alt="Logo"
            className="w-11 h-11 rounded-xl object-contain bg-slate-900 p-1 border border-slate-700 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-200 truncate">
              {academyConfig.fantasyName || academyConfig.name}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Responsável: Prof. {academyConfig.headCoachName || 'Mestre da Academia'}
            </p>
          </div>
        </div>

        {/* Student Requested Card */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Seus dados cadastrados:
          </p>
          <div className="flex items-center gap-3.5">
            <img
              src={getStudentAvatar(currentStudent)}
              alt={currentUser.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 text-sm truncate">{currentUser.name}</span>
                {currentStudent && (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
                    {currentStudent.registrationNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email}</p>
              {currentStudent && (
                <div className="mt-2">
                  <BeltBadge belt={currentStudent.belt} stripes={currentStudent.stripes} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Explanation */}
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <p className="font-bold text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            Acesso Restrito ao Tatame e Painel
          </p>
          <p>
            O seu cadastro foi enviado para a gerência da academia. Assim que o <strong>Professor ou Administrador</strong> aprovar a sua entrada na equipe, você terá acesso imediato à sua <strong>Carteirinha Digital</strong>, <strong>Diário de Treinos</strong>, <strong>Ranking</strong> e <strong>Check-in de Frequência</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Verificar se Fui Aprovado</span>
          </button>

          <button
            onClick={logout}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
};
