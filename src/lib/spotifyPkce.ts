// Spotify PKCE (Proof Key for Code Exchange) OAuth Helper

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function getDefaultRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/api/spotify/callback`;
}

export async function createSpotifyAuthUrl(clientId: string, redirectUri?: string): Promise<{ authUrl: string; codeVerifier: string; redirectUri: string }> {
  const effectiveRedirectUri = redirectUri || getDefaultRedirectUri();
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  try {
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    localStorage.setItem('spotify_redirect_uri', effectiveRedirectUri);
  } catch (e) {
    // Ignore storage quota errors
  }

  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: effectiveRedirectUri,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true'
  });

  return {
    authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
    codeVerifier,
    redirectUri: effectiveRedirectUri
  };
}

export async function exchangeSpotifyCodeForToken(
  code: string, 
  clientId: string, 
  redirectUri?: string,
  codeVerifier?: string
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string } | null> {
  const verifier = codeVerifier || sessionStorage.getItem('spotify_code_verifier') || localStorage.getItem('spotify_code_verifier') || '';
  const effectiveRedirectUri = redirectUri || localStorage.getItem('spotify_redirect_uri') || getDefaultRedirectUri();

  // Try 1: Server-side proxy /api/spotify/exchange (avoids CORS and issues)
  try {
    const proxyRes = await fetch('/api/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        redirect_uri: effectiveRedirectUri,
        code_verifier: verifier
      })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.access_token) {
        return {
          accessToken: data.access_token,
          expiresIn: data.expires_in || 3600,
          refreshToken: data.refresh_token
        };
      }
    }
  } catch (err) {
    console.warn('Server proxy exchange attempt failed, falling back to direct exchange:', err);
  }

  // Try 2: Direct call to accounts.spotify.com
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: effectiveRedirectUri,
    code_verifier: verifier
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Direct Spotify token exchange failed:', errorText);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
      refreshToken: data.refresh_token
    };
  } catch (err) {
    console.error('Error exchanging Spotify code:', err);
    return null;
  }
}
