// Spotify Service for BJJCRON
// Handles Spotify Web API and Web Playback SDK for authentic Spotify music streaming

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  product: 'premium' | 'free' | 'open';
  images?: { url: string }[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  uri: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width?: number; height?: number }[];
  };
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device?: {
    id: string;
    is_active: boolean;
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
  uri: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

const SPOTIFY_TOKEN_KEY = 'bjjcron_spotify_access_token';
const SPOTIFY_REFRESH_KEY = 'bjjcron_spotify_refresh_token';
const SPOTIFY_EXPIRES_KEY = 'bjjcron_spotify_token_expires_at';
const SPOTIFY_CUSTOM_CLIENT_ID = 'bjjcron_spotify_custom_client_id';

export const DEFAULT_SPOTIFY_CLIENT_ID = '6fa5891513034ba082ef1ece2ee6cbde';

export class SpotifyService {
  private static token: string | null = null;
  public static deviceId: string | null = null;
  public static player: any = null;
  private static isSdkInitializing = false;

  // Retrieve stored OAuth token with expiry validation
  static getStoredToken(): string | null {
    if (this.token) return this.token;
    const token = localStorage.getItem(SPOTIFY_TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(SPOTIFY_EXPIRES_KEY) || 0);

    if (!token) return null;
    if (Date.now() > expiresAt) {
      this.clearToken();
      return null;
    }

    this.token = token;
    return token;
  }

  // Save new OAuth token
  static setToken(token: string, expiresInSeconds: number, refreshToken?: string) {
    this.token = token;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(SPOTIFY_TOKEN_KEY, token);
    localStorage.setItem(SPOTIFY_EXPIRES_KEY, String(expiresAt));
    if (refreshToken) {
      localStorage.setItem(SPOTIFY_REFRESH_KEY, refreshToken);
    }
  }

  // Clear stored tokens and disconnect player
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
    return localStorage.getItem(SPOTIFY_CUSTOM_CLIENT_ID) || DEFAULT_SPOTIFY_CLIENT_ID;
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
  static async getUserPlaylists(limit = 30): Promise<SpotifyPlaylistItem[]> {
    const token = this.getStoredToken();
    if (!token) return [];

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).filter((item: any) => item && item.id);
    } catch (e) {
      return [];
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

  // Transfer playback to specific device
  static async transferPlayback(deviceId: string, play = true): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token || !deviceId) return false;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play
        })
      });
      return res.ok || res.status === 204;
    } catch (e) {
      console.error('Transfer playback error:', e);
      return false;
    }
  }

  // Play / Resume
  static async play(contextUri?: string, deviceId?: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Usuário não autenticado' };

    let targetDeviceId = deviceId || this.deviceId;

    // If no device specified, check available devices
    if (!targetDeviceId) {
      const devices = await this.getDevices();
      const activeDevice = devices.find(d => d.is_active) || devices[0];
      if (activeDevice) {
        targetDeviceId = activeDevice.id;
      }
    }

    try {
      const url = targetDeviceId 
        ? `https://api.spotify.com/v1/me/player/play?device_id=${targetDeviceId}`
        : 'https://api.spotify.com/v1/me/player/play';

      let body: any = undefined;
      if (contextUri) {
        if (contextUri.includes(':track:')) {
          body = JSON.stringify({ uris: [contextUri] });
        } else {
          body = JSON.stringify({ context_uri: contextUri });
        }
      }

      let res = await fetch(url, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body
      });

      // If 404 (No active device) or target device not active, try transferring playback first
      if (res.status === 404 && targetDeviceId) {
        await this.transferPlayback(targetDeviceId, false);
        await new Promise(r => setTimeout(r, 400));
        res = await fetch(url, {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body
        });
      }

      if (res.ok || res.status === 204) {
        return { success: true };
      }

      let errorMsg = `Status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch (_) {}

      return { success: false, error: errorMsg };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao conectar ao Spotify' };
    }
  }

  // Pause
  static async pause(deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    const targetDeviceId = deviceId || this.deviceId;
    try {
      const url = targetDeviceId 
        ? `https://api.spotify.com/v1/me/player/pause?device_id=${targetDeviceId}`
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
  static async nextTrack(deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    const targetDeviceId = deviceId || this.deviceId;
    try {
      const url = targetDeviceId 
        ? `https://api.spotify.com/v1/me/player/next?device_id=${targetDeviceId}`
        : 'https://api.spotify.com/v1/me/player/next';

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Previous Track
  static async previousTrack(deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    const targetDeviceId = deviceId || this.deviceId;
    try {
      const url = targetDeviceId 
        ? `https://api.spotify.com/v1/me/player/previous?device_id=${targetDeviceId}`
        : 'https://api.spotify.com/v1/me/player/previous';

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Set Volume
  static async setVolume(volumePercent: number, deviceId?: string): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    const targetDeviceId = deviceId || this.deviceId;
    try {
      const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
      const url = targetDeviceId 
        ? `https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}&device_id=${targetDeviceId}`
        : `https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok || res.status === 204;
    } catch (e) {
      return false;
    }
  }

  // Initialize Spotify Web Playback SDK (Direct in-browser player device)
  static async initWebPlaybackSDK(callbacks?: {
    onReady?: (deviceId: string) => void;
    onStateChange?: (state: any) => void;
    onError?: (message: string) => void;
  }): Promise<string | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    if (this.deviceId && this.player) {
      return this.deviceId;
    }

    if (this.isSdkInitializing) {
      return null;
    }
    this.isSdkInitializing = true;

    return new Promise((resolve) => {
      // 1. Inject script if not present
      if (!document.getElementById('spotify-player-script')) {
        const script = document.createElement('script');
        script.id = 'spotify-player-script';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }

      const initialize = () => {
        if (!(window as any).Spotify?.Player) return;

        try {
          if (SpotifyService.player) {
            try { SpotifyService.player.disconnect(); } catch (_) {}
          }

          const player = new (window as any).Spotify.Player({
            name: '🥋 BJJCRON Tatame Player (Navegador)',
            getOAuthToken: (cb: (t: string) => void) => {
              const currentToken = SpotifyService.getStoredToken();
              if (currentToken) cb(currentToken);
            },
            volume: 0.8
          });

          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            SpotifyService.deviceId = device_id;
            SpotifyService.isSdkInitializing = false;
            if (callbacks?.onReady) callbacks.onReady(device_id);
            resolve(device_id);
          });

          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.warn('Spotify device is offline:', device_id);
          });

          player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.error('Spotify SDK initialization error:', message);
            SpotifyService.isSdkInitializing = false;
            if (callbacks?.onError) callbacks.onError(message);
            resolve(null);
          });

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.error('Spotify SDK auth error:', message);
            SpotifyService.clearToken();
            SpotifyService.isSdkInitializing = false;
            if (callbacks?.onError) callbacks.onError(message);
            resolve(null);
          });

          player.addListener('account_error', ({ message }: { message: string }) => {
            console.error('Spotify SDK account error (Premium required for in-browser SDK):', message);
            SpotifyService.isSdkInitializing = false;
            if (callbacks?.onError) callbacks.onError(message);
            resolve(null);
          });

          player.addListener('player_state_changed', (state: any) => {
            if (callbacks?.onStateChange) callbacks.onStateChange(state);
          });

          player.connect();
          SpotifyService.player = player;
        } catch (err: any) {
          console.error('Failed to create Spotify player instance:', err);
          SpotifyService.isSdkInitializing = false;
          resolve(null);
        }
      };

      (window as any).onSpotifyWebPlaybackSDKReady = initialize;

      if ((window as any).Spotify?.Player) {
        initialize();
      }

      // Timeout fallback if SDK takes too long
      setTimeout(() => {
        SpotifyService.isSdkInitializing = false;
        resolve(SpotifyService.deviceId);
      }, 5000);
    });
  }
}
