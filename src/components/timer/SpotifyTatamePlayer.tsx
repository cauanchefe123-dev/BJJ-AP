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
  Sparkles,
  HelpCircle,
  X
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
  embedId: string;
  icon: string;
  description: string;
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'hiphop',
    name: 'BJJ Rolling — Hip-Hop & Rap',
    category: 'Hip-Hop / Sparring',
    uri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    embedId: '37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'phonk',
    name: 'Gym Phonk & Electronic Energy',
    category: 'Phonk / Combate',
    uri: 'spotify:playlist:37i9dQZF1DWZjqjZMudx9T',
    embedId: '37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥',
    description: 'Gás máximo e ritmo acelerado para o tatame.'
  },
  {
    id: 'rock',
    name: 'Hard Rock & Metal Tatame',
    category: 'Rock / Heavy',
    uri: 'spotify:playlist:37i9dQZF1DX9qNs32fujYe',
    embedId: '37i9dQZF1DX9qNs32fujYe',
    icon: '⚡',
    description: 'Rounds intensos sem descanso ao som de guitarras pesadas.'
  },
  {
    id: 'flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi / Treino Técnico',
    uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM',
    embedId: '37i9dQZF1DXdLEN7aqioXM',
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
  const [embedPlaylistId, setEmbedPlaylistId] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_embed_id') || '37i9dQZF1DX0XUsuxWHRQd';
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
  const [playerMode, setPlayerMode] = useState<'embed' | 'remote'>(() => {
    return (localStorage.getItem('bjjcron_spotify_view_mode') as 'embed' | 'remote') || 'embed';
  });
  
  // Status & Auth state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRedirectHelp, setShowRedirectHelp] = useState(false);
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

  // Listen for OAuth message from Popup or SPA redirect
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
          setStatusMessage('Não foi possível obter o token do Spotify. Verifique as configurações.');
          setIsLoadingAuth(false);
        }
      } else if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS' && event.data?.accessToken) {
        SpotifyService.setToken(event.data.accessToken, event.data.expiresIn || 3600);
        setStatusMessage('✅ Spotify conectado com sucesso!');
        setIsLoadingAuth(false);
        await checkToken();
        setTimeout(() => setStatusMessage(null), 3000);
      } else if (event.data?.type === 'SPOTIFY_AUTH_ERROR') {
        setStatusMessage(`Aviso: ${event.data.error}`);
        setIsLoadingAuth(false);
        setShowRedirectHelp(true);
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
    if (!autoSyncWithTimer || !user) return;

    const runningChanged = wasRunningRef.current !== isTimerRunning;
    const restingChanged = wasRestingRef.current !== isResting;

    if (runningChanged || restingChanged) {
      triggerAutoDjSync();
    }

    wasRunningRef.current = isTimerRunning;
    wasRestingRef.current = isResting;
  }, [isTimerRunning, isResting, autoSyncWithTimer, user, triggerAutoDjSync]);

  const handleSelectPlaylist = (uri: string, embedId?: string) => {
    setSelectedPlaylistUri(uri);
    localStorage.setItem('bjjcron_spotify_selected_uri', uri);
    
    if (embedId) {
      setEmbedPlaylistId(embedId);
      localStorage.setItem('bjjcron_spotify_embed_id', embedId);
    } else {
      // Extract from URI
      const match = uri.match(/spotify:playlist:([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        setEmbedPlaylistId(match[1]);
        localStorage.setItem('bjjcron_spotify_embed_id', match[1]);
      }
    }

    if (user) {
      SpotifyService.play(uri).then(ok => {
        if (ok) {
          setStatusMessage('▶️ Reproduzindo no Spotify!');
          setTimeout(() => setStatusMessage(null), 2000);
        }
      });
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    const url = customInputUrl.trim();
    // Support open.spotify.com/playlist/ID or spotify:playlist:ID or album/track
    const playlistMatch = url.match(/playlist[\/:]([a-zA-Z0-9]+)/);
    const trackMatch = url.match(/track[\/:]([a-zA-Z0-9]+)/);
    const albumMatch = url.match(/album[\/:]([a-zA-Z0-9]+)/);

    let uri = '';
    let embedId = '';

    if (playlistMatch && playlistMatch[1]) {
      uri = `spotify:playlist:${playlistMatch[1]}`;
      embedId = playlistMatch[1];
    } else if (trackMatch && trackMatch[1]) {
      uri = `spotify:track:${trackMatch[1]}`;
      embedId = trackMatch[1];
    } else if (albumMatch && albumMatch[1]) {
      uri = `spotify:album:${albumMatch[1]}`;
      embedId = albumMatch[1];
    } else if (url.startsWith('spotify:')) {
      uri = url;
      embedId = url.split(':').pop() || '';
    }

    if (uri) {
      handleSelectPlaylist(uri, embedId);
      setCustomInputUrl('');
      setStatusMessage('Playlist carregada!');
      setTimeout(() => setStatusMessage(null), 2000);
    } else {
      alert('Link do Spotify inválido. Por favor, cole uma URL como: https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd');
    }
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setUserPlaylists([]);
    setStatusMessage('Desconectado do Spotify.');
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClientId.trim()) {
      SpotifyService.setCustomClientId(customClientId.trim());
    }
    if (customRedirectUri.trim()) {
      localStorage.setItem('bjjcron_spotify_redirect_uri', customRedirectUri.trim());
    } else {
      localStorage.removeItem('bjjcron_spotify_redirect_uri');
    }
    if (customTokenInput.trim()) {
      SpotifyService.setToken(customTokenInput.trim(), 3600);
      checkToken();
    }
    setShowConfigModal(false);
    setShowRedirectHelp(false);
    setStatusMessage('Configurações salvas!');
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const copyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-100 flex items-center gap-2">
                Spotify Tatame Player
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                {user ? 'Auto-DJ Ativo' : 'Player Web'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trilha sonora para o treino e controle sincronizado ao cronômetro do tatame.
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl">
                {user.images?.[0]?.url ? (
                  <img src={user.images[0].url} alt={user.display_name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <Headphones className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user.display_name}</span>
                {user.product === 'premium' && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-black">
                    PREMIUM
                  </span>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 transition-all cursor-pointer"
                title="Desconectar Spotify"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnectSpotify}
                disabled={isLoadingAuth}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoadingAuth ? 'Conectando...' : 'Fazer Login com Spotify'}</span>
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                title="Configurar Client ID / Token"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Redirect URI Help Banner (Shown when OAuth gives config mismatch or requested) */}
      {showRedirectHelp && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-white space-y-3 animate-fade-in relative">
          <button
            onClick={() => setShowRedirectHelp(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold text-xs text-amber-300">
                Aviso de "Configuração não corresponde" (Redirect URI)
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                O Spotify exige que a URL deste aplicativo esteja cadastrada em <strong>Redirect URIs</strong> no seu painel de desenvolvedor do Spotify. Você pode usar o <strong>Player Web Integrado</strong> abaixo sem login, ou cadastrar a URL:
              </p>
              <div className="flex items-center gap-2 bg-slate-950/90 p-2 rounded-xl border border-slate-800">
                <code className="text-[11px] text-emerald-300 font-mono flex-1 truncate">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={copyRedirect}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedRedirect ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status toast message */}
      {statusMessage && (
        <div className="bg-slate-950 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 animate-fade-in shadow-md">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Curated Playlists Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">Selecione o Estilo para o Tatame:</span>
          <span className="text-[11px] text-slate-400">1-Clique para Tocar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {CURATED_PLAYLISTS.map(pl => {
            const isSelected = embedPlaylistId === pl.embedId || selectedPlaylistUri === pl.uri;
            return (
              <button
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl.uri, pl.embedId)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/95 border-emerald-500 shadow-md shadow-emerald-950/40 scale-[1.02]'
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

        {/* Custom Spotify URL Bar */}
        <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center pt-1">
          <input
            type="text"
            placeholder="Cole o link de qualquer Playlist do Spotify (ex: https://open.spotify.com/playlist/...)"
            value={customInputUrl}
            onChange={e => setCustomInputUrl(e.target.value)}
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Carregar Playlist</span>
          </button>
        </form>
      </div>

      {/* Embedded Spotify Interactive Web Player (Guaranteed 100% Zero-Config Playback) */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-2.5 overflow-hidden shadow-inner">
        <iframe
          src={`https://open.spotify.com/embed/playlist/${embedPlaylistId}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl shadow-md"
          title="Spotify Tatame Web Player"
        />
      </div>

      {/* Auto-DJ Controls Bar */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Sincronização Auto-DJ com o Cronômetro</p>
            <p className="text-[11px] text-slate-400">
              {autoDjMode === 'ducking'
                ? 'Volume reduz para 20% no descanso e volta para 100% no rola.'
                : 'Pausa a música automaticamente durante os intervalos de descanso.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={autoDjMode}
            onChange={e => {
              const mode = e.target.value as 'pause' | 'ducking';
              setAutoDjMode(mode);
              localStorage.setItem('bjjcron_spotify_autodj_mode', mode);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="pause">⏸️ Pausar no Descanso</option>
            <option value="ducking">🔉 Abaixar Volume (Ducking)</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={skipTrackOnRound}
              onChange={e => {
                setSkipTrackOnRound(e.target.checked);
                localStorage.setItem('bjjcron_spotify_autodj_skip', String(e.target.checked));
              }}
              className="accent-amber-500 rounded"
            />
            <span>Pular faixa no round</span>
          </label>
        </div>
      </div>

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
