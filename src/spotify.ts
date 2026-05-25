const CLIENT_ID = 'c9bdd79bf657487d8973f4c1510523ea';
const REDIRECT_URI = `${window.location.origin}/`;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function randomString(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return base64URLEncode(arr.buffer);
}

export async function startSpotifyAuth(): Promise<void> {
  const codeVerifier = randomString(64);
  const codeChallenge = base64URLEncode(await sha256(codeVerifier));
  const state = randomString(16);

  localStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true',
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (params.get('error') || !code) return false;

  const storedState = localStorage.getItem('spotify_state');
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  if (state !== storedState || !codeVerifier) return false;

  localStorage.removeItem('spotify_state');
  localStorage.removeItem('spotify_code_verifier');
  window.history.replaceState({}, '', window.location.pathname);

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_refresh_token', data.refresh_token);
  localStorage.setItem('spotify_expires_at', String(Date.now() + data.expires_in * 1000));
  return true;
}

async function refreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) { clearSpotifySession(); return null; }

  const data = await res.json();
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_expires_at', String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
  return data.access_token;
}

export async function getSpotifyToken(): Promise<string | null> {
  const token = localStorage.getItem('spotify_access_token');
  if (!token) return null;
  const expiresAt = parseInt(localStorage.getItem('spotify_expires_at') || '0');
  if (Date.now() > expiresAt - 5 * 60 * 1000) return refreshToken();
  return token;
}

export function isSpotifyLoggedIn(): boolean {
  return !!localStorage.getItem('spotify_access_token');
}

export function clearSpotifySession(): void {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
}

export async function spotifyRequest(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const token = await getSpotifyToken();
  if (!token) throw new Error('Not authenticated with Spotify');
  return fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}
