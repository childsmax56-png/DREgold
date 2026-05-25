import React, { createContext, useContext, useState, useEffect } from 'react';

export type MiniLyricsAlignment = 'left' | 'center' | 'right';
export type GlobalFontSize = 'small' | 'medium' | 'large';
export type LoadingScreenId = 'none' | 'shuffle' | 'donda2' | 'swish' | 'thankgod' | 'yandhi' | 'yeezus' | 'graduation' | 'wtt';

export interface LoadingScreenOption {
  id: LoadingScreenId;
  label: string;
  type: 'none' | 'gif' | 'video';
  url?: string;
}

export const LOADING_SCREENS: LoadingScreenOption[] = [
  { id: 'none', label: 'None', type: 'none' },
  { id: 'shuffle', label: 'Shuffle', type: 'none' },
  { id: 'donda2', label: 'Donda 2', type: 'gif', url: 'https://i.ibb.co/BH4D6dZm/Donda-2-Loading-Screen.gif' },
  { id: 'swish', label: 'Swish', type: 'gif', url: 'https://i.ibb.co/vxrY813X/Swish-loading-screen.gif' },
  { id: 'thankgod', label: 'Thank God for Drugs', type: 'gif', url: 'https://i.ibb.co/gMQcJwtH/TGFD-loading-screen.gif' },
  { id: 'yandhi', label: 'Yandhi', type: 'gif', url: 'https://i.ibb.co/ymbgPJvQ/Yandhi-loading-screen.gif' },
  { id: 'yeezus', label: 'Yeezus', type: 'gif', url: 'https://i.ibb.co/kt6cT2Z/Yeezus-loading-screen.gif' },
  { id: 'graduation', label: 'Graduation', type: 'gif', url: 'https://i.ibb.co/5gNfGhmZ/Graduation-loading-screen-1.gif' },
  { id: 'wtt', label: 'Watch the Throne', type: 'gif', url: 'https://i.ibb.co/fGPV83fc/Watch-the-throne-loading-screen.gif' },
];

export interface AppSettings {
  loadingScreen: LoadingScreenId;
  miniLyricsAlignment: MiniLyricsAlignment;
  tagsAsEmojis: boolean;
  startVolume: number | null;
  saveListeningHistory: boolean;
  keyboardShortcuts: boolean;
  globalFontSize: GlobalFontSize;
  miniLyricsOpacity: number;
  showMiniPlayerArt: boolean;
  showMiniLyricsArt: boolean;
  showNextSongNotification: boolean;
  themeColor: string;
  syncedLyricsOnly: boolean;
  notificationWhenPlaying: boolean;
  startupShuffle: boolean;
  startupLoop: number;
  discordRPC: boolean;
  rememberSearch: boolean;
  fullScreenVolume: boolean;
  showRandomSongButton: boolean;
  lastfmShowVersion: boolean;
  lastfmShowTags: boolean;
  lastfmShowFeats: boolean;
  notOpenInNewTab: boolean;
  googleSheetsUrl: string;
  downloadAsOgFilename: boolean;
  embedMetadata: boolean;
  dropdownNav: boolean;
  lastfmEraOverrides: Record<string, string>;
  videosMiniPlayer: boolean;
  aiErrorDetails: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const defaultSettings: AppSettings = {
  loadingScreen: 'none',
  miniLyricsAlignment: 'left',
  tagsAsEmojis: false,
  startVolume: null,
  saveListeningHistory: false,
  keyboardShortcuts: true,
  globalFontSize: 'medium',
  miniLyricsOpacity: 100,
  showMiniPlayerArt: true,
  showMiniLyricsArt: true,
  showNextSongNotification: true,
  themeColor: '#FFD700',
  syncedLyricsOnly: false,
  notificationWhenPlaying: false,
  startupShuffle: false,
  startupLoop: 0,
  discordRPC: false,
  rememberSearch: false,
  fullScreenVolume: true,
  showRandomSongButton: true,
  lastfmShowVersion: true,
  lastfmShowTags: false,
  lastfmShowFeats: true,
  notOpenInNewTab: false,
  googleSheetsUrl: '',
  downloadAsOgFilename: false,
  embedMetadata: true,
  dropdownNav: true,
  lastfmEraOverrides: {},
  videosMiniPlayer: true,
  aiErrorDetails: false,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    let initialSettings = defaultSettings;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      initialSettings = { ...initialSettings, globalFontSize: 'small' };
    }
    
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('xgold_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof window !== 'undefined' && window.innerWidth < 768 && !localStorage.getItem('mobile_font_migrated_v1_5_0')) {
             parsed.globalFontSize = 'small';
             localStorage.setItem('mobile_font_migrated_v1_5_0', 'true');
          }
          return { ...initialSettings, ...parsed };
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
        localStorage.setItem('mobile_font_migrated_v1_5_0', 'true');
      }
    }
    return initialSettings;
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('xgold_settings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
