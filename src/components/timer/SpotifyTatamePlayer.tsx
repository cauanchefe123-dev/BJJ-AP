import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Sparkles, 
  Check, 
  ExternalLink, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  ListMusic, 
  Sliders, 
  Zap, 
  Laptop, 
  Speaker,
  Headphones,
  Settings2,
  KeyRound
} from 'lucide-react';
import { 
  SpotifyService, 
  SpotifyUser, 
  SpotifyPlaybackState, 
  SpotifyPlaylistItem 
} from '../../lib/spotifyService';

interface PresetPlaylist {
  id: string;
  name: string;
  category: string;
  spotifyUri: string;
  icon: string;
  description: string;
}

const CURATED_PLAYLISTS: PresetPlaylist[] = [
  {
    id: 'bjj-hiphop',
    name: 'BJJ Rolling - Hip-Hop & Rap',
    category: 'Hip-Hop',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'bjj-rock',
    name: 'Hard Rock & Metal Tatame',
    category: 'Rock/Metal',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX9qNs32fujYe',
    icon: '⚡',
    description: 'Energia máxima para rounds sem descanso.'
  },
  {
    id: 'bjj-phonk',
    name: 'Gym Phonk & Electronic Energy',
    category: 'Phonk/Electro',
    spotifyUri: 'spotify:playlist:37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥',
    description: 'Gás total no tatame com graves pesados.'
  },
  {
    id: 'bjj-flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi/Focus',
    spotifyUri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM',
    icon: '🧘',
    description: 'Ritmo constante para treinos técnicos e drills.'
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
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSyncWithTimer, setAutoSyncWithTimer] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState<'player' | 'playlists' | 'curated'>('player');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Poll Playback State when connected
  const fetchSpotifyData = useCallback(async () => {
    const token = SpotifyService.getStoredToken();
    if (!token) {
      setUser(null);
      setPlayback(null);
      return;
    }

    try {
      const profile = await SpotifyService.getUserProfile();
      setUser(profile);

      if (profile) {
        const [currentPlay, userPlaylists, userDevices] = await Promise.all([
          SpotifyService.getPlaybackState(),
          SpotifyService.getUserPlaylists(12),
          SpotifyService.getDevices()
        ]);
        setPlayback(currentPlay);
        setPlaylists(userPlaylists);
        setDevices(userDevices);
        if (userDevices.length > 0 && !selectedDeviceId) {
          const activeDev = userDevices.find(d => d.is_active) || userDevices[0];
          setSelectedDeviceId(activeDev.id);
        }
      }
    } catch (e) {
      console.error('Error polling Spotify:', e);
    }
  }, [selectedDeviceId]);

  // Handle OAuth Popup
  const handleConnectSpotify = async () => {
    setIsLoading(true);
    setStatusMessage('Abrindo conexão com o Spotify...');

    try {
      // 1. Fetch Auth URL from server
      const res = await fetch('/api/spotify/auth-url');
      const data = await res.json();
      const authUrl = data.url;

      // 2. Open Popup Window
      const width = 500;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'spotify_oauth',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        setStatusMessage('Permita popups no navegador para conectar sua conta.');
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      setStatusMessage('Erro ao iniciar conexão. Você também pode inserir o token diretamente.');
      setIsLoading(false);
    }
  };

  // Listen for OAuth message from Popup
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS' && event.data?.accessToken) {
        SpotifyService.setToken(event.data.accessToken, event.data.expiresIn || 3600);
        setStatusMessage('Conectado com sucesso ao Spotify!');
        setIsLoading(false);
        fetchSpotifyData();
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        setStatusMessage(`Erro na autenticação: ${event.data.error}`);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [fetchSpotifyData]);

  // Initial load
  useEffect(() => {
    fetchSpotifyData();
    const interval = setInterval(fetchSpotifyData, 4000);
    return () => clearInterval(interval);
  }, [fetchSpotifyData]);

  // Auto-Sync Audio with Tatame Timer
  const wasRunningRef = useRef(isTimerRunning);
  const wasRestingRef = useRef(isResting);

  useEffect(() => {
    if (!user || !autoSyncWithTimer) return;

    // Timer just started running
    if (isTimerRunning && !wasRunningRef.current) {
      if (!isResting) {
        SpotifyService.setVolume(volume);
        SpotifyService.play(undefined, selectedDeviceId);
      }
    }

    // Timer paused
    if (!isTimerRunning && wasRunningRef.current) {
      SpotifyService.pause(selectedDeviceId);
    }

    // Entered Rest period -> lower volume for coach instructions
    if (isTimerRunning && isResting && !wasRestingRef.current) {
      SpotifyService.setVolume(Math.round(volume * 0.25)); // 25% background volume during rest
    }

    // Resumed fight round -> restore full volume
    if (isTimerRunning && !isResting && wasRestingRef.current) {
      SpotifyService.setVolume(volume);
      SpotifyService.play(undefined, selectedDeviceId);
    }

    wasRunningRef.current = isTimerRunning;
    wasRestingRef.current = isResting;
  }, [isTimerRunning, isResting, user, autoSyncWithTimer, volume, selectedDeviceId]);

  // Manual Playback controls
  const handleTogglePlay = async () => {
    if (!user) return;
    if (playback?.is_playing) {
      await SpotifyService.pause(selectedDeviceId);
    } else {
      await SpotifyService.play(undefined, selectedDeviceId);
    }
    fetchSpotifyData();
  };

  const handleNext = async () => {
    await SpotifyService.nextTrack();
    setTimeout(fetchSpotifyData, 500);
  };

  const handlePrevious = async () => {
    await SpotifyService.previousTrack();
    setTimeout(fetchSpotifyData, 500);
  };

  const handleVolumeChange = async (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    await SpotifyService.setVolume(newVol);
  };

  const handlePlayPlaylist = async (uri: string) => {
    if (!user) {
      setStatusMessage('Conecte sua conta do Spotify para reproduzir no tatame.');
      return;
    }
    setStatusMessage('Iniciando playlist no tatame...');
    const ok = await SpotifyService.play(uri, selectedDeviceId);
    if (ok) {
      setStatusMessage('Reproduzindo agora!');
      setTimeout(() => setStatusMessage(null), 2500);
      fetchSpotifyData();
    } else {
      setStatusMessage('Selecione uma caixa de som ativa ou abra o Spotify no celular/TV.');
    }
  };

  const handleSaveManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTokenInput.trim()) return;
    SpotifyService.setToken(customTokenInput.trim(), 3600);
    setCustomTokenInput('');
    setShowConfigModal(false);
    setStatusMessage('Token aplicado com sucesso!');
    fetchSpotifyData();
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setStatusMessage('Spotify desconectado.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 text-slate-200 shadow-2xl space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className={`w-6 h-6 ${playback?.is_playing ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Spotify do Tatame Integrado</span>
              {user ? (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-semibold">
                  Desconectado
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {user 
                ? `Logado como ${user.display_name} (${user.product === 'premium' ? 'Spotify Premium 🌟' : 'Spotify Free'})` 
                : 'Conecte sua conta do Spotify para rolar a música e o cronômetro juntos no tatame.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => setAutoSyncWithTimer(!autoSyncWithTimer)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  autoSyncWithTimer
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Sincronizar música com início de rounds e pausa no descanso"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-DJ Tatame: {autoSyncWithTimer ? 'LIGADO' : 'DESLIGADO'}</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition-all flex items-center gap-1"
                title="Desconectar Spotify"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnectSpotify}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Conectando...' : 'Conectar Conta Spotify'}</span>
              </button>

              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                title="Opções de Token / Configurações"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Integrated Controller */}
      {user ? (
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'player'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Tocando Agora</span>
            </button>
            <button
              onClick={() => setActiveTab('curated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'curated'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Playlists de Jiu-Jitsu</span>
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'playlists'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Minhas Playlists ({playlists.length})</span>
            </button>
          </div>

          {/* Active Player Card */}
          {activeTab === 'player' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-5">
              {/* Track Info */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 shadow-lg relative flex items-center justify-center">
                  {playback?.item?.album?.images?.[0]?.url ? (
                    <img 
                      src={playback.item.album.images[0].url} 
                      alt="Capa do Álbum" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Headphones className="w-8 h-8 text-slate-600" />
                  )}
                  {playback?.is_playing && (
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-950 animate-ping"></span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="text-sm sm:text-base font-bold text-white truncate">
                    {playback?.item?.name || 'Nenhuma música tocando no momento'}
                  </h5>
                  <p className="text-xs text-slate-400 truncate">
                    {playback?.item?.artists?.map(a => a.name).join(', ') || 'Abra o Spotify ou escolha uma playlist abaixo'}
                  </p>
                  {playback?.item?.album?.name && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Álbum: {playback.item.album.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Central Controls */}
              <div className="flex flex-col items-center gap-2 w-full md:w-80">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevious}
                    className="p-2 text-slate-400 hover:text-white transition-all active:scale-95"
                    title="Música Anterior"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className={`p-3.5 rounded-2xl text-slate-950 font-black shadow-lg transition-all active:scale-95 ${
                      playback?.is_playing
                        ? 'bg-amber-400 hover:bg-amber-300'
                        : 'bg-emerald-500 hover:bg-emerald-400'
                    }`}
                    title={playback?.is_playing ? 'Pausar' : 'Tocar'}
                  >
                    {playback?.is_playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNext}
                    className="p-2 text-slate-400 hover:text-white transition-all active:scale-95"
                    title="Próxima Música"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Time */}
                {playback?.item && (
                  <div className="w-full flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{formatMs(playback.progress_ms || 0)}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((playback.progress_ms || 0) / (playback.item.duration_ms || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <span>{formatMs(playback.item.duration_ms || 0)}</span>
                  </div>
                )}
              </div>

              {/* Volume & Devices */}
              <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVolumeChange(isMuted ? 80 : 0)}
                    className="text-slate-400 hover:text-white"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : volume < 50 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-7 text-right">{volume}%</span>
                </div>

                {devices.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                    <Speaker className="w-3.5 h-3.5 text-emerald-400" />
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="bg-transparent text-slate-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                          {d.name} {d.is_active ? '(Ativo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Curated BJJ Playlists */}
          {activeTab === 'curated' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {CURATED_PLAYLISTS.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <h6 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {item.name}
                    </h6>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                      {item.category}
                    </span>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePlayPlaylist(item.spotifyUri)}
                    className="mt-3 w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tocar no Tatame</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* User's Own Playlists */}
          {activeTab === 'playlists' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-3 py-4 text-center">
                  Nenhuma playlist encontrada na sua conta.
                </p>
              ) : (
                playlists.map(pl => (
                  <div
                    key={pl.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        {pl.images?.[0]?.url ? (
                          <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-5 h-5 text-slate-600 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                        <p className="text-[10px] text-slate-400">{pl.tracks?.total || 0} músicas</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlayPlaylist(pl.uri)}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shrink-0"
                      title="Reproduzir playlist"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Fallback Curated Embed Player when not logged in */
        <div className="space-y-3">
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-bold text-white">
                  Controle total do Spotify direto no Tatame
                </h5>
                <p className="text-xs text-slate-400">
                  Clique no botão acima para conectar sua conta e alternar faixas, volumes e playlists sem sair do app!
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectSpotify}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950/60"
            >
              <LogIn className="w-4 h-4" />
              <span>Conectar com Spotify</span>
            </button>
          </div>

          {/* Quick Curated Playlists Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURATED_PLAYLISTS.map(pl => (
              <div
                key={pl.id}
                className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center gap-2"
              >
                <span className="text-lg">{pl.icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-300 truncate">{pl.name}</p>
                  <p className="text-[9px] text-slate-500 uppercase">{pl.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Token / Client ID Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Configurações da Conexão Spotify
              </h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Você pode inserir um <strong>Access Token do Spotify</strong> diretamente (gerado no Spotify Developer Dashboard) para conectar instantaneamente:
            </p>

            <form onSubmit={handleSaveManualToken} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Spotify Access Token:
                </label>
                <input
                  type="text"
                  placeholder="Cole aqui o Bearer Token do Spotify..."
                  value={customTokenInput}
                  onChange={e => setCustomTokenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Salvar Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
