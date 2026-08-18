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
  Zap, 
  Headphones, 
  Settings2, 
  KeyRound, 
  Radio, 
  Copy, 
  Info, 
  ExternalLink,
  Flame,
  Check,
  Plus,
  RefreshCw,
  Sliders,
  LogIn,
  LogOut,
  AlertCircle,
  ListMusic,
  Tv,
  Sparkles
} from 'lucide-react';
import { 
  SpotifyService, 
  SpotifyUser, 
  SpotifyPlaybackState, 
  SpotifyPlaylistItem,
  DEFAULT_SPOTIFY_CLIENT_ID 
} from '../../lib/spotifyService';
import { createSpotifyAuthUrl, exchangeSpotifyCodeForToken } from '../../lib/spotifyPkce';

interface CuratedPlaylist {
  id: string;
  name: string;
  category: string;
  uri: string;
  icon: string;
  description: string;
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'hiphop',
    name: 'BJJ Rolling - Hip-Hop & Rap',
    category: 'Hip-Hop / Sparring',
    uri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'phonk',
    name: 'Gym Phonk & Electronic Energy',
    category: 'Phonk / Combate',
    uri: 'spotify:playlist:37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥',
    description: 'Gás máximo e ritmo acelerado para o tatame.'
  },
  {
    id: 'rock',
    name: 'Hard Rock & Metal Tatame',
    category: 'Rock / Heavy',
    uri: 'spotify:playlist:37i9dQZF1DX9qNs32fujYe',
    icon: '⚡',
    description: 'Rounds intensos sem descanso ao som de guitarras pesadas.'
  },
  {
    id: 'flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi / Treino Técnico',
    uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM',
    icon: '🧘',
    description: 'Foco contínuo para repetições de posição e aquecimento.'
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
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_selected_uri') || 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd';
  });
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [autoSyncWithTimer, setAutoSyncWithTimer] = useState(true);
  const [autoDjMode, setAutoDjMode] = useState<'pause' | 'ducking'>(() => {
    return (localStorage.getItem('bjjcron_spotify_autodj_mode') as 'pause' | 'ducking') || 'pause';
  });
  const [skipTrackOnRound, setSkipTrackOnRound] = useState<boolean>(() => {
    return localStorage.getItem('bjjcron_spotify_autodj_skip') === 'true';
  });
  const [activeTab, setActiveTab] = useState<'curated' | 'my-playlists'>('curated');
  
  // Status & Auth state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => SpotifyService.getCustomClientId() || DEFAULT_SPOTIFY_CLIENT_ID);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [volume, setVolume] = useState<number>(80);

  const [customRedirectUri, setCustomRedirectUri] = useState(() => {
    return localStorage.getItem('bjjcron_spotify_redirect_uri') || '';
  });

  const getRedirectUri = () => {
    if (customRedirectUri.trim()) return customRedirectUri.trim();
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin.replace(/\/+$/, '');
    return `${origin}/api/spotify/callback`;
  };

  const redirectUri = getRedirectUri();

  // Check if token exists on load and fetch profile
  const checkToken = useCallback(async () => {
    const token = SpotifyService.getStoredToken();
    if (token) {
      const profile = await SpotifyService.getUserProfile();
      if (profile) {
        setUser(profile);
        const [currentPlay, playlists, devList] = await Promise.all([
          SpotifyService.getPlaybackState(),
          SpotifyService.getUserPlaylists(20),
          SpotifyService.getDevices()
        ]);
        setPlayback(currentPlay);
        setUserPlaylists(playlists);
        setDevices(devList);
        if (currentPlay?.device?.volume_percent !== undefined) {
          setVolume(currentPlay.device.volume_percent);
        }
        if (playlists.length > 0) {
          setActiveTab('my-playlists');
        }
      }
    }
  }, []);

  useEffect(() => {
    checkToken();
    const interval = setInterval(() => {
      if (user) {
        SpotifyService.getPlaybackState().then(st => {
          setPlayback(st);
          if (st?.device?.volume_percent !== undefined) {
            setVolume(st.device.volume_percent);
          }
        });
        SpotifyService.getDevices().then(setDevices);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [checkToken, user]);

  // Handle 1-Click OAuth Popup Login
  const handleConnectSpotify = async () => {
    setIsLoadingAuth(true);
    setStatusMessage('Abrindo tela oficial de login do Spotify...');

    try {
      const clientId = customClientId.trim() || DEFAULT_SPOTIFY_CLIENT_ID;
      const { authUrl } = await createSpotifyAuthUrl(clientId, redirectUri);

      const width = 520;
      const height = 720;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'spotify_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        setStatusMessage('Por favor, permita popups no seu navegador para fazer login.');
        setIsLoadingAuth(false);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erro ao iniciar login com Spotify.');
      setIsLoadingAuth(false);
    }
  };

  // Listen for OAuth message from Popup
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_CODE' && event.data?.code) {
        setStatusMessage('Autenticando e conectando sua conta Spotify...');
        const clientId = customClientId.trim() || DEFAULT_SPOTIFY_CLIENT_ID;
        
        let tokenData = await exchangeSpotifyCodeForToken(event.data.code, clientId, redirectUri);
        
        // Fallback to server exchange endpoint if direct client exchange is blocked
        if (!tokenData?.accessToken) {
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
              tokenData = {
                accessToken: data.access_token,
                expiresIn: data.expires_in || 3600,
                refreshToken: data.refresh_token
              };
            }
          } catch (e) {
            console.error('Server exchange fallback failed:', e);
          }
        }

        if (tokenData?.accessToken) {
          SpotifyService.setToken(tokenData.accessToken, tokenData.expiresIn || 3600, tokenData.refreshToken);
          setStatusMessage('✅ Spotify conectado com sucesso!');
          setIsLoadingAuth(false);
          await checkToken();
          setTimeout(() => setStatusMessage(null), 3000);
        } else {
          setStatusMessage('Não foi possível obter o token do Spotify. Verifique as configurações de Client ID.');
          setIsLoadingAuth(false);
        }
      } else if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS' && event.data?.accessToken) {
        SpotifyService.setToken(event.data.accessToken, event.data.expiresIn || 3600);
        setStatusMessage('✅ Spotify conectado com sucesso!');
        setIsLoadingAuth(false);
        await checkToken();
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        setStatusMessage(`Erro de login: ${event.data.error}`);
        setIsLoadingAuth(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [checkToken, customClientId, redirectUri]);

  // Handle Auto-Sync with Timer
  const wasRunningRef = useRef(isTimerRunning);
  const wasRestingRef = useRef(isResting);

  const triggerAutoDjSync = useCallback((forcePlay?: boolean) => {
    if (!user) return;

    if (forcePlay || (isTimerRunning && !isResting)) {
      if (skipTrackOnRound) {
        SpotifyService.nextTrack();
      }
      if (autoDjMode === 'ducking') {
        SpotifyService.setVolume(100);
      }
      SpotifyService.play(selectedPlaylistUri).then(ok => {
        setStatusMessage(ok ? '🥋 Auto-DJ: Música iniciada para o Rola!' : '▶️ Enviado comando ao Spotify');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    } else if (isTimerRunning && isResting) {
      if (autoDjMode === 'ducking') {
        SpotifyService.setVolume(20).then(() => {
          setStatusMessage('🔉 Auto-DJ: Volume reduzido para 20% no descanso.');
          setTimeout(() => setStatusMessage(null), 2500);
        });
      } else {
        SpotifyService.pause().then(ok => {
          setStatusMessage(ok ? '⏸️ Auto-DJ: Música pausada para o descanso.' : '⏸️ Música em pausa');
          setTimeout(() => setStatusMessage(null), 2500);
        });
      }
    } else {
      SpotifyService.pause().then(() => {
        setStatusMessage('⏸️ Auto-DJ: Cronômetro pausado, som pausado.');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    }
  }, [user, isTimerRunning, isResting, skipTrackOnRound, autoDjMode, selectedPlaylistUri]);

  useEffect(() => {
    if (!autoSyncWithTimer || !user) {
      wasRunningRef.current = isTimerRunning;
      wasRestingRef.current = isResting;
      return;
    }

    const isRunning = isTimerRunning;
    const wasRunning = wasRunningRef.current;
    const isRest = isResting;
    const wasRest = wasRestingRef.current;

    if (isRunning && !wasRunning && !isRest) {
      triggerAutoDjSync();
    } else if (isRunning && wasRest && !isRest) {
      triggerAutoDjSync();
    } else if (isRunning && !wasRest && isRest) {
      triggerAutoDjSync();
    } else if (!isRunning && wasRunning) {
      SpotifyService.pause().then(() => {
        setStatusMessage('⏸️ Auto-DJ: Cronômetro pausado.');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    }

    wasRunningRef.current = isRunning;
    wasRestingRef.current = isRest;
  }, [isTimerRunning, isResting, autoSyncWithTimer, user, triggerAutoDjSync]);

  const handleSelectPlaylist = (uri: string) => {
    setSelectedPlaylistUri(uri);
    localStorage.setItem('bjjcron_spotify_selected_uri', uri);
    if (user) {
      SpotifyService.play(uri).then(() => {
        setTimeout(() => SpotifyService.getPlaybackState().then(setPlayback), 800);
      });
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    let clean = customInputUrl.trim();
    if (clean.includes('open.spotify.com/playlist/')) {
      const id = clean.split('open.spotify.com/playlist/')[1].split('?')[0];
      clean = `spotify:playlist:${id}`;
    } else if (clean.includes('open.spotify.com/album/')) {
      const id = clean.split('open.spotify.com/album/')[1].split('?')[0];
      clean = `spotify:album:${id}`;
    } else if (clean.includes('open.spotify.com/artist/')) {
      const id = clean.split('open.spotify.com/artist/')[1].split('?')[0];
      clean = `spotify:artist:${id}`;
    } else if (!clean.startsWith('spotify:')) {
      clean = `spotify:playlist:${clean}`;
    }

    if (clean) {
      setSelectedPlaylistUri(clean);
      localStorage.setItem('bjjcron_spotify_selected_uri', clean);
      setCustomInputUrl('');
      if (user) {
        SpotifyService.play(clean);
      }
      setStatusMessage('✅ Playlist carregada e pronta para tocar!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleTogglePlay = async () => {
    if (!user) return;
    if (playback?.is_playing) {
      await SpotifyService.pause();
    } else {
      await SpotifyService.play(selectedPlaylistUri);
    }
    setTimeout(async () => {
      const st = await SpotifyService.getPlaybackState();
      setPlayback(st);
    }, 600);
  };

  const handleNext = async () => {
    if (!user) return;
    await SpotifyService.nextTrack();
    setTimeout(async () => {
      const st = await SpotifyService.getPlaybackState();
      setPlayback(st);
    }, 600);
  };

  const handlePrevious = async () => {
    if (!user) return;
    await SpotifyService.previousTrack();
    setTimeout(async () => {
      const st = await SpotifyService.getPlaybackState();
      setPlayback(st);
    }, 600);
  };

  const handleVolumeChange = async (newVol: number) => {
    setVolume(newVol);
    if (user) {
      await SpotifyService.setVolume(newVol);
    }
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setUserPlaylists([]);
    setDevices([]);
    setActiveTab('curated');
    setStatusMessage('Spotify desconectado.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClientId.trim()) {
      SpotifyService.setCustomClientId(customClientId.trim());
      setCustomClientId(customClientId.trim());
    }
    if (customTokenInput.trim()) {
      SpotifyService.setToken(customTokenInput.trim(), 3600);
      setCustomTokenInput('');
      checkToken();
    }
    setShowConfigModal(false);
    setStatusMessage('Configurações salvas com sucesso!');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const copyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div id="spotify-tatame-player-container" className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-2xl space-y-5">
      {/* Header & Status Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className={`w-6 h-6 text-emerald-400 ${playback?.is_playing ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Spotify do Tatame</span>
              </h4>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span>{user ? 'Auto-DJ Conectado' : 'Aguardando Conexão'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sincronização musical inteligente: toca nos rounds e pausa/abaixa o som nos descansos.
            </p>
          </div>
        </div>

        {/* Top Right Controls & Config */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-1.5 pr-3">
              {user.images?.[0]?.url ? (
                <img src={user.images[0].url} alt={user.display_name} className="w-7 h-7 rounded-xl object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                  {user.display_name?.charAt(0) || 'S'}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">{user.display_name}</p>
                <span className="text-[9px] uppercase font-mono text-emerald-400">{user.product || 'Conectado'}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="ml-2 p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800"
                title="Desconectar conta Spotify"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectSpotify}
              disabled={isLoadingAuth}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isLoadingAuth ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>Entrar com Spotify</span>
            </button>
          )}

          <button
            onClick={() => setShowConfigModal(true)}
            title="Configurações avançadas do Spotify"
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center gap-2.5 animate-fadeIn shadow-lg">
          <Zap className="w-4 h-4 shrink-0 text-emerald-400 fill-current" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {!user ? (
        /* DISCONNECTED STATE: PROMINENT LOGIN HERO */
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-950/50">
            <Music className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-white">Conecte sua Conta Spotify</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Faça login para controlar as músicas do tatame pelo cronômetro. O som começa automaticamente no início do rola e diminui ou pausa no descanso.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleConnectSpotify}
              disabled={isLoadingAuth}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black rounded-2xl shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoadingAuth ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              <span>Fazer Login com Spotify</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Configurar Client ID / Token</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-2xl mx-auto text-left">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <span className="text-base mb-1 block">🥋</span>
              <h5 className="text-xs font-bold text-white">Modo Auto-DJ</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Sincronizado automaticamente com o apito e rounds do tatame.</p>
            </div>
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <span className="text-base mb-1 block">📱</span>
              <h5 className="text-xs font-bold text-white">Controle Multi-Dispositivo</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Toca na caixa de som, na TV da academia, Alexa ou no computador.</p>
            </div>
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <span className="text-base mb-1 block">⚡</span>
              <h5 className="text-xs font-bold text-white">Playlists de Combate</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Acesse suas playlists próprias ou use seleções de Jiu-Jitsu e Phonk.</p>
            </div>
          </div>
        </div>
      ) : (
        /* CONNECTED STATE: INTERACTIVE MUSIC PLAYER & CONTROLS */
        <div className="space-y-5">
          {/* Active Track Card */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              {playback?.item?.album?.images?.[0]?.url ? (
                <img 
                  src={playback.item.album.images[0].url} 
                  alt={playback.item.name} 
                  className="w-20 h-20 rounded-2xl shadow-xl border border-slate-700 object-cover shrink-0" 
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                  <Music className="w-8 h-8 text-emerald-400" />
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${playback?.is_playing ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {playback?.is_playing ? 'Tocando no Tatame' : 'Em Pausa'}
                  </span>
                </div>
                <h4 className="text-base font-black text-white truncate max-w-[280px] sm:max-w-md">
                  {playback?.item?.name || 'Selecione uma playlist para iniciar'}
                </h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {playback?.item?.artists?.map(a => a.name).join(', ') || 'Spotify conectado e pronto'}
                </p>
                {playback?.device && (
                  <p className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    <span>Dispositivo: {playback.device.name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex flex-col items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Faixa anterior"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-xl shadow-emerald-500/20 font-black cursor-pointer hover:scale-105 active:scale-95"
                  title={playback?.is_playing ? 'Pausar' : 'Tocar'}
                >
                  {playback?.is_playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Próxima faixa"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <Volume1 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{volume}%</span>
              </div>
            </div>
          </div>

          {/* Auto-DJ Settings & Fine Tuning */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-3xl p-4">
            <div className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">Auto-DJ Sincronizado</p>
                <p className="text-[10px] text-slate-400">Controla com o cronômetro</p>
              </div>
              <input
                type="checkbox"
                checked={autoSyncWithTimer}
                onChange={e => setAutoSyncWithTimer(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">No Descanso</p>
                <p className="text-[10px] text-slate-400">{autoDjMode === 'pause' ? 'Pausar música' : 'Abaixar volume (20%)'}</p>
              </div>
              <button
                onClick={() => {
                  const nextMode = autoDjMode === 'pause' ? 'ducking' : 'pause';
                  setAutoDjMode(nextMode);
                  localStorage.setItem('bjjcron_spotify_autodj_mode', nextMode);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-emerald-400 border border-slate-700 cursor-pointer"
              >
                {autoDjMode === 'pause' ? 'Pausar' : 'Abaixar'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">Trocar Música no Round</p>
                <p className="text-[10px] text-slate-400">Pula faixa ao iniciar rola</p>
              </div>
              <input
                type="checkbox"
                checked={skipTrackOnRound}
                onChange={e => {
                  setSkipTrackOnRound(e.target.checked);
                  localStorage.setItem('bjjcron_spotify_autodj_skip', String(e.target.checked));
                }}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Playlists Selector: Curated vs User's Own Playlists */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('curated')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'curated' 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🥋 Playlists Recomendadas
                </button>
                <button
                  onClick={() => setActiveTab('my-playlists')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'my-playlists' 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎵 Minhas Playlists ({userPlaylists.length})
                </button>
              </div>
              <span className="text-[11px] text-slate-500">Clique para tocar</span>
            </div>

            {activeTab === 'curated' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {CURATED_PLAYLISTS.map(pl => {
                  const isSelected = selectedPlaylistUri === pl.uri;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl.uri)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/95 border-emerald-500 shadow-lg shadow-emerald-950/40 scale-[1.02]'
                          : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-2xl mb-1.5">{pl.icon}</div>
                        <p className="text-xs font-black text-white truncate">{pl.name}</p>
                        <span className="text-[10px] text-emerald-400 block mt-0.5">{pl.category}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{pl.description}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {userPlaylists.map(pl => {
                  const isSelected = selectedPlaylistUri === pl.uri;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl.uri)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/95 border-emerald-500 shadow-lg text-white'
                          : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      {pl.images?.[0]?.url ? (
                        <img src={pl.images[0].url} alt={pl.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                          <ListMusic className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                        <span className="text-[10px] text-slate-400">{pl.tracks?.total || 0} faixas</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Spotify URL Bar */}
            <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center pt-2">
              <input
                type="text"
                placeholder="Ou cole o link de qualquer Playlist do Spotify (ex: https://open.spotify.com/playlist/...)"
                value={customInputUrl}
                onChange={e => setCustomInputUrl(e.target.value)}
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Carregar e Tocar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configurações do Spotify */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Configurações da Conexão Spotify
              </h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                URI de Redirecionamento (Redirect URI):
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cadastre exatamente esta URL no seu aplicativo no Spotify Developer Dashboard se estiver usando Client ID próprio:
              </p>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <code className="text-[11px] text-emerald-300 font-mono flex-1 truncate">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={copyRedirect}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedRedirect ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Spotify Client ID:
                </label>
                <input
                  type="text"
                  placeholder="Client ID..."
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Token de Acesso Manual (Opcional):
                </label>
                <input
                  type="password"
                  placeholder="Cole um Access Token gerado no Spotify Console..."
                  value={customTokenInput}
                  onChange={e => setCustomTokenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
