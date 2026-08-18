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
  const [activeTab, setActiveTab] = useState<'curated' | 'my-playlists'>('curated');
  
  // Status & Auth state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => SpotifyService.getCustomClientId() || DEFAULT_SPOTIFY_CLIENT_ID);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/spotify/callback` 
    : '';

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

  // Handle Auto-Sync with Timer
  const wasRunningRef = useRef(isTimerRunning);
  useEffect(() => {
    if (!autoSyncWithTimer || !user) return;

    if (isTimerRunning && !wasRunningRef.current) {
      SpotifyService.play().then(ok => {
        if (ok) setStatusMessage('▶️ Música sincronizada com o início do round!');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    } else if (!isTimerRunning && wasRunningRef.current && isResting) {
      SpotifyService.pause().then(ok => {
        if (ok) setStatusMessage('⏸️ Música pausada para o descanso.');
        setTimeout(() => setStatusMessage(null), 2500);
      });
    }
    wasRunningRef.current = isTimerRunning;
  }, [isTimerRunning, isResting, autoSyncWithTimer, user]);

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
    <div id="spotify-tatame-player-container" className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className="w-6 h-6 animate-spin-slow text-emerald-400" />
          </div>
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>Spotify do Tatame</span>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {user ? `Conectado (${user.display_name})` : 'Player Integrado'}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Controle o som dos treinos e rolas direto no tatame em sincronia com o cronômetro.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-auto-dj-button"
            onClick={() => setAutoSyncWithTimer(!autoSyncWithTimer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              autoSyncWithTimer
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Sincronizar música com início e fim dos rounds"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-DJ: {autoSyncWithTimer ? 'LIGADO' : 'DESLIGADO'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                {user.images?.[0]?.url ? (
                  <img src={user.images[0].url} alt={user.display_name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <Headphones className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-bold max-w-[120px] truncate">{user.display_name}</span>
                {user.product === 'premium' && (
                  <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">PREMIUM</span>
                )}
              </div>
              <button
                id="spotify-logout-button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Desconectar conta Spotify"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <button
              id="spotify-login-button"
              onClick={handleConnectSpotify}
              disabled={isLoadingAuth}
              className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 cursor-pointer hover:shadow-emerald-500/40"
            >
              {isLoadingAuth ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.216.354-.675.466-1.029.25-2.822-1.724-6.374-2.114-10.558-1.158-.403.093-.807-.16-.9-.562-.093-.404.16-.808.562-.901 4.577-1.047 8.508-.604 11.675 1.341.354.217.466.676.25 1.03zm1.47-3.268c-.272.443-.854.584-1.297.312-3.23-1.986-8.156-2.56-11.978-1.4-1.498.15-2.001-.225-2.152-.723-.15-.498.225-1.002.723-1.152 4.37-1.327 9.803-.687 13.492 1.58.443.272.584.854.312 1.297v.086zm.126-3.41c-3.873-2.3-10.264-2.512-13.978-1.384-.593.18-1.222-.16-1.402-.754-.18-.593.16-1.222.754-1.402 4.268-1.296 11.317-1.054 15.782 1.597.533.316.707 1.005.391 1.538-.316.533-1.005.707-1.538.391l-.009.014z" />
                  </svg>
                  <span>Entrar com Spotify</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <Zap className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs: Playlists Recomendadas vs Minhas Playlists do Spotify */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('curated')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'curated'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>Playlists do Tatame</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('my-playlists')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'my-playlists'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Minhas Playlists ({userPlaylists.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Curated Playlists */}
        {activeTab === 'curated' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {CURATED_PLAYLISTS.map(pl => {
              const isSelected = selectedPlaylistUri === pl.embedUri;
              return (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl.embedUri)}
                  className={`p-3 rounded-2xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-950/60'
                      : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{pl.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold block">{pl.category}</span>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{pl.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: User's Actual Spotify Playlists */}
        {activeTab === 'my-playlists' && user && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {userPlaylists.map(pl => {
              const uri = `playlist/${pl.id}`;
              const isSelected = selectedPlaylistUri === uri || selectedPlaylistUri.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(uri)}
                  className={`p-2.5 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt={pl.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                    <span className="text-[10px] text-slate-400">{pl.tracks?.total || 0} músicas</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Playlist URL Input */}
      <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Cole o link de qualquer Playlist ou Álbum do Spotify da sua academia..."
          value={customInputUrl}
          onChange={e => setCustomInputUrl(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Carregar</span>
        </button>
      </form>

      {customAddedMessage && (
        <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
          <Check className="w-3.5 h-3.5" /> Playlist personalizada carregada com sucesso no tatame!
        </p>
      )}

      {/* Real Spotify Interactive Embed Frame */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Player Spotify Ativo no Tatame
          </span>
          <a
            href={`https://open.spotify.com/${selectedPlaylistUri}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-bold"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir no Spotify App</span>
          </a>
        </div>

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
    </div>
  );
};
