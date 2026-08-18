import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Music, 
  Disc, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Radio, 
  Zap, 
  Headphones, 
  ListMusic, 
  Shuffle, 
  Repeat, 
  Sparkles, 
  ExternalLink,
  Flame,
  Check,
  Search,
  Plus
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: 'Hip-Hop' | 'Phonk' | 'Rock' | 'Lo-Fi' | 'Eletrônico';
  duration: number; // seconds
  coverUrl: string;
  audioFrequency: number; // For built-in high quality audio synthesizer
  bpm: number;
}

// Curated high energy rolling soundtrack for Tatame
const TATAME_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Tatame War & Sparring Beats',
    artist: 'BJJ Rolling Beats',
    genre: 'Hip-Hop',
    duration: 215,
    coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 60,
    bpm: 95
  },
  {
    id: 'track-2',
    title: 'Phonk no Pano - Gás Máximo',
    artist: 'Gym Phonk Brasil',
    genre: 'Phonk',
    duration: 180,
    coverUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 55,
    bpm: 130
  },
  {
    id: 'track-3',
    title: 'Hard Rock Tatame - Sem Descanso',
    artist: 'Heavy Sparring Metal',
    genre: 'Rock',
    duration: 240,
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 75,
    bpm: 140
  },
  {
    id: 'track-4',
    title: 'Boom Bap Submissão',
    artist: 'Rap Old School Fight',
    genre: 'Hip-Hop',
    duration: 195,
    coverUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 50,
    bpm: 90
  },
  {
    id: 'track-5',
    title: 'Flow Roll & Drill Focus',
    artist: 'Lo-Fi Chill Tatame',
    genre: 'Lo-Fi',
    duration: 260,
    coverUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 432,
    bpm: 80
  },
  {
    id: 'track-6',
    title: 'Eletrônico Gás Infinito',
    artist: 'Electro Grappling Bass',
    genre: 'Eletrônico',
    duration: 210,
    coverUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&auto=format&fit=crop&q=80',
    audioFrequency: 65,
    bpm: 128
  }
];

interface SpotifyTatamePlayerProps {
  isTimerRunning: boolean;
  isResting: boolean;
}

export const SpotifyTatamePlayer: React.FC<SpotifyTatamePlayerProps> = ({
  isTimerRunning,
  isResting
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'player' | 'playlist' | 'spotify_link'>('player');
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState<string>('');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [syncWithTimer, setSyncWithTimer] = useState(true);

  const currentTrack = TATAME_TRACKS[currentTrackIndex];

  // Web Audio Context for synthesized dynamic rolling beats
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const beatIntervalRef = useRef<any>(null);

  // Initialize or resume audio context
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.connect(audioCtxRef.current.destination);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play synthetic dynamic beat pulse
  const triggerBeatPulse = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx || !gainNodeRef.current) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const now = ctx.currentTime;
      const freq = currentTrack.audioFrequency || 60;
      
      osc.type = currentTrack.genre === 'Rock' ? 'sawtooth' : currentTrack.genre === 'Phonk' ? 'square' : 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.15);

      const targetVol = (isMuted ? 0 : volume / 100) * 0.15;
      gain.gain.setValueAtTime(targetVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // ignore
    }
  }, [currentTrack, getAudioContext, isMuted, volume]);

  // Master Play / Pause
  const handleTogglePlay = () => {
    getAudioContext();
    setIsPlaying(prev => !prev);
  };

  const handleNextTrack = useCallback(() => {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * TATAME_TRACKS.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex(prev => (prev + 1) % TATAME_TRACKS.length);
    }
    setCurrentTime(0);
  }, [isShuffle]);

  const handlePreviousTrack = () => {
    if (currentTime > 5) {
      setCurrentTime(0);
    } else {
      setCurrentTrackIndex(prev => (prev === 0 ? TATAME_TRACKS.length - 1 : prev - 1));
      setCurrentTime(0);
    }
  };

  // Beat loop when playing
  useEffect(() => {
    if (!isPlaying) {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      return;
    }

    const intervalMs = (60 / currentTrack.bpm) * 1000;
    triggerBeatPulse();
    beatIntervalRef.current = setInterval(triggerBeatPulse, intervalMs);

    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [isPlaying, currentTrack, triggerBeatPulse]);

  // Progress time loop
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= currentTrack.duration) {
          if (isRepeat) {
            return 0;
          } else {
            handleNextTrack();
            return 0;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, currentTrack, isRepeat, handleNextTrack]);

  // Sync with Tatame Timer (Auto-DJ)
  const prevRunningRef = useRef(isTimerRunning);
  const prevRestingRef = useRef(isResting);

  useEffect(() => {
    if (!syncWithTimer) return;

    // When timer starts -> play music
    if (isTimerRunning && !prevRunningRef.current) {
      getAudioContext();
      setIsPlaying(true);
    }

    // When timer pauses -> pause music
    if (!isTimerRunning && prevRunningRef.current) {
      setIsPlaying(false);
    }

    // When in rest -> reduce volume (ducking) for professor's instructions
    if (isTimerRunning && isResting && !prevRestingRef.current) {
      // duck volume
    }

    prevRunningRef.current = isTimerRunning;
    prevRestingRef.current = isResting;
  }, [isTimerRunning, isResting, syncWithTimer, getAudioContext]);

  // Custom Spotify URL loader
  const handleLoadCustomSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    let clean = customInputUrl.trim();
    if (clean.includes('open.spotify.com/')) {
      const parts = clean.split('open.spotify.com/')[1].split('?')[0];
      setSpotifyEmbedUrl(`https://open.spotify.com/embed/${parts}?utm_source=generator&theme=0`);
    } else {
      setSpotifyEmbedUrl(`https://open.spotify.com/embed/playlist/${clean}?utm_source=generator&theme=0`);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const filteredTracks = TATAME_TRACKS.filter(t => {
    const matchesGenre = selectedGenre === 'TODOS' || t.genre === selectedGenre;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-5">
      {/* Top Header & Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className={`w-6 h-6 ${isPlaying ? 'animate-spin-slow text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>Spotify do Tatame</span>
              <span className="text-[10px] uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-extrabold flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                {isPlaying ? 'TOCANDO AGORA' : 'PAUSADO'}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Música contínua no tatame sincronizada com os rounds do cronômetro.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSyncWithTimer(!syncWithTimer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              syncWithTimer
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Sincronizar início e pausa automaticamente com o cronômetro"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-DJ: {syncWithTimer ? 'LIGADO' : 'DESLIGADO'}</span>
          </button>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'player' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('playlist')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'playlist' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Faixas ({TATAME_TRACKS.length})
            </button>
            <button
              onClick={() => setActiveTab('spotify_link')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'spotify_link' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Link Spotify
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: SPOTIFY MINI PLAYER (NATIVE INTEGRATED) */}
      {activeTab === 'player' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Album Cover & Track Info */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-500/40 shadow-xl shrink-0 relative group">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : ''}`}
                />
                <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 mb-1 inline-block">
                  {currentTrack.genre} • {currentTrack.bpm} BPM
                </span>
                <h5 className="text-base sm:text-lg font-black text-white truncate drop-shadow-sm">
                  {currentTrack.title}
                </h5>
                <p className="text-xs sm:text-sm text-slate-400 truncate font-medium">
                  {currentTrack.artist}
                </p>

                {/* Animated Waveform Visualizer */}
                <div className="flex items-center gap-1 mt-2.5 h-4">
                  {[40, 75, 100, 60, 90, 45, 80, 100, 50, 85, 65, 95].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-200 ${
                        isPlaying ? 'bg-emerald-400' : 'bg-slate-700'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(15, (h * ((i % 3) + 1)) % 100)}%` : '20%',
                        opacity: isPlaying ? 0.9 : 0.4
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Central Playback Controls */}
            <div className="flex flex-col items-center gap-3 w-full md:w-80">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 transition-all rounded-lg ${
                    isShuffle ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Modo Aleatório"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePreviousTrack}
                  className="p-2.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all active:scale-95 shadow-md"
                  title="Faixa Anterior"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className={`p-4 rounded-2xl text-slate-950 font-black shadow-xl transition-all transform active:scale-90 ${
                    isPlaying
                      ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'
                  }`}
                  title={isPlaying ? 'Pausar Música' : 'Tocar Música'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNextTrack}
                  className="p-2.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all active:scale-95 shadow-md"
                  title="Próxima Faixa"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-2 transition-all rounded-lg ${
                    isRepeat ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Repetir Faixa"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="w-full flex items-center gap-2.5 text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <div
                  className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    setCurrentTime(Math.floor(ratio * currentTrack.duration));
                  }}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                    style={{ width: `${(currentTime / currentTrack.duration) * 100}%` }}
                  />
                </div>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Desmutar' : 'Mutar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-5 h-5 text-slate-300" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-24 sm:w-28 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRACK LIST SELECTION */}
      {activeTab === 'playlist' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Genre Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['TODOS', 'Hip-Hop', 'Phonk', 'Rock', 'Lo-Fi', 'Eletrônico'].map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    selectedGenre === genre
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar música do tatame..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tracks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredTracks.map((track, idx) => {
              const isCurrent = currentTrackIndex === TATAME_TRACKS.findIndex(t => t.id === track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    const originalIdx = TATAME_TRACKS.findIndex(t => t.id === track.id);
                    setCurrentTrackIndex(originalIdx);
                    setCurrentTime(0);
                    getAudioContext();
                    setIsPlaying(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {track.artist} • {track.genre}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCurrent && isPlaying ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-slate-400 hover:text-white fill-current" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: CUSTOM SPOTIFY LINK / WEB EMBED */}
      {activeTab === 'spotify_link' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-white mb-1">
              Conectar Link de Playlist Externa do Spotify
            </h5>
            <p className="text-xs text-slate-400">
              Cole o link de qualquer playlist do seu Spotify para embutir diretamente no tatame.
            </p>
          </div>

          <form onSubmit={handleLoadCustomSpotify} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Cole o link: https://open.spotify.com/playlist/..."
              value={customInputUrl}
              onChange={e => setCustomInputUrl(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Carregar</span>
            </button>
          </form>

          {spotifyEmbedUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-800 mt-3">
              <iframe
                src={spotifyEmbedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Custom Player"
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
