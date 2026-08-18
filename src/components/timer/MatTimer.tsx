import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Flame, 
  Music,
  Clock
} from 'lucide-react';
import { SpotifyTatamePlayer } from './SpotifyTatamePlayer';

export const MatTimer: React.FC = () => {
  const [roundTimeMinutes, setRoundTimeMinutes] = useState(6);
  const [restTimeSeconds, setRestTimeSeconds] = useState(60);
  const [totalRounds, setTotalRounds] = useState(5);

  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(6 * 60);
  const [isResting, setIsResting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpotifyPanel, setShowSpotifyPanel] = useState(true);

  const timerContainerRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Web Audio Synth for Tatame Chimes (safely closes context after playback)
  const playChime = useCallback((type: 'START' | 'REST' | 'WARNING' | 'FINISHED') => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'START') {
        osc.frequency.setValueAtTime(880, now); // High A
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'REST') {
        osc.frequency.setValueAtTime(440, now); // Low A
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'WARNING') {
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'FINISHED') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
        osc.start(now);
        osc.stop(now + 2.0);
      }

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close();
          }
        } catch {
          // ignore
        }
      }, 2500);
    } catch {
      // Audio context fallbacks ignored safely
    }
  }, []);

  // Stable Refs for current state to avoid re-triggering intervals
  const isRestingRef = useRef(isResting);
  isRestingRef.current = isResting;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const totalRoundsRef = useRef(totalRounds);
  totalRoundsRef.current = totalRounds;
  const restTimeSecondsRef = useRef(restTimeSeconds);
  restTimeSecondsRef.current = restTimeSeconds;
  const roundTimeMinutesRef = useRef(roundTimeMinutes);
  roundTimeMinutesRef.current = roundTimeMinutes;

  // Single clean countdown and transition interval
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === 11) {
          playChime('WARNING');
        }

        if (prev <= 1) {
          // Time is up for current phase
          if (!isRestingRef.current) {
            // Finished fight round
            if (currentRoundRef.current >= totalRoundsRef.current) {
              setIsRunning(false);
              playChime('FINISHED');
              return 0;
            } else {
              setIsResting(true);
              playChime('REST');
              return restTimeSecondsRef.current;
            }
          } else {
            // Finished rest phase -> start next round
            setIsResting(false);
            setCurrentRound(r => r + 1);
            playChime('START');
            return roundTimeMinutesRef.current * 60;
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, playChime]);

  const handleStartPause = () => {
    if (!isRunning) {
      if (timeLeft === 0 && currentRound >= totalRounds && !isResting) {
        setIsResting(false);
        setCurrentRound(1);
        setTimeLeft(roundTimeMinutes * 60);
        setIsRunning(true);
        playChime('START');
        return;
      } else {
        playChime('START');
      }
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsResting(false);
    setCurrentRound(1);
    setTimeLeft(roundTimeMinutes * 60);
  };

  const handleTimeChange = (mins: number) => {
    setRoundTimeMinutes(mins);
    if (!isRunning && !isResting) {
      setTimeLeft(mins * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      timerContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isWarningTime = !isResting && timeLeft > 0 && timeLeft <= 60;
  const currentTotalDuration = isResting ? restTimeSeconds : roundTimeMinutes * 60;
  const progressPercent = Math.max(0, Math.min(100, ((currentTotalDuration - timeLeft) / (currentTotalDuration || 1)) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Fast Action Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Cronômetro de Tatame Profissional
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 tracking-wider">
                DOJÔ PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Controle de rounds para rolas, sparring e treinos com áudio-chime e Spotify sincronizado.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSpotifyPanel(!showSpotifyPanel)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              showSpotifyPanel
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Conectar / Alternar Spotify do Tatame"
          >
            <Music className="w-4 h-4 text-emerald-400" />
            <span>Spotify {showSpotifyPanel ? 'Ativo' : 'Oculto'}</span>
          </button>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                playChime('START');
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Sinais Sonoros do Tatame"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Apito Ligado' : 'Mudo'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm hover:border-slate-600"
            title="Modo Tela Cheia (Ideal para TVs da Academia)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Big Display Panel (Dojo Scoreboard) */}
      <div
        ref={timerContainerRef}
        translate="no"
        className={`rounded-3xl border-2 p-6 sm:p-10 transition-all flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden notranslate ${
          timeLeft === 0
            ? 'bg-gradient-to-b from-amber-950/90 via-slate-950 to-slate-950 border-amber-500/80 shadow-amber-500/10'
            : isResting
            ? 'bg-gradient-to-b from-blue-950/90 via-slate-950 to-slate-950 border-blue-500/80 shadow-blue-500/10'
            : isWarningTime
            ? 'bg-gradient-to-b from-rose-950/90 via-slate-950 to-slate-950 border-rose-500/80 shadow-rose-500/10 animate-pulse'
            : isRunning
            ? 'bg-gradient-to-b from-emerald-950/80 via-slate-950 to-slate-950 border-emerald-500/60 shadow-emerald-500/10'
            : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-slate-800'
        }`}
      >
        {/* Subtle Background Radial Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 ${
          timeLeft === 0 
            ? 'bg-amber-400' 
            : isResting 
            ? 'bg-blue-400' 
            : isWarningTime 
            ? 'bg-rose-500' 
            : 'bg-emerald-400'
        }`} />

        {/* Phase Header Badge */}
        <div className="z-10 flex items-center gap-3">
          <span
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg flex items-center gap-2 border ${
              timeLeft === 0
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                : isResting
                ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-blue-500/30'
                : isWarningTime
                ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/40 animate-bounce'
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
                ? '🧘 DESCANSO / TROCA DE DUPLA'
                : isWarningTime
                ? '⚡ ÚLTIMO MINUTO DE ROLA!'
                : isRunning
                ? '🥋 COMBATE EM ANDAMENTO'
                : '⏸️ PRONTO PARA O ROLA'}
            </span>
          </span>
        </div>

        {/* Round Progress Tracker Dots */}
        <div className="z-10 mt-6 flex items-center justify-center gap-2 flex-wrap max-w-md">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map(roundNum => {
            const isCompleted = roundNum < currentRound;
            const isCurrent = roundNum === currentRound;
            return (
              <div
                key={roundNum}
                className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                  isCurrent
                    ? isResting
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-sm shadow-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/30 scale-110'
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

        {/* Big Digital Clock Display */}
        <div className="z-10 my-6 sm:my-8 text-center">
          <div className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono tracking-tighter leading-none text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] select-none notranslate">
            <span>{formatTime(timeLeft)}</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-xs sm:text-sm font-bold bg-slate-900/90 text-slate-300 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>ROUND {currentRound} DE {totalRounds}</span>
            </span>
            <span className="text-xs sm:text-sm font-bold bg-slate-900/90 text-slate-400 px-3.5 py-1.5 rounded-xl border border-slate-800">
              {isResting ? `Intervalo: ${restTimeSeconds}s` : `Duração: ${roundTimeMinutes} min`}
            </span>
          </div>
        </div>

        {/* Smooth Round Progress Bar */}
        <div className="z-10 w-full max-w-xl mb-8">
          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-1">
            <span>Progresso da Fase</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isResting 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400' 
                  : isWarningTime 
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Big Action Buttons */}
        <div className="z-10 flex items-center gap-4">
          <button
            onClick={handleStartPause}
            className={`px-10 sm:px-14 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-2xl flex items-center gap-3.5 shadow-2xl transition-all transform active:scale-95 cursor-pointer ${
              isRunning
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40'
            }`}
          >
            {isRunning ? (
              <Pause className="w-7 h-7 sm:w-8 h-8 fill-current" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 h-8 fill-current ml-0.5" />
            )}
            <span key={isRunning ? 'run' : 'pause'}>
              {isRunning ? 'PAUSAR ROLA' : timeLeft === 0 ? 'REINICIAR TREINO' : 'INICIAR ROLA'}
            </span>
          </button>

          <button
            onClick={handleReset}
            className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Resetar Cronômetro"
          >
            <RotateCcw className="w-6 h-6 sm:w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Custom Fine-Tuning Controls Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 text-slate-200 shadow-xl">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2 flex items-center justify-between">
            <span>Tempo por Round:</span>
            <span className="text-amber-400 font-mono font-bold">{roundTimeMinutes} min</span>
          </label>
          <div className="flex gap-2">
            {[3, 4, 5, 6, 8, 10].map(mins => (
              <button
                key={mins}
                onClick={() => handleTimeChange(mins)}
                disabled={isRunning}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  roundTimeMinutes === mins
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isRunning
                    ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2 flex items-center justify-between">
            <span>Tempo de Descanso:</span>
            <span className="text-blue-400 font-mono font-bold">{restTimeSeconds}s</span>
          </label>
          <div className="flex gap-2">
            {[30, 45, 60, 90, 120].map(secs => (
              <button
                key={secs}
                onClick={() => setRestTimeSeconds(secs)}
                disabled={isRunning}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  restTimeSeconds === secs
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : isRunning
                    ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {secs}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2 flex items-center justify-between">
            <span>Total de Rounds:</span>
            <span className="text-purple-400 font-mono font-bold">{totalRounds} Rounds</span>
          </label>
          <div className="flex gap-2">
            {[3, 4, 5, 6, 8, 10].map(rounds => (
              <button
                key={rounds}
                onClick={() => setTotalRounds(rounds)}
                disabled={isRunning}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  totalRounds === rounds
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : isRunning
                    ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {rounds}R
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spotify Tatame Integrated Player */}
      {showSpotifyPanel && (
        <SpotifyTatamePlayer
          isTimerRunning={isRunning}
          isResting={isResting}
        />
      )}
    </div>
  );
};
