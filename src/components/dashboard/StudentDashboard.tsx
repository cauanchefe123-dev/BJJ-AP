import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar, resolveStudentForUser } from '../../constants/avatar';
import { DigitalMembershipCard } from '../card/DigitalMembershipCard';
import { getTrainingTimeText } from '../../utils/trainingTime';
import { calculateRanking, getStudentTotalClasses } from '../../utils/ranking';
import { getLocalDateStr, getAttendanceLocalDate, getAttendanceLocalTime, formatDateBR } from '../../utils/dateUtils';
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

  const todayStr = getLocalDateStr();
  const todayAttendance = myAttendances.find(a => getAttendanceLocalDate(a) === todayStr);

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
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shrink-0">
              ⏳
            </div>
            <div>
              <p className="font-black text-amber-300 text-sm">Vínculo Pendente com a Academia</p>
              <p className="text-slate-300 text-xs mt-0.5 max-w-xl leading-relaxed">
                Você solicitou matrícula na equipe <strong>{academyConfig.name}</strong>. Aguarde a aprovação do seu Mestre.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('academies')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-md cursor-pointer"
          >
            Gerenciar Vínculo →
          </button>
        </div>
      )}

      {/* Student Profile Header */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-7 text-white space-y-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={getStudentAvatar(currentStudent)}
              alt={currentStudent.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-700 bg-slate-950 shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight truncate">{currentStudent.name}</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0 font-mono">
                  Matrícula {currentStudent.registrationNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{academyConfig.name}</p>
              <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                <BeltBadge belt={currentStudent.belt} stripes={currentStudent.stripes} size="md" />
                <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-950/80 text-slate-300 border border-slate-800 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {getTrainingTimeText(currentStudent.startDate, currentStudent.initialMonthsTrained)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {onOpenCheckin && (
              <button
                onClick={onOpenCheckin}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-white text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Bater Frequência</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('card')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Carteirinha</span>
            </button>
            <button
              onClick={() => onNavigate('journal')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Diário</span>
            </button>
            {onOpenEditModal && currentStudent && (
              <button
                onClick={() => onOpenEditModal(currentStudent)}
                className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-95 cursor-pointer"
                title="Editar Cadastro"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status de Frequência do Dia (Check-in do Atleta) */}
        <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-inner">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
              todayAttendance
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse'
            }`}>
              {todayAttendance ? <CheckCircle className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Presença do Dia ({formatDateBR(todayStr)})</span>
                {todayAttendance ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ✓ CONFIRMADA
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    NÃO REGISTRADA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {todayAttendance
                  ? `Presença na turma "${todayAttendance.className}" às ${getAttendanceLocalTime(todayAttendance)}. Bom treino!`
                  : 'Faça seu check-in na aula de hoje para contabilizar suas graduações e ranking.'}
              </p>
            </div>
          </div>

          {!todayAttendance && onOpenCheckin && (
            <button
              onClick={onOpenCheckin}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Bater Presença Agora</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => onNavigate('ranking')}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 text-white space-y-2 cursor-pointer transition-all hover:scale-[1.01] shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Posição da Semana</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300">
            #{myWeekItem?.rank || '-'}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {myWeekItem ? `${myWeekItem.weekCount} treino(s) esta semana` : 'Nenhum treino ainda'}
          </p>
        </div>

        <div 
          onClick={() => onNavigate('ranking')}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 text-white space-y-2 cursor-pointer transition-all hover:scale-[1.01] shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Posição do Mês</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">
            #{myMonthItem?.rank || '-'}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {myMonthItem ? `${myMonthItem.monthCount} treino(s) este mês` : 'Nenhum treino no mês'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 text-white space-y-2 shadow-md">
          <span className="text-xs font-bold text-slate-400 block">Total de Treinos</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-100">
            {getStudentTotalClasses(currentStudent, attendances)}
          </p>
          <p className="text-[11px] text-emerald-400 font-semibold truncate">Presenças no tatame</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 text-white space-y-2 shadow-md">
          <span className="text-xs font-bold text-slate-400 block">Tempo de Treino</span>
          <p className="text-lg sm:text-xl font-black text-amber-300 truncate">
            {getTrainingTimeText(currentStudent.startDate, currentStudent.initialMonthsTrained)}
          </p>
          <p className="text-[11px] text-slate-400 truncate">Jornada acumulada</p>
        </div>
      </div>

      {/* Foco Técnico da Semana por Turma */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Foco Técnico da Semana
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Posições e técnicas programadas pelo seu Professor para as turmas desta semana.
            </p>
          </div>
          <button
            onClick={() => onNavigate('weekly-focus')}
            className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Acervo →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classes.map(c => (
            <div
              key={c.id}
              className="bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-xs"
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
                <h4 className="font-bold text-sm text-slate-100">{c.title}</h4>
                <p className="text-xs text-slate-400">Prof. {c.professorName}</p>
              </div>

              {/* Focus Badge */}
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block mb-0.5">
                  🎯 Foco da Semana:
                </span>
                <p className="text-xs font-semibold text-slate-200">
                  {c.weeklyFocus ? c.weeklyFocus : 'Treino geral e aperfeiçoamento de posições.'}
                </p>

                {c.weeklyFocusVideoUrl && (
                  <button
                    onClick={() => setSelectedVideoClass(c)}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Assistir Posição</span>
                    <Play className="w-3 h-3 fill-slate-950 text-slate-950 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Card Preview Box */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-lg">
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
