import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TournamentCategory, TournamentMatch, TournamentCompetitor } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { isBracketCorrupted } from '../../../utils/bracketUtils';
import { 
  Trophy, 
  Swords, 
  CheckCircle2, 
  Clock, 
  Play, 
  Award, 
  ChevronRight, 
  User, 
  ListOrdered, 
  GitBranch, 
  ZoomIn, 
  ZoomOut, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Flame,
  Medal,
  Check
} from 'lucide-react';

interface BracketViewerProps {
  category: TournamentCategory;
  onSelectMatch: (match: TournamentMatch) => void;
  onQuickSelectWinner?: (match: TournamentMatch, winnerId: string, winnerName: string) => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
  onRegenerateBracket?: () => void;
  canManage?: boolean;
}

export const BracketViewer: React.FC<BracketViewerProps> = ({
  category,
  onSelectMatch,
  onQuickSelectWinner,
  onNavigateToTimer,
  onRegenerateBracket,
  canManage = true,
}) => {
  const matches = category.matches || [];

  // Default to 'TREE' (Visual Championship Bracket like Smoothcomp / IBJJF)
  const [viewMode, setViewMode] = useState<'TREE' | 'LIST'>('TREE');
  // Zoom scale for Tree mode
  const [zoomScale, setZoomScale] = useState<number>(1);
  // Fullscreen state for TV projection / Tatame monitor
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filters for List Mode
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'ALL'>('ALL');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'ALL' | 'READY' | 'COMPLETED'>('ALL');
  const [collapsedRounds, setCollapsedRounds] = useState<Record<number, boolean>>({});

  const toggleRoundCollapse = (roundNum: number) => {
    setCollapsedRounds(prev => ({
      ...prev,
      [roundNum]: !prev[roundNum]
    }));
  };

  // Check if current bracket has corrupted/empty matches (e.g. older generator created 0-athlete fights)
  const hasCorruptedMatches = useMemo(() => {
    return isBracketCorrupted(matches);
  }, [matches]);

  // Group regular elimination matches by round
  const roundsMap = useMemo(() => {
    const map: Record<number, TournamentMatch[]> = {};
    const regularMatches = matches.filter(m => !m.isThirdPlaceMatch);

    regularMatches.forEach(m => {
      if (!map[m.round]) map[m.round] = [];
      map[m.round].push(m);
    });

    const sortedRounds = Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map(roundNum => ({
        roundNum,
        label: map[roundNum][0]?.roundLabel || (roundNum === 1 ? 'Fase Inicial' : `Fase ${roundNum}`),
        matches: map[roundNum].sort((a, b) => a.bracketPosition - b.bracketPosition),
      }));

    return sortedRounds;
  }, [matches]);

  const thirdPlaceMatch = useMemo(() => {
    return matches.find(m => m.isThirdPlaceMatch);
  }, [matches]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
          <Swords className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-black text-lg text-slate-100">Chaveamento Oficial Ainda Não Gerado</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Inscreva os competidores na categoria e clique em <strong>"Gerar Chaveamento ⚡"</strong> para montar a chave oficial com distribuição automática de cabeças de chave e BYEs.
          </p>
        </div>
        {canManage && onRegenerateBracket && (
          <button
            type="button"
            onClick={onRegenerateBracket}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Chaveamento de Campeonato</span>
          </button>
        )}
      </div>
    );
  }

  // Exact geometric dimensions for the Championship Tree Mode
  // Card height is strictly bounded so NO card can ever touch or overlap another
  const CARD_WIDTH = 285;
  const CARD_HEIGHT = 168;
  const COLUMN_GAP = 70;
  const ROUND1_GAP = 56; // Generous 56px vertical gap between consecutive matches

  // Championship Match Card Renderer
  const renderMatchCard = (match: TournamentMatch, isTreeCard = false) => {
    const isReady = Boolean(match.competitor1 && match.competitor2);
    const isCompleted = match.status === 'COMPLETED';
    const isBye = match.status === 'COMPLETED' && (!match.competitor1 || !match.competitor2);
    const isWinner1 = isCompleted && match.winnerId === match.competitor1?.id;
    const isWinner2 = isCompleted && match.winnerId === match.competitor2?.id;

    return (
      <div
        key={match.id}
        id={`match-card-${match.id}`}
        onClick={() => isReady && onSelectMatch(match)}
        className={`rounded-2xl border transition-all relative flex flex-col justify-between shadow-lg select-none ${
          isTreeCard 
            ? 'w-[285px] h-[168px] max-h-[168px] p-2.5 overflow-hidden' 
            : 'p-3.5 sm:p-4'
        } ${
          isBye
            ? 'bg-slate-900/60 border-slate-800/80 ring-1 ring-slate-800'
            : !isReady
            ? 'bg-slate-950/70 border-slate-800/80 opacity-80'
            : isCompleted
            ? 'bg-slate-900 border-slate-700/80 hover:border-amber-500/50 hover:shadow-amber-500/5 cursor-pointer'
            : 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/30 hover:border-amber-400 cursor-pointer'
        }`}
      >
        {/* Match Header Bar */}
        <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 shrink-0">
              Luta #{match.matchNumber}
            </span>
            {match.roundLabel && (
              <span className="text-[8px] font-bold text-slate-400 bg-slate-950 border border-slate-800/80 px-1.5 py-0.2 rounded truncate max-w-[105px]">
                {match.roundLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isBye ? (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-black text-[8px] uppercase tracking-wider">
                ⚡ BYE
              </span>
            ) : isCompleted ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Fim
              </span>
            ) : isReady ? (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[8px] uppercase tracking-wider animate-pulse">
                ⚔️ Ao Vivo
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-slate-500 font-medium text-[8px] border border-slate-800">
                Aguardando
              </span>
            )}
          </div>
        </div>

        {/* Competitor 1 (Faixa Azul / Canto 1) */}
        <div
          className={`px-2 py-1 rounded-lg flex items-center justify-between gap-1.5 transition-all shrink-0 ${
            isWinner1
              ? 'bg-amber-500/15 border border-amber-500/50 font-bold text-amber-100 shadow-xs'
              : isCompleted && !isWinner1
              ? 'bg-slate-950/40 border border-slate-900/80 text-slate-500 line-through opacity-50'
              : 'bg-slate-950/80 border border-slate-800/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Corner indicator: Blue corner dot / rank */}
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300/40 shrink-0 flex items-center justify-center text-[6px] font-black text-white shadow-xs">
              1
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-extrabold text-[11px] truncate max-w-[130px]">
                  {match.competitor1?.name || (
                    <span className="text-slate-500 italic font-normal text-[10px]">Aguardando</span>
                  )}
                </p>
                {match.competitor1Seed && (
                  <span className="text-[7px] font-bold text-slate-400 bg-slate-800 px-1 rounded shrink-0">
                    #{match.competitor1Seed}
                  </span>
                )}
              </div>
              {match.competitor1 && (
                <div className="mt-0.5">
                  <BeltBadge belt={match.competitor1.belt} stripes={match.competitor1.stripes} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Winner Crown or Points */}
          <div className="text-right shrink-0 flex items-center gap-1">
            {isWinner1 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">
                👑
              </span>
            )}
            {isCompleted && (
              <div className="flex flex-col items-end">
                <span className="font-black text-[11px] text-amber-400 px-1 py-0.2 rounded bg-slate-900 border border-slate-700 leading-none">
                  {match.score1 ?? 0}
                </span>
                {(match.advantages1 !== undefined && match.advantages1 > 0) && (
                  <span className="text-[7px] font-bold text-amber-500/90 leading-none mt-0.5">+{match.advantages1}v</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Competitor 2 (Faixa Branca / Canto 2) */}
        <div
          className={`px-2 py-1 rounded-lg flex items-center justify-between gap-1.5 transition-all shrink-0 ${
            isWinner2
              ? 'bg-amber-500/15 border border-amber-500/50 font-bold text-amber-100 shadow-xs'
              : isCompleted && !isWinner2
              ? 'bg-slate-950/40 border border-slate-900/80 text-slate-500 line-through opacity-50'
              : 'bg-slate-950/80 border border-slate-800/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Corner indicator: Amber corner dot / rank */}
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200/40 shrink-0 flex items-center justify-center text-[6px] font-black text-slate-950 shadow-xs">
              2
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-extrabold text-[11px] truncate max-w-[130px]">
                  {match.competitor2?.name || (
                    <span className="text-slate-500 italic font-normal text-[10px]">
                      {isBye ? 'W.O. / BYE Oficial' : 'Aguardando'}
                    </span>
                  )}
                </p>
                {match.competitor2Seed && (
                  <span className="text-[7px] font-bold text-slate-400 bg-slate-800 px-1 rounded shrink-0">
                    #{match.competitor2Seed}
                  </span>
                )}
              </div>
              {match.competitor2 && (
                <div className="mt-0.5">
                  <BeltBadge belt={match.competitor2.belt} stripes={match.competitor2.stripes} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Winner Crown or Points */}
          <div className="text-right shrink-0 flex items-center gap-1">
            {isWinner2 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">
                👑
              </span>
            )}
            {isCompleted && (
              <div className="flex flex-col items-end">
                <span className="font-black text-[11px] text-blue-400 px-1 py-0.2 rounded bg-slate-900 border border-slate-700 leading-none">
                  {match.score2 ?? 0}
                </span>
                {(match.advantages2 !== undefined && match.advantages2 > 0) && (
                  <span className="text-[7px] font-bold text-blue-400/90 leading-none mt-0.5">+{match.advantages2}v</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions Bar (Carefully formatted to fit comfortably in 168px height) */}
        <div className="pt-1.5 border-t border-slate-800/80 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isReady && canManage && !isCompleted ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => match.competitor1 && onQuickSelectWinner?.(match, match.competitor1.id, match.competitor1.name)}
                className="flex-1 py-1 px-1 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white font-bold text-[9px] transition-all truncate text-center border border-blue-500/30 cursor-pointer"
                title={`Declarar ${match.competitor1?.name} como vencedor`}
              >
                👑 {match.competitor1?.name?.split(' ')[0]}
              </button>

              <button
                type="button"
                onClick={() => match.competitor2 && onQuickSelectWinner?.(match, match.competitor2.id, match.competitor2.name)}
                className="flex-1 py-1 px-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[9px] transition-all truncate text-center border border-amber-500/30 cursor-pointer"
                title={`Declarar ${match.competitor2?.name} como vencedor`}
              >
                👑 {match.competitor2?.name?.split(' ')[0]}
              </button>

              <button
                type="button"
                onClick={() => onSelectMatch(match)}
                className="py-1 px-2 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white font-bold text-[9px] flex items-center gap-0.5 border border-blue-500/40 cursor-pointer shrink-0 transition-colors"
                title="Abrir Placar Eletrônico de Combate"
              >
                📊 Placar
              </button>

              {onNavigateToTimer && (
                <button
                  type="button"
                  onClick={() => onNavigateToTimer(category.matchDurationMinutes || 5, `Luta #${match.matchNumber} - ${category.name}`)}
                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[9px] border border-emerald-500/30 cursor-pointer shrink-0"
                  title="Abrir Cronômetro do Tatame"
                >
                  <Clock className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : isCompleted ? (
            <div className="flex items-center justify-between gap-1 text-[9px]">
              <span className="truncate text-amber-400 font-extrabold">
                {match.outcomeType === 'SUBMISSION' && match.submissionTechnique
                  ? `🥋 ${match.submissionTechnique}`
                  : isBye
                  ? '⚡ Avançou por BYE Oficial'
                  : `Vitória: ${match.winnerName?.split(' ')[0]}`}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onSelectMatch(match)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 cursor-pointer shrink-0"
                  title="Ver ou Editar Placar da Luta"
                >
                  📊 Placar
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-[9px] text-slate-500 italic py-0.5">
              {isBye ? '⚡ Avançou direto para a próxima fase' : 'Aguardando definição dos atletas'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate Geometry for SVG Bracket Connectors and absolute Match positions in TREE mode
  const treeLayout = useMemo(() => {
    if (roundsMap.length === 0) return { positions: {}, totalHeight: 400, totalWidth: 800 };

    const positions: Record<string, { top: number; center: number; left: number }> = {};
    const round1 = roundsMap[0];
    const numRound1Matches = round1?.matches.length || 1;

    // Calculate Round 1 Y-centers
    const r1Centers: number[] = [];
    const headerOffset = 44;
    for (let i = 0; i < numRound1Matches; i++) {
      const center = headerOffset + i * (CARD_HEIGHT + ROUND1_GAP) + CARD_HEIGHT / 2;
      r1Centers.push(center);
      const m = round1.matches[i];
      if (m) {
        positions[m.id] = {
          center,
          top: center - CARD_HEIGHT / 2,
          left: 0,
        };
      }
    }

    let previousRoundCenters = r1Centers;

    // Calculate subsequent rounds (2, 3, etc.)
    for (let rIdx = 1; rIdx < roundsMap.length; rIdx++) {
      const currentRound = roundsMap[rIdx];
      const nextCenters: number[] = [];
      const colLeft = rIdx * (CARD_WIDTH + COLUMN_GAP);

      for (let p = 0; p < currentRound.matches.length; p++) {
        const m = currentRound.matches[p];
        const topParent = previousRoundCenters[2 * p] ?? previousRoundCenters[0] ?? 0;
        const botParent = previousRoundCenters[2 * p + 1] ?? topParent;
        const center = (topParent + botParent) / 2;
        nextCenters.push(center);

        if (m) {
          positions[m.id] = {
            center,
            top: center - CARD_HEIGHT / 2,
            left: colLeft,
          };
        }
      }
      previousRoundCenters = nextCenters;
    }

    const totalHeight = Math.max(
      headerOffset + numRound1Matches * (CARD_HEIGHT + ROUND1_GAP) + 80,
      500
    );
    const totalWidth = roundsMap.length * (CARD_WIDTH + COLUMN_GAP) + (category.podium ? 320 : 60);

    return { positions, totalHeight, totalWidth };
  }, [roundsMap, category.podium]);

  return (
    <div ref={containerRef} className={`space-y-4 sm:space-y-6 ${isFullscreen ? 'bg-slate-950 p-6 overflow-y-auto min-h-screen' : ''}`}>
      {/* Alert Banner for Corrupted / Outdated Bracket Format */}
      {hasCorruptedMatches && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="font-extrabold text-xs sm:text-sm text-amber-300">
                Chaveamento com confrontos vazios detectado
              </h5>
              <p className="text-[11px] sm:text-xs text-amber-200/80 leading-relaxed">
                Esta chave possui confrontos sem atletas na fase inicial. Alinhe para o <strong>Chaveamento Oficial de Campeonato (IBJJF)</strong> com distribuição correta de BYEs para os cabeças de chave.
              </p>
            </div>
          </div>

          {canManage && onRegenerateBracket && (
            <button
              type="button"
              onClick={onRegenerateBracket}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Alinhar Chave Oficial</span>
            </button>
          )}
        </div>
      )}

      {/* Top Championship Toolbar: View Mode Switcher, Zoom & Projection Controls */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        {/* View Mode Segmented Control: Visual Tree vs Sequential List */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('TREE')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'TREE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Chave de Campeonato (Árvore)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'LIST'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Ordem das Lutas (Lista)</span>
          </button>
        </div>

        {/* Right Tools: Zoom, Fullscreen, Quick Filter */}
        <div className="flex items-center gap-2 justify-between lg:justify-end flex-wrap">
          {viewMode === 'TREE' ? (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 px-2">Zoom:</span>
              {[
                { label: '75%', scale: 0.75 },
                { label: '100%', scale: 1 },
                { label: '120%', scale: 1.2 },
              ].map(z => (
                <button
                  key={z.label}
                  type="button"
                  onClick={() => setZoomScale(z.scale)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    zoomScale === z.scale
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {z.label}
                </button>
              ))}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors ml-1"
                title={isFullscreen ? 'Sair da Tela Cheia' : 'Projetar Chave em Tela Cheia (TV / Tatame)'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              {[
                { id: 'ALL', label: 'Todas as Lutas' },
                { id: 'READY', label: '⚔️ Prontas' },
                { id: 'COMPLETED', label: '🏁 Concluídas' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMatchStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    matchStatusFilter === f.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {canManage && onRegenerateBracket && (
            <button
              type="button"
              onClick={onRegenerateBracket}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs inline-flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Regerar Chaveamento com regras oficiais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Regerar Chave</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: OFFICIAL TOURNAMENT TREE (CHAVE OFICIAL COM ESPAÇAMENTO MATEMÁTICO REAL) */}
      {viewMode === 'TREE' && (
        <div className="p-4 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800/90 overflow-x-auto shadow-2xl relative scrollbar-thin">
          <div
            className="relative min-w-max transition-transform origin-top-left"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top left',
              width: `${treeLayout.totalWidth}px`,
              height: `${treeLayout.totalHeight}px`,
            }}
          >
            {/* SVG Connector Lines Overlay */}
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              width={treeLayout.totalWidth}
              height={treeLayout.totalHeight}
            >
              <defs>
                <linearGradient id="winnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Render connector branch lines between consecutive rounds */}
              {roundsMap.map((roundObj, rIdx) => {
                if (rIdx >= roundsMap.length - 1) return null;
                const nextRound = roundsMap[rIdx + 1];

                return roundObj.matches.map((match) => {
                  const targetMatch = nextRound.matches.find(m => m.id === match.nextMatchId);
                  if (!targetMatch) return null;

                  const startPos = treeLayout.positions[match.id];
                  const endPos = treeLayout.positions[targetMatch.id];
                  if (!startPos || !endPos) return null;

                  const xStart = startPos.left + CARD_WIDTH;
                  const yStart = startPos.center;
                  const xEnd = endPos.left;
                  const yEnd = endPos.center;
                  const xMid = xStart + COLUMN_GAP / 2;

                  const isWinnerAdvancing = match.status === 'COMPLETED' && Boolean(match.winnerId);

                  // Smooth branch path with rounded corner
                  const radius = 8;
                  const goingDown = yEnd > yStart;

                  let pathD = '';
                  if (Math.abs(yEnd - yStart) < 4) {
                    pathD = `M ${xStart} ${yStart} H ${xEnd}`;
                  } else if (goingDown) {
                    pathD = `M ${xStart} ${yStart} H ${xMid - radius} Q ${xMid} ${yStart} ${xMid} ${yStart + radius} V ${yEnd - radius} Q ${xMid} ${yEnd} ${xMid + radius} ${yEnd} H ${xEnd}`;
                  } else {
                    pathD = `M ${xStart} ${yStart} H ${xMid - radius} Q ${xMid} ${yStart} ${xMid} ${yStart - radius} V ${yEnd + radius} Q ${xMid} ${yEnd} ${xMid + radius} ${yEnd} H ${xEnd}`;
                  }

                  return (
                    <g key={`connector-${match.id}-${targetMatch.id}`}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isWinnerAdvancing ? 'url(#winnerGradient)' : '#334155'}
                        strokeWidth={isWinnerAdvancing ? 2.5 : 1.5}
                        strokeDasharray={!isWinnerAdvancing ? '4 3' : undefined}
                        className="transition-all duration-300"
                      />
                      {isWinnerAdvancing && (
                        <circle
                          cx={xMid}
                          cy={yEnd}
                          r={3}
                          fill="#f59e0b"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  );
                });
              })}

              {/* Connector from Final Match to Official Podium if finished */}
              {roundsMap.length > 0 && category.podium?.first && (
                (() => {
                  const finalRound = roundsMap[roundsMap.length - 1];
                  const finalMatch = finalRound?.matches[0];
                  if (!finalMatch) return null;
                  const fPos = treeLayout.positions[finalMatch.id];
                  if (!fPos) return null;

                  const xStart = fPos.left + CARD_WIDTH;
                  const yStart = fPos.center;
                  const xEnd = xStart + COLUMN_GAP;

                  return (
                    <path
                      d={`M ${xStart} ${yStart} H ${xEnd}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      className="animate-pulse"
                    />
                  );
                })()
              )}
            </svg>

            {/* Rounds Columns with Match Cards */}
            {roundsMap.map((roundObj, rIdx) => {
              const colLeft = rIdx * (CARD_WIDTH + COLUMN_GAP);

              return (
                <div
                  key={roundObj.roundNum}
                  className="absolute"
                  style={{ left: `${colLeft}px`, width: `${CARD_WIDTH}px`, top: 0 }}
                >
                  {/* Column Header */}
                  <div className="h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-white shadow-md mb-2">
                    <span className="font-black text-xs text-amber-400 uppercase tracking-wider truncate">
                      {roundObj.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 font-bold text-[9px] border border-slate-800">
                      {roundObj.matches.length} {roundObj.matches.length === 1 ? 'luta' : 'lutas'}
                    </span>
                  </div>

                  {/* Matches absolute positioned inside column with guaranteed vertical spacing */}
                  {roundObj.matches.map((match) => {
                    const pos = treeLayout.positions[match.id];
                    if (!pos) return null;

                    return (
                      <div
                        key={match.id}
                        className="absolute z-10"
                        style={{ top: `${pos.top}px`, left: 0 }}
                      >
                        {renderMatchCard(match, true)}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Podium Node at the end of the bracket tree */}
            {category.podium && (
              <div
                className="absolute z-10"
                style={{
                  left: `${roundsMap.length * (CARD_WIDTH + COLUMN_GAP)}px`,
                  top: `${(treeLayout.positions[roundsMap[roundsMap.length - 1]?.matches[0]?.id]?.top ?? 100) - 20}px`,
                  width: '260px',
                }}
              >
                <div className="p-4 rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="font-black text-xs text-amber-300 uppercase tracking-wider">
                      Pódio Oficial
                    </span>
                  </div>

                  {/* 1st Place */}
                  {category.podium.first && (
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🥇</span>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-amber-200 truncate">{category.podium.first.name}</p>
                          <span className="text-[9px] font-bold text-amber-400 uppercase">Campeão (Ouro)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2nd Place */}
                  {category.podium.second && (
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🥈</span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-200 truncate">{category.podium.second.name}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Vice-Campeão</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {category.podium.third && (
                    <div className="p-2 rounded-xl bg-amber-900/20 border border-amber-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🥉</span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-amber-200/90 truncate">{category.podium.third.name}</p>
                          <span className="text-[9px] font-bold text-amber-600 uppercase">3º Lugar (Bronze)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SEQUENTIAL LIST VIEW FOR MOBILES & CALL ORDERS */}
      {viewMode === 'LIST' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Round Navigation Pills on Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedRoundFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedRoundFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Todas as Fases ({matches.length})
            </button>

            {roundsMap.map(r => (
              <button
                key={r.roundNum}
                type="button"
                onClick={() => setSelectedRoundFilter(r.roundNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRoundFilter === r.roundNum
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {r.label} ({r.matches.length})
              </button>
            ))}

            {thirdPlaceMatch && (
              <button
                type="button"
                onClick={() => setSelectedRoundFilter(999)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRoundFilter === 999
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                🥉 3º Lugar
              </button>
            )}
          </div>

          {/* Rounds List Accordions */}
          {roundsMap
            .filter(r => selectedRoundFilter === 'ALL' || selectedRoundFilter === r.roundNum)
            .map((roundObj) => {
              const isCollapsed = Boolean(collapsedRounds[roundObj.roundNum]);
              const filteredMatches = roundObj.matches.filter(m => {
                if (matchStatusFilter === 'READY') return m.status !== 'COMPLETED' && m.competitor1 && m.competitor2;
                if (matchStatusFilter === 'COMPLETED') return m.status === 'COMPLETED';
                return true;
              });

              return (
                <div
                  key={roundObj.roundNum}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-md space-y-3"
                >
                  {/* Round Header (Clickable to collapse/expand) */}
                  <div
                    onClick={() => toggleRoundCollapse(roundObj.roundNum)}
                    className="p-4 sm:p-5 bg-slate-900 flex items-center justify-between border-b border-slate-800 cursor-pointer select-none hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs shadow-inner">
                        #{roundObj.roundNum}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                          <span>{roundObj.label}</span>
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400">
                          {roundObj.matches.filter(m => m.status === 'COMPLETED').length} de {roundObj.matches.length} lutas concluídas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-400 font-black text-xs">
                        {roundObj.matches.length} {roundObj.matches.length === 1 ? 'confronto' : 'confrontos'}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Matches Cards in this Round */}
                  {!isCollapsed && (
                    <div className="p-3.5 sm:p-5 pt-0">
                      {filteredMatches.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-500">
                          Nenhuma luta com o filtro selecionado nesta fase.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                          {filteredMatches.map(match => renderMatchCard(match, false))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* 3rd Place Match Card (Bronze Medal) */}
      {thirdPlaceMatch && (selectedRoundFilter === 'ALL' || selectedRoundFilter === 999) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-amber-900/40 text-white space-y-3 max-w-xl shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-xs text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              🥉 Disputa de 3º Lugar (Medalha de Bronze)
            </span>
            {thirdPlaceMatch.status === 'COMPLETED' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-bold">
                Finalizada 🏁
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold">
                Luta Oficial
              </span>
            )}
          </div>

          {renderMatchCard(thirdPlaceMatch, false)}
        </div>
      )}
    </div>
  );
};
