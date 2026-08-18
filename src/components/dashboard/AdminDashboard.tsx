import React from 'react';
import { useData } from '../../context/DataContext';
import { BeltBadge } from '../belts/BeltBadge';
import { PendingStudentApprovals } from '../students/PendingStudentApprovals';
import { Users, CreditCard, Award, QrCode, TrendingUp, AlertCircle, CheckCircle, Calendar, ArrowUpRight, UserCheck } from 'lucide-react';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCheckin: () => void;
  onOpenDailyAttendance?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenCheckin, onOpenDailyAttendance }) => {
  const { students, payments, attendances, academyConfig } = useData();

  const totalActiveStudents = students.filter(s => s.active).length;
  
  // Financial metrics
  const totalMonthlyRevenue = payments
    .filter(p => p.status === 'PAGO')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPendingAmount = payments
    .filter(p => p.status === 'PENDENTE' || p.status === 'ATRASADO')
    .reduce((acc, p) => acc + p.amount, 0);

  const overdueCount = payments.filter(p => p.status === 'ATRASADO').length;

  // Belt distribution
  const beltCounts = students.reduce((acc, s) => {
    acc[s.belt] = (acc[s.belt] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Students ready for promotion (using individual target or default criteria)
  const studentsReadyForGraduation = students.filter(s =>
    isStudentEligibleForGraduation(s, academyConfig)
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter(a => a.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Visão Geral do Administrador
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {academyConfig.name}
          </h2>
          <p className="text-xs text-slate-400">
            Gestão estratégica de atletas, graduações, frequência e turmas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCheckin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-slate-900" />
            Registrar Presença
          </button>
          <button
            onClick={() => onNavigate('students')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition-all"
          >
            <Users className="w-4 h-4 text-slate-400" />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Atletas Ativos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Atletas Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{totalActiveStudents}</span>
            <span className="text-xs text-slate-400">alunos</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            100% matriculados no sistema
          </p>
        </div>

        {/* Frequência Hoje */}
        <div
          onClick={() => onOpenDailyAttendance ? onOpenDailyAttendance() : onNavigate('attendance')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 text-white space-y-2 cursor-pointer transition-all hover:scale-[1.01] group shadow-md"
          title="Clique para ver quem marcou presença hoje"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors">Treinos Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-amber-500/20 group-hover:text-amber-400 flex items-center justify-center transition-colors">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{todayAttendances.length}</span>
            <span className="text-xs text-slate-400">presenças</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-blue-400 font-medium group-hover:text-amber-400 transition-colors">
              Aulas do dia em andamento
            </p>
            <span className="text-[10px] text-amber-400 font-bold group-hover:underline">Ver Lista →</span>
          </div>
        </div>

        {/* Aptos para Graduação */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Aptos Exame</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{studentsReadyForGraduation.length}</span>
            <span className="text-xs text-slate-400">alunos</span>
          </div>
          <p className="text-[11px] text-amber-400 font-medium">
            Atingiram meta de treinos
          </p>
        </div>
      </div>

      {/* Student Approvals Interface */}
      <PendingStudentApprovals />

      {/* Main Grid: Belt Distribution & Graduation Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graduation Candidates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Aptos para Graduação / Grau
              </h3>
              <p className="text-xs text-slate-400">Atletas que atingiram a contagem mínima de treinos</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {studentsReadyForGraduation.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum aluno atingiu a meta esta semana.</p>
            ) : (
              studentsReadyForGraduation.slice(0, 4).map(s => {
                const target = getStudentGraduationTarget(s, academyConfig);
                const hasCustom = typeof s.customGraduationTargetClasses === 'number' && s.customGraduationTargetClasses > 0;
                return (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-amber-400/40" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-100">{s.name}</p>
                          {hasCustom && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold" title="Meta individual de treinos definida">
                              🎯 Meta Indiv.
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <BeltBadge belt={s.belt} stripes={s.stripes} size="sm" showLabel={false} />
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {s.classesSinceLastGraduation} / {target} treinos
                      </span>
                      <span className="text-[10px] text-slate-500">Pronto para exame</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Belt Distribution Spectrum */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
          <h3 className="font-bold text-base text-slate-100">
            Distribuição de Faixas da Academia
          </h3>
          <p className="text-xs text-slate-400">Composição do tatame por graduação atual</p>

          <div className="space-y-3">
            {[
              { belt: 'BRANCA', label: 'Faixa Branca', color: 'bg-stone-200 text-stone-900' },
              { belt: 'AZUL', label: 'Faixa Azul', color: 'bg-blue-600 text-white' },
              { belt: 'ROXA', label: 'Faixa Roxa', color: 'bg-purple-700 text-white' },
              { belt: 'MARROM', label: 'Faixa Marrom', color: 'bg-amber-900 text-white' },
              { belt: 'PRETA', label: 'Faixa Preta', color: 'bg-neutral-900 text-amber-400 border border-amber-500/30' },
            ].map(item => {
              const count = beltCounts[item.belt] || 0;
              const percentage = totalActiveStudents > 0 ? Math.round((count / totalActiveStudents) * 100) : 0;
              return (
                <div key={item.belt} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>{item.label}</span>
                    <span className="text-amber-400">{count} atleta(s) ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
