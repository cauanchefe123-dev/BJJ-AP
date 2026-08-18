import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Shield, GraduationCap, UserCheck, RefreshCw } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, switchRole, switchUser, users, deleteMyAccount } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="bg-slate-950 text-slate-200 border-b border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner z-50">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-amber-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Modo de Demonstração BJJCRON:
        </span>
        <span className="text-slate-400 hidden sm:inline">Alternar perfil ativo de teste:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => switchRole('ADMIN')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            currentUser.role === 'ADMIN'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Administrador
        </button>

        <button
          onClick={() => switchRole('PROFESSOR')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            currentUser.role === 'PROFESSOR'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Professor / Mestre
        </button>

        <button
          onClick={() => switchRole('ALUNO')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            currentUser.role === 'ALUNO'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Aluno
        </button>

        {currentUser.role === 'ALUNO' && (
          <select
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-slate-900 text-slate-200 border border-slate-700 rounded-md px-2 py-0.5 text-xs focus:ring-1 focus:ring-amber-400 outline-none"
          >
            {users.filter(u => u.role === 'ALUNO').map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => {
            deleteMyAccount();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 shadow-xs"
          title="Exclua seu cadastro atual para poder se cadastrar como Mestre, Professor ou Aluno com o mesmo e-mail"
        >
          <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
          Excluir Conta / Recadastrar
        </button>
      </div>
    </div>
  );
};
