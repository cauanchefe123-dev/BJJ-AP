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
  Disc, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Plus,
  ChevronDown,
  ChevronUp,
  Headphones
} from 'lucide-react';

interface PresetPlaylist {
  id: string;
  name: string;
  category: string;
  spotifyUri: string; // embed url path like playlist/37i9dQZF1DX0XUsuxWHRQd
  icon: string;
  description: string;
}

const DEFAULT_PLAYLISTS: PresetPlaylist[] = [
  {
    id: 'bjj-hiphop',
    name: 'BJJ Rolling & Sparring (Hip-Hop)',
    category: 'Hip-Hop / Rap',
    spotifyUri: 'playlist/37i9dQZF1DX0XUsuxWHRQd', // Rap Workout
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'bjj-rock',
    name: 'Hard Rock & Heavy Tatame',
    category: 'Rock / Metal',
    spotifyUri: 'playlist/37i9dQZF1DX9qNs32fujYe', // Rock Workout
    icon: '⚡',
    description: 'Energia máxima para rounds sem descanso.'
  },
  {
    id: 'bjj-phonk',
    name: 'Gym Phonk & Electronic Gas',
    category: 'Phonk / Electro',
    spotifyUri: 'playlist/37i9dQZF1DWZjqjZMudx9T', // Phonk Workout
    icon: '🔥',
    description: 'Gás total no tatame com graves potentes.'
  },
  {
    id: 'bjj-flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi / Focus',
    spotifyUri: 'playlist/37i9dQZF1DXdLEN7aqioXM', // Lo-Fi Beats
    icon: '🧘',
    description: 'Ritmo constante para treinos técnicos e drills.'
  }
];

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

  // Spotify integration state
  const [showSpotifyPanel, setShowSpotifyPanel] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_playlist') || 'playlist/37i9dQZF1DX0XUsuxWHRQd';
  });
  const [customPlaylistUrl, setCustomPlaylistUrl] = useState('');
  const [customPlaylistSaved, setCustomPlaylistSaved] = useState(false);
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false);

  const timerContainerRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Save Spotify preference
  const handleSelectPlaylist = (uri: string) => {
    setSelectedPlaylist(uri);
    localStorage.setItem('bjjcron_spotify_playlist', uri);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlaylistUrl.trim()) return;

    let cleanUri = customPlaylistUrl.trim();
    // Support URLs like https://open.spotify.com/playlist/37i9dQZF1DX... or spotify:playlist:...
    if (cleanUri.includes('open.spotify.com/')) {
      const parts = cleanUri.split('open.spotify.com/')[1].split('?')[0];
      cleanUri = parts;
    } else if (cleanUri.startsWith('spotify:')) {
      cleanUri = cleanUri.replace('spotify:', '').replace(/:/g, '/');
    }

    if (cleanUri) {
      handleSelectPlaylist(cleanUri);
      setCustomPlaylistSaved(true);
      setTimeout(() => setCustomPlaylistSaved(false), 3000);
      setCustomPlaylistUrl('');
    }
  };

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
  const spotifyEmbedUrl = `https://open.spotify.com/embed/${selectedPlaylist}?utm_source=generator&theme=0`;
  const spotifyDirectUrl = `https://open.spotify.com/${selectedPlaylist}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Cronômetro de Rola do Tatame
          </h3>
          <p className="text-xs text-slate-400">
            Controle de tempo para rolas, sparring e treinos específicos com sinais sonoros e música.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSpotifyPanel(!showSpotifyPanel)}
            className={`p-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showSpotifyPanel
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Conectar / Alternar Spotify"
          >
            <Music className="w-4 h-4" />
            <span>Spotify {showSpotifyPanel ? 'Ativo' : 'Oculto'}</span>
          </button>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                playChime('START');
              }
            }}
            className={`p-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Som do Apito"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Sinais Ativos' : 'Mudo'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            title="Tela Cheia para TV"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Big Display Panel */}
      <div
        ref={timerContainerRef}
        translate="no"
        className={`rounded-3xl border-2 p-8 transition-all flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden notranslate ${
          timeLeft === 0
            ? 'bg-gradient-to-br from-amber-950 via-slate-950 to-stone-900 border-amber-500'
            : isResting
            ? 'bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 border-blue-500'
            : isWarningTime
            ? 'bg-gradient-to-br from-rose-950 via-slate-950 to-amber-950 border-rose-500'
            : 'bg-gradient-to-br from-slate-900 via-slate-950 to-stone-900 border-slate-800'
        }`}
      >
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md ${
              timeLeft === 0
                ? 'bg-amber-500 text-slate-950'
                : isResting
                ? 'bg-blue-500 text-slate-950'
                : isWarningTime
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-emerald-500 text-slate-950'
            }`}
          >
            <span>
              {timeLeft === 0
                ? 'TREINO CONCLUÍDO! OSS!'
                : isResting
                ? 'DESCANSO / TROCA DE DUPLA'
                : isWarningTime
                ? 'ÚLTIMO MINUTO DE ROLA!'
                : 'COMBATE EM ANDAMENTO'}
            </span>
          </span>
        </div>

        {/* Big Time Display */}
        <div className="my-8 text-center">
          <div className="text-7xl sm:text-9xl font-black font-mono tracking-tighter text-slate-100 drop-shadow-lg notranslate">
            <span>{formatTime(timeLeft)}</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-slate-300">
            <span className="text-sm sm:text-lg font-bold bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700 notranslate">
              <span>{`ROUND ${currentRound} DE ${totalRounds}`}</span>
            </span>
          </div>
        </div>

        {/* Big Play / Pause Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleStartPause}
            className={`px-8 py-4 rounded-2xl font-black text-lg sm:text-xl flex items-center gap-3 shadow-xl transition-all transform active:scale-95 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            <span key={isRunning ? 'run' : 'pause'}>
              {isRunning ? 'PAUSAR' : timeLeft === 0 ? 'REINICIAR TREINO' : 'INICIAR ROLA'}
            </span>
          </button>
          <button
            onClick={handleReset}
            className="p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Resetar Cronômetro"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Preset Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-200">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">
            Tempo por Round (Minutos):
          </label>
          <div className="flex gap-2">
            {[5, 6, 8, 10].map(mins => (
              <button
                key={mins}
                onClick={() => handleTimeChange(mins)}
                disabled={isRunning}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  roundTimeMinutes === mins
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">
            Tempo de Descanso:
          </label>
          <div className="flex gap-2">
            {[30, 60, 90].map(secs => (
              <button
                key={secs}
                onClick={() => setRestTimeSeconds(secs)}
                disabled={isRunning}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  restTimeSeconds === secs
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {secs}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">
            Total de Rounds:
          </label>
          <div className="flex gap-2">
            {[3, 5, 8, 10].map(rounds => (
              <button
                key={rounds}
                onClick={() => setTotalRounds(rounds)}
                disabled={isRunning}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  totalRounds === rounds
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {rounds} R
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spotify Tatame Integration Widget */}
      {showSpotifyPanel && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 text-slate-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Disc className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Spotify do Tatame</span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-black">
                    Sincronizado
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Ouça playlists de jiu-jitsu ou conecte sua conta do Spotify enquanto roda o cronômetro.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={spotifyDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no App Spotify</span>
              </a>

              <button
                onClick={() => setIsExpandedPlayer(!isExpandedPlayer)}
                className="p-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg border border-slate-700"
                title={isExpandedPlayer ? 'Modo Compacto' : 'Ver Músicas da Playlist'}
              >
                {isExpandedPlayer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Playlist Selection Chips */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              Playlists Prontas para Rola & Treino:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_PLAYLISTS.map(playlist => {
                const isSelected = selectedPlaylist === playlist.spotifyUri;
                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist.spotifyUri)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{playlist.icon}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-xs font-bold truncate">{playlist.name}</p>
                    <span className="text-[10px] text-slate-400 truncate">{playlist.category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Playlist URL Input */}
          <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Colar link de qualquer Playlist / Álbum do Spotify..."
              value={customPlaylistUrl}
              onChange={e => setCustomPlaylistUrl(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Usar Minha Playlist</span>
            </button>
          </form>

          {customPlaylistSaved && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Playlist personalizada carregada com sucesso no tatame!
            </p>
          )}

          {/* Spotify Official Player Embed */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <iframe
              src={spotifyEmbedUrl}
              width="100%"
              height={isExpandedPlayer ? "352" : "152"}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Tatame Player"
              className="w-full transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
};
