// Spotify Integration Service for BJJCRON Tatame Player

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  product?: string; // 'premium' | 'free'
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device?: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  };
  shuffle_state?: boolean;
  repeat_state?: string;
}

export interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  uri: string;
  tracks: { total: number };
  owner: { display_name: string };
}

const SPOTIFY_TOKEN_KEY = 'bjjcron_spotify_access_token';
const SPOTIFY_REFRESH_KEY = 'bjjcron_spotify_refresh_token';
const SPOTIFY_EXPIRES_KEY = 'bjjcron_spotify_expires_at';
const SPOTIFY_CUSTOM_CLIENT_ID = 'bjjcron_spotify_client_id';

export class SpotifyService {
  private static token: string | null = null;
  private static player: any = null;
  private static deviceId: string | null = null;

  static getStoredToken(): string | null {
    if (this.token) return this.token;
    const stored = localStorage.getItem(SPOTIFY_TOKEN_KEY);
    const expiresAt = localStorage.getItem(SPOTIFY_EXPIRES_KEY);
    if (stored && expiresAt && Number(expiresAt) > Date.now()) {
      this.token = stored;
      return stored;
    }
    return null;
  }

  static setToken(token: string, expiresInSeconds = 3600, refreshToken?: string) {
    this.token = token;
    localStorage.setItem(SPOTIFY_TOKEN_KEY, token);
    localStorage.setItem(SPOTIFY_EXPIRES_KEY, String(Date.now() + expiresInSeconds * 1000));
    if (refreshToken) {
      localStorage.setItem(SPOTIFY_REFRESH_KEY, refreshToken);
    }
  }

  static clearToken() {
    this.token = null;
    this.deviceId = null;
    if (this.player) {
      try {
        this.player.disconnect();
      } catch (e) {
        // ignore
      }
      this.player = null;
    }
    localStorage.removeItem(SPOTIFY_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_REFRESH_KEY);
    localStorage.removeItem(SPOTIFY_EXPIRES_KEY);
  }

  static getCustomClientId(): string {
    return localStorage.getItem(SPOTIFY_CUSTOM_CLIENT_ID) || '';
  }

  static setCustomClientId(clientId: string) {
    localStorage.setItem(SPOTIFY_CUSTOM_CLIENT_ID, clientId.trim());
  }

  // Get User Profile
  static async getUserProfile(): Promise<SpotifyUser | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        this.clearToken();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Error fetching Spotify profile:', e);
      return null;
    }
  }

  // Get Current Playback State
  static async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 204 || res.status === 404) {
        return null;
      }
      if (res.status === 401) {
        this.clearToken();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // Get User Playlists
  static async getUserPlaylists(limit = 20): Promise<SpotifyPlaylistItem[]> {
    const token = this.getStoredToken();
    if (!token) return [];

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      return [];
    }
  }

  // Play / Resume
  static async play(contextUri?: string, deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/play';

      const body = contextUri 
        ? JSON.stringify(contextUri.includes(':track:') ? { uris: [contextUri] } : { context_uri: contextUri }) 
        : undefined;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Pause
  static async pause(deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/pause';

      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Next Track
  static async nextTrack(): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Previous Track
  static async previousTrack(): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Set Volume
  static async setVolume(volumePercent: number): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
      const res = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Get User Devices
  static async getDevices(): Promise<any[]> {
    const token = this.getStoredToken();
    if (!token) return [];

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.devices || [];
    } catch (e) {
      return [];
    }
  }

  // Initialize Spotify Web Playback SDK (Official in-browser player device)
  static async initWebPlaybackSDK(onStateChange?: (state: any) => void): Promise<string | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    if (this.deviceId) return this.deviceId;

    return new Promise((resolve) => {
      // Ensure SDK script is present
      if (!document.getElementById('spotify-player-script')) {
        const script = document.createElement('script');
        script.id = 'spotify-player-script';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        const player = new (window as any).Spotify.Player({
          name: 'BJJCRON Tatame Player',
          getOAuthToken: (cb: (t: string) => void) => {
            const currentToken = SpotifyService.getStoredToken();
            if (currentToken) cb(currentToken);
          },
          volume: 0.8
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          SpotifyService.deviceId = device_id;
          resolve(device_id);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.warn('Spotify device offline:', device_id);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (onStateChange) onStateChange(state);
        });

        player.connect();
        SpotifyService.player = player;
      };

      // If SDK already loaded
      if ((window as any).Spotify) {
        (window as any).onSpotifyWebPlaybackSDKReady();
      }

      // Timeout fallback
      setTimeout(() => {
        resolve(SpotifyService.deviceId);
      }, 4000);
    });
  }
}
