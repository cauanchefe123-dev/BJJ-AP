import React, { useMemo } from 'react';
import { TournamentCategory, TournamentMatch, TournamentCompetitor } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { Trophy, Swords, CheckCircle2, Clock, Play, Award, ChevronRight, User } from 'lucide-react';

interface BracketViewerProps {
  category: TournamentCategory;
  onSelectMatch: (match: TournamentMatch) => void;
  onQuickSelectWinner?: (match: TournamentMatch, winnerId: string, winnerName: string) => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
  canManage?: boolean;
}

export const BracketViewer: React.FC<BracketViewerProps> = ({
  category,
  onSelectMatch,
  onQuickSelectWinner,
  onNavigateToTimer,
  canManage = true,
}) => {
  const matches = category.matches || [];

  // Group regular elimination matches by round
  const roundsMap = useMemo(() => {
    const map: Record<number, TournamentMatch[]> = {};
    const regularMatches = matches.filter(m => !m.isThirdPlaceMatch);

    regularMatches.forEach(m => {
      if (!map[m.round]) map[m.round] = [];
      map[m.round].push(m);
    });

    // Sort rounds ascending
    const sortedRounds = Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map(roundNum => ({
        roundNum,
        label: map[roundNum][0]?.roundLabel || `Fase ${roundNum}`,
        matches: map[roundNum].sort((a, b) => a.bracketPosition - b.bracketPosition),
      }));

    return sortedRounds;
  }, [matches]);

  const thirdPlaceMatch = useMemo(() => {
    return matches.find(m => m.isThirdPlaceMatch);
  }, [matches]);

  if (matches.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Swords className="w-6 h-6" />
        </div>
        <h4 className="font-extrabold text-base text-slate-200">Chaveamento Ainda Não Gerado</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Inscreva os atletas na categoria e clique em <strong>"Gerar Chaveamento Automático"</strong> para sortear as chaves eliminatórias da chave.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Bracket Flow Container with Horizontal Scroll */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/80 border border-slate-800 overflow-x-auto shadow-inner">
        <div className="flex items-start gap-6 sm:gap-8 min-w-max pb-4">
          {roundsMap.map((roundObj, roundIdx) => (
            <div key={roundObj.roundNum} className="w-72 sm:w-80 flex flex-col space-y-4 shrink-0">
              {/* Round Header */}
              <div className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-white shadow-sm">
                <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                  {roundObj.label}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-black text-[10px]">
                  {roundObj.matches.length} {roundObj.matches.length === 1 ? 'luta' : 'lutas'}
                </span>
              </div>

              {/* Matches in this round */}
              <div className="flex flex-col justify-around gap-4 sm:gap-6 flex-1">
                {roundObj.matches.map((match) => {
                  const isReady = Boolean(match.competitor1 && match.competitor2);
                  const isCompleted = match.status === 'COMPLETED';
                  const isWinner1 = isCompleted && match.winnerId === match.competitor1?.id;
                  const isWinner2 = isCompleted && match.winnerId === match.competitor2?.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => isReady && onSelectMatch(match)}
                      className={`p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between space-y-2.5 shadow-md ${
                        !isReady
                          ? 'bg-slate-950/50 border-slate-800/80 opacity-75'
                          : isCompleted
                          ? 'bg-slate-900/90 border-slate-700/90 hover:border-amber-500/50 cursor-pointer'
                          : 'bg-slate-900 border-amber-500/40 hover:border-amber-500 ring-1 ring-amber-500/30 cursor-pointer'
                      }`}
                    >
                      {/* Match header pill */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Luta #{match.matchNumber}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Concluída
                            </span>
                          ) : isReady ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                              Pronta para Lutar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[9px]">
                              Aguardando Fase
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Competitor 1 Slot */}
                      <div
                        className={`p-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
                          isWinner1
                            ? 'bg-amber-500/15 border border-amber-500/40 font-bold text-amber-200 shadow-sm'
                            : isCompleted && !isWinner1
                            ? 'opacity-40 text-slate-400 line-through'
                            : 'bg-slate-950/60 border border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">
                              {match.competitor1?.name || (
                                <span className="text-slate-500 italic font-normal">Aguardando atleta</span>
                              )}
                            </p>
                            {match.competitor1 && (
                              <div className="mt-0.5">
                                <BeltBadge belt={match.competitor1.belt} stripes={match.competitor1.stripes} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Score or Crown */}
                        <div className="text-right shrink-0 flex items-center gap-1">
                          {isWinner1 && <span className="text-xs">👑</span>}
                          {isCompleted && (
                            <span className="font-black text-xs text-amber-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                              {match.score1 ?? 0}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Competitor 2 Slot */}
                      <div
                        className={`p-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
                          isWinner2
                            ? 'bg-amber-500/15 border border-amber-500/40 font-bold text-amber-200 shadow-sm'
                            : isCompleted && !isWinner2
                            ? 'opacity-40 text-slate-400 line-through'
                            : 'bg-slate-950/60 border border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">
                              {match.competitor2?.name || (
                                <span className="text-slate-500 italic font-normal">
                                  {roundObj.roundNum === 1 && !match.competitor2 ? 'W.O. / BYE' : 'Aguardando atleta'}
                                </span>
                              )}
                            </p>
                            {match.competitor2 && (
                              <div className="mt-0.5">
                                <BeltBadge belt={match.competitor2.belt} stripes={match.competitor2.stripes} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Score or Crown */}
                        <div className="text-right shrink-0 flex items-center gap-1">
                          {isWinner2 && <span className="text-xs">👑</span>}
                          {isCompleted && (
                            <span className="font-black text-xs text-blue-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                              {match.score2 ?? 0}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submission / Outcome Badge if Finished */}
                      {isCompleted && (match.submissionTechnique || match.notes) && (
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between gap-2">
                          <span className="truncate text-amber-300 font-semibold">
                            {match.outcomeType === 'SUBMISSION' ? `🥋 ${match.submissionTechnique}` : match.notes || 'Vitória por Pontos'}
                          </span>
                          {match.submissionMinute && (
                            <span className="text-slate-400 shrink-0 font-medium">
                              {match.submissionMinute}m
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Bar for Professor and match progress */}
                      {isReady && canManage && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isCompleted ? (
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => match.competitor1 && onQuickSelectWinner?.(match, match.competitor1.id, match.competitor1.name)}
                                  className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-amber-500/40 truncate cursor-pointer"
                                  title={`Declarar ${match.competitor1?.name} como vencedor`}
                                >
                                  <span>👑 {match.competitor1?.name?.split(' ')[0]}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => match.competitor2 && onQuickSelectWinner?.(match, match.competitor2.id, match.competitor2.name)}
                                  className="px-2 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-slate-950 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-blue-500/40 truncate cursor-pointer"
                                  title={`Declarar ${match.competitor2?.name} como vencedor`}
                                >
                                  <span>👑 {match.competitor2?.name?.split(' ')[0]}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onSelectMatch(match)}
                                className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>📝 Lançar Súmula / Pontos / Finalização</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <span className="text-[10px] font-black text-amber-400">
                                👑 Vencedor: {match.winnerName?.split(' ')[0]}
                              </span>
                              <button
                                type="button"
                                onClick={() => onSelectMatch(match)}
                                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Editar Súmula
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Read-only spectator label for students or non-management */}
                      {isReady && !canManage && (
                        <div className="text-center pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                            {isCompleted ? `👑 Vencedor: ${match.winnerName}` : '⚔️ Luta em Andamento no Tatame'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3rd Place Match Card (if exists) */}
      {thirdPlaceMatch && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-amber-900/40 text-white space-y-3 max-w-md shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-xs text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              🥉 Disputa de 3º Lugar (Medalha de Bronze)
            </span>
            {thirdPlaceMatch.status === 'COMPLETED' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-bold">
                Concluída
              </span>
            )}
          </div>

          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              thirdPlaceMatch.status === 'COMPLETED'
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-950 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Competitor 1 */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-slate-100 truncate">
                  {thirdPlaceMatch.competitor1?.name || 'Semifinalista 1'}
                </p>
                {thirdPlaceMatch.competitor1 && (
                  <div className="mt-0.5">
                    <BeltBadge belt={thirdPlaceMatch.competitor1.belt} stripes={thirdPlaceMatch.competitor1.stripes} size="sm" />
                  </div>
                )}
              </div>

              <div className="px-2 py-1 rounded bg-slate-800 text-xs font-black text-amber-400 shrink-0">
                VS
              </div>

              {/* Competitor 2 */}
              <div className="flex-1 text-right min-w-0">
                <p className="font-bold text-xs text-slate-100 truncate">
                  {thirdPlaceMatch.competitor2?.name || 'Semifinalista 2'}
                </p>
                {thirdPlaceMatch.competitor2 && (
                  <div className="mt-0.5 flex justify-end">
                    <BeltBadge belt={thirdPlaceMatch.competitor2.belt} stripes={thirdPlaceMatch.competitor2.stripes} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {thirdPlaceMatch.winnerName && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 text-center">
                <span className="text-[11px] font-black text-amber-400">
                  🥉 Medalhista de Bronze: {thirdPlaceMatch.winnerName}
                </span>
              </div>
            )}

            {/* Quick winner buttons for 3rd place match */}
            {canManage && thirdPlaceMatch.competitor1 && thirdPlaceMatch.competitor2 && (
              <div className="mt-3 pt-2 border-t border-slate-800 space-y-1.5">
                {thirdPlaceMatch.status !== 'COMPLETED' ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => thirdPlaceMatch.competitor1 && onQuickSelectWinner?.(thirdPlaceMatch, thirdPlaceMatch.competitor1.id, thirdPlaceMatch.competitor1.name)}
                        className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-amber-500/40 truncate cursor-pointer"
                      >
                        <span>🥉 {thirdPlaceMatch.competitor1.name.split(' ')[0]}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => thirdPlaceMatch.competitor2 && onQuickSelectWinner?.(thirdPlaceMatch, thirdPlaceMatch.competitor2.id, thirdPlaceMatch.competitor2.name)}
                        className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-amber-500/40 truncate cursor-pointer"
                      >
                        <span>🥉 {thirdPlaceMatch.competitor2.name.split(' ')[0]}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectMatch(thirdPlaceMatch)}
                      className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>📝 Lançar Súmula de Bronze</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => onSelectMatch(thirdPlaceMatch)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                    >
                      Editar Súmula de Bronze
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
