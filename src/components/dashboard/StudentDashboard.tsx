import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar, resolveStudentForUser } from '../../constants/avatar';
import { DigitalMembershipCard } from '../card/DigitalMembershipCard';
import { getTrainingTimeText } from '../../utils/trainingTime';
import { calculateRanking, getStudentTotalClasses } from '../../utils/ranking';
import { Award, QrCode, CreditCard, BookOpen, Clock, Calendar, CheckCircle, AlertTriangle, ArrowRight, Flame, Sparkles, Edit3, Shield, Target, Video, Play, Trophy, UserCheck } from 'lucide-react';
import { TechniqueVideoModal } from '../common/TechniqueVideoModal';
import { BJJClass } from '../../types';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenPixModal?: (paymentId: string) => void;
  onOpenEditModal?: (student: any) => void;
  onOpenCheckin?: () => void;
  selectedStudentId?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate, onOpenPixModal, onOpenEditModal, onOpenCheckin, selectedStudentId }) => {
  const { currentUser } = useAuth();
  const { students, payments, attendances, academyConfig, classes } = useData();

  const [selectedVideoClass, setSelectedVideoClass] = useState<BJJClass | null>(null);

  const resolved = resolveStudentForUser(currentUser, students);
  const currentStudent = selectedStudentId
    ? (students.find(s => s.id === selectedStudentId) || resolved)
    : resolved;
  const myPayments = payments.filter(p => p.studentId === currentStudent?.id);
  const myAttendances = attendances.filter(a => a.studentId === currentStudent?.id);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = myAttendances.find(a => a.date === todayStr);

  const pendingPayment = myPayments.find(p => p.status === 'PENDENTE' || p.status === 'ATRASADO');

  // Calculate current student's weekly & monthly ranking
  const weekRanking = calculateRanking(students, attendances, 'WEEK');
  const monthRanking = calculateRanking(students, attendances, 'MONTH');

  const myWeekItem = currentStudent
    ? weekRanking.find(r => r.student.id === currentStudent.id || (r.student.email && currentStudent.email && r.student.email.trim().toLowerCase() === currentStudent.email.trim().toLowerCase()))
    : null;

  const myMonthItem = currentStudent
    ? monthRanking.find(r => r.student.id === currentStudent.id || (r.student.email && currentStudent.email && r.student.email.trim().toLowerCase() === currentStudent.email.trim().toLowerCase()))
    : null;

  return (
    <div className="space-y-6">
      {currentStudent.approvalStatus === 'PENDING' && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-lg shrink-0">
              ⏳
            </div>
            <div>
              <p className="font-extrabold text-amber-300 text-sm">Vínculo Pendente — Aguardando Aprovação na Equipe</p>
              <p className="text-slate-300 text-xs mt-0.5 max-w-xl leading-relaxed">
                Você solicitou vínculo com a equipe <strong>{academyConfig.name}</strong>. Sua solicitação está na fila do Professor ou Administrador da academia para ser aprovada.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('academies')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0 transition-all shadow-md"
          >
            Gerenciar Vínculo →
          </button>
        </div>
      )}

      {/* Student Profile Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={getStudentAvatar(currentStudent)}
              alt={currentStudent.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-700 bg-slate-950 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{currentStudent.name}</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  Matrícula {currentStudent.registrationNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">Atleta da {academyConfig.name}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <BeltBadge belt={currentStudent.belt} stripes={currentStudent.stripes} size="md" />
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/80 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {getTrainingTimeText(currentStudent.startDate, currentStudent.initialMonthsTrained)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            {onOpenCheckin && (
              <button
                onClick={onOpenCheckin}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Bater Frequência</span>
              </button>
            )}
            {onOpenEditModal && currentStudent && (
              <button
                onClick={() => onOpenEditModal(currentStudent)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
              >
                <Edit3 className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">Editar Cadastro</span>
              </button>
            )}
            {currentUser?.role !== 'ADMIN' && !selectedStudentId && (
              <button
                onClick={() => onNavigate('academies')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-700/60 transition-all active:scale-95"
              >
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Vincular Academia</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('card')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-extrabold text-xs border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span className="truncate">Carteirinha</span>
            </button>
            <button
              onClick={() => onNavigate('journal')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Diário</span>
            </button>
            <button
              onClick={() => onNavigate('observations')}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/60 text-purple-200 font-bold text-xs border border-purple-700/50 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate">Observações</span>
            </button>
          </div>
        </div>

        {/* Status de Frequência do Dia (Check-in do Atleta) */}
        <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
              todayAttendance
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-pulse'
            }`}>
              {todayAttendance ? <CheckCircle className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Frequência de Hoje ({todayStr.split('-').reverse().join('/')})</span>
                {todayAttendance ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ PRESENÇA CONFIRMADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    NÃO REGISTRADA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {todayAttendance
                  ? `Você treinou na turma "${todayAttendance.className}" às ${todayAttendance.timestamp ? new Date(todayAttendance.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}. Bom treino!`
                  : 'Não se esqueça de registrar seu check-in na aula de hoje para contabilizar suas graduações.'}
              </p>
            </div>
          </div>

          {!todayAttendance && onOpenCheckin && (
            <button
              onClick={onOpenCheckin}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              Bater Presença Agora
            </button>
          )}
        </div>

        {/* Linked Academy Quick Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={academyConfig.logoUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=300'}
              alt={academyConfig.name}
              className="w-12 h-12 rounded-xl object-cover border border-amber-500/60 shadow-md bg-slate-900"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-amber-400">
                  Sua Academia Vinculada:
                </span>
                {currentStudent.approvalStatus === 'PENDING' ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    ⏳ VÍNCULO PENDENTE
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ATLETA ATIVO
                  </span>
                )}
              </div>
              <h4 className="text-sm font-extrabold text-slate-100 mt-0.5">
                {academyConfig.name} — Prof. {academyConfig.headCoachName || 'Gabriel "Fera" Santos'}
              </h4>
            </div>
          </div>
          {currentUser?.role !== 'ADMIN' && !selectedStudentId && (
            <button
              onClick={() => onNavigate('academies')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Mudar / Vincular a Outra Academia →
            </button>
          )}
        </div>

        {/* Treinos Realizados (Visão do Atleta) */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Treinos Registrados (Pós-Graduação)</span>
              <p className="text-[11px] text-slate-400">Total de aulas contabilizadas desde a sua última graduação ou grau</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xl font-black text-amber-400 font-mono block">
              {currentStudent.classesSinceLastGraduation}
            </span>
            <span className="text-[10px] text-slate-500">treino(s)</span>
          </div>
        </div>
      </div>

      {/* Foco Técnico da Semana por Turma */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Foco Técnico da Semana nas Turmas
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhe as posições e técnicas que seu professor definiu para o treino desta semana.
            </p>
          </div>
          <button
            onClick={() => onNavigate('weekly-focus')}
            className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>Ver Acervo de Posições →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => (
            <div
              key={c.id}
              className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {c.time} ({c.durationMinutes} min)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {c.category}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-100">{c.title}</h4>
                <p className="text-xs text-slate-400">Prof. {c.professorName}</p>
              </div>

              {/* Focus Badge */}
              <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-lg p-2.5 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block mb-0.5">
                  🎯 Foco da Semana:
                </span>
                <p className="text-xs font-bold text-amber-100">
                  {c.weeklyFocus ? c.weeklyFocus : 'Treino geral e aperfeiçoamento de posições.'}
                </p>

                {c.weeklyFocusVideoUrl && (
                  <button
                    onClick={() => setSelectedVideoClass(c)}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Assistir Vídeo da Posição</span>
                    <Play className="w-3 h-3 fill-slate-950 text-slate-950 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => onNavigate('ranking')}
          className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 sm:p-5 text-white space-y-1 cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-400 block truncate">Posição da Semana</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300">
            #{myWeekItem?.rank || '-'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
            {myWeekItem ? `${myWeekItem.weekCount} treino(s) esta semana` : 'Nenhum treino ainda'}
          </p>
        </div>

        <div 
          onClick={() => onNavigate('ranking')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 text-white space-y-1 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 block truncate">Posição do Mês</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">
            #{myMonthItem?.rank || '-'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
            {myMonthItem ? `${myMonthItem.monthCount} treino(s) este mês` : 'Nenhum treino no mês'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white space-y-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 block truncate">Total de Treinos</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-100">
            {getStudentTotalClasses(currentStudent, attendances)}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Presenças no tatame</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white space-y-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 block truncate">Tempo de Treino</span>
          <p className="text-lg sm:text-xl font-black text-amber-300 truncate">
            {getTrainingTimeText(currentStudent.startDate, currentStudent.initialMonthsTrained)}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Jornada acumulada</p>
        </div>
      </div>

      {/* Digital Card Preview Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <DigitalMembershipCard student={currentStudent} />
      </div>

      {/* Technique Video Modal */}
      <TechniqueVideoModal
        isOpen={!!selectedVideoClass}
        onClose={() => setSelectedVideoClass(null)}
        title={selectedVideoClass?.title || 'Vídeo da Posição'}
        focusText={selectedVideoClass?.weeklyFocus}
        videoUrl={selectedVideoClass?.weeklyFocusVideoUrl}
      />
    </div>
  );
};
