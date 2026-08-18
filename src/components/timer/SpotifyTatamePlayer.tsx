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
  ChevronDown,
  ChevronUp,
  Flame,
  Plus
} from 'lucide-react';
import { 
  SpotifyService, 
  SpotifyUser, 
  SpotifyPlaybackState, 
  SpotifyPlaylistItem 
} from '../../lib/spotifyService';

interface PlaylistOption {
  id: string;
  name: string;
  category: string;
  embedUri: string;
  spotifyUri: string;
  icon: string;
  description: string;
}

const PLAYLISTS: PlaylistOption[] = [
  {
    id: 'bjj-hiphop',
    name: 'BJJ Rolling - Hip-Hop & Boom Bap',
    category: 'Hip-Hop',
    embedUri: 'playlist/37i9dQZF1DX0XUsuxWHRQd', // Rap Workout
    spotifyUri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋',
    description: 'Batidas pesadas para rolas intensos e sparring.'
  },
  {
    id: 'bjj-rock',
    name: 'Hard Rock & Heavy Tatame',
    category: 'Rock/Metal',
    embedUri: 'playlist/37i9dQZF1DX9qNs32fujYe', // Rock Workout
    spotifyUri: 'spotify:playlist:37i9dQZF1DX9qNs32fujYe',
    icon: '⚡',
    description: 'Energia máxima para rounds sem descanso.'
  },
  {
    id: 'bjj-phonk',
    name: 'Gym Phonk & Electronic Energy',
    category: 'Phonk/Electro',
    embedUri: 'playlist/37i9dQZF1DWZjqjZMudx9T', // Phonk Workout
    spotifyUri: 'spotify:playlist:37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥',
    description: 'Gás total no tatame com graves pesados.'
  },
  {
    id: 'bjj-flow',
    name: 'Flow Roll & Drill Focus (Lo-Fi)',
    category: 'Lo-Fi/Focus',
    embedUri: 'playlist/37i9dQZF1DXdLEN7aqioXM', // Lo-Fi Beats
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
  const [selectedEmbed, setSelectedEmbed] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_embed') || 'playlist/37i9dQZF1DX0XUsuxWHRQd';
  });
  const [customUrl, setCustomUrl] = useState('');
  const [customSaved, setCustomSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoSyncWithTimer, setAutoSyncWithTimer] = useState(true);
  const [volume, setVolume] = useState(80);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(SpotifyService.getCustomClientId());
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Poll Spotify if logged in
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
        const [currentPlay, userPlaylists] = await Promise.all([
          SpotifyService.getPlaybackState(),
          SpotifyService.getUserPlaylists(10)
        ]);
        setPlayback(currentPlay);
        setPlaylists(userPlaylists);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchSpotifyData();
    const interval = setInterval(fetchSpotifyData, 5000);
    return () => clearInterval(interval);
  }, [fetchSpotifyData]);

  // Handle OAuth Popup
  const handleConnectSpotify = async () => {
    setStatusMessage('Abrindo janela de login do Spotify...');
    try {
      const clientId = customClientId.trim() || '98dc96a5b6f3458dbf436e2f1e67bfd9';
      const redirectUri = window.location.origin + '/api/spotify/callback';
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'playlist-read-private'
      ].join(' ');

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'token',
        redirect_uri: redirectUri,
        scope: scopes,
        show_dialog: 'true'
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

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
      }
    } catch (err: any) {
      setShowConfigModal(true);
    }
  };

  // Listen for OAuth message
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS' && event.data?.accessToken) {
        SpotifyService.setToken(event.data.accessToken, event.data.expiresIn || 3600);
        setStatusMessage('Conta do Spotify conectada com sucesso!');
        fetchSpotifyData();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [fetchSpotifyData]);

  const handleSelectPlaylist = (uri: string) => {
    let clean = uri;
    if (clean.startsWith('spotify:')) {
      clean = clean.replace('spotify:', '').replace(/:/g, '/');
    }
    setSelectedEmbed(clean);
    localStorage.setItem('bjjcron_spotify_embed', clean);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let clean = customUrl.trim();
    if (clean.includes('open.spotify.com/')) {
      clean = clean.split('open.spotify.com/')[1].split('?')[0];
    } else if (clean.startsWith('spotify:')) {
      clean = clean.replace('spotify:', '').replace(/:/g, '/');
    }

    if (clean) {
      handleSelectPlaylist(clean);
      setCustomSaved(true);
      setCustomUrl('');
      setTimeout(() => setCustomSaved(false), 3000);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClientId.trim()) {
      SpotifyService.setCustomClientId(customClientId.trim());
    }
    if (customTokenInput.trim()) {
      SpotifyService.setToken(customTokenInput.trim(), 3600);
      fetchSpotifyData();
    }
    setShowConfigModal(false);
    setStatusMessage('Configurações salvas!');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDisconnect = () => {
    SpotifyService.clearToken();
    setUser(null);
    setPlayback(null);
    setStatusMessage('Desconectado do Spotify.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const spotifyEmbedUrl = `https://open.spotify.com/embed/${selectedEmbed}?utm_source=generator&theme=0`;
  const spotifyDirectUrl = `https://open.spotify.com/${selectedEmbed}`;

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 text-slate-200 shadow-2xl space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Disc className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Spotify no Tatame</span>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-black">
                {user ? 'Conta Conectada' : 'Player Integrado'}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {user 
                ? `Conectado como ${user.display_name} (${user.product === 'premium' ? 'Spotify Premium' : 'Free'})` 
                : 'Música e cronômetro tocando juntos direto no navegador!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href={spotifyDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/30 rounded-lg transition-all flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no App</span>
              </a>

              <button
                onClick={() => setShowConfigModal(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                title="Configurar Conta / Token"
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

      {/* Quick Playlists Selector */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Headphones className="w-3.5 h-3.5 text-emerald-400" />
          Escolha a Playlist para o Rola:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLAYLISTS.map(item => {
            const isSelected = selectedEmbed === item.embedUri;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectPlaylist(item.embedUri)}
                className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{item.icon}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-xs font-bold truncate">{item.name}</p>
                <span className="text-[10px] text-slate-400 truncate">{item.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Playlist URL Input */}
      <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Colar link de qualquer Playlist / Álbum do Spotify da sua academia..."
          value={customUrl}
          onChange={e => setCustomUrl(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Carregar Playlist</span>
        </button>
      </form>

      {customSaved && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Playlist personalizada carregada com sucesso!
        </p>
      )}

      {/* Spotify Live Player Frame directly in the App */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative">
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Player Ativo no Tatame (Faça login no Spotify abaixo para tocar faixas completas)
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
          >
            {isExpanded ? 'Modo Compacto' : 'Expandir Músicas'}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <iframe
          src={spotifyEmbedUrl}
          width="100%"
          height={isExpanded ? "352" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Tatame Player"
          className="w-full transition-all duration-300"
        />
      </div>

      {/* Manual Configuration Modal */}
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
              O player acima já toca diretamente dentro do sistema. Se você quiser conectar sua conta via API para controle avançado de volume ou dispositivos:
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Spotify Client ID (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Seu Client ID do Spotify Developer..."
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Spotify Access Token / Bearer:
                </label>
                <input
                  type="text"
                  placeholder="Cole aqui seu Access Token se tiver..."
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
