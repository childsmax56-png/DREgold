import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { XCircle, ChevronUp, X } from 'lucide-react';
import axios from 'axios';
import { Navbar, Category } from './components/Navbar';
import { EraGrid } from './components/EraGrid';
import { EraDetail, findMvsForSong, findRemixesForSong, findSamplesForSong } from './components/EraDetail';
import { PlayerBar } from './components/PlayerBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { ArtGallery, ArtEntry } from './components/ArtGallery';
import { StemsView, StemEntry } from './components/StemsView';
import { MiscView, MiscEntry } from './components/MiscView';
import { TracklistsView, TracklistAlbum } from './components/TracklistsView';
import { QueueModal } from './components/QueueModal';
import { handleShareSilent } from './components/EraDetail';

import { TrackerData, Era, Song, SearchFilters } from './types';
import { matchesFilters, createSlug, getSongSlug, getCleanSongNameWithTags, isSongNotAvailable, formatTextForNotification, CUSTOM_IMAGES, HIDDEN_ALBUMS, ALBUM_RELEASE_DATES, getArtistName, buildArtistTag, handleDownloadFile } from './utils';
import { CUSTOM_ALBUM_INFO, ERA_MAPPINGS } from './artist.config';
import { isLastfmLoggedIn, saveLastfmSession, clearLastfmSession, scrobbleTrack, updateNowPlaying, cleanTrackName, parseArtistFromSong, cleanAlbumName } from './lastfm';
import { isSpotifyLoggedIn, clearSpotifySession, startSpotifyAuth, handleSpotifyCallback } from './spotify';
import { useSpotify, SpotifyTrack } from './useSpotify';
import { useYoutube } from './useYoutube';
import { useSoundCloud } from './useSoundCloud';

// CUSTOM_ALBUM_INFO is imported from artist.config.ts

export interface MvEntry {
  Era: string;
  Name: string;
  Notes: string;
  Length: string;
  Type: string;
  "Available Length": string;
  Quality: string;
  "Link(s)": string;
}

export interface RemixEntry {
  Era: string;
  Name: string;
  Notes: string;
  "Artist(s)": string;
  "Available Length": string;
  Quality: string;
  "Link(s)": string;
}

export interface SampleEntry {
  Era?: string;
  Name?: string;
  "Song Name\n(Special thanks to Isak & Jeen for their invaluable help on this page)"?: string;
  "Sample\n(Artist - Track)"?: string;
  Notes?: string;
  "Link(s)"?: string;
}

export interface FakesEntry {
  Era: string;
  Name: string;
  Notes?: string;
  "Made By"?: string;
  Type?: string;
  FeatureExtra?: string;
  "Available Length"?: string;
  "Link(s)"?: string;
}

import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { FakesView } from './components/FakesView';
import { ReleasedView, ReleasedEntry } from './components/ReleasedView';
import { VideosView, VideoRawEntry } from './components/VideosView';
import { ChatBubble } from './components/ChatBubble';
import { useSettings, LOADING_SCREENS } from './SettingsContext';
import { recordListeningHistory } from './history';

// ERA_MAPPINGS is imported from artist.config.ts

export default function App() {
  const { settings } = useSettings();
  const [data, setData] = useState<TrackerData | null>(null);
  const [productionData, setProductionData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFading, setLoadingFading] = useState(false);
  const [gifReady, setGifReady] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showSafariWarning, setShowSafariWarning] = useState(false);
  const [mvData, setMvData] = useState<MvEntry[]>([]);
  const [remixData, setRemixData] = useState<RemixEntry[]>([]);
  const [samplesData, setSamplesData] = useState<SampleEntry[]>([]);
  const [artData, setArtData] = useState<ArtEntry[]>([]);
  const [recentData, setRecentData] = useState<Song[]>([]);
  const [stemsData, setStemsData] = useState<StemEntry[]>([]);
  const [miscData, setMiscData] = useState<MiscEntry[]>([]);
  const [fakesData, setFakesData] = useState<FakesEntry[]>([]);
  const [tracklistsData, setTracklistsData] = useState<TracklistAlbum[]>([]);
  const [releasedData, setReleasedData] = useState<ReleasedEntry[]>([]);
  const [videosData, setVideosData] = useState<VideoRawEntry[]>([]);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/art')) return 'art';
    if (path.startsWith('/stems')) return 'stems';
    if (path.startsWith('/misc')) return 'misc';
    if (path.startsWith('/fakes')) return 'fakes';
    if (path.startsWith('/released')) return 'released';
    if (path.startsWith('/recent')) return 'recent';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/history')) return 'history';
    if (path.startsWith('/tracklists')) return 'tracklists';
    if (path.startsWith('/videos')) return 'videos';
    if (path.startsWith('/production')) return 'production';
    return 'music';
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    tags: [],
    excludedTags: [],
    qualities: [],
    excludedQualities: [],
    availableLengths: [],
    excludedAvailableLengths: [],
    durationOp: '>',
    durationValue: '',
    playableOnly: false,
    hasClips: null,
    hasRemixes: null,
    hasSamples: null
  });

  useEffect(() => {
    if (!loading) {
      const screen = LOADING_SCREENS.find(s => s.id === settings.loadingScreen);
      if (screen?.type === 'gif' && !gifReady) {
        const t = setTimeout(() => {
          setLoadingFading(true);
          setTimeout(() => setLoadingFading(false), 700);
        }, 6000);
        return () => clearTimeout(t);
      }
      setLoadingFading(true);
      const t = setTimeout(() => setLoadingFading(false), 700);
      return () => clearTimeout(t);
    }
  }, [loading, gifReady, settings.loadingScreen]);

  useEffect(() => {
    setFilters({
      tags: [],
      excludedTags: [],
      qualities: [],
      excludedQualities: [],
      availableLengths: [],
      excludedAvailableLengths: [],
      durationOp: '>',
      durationValue: '',
      playableOnly: false,
      hasClips: null,
      hasRemixes: null,
      hasSamples: null
    });
  }, [activeCategory]);

  const [selectedAlbum, setSelectedAlbum] = useState<Era | null>(null);

  const [currentEra, setCurrentEra] = useState<Era | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlayerClosed, setIsPlayerClosed] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLastfmErrorModal, setShowLastfmErrorModal] = useState(false);

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(settings.startupShuffle);
  const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);
  const [loopMode, setLoopMode] = useState(settings.startupLoop || 0);

  const isShuffleRef = useRef(settings.startupShuffle);
  const currentSongIndexRef = useRef(-1);
  const playlistRef = useRef<Song[]>([]);
  const randomSongRef = useRef<() => void>(() => {});
  const [hasLoopedOnce, setHasLoopedOnce] = useState(false);

  const [favoriteKeys, setFavoriteKeys] = useState<{ songName: string, eraName: string, url: string, song?: Song }[]>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dregold_favorite_keys');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dregold_favorite_keys', JSON.stringify(favoriteKeys));
    }
  }, [favoriteKeys]);

  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    const handleShowDiscord = () => setShowDiscordModal(true);
    window.addEventListener('show-discord-rpc-modal', handleShowDiscord);
    return () => window.removeEventListener('show-discord-rpc-modal', handleShowDiscord);
  }, []);

  const toggleFavorite = (song: Song, eraName: string) => {
    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    const cleanSong = { ...song };
    delete cleanSong.realEra;

    setFavoriteKeys(prev => {
      const exists = prev.some(k => k.songName === song.name && k.url === rawUrl);
      if (exists) {
        return prev.filter(k => !(k.songName === song.name && k.url === rawUrl));
      } else {
        return [...prev, { songName: song.name, eraName: eraName, url: rawUrl, song: cleanSong }];
      }
    });
  };

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (settings.startVolume !== null && settings.startVolume !== undefined) {
      return settings.startVolume / 100;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('dregold_playback_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1) {
            return parsed.volume;
          }
        }
      } catch (e) {}
    }
    return 1;
  });

  const timeToRestoreRef = useRef<number | null>(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (settings.globalFontSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (settings.globalFontSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }, [settings.globalFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', settings.themeColor);
  }, [settings.themeColor]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && currentSong && currentEra) {
      const stateToSave = {
        song: { name: currentSong.name, url: currentSong.url || (currentSong.urls && currentSong.urls[0]) || '' },
        eraName: currentEra.name,
        volume: volume,
        currentTime: currentTime
      };
      localStorage.setItem('dregold_playback_state', JSON.stringify(stateToSave));
    }
  }, [currentSong, currentEra, volume, currentTime]);

  useEffect(() => {
    if (data && recentData.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('dregold_playback_state');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const savedSong = parsed.song;
            const savedEraName = parsed.eraName;

            if (savedSong && savedEraName) {
              const erasValues = (data.eras || []) as Era[];
              let eraToRestore: Era | null = erasValues.find(e => e.name === savedEraName) || null;

              if (!eraToRestore && savedEraName === 'Recent Leaks') {
                eraToRestore = {
                  name: "Recent Leaks",
                  image: undefined,
                  data: {
                    "Latest Additions": recentData.map(song => {
                      const eraName = song.extra2 || song.extra;
                      const realEra = erasValues.find(e => e.name === eraName);
                      return {
                        ...song,
                        image: CUSTOM_IMAGES[realEra?.name || ''] || realEra?.image,
                        realEra
                      };
                    })
                  }
                };
              }

              if (eraToRestore) {
                const allSongs = Object.values(eraToRestore.data || {}).flat();
                const songToRestore = allSongs.find((s: any) => s.name === savedSong.name && (s.url || (s.urls && s.urls[0]) || '') === savedSong.url);
                if (songToRestore) {
                  timeToRestoreRef.current = parsed.currentTime || 0;
                  handlePlaySong(songToRestore as Song, eraToRestore as Era, undefined, false, false);
                }
              } else if (savedEraName === 'Favorites') {
                const savedFavs = localStorage.getItem('dregold_favorite_keys');
                if (savedFavs) {
                   const favKeys = JSON.parse(savedFavs);
                   const favEra = {
                      name: "Favorites",
                      image: "https://i.ibb.co/JFnmJ8rX/image.png",
                      data: {
                        "Favorite Tracks": favKeys.map((k: any) => {
                          let realEra = erasValues.find(e => e.name === k.eraName);
                          if (!realEra && k.eraName === 'Recent Leaks') {
                              realEra = { name: "Recent Leaks", image: undefined, data: { "Latest Additions": recentData } };
                          }
                          let foundSong: Song | null = null;
                          if (realEra && realEra.data) {
                             const allC = Object.values(realEra.data).flat();
                             foundSong = allC.find((s: any) => s.name === k.songName && (s.url || (s.urls && s.urls[0] || '')) === k.url) as Song;
                          }
                          if (!foundSong && k.eraName === 'Recent Leaks') {
                             foundSong = recentData.find(s => s.name === k.songName && (s.url || (s.urls && s.urls[0] || '')) === k.url) as Song;
                          }
                          if (foundSong && realEra) {
                             const actualRealEra = realEra as Era;
                             const rawEraName = foundSong.extra2 || foundSong.extra;
                             const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
                             const actualRealEraNameSearch = actualRealEra?.name || '';
                             return { ...foundSong, realEra: actualRealEra, image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[actualRealEraNameSearch || ''] || actualRealEra?.image || foundSong.image };
                          }
                          return null;
                        }).filter((s: any) => s !== null)
                      }
                   };
                   const s = Object.values(favEra.data)[0].find((s: any) => s.name === savedSong.name && (s.url || (s.urls && s.urls[0]) || '') === savedSong.url);
                   if (s) {
                     timeToRestoreRef.current = parsed.currentTime || 0;
                     handlePlaySong(s as Song, favEra as Era, undefined, false, false);
                   }
                }
              }
            }
          } catch(e) {}
        }
      }
    }
  }, [data, recentData]);

  const [lastfmLoggedIn, setLastfmLoggedIn] = useState(isLastfmLoggedIn());
  const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(isSpotifyLoggedIn());
  const [activePlayer, setActivePlayer] = useState<'audio' | 'spotify' | 'youtube' | 'soundcloud'>('audio');
  const { state: spotifyState, controls: spotifyControls } = useSpotify(spotifyLoggedIn);
  const { state: youtubeState, controls: youtubeControls } = useYoutube();
  const { state: soundcloudState, controls: soundcloudControls } = useSoundCloud();
  const scrobbledRef = useRef(false);
  const songStartTimeRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  isShuffleRef.current = isShuffle;
  currentSongIndexRef.current = currentSongIndex;
  playlistRef.current = playlist;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (window.location.search.includes('code=')) {
      handleSpotifyCallback().then(ok => {
        if (ok) setSpotifyLoggedIn(true);
      });
    }
  }, []);

  useEffect(() => {
    if (spotifyState.error) showToast(spotifyState.error);
  }, [spotifyState.error]);

  useEffect(() => {
    const initAudio = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (!audioContextRef.current && audioRef.current && !isIOS) {
        const windowAny = window as any;
        const AudioContext = window.AudioContext || windowAny.webkitAudioContext;
        if (!AudioContext) return;

        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;

          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(analyser);
          analyser.connect(ctx.destination);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;
        } catch (e) {
          console.error("Failed to initialize AudioContext", e);
        }
      }
    };

    document.addEventListener('click', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, []);

  function getSheetCsvExportUrl(sheetUrl: string): string | null {
    const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return null;
    const sheetId = idMatch[1];
    const gidMatch = sheetUrl.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  const FETCH_TIMEOUT = 20000;

  useEffect(() => {
    Promise.all([
      axios.get('/api/a', { timeout: FETCH_TIMEOUT }),
      axios.get('/api/production', { timeout: FETCH_TIMEOUT }).catch(err => {
        console.error("Failed to fetch production data", err);
        return { data: null };
      }),
      axios.get('/api/recent', { timeout: FETCH_TIMEOUT }).catch(err => {
        console.error("Failed to fetch Recent data:", err);
        return { data: [] };
      }),
    ])
      .then(([mainRes, productionRes, recentRes]) => {
        const rawJson = mainRes.data;
        const json = JSON.parse(JSON.stringify(rawJson));

        // Apply ERA_MAPPINGS normalization
        const categoriesToNormalize = ['eras', 'art', 'misc', 'stems', 'fakes', 'reference_track'];
        categoriesToNormalize.forEach(category => {
          if (!json[category]) return;
          // eras is now an array — ERA_MAPPINGS renaming not needed (it's empty)
          if (category === 'eras' && Array.isArray(json[category])) return;
          const rebuilt: Record<string, any> = {};
          Object.keys(json[category]).forEach(key => {
            const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === key.toLowerCase());
            const mappedKey = matchedMapKey ? ERA_MAPPINGS[matchedMapKey] : key;
            const isRename = mappedKey !== key;
            const value = json[category][key];

            if (!rebuilt[mappedKey]) {
              rebuilt[mappedKey] = (isRename && category === 'eras')
                ? { ...value, name: mappedKey }
                : value;
            } else {
              if (Array.isArray(rebuilt[mappedKey])) {
                rebuilt[mappedKey] = rebuilt[mappedKey].concat(value);
              } else {
                const existing = rebuilt[mappedKey];
                rebuilt[mappedKey] = {
                  ...existing,
                  ...value,
                  image: existing.image || value.image,
                  extra: existing.extra || value.extra,
                  data: { ...existing.data, ...value.data }
                };
                if (isRename && category === 'eras') {
                  rebuilt[mappedKey].name = mappedKey;
                }
              }
            }
          });
          json[category] = rebuilt;
        });

        setData(json);

        // Set production data
        if (productionRes.data) {
          const prodJson = JSON.parse(JSON.stringify(productionRes.data));
          setProductionData(prodJson);
        }

        // Map recent.csv rows
        const mapRecentItem = (item: any): Song => {
          let name = item.Name || '';
          let extra: string | undefined = undefined;
          let extra2: string | undefined = item.Era || undefined;
          if (extra2) {
            const m = extra2.match(/\s*\(/);
            if (m) {
              extra = extra2.substring(m.index!).trim();
              extra2 = extra2.substring(0, m.index).trim();
            }
          }
          if (name) {
            const m = name.match(/\s*\(/);
            if (m) {
              const lastIdx = name.lastIndexOf(')');
              if (lastIdx > m.index!) {
                const extracted = name.substring(m.index!, lastIdx + 1).trim();
                const remainder = name.substring(lastIdx + 1).trim();
                name = name.substring(0, m.index).trim() + (remainder ? ' ' + remainder : '');
                extra = extracted + (extra ? ' ' + extra : '');
              } else {
                extra = name.substring(m.index!).trim() + (extra ? ' ' + extra : '');
                name = name.substring(0, m.index).trim();
              }
            }
          }
          return {
            name, extra, extra2,
            description: item.Notes,
            track_length: item['Track Length'],
            leak_date: item['Leak\nDate'] || item['Leak Date'],
            file_date: item['File\nDate'] || item['File Date'],
            available_length: item['Available Length'],
            quality: item.Quality,
            url: item['Link(s)'] ? item['Link(s)'].split('\n')[0] : '',
            urls: item['Link(s)'] ? item['Link(s)'].split('\n') : [],
          };
        };
        const recentMapped: Song[] = (recentRes.data as any[]).map(mapRecentItem);
        setRecentData(recentMapped);
        setLoading(false);

        const path = window.location.pathname;
        const hash = window.location.hash;
        if (path.startsWith('/art') || hash.startsWith('#art')) {
          setActiveCategory('art');
        } else if (path.startsWith('/stems')) {
          setActiveCategory('stems');
        } else if (path.startsWith('/misc')) {
          setActiveCategory('misc');
        } else if (path.startsWith('/fakes')) {
          setActiveCategory('fakes');
        } else if (path.startsWith('/released')) {
          setActiveCategory('released');
        } else if (path.startsWith('/recent')) {
          setActiveCategory('recent');
        } else if (path.startsWith('/settings')) {
          setActiveCategory('settings');
        } else if (path.startsWith('/history')) {
          setActiveCategory('history');
        } else if (path.startsWith('/tracklists/')) {
          setActiveCategory('tracklists');
          const slug = path.split('/tracklists/')[1];
          const erasValues = (json.eras || []) as Era[];
          const match = erasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          } else {
            window.history.replaceState({ category: 'tracklists' }, '', '/tracklists');
          }
        } else if (path.startsWith('/tracklists')) {
          setActiveCategory('tracklists');
        } else if (path.startsWith('/production/')) {
          setActiveCategory('production');
          const slug = path.split('/production/')[1];
          const prodErasValues = (productionRes.data?.eras || []) as Era[];
          const match = prodErasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          } else {
            window.history.replaceState({ category: 'production' }, '', '/production');
          }
        } else if (path.startsWith('/production')) {
          setActiveCategory('production');
        } else if (path.startsWith('/album/')) {
          const slug = path.split('/album/')[1];
          const erasValues = (json.eras || []) as Era[];
          const match = erasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          }
        }
      })
      .catch(err => {
        console.error("Failed to fetch tracker data:", err);
        setLoading(false);
      });

    const normalizeEraField = (dataArray: any[]) => {
      return dataArray.map(item => {
        if (item.Era) {
          const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === item.Era.toLowerCase());
          if (matchedMapKey) {
            return { ...item, Era: ERA_MAPPINGS[matchedMapKey] };
          }
        }
        return item;
      });
    };

    axios.get('/api/music-videos')
      .then(res => {
        setVideosData(res.data as VideoRawEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch music videos data:", err);
      });

    axios.get('/api/art')
      .then(res => {
        const data = normalizeEraField(res.data) as ArtEntry[];
        const filteredData = data.filter(item => {
          const l = (item['Link(s)'] || '').toLowerCase();
          return !l.includes('link needed') && !l.includes('link%20needed') && !l.includes('source needed') && !l.includes('source%20needed');
        });
        setArtData(filteredData);
      })
      .catch(err => {
        console.error("Failed to fetch Art data:", err);
      });

    axios.get('/api/misc')
      .then(res => {
        setMiscData(normalizeEraField(res.data) as MiscEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Misc data:", err);
      });

    axios.get('/api/released')
      .then(res => {
        setReleasedData(res.data as ReleasedEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Released data:", err);
      });

    axios.get('/api/fakes')
      .then(res => {
        const rawFakes = normalizeEraField(res.data) as any[];
        const mappedFakes = rawFakes.map(item => {
          let name = item.Name || '';
          let featureExtra = undefined;

          if (name) {
            const match = name.match(/\s*\(/);
            if (match) {
                const idx = match.index;
                const lastIdx = name.lastIndexOf(')');
                if (lastIdx > idx) {
                    featureExtra = name.substring(idx, lastIdx + 1).trim();
                    const remainder = name.substring(lastIdx + 1).trim();
                    name = name.substring(0, idx).trim() + (remainder ? " " + remainder : "");
                } else {
                    featureExtra = name.substring(idx).trim();
                    name = name.substring(0, idx).trim();
                }
            }
          }

          const newItem = { ...item, Name: name, FeatureExtra: featureExtra };
          const notesKey = Object.keys(item).find(k => k.startsWith('Notes'));
          if (notesKey && notesKey !== 'Notes') {
            newItem.Notes = item[notesKey];
          }
          return newItem;
        });
        setFakesData(mappedFakes as FakesEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Fakes data:", err);
      });

    axios.get('/api/stems')
      .then(res => {
        setStemsData(normalizeEraField(res.data) as StemEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Stems data:", err);
      });

    axios.get('/api/tracklists')
      .then(res => {
        setTracklistsData(res.data as TracklistAlbum[]);
      })
      .catch(err => {
        console.error("Failed to fetch Tracklists data:", err);
      });

    const userAgent = navigator.userAgent.toLowerCase();
    const isBrowserSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('android');

    if (!localStorage.getItem('dregold_v1_seen')) {
      setShowChangelog(true);
    } else if (isBrowserSafari) {
      setShowSafariWarning(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const lastfmSession = urlParams.get('lastfm_session');
    const lastfmUser = urlParams.get('lastfm_user');
    if (lastfmSession && lastfmUser) {
      saveLastfmSession(lastfmSession, lastfmUser);
      setLastfmLoggedIn(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleLastfmApiError = () => {
      setShowLastfmErrorModal(true);
      clearLastfmSession();
      setLastfmLoggedIn(false);
    };

    window.addEventListener('lastfm-api-error', handleLastfmApiError);
    return () => {
      window.removeEventListener('lastfm-api-error', handleLastfmApiError);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentPath = window.location.pathname;

    if (activeCategory === 'art') {
      if (!currentPath.startsWith('/art')) {
        window.history.pushState({ category: 'art' }, '', '/art');
      }
    } else if (activeCategory === 'stems') {
      if (!currentPath.startsWith('/stems')) {
        window.history.pushState({ category: 'stems' }, '', '/stems');
      }
    } else if (activeCategory === 'misc') {
      if (!currentPath.startsWith('/misc')) {
        window.history.pushState({ category: 'misc' }, '', '/misc');
      }
    } else if (activeCategory === 'fakes') {
      if (!currentPath.startsWith('/fakes')) {
        window.history.pushState({ category: 'fakes' }, '', '/fakes');
      }
    } else if (activeCategory === 'released') {
      if (!currentPath.startsWith('/released')) {
        window.history.pushState({ category: 'released' }, '', '/released');
      }
    } else if (activeCategory === 'recent') {
      if (!currentPath.startsWith('/recent')) {
        window.history.pushState({ category: 'recent' }, '', '/recent');
      }
    } else if (activeCategory === 'settings') {
      if (!currentPath.startsWith('/settings')) {
        window.history.pushState({ category: 'settings' }, '', '/settings');
      }
    } else if (activeCategory === 'history') {
      if (!currentPath.startsWith('/history')) {
        window.history.pushState({ category: 'history' }, '', '/history');
      }
    } else if (activeCategory === 'tracklists') {
      if (selectedAlbum) {
        const newPath = `/tracklists/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name, category: 'tracklists' }, '', newPath);
        }
      } else {
        if (currentPath !== '/tracklists') {
          window.history.pushState({ category: 'tracklists' }, '', '/tracklists');
        }
      }
    } else if (activeCategory === 'videos') {
      if (!currentPath.startsWith('/videos')) {
        window.history.pushState({ category: 'videos' }, '', '/videos');
      }
    } else if (activeCategory === 'production') {
      if (selectedAlbum) {
        const newPath = `/production/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name, category: 'production' }, '', newPath);
        }
      } else {
        if (!currentPath.startsWith('/production')) {
          window.history.pushState({ category: 'production' }, '', '/production');
        }
      }
    } else {
      if (selectedAlbum) {
        const newPath = `/album/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name }, '', newPath);
        }
      } else {
        if (currentPath !== '/') {
          window.history.pushState({ album: null }, '', '/');
        }
      }
    }
  }, [selectedAlbum, loading, activeCategory]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/') {
        setSelectedAlbum(null);
        setActiveCategory('music');
      } else if (path.startsWith('/album/') && data) {
        const slug = path.split('/album/')[1];
        const erasValues = (data.eras || []) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('music');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('music');
        }
      } else if (path.startsWith('/production/') && productionData) {
        const slug = path.split('/production/')[1];
        const erasValues = (productionData.eras || []) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('production');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('production');
        }
      } else if (path.startsWith('/production')) {
        setSelectedAlbum(null);
        setActiveCategory('production');
      } else if (path.startsWith('/tracklists/') && data) {
        const slug = path.split('/tracklists/')[1];
        const erasValues = (data.eras || []) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('tracklists');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('tracklists');
        }
      } else if (path.startsWith('/tracklists')) {
        setSelectedAlbum(null);
        setActiveCategory('tracklists');
      } else if (path.startsWith('/art')) {
        setActiveCategory('art');
      } else if (path.startsWith('/stems')) {
        setActiveCategory('stems');
      } else if (path.startsWith('/misc')) {
        setActiveCategory('misc');
      } else if (path.startsWith('/released')) {
        setActiveCategory('released');
      } else if (path.startsWith('/recent')) {
        setActiveCategory('recent');
      } else if (path.startsWith('/settings')) {
        setActiveCategory('settings');
      } else if (path.startsWith('/history')) {
        setActiveCategory('history');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data, productionData]);

  const generateShuffledQueue = (length: number, firstIndex: number) => {
    if (length <= 0) return [];
    const queue = Array.from({ length }, (_, i) => i);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (firstIndex >= 0 && firstIndex < length) {
      const startIdxPos = queue.indexOf(firstIndex);
      if (startIdxPos > -1) {
        queue.splice(startIdxPos, 1);
        queue.unshift(firstIndex);
      }
    }
    return queue;
  };

  const getPlayableSongs = (era: Era) => {
    return Object.values(era.data || {}).flat().filter(s => {
      const rawUrl = s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '');
      const isNotAvailable = isSongNotAvailable(s, rawUrl);
      return rawUrl && (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;
    });
  };

  const handlePlaySong = async (song: Song, era: Era, contextTracks?: Song[], resetShuffleHistory = true, autoPlay = true, isRandomSelection = false) => {
    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    const isNotAvailable = isSongNotAvailable(song, rawUrl);

    const lowerUrl = (rawUrl || '').toLowerCase();
    const isTrulyEmptyLink = !rawUrl || lowerUrl === 'n/a' || lowerUrl.includes('link needed') || lowerUrl.includes('source needed');

    if (isTrulyEmptyLink) return;

    if (isNotAvailable) {
       if (settings.notOpenInNewTab) {
           setPopupUrl(rawUrl);
       } else {
           window.open(rawUrl, '_blank');
       }
       return;
    }

    if (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) {
      let streamUrl = '';
      let isPlayable = true;

      try {
        if (rawUrl.includes('temp.imgur.gg/f/')) {
          const id = rawUrl.split('/f/')[1];
          const res = await axios.get(`https://temp.imgur.gg/api/file/${id}`);

          if (res.data && res.data.cdnUrl) {
            streamUrl = res.data.cdnUrl;
          } else {
            isPlayable = false;
          }
        } else {
          streamUrl = rawUrl;
        }
      } catch (e) {
        isPlayable = false;
      }

      if (!isPlayable || !streamUrl) {
        window.open(rawUrl, '_blank');
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setActivePlayer('audio');

      const contextPlaylist = contextTracks || getPlayableSongs(era);
      const songIndex = contextPlaylist.findIndex(s => s.name === song.name && (s.url || (s.urls && s.urls[0]) || '') === rawUrl);

      setCurrentSong(song);
      setCurrentEra(era);
      setPlaylist(contextPlaylist);
      const idx = songIndex !== -1 ? songIndex : 0;
      setCurrentSongIndex(idx);
      setIsPlayerClosed(false);

      if (resetShuffleHistory) {
        const newQueue = generateShuffledQueue(contextPlaylist.length, idx);
        setShuffledQueue(newQueue);
      }

      if (settings.recordHistory) {
        recordListeningHistory(song.name, era.name);
      }

      if (autoPlay && audioRef.current) {
        audioRef.current.src = streamUrl;
        scrobbledRef.current = false;
        songStartTimeRef.current = Math.floor(Date.now() / 1000);
        setCurrentTime(0);
        setDuration(0);
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(err => {
            console.error("Autoplay failed:", err);
          });
        }

        if (lastfmLoggedIn) {
          const actualEraName = (song as any).realEra?.name || era.name;
          const cleanActualEraName = settings.lastfmEraOverrides[actualEraName] ?? cleanAlbumName(actualEraName).replace(/ \[Fake\]$/i, '');
          const cleanRealTrackName = song.name.replace(/ \[Fake\]$/i, '');
          const lfmTrack = cleanTrackName(cleanRealTrackName, song.extra, settings.lastfmShowVersion, settings.lastfmShowTags, settings.lastfmShowFeats);
          const lfmArtist = parseArtistFromSong(cleanRealTrackName, song.extra, actualEraName);
          updateNowPlaying(lfmTrack, lfmArtist, cleanActualEraName);
        }

        setIsRandomMode(isRandomSelection);
      }
    } else {
      if (settings.notOpenInNewTab) {
        setPopupUrl(rawUrl);
      } else {
        window.open(rawUrl, '_blank');
      }
    }
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    let nextIndex: number;
    if (isShuffle && shuffledQueue.length > 0) {
      const currentShufflePos = shuffledQueue.indexOf(currentSongIndex);
      const nextShufflePos = (currentShufflePos + 1) % shuffledQueue.length;
      nextIndex = shuffledQueue[nextShufflePos];
    } else {
      nextIndex = (currentSongIndex + 1) % playlist.length;
    }
    const nextSong = playlist[nextIndex];
    if (nextSong) {
      const eraToUse = (nextSong as any).realEra || currentEra;
      handlePlaySong(nextSong, eraToUse!, playlist, false);
      setCurrentSongIndex(nextIndex);
    }
  };

  const playPrev = () => {
    if (playlist.length === 0) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    let prevIndex: number;
    if (isShuffle && shuffledQueue.length > 0) {
      const currentShufflePos = shuffledQueue.indexOf(currentSongIndex);
      const prevShufflePos = (currentShufflePos - 1 + shuffledQueue.length) % shuffledQueue.length;
      prevIndex = shuffledQueue[prevShufflePos];
    } else {
      prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    }
    const prevSong = playlist[prevIndex];
    if (prevSong) {
      const eraToUse = (prevSong as any).realEra || currentEra;
      handlePlaySong(prevSong, eraToUse!, playlist, false);
      setCurrentSongIndex(prevIndex);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Play failed:", err));
    }
  };

  const toggleShuffleState = () => {
    const newShuffle = !isShuffle;
    setIsShuffle(newShuffle);
    if (newShuffle) {
      const newQueue = generateShuffledQueue(playlist.length, currentSongIndex);
      setShuffledQueue(newQueue);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (loopMode === 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }
    if (loopMode === 2 && !hasLoopedOnce) {
      if (currentSongIndex >= playlist.length - 1) {
        setHasLoopedOnce(true);
      }
    }
    playNext();
  };

  useEffect(() => {
    const handleEasterEgg = (e: any) => {
      const easterEggSong: Song = {
        name: e.detail?.name || 'Easter Egg',
        url: e.detail?.url || '',
        urls: e.detail?.url ? [e.detail.url] : [],
      };
      const easterEggEra: Era = {
        name: e.detail?.era || 'Easter Egg',
        image: e.detail?.image,
        data: {},
      };
      handlePlaySong(easterEggSong, easterEggEra, [easterEggSong], true);
    };

    window.addEventListener('play-easter-egg', handleEasterEgg);
    return () => window.removeEventListener('play-easter-egg', handleEasterEgg);
  }, []);

  useEffect(() => {
    if (settings.notificationWhenPlaying && currentSong && document.hidden) {
      if (Notification.permission === 'granted') {
        const actualEraName = (currentSong as any).realEra?.name || currentEra?.name;
        const artist = parseArtistFromSong(currentSong.name, currentSong.extra, actualEraName);
        const coverImage = currentSong.image || (currentSong as any).realEra?.image || currentEra?.image || '';

        const notificationTitle = formatTextForNotification(currentSong.name, settings.tagsAsEmojis);
        const notificationBody = formatTextForNotification(artist, settings.tagsAsEmojis);

        try {
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: coverImage,
            silent: true
          });
        } catch (e) {
          console.error("Notification failed", e);
        }
      }
    }
  }, [currentSong, settings.notificationWhenPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);

      if (lastfmLoggedIn && currentSong && currentEra && !scrobbledRef.current) {
        const dur = audioRef.current.duration;
        const cur = audioRef.current.currentTime;
        if (dur > 30 && (cur > dur / 2 || cur > 240)) {
          scrobbledRef.current = true;
          const actualEraName = (currentSong as any).realEra?.name || currentEra.name;
          const cleanActualEraName = settings.lastfmEraOverrides[actualEraName] ?? cleanAlbumName(actualEraName).replace(/ \[Fake\]$/i, '');
          const cleanRealTrackName = currentSong.name.replace(/ \[Fake\]$/i, '');
          const lfmTrack = cleanTrackName(cleanRealTrackName, currentSong.extra, settings.lastfmShowVersion, settings.lastfmShowTags, settings.lastfmShowFeats);
          const lfmArtist = parseArtistFromSong(cleanRealTrackName, currentSong.extra, actualEraName);
          scrobbleTrack(
            lfmTrack,
            lfmArtist,
            cleanActualEraName,
            songStartTimeRef.current,
            Math.floor(dur)
          );
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = volume;
      if (timeToRestoreRef.current !== null) {
        audioRef.current.currentTime = timeToRestoreRef.current;
        setCurrentTime(timeToRestoreRef.current);
        timeToRestoreRef.current = null;
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handlePlaySpotifyTrack = async (uri: string) => {
    const ok = await spotifyControls.playUri(uri);
    if (!ok) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setActivePlayer('spotify');
    setIsPlayerClosed(false);
  };

  const handlePlayReleasedAudio = (url: string, name: string, eraName: string, length?: string) => {
    const era = erasArray.find(e => e.name === eraName) ?? { name: eraName, image: undefined, data: {} };
    const song: Song = { name, url, track_length: length };
    handlePlaySong(song, era as Era, [song]);
  };

  const handlePlayYoutubeTrack = (videoId: string, title?: string) => {
    if (!youtubeState.isReady) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    youtubeControls.loadVideo(videoId, title);
    setActivePlayer('youtube');
    setIsPlayerClosed(false);
  };

  const handlePlaySoundCloudTrack = (url: string) => {
    if (!soundcloudState.isReady) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    soundcloudControls.loadTrack(url);
    setActivePlayer('soundcloud');
    setIsPlayerClosed(false);
  };

  const handlePlayArchiveTrack = (url: string, name: string, eraName: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setActivePlayer('audio');
    const era = erasArray.find(e => e.name === eraName) ?? { name: eraName, image: undefined, data: {} };
    const song: Song = { name, url };
    setCurrentSong(song);
    setCurrentEra(era as Era);
    setIsPlayerClosed(false);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
    }
  };

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function spotifyTrackToSong(track: SpotifyTrack): Song {
    return {
      name: track.name,
      extra: track.artists.join(', '),
      url: '',
      image: track.albumArt,
      track_length: formatTime(track.duration / 1000),
    };
  }

  function spotifyTrackToEra(track: SpotifyTrack): Era {
    return {
      name: track.album,
      image: track.albumArt,
      data: {},
    };
  }

  const handleCategoryChange = (cat: Category) => {
    if (cat === 'music' && selectedAlbum) {
      if (!finalErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    } else if (cat === 'production' && selectedAlbum) {
      if (!productionErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    } else if (cat === 'tracklists' && selectedAlbum) {
      if (!finalErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    }
    setActiveCategory(cat);
  };

  const handleHomeClick = () => {
    setSelectedAlbum(null);
    if (!settings.rememberSearch) {
      setSearchQuery('');
    }
    setActiveCategory('music');
  };

  if (loading || loadingFading) {
    const screen = LOADING_SCREENS.find(s => s.id === settings.loadingScreen);
    return (
      <div
        className="h-screen w-full relative bg-black overflow-hidden transition-opacity duration-700"
        style={{ opacity: loadingFading ? 0 : 1 }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {screen?.type === 'gif' && screen.url && (
            <img src={screen.url} alt={screen.label} className="w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] object-contain" onLoad={() => setGifReady(true)} />
          )}
          {screen?.type === 'video' && screen.url && (
            <video src={screen.url} autoPlay loop playsInline className="w-[400px] h-[400px] object-contain" ref={(el) => { if (el) el.muted = true; }} />
          )}
          {(!screen || screen.type === 'none') && (
            <div className="animate-pulse text-sm font-bold tracking-widest uppercase text-white/50">Loading Songs...</div>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-yzy-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-red-500">Failed to load data.</div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  let erasArray = ((data.eras || []) as Era[])
    .filter(era => !HIDDEN_ALBUMS.includes(era.name))
    .map(era => ({
      ...era,
      fileInfo: CUSTOM_ALBUM_INFO[era.name] || era.fileInfo
    })) as Era[];

  let productionErasArray = ((productionData?.eras || []) as Era[])
    .map(era => ({
      ...era,
      fileInfo: CUSTOM_ALBUM_INFO[era.name] || era.fileInfo
    })) as Era[];

  const favoritesEra: Era | null = favoriteKeys.length > 0 ? {
    fileInfo: [],
    name: "Favorites",
    image: "https://i.ibb.co/JFnmJ8rX/image.png",
    data: {
      "Favorite Tracks": favoriteKeys.map(k => {
        let realEra = erasArray.find(e => e.name === k.eraName) || productionErasArray.find(e => e.name === k.eraName);
        if (!realEra && k.eraName === 'Recent Leaks') {
            realEra = { fileInfo: [], name: "Recent Leaks", image: undefined, data: { "Latest Additions": recentData } };
        }
        let foundSong: Song | null = null;
        if (realEra && realEra.data) {
           const allSongs = Object.values(realEra.data).flat();
           foundSong = allSongs.find(s => s.name === k.songName && (s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '')) === k.url) as Song;
        }
        if (!foundSong && k.eraName === 'Recent Leaks') {
           foundSong = recentData.find(s => s.name === k.songName && (s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '')) === k.url) as Song;
        }
        if (!foundSong && k.song) {
           foundSong = k.song;
        }

        if (foundSong) {
           const actualRealEra = realEra as Era;
           const rawEraName = foundSong.extra2 || foundSong.extra;
           const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
           const actualRealEraNameSearch = actualRealEra?.name || '';
           return { ...foundSong, realEra: actualRealEra, image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[actualRealEraNameSearch || ''] || actualRealEra?.image || foundSong.image || "https://i.ibb.co/JFnmJ8rX/image.png" };
        }
        return null;
      }).filter(s => s !== null) as Song[]
    }
  } : null;

  const finalErasArray = [...erasArray];
  if (favoritesEra) {
    finalErasArray.unshift(favoritesEra);
  }

  const filteredEras = finalErasArray.filter(era => {
    const hasActiveFilters = filters.tags.length > 0 || filters.qualities.length > 0 || filters.availableLengths?.length > 0 || filters.durationValue !== '' || filters.playableOnly || filters.hasClips !== null || filters.hasRemixes !== null || filters.hasSamples !== null;

    if (!searchQuery && !hasActiveFilters) return true;

    const allSongs = Object.values(era.data || {}).flat();

    const matchingSongs = allSongs.filter(song => {
      if (!matchesFilters(song, searchQuery, filters)) return false;
      return true;
    });

    if (hasActiveFilters) {
      return matchingSongs.length > 0;
    }

    return era.name.toLowerCase().includes(searchQuery.toLowerCase()) || matchingSongs.length > 0;
  });

  const filteredProductionEras = productionErasArray.filter(era => {
    const hasActiveFilters = filters.tags.length > 0 || filters.qualities.length > 0 || filters.availableLengths?.length > 0 || filters.durationValue !== '' || filters.playableOnly || filters.hasClips !== null || filters.hasRemixes !== null || filters.hasSamples !== null;

    if (!searchQuery && !hasActiveFilters) return true;

    const allSongs = Object.values(era.data || {}).flat();

    const matchingSongs = allSongs.filter(song => {
      if (!matchesFilters(song, searchQuery, filters)) return false;
      return true;
    });

    if (hasActiveFilters) {
      return matchingSongs.length > 0;
    }

    return era.name.toLowerCase().includes(searchQuery.toLowerCase()) || matchingSongs.length > 0;
  });

  const recentEra: Era = {
    name: "Recent Leaks",
    image: undefined,
    data: {
      "Latest Additions": recentData
        .map(song => {
          const rawEraName = song.extra2 || song.extra;
          const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
          const realEra = (data?.eras || []).find((e: any) => e.name === rawEraName || e.name === cleanEraName) as Era;
          return {
            ...song,
            image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[realEra?.name || ''] || realEra?.image || song.image,
            realEra
          };
        })
    }
  };

  const handleRandomSongClick = () => {
    const sourceData = (activeCategory === 'production') ? productionData : data;
    if (!sourceData?.eras) return;

    const allMusicSongs: (Song & { realEra: Era })[] = [];
    (sourceData.eras as Era[]).forEach((era: Era) => {

      if (era.data) {
        Object.values(era.data).flat().forEach(song => {
          const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
          const isNotAvailable = isSongNotAvailable(song, rawUrl);
          const isPlayable = rawUrl && (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;

          if (isPlayable) {
             allMusicSongs.push({ ...song, realEra: era });
          }
        });
      }
    });

    if (allMusicSongs.length === 0) return;

    const randomIdx = Math.floor(Math.random() * allMusicSongs.length);
    const randomSong = allMusicSongs[randomIdx];

    let contextPlaylist: Song[] = [];
    if (isShuffle) {
      const others = allMusicSongs.filter((_, idx) => idx !== randomIdx);
      const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 50);
      contextPlaylist = [randomSong, ...shuffledOthers];
    } else {
      contextPlaylist = [randomSong];
    }

    handlePlaySong(randomSong, randomSong.realEra, contextPlaylist, true, true, true);
  };

  randomSongRef.current = handleRandomSongClick;

  const isSpotifyActive = activePlayer === 'spotify';
  const isYoutubeActive = activePlayer === 'youtube';
  const isSoundCloudActive = activePlayer === 'soundcloud';

  const youtubeSong: Song | null = isYoutubeActive && youtubeState.currentVideo
    ? { name: youtubeState.currentVideo.title || 'YouTube', extra: 'YouTube', url: '', image: youtubeState.currentVideo.thumbnail, track_length: formatTime(youtubeState.duration) }
    : null;

  const soundcloudSong: Song | null = isSoundCloudActive && soundcloudState.currentTrack
    ? { name: soundcloudState.currentTrack.title, extra: soundcloudState.currentTrack.artist, url: '', image: soundcloudState.currentTrack.thumbnail, track_length: formatTime(soundcloudState.currentTrack.duration / 1000) }
    : null;

  const effectiveSong = isSpotifyActive && spotifyState.currentTrack
    ? spotifyTrackToSong(spotifyState.currentTrack)
    : isYoutubeActive && youtubeSong ? youtubeSong
    : isSoundCloudActive && soundcloudSong ? soundcloudSong
    : currentSong;
  const effectiveEra = isSpotifyActive && spotifyState.currentTrack
    ? spotifyTrackToEra(spotifyState.currentTrack)
    : isYoutubeActive && youtubeState.currentVideo
    ? { name: 'YouTube', image: youtubeState.currentVideo.thumbnail, data: {} }
    : isSoundCloudActive && soundcloudState.currentTrack
    ? { name: 'SoundCloud', image: soundcloudState.currentTrack.thumbnail, data: {} }
    : currentEra;
  const effectiveIsPlaying = isSpotifyActive
    ? spotifyState.isPlaying
    : isYoutubeActive ? youtubeState.isPlaying
    : isSoundCloudActive ? soundcloudState.isPlaying
    : isPlaying;
  const effectiveCurrentTime = isSpotifyActive
    ? spotifyState.position / 1000
    : isYoutubeActive ? youtubeState.position
    : isSoundCloudActive ? soundcloudState.position
    : currentTime;
  const effectiveDuration = isSpotifyActive && spotifyState.currentTrack
    ? spotifyState.currentTrack.duration / 1000
    : isYoutubeActive ? youtubeState.duration
    : isSoundCloudActive ? soundcloudState.duration
    : duration;
  const effectiveTogglePlay = isSpotifyActive
    ? () => { spotifyControls.togglePlay(); }
    : isYoutubeActive ? () => { youtubeControls.togglePlay(); }
    : isSoundCloudActive ? () => { soundcloudControls.togglePlay(); }
    : togglePlay;
  const effectiveSeek = isSpotifyActive
    ? (t: number) => spotifyControls.seek(t * 1000)
    : isYoutubeActive ? (t: number) => youtubeControls.seek(t)
    : isSoundCloudActive ? (t: number) => soundcloudControls.seek(t)
    : handleSeek;
  const effectiveVolumeChange = isSpotifyActive
    ? (v: number) => spotifyControls.setVolume(v)
    : isYoutubeActive ? (v: number) => youtubeControls.setVolume(v)
    : isSoundCloudActive ? (v: number) => soundcloudControls.setVolume(v)
    : setVolume;
  const effectiveNext = isSpotifyActive ? () => spotifyControls.next() : playNext;
  const effectivePrev = isSpotifyActive ? () => spotifyControls.prev() : playPrev;
  const showPlayer = !!effectiveSong && !isFullScreen && !isPlayerClosed;

  return (
    <div className="h-dvh w-full flex overflow-hidden relative bg-yzy-black">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        crossOrigin="anonymous"
        playsInline
      />

      <AnimatePresence>
        {popupUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <span className="text-white/50 text-sm">External Link:</span>
                  <span className="text-white font-medium truncate text-sm">{popupUrl}</span>
                </div>
                <button
                  onClick={() => setPopupUrl(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 bg-white w-full h-full relative">
                <iframe
                  src={popupUrl}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          onHomeClick={handleHomeClick}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          lastfmLoggedIn={lastfmLoggedIn}
          onLastfmLogout={() => setLastfmLoggedIn(false)}
          onRandomSongClick={handleRandomSongClick}
          isRandomMode={isRandomMode}
          spotifyLoggedIn={spotifyLoggedIn}
          onSpotifyLogin={startSpotifyAuth}
          onSpotifyLogout={() => { clearSpotifySession(); setSpotifyLoggedIn(false); setActivePlayer('audio'); }}
          chatOpen={chatOpen}
          onChatClick={() => setChatOpen(v => !v)}
        />

        <main className={`flex-1 overflow-y-auto relative scroll-smooth bg-[#0a0a0a] flex flex-col ${showPlayer ? 'pb-44 md:pb-28' : ''}`}>
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeCategory === 'settings' ? (
                <SettingsView key="settings" onCategoryChange={setActiveCategory} searchQuery={searchQuery} eras={erasArray} artData={artData} stemsData={stemsData} miscData={miscData} />
              ) : activeCategory === 'history' ? (
                <HistoryView key="history" searchQuery={searchQuery} filters={filters} eras={erasArray} historyData={recentData} />
              ) : activeCategory === 'art' ? (
                <ArtGallery key="art" eras={erasArray} artData={artData} searchQuery={searchQuery} filters={filters} />
              ) : activeCategory === 'stems' ? (
                <StemsView
                  key="stems"
                  eras={erasArray}
                  stemsData={stemsData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />
              ) : activeCategory === 'misc' ? (
                <MiscView
                  key="misc"
                  eras={erasArray}
                  miscData={miscData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />
              ) : activeCategory === 'tracklists' && selectedAlbum ? (
                <TracklistsView
                  key={`tracklists-${selectedAlbum.name}`}
                  data={tracklistsData.filter(t => t.era.toLowerCase() === selectedAlbum.name.toLowerCase())}
                  searchQuery={searchQuery}
                  eras={erasArray}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  era={selectedAlbum}
                  onBack={() => setSelectedAlbum(null)}
                />
              ) : activeCategory === 'tracklists' ? (
                <EraGrid key="tracklists-grid" eras={filteredEras.filter(e => e.name !== 'Favorites')} onSelectEra={setSelectedAlbum} />
              ) : activeCategory === 'fakes' ? (
                <FakesView
                  key="fakes"
                  eras={erasArray}
                  fakesData={fakesData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong || null}
                  isPlaying={isPlaying}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />
              ) : activeCategory === 'videos' ? (
                <VideosView
                  key="videos"
                  eras={erasArray}
                  videosData={videosData}
                  searchQuery={searchQuery}
                />
              ) : activeCategory === 'released' ? (
                <ReleasedView
                  key="released"
                  eras={erasArray}
                  releasedData={releasedData}
                  searchQuery={searchQuery}
                  spotifyLoggedIn={spotifyLoggedIn}
                  spotifyReady={spotifyState.isReady}
                  onPlaySpotify={handlePlaySpotifyTrack}
                  youtubeReady={youtubeState.isReady}
                  onPlayYoutube={handlePlayYoutubeTrack}
                  onPlayAudio={handlePlayReleasedAudio}
                  soundcloudReady={soundcloudState.isReady}
                  onPlaySoundCloud={handlePlaySoundCloudTrack}
                  onPlayArchive={handlePlayArchiveTrack}
                  onEmbed={() => { audioRef.current?.pause(); setIsPlaying(false); }}
                />
              ) : activeCategory === 'recent' ? (
                <EraDetail
                  key="recent"
                  era={recentEra}
                  onPlaySong={handlePlaySong}
                  searchQuery={searchQuery}
                  filters={filters}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  favoriteKeys={favoriteKeys}
                  toggleFavorite={toggleFavorite}
                />
              ) : activeCategory === 'production' && selectedAlbum ? (
                <EraDetail
                  key={`production-${selectedAlbum.name}`}
                  era={selectedAlbum}
                  onBack={() => {
                    setSelectedAlbum(null);
                    if (!settings.rememberSearch) {
                      setSearchQuery('');
                    }
                  }}
                  onPlaySong={handlePlaySong}
                  searchQuery={searchQuery}
                  filters={filters}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  favoriteKeys={favoriteKeys}
                  toggleFavorite={toggleFavorite}
                />
              ) : activeCategory === 'production' ? (
                <EraGrid key="production-grid" eras={filteredProductionEras} onSelectEra={setSelectedAlbum} />
              ) : selectedAlbum ? (
                <EraDetail
                  key={selectedAlbum.name}
                  era={selectedAlbum}
                  onBack={() => {
                    setSelectedAlbum(null);
                    if (!settings.rememberSearch) {
                      setSearchQuery('');
                    }
                  }}
                  onPlaySong={handlePlaySong}
                  searchQuery={searchQuery}
                  filters={filters}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  favoriteKeys={favoriteKeys}
                  toggleFavorite={toggleFavorite}
                />
              ) : (
                <EraGrid key="grid" eras={filteredEras} onSelectEra={setSelectedAlbum} />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto px-6 py-8 text-center border-t border-white/5">
            <p className="text-[10px] text-white/30 leading-relaxed">
              DREGOLD does not host or hold any illegal files. All links are external and provided as-is for educational and archival purposes only.
            </p>
            <p className="text-[10px] text-white/30 leading-relaxed">
              DREGOLD 2026 © [V1.0]
            </p>
            <p className="text-[10px] text-white/30 leading-relaxed mt-1 space-x-3">
              <a href="https://discord.gg/TYqdey3B" target="_blank" rel="noopener noreferrer" className="text-[var(--theme-color)]/50 hover:text-[var(--theme-color)] transition-colors underline">Discord</a>
            </p>
          </div>
        </main>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showPlayer && effectiveSong && (
            <PlayerBar
              currentSong={effectiveSong}
              isPlaying={effectiveIsPlaying}
              togglePlay={effectiveTogglePlay}
              onFullScreen={() => {
                setIsFullScreen(true);
                setShowQueue(false);
              }}
              onClose={() => setIsPlayerClosed(true)}
              era={effectiveEra}
              currentTime={effectiveCurrentTime}
              duration={effectiveDuration}
              onSeek={effectiveSeek}
              volume={volume}
              onVolumeChange={effectiveVolumeChange}
              onNext={effectiveNext}
              onPrev={effectivePrev}
              isShuffle={isShuffle}
              toggleShuffle={toggleShuffleState}
              loopMode={loopMode}
              toggleLoop={() => setLoopMode((prev) => (prev + 1) % 3)}
              isFavorite={!isSpotifyActive && !isYoutubeActive && !isSoundCloudActive && currentSong ? favoriteKeys.some(k => k.songName === currentSong.name && k.url === (currentSong.url || (currentSong.urls && currentSong.urls[0]) || '')) : false}
              toggleFavorite={!isSpotifyActive && !isYoutubeActive && !isSoundCloudActive && currentSong ? () => toggleFavorite(currentSong, currentEra?.name || '') : undefined}
              onShowQueue={() => setShowQueue(true)}
              showQueue={showQueue}
              setShowQueue={setShowQueue}
              allowDownload={activeCategory !== 'released'}
              allowFullScreen={!isSpotifyActive && !isSoundCloudActive}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isPlayerClosed && effectiveSong && !isFullScreen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.8, ease: [0.2, 0, 0, 1] } }}
              transition={{ duration: 1.5, ease: [0.2, 0, 0, 1] }}
              className="fixed right-6 z-50 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform drop-shadow-2xl"
              style={{ bottom: 'calc(100vh - 100dvh + 1.5rem)' }}
              onClick={() => setIsPlayerClosed(false)}
              title="Restore Player"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 2000 2000">
                <circle fill="#222" stroke="rgba(255,255,255,0.15)" strokeWidth="80" cx="1000.5" cy="1000.5" r="890.5"/>
                <g transform="translate(1000.5, 1020)">
                  <path stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M -250 125 L 0 -125 L 250 125" />
                </g>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {isFullScreen && isYoutubeActive && youtubeState.currentVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeState.currentVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0`}
              className="w-full h-full max-w-6xl max-h-[80vh]"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </motion.div>
        )}
        {isFullScreen && effectiveSong && !isSpotifyActive && !isYoutubeActive && !isSoundCloudActive && (
          <FullScreenPlayer
            currentSong={currentSong!}
            nextSong={playlist.length > 0 ? playlist[(currentSongIndex + 1) % playlist.length] : null}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onClose={() => setIsFullScreen(false)}
            era={currentEra}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            audioRef={audioRef}
            analyserRef={analyserRef}
            onNext={playNext}
            onPrev={playPrev}
            isShuffle={isShuffle}
            toggleShuffle={toggleShuffleState}
            loopMode={loopMode}
            toggleLoop={() => setLoopMode((prev) => (prev + 1) % 3)}
            playlist={playlist}
            currentSongIndex={currentSongIndex}
            shuffledQueue={shuffledQueue}
            volume={volume}
            onVolumeChange={setVolume}
            onPlaySong={(idx) => {
              setCurrentSongIndex(idx);
              const targetSong = playlist[idx];
              if (targetSong && currentEra) {
                const eraToPass = (targetSong as any).realEra || currentEra;
                handlePlaySong(targetSong, eraToPass, playlist, true, true, isRandomMode);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQueue && (
          <QueueModal
            onClose={() => setShowQueue(false)}
            playlist={playlist}
            currentSongIndex={currentSongIndex}
            shuffledQueue={shuffledQueue}
            isShuffle={isShuffle}
            loopMode={loopMode}
            onPlaySong={(idx) => {
              setCurrentSongIndex(idx);
              const targetSong = playlist[idx];
              if (targetSong && currentEra) {
                const eraToPass = (targetSong as any).realEra || currentEra;
                handlePlaySong(targetSong, eraToPass, playlist, false, true, false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChangelog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display text-center">
                Welcome to DREGOLD
              </h2>
              <div className="space-y-4 mb-8 text-sm text-white/70 leading-relaxed font-medium text-center">
                <p>
                  The best Dr. Dre unreleased music tracker. Browse Main Projects and Production Projects.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowChangelog(false);
                  localStorage.setItem('dregold_v1_seen', 'true');

                  const userAgent = navigator.userAgent.toLowerCase();
                  const isBrowserSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('android');
                  if (isBrowserSafari) {
                    setTimeout(() => setShowSafariWarning(true), 400);
                  }
                }}
                className="w-full bg-[var(--theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSafariWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display text-center">
                Safari Not Recommended
              </h2>
              <div className="space-y-4 mb-8 text-sm text-white/70 leading-relaxed font-medium text-center">
                <p>
                  It looks like you are using Safari. This site does not work well on Safari and it is highly recommended to use Google Chrome or any other browser for the best experience.
                </p>
              </div>
              <button
                onClick={() => setShowSafariWarning(false)}
                className="w-full bg-[var(--theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiscordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display text-center">
                Discord Rich Presence
              </h2>
              <div className="space-y-4 text-sm text-white/70 leading-relaxed font-medium text-center">
                <p>To use this feature, you must install the requested browser extension.</p>
                <div className="py-4">
                  <a
                    href="https://chromewebstore.google.com/detail/premid/pnapphbjbnhnnaoaamigfghfkefojekp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[var(--theme-color)] text-black font-bold uppercase px-6 py-2 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
                  >
                    Install Extension
                  </a>
                </div>
                <p className="text-xs text-white/40">Once installed, your current song will appear on your Discord profile.</p>
              </div>
              <div className="mt-8">
                <button
                  onClick={() => setShowDiscordModal(false)}
                  className="w-full bg-white/10 text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(255,255,255,0.2)] text-[15px] font-bold tracking-wide z-[10100] flex items-center gap-3"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ChatBubble
        data={data}
        screenContext={{
          activeCategory,
          selectedAlbumName: selectedAlbum?.name,
          currentSongName: currentSong?.name,
          currentEraName: currentEra?.name,
        }}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
