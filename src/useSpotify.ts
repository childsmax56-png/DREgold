import { useEffect, useRef, useState, useCallback } from 'react';
import { getSpotifyToken, clearSpotifySession, spotifyRequest } from './spotify';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: any) => void): void;
  removeListener(event: string): void;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: RawSpotifyTrack;
  };
}

interface RawSpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string;
  albumArt: string;
  duration: number; // ms
}

export interface SpotifyState {
  isReady: boolean;
  deviceId: string | null;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  position: number; // ms
  error: string | null;
}

export interface SpotifyControls {
  playUri: (uri: string) => Promise<boolean>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (posMs: number) => Promise<void>;
  setVolume: (pct: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
}

const INITIAL_STATE: SpotifyState = {
  isReady: false,
  deviceId: null,
  currentTrack: null,
  isPlaying: false,
  position: 0,
  error: null,
};

export function useSpotify(enabled: boolean): { state: SpotifyState; controls: SpotifyControls } {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  const timestampRef = useRef(0);
  const [state, setState] = useState<SpotifyState>(INITIAL_STATE);

  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      const token = await getSpotifyToken();
      if (!token) return;

      const player = new window.Spotify.Player({
        name: 'DREGOLD',
        getOAuthToken: async (cb) => {
          const t = await getSpotifyToken();
          if (t) cb(t);
        },
        volume: 0.5,
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setState(s => ({ ...s, isReady: true, deviceId: device_id, error: null }));
      });

      player.addListener('not_ready', () => {
        setState(s => ({ ...s, isReady: false }));
      });

      player.addListener('player_state_changed', (ps: SpotifyPlaybackState | null) => {
        if (!ps) return;
        const raw = ps.track_window.current_track;
        positionRef.current = ps.position;
        timestampRef.current = Date.now();
        setState(s => ({
          ...s,
          isPlaying: !ps.paused,
          position: ps.position,
          currentTrack: {
            id: raw.id,
            uri: raw.uri,
            name: raw.name,
            artists: raw.artists.map(a => a.name),
            albumName: raw.album.name,
            albumArt: raw.album.images[0]?.url ?? '',
            duration: ps.duration,
          },
        }));
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        setState(s => ({ ...s, error: message }));
      });

      player.addListener('authentication_error', () => {
        clearSpotifySession();
        setState(s => ({ ...s, error: 'Spotify authentication failed. Please reconnect.' }));
      });

      player.addListener('account_error', () => {
        setState(s => ({ ...s, error: 'Spotify Premium is required to use the player.' }));
      });

      await player.connect();
    };

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.getElementById('spotify-sdk')) {
        const script = document.createElement('script');
        script.id = 'spotify-sdk';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
      setState(INITIAL_STATE);
    };
  }, [enabled]);

  // Interpolate position while playing
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
      const deviceId = deviceIdRef.current;
      if (!deviceId) return false;
      const res = await spotifyRequest(`/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [uri] }),
      });
      return res.ok;
    }, []),

    pause: useCallback(async () => {
      const ps = await playerRef.current?.getCurrentState();
      if (ps && !ps.paused) await playerRef.current?.togglePlay();
      setState(s => ({ ...s, isPlaying: false }));
    }, []),

    togglePlay: useCallback(async () => {
      await playerRef.current?.togglePlay();
    }, []),

    seek: useCallback(async (posMs: number) => {
      await playerRef.current?.seek(posMs);
      positionRef.current = posMs;
      timestampRef.current = Date.now();
      setState(s => ({ ...s, position: posMs }));
    }, []),

    setVolume: useCallback(async (pct: number) => {
      await playerRef.current?.setVolume(pct);
    }, []),

    next: useCallback(async () => {
      await playerRef.current?.nextTrack();
    }, []),

    prev: useCallback(async () => {
      await playerRef.current?.previousTrack();
    }, []),
  };

  return { state, controls };
}
