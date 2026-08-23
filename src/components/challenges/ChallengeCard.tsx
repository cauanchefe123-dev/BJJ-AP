import React, { useState } from 'react';
import { RollChallenge, BeltType } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { DEFAULT_BLACK_GI_AVATAR } from '../../constants/avatar';
import { 
  Swords, 
  Clock, 
  Calendar, 
  Check, 
  X, 
  Award, 
  Shield, 
  Sparkles, 
  Flame, 
  Timer, 
  FileText,
  UserPlus,
  AlertCircle,
  Play
} from 'lucide-react';
import { formatDateBR } from '../../utils/dateUtils';

interface ChallengeCardProps {
  challenge: RollChallenge;
  currentUserId?: string;
  currentStudentId?: string;
  currentStudentBelt?: BeltType;
  currentStudentStripes?: number;
  currentStudentName?: string;
  currentStudentPhoto?: string;
  userRole?: string;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
  onOpenResultModal: (challenge: RollChallenge) => void;
  onOpenTimerWithChallenge?: (challenge: RollChallenge) => void;
  onCancel: (challengeId: string) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  currentUserId,
  currentStudentId,
  currentStudentBelt,
  currentStudentStripes,
  currentStudentName,
  currentStudentPhoto,
  userRole,
  onAccept,
  onDecline,
  onOpenResultModal,
  onOpenTimerWithChallenge,
  onCancel,
}) => {
  const isChallenger = currentStudentId && challenge.challengerId === currentStudentId;
  const isChallenged = currentStudentId && challenge.challengedId === currentStudentId;
  const isPending = challenge.status === 'PENDING';
  const isAccepted = challenge.status === 'ACCEPTED';
  const isCompleted = challenge.status === 'COMPLETED';
  const isDeclined = challenge.status === 'DECLINED';
  const isCancelled = challenge.status === 'CANCELLED';
  const isOpenChallenge = challenge.isPublicOpenChallenge && !challenge.challengedId;
  const canAcceptOpen = isOpenChallenge && isPending && !isChallenger && currentStudentId;

  const isStaff = userRole === 'ADMIN' || userRole === 'PROFESSOR';

  // Rule labels
  const rulesLabels: Record<string, { label: string; bg: string; text: string }> = {
    ESTUDO_LEVE: { label: 'Rola de Estudo / Solto', bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400' },
    SUBMISSION_ONLY: { label: 'Submission Only (Finalização)', bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400' },
    PONTOS_IBJJF: { label: 'Regras IBJJF (Pontos)', bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400' },
    TEMPO_LIVRE: { label: 'Treino Livre', bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-400' },
  };

  const currentRule = rulesLabels[challenge.rulesType] || rulesLabels.ESTUDO_LEVE;

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-200 ${
      isCompleted 
        ? 'bg-slate-900/90 border-slate-800/80 shadow-md' 
        : isAccepted
        ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
        : isOpenChallenge
        ? 'bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-500/5'
        : 'bg-slate-900/80 border-slate-800 shadow-md'
    }`}>
      {/* Top Banner Status */}
      <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            challenge.modality === 'NO_GI'
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
          }`}>
            {challenge.modality === 'NO_GI' ? '🥋 No-Gi (Sem Kimono)' : '🥋 Gi (Com Kimono)'}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentRule.bg} ${currentRule.text}`}>
            {currentRule.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {challenge.targetDurationMinutes} min
          </span>

          {isPending && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse">
              {isOpenChallenge ? 'Mural Aberto' : 'Pendente'}
            </span>
          )}

          {isAccepted && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Casado no Tatame
            </span>
          )}

          {isCompleted && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              Finalizado
            </span>
          )}

          {isDeclined && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-400">
              Recusado
            </span>
          )}

          {isCancelled && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400">
              Cancelado
            </span>
          )}
        </div>
      </div>

      {/* Main Duel Content Area */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Title or note */}
        {challenge.title && (
          <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight flex items-center gap-2 font-display">
            <Swords className="w-4 h-4 text-amber-400 shrink-0" />
            {challenge.title}
          </h3>
        )}

        {/* Duel Matchup Avatars & Names */}
        <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          {/* Challenger */}
          <div className="sm:col-span-5 flex items-center gap-3.5">
            <img
              src={challenge.challengerPhotoUrl || DEFAULT_BLACK_GI_AVATAR}
              alt={challenge.challengerName}
              className="w-13 h-13 rounded-2xl object-cover border border-slate-700/80 bg-slate-950 shrink-0 shadow-md ring-2 ring-amber-500/30"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Desafiante</span>
              <p className="font-extrabold text-sm sm:text-base text-slate-100 truncate">
                {challenge.challengerName}
                {isChallenger && <span className="ml-1 text-[10px] text-amber-400 font-bold">(Você)</span>}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <BeltBadge belt={challenge.challengerBelt} stripes={challenge.challengerStripes} size="sm" />
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="sm:col-span-1 flex flex-col items-center justify-center my-1 sm:my-0">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400 shadow-md">
              VS
            </div>
          </div>

          {/* Challenged / Opponent */}
          <div className="sm:col-span-5 flex items-center gap-3.5">
            {challenge.challengedName ? (
              <>
                <img
                  src={challenge.challengedPhotoUrl || DEFAULT_BLACK_GI_AVATAR}
                  alt={challenge.challengedName}
                  className="w-13 h-13 rounded-2xl object-cover border border-slate-700/80 bg-slate-950 shrink-0 shadow-md ring-2 ring-blue-500/30"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Desafiado</span>
                  <p className="font-extrabold text-sm sm:text-base text-slate-100 truncate">
                    {challenge.challengedName}
                    {isChallenged && <span className="ml-1 text-[10px] text-blue-400 font-bold">(Você)</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {challenge.challengedBelt && (
                      <BeltBadge belt={challenge.challengedBelt} stripes={challenge.challengedStripes || 0} size="sm" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 w-full border border-dashed border-slate-700/80 rounded-2xl p-3 bg-slate-900/40">
                <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 font-black text-lg shrink-0">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-300">Aguardando Desafiante</p>
                  <p className="text-[11px] text-slate-500">Qualquer atleta pode aceitar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Notes metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4 flex-wrap">
            {challenge.scheduledDate && (
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-400/80" />
                Data: {formatDateBR(challenge.scheduledDate)}
                {challenge.scheduledTime ? ` às ${challenge.scheduledTime}` : ''}
              </span>
            )}
            {challenge.className && (
              <span className="flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-blue-400/80" />
                Turma: {challenge.className}
              </span>
            )}
            {challenge.targetWeightCategory && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                {challenge.targetWeightCategory}
              </span>
            )}
          </div>
        </div>

        {/* Notes / Message */}
        {challenge.notes && (
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="italic leading-relaxed">"{challenge.notes}"</p>
          </div>
        )}

        {/* Completed Match Outcome Result Banner */}
        {isCompleted && challenge.result && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-sm font-extrabold text-white">
                  {challenge.result.winnerName ? (
                    <>Vencedor: <span className="text-amber-400">{challenge.result.winnerName}</span></>
                  ) : (
                    <span className="text-emerald-400">Rola de Estudo / Empate Técnico</span>
                  )}
                </p>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                {challenge.result.outcomeType === 'SUBMISSION' && `🥋 Finalização (${challenge.result.submissionTechnique || 'Finalização'}) aos ${challenge.result.submissionMinute || 0} min`}
                {challenge.result.outcomeType === 'POINTS' && `⏱️ Vitória por Pontos (${challenge.result.scoreChallenger ?? 0} x ${challenge.result.scoreChallenged ?? 0})`}
                {challenge.result.outcomeType === 'STUDY_ROUND' && `🤝 Treino de Estudo Técnico`}
                {challenge.result.outcomeType === 'TECHNICAL_DRAW' && `🤝 Empate Técnico`}
              </span>
            </div>

            {challenge.result.technicalNotes && (
              <p className="text-xs text-slate-400 pl-7 italic">
                Feedback: "{challenge.result.technicalNotes}"
              </p>
            )}
          </div>
        )}

        {/* Decline reason */}
        {isDeclined && challenge.declineReason && (
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300">
            Motivo da recusa: {challenge.declineReason}
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          {/* Left Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct challenge pending actions for challenged student */}
            {isPending && isChallenged && (
              <>
                <button
                  onClick={() => onAccept(challenge.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Aceitar Desafio 🥋
                </button>
                <button
                  onClick={() => onDecline(challenge.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 font-bold text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Recusar
                </button>
              </>
            )}

            {/* Public open challenge action */}
            {canAcceptOpen && (
              <button
                onClick={() => onAccept(challenge.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                Topar o Rola! 🥋
              </button>
            )}

            {/* Accepted Duel actions: Record result or Send to Timer */}
            {isAccepted && (isChallenger || isChallenged || isStaff) && (
              <>
                <button
                  onClick={() => onOpenResultModal(challenge)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Award className="w-4 h-4 stroke-[2.5]" />
                  Registrar Desfecho / Resultado 📝
                </button>

                {onOpenTimerWithChallenge && (
                  <button
                    onClick={() => onOpenTimerWithChallenge(challenge)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
                    title="Iniciar cronômetro com este confronto"
                  >
                    <Timer className="w-4 h-4" />
                    Tatame Timer ⏱️
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right Actions: Cancel button */}
          <div>
            {(isChallenger || isStaff) && (isPending || isAccepted) && (
              <button
                onClick={() => onCancel(challenge.id)}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-400 transition-colors cursor-pointer py-1 px-2"
              >
                Cancelar Desafio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
