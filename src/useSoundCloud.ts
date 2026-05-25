import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    SC: {
      Widget: SCWidgetConstructor;
    };
  }
}

interface SCWidgetConstructor {
  (iframe: HTMLIFrameElement): SCWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    PLAY_PROGRESS: string;
    ERROR: string;
  };
}

interface SCWidget {
  bind(event: string, listener: (e?: any) => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seekTo(ms: number): void;
  setVolume(pct: number): void; // 0-100
  getDuration(cb: (ms: number) => void): void;
  getPosition(cb: (ms: number) => void): void;
  getCurrentSound(cb: (sound: SCSound) => void): void;
  isPaused(cb: (paused: boolean) => void): void;
  load(url: string, opts?: { auto_play?: boolean; buying?: boolean; liking?: boolean; download?: boolean; sharing?: boolean; show_artwork?: boolean; show_comments?: boolean; show_playcount?: boolean; show_user?: boolean }): void;
}

interface SCSound {
  title: string;
  artwork_url: string | null;
  user?: { username: string };
  duration: number;
  permalink_url: string;
}

export interface SoundCloudVideoInfo {
  url: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // ms
}

export interface SoundCloudState {
  isReady: boolean;
  currentTrack: SoundCloudVideoInfo | null;
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  error: string | null;
}

export interface SoundCloudControls {
  playUrl: (url: string) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (pct: number) => void; // 0-1
}

const INITIAL_STATE: SoundCloudState = {
  isReady: false,
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  error: null,
};

export function useSoundCloud(): { state: SoundCloudState; controls: SoundCloudControls } {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [state, setState] = useState<SoundCloudState>(INITIAL_STATE);

  useEffect(() => {
    // Hidden iframe in body
    const iframe = document.createElement('iframe');
    iframe.id = 'sc-bg-player';
    iframe.src = 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/soundcloud&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&buying=false&liking=false&sharing=false&show_artwork=false&download=false';
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    iframe.allow = 'autoplay';
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    const initWidget = () => {
      const widget = window.SC.Widget(iframe);
      widgetRef.current = widget;
      const E = window.SC.Widget.Events;

      widget.bind(E.READY, () => {
        setState(s => ({ ...s, isReady: true }));
      });

      widget.bind(E.PLAY, () => {
        widget.getCurrentSound((sound: SCSound) => {
          widget.getDuration((dur: number) => {
            setState(s => ({
              ...s,
              isPlaying: true,
              duration: dur / 1000,
              currentTrack: {
                url: sound.permalink_url,
                title: sound.title,
                artist: sound.user?.username ?? '',
                thumbnail: sound.artwork_url
                  ? sound.artwork_url.replace('-large', '-t300x300')
                  : '',
                duration: dur,
              },
            }));
          });
        });
      });

      widget.bind(E.PAUSE, () => {
        widget.getPosition((pos: number) => {
          setState(s => ({ ...s, isPlaying: false, position: pos / 1000 }));
        });
      });

      widget.bind(E.FINISH, () => {
        setState(s => ({ ...s, isPlaying: false, position: 0 }));
      });

      widget.bind(E.PLAY_PROGRESS, (e: { currentPosition: number }) => {
        setState(s => ({ ...s, position: e.currentPosition / 1000 }));
      });

      widget.bind(E.ERROR, () => {
        setState(s => ({ ...s, error: 'SoundCloud playback error', isPlaying: false }));
      });
    };

    if (window.SC?.Widget) {
      // Iframe needs a moment to load before we can bind
      iframe.addEventListener('load', initWidget, { once: true });
    } else {
      if (!document.getElementById('sc-widget-api')) {
        const script = document.createElement('script');
        script.id = 'sc-widget-api';
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.async = true;
        script.onload = () => {
          iframe.addEventListener('load', initWidget, { once: true });
        };
        document.head.appendChild(script);
      } else {
        iframe.addEventListener('load', initWidget, { once: true });
      }
    }

    return () => {
      iframeRef.current?.remove();
      iframeRef.current = null;
      widgetRef.current = null;
      setState(INITIAL_STATE);
    };
  }, []);

  const controls: SoundCloudControls = {
    playUrl: useCallback((url: string) => {
      if (!widgetRef.current) return;
      widgetRef.current.load(url, {
        auto_play: true,
        buying: false,
        liking: false,
        download: false,
        sharing: false,
        show_artwork: false,
        show_comments: false,
        show_playcount: false,
        show_user: false,
      });
      setState(s => ({ ...s, position: 0 }));
    }, []),

    togglePlay: useCallback(() => {
      widgetRef.current?.toggle();
    }, []),

    seek: useCallback((seconds: number) => {
      widgetRef.current?.seekTo(seconds * 1000);
      setState(s => ({ ...s, position: seconds }));
    }, []),

    setVolume: useCallback((pct: number) => {
      widgetRef.current?.setVolume(Math.round(pct * 100));
    }, []),
  };

  return { state, controls };
}
