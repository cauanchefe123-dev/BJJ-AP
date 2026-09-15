import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RollChallenge } from '../../types';
import { resolveStudentForUser } from '../../constants/avatar';
import { BeltBadge } from '../belts/BeltBadge';
import { RollResultModal } from './RollResultModal';
import { 
  Swords, 
  Award, 
  Sparkles, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Edit3, 
  ArrowUpRight, 
  CheckCircle2,
  Flame,
  ShieldAlert
} from 'lucide-react';

interface RecentRollOutcomesSectionProps {
  onNavigate: (tab: string) => void;
  compact?: boolean;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const RecentRollOutcomesSection: React.FC<RecentRollOutcomesSectionProps> = ({
  onNavigate,
  compact = false,
}) => {
  const { rollChallenges, students } = useData();
  const { currentUser } = useAuth();

  const currentStudent = resolveStudentForUser(currentUser, students);
  const currentStudentId = currentStudent?.id;
  const isProfessorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  const [selectedChallengeForEdit, setSelectedChallengeForEdit] = useState<RollChallenge | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const now = Date.now();

  // Filtrar apenas rolas concluídos que aconteceram ou foram registrados nos últimos 3 dias
  const recentOutcomes = rollChallenges
    .filter(c => {
      if (c.status !== 'COMPLETED' || !c.result) return false;
      const completedTime = new Date(c.completedAt || c.result.registeredAt || c.scheduledDate).getTime();
      if (isNaN(completedTime)) return false;
      const diff = now - completedTime;
      // Aceita rolas concluídos nas últimas 72 horas (com tolerância de 1 hora para fusos)
      return diff >= -3600000 && diff <= THREE_DAYS_MS;
    })
    .sort((a, b) => {
      const timeA = new Date(a.completedAt || a.result?.registeredAt || 0).getTime();
      const timeB = new Date(b.completedAt || b.result?.registeredAt || 0).getTime();
      return timeB - timeA;
    });

  const getSpotlightBadge = (challenge: RollChallenge) => {
    const completedTime = new Date(challenge.completedAt || challenge.result?.registeredAt || 0).getTime();
    const diff = now - completedTime;
    const remainingMs = THREE_DAYS_MS - diff;
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const remainingDays = Math.ceil(remainingHours / 24);

    if (remainingDays >= 3) {
      return { text: 'Destaque: mais 3 dias', color: 'text-slate-300 bg-slate-900 border-slate-800' };
    } else if (remainingDays === 2) {
      return { text: 'Destaque: mais 2 dias', color: 'text-slate-300 bg-slate-900 border-slate-800' };
    } else if (remainingHours > 2) {
      return { text: `Destaque: mais ${remainingHours}h`, color: 'text-slate-300 bg-slate-900 border-slate-800' };
    }
    return { text: 'Últimas horas', color: 'text-slate-400 bg-slate-900 border-slate-800' };
  };

  const formatCompletedDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-[#0c121e] border border-slate-800/90 rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shadow-sm shrink-0">
              <Award className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-1.5">
                  Desfechos de Rolas no Tatame 🥋
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Destaque de 3 Dias
                </span>
                {recentOutcomes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {recentOutcomes.length} {recentOutcomes.length === 1 ? 'concluído' : 'concluídos'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Resultados, finalizações e confrontos finalizados que permanecem em exibição geral por 3 dias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('challenges')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Mural de Desafios</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Recent Outcomes Grid */}
        {recentOutcomes.length === 0 ? (
          <div className="py-7 px-4 text-center rounded-2xl bg-[#070b14]/80 border border-slate-800/60 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Swords className="w-6 h-6 stroke-[1.5] text-amber-400/70" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-200">
                Nenhum desfecho registrado nas últimas 72 horas
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                Quando atletas finalizarem um desafio e colocarem o desfecho (finalização, pontuação ou rola de estudo), o resultado aparecerá aqui com destaque por 3 dias para toda a equipe!
              </p>
            </div>
            <button
              onClick={() => onNavigate('challenges')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer mt-1"
            >
              <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ver Desafios ou Lançar Rola</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentOutcomes.slice(0, compact ? 2 : 4).map((ch) => {
              const res = ch.result;
              if (!res) return null;

              const spotlight = getSpotlightBadge(ch);
              const isChallengerWinner = res.winnerId === ch.challengerId || res.winnerName === ch.challengerName;
              const isChallengedWinner = res.winnerId === ch.challengedId || res.winnerName === ch.challengedName;

              const canEditResult = isProfessorOrAdmin || 
                (!!currentStudentId && (ch.challengerId === currentStudentId || ch.challengedId === currentStudentId));

              return (
                <div
                  key={ch.id}
                  className="bg-[#070b14] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between transition-all shadow-md group relative"
                >
                  {/* Card Header: Modality & 3 Days Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-200 border border-slate-700/80">
                          {ch.modality === 'NO_GI' ? 'No-Gi' : 'Com Kimono'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {ch.targetDurationMinutes} min
                        </span>
                      </div>

                      {/* Spotlight 3 Days Badge */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1.5 ${spotlight.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>{spotlight.text}</span>
                      </span>
                    </div>

                    {/* Duel Matchup Athletes Display - Responsive Mobile & Desktop */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
                      {/* Responsive Grid: on mobile stacked cleanly in individual rows, on tablet/desktop 3 columns side-by-side */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                        {/* Challenger Athlete */}
                        <div className={`flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-0 rounded-xl sm:rounded-none bg-slate-950/50 sm:bg-transparent border sm:border-0 border-slate-800/70 ${isChallengerWinner ? 'opacity-100' : 'opacity-85'}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={ch.challengerPhotoUrl || '/avatar.png'}
                                alt={ch.challengerName}
                                className={`w-10 h-10 rounded-xl object-cover border bg-slate-950 ${
                                  isChallengerWinner ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'
                                }`}
                              />
                              {isChallengerWinner && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[9px] shadow-xs" title="Vencedor do Rola">
                                  ★
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Desafiante</span>
                                {isChallengerWinner && (
                                  <span className="text-[9px] font-bold text-amber-400 bg-slate-900 border border-slate-800 px-1 py-0.2 rounded sm:hidden">Venceu</span>
                                )}
                              </div>
                              <p className="font-bold text-xs text-slate-100 truncate" title={ch.challengerName}>
                                {ch.challengerName}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <BeltBadge belt={ch.challengerBelt} stripes={ch.challengerStripes} size="sm" showLabel={false} />
                          </div>
                        </div>

                        {/* VS Center Marker */}
                        <div className="flex items-center justify-center py-0.5 sm:py-0">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-[10px] shadow-xs">
                            VS
                          </div>
                        </div>

                        {/* Challenged Athlete */}
                        <div className={`flex items-center justify-between sm:justify-end sm:flex-row-reverse gap-2.5 p-2 sm:p-0 rounded-xl sm:rounded-none bg-slate-950/50 sm:bg-transparent border sm:border-0 border-slate-800/70 text-left sm:text-right ${isChallengedWinner ? 'opacity-100' : 'opacity-85'}`}>
                          <div className="flex items-center sm:flex-row-reverse gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={ch.challengedPhotoUrl || '/avatar.png'}
                                alt={ch.challengedName || 'Adversário'}
                                className={`w-10 h-10 rounded-xl object-cover border bg-slate-950 ${
                                  isChallengedWinner ? 'border-amber-400/80 ring-1 ring-amber-400/30' : 'border-slate-800'
                                }`}
                              />
                              {isChallengedWinner && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[9px] shadow-xs" title="Vencedor do Rola">
                                  ★
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center sm:justify-end gap-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Desafiado</span>
                                {isChallengedWinner && (
                                  <span className="text-[9px] font-bold text-amber-400 bg-slate-900 border border-slate-800 px-1 py-0.2 rounded sm:hidden">Venceu</span>
                                )}
                              </div>
                              <p className="font-bold text-xs text-slate-100 truncate" title={ch.challengedName || 'Colega de Tatame'}>
                                {ch.challengedName || 'Colega de Tatame'}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <BeltBadge belt={ch.challengedBelt || 'BRANCA'} stripes={ch.challengedStripes || 0} size="sm" showLabel={false} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Result Banner / Outcome Details */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                      <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                        {/* Winner or Draw */}
                        {res.outcomeType === 'SUBMISSION' || res.outcomeType === 'POINTS' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center shrink-0">
                              <Award className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                                Vitória de
                              </span>
                              <span className="text-xs font-bold text-slate-100">
                                {res.winnerName || 'Atleta Vencedor'}
                              </span>
                            </div>
                          </div>
                        ) : res.outcomeType === 'STUDY_ROUND' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🤝</span>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                                Desfecho
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                Rola de Estudo & Evolução
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">⚖️</span>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                                Desfecho
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                Empate Técnico
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Outcome Details Tag */}
                        <div className="w-full sm:w-auto text-left sm:text-right mt-0.5 sm:mt-0">
                          {res.outcomeType === 'SUBMISSION' && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-800 text-[11px] font-medium inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              <span>{res.submissionTechnique || 'Finalização'}</span>
                              {res.submissionMinute ? <span className="text-slate-400">({res.submissionMinute} min)</span> : null}
                            </span>
                          )}
                          {res.outcomeType === 'POINTS' && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-800 text-[11px] font-medium inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>Placar: {res.scoreChallenger ?? 0} x {res.scoreChallenged ?? 0} pts</span>
                            </span>
                          )}
                          {res.outcomeType === 'STUDY_ROUND' && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-800 text-[11px] font-medium inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>Treino Solto / Posicional</span>
                            </span>
                          )}
                          {res.outcomeType === 'TECHNICAL_DRAW' && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-medium">
                              Tempo Esgotado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Technical Notes / Commentary if provided */}
                      {res.technicalNotes && (
                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5 italic">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>"{res.technicalNotes}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Metadata and Edit Result Button */}
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[10px] text-slate-400">
                      <span>Concluído em {formatCompletedDate(ch.completedAt || res.registeredAt)}</span>
                      {res.registeredBy && (
                        <span className="hidden sm:inline text-slate-500"> • Por {res.registeredBy}</span>
                      )}
                    </div>

                    {canEditResult && (
                      <button
                        onClick={() => {
                          setSelectedChallengeForEdit(ch);
                          setIsResultModalOpen(true);
                        }}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all border border-slate-700/80 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        title="Atualizar ou corrigir o desfecho deste rola"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Atualizar Desfecho</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to Update Result directly from the Dashboard */}
      {selectedChallengeForEdit && (
        <RollResultModal
          isOpen={isResultModalOpen}
          onClose={() => {
            setIsResultModalOpen(false);
            setSelectedChallengeForEdit(null);
          }}
          challenge={selectedChallengeForEdit}
        />
      )}
    </>
  );
};
