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
  ListMusic
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
  embedUri: string;
  icon: string;
  description: string;
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'hiphop',
    name: 'BJJ Rolling - Hip-Hop & Rap',
    category: 'Hip-Hop / Sparring',
    embedUri: 'playlist/37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'phonk',
    name: 'Gym Phonk & Electronic Energy',
    category: 'Phonk / Combate',
    embedUri: 'playlist/37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥',
    description: 'Gás máximo e ritmo acelerado para o tatame.'
  },
  {
    id: 'rock',
    name: 'Hard Rock & Metal Tatame',
    category: 'Rock / Heavy',
    embedUri: 'playlist/37i9dQZF1DX9qNs32fujYe',
    icon: '⚡',
    description: 'Rounds intensos sem descanso ao som de guitarras pesadas.'
  },
  {
    id: 'flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi / Treino Técnico',
    embedUri: 'playlist/37i9dQZF1DXdLEN7aqioXM',
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
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_selected') || 'playlist/37i9dQZF1DX0XUsuxWHRQd';
  });
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customAddedMessage, setCustomAddedMessage] = useState(false);
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
        const [currentPlay, playlists] = await Promise.all([
          SpotifyService.getPlaybackState(),
          SpotifyService.getUserPlaylists(20)
        ]);
        setPlayback(currentPlay);
        setUserPlaylists(playlists);
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
        SpotifyService.getPlaybackState().then(setPlayback);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [checkToken, user]);

  // Handle 1-Click OAuth Popup Login (Identical UX to GitHub Login)
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
          setStatusMessage('Não foi possível obter o token do Spotify.');
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

  // Handle Auto-Sync with Timer (Precise state transition tracker)
  const wasRunningRef = useRef(isTimerRunning);
  const wasRestingRef = useRef(isResting);

  // Manual instant sync trigger
  const triggerAutoDjSync = useCallback((forcePlay?: boolean) => {
    if (!user) {
      setStatusMessage('ℹ️ Conecte o Spotify para controlar a reprodução automática.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (forcePlay || (isTimerRunning && !isResting)) {
      if (skipTrackOnRound) {
        SpotifyService.nextTrack();
      }
      if (autoDjMode === 'ducking') {
        SpotifyService.setVolume(100);
      }
      const formattedUri = selectedPlaylistUri.startsWith('spotify:') || selectedPlaylistUri.startsWith('http') 
        ? selectedPlaylistUri 
        : `spotify:${selectedPlaylistUri.replace('/', ':')}`;
      
      SpotifyService.play(formattedUri).then(ok => {
        setStatusMessage(ok ? '🥋 Auto-DJ: Música iniciada para o Rola!' : '▶️ Enviado comando de reprodução ao Spotify');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    } else if (isTimerRunning && isResting) {
      if (autoDjMode === 'ducking') {
        SpotifyService.setVolume(20).then(() => {
          setStatusMessage('🔉 Auto-DJ: Volume reduzido para 20% durante o descanso.');
          setTimeout(() => setStatusMessage(null), 2500);
        });
      } else {
        SpotifyService.pause().then(ok => {
          setStatusMessage(ok ? '⏸️ Auto-DJ: Música pausada para o descanso.' : '⏸️ Música em pausa');
          setTimeout(() => setStatusMessage(null), 2500);
        });
      }
    } else {
      // Cronômetro pausado
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

    // Caso 1: Cronômetro acabou de ser iniciado (Start / Resume no Round de Luta)
    if (isRunning && !wasRunning && !isRest) {
      triggerAutoDjSync();
    }
    // Caso 2: Transição de Descanso -> Novo Round de Luta
    else if (isRunning && wasRest && !isRest) {
      triggerAutoDjSync();
    }
    // Caso 3: Transição de Round de Luta -> Descanso (durante a contagem)
    else if (isRunning && !wasRest && isRest) {
      triggerAutoDjSync();
    }
    // Caso 4: Cronômetro pausado manualmente ou finalizado
    else if (!isRunning && wasRunning) {
      SpotifyService.pause().then(() => {
        setStatusMessage('⏸️ Auto-DJ: Cronômetro pausado.');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    }

    wasRunningRef.current = isRunning;
    wasRestingRef.current = isRest;
  }, [isTimerRunning, isResting, autoSyncWithTimer, user, triggerAutoDjSync]);

  // Handle Playlists selection
  const handleSelectPlaylist = (uri: string) => {
    setSelectedPlaylistUri(uri);
    localStorage.setItem('bjjcron_spotify_selected', uri);
    if (user) {
      const formattedUri = uri.startsWith('spotify:') || uri.startsWith('http') ? uri : `spotify:${uri.replace('/', ':')}`;
      SpotifyService.play(formattedUri);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    let clean = customInputUrl.trim();
    if (clean.includes('open.spotify.com/')) {
      const parts = clean.split('open.spotify.com/')[1].split('?')[0];
      clean = parts;
    } else if (clean.startsWith('spotify:')) {
      clean = clean.replace('spotify:', '').replace(/:/g, '/');
    }

    if (clean) {
      setSelectedPlaylistUri(clean);
      localStorage.setItem('bjjcron_spotify_selected', clean);
      setCustomAddedMessage(true);
      setCustomInputUrl('');
      setTimeout(() => setCustomAddedMessage(false), 3000);
    }
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setUserPlaylists([]);
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

  const spotifyEmbedSrc = `https://open.spotify.com/embed/${selectedPlaylistUri}?utm_source=generator&theme=0`;

  return (
    <div id="spotify-tatame-player-container" className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-4">
      {/* Sleek Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className="w-5 h-5 animate-spin-slow text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Spotify do Tatame</span>
              </h4>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{autoSyncWithTimer ? 'Auto-DJ Ativo' : 'Player Integrado'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isTimerRunning 
                ? (isResting ? '🧘 Intervalo / Descanso' : '🥋 Rola em andamento') 
                : 'Selecione uma playlist para tocar durante os treinos'}
            </p>
          </div>
        </div>

        {/* Quick Playlist Selector Pills & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {CURATED_PLAYLISTS.slice(0, 4).map(pl => {
            const isSelected = selectedPlaylistUri === pl.embedUri;
            return (
              <button
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl.embedUri)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black shadow-emerald-500/20 scale-105'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{pl.icon}</span>
                <span>{pl.name}</span>
              </button>
            );
          })}

          <a
            href={`https://open.spotify.com/${selectedPlaylistUri}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl border border-slate-700 transition-all text-xs font-bold flex items-center gap-1"
            title="Abrir no Aplicativo do Spotify"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => setShowConfigModal(true)}
            title="Configurações e personalização"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn shadow-lg">
          <Zap className="w-3.5 h-3.5 shrink-0 text-emerald-400 fill-current" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Main Spotify Player Embed */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <iframe
          src={spotifyEmbedSrc}
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Tatame Player"
          className="w-full"
        />
      </div>

      {/* Subtle Custom Link Bar */}
      <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center pt-1">
        <input
          type="text"
          placeholder="Ou cole o link de qualquer Playlist do Spotify..."
          value={customInputUrl}
          onChange={e => setCustomInputUrl(e.target.value)}
          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Carregar</span>
        </button>
      </form>

      {customAddedMessage && (
        <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fadeIn">
          <Check className="w-3.5 h-3.5" /> Playlist personalizada carregada com sucesso!
        </p>
      )}

      {/* Modal de Configurações & Diagnóstico */}
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
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                URI de Redirecionamento Atual:
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Esta é a URL exata que o sistema está enviando para o Spotify:
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
                  Redirect URI Personalizada (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Deixe em branco para usar o automático..."
                  value={customRedirectUri}
                  onChange={e => {
                    setCustomRedirectUri(e.target.value);
                    localStorage.setItem('bjjcron_spotify_redirect_uri', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
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
