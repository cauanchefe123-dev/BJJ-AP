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
  Sparkles, 
  Check, 
  ExternalLink, 
  LogIn, 
  LogOut, 
  ListMusic, 
  Zap, 
  Headphones, 
  Settings2, 
  KeyRound, 
  Radio, 
  Copy, 
  Info, 
  Laptop, 
  Speaker,
  RefreshCw,
  Flame,
  Plus
} from 'lucide-react';
import { 
  SpotifyService, 
  SpotifyUser, 
  SpotifyPlaybackState, 
  SpotifyPlaylistItem 
} from '../../lib/spotifyService';
import { createSpotifyAuthUrl, exchangeSpotifyCodeForToken } from '../../lib/spotifyPkce';

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
  
  // Connection / Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => SpotifyService.getCustomClientId());
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'player' | 'playlists' | 'devices'>('player');

  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/spotify/callback` 
    : '';

  // Poll Spotify data if user is logged in
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
          SpotifyService.getUserPlaylists(20),
          SpotifyService.getDevices()
        ]);
        setPlayback(currentPlay);
        setPlaylists(userPlaylists);
        setDevices(userDevices);

        if (userDevices.length > 0 && !selectedDeviceId) {
          const active = userDevices.find(d => d.is_active) || userDevices[0];
          setSelectedDeviceId(active.id);
        }
      }
    } catch (err) {
      console.error('Error polling Spotify API:', err);
    }
  }, [selectedDeviceId]);

  // Initial load and recurring sync
  useEffect(() => {
    fetchSpotifyData();
    const interval = setInterval(fetchSpotifyData, 4000);
    return () => clearInterval(interval);
  }, [fetchSpotifyData]);

  // Handle OAuth Popup (PKCE Authorization Code Flow)
  const handleConnectSpotify = async () => {
    setIsLoading(true);
    setStatusMessage('Abrindo tela de autorização do Spotify...');

    try {
      const clientId = customClientId.trim() || '98dc96a5b6f3458dbf436e2f1e67bfd9';
      const { authUrl, codeVerifier } = await createSpotifyAuthUrl(clientId, redirectUri);

      const width = 520;
      const height = 720;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'spotify_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
      );

      if (!popup) {
        setStatusMessage('Por favor, permita popups no navegador para conectar sua conta Spotify.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      setShowConfigModal(true);
    }
  };

  // Listen for OAuth message from Popup
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_CODE' && event.data?.code) {
        setStatusMessage('Trocando código de autorização por token...');
        const clientId = customClientId.trim() || '98dc96a5b6f3458dbf436e2f1e67bfd9';
        
        // Exchange via PKCE
        const tokenData = await exchangeSpotifyCodeForToken(event.data.code, clientId, redirectUri);
        if (tokenData?.accessToken) {
          SpotifyService.setToken(tokenData.accessToken, tokenData.expiresIn || 3600);
          setStatusMessage('✅ Conta Spotify conectada com sucesso!');
          setIsLoading(false);
          fetchSpotifyData();
          setTimeout(() => setStatusMessage(null), 3000);
        } else {
          // Try server exchange proxy fallback
          try {
            const res = await fetch('/api/spotify/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: event.data.code,
                client_id: clientId,
                redirect_uri: redirectUri,
                code_verifier: sessionStorage.getItem('spotify_code_verifier') || ''
              })
            });
            const data = await res.json();
            if (data.access_token) {
              SpotifyService.setToken(data.access_token, data.expires_in || 3600);
              setStatusMessage('✅ Conta Spotify conectada com sucesso!');
              setIsLoading(false);
              fetchSpotifyData();
              setTimeout(() => setStatusMessage(null), 3000);
              return;
            }
          } catch {
            // fallback error
          }
          setStatusMessage('Não foi possível autenticar. Você pode inserir seu token nas configurações.');
          setIsLoading(false);
          setShowConfigModal(true);
        }
      } else if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS' && event.data?.accessToken) {
        SpotifyService.setToken(event.data.accessToken, event.data.expiresIn || 3600);
        setStatusMessage('✅ Conta Spotify conectada com sucesso!');
        setIsLoading(false);
        fetchSpotifyData();
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        setStatusMessage(`Erro de login: ${event.data.error}`);
        setIsLoading(false);
        setShowConfigModal(true);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [fetchSpotifyData, customClientId, redirectUri]);

  // Auto-Sync Audio with Tatame Timer
  const wasRunningRef = useRef(isTimerRunning);
  const wasRestingRef = useRef(isResting);

  useEffect(() => {
    if (!user || !autoSyncWithTimer) return;

    if (isTimerRunning && !wasRunningRef.current) {
      if (!isResting) {
        SpotifyService.setVolume(volume);
        SpotifyService.play(undefined, selectedDeviceId);
      }
    }

    if (!isTimerRunning && wasRunningRef.current) {
      SpotifyService.pause(selectedDeviceId);
    }

    if (isTimerRunning && isResting && !wasRestingRef.current) {
      SpotifyService.setVolume(Math.round(volume * 0.25));
    }

    if (isTimerRunning && !isResting && wasRestingRef.current) {
      SpotifyService.setVolume(volume);
      SpotifyService.play(undefined, selectedDeviceId);
    }

    wasRunningRef.current = isTimerRunning;
    wasRestingRef.current = isResting;
  }, [isTimerRunning, isResting, user, autoSyncWithTimer, volume, selectedDeviceId]);

  // Controls
  const handleTogglePlay = async () => {
    if (!user) return;
    if (playback?.is_playing) {
      await SpotifyService.pause(selectedDeviceId);
    } else {
      await SpotifyService.play(undefined, selectedDeviceId);
    }
    setTimeout(fetchSpotifyData, 400);
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
    setStatusMessage('Iniciando playlist...');
    const ok = await SpotifyService.play(uri, selectedDeviceId);
    if (ok) {
      setStatusMessage('Reproduzindo playlist no Spotify!');
      setTimeout(() => setStatusMessage(null), 2500);
      fetchSpotifyData();
    } else {
      setStatusMessage('Abra o Spotify no celular, TV ou computador para iniciar a reprodução.');
    }
  };

  const handleSaveManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClientId.trim()) {
      SpotifyService.setCustomClientId(customClientId.trim());
      setCustomClientId(customClientId.trim());
    }
    if (customTokenInput.trim()) {
      SpotifyService.setToken(customTokenInput.trim(), 3600);
      setCustomTokenInput('');
      setShowConfigModal(false);
      setStatusMessage('Token conectado com sucesso!');
      fetchSpotifyData();
    } else {
      setShowConfigModal(false);
      handleConnectSpotify();
    }
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setPlaylists([]);
    setStatusMessage('Conta Spotify desconectada.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const copyRedirectToClipboard = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 text-slate-200 shadow-2xl space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className={`w-7 h-7 ${playback?.is_playing ? 'animate-spin-slow text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>Spotify Conectado</span>
              {user ? (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-extrabold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado como {user.display_name}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-bold">
                  Não conectado
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {user 
                ? `${user.product === 'premium' ? 'Spotify Premium 🌟' : 'Spotify Free'} • Controle de música do tatame ativo` 
                : 'Conecte sua conta do Spotify via OAuth para tocar e controlar suas músicas diretamente no sistema.'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => setAutoSyncWithTimer(!autoSyncWithTimer)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  autoSyncWithTimer
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Sincronizar música com o início de rounds e pausa no descanso"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-DJ: {autoSyncWithTimer ? 'LIGADO' : 'DESLIGADO'}</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnectSpotify}
                disabled={isLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Conectando ao Spotify...' : 'Entrar com Spotify'}</span>
              </button>

              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                title="Configurações de Conexão Spotify"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* STATE 1: USER CONNECTED -> REAL SPOTIFY CONTROLLER */}
      {user ? (
        <div className="space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'player'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Tocando no Spotify</span>
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'playlists'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Suas Playlists ({playlists.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'devices'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Speaker className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dispositivos / TV ({devices.length})</span>
            </button>
          </div>

          {/* Active Spotify Player Bar */}
          {activeTab === 'player' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Song Information */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-500/40 shadow-xl shrink-0 relative flex items-center justify-center">
                  {playback?.item?.album?.images?.[0]?.url ? (
                    <img 
                      src={playback.item.album.images[0].url} 
                      alt="Capa do Spotify" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Headphones className="w-8 h-8 text-slate-600" />
                  )}
                  {playback?.is_playing && (
                    <span className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping"></span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="text-base font-black text-white truncate">
                    {playback?.item?.name || 'Nenhuma música tocando agora'}
                  </h5>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {playback?.item?.artists?.map(a => a.name).join(', ') || 'Abra uma playlist ou selecione uma faixa abaixo'}
                  </p>
                  {playback?.item?.album?.name && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                      Álbum: {playback.item.album.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Central Playback Controls */}
              <div className="flex flex-col items-center gap-2.5 w-full md:w-80">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePrevious}
                    className="p-2.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all active:scale-95"
                    title="Música Anterior"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className={`p-4 rounded-2xl text-slate-950 font-black shadow-xl transition-all transform active:scale-90 ${
                      playback?.is_playing
                        ? 'bg-amber-400 hover:bg-amber-300'
                        : 'bg-emerald-500 hover:bg-emerald-400'
                    }`}
                    title={playback?.is_playing ? 'Pausar' : 'Tocar'}
                  >
                    {playback?.is_playing ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    className="p-2.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all active:scale-95"
                    title="Próxima Música"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                </div>

                {/* Progress bar */}
                {playback?.item && (
                  <div className="w-full flex items-center gap-2.5 text-xs text-slate-400 font-mono">
                    <span>{formatMs(playback.progress_ms || 0)}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
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

              {/* Volume */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleVolumeChange(isMuted ? 80 : 0)}
                  className="text-slate-400 hover:text-white"
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
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-24 sm:w-28 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-xs font-mono text-slate-400 w-8 text-right">{volume}%</span>
              </div>
            </div>
          )}

          {/* User Playlists */}
          {activeTab === 'playlists' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-3 py-6 text-center">
                  Nenhuma playlist encontrada na sua conta Spotify.
                </p>
              ) : (
                playlists.map(pl => (
                  <div
                    key={pl.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        {pl.images?.[0]?.url ? (
                          <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-6 h-6 text-slate-600 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {pl.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{pl.tracks?.total || 0} músicas</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlayPlaylist(pl.uri)}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shrink-0 active:scale-95 shadow-md"
                      title="Reproduzir esta playlist no tatame"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Dispositivos de Áudio Conectados (TV da academia, Celular, Caixa Bluetooth):
                </span>
                <button
                  onClick={fetchSpotifyData}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Atualizar</span>
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl">
                  Nenhum dispositivo ativo detectado. Abra o Spotify na TV, computador ou celular da academia para conectar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {devices.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeviceId(d.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedDeviceId === d.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {d.type.toLowerCase().includes('speaker') ? (
                          <Speaker className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Laptop className="w-4 h-4 text-emerald-400" />
                        )}
                        <div>
                          <p className="text-xs font-bold">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.type} • {d.volume_percent}% volume</p>
                        </div>
                      </div>
                      {selectedDeviceId === d.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* STATE 2: NOT CONNECTED -> GITHUB-STYLE SPOTIFY LOGIN CARD */
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl">
            <Disc className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-1">
            <h5 className="text-base font-black text-white">
              Vincular Conta Spotify ao BJJCRON
            </h5>
            <p className="text-xs text-slate-400">
              Conecte sua conta do Spotify com 1 clique para sincronizar suas playlists reais e tocar no tatame em conjunto com o cronômetro de rola.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleConnectSpotify}
              disabled={isLoading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Conectando ao Spotify...' : 'Entrar com Spotify'}</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Settings2 className="w-4 h-4" />
              <span>Configurar App / Token</span>
            </button>
          </div>
        </div>
      )}

      {/* Connection & Client ID Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Configurar Autenticação do Spotify
              </h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                Redirect URI (URL de Retorno da sua Academia):
              </p>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <code className="text-[11px] text-emerald-300 font-mono flex-1 truncate">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={copyRedirectToClipboard}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedRedirect ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Cole este link em <em>Redirect URIs</em> no seu aplicativo no <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Spotify Developer Dashboard</a>.
              </p>
            </div>

            <form onSubmit={handleSaveManualToken} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Seu Spotify Client ID:
                </label>
                <input
                  type="text"
                  placeholder="Cole seu Client ID do Spotify..."
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Ou Cole um Access Token Direto:
                </label>
                <input
                  type="text"
                  placeholder="Cole o Bearer Token..."
                  value={customTokenInput}
                  onChange={e => setCustomTokenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all"
                >
                  Salvar & Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
