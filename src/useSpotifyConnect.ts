import { useEffect, useRef, useState, useCallback } from 'react';
import { getSpotifyToken, clearSpotifySession, spotifyRequest } from './spotify';

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string;
  albumArt: string;
  duration: number;
}

export interface SpotifyState {
  isReady: boolean;
  deviceId: string | null;
  deviceName: string | null;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  position: number;
  error: string | null;
}

export interface SpotifyControls {
  playUri: (uri: string) => Promise<boolean>;
  togglePlay: () => Promise<void>;
  seek: (posMs: number) => Promise<void>;
  setVolume: (pct: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
}

const INITIAL_STATE: SpotifyState = {
  isReady: false,
  deviceId: null,
  deviceName: null,
  currentTrack: null,
  isPlaying: false,
  position: 0,
  error: null,
};

function parseTrack(item: any): SpotifyTrack | null {
  if (!item) return null;
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    artists: item.artists.map((a: { name: string }) => a.name),
    albumName: item.album.name,
    albumArt: item.album.images[0]?.url ?? '',
    duration: item.duration_ms,
  };
}

export function useSpotifyConnect(enabled: boolean): { state: SpotifyState; controls: SpotifyControls } {
  const [state, setState] = useState<SpotifyState>(INITIAL_STATE);
  const positionRef = useRef(0);
  const timestampRef = useRef(0);
  const isPlayingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const token = await getSpotifyToken();
    if (!token) return;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204) {
        setState(s => ({ ...s, isReady: false, isPlaying: false, currentTrack: null }));
        isPlayingRef.current = false;
        return;
      }

      if (res.status === 401) {
        clearSpotifySession();
        setState(s => ({ ...s, error: 'Spotify authentication failed. Please reconnect.' }));
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      const track = parseTrack(data.item);

      positionRef.current = data.progress_ms ?? 0;
      timestampRef.current = Date.now();
      isPlayingRef.current = data.is_playing;

      setState({
        isReady: !!data.device,
        deviceId: data.device?.id ?? null,
        deviceName: data.device?.name ?? null,
        currentTrack: track,
        isPlaying: data.is_playing,
        position: data.progress_ms ?? 0,
        error: null,
      });
    } catch {
      // network error, skip
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL_STATE);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, poll]);

  // Interpolate position between polls while playing
  useEffect(() => {
    if (!state.isPlaying) return;
    const id = setInterval(() => {
      setState(s => ({
        ...s,
        position: positionRef.current + (Date.now() - timestampRef.current),
      }));
    }, 500);
    return () => clearInterval(id);
  }, [state.isPlaying]);

  const controls: SpotifyControls = {
    playUri: useCallback(async (uri: string): Promise<boolean> => {
      try {
        const res = await spotifyRequest('/me/player/play', {
          method: 'PUT',
          body: JSON.stringify({ uris: [uri] }),
        });
        if (!res.ok) {
          setState(s => ({ ...s, error: 'No active Spotify device. Open Spotify on any device first.' }));
          return false;
        }
        setTimeout(poll, 300);
        return true;
      } catch {
        setState(s => ({ ...s, error: 'No active Spotify device. Open Spotify on any device first.' }));
        return false;
      }
    }, [poll]),

    togglePlay: useCallback(async () => {
      try {
        if (isPlayingRef.current) {
          await spotifyRequest('/me/player/pause', { method: 'PUT' });
          isPlayingRef.current = false;
          setState(s => ({ ...s, isPlaying: false }));
        } else {
          await spotifyRequest('/me/player/play', { method: 'PUT' });
          isPlayingRef.current = true;
          setState(s => ({ ...s, isPlaying: true }));
        }
      } catch { /* ignore */ }
    }, []),

    seek: useCallback(async (posMs: number) => {
      try {
        await spotifyRequest(`/me/player/seek?position_ms=${Math.round(posMs)}`, { method: 'PUT' });
        positionRef.current = posMs;
        timestampRef.current = Date.now();
        setState(s => ({ ...s, position: posMs }));
      } catch { /* ignore */ }
    }, []),

    setVolume: useCallback(async (pct: number) => {
      try {
        await spotifyRequest(`/me/player/volume?volume_percent=${Math.round(pct * 100)}`, { method: 'PUT' });
      } catch { /* ignore */ }
    }, []),

    next: useCallback(async () => {
      try {
        await spotifyRequest('/me/player/next', { method: 'POST' });
        setTimeout(poll, 500);
      } catch { /* ignore */ }
    }, [poll]),

    prev: useCallback(async () => {
      try {
        await spotifyRequest('/me/player/previous', { method: 'POST' });
        setTimeout(poll, 500);
      } catch { /* ignore */ }
    }, [poll]),
  };

  return { state, controls };
}
