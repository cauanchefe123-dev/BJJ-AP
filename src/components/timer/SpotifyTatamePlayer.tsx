import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Radio, 
  LogOut, 
  RefreshCw, 
  Sliders, 
  ListMusic, 
  Check, 
  Copy, 
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  Speaker
} from 'lucide-react';
import { 
  SpotifyService, 
  SpotifyUser, 
  SpotifyPlaybackState, 
  SpotifyPlaylistItem,
  DEFAULT_SPOTIFY_CLIENT_ID
} from '../../lib/spotifyService';
import { 
  createSpotifyAuthUrl, 
  exchangeSpotifyCodeForToken, 
  getDefaultRedirectUri 
} from '../../lib/spotifyPkce';

interface SpotifyTatamePlayerProps {
  isTimerRunning?: boolean;
  isResting?: boolean;
}

export const SpotifyTatamePlayer: React.FC<SpotifyTatamePlayerProps> = ({
  isTimerRunning = false,
  isResting = false
}) => {
  // Authentication State
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Connection Settings
  const [clientId, setClientId] = useState<string>(() => SpotifyService.getCustomClientId());
  const [customRedirectUri, setCustomRedirectUri] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_custom_redirect') || getDefaultRedirectUri();
  });
  const [showSettings, setShowSettings] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Playback & Device State
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // Auto-DJ settings
  const [autoPauseOnRest, setAutoPauseOnRest] = useState<boolean>(() => {
    return localStorage.getItem('bjjcron_spotify_auto_pause') !== 'false';
  });
  const [skipOnRoundStart, setSkipOnRoundStart] = useState<boolean>(() => {
    return localStorage.getItem('bjjcron_spotify_skip_round') === 'true';
  });

  const previousRestRef = useRef<boolean>(false);
  const previousRunningRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check URL parameters for OAuth return (code / error)
  useEffect(() => {
    const handleUrlCode = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('spotify_code') || urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setAuthError(`Erro na autorização do Spotify: ${error}`);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
          const tokenData = await exchangeSpotifyCodeForToken(code, clientId, customRedirectUri);
          if (tokenData && tokenData.accessToken) {
            SpotifyService.setToken(tokenData.accessToken, tokenData.expiresIn, tokenData.refreshToken);
            await loadUserData();
          } else {
            setAuthError('Não foi possível obter o token do Spotify. Verifique se o Redirect URI está cadastrado.');
          }
        } catch (e: any) {
          setAuthError(e?.message || 'Erro ao processar login do Spotify');
        } finally {
          setIsAuthenticating(false);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleUrlCode();
  }, [clientId, customRedirectUri]);

  // Listen for popup window message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_CODE' && event.data.code) {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
          const tokenData = await exchangeSpotifyCodeForToken(
            event.data.code,
            clientId,
            customRedirectUri
          );
          if (tokenData && tokenData.accessToken) {
            SpotifyService.setToken(tokenData.accessToken, tokenData.expiresIn, tokenData.refreshToken);
            await loadUserData();
          } else {
            setAuthError('Falha ao autenticar com o Spotify.');
          }
        } catch (e: any) {
          setAuthError(e?.message || 'Erro ao conectar');
        } finally {
          setIsAuthenticating(false);
        }
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        setAuthError(`Erro: ${event.data.error}`);
        setIsAuthenticating(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [clientId, customRedirectUri]);

  // Load User Data & Playlists on Mount if token exists
  const loadUserData = useCallback(async () => {
    const profile = await SpotifyService.getUserProfile();
    if (profile) {
      setUser(profile);
      // Fetch devices
      const devList = await SpotifyService.getDevices();
      setDevices(devList);
      const activeDev = devList.find(d => d.is_active) || devList[0];
      if (activeDev) {
        setSelectedDeviceId(activeDev.id);
        if (typeof activeDev.volume_percent === 'number') {
          setVolume(activeDev.volume_percent);
        }
      }
      // Fetch Playlists
      const plList = await SpotifyService.getUserPlaylists(20);
      setUserPlaylists(plList);
      // Fetch Current Playback
      const state = await SpotifyService.getPlaybackState();
      if (state) {
        setPlayback(state);
      }
    } else {
      setUser(null);
      setPlayback(null);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Polling for playback state when connected
  useEffect(() => {
    if (!user) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const refreshPlayback = async () => {
      const state = await SpotifyService.getPlaybackState();
      if (state) {
        setPlayback(state);
      }
    };

    pollIntervalRef.current = setInterval(refreshPlayback, 3500);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user]);

  // Auto-DJ sync with MatTimer
  useEffect(() => {
    if (!user || !playback) return;

    // Transition into Rest
    if (autoPauseOnRest && isResting && !previousRestRef.current && isTimerRunning) {
      if (playback.is_playing) {
        SpotifyService.pause(selectedDeviceId);
        setPlayback(prev => prev ? { ...prev, is_playing: false } : null);
      }
    }

    // Transition out of Rest back into Round
    if (autoPauseOnRest && !isResting && previousRestRef.current && isTimerRunning) {
      if (skipOnRoundStart) {
        SpotifyService.nextTrack();
      }
      SpotifyService.play(undefined, selectedDeviceId);
      setPlayback(prev => prev ? { ...prev, is_playing: true } : null);
    }

    previousRestRef.current = isResting;
    previousRunningRef.current = isTimerRunning;
  }, [isResting, isTimerRunning, autoPauseOnRest, skipOnRoundStart, user, playback, selectedDeviceId]);

  // Initiate Spotify OAuth Login
  const handleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      SpotifyService.setCustomClientId(clientId);
      localStorage.setItem('bjjcron_spotify_custom_redirect', customRedirectUri);

      const { authUrl } = await createSpotifyAuthUrl(clientId, customRedirectUri);

      const width = 500;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'SpotifyAuthPopup',
        `menubar=no,location=no,resizable=no,scrollbars=yes,status=no,width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback: full redirect if popup blocked
        window.location.href = authUrl;
      }
    } catch (e: any) {
      setAuthError(e?.message || 'Erro ao gerar URL de autorização');
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setUserPlaylists([]);
  };

  // Playback actions
  const handleTogglePlay = async () => {
    if (!user) return;
    setIsLoadingAction(true);
    if (playback?.is_playing) {
      await SpotifyService.pause(selectedDeviceId);
      setPlayback(prev => prev ? { ...prev, is_playing: false } : null);
    } else {
      await SpotifyService.play(undefined, selectedDeviceId);
      setPlayback(prev => prev ? { ...prev, is_playing: true } : null);
    }
    setIsLoadingAction(false);
  };

  const handleNext = async () => {
    if (!user) return;
    setIsLoadingAction(true);
    await SpotifyService.nextTrack();
    setTimeout(async () => {
      const state = await SpotifyService.getPlaybackState();
      if (state) setPlayback(state);
      setIsLoadingAction(false);
    }, 400);
  };

  const handlePrevious = async () => {
    if (!user) return;
    setIsLoadingAction(true);
    await SpotifyService.previousTrack();
    setTimeout(async () => {
      const state = await SpotifyService.getPlaybackState();
      if (state) setPlayback(state);
      setIsLoadingAction(false);
    }, 400);
  };

  const handlePlayPlaylist = async (uri: string) => {
    if (!user) return;
    setIsLoadingAction(true);
    await SpotifyService.play(uri, selectedDeviceId);
    setTimeout(async () => {
      const state = await SpotifyService.getPlaybackState();
      if (state) setPlayback(state);
      setIsLoadingAction(false);
    }, 500);
  };

  const handleVolumeChange = async (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    await SpotifyService.setVolume(newVol);
  };

  const handleToggleMute = async () => {
    if (isMuted) {
      setIsMuted(false);
      await SpotifyService.setVolume(volume || 80);
    } else {
      setIsMuted(true);
      await SpotifyService.setVolume(0);
    }
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(customRedirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 text-white space-y-4 shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                Spotify Oficial do Tatame
              </h3>
              {user && (
                <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-[10px] font-bold uppercase tracking-wider">
                  {user.product === 'premium' ? 'Premium' : 'Conectado'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {user 
                ? `Conectado como ${user.display_name || user.email}`
                : 'Conecte sua conta do Spotify para controle total do som no tatame'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Desconectar conta do Spotify"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Configurações de Conexão Spotify"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">{authError}</p>
            <p className="text-[11px] text-rose-300/80 mt-1">
              Dica: Certifique-se de que a Redirect URI do seu aplicativo no Spotify Developer Dashboard corresponde à URL deste app.
            </p>
          </div>
        </div>
      )}

      {/* STATE 1: NOT LOGGED IN */}
      {!user && (
        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20 flex items-center justify-center text-[#1DB954] mx-auto shadow-inner">
              <Music className="w-7 h-7" />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold text-slate-200 text-sm sm:text-base">
                Faça login para tocar suas playlists no tatame
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controle o som diretamente pelo cronômetro: pause a música automaticamente nos intervalos de descanso e troque de faixa entre os rounds.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-slate-950 font-bold text-sm rounded-2xl transition-all shadow-lg shadow-[#1DB954]/20 hover:shadow-[#1DB954]/30 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando ao Spotify...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 fill-current" />
                    <span>Fazer Login com Spotify</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connection Settings (Expandable) */}
          {showSettings && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Configurações OAuth (Spotify Developer)
                </h5>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Spotify Client ID:</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder={DEFAULT_SPOTIFY_CLIENT_ID}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Redirect URI de Retorno:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customRedirectUri}
                      onChange={e => setCustomRedirectUri(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleCopyUri}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUri ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Cadastre essa URL exata no seu aplicativo no Spotify Developer Dashboard em <b>Redirect URIs</b>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 2: LOGGED IN WITH REAL SPOTIFY */}
      {user && (
        <div className="space-y-4">
          {/* Active Device Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Speaker className="w-4 h-4 text-[#1DB954]" />
              <span className="font-semibold">Dispositivo de Reprodução:</span>
            </div>

            <div className="flex items-center gap-2">
              {devices.length > 0 ? (
                <select
                  value={selectedDeviceId}
                  onChange={e => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#1DB954]"
                >
                  {devices.map(dev => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} {dev.is_active ? '(Ativo)' : ''} ({dev.type})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-500 italic">
                  Abra o Spotify no celular/PC para conectar
                </span>
              )}

              <button
                onClick={loadUserData}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Atualizar dispositivos"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Now Playing Controller Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              {/* Album Art & Title */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {playback?.item?.album?.images?.[0]?.url ? (
                  <img
                    src={playback.item.album.images[0].url}
                    alt={playback.item.name}
                    className="w-14 h-14 rounded-xl object-cover shadow-md shrink-0 border border-slate-800"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <Music className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {playback?.item?.name || 'Nenhuma música tocando agora'}
                  </p>
                  <p className="text-xs text-[#1DB954] truncate">
                    {playback?.item?.artists?.map(a => a.name).join(', ') || 'Selecione uma playlist abaixo'}
                  </p>
                  {playback?.item && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {formatDuration(playback.progress_ms)} / {formatDuration(playback.item.duration_ms)}
                    </p>
                  )}
                </div>
              </div>

              {/* Main Playback Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrevious}
                  disabled={isLoadingAction}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  title="Faixa Anterior"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  disabled={isLoadingAction}
                  className="p-3.5 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-slate-950 transition-all shadow-md shadow-[#1DB954]/20 cursor-pointer disabled:opacity-50 active:scale-95"
                  title={playback?.is_playing ? 'Pausar' : 'Tocar'}
                >
                  {playback?.is_playing ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  disabled={isLoadingAction}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  title="Próxima Faixa"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-900">
              <button
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={e => handleVolumeChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
              <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

          {/* User's Real Spotify Playlists */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ListMusic className="w-4 h-4 text-[#1DB954]" />
                Suas Playlists do Spotify
              </h4>
              <span className="text-[10px] text-slate-500">
                1-Clique para tocar no dispositivo ativo
              </span>
            </div>

            {userPlaylists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {userPlaylists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handlePlayPlaylist(pl.uri)}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-[#1DB954]/50 transition-all text-left flex items-center gap-2 cursor-pointer group"
                  >
                    {pl.images?.[0]?.url ? (
                      <img
                        src={pl.images[0].url}
                        alt={pl.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {pl.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {pl.tracks?.total || 0} faixas
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                Nenhuma playlist encontrada na sua conta do Spotify.
              </div>
            )}
          </div>

          {/* Auto-DJ Tatame Timer Sync Settings */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></span>
              <span className="font-semibold">Sincronização com o Cronômetro:</span>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPauseOnRest}
                  onChange={e => {
                    setAutoPauseOnRest(e.target.checked);
                    localStorage.setItem('bjjcron_spotify_auto_pause', String(e.target.checked));
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-[#1DB954] focus:ring-0 cursor-pointer"
                />
                <span>Pausar música no descanso</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipOnRoundStart}
                  onChange={e => {
                    setSkipOnRoundStart(e.target.checked);
                    localStorage.setItem('bjjcron_spotify_skip_round', String(e.target.checked));
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-[#1DB954] focus:ring-0 cursor-pointer"
                />
                <span>Pular faixa ao iniciar round</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
