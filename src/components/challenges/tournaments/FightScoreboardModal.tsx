import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TournamentMatch, RollOutcomeType } from '../../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trophy,
  Swords,
  ShieldAlert,
  Award,
  X,
  Check,
  Plus,
  Minus,
} from 'lucide-react';

export interface FightScoreboardModalProps {
  match?: TournamentMatch;
  competitor1?: {
    id: string;
    name: string;
    belt?: string;
    stripes?: number;
    academy?: string;
  };
  competitor2?: {
    id: string;
    name: string;
    belt?: string;
    stripes?: number;
    academy?: string;
  };
  matchDurationMinutes?: number;
  categoryName?: string;
  tournamentTitle?: string;
  onClose: () => void;
  onSaveResult: (result: {
    winnerId: string;
    winnerName: string;
    outcomeType?: RollOutcomeType;
    submissionTechnique?: string;
    submissionMinute?: number;
    score1?: number;
    score2?: number;
    advantages1?: number;
    advantages2?: number;
    penalties1?: number;
    penalties2?: number;
    notes?: string;
  }) => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
}

const COMMON_SUBMISSIONS = [
  'Armlock (Chave de Braço)',
  'Triângulo',
  'Mata-Leão',
  'Kimura',
  'Guilhotina',
  'Americana',
  'Ezequiel',
  'Katagatame',
  'Omoplata',
  'Estrangulamento Cruzado',
  'Chave de Pé Reta (Botinha)',
  'Mão de Vaca',
  'Chave de Joelho (Kneebar)',
  'Mata-Leão no Pé (Toe Hold)',
  'Calf Slicer (Chave de Panturrilha)',
  'Chave de Calcanhar (Heel Hook)',
  'Crucifixo / Lapela',
  'Relógio (Clock Choke)',
  'Arco e Flecha (Bow and Arrow)',
];

export const FightScoreboardModal: React.FC<FightScoreboardModalProps> = ({
  match,
  competitor1,
  competitor2,
  matchDurationMinutes = 5,
  categoryName,
  tournamentTitle,
  onClose,
  onSaveResult,
}) => {
  const c1 = match?.competitor1 || competitor1;
  const c2 = match?.competitor2 || competitor2;

  // Score states for Competitor 1 (Atleta 1)
  const [score1, setScore1] = useState<number>(match?.score1 ?? 0);
  const [advantages1, setAdvantages1] = useState<number>(match?.advantages1 ?? 0);
  const [penalties1, setPenalties1] = useState<number>(match?.penalties1 ?? 0);

  // Score states for Competitor 2 (Atleta 2)
  const [score2, setScore2] = useState<number>(match?.score2 ?? 0);
  const [advantages2, setAdvantages2] = useState<number>(match?.advantages2 ?? 0);
  const [penalties2, setPenalties2] = useState<number>(match?.penalties2 ?? 0);

  // Timer states
  const initialDurationSeconds = Math.max(matchDurationMinutes * 60, 60);
  const [timeLeft, setTimeLeft] = useState<number>(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoApplyIbjjfPenalties] = useState<boolean>(true);

  // Modal / Finish Drawer state
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState<boolean>(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(
    match?.winnerId || (c1 ? c1.id : '')
  );
  const [outcomeType, setOutcomeType] = useState<RollOutcomeType>(
    match?.outcomeType || 'POINTS'
  );
  const [submissionTechnique, setSubmissionTechnique] = useState<string>(
    match?.submissionTechnique || COMMON_SUBMISSIONS[0]
  );
  const [customSubmission, setCustomSubmission] = useState<string>('');
  const [submissionMinute, setSubmissionMinute] = useState<number>(
    match?.submissionMinute || Math.max(1, Math.ceil((initialDurationSeconds - timeLeft) / 60))
  );
  const [notes, setNotes] = useState<string>(match?.notes || '');

  const modalRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Web Audio Synth for Tatame Audio Alerts
  const playSound = useCallback((type: 'COMBATE' | 'PAUSE' | 'BELL_FINAL' | 'WARNING_10S' | 'POINT') => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'COMBATE') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'PAUSE') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(650, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'BELL_FINAL') {
        [220, 440, 660, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now);
          const vol = 0.25 / (idx + 1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
          osc.start(now);
          osc.stop(now + 2.5);
        });
      } else if (type === 'WARNING_10S') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(987.77, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'POINT') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close();
        } catch (_) {}
      }, 3000);
    } catch (_) {}
  }, []);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound('BELL_FINAL');
            return 0;
          }
          if (prev === 11) {
            playSound('WARNING_10S');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, playSound]);

  // Spacebar and F hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        setSoundEnabled((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, timeLeft]);

  // Toggle Timer
  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(initialDurationSeconds);
      setIsRunning(true);
      playSound('COMBATE');
      return;
    }
    const nextState = !isRunning;
    setIsRunning(nextState);
    if (nextState) {
      playSound('COMBATE');
    } else {
      playSound('PAUSE');
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialDurationSeconds);
    playSound('PAUSE');
  };

  const adjustTimer = (secondsDelta: number) => {
    setTimeLeft((prev) => Math.max(0, prev + secondsDelta));
  };

  // Fullscreen toggle for TV projection / Tatame monitor
  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Score Handlers
  const handleScore1Change = (delta: number) => {
    setScore1((prev) => Math.max(0, prev + delta));
    playSound('POINT');
  };

  const handleScore2Change = (delta: number) => {
    setScore2((prev) => Math.max(0, prev + delta));
    playSound('POINT');
  };

  const handleAdv1Change = (delta: number) => {
    setAdvantages1((prev) => Math.max(0, prev + delta));
    playSound('POINT');
  };

  const handleAdv2Change = (delta: number) => {
    setAdvantages2((prev) => Math.max(0, prev + delta));
    playSound('POINT');
  };

  const handlePen1Change = (delta: number) => {
    const nextVal = Math.max(0, penalties1 + delta);
    setPenalties1(nextVal);
    playSound('POINT');

    if (autoApplyIbjjfPenalties && delta > 0) {
      if (nextVal === 2) {
        setAdvantages2((prev) => prev + 1);
      } else if (nextVal === 3) {
        setScore2((prev) => prev + 2);
      }
    }
  };

  const handlePen2Change = (delta: number) => {
    const nextVal = Math.max(0, penalties2 + delta);
    setPenalties2(nextVal);
    playSound('POINT');

    if (autoApplyIbjjfPenalties && delta > 0) {
      if (nextVal === 2) {
        setAdvantages1((prev) => prev + 1);
      } else if (nextVal === 3) {
        setScore1((prev) => prev + 2);
      }
    }
  };

  // Auto-evaluate current leader in points
  const leaderInfo = useMemo(() => {
    if (!c1 || !c2) return { leaderId: null, label: 'Aguardando Atletas' };

    if (score1 > score2) {
      return { 
        leaderId: c1.id, 
        label: `${c1.name.split(' ')[0]} Liderando (${score1} x ${score2})`
      };
    }
    if (score2 > score1) {
      return { 
        leaderId: c2.id, 
        label: `${c2.name.split(' ')[0]} Liderando (${score2} x ${score1})`
      };
    }

    if (advantages1 > advantages2) {
      return { 
        leaderId: c1.id, 
        label: `${c1.name.split(' ')[0]} Liderando por Vantagens (${advantages1} x ${advantages2})`
      };
    }
    if (advantages2 > advantages1) {
      return { 
        leaderId: c2.id, 
        label: `${c2.name.split(' ')[0]} Liderando por Vantagens (${advantages2} x ${advantages1})`
      };
    }

    if (penalties1 < penalties2) {
      return { 
        leaderId: c1.id, 
        label: `${c1.name.split(' ')[0]} Liderando por Menos Punições`
      };
    }
    if (penalties2 < penalties1) {
      return { 
        leaderId: c2.id, 
        label: `${c2.name.split(' ')[0]} Liderando por Menos Punições`
      };
    }

    return { leaderId: null, label: 'Empate Técnico' };
  }, [score1, score2, advantages1, advantages2, penalties1, penalties2, c1, c2]);

  // Open Finish Dialog
  const openFinishDialog = (suggestedOutcome?: RollOutcomeType) => {
    if (suggestedOutcome) {
      setOutcomeType(suggestedOutcome);
    }
    if (leaderInfo.leaderId) {
      setSelectedWinnerId(leaderInfo.leaderId);
    } else if (c1) {
      setSelectedWinnerId(c1.id);
    }

    const elapsedMinutes = Math.max(1, Math.ceil((initialDurationSeconds - timeLeft) / 60));
    setSubmissionMinute(elapsedMinutes);

    setIsFinishDialogOpen(true);
  };

  // Confirm final result and save
  const handleConfirmSave = () => {
    if (!selectedWinnerId) {
      alert('Selecione o atleta vencedor para registrar o resultado.');
      return;
    }

    const winnerName =
      selectedWinnerId === c1?.id
        ? c1.name
        : selectedWinnerId === c2?.id
        ? c2.name
        : 'Atleta';

    const finalTechnique =
      outcomeType === 'SUBMISSION'
        ? customSubmission.trim() || submissionTechnique
        : undefined;

    onSaveResult({
      winnerId: selectedWinnerId,
      winnerName,
      outcomeType,
      submissionTechnique: finalTechnique,
      submissionMinute: outcomeType === 'SUBMISSION' ? Number(submissionMinute) : undefined,
      score1: Number(score1),
      score2: Number(score2),
      advantages1: Number(advantages1),
      advantages2: Number(advantages2),
      penalties1: Number(penalties1),
      penalties2: Number(penalties2),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  // Formatting MM:SS
  const formatMinutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const formatSeconds = (timeLeft % 60).toString().padStart(2, '0');

  // Authentic BJJ Belt Badge Component as shown in BJJCRON
  const renderBjjBeltTag = (beltName?: string, stripes?: number) => {
    const raw = (beltName || 'BRANCA').trim().toUpperCase();
    let mainClass = 'bg-white text-slate-950 font-black';
    let tipClass = 'bg-black text-white font-black';

    if (raw.includes('AZUL')) {
      mainClass = 'bg-blue-600 text-white font-black';
    } else if (raw.includes('ROXA')) {
      mainClass = 'bg-purple-700 text-white font-black';
    } else if (raw.includes('MARROM')) {
      mainClass = 'bg-[#78350F] text-amber-100 font-black';
    } else if (raw.includes('PRETA')) {
      mainClass = 'bg-black text-white font-black border border-slate-700';
      tipClass = 'bg-red-600 text-white font-black';
    } else if (raw.includes('LARANJA')) {
      mainClass = 'bg-[#EA580C] text-slate-950 font-black';
    } else if (raw.includes('AMARELA')) {
      mainClass = 'bg-[#EAB308] text-slate-950 font-black';
    } else if (raw.includes('VERDE')) {
      mainClass = 'bg-emerald-600 text-white font-black';
    } else if (raw.includes('CINZA')) {
      mainClass = 'bg-slate-400 text-slate-950 font-black';
    }

    const stripesLabel = stripes && stripes > 0 ? `${stripes}º GRAU` : 'SEM GRAU';

    return (
      <div className="inline-flex items-center rounded-sm overflow-hidden border border-slate-700 shadow-xs text-[11px] sm:text-xs">
        <span className={`px-2.5 py-0.5 tracking-wider uppercase ${mainClass}`}>
          {raw}
        </span>
        <span className={`px-2 py-0.5 tracking-wider uppercase ${tipClass}`}>
          {stripesLabel}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto ${
        isFullscreen ? 'p-0 w-screen h-screen' : ''
      }`}
    >
      <div
        className={`w-full max-w-6xl bg-black border border-slate-800 rounded-2xl text-white shadow-2xl overflow-hidden flex flex-col justify-between my-auto transition-all ${
          isFullscreen ? 'h-screen max-w-none rounded-none border-none' : 'max-h-[96vh]'
        }`}
      >
        {/* ==================== BJJCRON TOP BAR ==================== */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-black border-b border-slate-900 flex items-center justify-between gap-2 shrink-0">
          {/* Athlete 1 Belt Info (Left) */}
          <div className="flex flex-col items-start min-w-[140px] sm:min-w-[180px]">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              FAIXA VERDE-AMARELA
            </span>
            {renderBjjBeltTag(c1?.belt || 'BRANCA', c1?.stripes ?? 1)}
          </div>

          {/* Central Giant Countdown Clock (05:00) */}
          <div className="flex flex-col items-center justify-center">
            <div
              onClick={toggleTimer}
              className="cursor-pointer select-none font-mono font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-white hover:scale-102 active:scale-98 transition-transform"
              title="Clique para Iniciar/Pausar [Espaço]"
            >
              <span
                className={`tabular-nums ${
                  isRunning
                    ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                    : timeLeft === 0
                    ? 'text-rose-500 animate-pulse'
                    : 'text-white'
                }`}
              >
                {formatMinutes}:{formatSeconds}
              </span>
            </div>

            {/* Sub-label status */}
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                  isRunning
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : timeLeft === 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isRunning ? 'EM COMBATE' : timeLeft === 0 ? 'TEMPO ESGOTADO' : 'COMBATE PARADO'}
              </span>
            </div>
          </div>

          {/* Athlete 2 Belt Info (Right) */}
          <div className="flex flex-col items-end min-w-[140px] sm:min-w-[180px]">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              {c2?.belt ? `FAIXA ${c2.belt.toUpperCase()}` : 'FAIXA LARANJA'}
            </span>
            {renderBjjBeltTag(c2?.belt || 'LARANJA', c2?.stripes ?? 0)}
          </div>
        </div>

        {/* ==================== BJJCRON DUAL ATHLETE ROWS ==================== */}
        <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 bg-black flex-1 overflow-y-auto">
          {/* ===================== ROW 1: ATLETA 1 ===================== */}
          <div className="flex flex-col lg:flex-row items-stretch gap-3 sm:gap-4">
            {/* Left Block: Deep Blue Athlete Badge */}
            <div className="w-full lg:w-[35%] bg-[#0B3B82] rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center gap-4 sm:gap-6 border border-blue-600/30 shadow-md">
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-blue-200 uppercase">
                  ATLETA 1
                </span>
                <span className="font-mono font-black text-4xl sm:text-5xl text-white leading-none mt-1">
                  1
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-lg sm:text-xl md:text-2xl text-white uppercase tracking-wide truncate">
                  {c1?.name || 'GABRIEL NERES'}
                </h3>
              </div>
            </div>

            {/* Right Group: PONTOS (Green) • VANTAGENS (Yellow) • PENALIDADES (Red) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Box: PONTOS (Green) */}
              <div className="bg-black rounded-xl border-2 border-[#198754] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#198754] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                    PONTOS
                  </span>
                </div>
                <div
                  onClick={() => handleScore1Change(1)}
                  className="py-3 sm:py-4 text-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
                  title="Toque para somar +1 ponto"
                >
                  <span className="font-mono font-black text-6xl sm:text-7xl md:text-8xl text-[#198754] leading-none drop-shadow-[0_0_15px_rgba(25,135,84,0.4)]">
                    {score1}
                  </span>
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleScore1Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Ponto (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScore1Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Ponto (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Box: VANTAGENS (Yellow) */}
              <div className="bg-black rounded-xl border-2 border-[#ffc107] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#ffc107] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                    VANTAGENS
                  </span>
                </div>
                <div
                  onClick={() => handleAdv1Change(1)}
                  className="py-3 sm:py-4 text-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
                  title="Toque para somar +1 vantagem"
                >
                  <span className="font-mono font-black text-6xl sm:text-7xl md:text-8xl text-[#ffc107] leading-none drop-shadow-[0_0_15px_rgba(255,193,7,0.4)]">
                    {advantages1}
                  </span>
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdv1Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Vantagem (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdv1Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Vantagem (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Box: PENALIDADES (Red) */}
              <div className="bg-black rounded-xl border-2 border-[#dc3545] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#dc3545] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                    PENALIDADES
                  </span>
                </div>
                <div className="py-3 px-2 flex items-center justify-center gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4].map((step) => {
                    const isGiven = penalties1 >= step;
                    let boxStyle = 'bg-[#0b1120] border-slate-800 text-slate-500';
                    if (isGiven) {
                      if (step === 1) boxStyle = 'bg-amber-400 border-amber-300 text-black font-black shadow-md';
                      else if (step === 2) boxStyle = 'bg-amber-500 border-amber-400 text-black font-black shadow-md';
                      else if (step === 3) boxStyle = 'bg-orange-600 border-orange-400 text-white font-black shadow-md';
                      else boxStyle = 'bg-red-600 border-red-400 text-white font-black animate-pulse shadow-md';
                    }
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          const nextVal = penalties1 === step ? step - 1 : step;
                          setPenalties1(nextVal);
                          playSound('POINT');
                        }}
                        className={`w-9 h-10 sm:w-10 sm:h-12 rounded-lg border-2 flex items-center justify-center font-mono font-black text-sm sm:text-base cursor-pointer transition-all active:scale-95 ${boxStyle}`}
                        title={`Penalidade ${step}`}
                      >
                        {step}
                      </button>
                    );
                  })}
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePen1Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Penalidade (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePen1Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Penalidade (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== ROW 2: ATLETA 2 ===================== */}
          <div className="flex flex-col lg:flex-row items-stretch gap-3 sm:gap-4">
            {/* Left Block: Deep Blue Athlete Badge */}
            <div className="w-full lg:w-[35%] bg-[#0B3B82] rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center gap-4 sm:gap-6 border border-blue-600/30 shadow-md">
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-blue-200 uppercase">
                  ATLETA 2
                </span>
                <span className="font-mono font-black text-4xl sm:text-5xl text-white leading-none mt-1">
                  2
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-lg sm:text-xl md:text-2xl text-white uppercase tracking-wide truncate">
                  {c2?.name || 'PEDRO LOREDO BORGES'}
                </h3>
              </div>
            </div>

            {/* Right Group: PONTOS (Green) • VANTAGENS (Yellow) • PENALIDADES (Red) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Box: PONTOS (Green) */}
              <div className="bg-black rounded-xl border-2 border-[#198754] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#198754] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                    PONTOS
                  </span>
                </div>
                <div
                  onClick={() => handleScore2Change(1)}
                  className="py-3 sm:py-4 text-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
                  title="Toque para somar +1 ponto"
                >
                  <span className="font-mono font-black text-6xl sm:text-7xl md:text-8xl text-[#198754] leading-none drop-shadow-[0_0_15px_rgba(25,135,84,0.4)]">
                    {score2}
                  </span>
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleScore2Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Ponto (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScore2Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Ponto (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Box: VANTAGENS (Yellow) */}
              <div className="bg-black rounded-xl border-2 border-[#ffc107] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#ffc107] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                    VANTAGENS
                  </span>
                </div>
                <div
                  onClick={() => handleAdv2Change(1)}
                  className="py-3 sm:py-4 text-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
                  title="Toque para somar +1 vantagem"
                >
                  <span className="font-mono font-black text-6xl sm:text-7xl md:text-8xl text-[#ffc107] leading-none drop-shadow-[0_0_15px_rgba(255,193,7,0.4)]">
                    {advantages2}
                  </span>
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdv2Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Vantagem (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdv2Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Vantagem (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Box: PENALIDADES (Red) */}
              <div className="bg-black rounded-xl border-2 border-[#dc3545] flex flex-col justify-between overflow-hidden shadow-lg">
                <div className="bg-[#dc3545] py-1 text-center">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                    PENALIDADES
                  </span>
                </div>
                <div className="py-3 px-2 flex items-center justify-center gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4].map((step) => {
                    const isGiven = penalties2 >= step;
                    let boxStyle = 'bg-[#0b1120] border-slate-800 text-slate-500';
                    if (isGiven) {
                      if (step === 1) boxStyle = 'bg-amber-400 border-amber-300 text-black font-black shadow-md';
                      else if (step === 2) boxStyle = 'bg-amber-500 border-amber-400 text-black font-black shadow-md';
                      else if (step === 3) boxStyle = 'bg-orange-600 border-orange-400 text-white font-black shadow-md';
                      else boxStyle = 'bg-red-600 border-red-400 text-white font-black animate-pulse shadow-md';
                    }
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          const nextVal = penalties2 === step ? step - 1 : step;
                          setPenalties2(nextVal);
                          playSound('POINT');
                        }}
                        className={`w-9 h-10 sm:w-10 sm:h-12 rounded-lg border-2 flex items-center justify-center font-mono font-black text-sm sm:text-base cursor-pointer transition-all active:scale-95 ${boxStyle}`}
                        title={`Penalidade ${step}`}
                      >
                        {step}
                      </button>
                    );
                  })}
                </div>
                <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePen2Change(-1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Diminuir 1 Penalidade (-1)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePen2Change(1)}
                    className="py-1.5 sm:py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-black text-base sm:text-lg border border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow cursor-pointer"
                    title="Adicionar 1 Penalidade (+1)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BJJCRON CONTROLS BAR ==================== */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#0A0D14] border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Action Left: Timer Controls & Modifiers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleTimer}
              className={`px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 border ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/50 shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>PAROU! [Espaço]</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>COMBATE! [Espaço]</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer active:scale-95 transition-colors"
              title="Reiniciar Tempo Oficial"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => adjustTimer(60)}
                className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Adicionar 1 Minuto"
              >
                +1 min
              </button>
              <button
                type="button"
                onClick={() => adjustTimer(-60)}
                className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Subtrair 1 Minuto"
              >
                -1 min
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-900 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-600 border-slate-800'
              }`}
              title={soundEnabled ? 'Sons Ativados [M]' : 'Sons Desativados [M]'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
              }`}
              title={isFullscreen ? 'Sair da Tela Cheia [F]' : 'Projetar em Tela Cheia (TV/Telão) [F]'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Action Right: Finish Match Buttons & Close */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openFinishDialog('SUBMISSION')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Swords className="w-4 h-4" />
              <span>Finalização 🥋</span>
            </button>

            <button
              type="button"
              onClick={() => openFinishDialog('POINTS')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>Encerrar Luta 🏁</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
              title="Fechar Placar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== SÚMULA DRAWER / RESULT CONFIRMATION ==================== */}
      {isFinishDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-lg text-white shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-100">Registrar Súmula BJJCRON</h4>
                  <p className="text-xs text-slate-400">Confirme o vencedor e o desfecho do combate</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFinishDialogOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Winner Selection */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-2">
                Atleta Vencedor:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!c1}
                  onClick={() => c1 && setSelectedWinnerId(c1.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    selectedWinnerId === c1?.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-md ring-2 ring-blue-500/40'
                      : 'bg-black border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[9px] font-bold text-blue-400 block mb-0.5">Atleta 1</span>
                  <p className="font-black text-sm truncate">{c1?.name || 'Atleta 1'}</p>
                  <div className="mt-2 text-xs font-black text-blue-400">
                    {score1} pts • {advantages1}v • {penalties1}p
                  </div>
                  {selectedWinnerId === c1?.id && (
                    <span className="absolute top-2.5 right-2.5 text-sm">👑</span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!c2}
                  onClick={() => c2 && setSelectedWinnerId(c2.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    selectedWinnerId === c2?.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-100 shadow-md ring-2 ring-amber-500/40'
                      : 'bg-black border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[9px] font-bold text-amber-400 block mb-0.5">Atleta 2</span>
                  <p className="font-black text-sm truncate">{c2?.name || 'Atleta 2'}</p>
                  <div className="mt-2 text-xs font-black text-amber-400">
                    {score2} pts • {advantages2}v • {penalties2}p
                  </div>
                  {selectedWinnerId === c2?.id && (
                    <span className="absolute top-2.5 right-2.5 text-sm">👑</span>
                  )}
                </button>
              </div>
            </div>

            {/* Outcome Type */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-300 mb-2">
                Tipo de Desfecho:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'POINTS', label: 'Pontos IBJJF', icon: Trophy },
                  { id: 'SUBMISSION', label: 'Finalização 🥋', icon: Swords },
                  { id: 'TECHNICAL_DRAW', label: 'Decisão Árbitro', icon: Award },
                  { id: 'DISQUALIFICATION', label: 'Desclassificação (D.Q.)', icon: ShieldAlert },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = outcomeType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutcomeType(opt.id as RollOutcomeType)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-black border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submission Technique if SUBMISSION */}
            {outcomeType === 'SUBMISSION' && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/50 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" /> Golpe Aplicado
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span>Aos</span>
                    <input
                      type="number"
                      min="1"
                      max={matchDurationMinutes}
                      value={submissionMinute}
                      onChange={(e) => setSubmissionMinute(Number(e.target.value))}
                      className="w-12 px-1 py-0.5 rounded bg-black border border-slate-700 text-center font-bold text-purple-300"
                    />
                    <span>min</span>
                  </div>
                </div>

                <select
                  value={submissionTechnique}
                  onChange={(e) => setSubmissionTechnique(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-purple-800/60 text-slate-100 text-xs font-medium"
                >
                  {COMMON_SUBMISSIONS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="OUTRO">Outro golpe...</option>
                </select>

                {submissionTechnique === 'OUTRO' && (
                  <input
                    type="text"
                    placeholder="Especifique o golpe..."
                    value={customSubmission}
                    onChange={(e) => setCustomSubmission(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-purple-500/50 text-slate-100 text-xs"
                  />
                )}
              </div>
            )}

            {/* Notes / Súmula notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Observações da Luta (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Raspagem aos 4:20, luta técnica..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFinishDialogOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Voltar ao Placar
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar e Avançar Chave</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
