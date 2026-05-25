import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer;
      PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerOptions {
  width?: number | string;
  height?: number | string;
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number }) => void;
  };
}

interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoData(): { video_id: string; title: string };
  destroy(): void;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
}

export interface YouTubeState {
  isReady: boolean;
  currentVideo: YouTubeVideoInfo | null;
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  error: string | null;
}

export interface YouTubeControls {
  playVideoId: (id: string, title?: string) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (pct: number) => void; // 0-1
}

const INITIAL_STATE: YouTubeState = {
  isReady: false,
  currentVideo: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  error: null,
};

export function useYoutube(): { state: YouTubeState; controls: YouTubeControls } {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<YouTubeState>(INITIAL_STATE);

  useEffect(() => {
    // Create hidden container
    const div = document.createElement('div');
    div.id = 'yt-bg-player';
    div.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(div);
    containerRef.current = div;

    const initPlayer = () => {
      playerRef.current = new window.YT.Player(div, {
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setState(s => ({ ...s, isReady: true }));
          },
          onStateChange: (e) => {
            const YTState = window.YT.PlayerState;
            if (e.data === YTState.PLAYING) {
              const data = e.target.getVideoData();
              const dur = e.target.getDuration();
              setState(s => ({
                ...s,
                isPlaying: true,
                duration: dur,
                currentVideo: {
                  id: data.video_id,
                  title: data.title,
                  thumbnail: `https://img.youtube.com/vi/${data.video_id}/mqdefault.jpg`,
                },
              }));
            } else if (e.data === YTState.PAUSED) {
              const pos = e.target.getCurrentTime();
              setState(s => ({ ...s, isPlaying: false, position: pos }));
            } else if (e.data === YTState.ENDED) {
              setState(s => ({ ...s, isPlaying: false, position: 0 }));
            }
          },
          onError: () => {
            setState(s => ({ ...s, error: 'YouTube playback error', isPlaying: false }));
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById('yt-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      containerRef.current?.remove();
      containerRef.current = null;
      setState(INITIAL_STATE);
    };
  }, []);

  // Poll position while playing
  useEffect(() => {
    if (!state.isPlaying) return;
    const id = setInterval(() => {
      if (playerRef.current) {
        const pos = playerRef.current.getCurrentTime();
        setState(s => ({ ...s, position: pos }));
      }
    }, 500);
    return () => clearInterval(id);
  }, [state.isPlaying]);

  const controls: YouTubeControls = {
    playVideoId: useCallback((id: string, title?: string) => {
      if (!playerRef.current) return;
      setState(s => ({
        ...s,
        currentVideo: {
          id,
          title: title ?? '',
          thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        },
        position: 0,
      }));
      playerRef.current.loadVideoById(id);
    }, []),

    togglePlay: useCallback(() => {
      if (!playerRef.current) return;
      const ps = playerRef.current.getPlayerState();
      if (ps === 1) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }, []),

    seek: useCallback((seconds: number) => {
      if (!playerRef.current) return;
      playerRef.current.seekTo(seconds, true);
      setState(s => ({ ...s, position: seconds }));
    }, []),

    setVolume: useCallback((pct: number) => {
      if (!playerRef.current) return;
      playerRef.current.setVolume(Math.round(pct * 100));
    }, []),
  };

  return { state, controls };
}
