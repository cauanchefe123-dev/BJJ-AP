import React from 'react';
import { useData } from '../../context/DataContext';
import { BeltBadge } from '../belts/BeltBadge';
import { PendingStudentApprovals } from '../students/PendingStudentApprovals';
import { Users, Award, QrCode, TrendingUp, AlertCircle, CheckCircle, Calendar, ArrowUpRight, UserCheck, Sparkles, Shield, UserPlus } from 'lucide-react';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';
import { getLocalDateStr, getAttendanceLocalDate } from '../../utils/dateUtils';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCheckin: () => void;
  onOpenDailyAttendance?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenCheckin, onOpenDailyAttendance }) => {
  const { students, payments, attendances, academyConfig } = useData();

  const totalActiveStudents = students.filter(s => s.active).length;
  
  // Belt distribution
  const beltCounts = students.reduce((acc, s) => {
    acc[s.belt] = (acc[s.belt] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Students ready for promotion
  const studentsReadyForGraduation = students.filter(s =>
    isStudentEligibleForGraduation(s, academyConfig)
  );

  const todayStr = getLocalDateStr();
  const todayAttendances = attendances.filter(a => getAttendanceLocalDate(a) === todayStr);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Visão Geral do Tatame
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            {academyConfig.name}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Painel de controle unificado para gestão de atletas, graduações, chamadas e turmas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto">
          <button
            onClick={onOpenCheckin}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-white text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-slate-950" />
            <span>Registrar Presença</span>
          </button>
          <button
            onClick={() => onNavigate('students')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-400" />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Atletas Ativos */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 text-white space-y-3 shadow-md hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Atletas Ativos</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">{totalActiveStudents}</span>
            <span className="text-xs font-semibold text-slate-400">alunos matriculados</span>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>100% integrados à equipe</span>
          </div>
        </div>

        {/* Frequência Hoje */}
        <div
          onClick={() => onOpenDailyAttendance ? onOpenDailyAttendance() : onNavigate('attendance')}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 text-white space-y-3 cursor-pointer transition-all hover:scale-[1.01] group shadow-md"
          title="Clique para ver quem marcou presença hoje"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 group-hover:text-amber-300 transition-colors">Treinos de Hoje</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-400 group-hover:bg-amber-500/15 group-hover:text-amber-300 border border-blue-500/30 group-hover:border-amber-500/30 flex items-center justify-center transition-colors">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">{todayAttendances.length}</span>
            <span className="text-xs font-semibold text-slate-400">presenças registradas</span>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-blue-400 font-bold group-hover:text-amber-300 transition-colors">
              Aulas em andamento
            </span>
            <span className="text-amber-400 font-bold group-hover:underline flex items-center gap-0.5">
              Ver Lista <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Aptos para Graduação */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 text-white space-y-3 cursor-pointer transition-all hover:scale-[1.01] shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Aptos para Exame</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">{studentsReadyForGraduation.length}</span>
            <span className="text-xs font-semibold text-slate-400">atletas qualificados</span>
          </div>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atingiram a meta de aulas</span>
          </div>
        </div>
      </div>

      {/* Student Approvals Interface */}
      <PendingStudentApprovals />

      {/* Main Grid: Belt Distribution & Graduation Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graduation Candidates */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Aptos para Graduação / Grau
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Atletas com contagem de treinos suficiente para novo grau ou faixa</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {studentsReadyForGraduation.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800/60">
                <p className="text-xs text-slate-400">Nenhum atleta atingiu o requisito de aulas esta semana.</p>
              </div>
            ) : (
              studentsReadyForGraduation.slice(0, 5).map(s => {
                const target = getStudentGraduationTarget(s, academyConfig);
                const hasCustom = typeof s.customGraduationTargetClasses === 'number' && s.customGraduationTargetClasses > 0;
                return (
                  <div key={s.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-xl object-cover border border-amber-400/40 bg-slate-900 shadow-xs" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-100">{s.name}</p>
                          {hasCustom && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold" title="Meta individual de treinos definida">
                              Meta Indiv.
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <BeltBadge belt={s.belt} stripes={s.stripes} size="sm" showLabel={false} />
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 block">
                        {s.classesSinceLastGraduation} / {target} treinos
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Pronto para exame</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Belt Distribution Spectrum */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-md">
          <div className="border-b border-slate-800/80 pb-3.5">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-100">
              Distribuição de Faixas da Academia
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Composição do tatame por graduação atual</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {[
              { belt: 'BRANCA', label: 'Faixa Branca', color: 'bg-slate-200' },
              { belt: 'AZUL', label: 'Faixa Azul', color: 'bg-blue-600' },
              { belt: 'ROXA', label: 'Faixa Roxa', color: 'bg-purple-600' },
              { belt: 'MARROM', label: 'Faixa Marrom', color: 'bg-amber-900' },
              { belt: 'PRETA', label: 'Faixa Preta', color: 'bg-neutral-900 border border-amber-500/40' },
            ].map(item => {
              const count = beltCounts[item.belt] || 0;
              const percentage = totalActiveStudents > 0 ? Math.round((count / totalActiveStudents) * 100) : 0;
              return (
                <div key={item.belt} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>{item.label}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{count} atleta(s) <span className="text-amber-400 font-bold">({percentage}%)</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }}
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
