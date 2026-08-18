import React, { useState } from 'react';
import { 
  Music, 
  Disc, 
  Plus, 
  ExternalLink,
  Flame,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface CuratedPlaylist {
  id: string;
  name: string;
  category: string;
  embedId: string;
  icon: string;
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'hiphop',
    name: 'BJJ Rolling — Hip-Hop & Rap',
    category: 'Hip-Hop / Sparring',
    embedId: '37i9dQZF1DX0XUsuxWHRQd',
    icon: '🥋'
  },
  {
    id: 'phonk',
    name: 'Gym Phonk & Combate',
    category: 'Phonk / Alta Intensidade',
    embedId: '37i9dQZF1DWZjqjZMudx9T',
    icon: '🔥'
  },
  {
    id: 'rock',
    name: 'Hard Rock Tatame',
    category: 'Rock / Heavy',
    embedId: '37i9dQZF1DX9qNs32fujYe',
    icon: '⚡'
  },
  {
    id: 'flow',
    name: 'Flow Roll & Drill (Lo-Fi)',
    category: 'Lo-Fi / Técnico',
    embedId: '37i9dQZF1DXdLEN7aqioXM',
    icon: '🧘'
  }
];

interface SpotifyTatamePlayerProps {
  isTimerRunning?: boolean;
  isResting?: boolean;
}

export const SpotifyTatamePlayer: React.FC<SpotifyTatamePlayerProps> = () => {
  const [embedPlaylistId, setEmbedPlaylistId] = useState<string>(() => {
    return localStorage.getItem('bjjcron_spotify_embed_id') || '37i9dQZF1DX0XUsuxWHRQd';
  });
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('bjjcron_spotify_expanded') === 'true';
  });

  const handleSelectPlaylist = (embedId: string) => {
    setEmbedPlaylistId(embedId);
    localStorage.setItem('bjjcron_spotify_embed_id', embedId);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;

    const url = customInputUrl.trim();
    const playlistMatch = url.match(/playlist[\/:]([a-zA-Z0-9]+)/);
    const trackMatch = url.match(/track[\/:]([a-zA-Z0-9]+)/);
    const albumMatch = url.match(/album[\/:]([a-zA-Z0-9]+)/);

    let embedId = '';

    if (playlistMatch && playlistMatch[1]) {
      embedId = playlistMatch[1];
    } else if (trackMatch && trackMatch[1]) {
      embedId = `track/${trackMatch[1]}`;
    } else if (albumMatch && albumMatch[1]) {
      embedId = `album/${albumMatch[1]}`;
    } else if (url.startsWith('spotify:')) {
      embedId = url.split(':').pop() || '';
    }

    if (embedId) {
      handleSelectPlaylist(embedId);
      setCustomInputUrl('');
    } else {
      alert('Link do Spotify inválido. Por favor, cole uma URL como: https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd');
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev;
      localStorage.setItem('bjjcron_spotify_expanded', String(next));
      return next;
    });
  };

  const embedSrc = embedPlaylistId.includes('album/') || embedPlaylistId.includes('track/')
    ? `https://open.spotify.com/embed/${embedPlaylistId}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/playlist/${embedPlaylistId}?utm_source=generator&theme=0`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white space-y-3.5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Spotify do Tatame
            </h3>
            <p className="text-[11px] text-slate-400">
              Player oficial do Spotify integrado ao cronômetro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleExpanded}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title={isExpanded ? "Modo compacto" : "Ver lista de músicas"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compacto</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expandir Lista</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Playlist Quick Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CURATED_PLAYLISTS.map(pl => {
          const isSelected = embedPlaylistId === pl.embedId;
          return (
            <button
              key={pl.id}
              onClick={() => handleSelectPlaylist(pl.embedId)}
              className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-xs'
                  : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-xl shrink-0">{pl.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-white">{pl.name}</p>
                <p className="text-[10px] text-emerald-400 truncate">{pl.category}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Spotify Link Input */}
      <form onSubmit={handleApplyCustomUrl} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Ou cole o link de qualquer Playlist do Spotify..."
          value={customInputUrl}
          onChange={e => setCustomInputUrl(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Carregar</span>
        </button>
      </form>

      {/* Official Spotify Web Player Embed */}
      <div className="bg-slate-950 rounded-2xl p-1.5 border border-slate-800 overflow-hidden shadow-inner">
        <iframe
          src={embedSrc}
          width="100%"
          height={isExpanded ? "352" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl transition-all duration-300"
          title="Spotify Tatame Web Player"
        />
      </div>
    </div>
  );
};
