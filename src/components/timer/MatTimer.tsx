import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Tv, 
  Cast, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Copy, 
  X, 
  Share2, 
  SkipForward, 
  Swords,
  Award,
  Users,
  Search,
  ArrowLeftRight,
  ShieldCheck,
  Check,
  Trophy,
  Flame,
  Radio,
  QrCode,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';
import { publishTimerSync, TimerSyncData } from '../../lib/timerSyncService';
import { playTatameSound } from '../../lib/soundEffects';
import { SpotifyTatamePlayer } from './SpotifyTatamePlayer';
import { SpotifyService, SpotifyPlaybackState } from '../../lib/spotifyService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RollChallenge, RollOutcomeType, Student } from '../../types';

export interface MatTimerProps {
  initialChallenge?: RollChallenge | null;
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

const getBeltStyle = (beltName: string = 'BRANCA') => {
  const b = beltName.toUpperCase();
  if (b.includes('PRETA')) return { name: 'FAIXA PRETA', color: 'from-red-600 to-black', text: 'text-red-400', bar: 'bg-red-600' };
  if (b.includes('MARROM')) return { name: 'FAIXA MARROM', color: 'from-amber-900 to-amber-950', text: 'text-amber-500', bar: 'bg-amber-900' };
  if (b.includes('ROXA')) return { name: 'FAIXA ROXA', color: 'from-purple-700 to-purple-900', text: 'text-purple-400', bar: 'bg-purple-600' };
  if (b.includes('AZUL')) return { name: 'FAIXA AZUL', color: 'from-blue-600 to-blue-800', text: 'text-blue-400', bar: 'bg-blue-600' };
  if (b.includes('VERDE')) return { name: 'FAIXA VERDE-AMARELA', color: 'from-emerald-600 to-amber-500', text: 'text-emerald-400', bar: 'bg-emerald-600' };
  if (b.includes('AMARELA')) return { name: 'FAIXA AMARELA', color: 'from-yellow-500 to-amber-600', text: 'text-yellow-400', bar: 'bg-yellow-500' };
  if (b.includes('LARANJA')) return { name: 'FAIXA LARANJA', color: 'from-orange-500 to-amber-600', text: 'text-orange-400', bar: 'bg-orange-500' };
  if (b.includes('CINZA')) return { name: 'FAIXA CINZA', color: 'from-slate-400 to-slate-600', text: 'text-slate-300', bar: 'bg-slate-400' };
  return { name: 'FAIXA BRANCA', color: 'from-slate-200 to-slate-400', text: 'text-slate-200', bar: 'bg-slate-200' };
};

export const MatTimer: React.FC<MatTimerProps> = ({ initialChallenge }) => {
  const { rollChallenges, students, completeRollChallenge } = useData();
  const { currentUser } = useAuth();

  // Mode: BJJCRON Electronic Scoreboard (Default) vs Collective Training Rounds
  const [timerMode, setTimerMode] = useState<'SCOREBOARD' | 'ROUNDS'>('SCOREBOARD');

  // Active Challenge (if linked)
  const [selectedChallenge, setSelectedChallenge] = useState<RollChallenge | null>(initialChallenge || null);

  // Competitor 1 (Atleta 1)
  const [athlete1Name, setAthlete1Name] = useState<string>('GABRIEL NERES');
  const [athlete1Belt, setAthlete1Belt] = useState<string>('BRANCA');
  const [athlete1Stripes, setAthlete1Stripes] = useState<number>(1);
  const [athlete1Id, setAthlete1Id] = useState<string>('');
  const [score1, setScore1] = useState<number>(0);
  const [advantages1, setAdvantages1] = useState<number>(0);
  const [penalties1, setPenalties1] = useState<number>(0);

  // Competitor 2 (Atleta 2)
  const [athlete2Name, setAthlete2Name] = useState<string>('PEDRO LOREDO BORGES');
  const [athlete2Belt, setAthlete2Belt] = useState<string>('AZUL');
  const [athlete2Stripes, setAthlete2Stripes] = useState<number>(0);
  const [athlete2Id, setAthlete2Id] = useState<string>('');
  const [score2, setScore2] = useState<number>(0);
  const [advantages2, setAdvantages2] = useState<number>(0);
  const [penalties2, setPenalties2] = useState<number>(0);

  // General Timer Settings
  const [roundTimeMinutes, setRoundTimeMinutes] = useState<number>(5);
  const [restTimeSeconds, setRestTimeSeconds] = useState<number>(60);
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(5 * 60);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSpotifyPanel, setShowSpotifyPanel] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [selectedTatameId, setSelectedTatameId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('tatame') || 'tatame_1';
    }
    return 'tatame_1';
  });
  const [tvQrCodeDataUrl, setTvQrCodeDataUrl] = useState<string>('');
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);

  const tvUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?tv=true&tatame=${selectedTatameId}`
    : '';

  useEffect(() => {
    if (tvUrl) {
      QRCode.toDataURL(tvUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      })
        .then(url => setTvQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [tvUrl, selectedTatameId]);

  // Modal Pickers & Finish Dialog
  const [pickingForAthlete, setPickingForAthlete] = useState<1 | 2 | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [finishWinner, setFinishWinner] = useState<1 | 2 | 'DRAW'>(1);
  const [finishOutcome, setFinishOutcome] = useState<RollOutcomeType>('POINTS');
  const [finishSubmission, setFinishSubmission] = useState<string>(COMMON_SUBMISSIONS[0]);
  const [customSubmission, setCustomSubmission] = useState<string>('');
  const [finishNotes, setFinishNotes] = useState<string>('');
  const [finishSavedSuccess, setFinishSavedSuccess] = useState<boolean>(false);

  const timerContainerRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Sync if initialChallenge is passed or changes
  useEffect(() => {
    if (initialChallenge) {
      loadChallengeIntoScoreboard(initialChallenge);
    }
  }, [initialChallenge]);

  const loadChallengeIntoScoreboard = (challenge: RollChallenge) => {
    setSelectedChallenge(challenge);
    setAthlete1Name(challenge.challengerName.toUpperCase());
    setAthlete1Belt(challenge.challengerBelt || 'BRANCA');
    setAthlete1Stripes(challenge.challengerStripes || 0);
    setAthlete1Id(challenge.challengerId);

    setAthlete2Name((challenge.challengedName || 'ADVERSÁRIO').toUpperCase());
    setAthlete2Belt(challenge.challengedBelt || 'BRANCA');
    setAthlete2Stripes(challenge.challengedStripes || 0);
    setAthlete2Id(challenge.challengedId || '');

    const duration = challenge.targetDurationMinutes || 5;
    setRoundTimeMinutes(duration);
    setTimeLeft(duration * 60);
    setScore1(0);
    setAdvantages1(0);
    setPenalties1(0);
    setScore2(0);
    setAdvantages2(0);
    setPenalties2(0);
    setIsRunning(false);
    setTimerMode('SCOREBOARD');
  };

  // Sincronização em tempo real com o placar da TV
  const syncToTv = useCallback((overrides?: Partial<TimerSyncData>) => {
    const targetEnd = isRunning ? Date.now() + timeLeft * 1000 : null;
    publishTimerSync({
      id: selectedTatameId,
      tatameId: selectedTatameId,
      tatameName: selectedTatameId === 'tv_7' ? 'TV 7 - Tatame 7' : selectedTatameId === 'tatame_2' ? 'Tatame 2' : 'Tatame 1 - Principal',
      timerMode,
      status: isRunning ? 'RUNNING' : timeLeft === 0 ? 'FINISHED' : 'PAUSED',
      timeRemaining: timeLeft,
      targetEndTime: targetEnd,
      totalDuration: roundTimeMinutes * 60,
      currentRound,
      totalRounds,
      isResting,
      roundDuration: roundTimeMinutes * 60,
      restDuration: restTimeSeconds,
      athlete1Name,
      athlete2Name,
      athlete1Belt,
      athlete2Belt,
      score1,
      score2,
      advantages1,
      advantages2,
      penalties1,
      penalties2,
      ...overrides,
    });
  }, [
    selectedTatameId,
    isRunning, timeLeft, timerMode, roundTimeMinutes, currentRound, totalRounds,
    isResting, restTimeSeconds, athlete1Name, athlete2Name, athlete1Belt, athlete2Belt,
    score1, score2, advantages1, advantages2, penalties1, penalties2
  ]);

  // Sons de tatame com Web Audio sintetizado e sincronização de áudio para a TV
  const playSound = useCallback((type: 'START' | 'STOP' | 'WARNING' | 'FINISHED' | 'SCORE') => {
    if (soundEnabledRef.current) {
      playTatameSound(type);
    }
    // Sincroniza som instantaneamente na TV conectada
    publishTimerSync({
      id: selectedTatameId,
      soundType: type,
      soundTimestamp: Date.now(),
    });
  }, [selectedTatameId]);

  // Disparo de sincronização automática com TV em qualquer mudança de placar
  useEffect(() => {
    syncToTv();
  }, [
    timerMode, roundTimeMinutes, currentRound, totalRounds, isResting,
    athlete1Name, athlete2Name, athlete1Belt, athlete2Belt,
    score1, score2, advantages1, advantages2, penalties1, penalties2, isRunning
  ]);

  // Timer Tick Interval
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === 11) {
          playSound('WARNING');
        }

        if (prev <= 1) {
          if (timerMode === 'SCOREBOARD') {
            setIsRunning(false);
            playSound('FINISHED');
            return 0;
          } else {
            // Rounds mode
            if (!isResting) {
              if (currentRound >= totalRounds) {
                setIsRunning(false);
                playSound('FINISHED');
                return 0;
              } else {
                setIsResting(true);
                playSound('STOP');
                return restTimeSeconds;
              }
            } else {
              setIsResting(false);
              setCurrentRound(r => r + 1);
              playSound('START');
              return roundTimeMinutes * 60;
            }
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerMode, isResting, currentRound, totalRounds, restTimeSeconds, roundTimeMinutes, playSound]);

  // Global Keyboard Shortcuts (Space: start/stop, F: fullscreen, M: mute, R: reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleStartPause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setSoundEnabled(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, timeLeft]);

  // Start / Pause
  const handleStartPause = () => {
    if (timeLeft === 0) {
      setTimeLeft(roundTimeMinutes * 60);
      setIsRunning(true);
      playSound('START');
      return;
    }
    if (!isRunning) {
      setIsRunning(true);
      playSound('START');
    } else {
      setIsRunning(false);
      playSound('STOP');
    }
  };

  // Reset
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(roundTimeMinutes * 60);
    setIsResting(false);
    setCurrentRound(1);
    playSound('STOP');
  };

  // Quick Time Adjustments
  const handleAddTime = (seconds: number) => {
    setTimeLeft(prev => Math.max(1, prev + seconds));
  };

  const handleSetDurationMinutes = (minutes: number) => {
    setRoundTimeMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
    setIsResting(false);
  };

  // Scoring Operations with IBJJF Penalty Enforcement
  const updateScore1 = (delta: number) => {
    setScore1(prev => Math.max(0, prev + delta));
    playSound('SCORE');
  };

  const updateAdvantages1 = (delta: number) => {
    setAdvantages1(prev => Math.max(0, prev + delta));
    playSound('SCORE');
  };

  const updatePenalties1 = (delta: number) => {
    const nextVal = Math.min(4, Math.max(0, penalties1 + delta));
    setPenalties1(nextVal);
    applyIbjjfPenaltyRules(1, nextVal);
    playSound('SCORE');
  };

  const setDirectPenalty1 = (cardNum: number) => {
    const nextVal = penalties1 === cardNum ? cardNum - 1 : cardNum;
    setPenalties1(nextVal);
    applyIbjjfPenaltyRules(1, nextVal);
    playSound('SCORE');
  };

  const updateScore2 = (delta: number) => {
    setScore2(prev => Math.max(0, prev + delta));
    playSound('SCORE');
  };

  const updateAdvantages2 = (delta: number) => {
    setAdvantages2(prev => Math.max(0, prev + delta));
    playSound('SCORE');
  };

  const updatePenalties2 = (delta: number) => {
    const nextVal = Math.min(4, Math.max(0, penalties2 + delta));
    setPenalties2(nextVal);
    applyIbjjfPenaltyRules(2, nextVal);
    playSound('SCORE');
  };

  const setDirectPenalty2 = (cardNum: number) => {
    const nextVal = penalties2 === cardNum ? cardNum - 1 : cardNum;
    setPenalties2(nextVal);
    applyIbjjfPenaltyRules(2, nextVal);
    playSound('SCORE');
  };

  // IBJJF Rule Engine:
  // Penalty 2: Opponent gets +1 Advantage
  // Penalty 3: Opponent gets +2 Points
  // Penalty 4: Opponent wins by DQ
  const applyIbjjfPenaltyRules = (penalizedAthlete: 1 | 2, currentPenalties: number) => {
    if (penalizedAthlete === 1) {
      if (currentPenalties === 2) {
        setAdvantages2(prev => prev + 1);
      } else if (currentPenalties === 3) {
        setScore2(prev => prev + 2);
      }
    } else {
      if (currentPenalties === 2) {
        setAdvantages1(prev => prev + 1);
      } else if (currentPenalties === 3) {
        setScore1(prev => prev + 2);
      }
    }
  };

  // Swap Athletes sides
  const handleSwapAthletes = () => {
    const tempName = athlete1Name;
    const tempBelt = athlete1Belt;
    const tempStripes = athlete1Stripes;
    const tempId = athlete1Id;
    const tempScore = score1;
    const tempAdv = advantages1;
    const tempPen = penalties1;

    setAthlete1Name(athlete2Name);
    setAthlete1Belt(athlete2Belt);
    setAthlete1Stripes(athlete2Stripes);
    setAthlete1Id(athlete2Id);
    setScore1(score2);
    setAdvantages1(advantages2);
    setPenalties1(penalties2);

    setAthlete2Name(tempName);
    setAthlete2Belt(tempBelt);
    setAthlete2Stripes(tempStripes);
    setAthlete2Id(tempId);
    setScore2(tempScore);
    setAdvantages2(tempAdv);
    setPenalties2(tempPen);
  };

  // Reset Scores only
  const handleResetScores = () => {
    setScore1(0);
    setAdvantages1(0);
    setPenalties1(0);
    setScore2(0);
    setAdvantages2(0);
    setPenalties2(0);
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (timerContainerRef.current?.requestFullscreen) {
          await timerContainerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen(prev => !prev);
    }
  };

  // Finish Match & Open Súmula
  const handleOpenFinishModal = () => {
    setIsRunning(false);
    // Suggest winner automatically based on IBJJF score rules
    if (score1 > score2) {
      setFinishWinner(1);
      setFinishOutcome('POINTS');
    } else if (score2 > score1) {
      setFinishWinner(2);
      setFinishOutcome('POINTS');
    } else if (advantages1 > advantages2) {
      setFinishWinner(1);
      setFinishOutcome('POINTS');
    } else if (advantages2 > advantages1) {
      setFinishWinner(2);
      setFinishOutcome('POINTS');
    } else if (penalties1 < penalties2) {
      setFinishWinner(1);
      setFinishOutcome('POINTS');
    } else if (penalties2 < penalties1) {
      setFinishWinner(2);
      setFinishOutcome('POINTS');
    } else {
      setFinishWinner(1);
      setFinishOutcome('STUDY_ROUND');
    }
    setFinishSavedSuccess(false);
    setIsFinishModalOpen(true);
  };

  const handleSaveFightResult = () => {
    const winnerName = finishWinner === 1 ? athlete1Name : finishWinner === 2 ? athlete2Name : 'EMPATE';
    const finalSubmission = finishOutcome === 'SUBMISSION' ? (customSubmission.trim() || finishSubmission) : undefined;
    const elapsedMinutes = Math.max(1, Math.ceil((roundTimeMinutes * 60 - timeLeft) / 60));

    if (selectedChallenge && completeRollChallenge) {
      completeRollChallenge(selectedChallenge.id, {
        winnerId: finishWinner === 1 ? athlete1Id : finishWinner === 2 ? athlete2Id : undefined,
        winnerName: finishWinner === 'DRAW' ? undefined : winnerName,
        outcomeType: finishOutcome,
        submissionTechnique: finalSubmission,
        submissionMinute: elapsedMinutes,
        scoreChallenger: score1,
        scoreChallenged: score2,
        technicalNotes: finishNotes.trim() || `Placar BJJCRON: ${score1}x${score2} (V:${advantages1}x${advantages2}, P:${penalties1}x${penalties2})`,
        registeredBy: currentUser?.name || 'Mestre/Árbitro Tatame',
        registeredAt: new Date().toISOString(),
      });
    }

    setFinishSavedSuccess(true);
    setTimeout(() => {
      setIsFinishModalOpen(false);
      setFinishSavedSuccess(false);
    }, 1800);
  };

  // Screencast TV Link
  const handleCopyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleOpenTvTab = () => {
    if (typeof window !== 'undefined') {
      window.open(tvUrl, '_blank');
    }
  };

  const handlePresentationCast = async () => {
    try {
      const PresentationReq = (window as unknown as { PresentationRequest?: new (urls: string[]) => { start: () => Promise<unknown> } }).PresentationRequest;
      if (PresentationReq) {
        setIsScreenSharing(true);
        const pr = new PresentationReq([tvUrl]);
        await pr.start();
        setIsScreenSharing(false);
        return;
      }
    } catch {
      setIsScreenSharing(false);
    }
    handleStartScreenShare();
  };

  const handleStartScreenShare = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        setIsScreenSharing(true);
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } else {
        handleOpenTvTab();
      }
    } catch {
      setIsScreenSharing(false);
    }
  };

  const belt1 = getBeltStyle(athlete1Belt);
  const belt2 = getBeltStyle(athlete2Belt);

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3 sm:px-4 text-white shadow-xl">
        {/* Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimerMode('SCOREBOARD')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timerMode === 'SCOREBOARD'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Placar Oficial BJJCRON</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-300 uppercase font-mono">
                Tatame
              </span>
            </button>

            <button
              onClick={() => setTimerMode('ROUNDS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timerMode === 'ROUNDS'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Rounds & Treino Coletivo</span>
            </button>
          </div>
        </div>

        {/* Quick Utilities */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Áudio Ativado (M)' : 'Mudo (M)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Screencast Modal Button */}
          <button
            onClick={() => setShowCastModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40 hover:border-cyan-400 shadow-sm"
            title="Espelhar na TV ou Projetor do Tatame"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Espelhar TV</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm"
            title="Tela Cheia (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Active Academy Challenges bar */}
      {(() => {
        const activeMatches = rollChallenges.filter(c => c.status === 'ACCEPTED' || (c.status === 'PENDING' && c.challengedId));
        if (activeMatches.length === 0) return null;

        return (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:px-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300">Rolas Casados no Tatame:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
              {activeMatches.map((match) => {
                const isCurrent = selectedChallenge?.id === match.id;
                return (
                  <button
                    key={match.id}
                    onClick={() => loadChallengeIntoScoreboard(match)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <span>{match.challengerName} vs {match.challengedName || 'Adversário'}</span>
                    <span className="text-[10px] opacity-80">({match.targetDurationMinutes}m)</span>
                  </button>
                );
              })}
            </div>

            {selectedChallenge && (
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-[11px] text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                Limpar ✕
              </button>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 🥋 PRIMARY VIEW: PLACAR OFICIAL BJJCRON (MATCH SCOREBOARD)                */}
      {/* ========================================================================= */}
      {timerMode === 'SCOREBOARD' ? (
        <div
          ref={timerContainerRef}
          translate="no"
          className={`bg-black text-white rounded-3xl border border-slate-800 p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden notranslate ${
            isFullscreen ? 'h-screen w-screen justify-around p-6 sm:p-10 border-0 rounded-none' : 'min-h-[580px]'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
          </div>

          {/* 1. BJJCRON TOP BAR: Left Belt, Center Clock, Right Belt */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-4 mb-4 pb-4 border-b border-slate-800/80">
            {/* Athlete 1 Belt Card (Left) */}
            <div className="md:col-span-4 flex items-center justify-start gap-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:px-4">
              <div className={`w-3.5 h-12 rounded-lg ${belt1.bar} shrink-0 shadow-sm`} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <span>{belt1.name}</span>
                  <button
                    onClick={() => setPickingForAthlete(1)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Trocar Aluno
                  </button>
                </p>
                <p className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight truncate">
                  {athlete1Name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                    [{athlete1Belt} | {athlete1Stripes ? `${athlete1Stripes}º GRAU` : 'SEM GRAU'}]
                  </span>
                </div>
              </div>
            </div>

            {/* Central Clock & Combate Status (Center) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
              {/* Giant Digital Clock */}
              <div
                onClick={handleStartPause}
                className="cursor-pointer group select-none transition-transform active:scale-95"
                title="Clique ou pressione ESPAÇO para Iniciar/Pausar"
              >
                <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-mono tracking-tighter leading-none text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                    timeLeft === 0
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30'
                      : isRunning
                      ? 'bg-[#198754] text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                      : 'bg-[#ffc107] text-slate-950 border-amber-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-ping' : 'bg-current'}`} />
                  <span>
                    {timeLeft === 0 ? 'TEMPO ESGOTADO' : isRunning ? 'EM COMBATE' : 'COMBATE PARADO'}
                  </span>
                </span>
              </div>

              {/* Quick Duration Preset Pills */}
              <div className="flex items-center gap-1.5 mt-2.5">
                {[3, 4, 5, 6, 7, 8, 10].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleSetDurationMinutes(mins)}
                    disabled={isRunning}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black border transition-all cursor-pointer ${
                      roundTimeMinutes === mins
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : isRunning
                        ? 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Athlete 2 Belt Card (Right) */}
            <div className="md:col-span-4 flex items-center justify-end gap-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:px-4 text-right">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <button
                    onClick={() => setPickingForAthlete(2)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Trocar Aluno
                  </button>
                  <span>{belt2.name}</span>
                </p>
                <p className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight truncate">
                  {athlete2Name}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                    [{athlete2Belt} | {athlete2Stripes ? `${athlete2Stripes}º GRAU` : 'SEM GRAU'}]
                  </span>
                </div>
              </div>
              <div className={`w-3.5 h-12 rounded-lg ${belt2.bar} shrink-0 shadow-sm`} />
            </div>
          </div>

          {/* 2. DUAL ATHLETE ROWS (AUTHENTIC BJJCRON DESIGN) */}
          <div className="relative z-10 space-y-4 my-auto">
            {/* ROW 1: ATLETA 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* Deep Blue Athlete Box (#0B3B82) */}
              <div className="lg:col-span-4 bg-[#0B3B82] border-2 border-blue-500/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 text-white shadow-xl">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-200/90 font-mono">
                      ATLETA 1
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight truncate leading-tight">
                    {athlete1Name}
                  </h3>
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-900/60 border border-blue-400/40 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner shrink-0 font-mono">
                  1
                </div>
              </div>

              {/* Scoring Boxes Group: Pontos (Green), Vantagens (Yellow), Penalidades (Red) */}
              <div className="lg:col-span-8 grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* PONTOS BOX (#198754 - Emerald Green) */}
                <div className="bg-[#198754] border-2 border-emerald-400/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-white shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-emerald-100 font-mono">
                    PONTOS
                  </span>
                  <div
                    onClick={() => updateScore1(2)}
                    className="text-5xl sm:text-6xl md:text-7xl font-black font-mono text-center my-1 select-none cursor-pointer active:scale-95 transition-transform"
                    title="Clique para somar +2"
                  >
                    {score1}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-emerald-400/40">
                    <button
                      onClick={() => updateScore1(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateScore1(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VANTAGENS BOX (#ffc107 - Amber Gold) */}
                <div className="bg-[#ffc107] border-2 border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-slate-950 shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-amber-950 font-mono">
                    VANTAGENS
                  </span>
                  <div
                    onClick={() => updateAdvantages1(1)}
                    className="text-5xl sm:text-6xl md:text-7xl font-black font-mono text-center my-1 select-none cursor-pointer active:scale-95 transition-transform"
                    title="Clique para somar +1"
                  >
                    {advantages1}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-amber-400">
                    <button
                      onClick={() => updateAdvantages1(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateAdvantages1(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* PENALIDADES BOX (#dc3545 - Crimson Red with [1][2][3][4] cards) */}
                <div className="bg-[#dc3545] border-2 border-rose-400/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-white shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-rose-100 font-mono">
                    PENALIDADES
                  </span>
                  {/* 4 Interactive Penalty Cards */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5 my-auto py-2">
                    {[1, 2, 3, 4].map(cardNum => {
                      const isActive = penalties1 >= cardNum;
                      return (
                        <button
                          key={cardNum}
                          onClick={() => setDirectPenalty1(cardNum)}
                          className={`h-12 sm:h-14 rounded-xl font-mono font-black text-base sm:text-lg flex items-center justify-center transition-all cursor-pointer border ${
                            isActive
                              ? cardNum === 1
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                                : cardNum === 2
                                ? 'bg-orange-500 text-white border-orange-400 shadow-md scale-105'
                                : cardNum === 3
                                ? 'bg-rose-700 text-white border-rose-400 shadow-md scale-105'
                                : 'bg-black text-rose-400 border-rose-500 shadow-md scale-105 animate-pulse'
                              : 'bg-rose-900/40 text-rose-300/60 border-rose-700/50 hover:bg-rose-800/60 hover:text-white'
                          }`}
                          title={`Penalidade ${cardNum}`}
                        >
                          {cardNum}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-rose-400/40">
                    <button
                      onClick={() => updatePenalties1(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updatePenalties1(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: ATLETA 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* Deep Blue Athlete Box (#0B3B82) */}
              <div className="lg:col-span-4 bg-[#0B3B82] border-2 border-blue-500/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 text-white shadow-xl">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-200/90 font-mono">
                      ATLETA 2
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight truncate leading-tight">
                    {athlete2Name}
                  </h3>
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-900/60 border border-blue-400/40 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner shrink-0 font-mono">
                  2
                </div>
              </div>

              {/* Scoring Boxes Group: Pontos (Green), Vantagens (Yellow), Penalidades (Red) */}
              <div className="lg:col-span-8 grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* PONTOS BOX (#198754 - Emerald Green) */}
                <div className="bg-[#198754] border-2 border-emerald-400/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-white shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-emerald-100 font-mono">
                    PONTOS
                  </span>
                  <div
                    onClick={() => updateScore2(2)}
                    className="text-5xl sm:text-6xl md:text-7xl font-black font-mono text-center my-1 select-none cursor-pointer active:scale-95 transition-transform"
                    title="Clique para somar +2"
                  >
                    {score2}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-emerald-400/40">
                    <button
                      onClick={() => updateScore2(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateScore2(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VANTAGENS BOX (#ffc107 - Amber Gold) */}
                <div className="bg-[#ffc107] border-2 border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-slate-950 shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-amber-950 font-mono">
                    VANTAGENS
                  </span>
                  <div
                    onClick={() => updateAdvantages2(1)}
                    className="text-5xl sm:text-6xl md:text-7xl font-black font-mono text-center my-1 select-none cursor-pointer active:scale-95 transition-transform"
                    title="Clique para somar +1"
                  >
                    {advantages2}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-amber-400">
                    <button
                      onClick={() => updateAdvantages2(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateAdvantages2(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* PENALIDADES BOX (#dc3545 - Crimson Red with [1][2][3][4] cards) */}
                <div className="bg-[#dc3545] border-2 border-rose-400/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-white shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-center text-rose-100 font-mono">
                    PENALIDADES
                  </span>
                  {/* 4 Interactive Penalty Cards */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5 my-auto py-2">
                    {[1, 2, 3, 4].map(cardNum => {
                      const isActive = penalties2 >= cardNum;
                      return (
                        <button
                          key={cardNum}
                          onClick={() => setDirectPenalty2(cardNum)}
                          className={`h-12 sm:h-14 rounded-xl font-mono font-black text-base sm:text-lg flex items-center justify-center transition-all cursor-pointer border ${
                            isActive
                              ? cardNum === 1
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                                : cardNum === 2
                                ? 'bg-orange-500 text-white border-orange-400 shadow-md scale-105'
                                : cardNum === 3
                                ? 'bg-rose-700 text-white border-rose-400 shadow-md scale-105'
                                : 'bg-black text-rose-400 border-rose-500 shadow-md scale-105 animate-pulse'
                              : 'bg-rose-900/40 text-rose-300/60 border-rose-700/50 hover:bg-rose-800/60 hover:text-white'
                          }`}
                          title={`Penalidade ${cardNum}`}
                        >
                          {cardNum}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 border-t border-rose-400/40">
                    <button
                      onClick={() => updatePenalties2(-1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updatePenalties2(1)}
                      className="flex-1 py-1 sm:py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base cursor-pointer active:scale-90 transition-transform shadow-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BJJCRON BOTTOM ACTION CONTROLS BAR */}
          <div className="relative z-10 pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Start/Stop Combate, Reset, Time Adjusters */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleStartPause}
                className={`px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg flex items-center gap-2.5 transition-all active:scale-95 cursor-pointer shadow-xl ${
                  isRunning
                    ? 'bg-[#ffc107] hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-[#198754] hover:bg-emerald-500 text-white shadow-emerald-500/30'
                }`}
              >
                {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{isRunning ? 'PAROU! [Espaço]' : 'COMBATE! [Espaço]'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                title="Reiniciar Cronômetro (R)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Adjust minutes +/- */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1">
                <button
                  onClick={() => handleAddTime(-60)}
                  className="px-2.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Diminuir 1 minuto"
                >
                  -1m
                </button>
                <button
                  onClick={() => handleAddTime(60)}
                  className="px-2.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Acrescentar 1 minuto"
                >
                  +1m
                </button>
              </div>

              {/* Swap Sides button */}
              <button
                onClick={handleSwapAthletes}
                className="px-3 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Inverter Lado dos Atletas"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">Inverter Lados</span>
              </button>

              {/* Reset Scores */}
              <button
                onClick={handleResetScores}
                className="px-3 py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-bold transition-all cursor-pointer"
                title="Zerar apenas a pontuação mantendo os atletas"
              >
                Zerar Placar
              </button>
            </div>

            {/* Right Action: Súmula & Finalização */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFinishOutcome('SUBMISSION');
                  handleOpenFinishModal();
                }}
                className="px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
              >
                <span>Finalização 🥋</span>
              </button>

              <button
                onClick={handleOpenFinishModal}
                className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Encerrar Luta 🏁</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ⏱️ SECONDARY VIEW: ROUNDS & TREINO COLETIVO (ROUNDS / REST / SPOTIFY)     */
        /* ========================================================================= */
        <div
          ref={timerContainerRef}
          translate="no"
          className={`rounded-3xl border-2 p-6 sm:p-10 transition-all flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden notranslate ${
            isFullscreen ? 'h-screen w-screen justify-around p-8 sm:p-12' : 'min-h-[500px]'
          } ${
            timeLeft === 0
              ? 'bg-gradient-to-b from-amber-950/90 via-slate-950 to-slate-950 border-amber-500/80 shadow-amber-500/10'
              : isResting
              ? 'bg-gradient-to-b from-blue-950/90 via-slate-950 to-slate-950 border-blue-500/80 shadow-blue-500/10'
              : isRunning
              ? 'bg-gradient-to-b from-emerald-950/80 via-slate-950 to-slate-950 border-emerald-500/60 shadow-emerald-500/10'
              : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-slate-800'
          }`}
        >
          {/* Phase Badge */}
          <div className="z-10 flex items-center gap-3">
            <span
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg flex items-center gap-2 border ${
                timeLeft === 0
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                  : isResting
                  ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-blue-500/30'
                  : isRunning
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>
                {timeLeft === 0
                  ? '🏆 TREINO CONCLUÍDO! OSS!'
                  : isResting
                  ? '🧘 INTERVALO / TROCA DE DUPLA'
                  : isRunning
                  ? '🥋 COMBATE EM ANDAMENTO'
                  : '⏸️ PRONTO PARA O ROLA'}
              </span>
            </span>
          </div>

          {/* Round Dots Tracker */}
          <div className="z-10 mt-6 flex items-center justify-center gap-2 flex-wrap max-w-md">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNum => {
              const isCompleted = roundNum < currentRound;
              const isCurrent = roundNum === currentRound;
              return (
                <div
                  key={roundNum}
                  className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                    isCurrent
                      ? isResting
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-sm'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm scale-110'
                      : isCompleted
                      ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                >
                  <span>R{roundNum}</span>
                  {isCompleted && <span className="text-emerald-400 text-[10px]">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Big Clock */}
          <div className="z-10 my-6 sm:my-8 text-center cursor-pointer" onClick={handleStartPause}>
            <div className="text-8xl sm:text-9xl md:text-[10rem] font-black font-mono tracking-tighter leading-none text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
              {formatTime(timeLeft)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-xs sm:text-sm font-bold bg-slate-900/90 text-slate-300 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>ROUND {currentRound} DE {totalRounds}</span>
              </span>
              <span className="text-xs sm:text-sm font-bold bg-slate-900/90 text-slate-400 px-3.5 py-1.5 rounded-xl border border-slate-800">
                {isResting ? `Descanso: ${restTimeSeconds}s` : `Duração: ${roundTimeMinutes} min`}
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="z-10 flex items-center gap-4">
            <button
              onClick={handleStartPause}
              className={`px-10 sm:px-14 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-2xl flex items-center gap-3.5 shadow-2xl transition-all transform active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {isRunning ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
              <span>{isRunning ? 'PAUSAR ROLA' : timeLeft === 0 ? 'REINICIAR TREINO' : 'INICIAR ROLA'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Resetar Cronômetro"
            >
              <RotateCcw className="w-6 h-6 sm:w-7 h-7" />
            </button>
          </div>

          {/* Quick Round Configuration Options */}
          <div className="z-10 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>Tempo de Luta:</span>
                <span className="text-amber-400 font-mono font-bold">{roundTimeMinutes} min</span>
              </label>
              <div className="flex gap-1.5">
                {[3, 5, 6, 8, 10].map(m => (
                  <button
                    key={m}
                    onClick={() => handleSetDurationMinutes(m)}
                    disabled={isRunning}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      roundTimeMinutes === m
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>Descanso:</span>
                <span className="text-blue-400 font-mono font-bold">{restTimeSeconds}s</span>
              </label>
              <div className="flex gap-1.5">
                {[30, 45, 60, 90].map(s => (
                  <button
                    key={s}
                    onClick={() => setRestTimeSeconds(s)}
                    disabled={isRunning}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      restTimeSeconds === s
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>Total de Rounds:</span>
                <span className="text-purple-400 font-mono font-bold">{totalRounds} R</span>
              </label>
              <div className="flex gap-1.5">
                {[3, 5, 8, 10].map(r => (
                  <button
                    key={r}
                    onClick={() => setTotalRounds(r)}
                    disabled={isRunning}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      totalRounds === r
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {r}R
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spotify Tatame Player */}
      {showSpotifyPanel && (
        <SpotifyTatamePlayer
          isTimerRunning={isRunning}
          isResting={isResting}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: SELECIONAR ALUNO DA ACADEMIA                                    */}
      {/* ========================================================================= */}
      {pickingForAthlete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Selecionar Aluno para Atleta {pickingForAthlete}
                  </h3>
                  <p className="text-xs text-slate-400">Escolha da lista da academia ou digite um nome livre.</p>
                </div>
              </div>
              <button
                onClick={() => setPickingForAthlete(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar aluno por nome..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Custom Name Option */}
              {studentSearch.trim() && (
                <button
                  onClick={() => {
                    if (pickingForAthlete === 1) {
                      setAthlete1Name(studentSearch.trim().toUpperCase());
                      setAthlete1Id('');
                    } else {
                      setAthlete2Name(studentSearch.trim().toUpperCase());
                      setAthlete2Id('');
                    }
                    setPickingForAthlete(null);
                    setStudentSearch('');
                  }}
                  className="w-full p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold text-left hover:bg-blue-600/30 transition-all flex items-center justify-between"
                >
                  <span>Usar nome digitado: "{studentSearch.trim()}"</span>
                  <Check className="w-4 h-4" />
                </button>
              )}

              {/* Student List */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {students
                  .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                  .map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        if (pickingForAthlete === 1) {
                          setAthlete1Name(student.name.toUpperCase());
                          setAthlete1Belt(student.belt || 'BRANCA');
                          setAthlete1Stripes(student.stripes || 0);
                          setAthlete1Id(student.id);
                        } else {
                          setAthlete2Name(student.name.toUpperCase());
                          setAthlete2Belt(student.belt || 'BRANCA');
                          setAthlete2Stripes(student.stripes || 0);
                          setAthlete2Id(student.id);
                        }
                        setPickingForAthlete(null);
                        setStudentSearch('');
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 text-left transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-blue-300">
                            {student.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Faixa {student.belt} • {student.stripes || 0} graus
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-blue-400">
                        Selecionar →
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: SÚMULA DIGITAL & DESFECHO DA LUTA                               */}
      {/* ========================================================================= */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Súmula Digital BJJCRON</h3>
                  <p className="text-xs text-slate-400">Confirmação de vencedor e registro oficial do combate.</p>
                </div>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Placar Resumo */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-center">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase font-mono">Atleta 1</p>
                  <p className="text-xs font-black truncate">{athlete1Name}</p>
                  <p className="text-xl font-mono font-black text-emerald-400 mt-0.5">{score1}</p>
                  <p className="text-[10px] text-slate-400 font-mono">V:{advantages1} | P:{penalties1}</p>
                </div>
                <div className="px-3 text-slate-600 font-black text-lg">x</div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase font-mono">Atleta 2</p>
                  <p className="text-xs font-black truncate">{athlete2Name}</p>
                  <p className="text-xl font-mono font-black text-emerald-400 mt-0.5">{score2}</p>
                  <p className="text-[10px] text-slate-400 font-mono">V:{advantages2} | P:{penalties2}</p>
                </div>
              </div>

              {/* Vencedor Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Selecione o Vencedor:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFinishWinner(1)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      finishWinner === 1
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    1. {athlete1Name.split(' ')[0]}
                  </button>

                  <button
                    onClick={() => setFinishWinner(2)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      finishWinner === 2
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    2. {athlete2Name.split(' ')[0]}
                  </button>

                  <button
                    onClick={() => setFinishWinner('DRAW')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      finishWinner === 'DRAW'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Empate Técnico
                  </button>
                </div>
              </div>

              {/* Tipo de Desfecho */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Forma de Vitória / Desfecho:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'POINTS', label: 'Pontos IBJJF' },
                    { id: 'SUBMISSION', label: 'Finalização 🥋' },
                    { id: 'REFEREE_DECISION', label: 'Decisão Árbitro' },
                    { id: 'DISQUALIFICATION', label: 'Desclassificação' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFinishOutcome(type.id as any)}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                        finishOutcome === type.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submissão selector if finalização */}
              {finishOutcome === 'SUBMISSION' && (
                <div className="space-y-2 bg-purple-950/20 p-3 rounded-2xl border border-purple-500/30">
                  <label className="block text-xs font-bold text-purple-300">
                    Golpe / Técnica de Finalização:
                  </label>
                  <select
                    value={finishSubmission}
                    onChange={(e) => setFinishSubmission(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    {COMMON_SUBMISSIONS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Observações Técnicas do Árbitro / Mestre (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boa passagem de guarda, finalizou no armlock rápido..."
                  value={finishNotes}
                  onChange={(e) => setFinishNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {finishSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Súmula registrada com sucesso no sistema!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsFinishModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFightResult}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Súmula Oficial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: ESPELHAR TV & SCREENCAST                                        */}
      {/* ========================================================================= */}
      {showCastModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Espelhar Placar BJJCRON na TV</h3>
                  <p className="text-xs text-slate-400">Transmita o placar oficial com pontos e cronômetro para a TV ou projetor do tatame.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCastModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Seletor de Canal de TV / Tatame */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-cyan-400" />
                      Canal do Tatame / TV Selecionada:
                    </span>
                    <p className="text-[11px] text-slate-400">Escolha para qual tela ou tatame este cronômetro vai transmitir</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setSelectedTatameId('tatame_1')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTatameId === 'tatame_1'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tatame 1
                    </button>
                    <button
                      onClick={() => setSelectedTatameId('tv_7')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTatameId === 'tv_7'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                          : 'text-amber-400 hover:bg-amber-400/10 border border-amber-400/30'
                      }`}
                    >
                      📺 TV 7 (Tatame 7)
                    </button>
                    <button
                      onClick={() => setSelectedTatameId('tatame_2')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTatameId === 'tatame_2'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tatame 2
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-emerald-300">
                      Sincronizando em tempo real no canal: <span className="text-white uppercase font-mono">{selectedTatameId}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleOpenTvTab}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Tela da TV</span>
                  </button>
                </div>
              </div>

              {/* Card de Ajuda em Destaque: Por que a TV 7 / Samsung não aparece na busca */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/40 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      Sua TV não está aparecendo na lista? (Ex: Samsung TV 7 / LG)
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      As TVs da <strong>Samsung (como a Crystal UHD Série 7, AU7000, CU7000, TU7000)</strong> não possuem Chromecast do Google integrado. Por isso, navegadores não conseguem listar a TV diretamente pelo botão de Cast. 
                      <strong className="text-amber-200 block mt-0.5">Use uma destas opções garantidas:</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-400/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Laptop className="w-4 h-4" />
                      <span>1. No PC/Notebook (Windows + K)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      No teclado do computador, aperte as teclas <strong>Windows + K</strong>. O menu de telas sem fio do Windows abrirá na lateral direita e a <strong>TV 7</strong> vai aparecer na hora!
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <Smartphone className="w-4 h-4" />
                      <span>2. Pelo Celular (Smart View)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Arraste a barra superior do celular para baixo e toque no ícone <strong>Smart View</strong> (ou Transmitir). A <strong>TV 7</strong> aparece imediatamente.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Tv className="w-4 h-4" />
                      <span>3. No Controle da TV 7</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      No controle, aperte <strong>Home</strong> e abra o app <strong>"Internet"</strong> (globo azul). Digite o link ou aponte o QR Code. Funciona direto e sem login!
                    </p>
                  </div>
                </div>
              </div>

              {/* Opções de Conexão com a TV */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opção 1: QR Code para Smart TV ou Celular */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <QrCode className="w-4 h-4" />
                    <span>Escanear QR Code com a TV 7</span>
                  </div>
                  {tvQrCodeDataUrl ? (
                    <img
                      src={tvQrCodeDataUrl}
                      alt="QR Code TV Scoreboard"
                      className="w-40 h-40 rounded-xl bg-white p-2 shadow-xl border border-slate-700"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                      Gerando QR Code...
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Aponte a câmera do celular ou abra o navegador da TV 7 para exibir o placar oficial sem login.
                  </p>
                </div>

                {/* Opção 2: Transmitir / Espelhar Direto */}
                <div className="flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Busca de Dispositivos sem Fio
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">Chromecast / Google Cast / AirPlay</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Se sua TV possui Chromecast (Android TV, Google TV, TCL, Philips), clique abaixo para abrir a busca nativa de telas sem fio.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handlePresentationCast}
                      className="w-full px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Cast className="w-4 h-4" />
                      <span>{isScreenSharing ? 'Buscando Telas...' : 'Buscar Minha TV na Rede (Cast)'}</span>
                    </button>

                    <button
                      onClick={handleOpenTvTab}
                      className="w-full px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                      <span>Abrir em Nova Aba (Para HDMI / Projetor)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dicas Rápidas por Dispositivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Smart View (Samsung)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Arraste a central de notificações do celular e toque em <strong>Smart View</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>iPhone / AirPlay</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Na Central de Controle, toque em <strong>Espelhar a Tela</strong> e escolha sua TV 7.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Cabo HDMI / Notebook</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ligue o cabo HDMI na TV 7, abra a tela e aperte <strong>F</strong> (Tela Cheia).
                  </p>
                </div>
              </div>

              {/* Link direto para a Smart TV */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Link direto para o navegador da Smart TV (Sem necessidade de login):</span>
                  {copiedLink && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Link copiado!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tvUrl}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyDirectLink}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCastModal(false);
                  toggleFullscreen();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Colocar em Tela Cheia na TV [F]</span>
              </button>
              <button
                onClick={() => setShowCastModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
