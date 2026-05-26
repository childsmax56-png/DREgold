import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Play, ExternalLink, X, Share2, Volume2, Check, Download, Loader2, Film, Disc3, Layers, Star, Pencil } from 'lucide-react';
import { SiYoutube } from 'react-icons/si';
import { Era, Song, SearchFilters } from '../types';
import { useState, useMemo, useEffect } from 'react';
import { formatTextWithTags, getCleanSongNameWithTags, matchesFilters, createSlug, getSongSlug, ALBUM_RELEASE_DATES, isSongNotAvailable, ALBUM_DESCRIPTIONS, HIDDEN_ALBUMS, CUSTOM_IMAGES, getArtistName, buildArtistTag, handleDownloadFile, resolveUrl, detectAudioExt, embedID3Tags, formatTextForNotification } from '../utils';
import { saveAs } from 'file-saver';
import { useSettings } from '../SettingsContext';
import { isLastfmLoggedIn } from '../lastfm';
import { SiLastdotfm } from 'react-icons/si';
import { MvEntry, RemixEntry, SampleEntry } from '../App';
import { AddToPlaylistButton } from './AddToPlaylistButton';

function normalizeName(name: string): string {
  return name
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\n.*/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function findMvsForSong(songName: string, eraName: string, mvData: MvEntry[]): MvEntry[] {
  const normalizedSong = normalizeName(songName);

  let currentCategory = 'Unreleased';
  const matchedMvs: { mv: MvEntry, category: string }[] = [];

  for (const mv of mvData) {
    if (mv.Name === 'Released' || mv.Name === 'Unreleased') {
      currentCategory = mv.Name;
      continue;
    }

    if (!mv.Era || !mv.Name) continue;
    if (mv.Era !== eraName) continue;

    if (mv.Name === "Can't Tell Me Nothing [Music Video]" && (!mv['Link(s)'] || mv['Link(s)'].trim() === "")) {
      mv['Link(s)'] = "https://www.youtube.com/watch?v=E58qLXBfLrs";
    }

    if (!mv['Link(s)'] || mv['Link(s)'].toLowerCase().includes('link needed') || mv['Link(s)'].toLowerCase().includes('source needed')) continue;

    const normalizedMv = normalizeName(mv.Name);
    if (!normalizedMv || !normalizedSong) {
      if (mv.Name === songName || mv.Name.includes(songName) || (songName.length > 2 && songName.includes(mv.Name))) {
         matchedMvs.push({ mv, category: currentCategory });
      }
      continue;
    }

    if (normalizedMv.includes(normalizedSong) || normalizedSong.includes(normalizedMv)) {
      matchedMvs.push({ mv, category: currentCategory });
    }
  }

  const released = matchedMvs.filter(m => m.category === 'Released');
  if (released.length > 0) {
    return released.map(m => m.mv);
  }

  return matchedMvs.map(m => m.mv);
}

export function findRemixesForSong(songName: string, eraName: string, remixData: RemixEntry[]): RemixEntry[] {
  const cleanSong = songName
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\n.*/g, '')
    .replace(/[^a-zA-Z0-9\s']/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (!cleanSong || cleanSong.length < 2) return [];

  return remixData.filter(remix => {
    if (!remix.Era || remix.Era !== eraName) return false;
    const link = remix['Link(s)']?.split('\n')[0]?.trim();
    if (!link || link.toLowerCase().includes('link needed') || link.toLowerCase().includes('source needed')) return false;

    const potentials: string[] = [];

    const parenMatches = [...remix.Name.matchAll(/\(([^)]+)\)/g)];
    for (const m of parenMatches) {
      const inner = m[1].trim().toLowerCase();
      if (inner.startsWith('feat') || inner.startsWith('prod')) continue;
      potentials.push(m[1].trim());
    }

    const firstLine = remix.Name.split('\n')[0];
    const dashIdx = firstLine.indexOf(' - ');
    if (dashIdx >= 0) {
      const title = firstLine.substring(dashIdx + 3).replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      if (title) potentials.push(title);
    } else {
      const title = firstLine.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      if (title) potentials.push(title);
    }

    for (const potential of potentials) {
      const cleanP = potential
        .replace(/[^a-zA-Z0-9\s']/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      if (!cleanP || cleanP.length < 2) continue;
      if (cleanP === cleanSong) return true;
      if (cleanSong.length >= 4 && cleanP.includes(cleanSong)) return true;
      if (cleanP.length >= 4 && cleanSong.includes(cleanP)) return true;
    }

    return false;
  });
}

export function findSamplesForSong(songName: string, eraName: string, samplesData: SampleEntry[]): SampleEntry[] {
  const cleanSong = songName
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\n.*/g, '')
    .replace(/[^a-zA-Z0-9\s']/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (!cleanSong || cleanSong.length < 2) return [];

  return samplesData.filter(sample => {
    if (!sample.Era || sample.Era !== eraName) return false;
    const link = (sample['Link(s)'] || '').split('\n')[0]?.trim();
    if (!link || link.toLowerCase().includes('link needed') || link.toLowerCase().includes('source needed')) return false;

    const sourceSongName = sample["Song Name\n(Special thanks to Isak & Jeen for their invaluable help on this page)"] || sample.Name || '';

    const potentials: string[] = [];

    const parenMatches = [...sourceSongName.matchAll(/\(([^)]+)\)/g)];
    for (const m of parenMatches) {
      const inner = m[1].trim().toLowerCase();
      if (inner.startsWith('feat') || inner.startsWith('prod')) continue;
      potentials.push(m[1].trim());
    }

    const firstLine = sourceSongName.split('\n')[0];
    const dashIdx = firstLine.indexOf(' - ');
    if (dashIdx >= 0) {
      const title = firstLine.substring(dashIdx + 3).replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      if (title) potentials.push(title);
    } else {
      const title = firstLine.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      if (title) potentials.push(title);
    }

    for (const potential of potentials) {
      const cleanP = potential
        .replace(/[^a-zA-Z0-9\s']/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      if (!cleanP || cleanP.length < 2) continue;
      if (cleanP === cleanSong) return true;
      if (cleanSong.length >= 4 && cleanP.includes(cleanSong)) return true;
      if (cleanP.length >= 4 && cleanSong.includes(cleanP)) return true;
    }

    return false;
  });
}

export const handleShareSilent = (song: Song, era: Era): string => {
  let baseUrl = window.location.origin + window.location.pathname;

  if ((era.name === "Recent Leaks" || era.name === "Favorites") && song.realEra) {
    const isHidden = HIDDEN_ALBUMS.includes(song.realEra.name);
    baseUrl = window.location.origin + (isHidden ? "/related/" : "/album/") + createSlug(song.realEra.name);
  }

  const allSongsInEra = Object.values(era.data || {}).flat();
  const songParam = getSongSlug(song, allSongsInEra);
  
  return `${baseUrl}?song=${songParam}`;
};

export function EraDetail({ era, onBack, onPlaySong, searchQuery = '', filters, currentSong, isPlaying, mvData = [], remixData = [], samplesData = [], favoriteKeys = [], toggleFavorite }: { key?: string, era: Era, onBack?: () => void, onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void, searchQuery?: string, filters: SearchFilters, currentSong?: Song | null, isPlaying?: boolean, mvData?: MvEntry[], remixData?: RemixEntry[], samplesData?: SampleEntry[], favoriteKeys?: { songName: string, eraName: string, url: string }[], toggleFavorite?: (song: Song, eraName: string) => void }) {
  const { settings, updateSettings } = useSettings();
  const [zoomedImage, setZoomedImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLatestOnly, setShowLatestOnly] = useState(false);
  const [showFirstOnly, setShowFirstOnly] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(era.name === 'Recent Leaks' ? 15 : 9999);
  const [openRemixKey, setOpenRemixKey] = useState<string | null>(null);
  const [openSampleKey, setOpenSampleKey] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editingLfmName, setEditingLfmName] = useState(false);
  const [lfmNameDraft, setLfmNameDraft] = useState('');

  useEffect(() => {
    setVisibleCount(era.name === 'Recent Leaks' ? 15 : 9999);
  }, [era.name]);

  const handleShare = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    let baseUrl = window.location.origin + window.location.pathname;

    if ((era.name === 'Recent Leaks' || era.name === 'Favorites') && (song as any).realEra) {
      const isHidden = HIDDEN_ALBUMS.includes((song as any).realEra.name);
      baseUrl = window.location.origin + (isHidden ? '/related/' : '/album/') + createSlug((song as any).realEra.name);
    }

    const allSongsInEra = Object.values(era.data || {}).flat();
    const songParam = getSongSlug(song, allSongsInEra);
    const linkToCopy = `${baseUrl}?song=${songParam}`;

    navigator.clipboard.writeText(linkToCopy);
    setToastMessage("Song link copied!");
    setTimeout(() => setToastMessage(null), 3000);
  };


  const handleShareAlbum = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(baseUrl);
    setToastMessage("Album link copied!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadAlbum = async () => {
    if (!allFilteredPlayableSongs.length) {
      setToastMessage("No playable songs found in this album.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsDownloading(true);
    setToastMessage(`Preparing download for ${allFilteredPlayableSongs.length} songs...`);

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    await Promise.all(allFilteredPlayableSongs.map(async (song) => {
      const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
      if (!rawUrl || !(rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/') || rawUrl.includes('ibb.co') || rawUrl.match(/\.(png|jpg|jpeg)$/i) || rawUrl.startsWith('https://i.scdn.co/'))) return;
      try {
        const { fetchUrl, isImage, imageExt } = await resolveUrl(rawUrl);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('fetch failed');
        let blob = await res.blob();
        const songEraName = (song as any).realEra?.name || era.name;
        const songTitle = song.name.includes(' - ') ? song.name.substring(song.name.indexOf(' - ') + 3) : song.name;
        const fileName = settings.tagsAsEmojis ? song.name : formatTextForNotification(song.name, false);
        let ext: string;
        if (isImage) {
          ext = imageExt || await detectAudioExt(blob);
        } else {
          ext = await detectAudioExt(blob);
          if (settings.embedMetadata && ext === '.mp3') {
            const artUrl = song.image || CUSTOM_IMAGES[songEraName] || (song as any).realEra?.image || era.image;
            try {
              blob = await embedID3Tags(blob, {
                title: songTitle,
                artist: buildArtistTag(song.name, songEraName),
                album: songEraName,
                year: ALBUM_RELEASE_DATES[songEraName]?.split('/').pop(),
                artworkUrl: artUrl,
              }, songTitle);
            } catch { /* skip tagging, save raw */ }
          }
        }
        zip.file(`${fileName}${ext}`, blob);
      } catch (err) {
        console.error(`Failed to download ${song.name}:`, err);
      }
    }));

    setToastMessage('Zipping...');
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${era.name}.zip`);
    setToastMessage(null);
    setIsDownloading(false);
  };

  const processedCategories = useMemo(() => {
    return Object.entries(era.data || {}).map(([category, songs]) => {
      let processedSongs = songs.filter(song => {
        if (!matchesFilters(song, searchQuery, filters)) return false;

        if (filters.hasClips) {
          const has = findMvsForSong(song.name, era.name, mvData).length > 0;
          if (filters.hasClips === 'include' && !has) return false;
          if (filters.hasClips === 'exclude' && has) return false;
        }

        if (filters.hasRemixes) {
          const has = findRemixesForSong(song.name, era.name, remixData).length > 0;
          if (filters.hasRemixes === 'include' && !has) return false;
          if (filters.hasRemixes === 'exclude' && has) return false;
        }

        if (filters.hasSamples) {
          const has = findSamplesForSong(song.name, era.name, samplesData).length > 0;
          if (filters.hasSamples === 'include' && !has) return false;
          if (filters.hasSamples === 'exclude' && has) return false;
        }

        return true;
      });

      if (showLatestOnly || showFirstOnly) {
        const getVersionNumber = (name: string): number => {
          const match = name.match(/v(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        };

        const getBaseName = (name: string): string => {
          let base = name.replace(/\[?v\d+\]?/gi, '').trim();
          const hyphenIndex = base.indexOf('-');
          if (hyphenIndex !== -1 && hyphenIndex < base.length - 1) {
            base = base.substring(hyphenIndex + 1);
          }
          return base.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        };

        const versionMap = new Map<string, typeof songs[0]>();

        processedSongs.forEach(song => {
          const vNum = getVersionNumber(song.name);
          if (vNum > 0) {
            const base = getBaseName(song.name);
            const existing = versionMap.get(base);
            if (!existing) {
              versionMap.set(base, song);
            } else {
              const existingNum = getVersionNumber(existing.name);
              if (showLatestOnly && existingNum < vNum) {
                versionMap.set(base, song);
              } else if (showFirstOnly && existingNum > vNum) {
                versionMap.set(base, song);
              }
            }
          }
        });

        const noVersion = processedSongs.filter(s => getVersionNumber(s.name) === 0);
        const versioned = processedSongs.filter(s => {
          const vNum = getVersionNumber(s.name);
          if (vNum === 0) return false;
          const base = getBaseName(s.name);
          return versionMap.get(base) === s;
        });

        processedSongs = [...noVersion, ...versioned];
      }

      return { category, songs: processedSongs };
    }).filter(c => c.songs.length > 0);
  }, [era.data, filters, searchQuery, showLatestOnly, showFirstOnly]);

  const allFilteredPlayableSongs = useMemo(() => {
    return processedCategories.flatMap(c => c.songs).filter(song => {
      const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
      const isNotAvailable = isSongNotAvailable(song, rawUrl);
      return rawUrl && (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;
    });
  }, [processedCategories]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 z-10 bg-yzy-black overflow-y-auto pb-64"
      >
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 md:gap-8 border-b border-white/5 bg-white/5">
          {onBack && (
            <button onClick={onBack} className="cursor-pointer mt-1 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div
            className="w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden bg-white/5 shrink-0 shadow-xl cursor-pointer"
            onClick={() => setZoomedImage(true)}
            title="Click to zoom"
          >
            {era.image ? (
              <img src={era.image} alt={era.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/20 text-center p-4">{era.name}</div>
            )}
          </div>

          <div className="flex flex-col justify-end h-full py-2">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight flex items-center gap-4 flex-wrap">
                <div className="truncate">{formatTextWithTags(era.name)}</div>
                {ALBUM_RELEASE_DATES[era.name] && <div className="text-xl md:text-2xl text-white/30 font-medium bg-white/5 border border-white/5 rounded-lg px-3 py-1 mt-1">{ALBUM_RELEASE_DATES[era.name]}</div>}
              </h1>

              <div className="flex items-center gap-2">
                {era.name !== 'Favorites' && (
                  <button
                    onClick={handleShareAlbum}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Copy album link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}

                {era.name !== 'Recent Leaks' && (
                  showLatestOnly ? (
                    <button
                      onClick={handleDownloadAlbum}
                      disabled={isDownloading}
                      className={`w-auto px-4 h-10 flex items-center justify-center gap-2 rounded-full transition-colors ${isDownloading ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)] opacity-75 cursor-not-allowed' : 'bg-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/30 cursor-pointer'}`}
                      title="Download Final Album"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="text-[10px] font-bold tracking-wider uppercase">Download Final Album</span>
                    </button>
                  ) : showFirstOnly ? (
                    <button
                      onClick={handleDownloadAlbum}
                      disabled={isDownloading}
                      className={`w-auto px-4 h-10 flex items-center justify-center gap-2 rounded-full transition-colors ${isDownloading ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)] opacity-75 cursor-not-allowed' : 'bg-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/30 cursor-pointer'}`}
                      title="Download First Versions"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="text-[10px] font-bold tracking-wider uppercase">Download First Versions</span>
                    </button>
                  ) : searchQuery || filters.tags.length > 0 || filters.qualities.length > 0 || filters.availableLengths.length > 0 || filters.playableOnly || filters.hasClips !== null || filters.hasRemixes !== null || filters.hasSamples !== null ? (
                    <button
                      onClick={handleDownloadAlbum}
                      disabled={isDownloading}
                      className={`w-auto px-4 h-10 flex items-center justify-center gap-2 rounded-full transition-colors ${isDownloading ? 'text-[var(--theme-color)] bg-white/10 opacity-75 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer'}`}
                      title="Download Filtered Songs"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="text-[10px] font-bold tracking-wider uppercase">Download Filtered Songs</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDownloadAlbum}
                      disabled={isDownloading}
                      className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/5 transition-colors ${isDownloading ? 'text-[var(--theme-color)] bg-white/10 opacity-75 cursor-not-allowed' : 'hover:bg-white/10 text-white/50 hover:text-white cursor-pointer'}`}
                      title="Download all songs"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                  )
                )}
              </div>
            </div>

            {isLastfmLoggedIn() && era.name !== 'Favorites' && era.name !== 'Recent Leaks' && (
              <div className="flex items-center gap-2 mb-3">
                <SiLastdotfm className="w-4 h-4 text-[#d51007] shrink-0" />
                {editingLfmName ? (
                  <>
                    <input
                      autoFocus
                      className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white outline-none focus:border-[#d51007] w-48"
                      value={lfmNameDraft}
                      onChange={e => setLfmNameDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const trimmed = lfmNameDraft.trim();
                          const overrides = { ...settings.lastfmEraOverrides };
                          if (trimmed) overrides[era.name] = trimmed;
                          else delete overrides[era.name];
                          updateSettings({ lastfmEraOverrides: overrides });
                          setEditingLfmName(false);
                        } else if (e.key === 'Escape') {
                          setEditingLfmName(false);
                        }
                      }}
                      placeholder={era.name}
                    />
                    <button
                      className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                      onClick={() => {
                        const trimmed = lfmNameDraft.trim();
                        const overrides = { ...settings.lastfmEraOverrides };
                        if (trimmed) overrides[era.name] = trimmed;
                        else delete overrides[era.name];
                        updateSettings({ lastfmEraOverrides: overrides });
                        setEditingLfmName(false);
                      }}
                    >Save</button>
                    <button
                      className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                      onClick={() => setEditingLfmName(false)}
                    >Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-white/40">Scrobbles as:</span>
                    <span className="text-xs text-white/70">{settings.lastfmEraOverrides[era.name] ?? era.name}</span>
                    <button
                      className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                      title="Edit Last.fm album name"
                      onClick={() => {
                        setLfmNameDraft(settings.lastfmEraOverrides[era.name] ?? '');
                        setEditingLfmName(true);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {settings.lastfmEraOverrides[era.name] && (
                      <button
                        className="text-white/20 hover:text-white/50 transition-colors cursor-pointer text-xs"
                        title="Reset to default"
                        onClick={() => {
                          const overrides = { ...settings.lastfmEraOverrides };
                          delete overrides[era.name];
                          updateSettings({ lastfmEraOverrides: overrides });
                        }}
                      >Reset</button>
                    )}
                  </>
                )}
              </div>
            )}

            {(era.description || ALBUM_DESCRIPTIONS[era.name]) && (
              <div className="mb-2 max-w-3xl">
                <p className={`text-white/80 text-sm leading-relaxed ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {era.description || ALBUM_DESCRIPTIONS[era.name]}
                </p>
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-[var(--theme-color)] text-xs font-bold mt-1 hover:underline cursor-pointer"
                >
                  {isDescriptionExpanded ? 'Show Less' : 'Show More...'}
                </button>
              </div>
            )}
            {era.extra && <p className="text-white/60 text-sm max-w-2xl">{formatTextWithTags(era.extra)}</p>}
            {era.fileInfo && era.fileInfo.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {era.fileInfo.map((info, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/70">{info}</span>
                ))}
              </div>
            )}

            {era.name !== 'Recent Leaks' && era.name !== 'Favorites' && (
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowLatestOnly(!showLatestOnly);
                      if (!showLatestOnly) setShowFirstOnly(false);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showLatestOnly ? 'bg-[var(--theme-color)]' : 'bg-white/20'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showLatestOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-medium text-white/80 cursor-pointer" onClick={() => {
                      setShowLatestOnly(!showLatestOnly);
                      if (!showLatestOnly) setShowFirstOnly(false);
                  }}>
                    Show Latest Versions Only
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowFirstOnly(!showFirstOnly);
                      if (!showFirstOnly) setShowLatestOnly(false);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showFirstOnly ? 'bg-[var(--theme-color)]' : 'bg-white/20'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showFirstOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-medium text-white/80 cursor-pointer" onClick={() => {
                      setShowFirstOnly(!showFirstOnly);
                      if (!showFirstOnly) setShowLatestOnly(false);
                  }}>
                    Show First Versions Only
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 md:px-8 mt-8 max-w-6xl mx-auto">
          {processedCategories.map(({ category, songs: processedSongs }) => {
            return (
              <div key={category} className="mb-10">
                <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10">{category}</h3>

                <div className="flex flex-col">
                  <div className="flex items-center px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider border-b border-white/5 mb-2 hidden sm:flex">
                    <div className="w-8">#</div>
                    <div className="flex-1">Title</div>
                    <div className="w-32">Quality</div>
                    <div className="w-24 text-right">Length</div>
                  </div>

                  {processedSongs.slice(0, visibleCount).map((song, i) => {
                    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
                    const isNotAvailable = isSongNotAvailable(song, rawUrl);
                    const lowerUrl = (rawUrl || '').toLowerCase();
                    const isTrulyEmptyLink = !rawUrl || lowerUrl === 'n/a' || lowerUrl.includes('link needed') || lowerUrl.includes('source needed');
                    const isYoutubeLink = (rawUrl.includes('youtube.com/watch') || rawUrl.includes('youtu.be/')) && !isNotAvailable;
                    const isPlayable = (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;
                    const isEmpty = isTrulyEmptyLink || isNotAvailable || lowerUrl.includes('n/a');
                    const isCurrentlyPlaying = (currentSong?.name === song.name && currentSong?.description === song.description) ||
                      (currentSong?.url && song.url && currentSong.url === song.url) ||
                      (currentSong?.urls && song.urls && currentSong.urls.length > 0 && song.urls.length > 0 && currentSong.urls[0] === song.urls[0]);

                    return (
                      <div
                        key={i}
                        onClick={() => !isEmpty && onPlaySong(song, era, allFilteredPlayableSongs)}
                        className={`group flex items-center px-4 py-2.5 rounded-md transition-colors relative ${isEmpty ? 'opacity-50 hover:opacity-100 cursor-default' : 'hover:bg-white/5 cursor-pointer'} ${isCurrentlyPlaying ? 'bg-white/5' : ''}`}
                      >
                        <div className={`w-8 text-sm font-mono flex items-center ${isCurrentlyPlaying ? 'text-[var(--theme-color)]' : 'text-white/40 group-hover:text-white'}`}>
                          <span className={`group-hover:hidden`}>
                            {isCurrentlyPlaying ? <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} /> : (i + 1)}
                          </span>
                          {isEmpty ? (
                            <X className="w-4 h-4 hidden group-hover:block" />
                          ) : isCurrentlyPlaying && isPlaying ? (
                            <Volume2 className="w-4 h-4 hidden group-hover:block text-[var(--theme-color)]" />
                          ) : isPlayable ? (
                            <Play className="w-4 h-4 hidden group-hover:block" />
                          ) : isYoutubeLink ? (
                            <SiYoutube className="w-4 h-4 hidden group-hover:block text-[#FF0000]" />
                          ) : (
                            <ExternalLink className="w-4 h-4 hidden group-hover:block" />
                          )}
                        </div>

                        {(era.name === 'Recent Leaks' || era.name === 'Favorites') && song.image && (
                          <div className="w-10 h-10 rounded shrink-0 mr-3 overflow-hidden bg-white/5 shadow-md">
                            <img src={song.image} alt={song.extra || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-4">
                          <div className={`flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 font-medium ${isCurrentlyPlaying ? 'text-[var(--theme-color)]' : 'text-white'}`}>
                            <span className="break-words whitespace-normal leading-snug">{formatTextWithTags(song.name)}</span>
                            {song.extra && <span className={`text-xs break-words whitespace-normal leading-snug ${isCurrentlyPlaying ? 'text-[var(--theme-color)]/60' : 'text-white/40'}`}>{formatTextWithTags(song.extra)}</span>}
                          </div>
                          {song.description && <div className={`text-xs break-words whitespace-normal leading-snug mt-1 ${isCurrentlyPlaying ? 'text-[var(--theme-color)]/40' : 'text-white/40'}`}>{formatTextWithTags(song.description)}</div>}
                        </div>

                        {isPlayable && (() => {
                          const pillowUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(pillowUrl, '_blank'); }}
                              className={`shrink-0 p-1 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${isCurrentlyPlaying ? 'text-[var(--theme-color)]/60 hover:text-[var(--theme-color)]' : 'text-white/40'}`}
                              title="Open on Pillowcase"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          );
                        })()}

                        <div className="w-32 shrink-0 hidden sm:flex items-center gap-1.5 flex-wrap">
                          {song.quality && (
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${isCurrentlyPlaying ? 'border-[var(--theme-color)]/20 text-[var(--theme-color)]/80 bg-[var(--theme-color)]/5' : 'border-white/10 text-white/60 bg-white/5'}`}>
                              {song.quality}
                            </span>
                          )}
                          {song.available_length && (
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${isCurrentlyPlaying ? 'border-[var(--theme-color)]/20 text-[var(--theme-color)]/80 bg-[var(--theme-color)]/5' : 'border-white/10 text-white/60 bg-white/5'}`}>
                              {song.available_length}
                            </span>
                          )}
                          {era.name === 'Recent Leaks' && song.leak_date && (
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${isCurrentlyPlaying ? 'border-[var(--theme-color)]/20 text-[var(--theme-color)]/80 bg-[var(--theme-color)]/5' : 'border-white/10 text-white/60 bg-white/5'}`}>
                              Leak: {song.leak_date.split('T')[0]}
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center justify-end gap-2 text-right text-xs font-mono hidden sm:flex whitespace-nowrap">
                          <span className={`${isCurrentlyPlaying ? 'text-[var(--theme-color)]/60' : 'text-white/40'}`}>{song.track_length || '-:--'}</span>
                          {(() => {
                            if (!isPlayable || !toggleFavorite || song.name === "Alright but the beat is Father Stretch My Hands Pt. 1") return null;
                            const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
                            const isStarred = favoriteKeys.some(k => k.songName === song.name && k.url === rawUrl);
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(song, (song as any).realEra?.name || era.name); }}
                                className={`p-1 rounded transition-all hover:bg-[var(--theme-color)]/20 cursor-pointer ${isStarred ? 'text-[var(--theme-color)]' : 'text-white/20 hover:text-[var(--theme-color)]'}`}
                                title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
                              >
                                <Star className="w-3.5 h-3.5" fill={isStarred ? "currentColor" : "none"} />
                              </button>
                            );
                          })()}
                          {(() => {
                            if (isEmpty) return null;
                            const songUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
                            const eraNameForPlaylist = (song as any).realEra?.name || era.name;
                            return (
                              <AddToPlaylistButton
                                song={song}
                                eraName={eraNameForPlaylist}
                                url={songUrl}
                                isCurrentlyPlaying={isCurrentlyPlaying}
                              />
                            );
                          })()}
                          {(() => {
                            const mvs = findMvsForSong(song.name, era.name, mvData);
                            if (mvs.length === 0) return null;
                            const firstLink = mvs[0]['Link(s)'].split('\n')[0].trim();
                            if (!firstLink) return null;
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(firstLink, '_blank'); }}
                                className={`p-1 rounded transition-all hover:bg-purple-500/20 text-purple-400/70 hover:text-purple-300 cursor-pointer ${isCurrentlyPlaying ? 'text-purple-400' : ''}`}
                                title={`Watch Music Video`}
                              >
                                <Film className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}
                          {(() => {
                            const remixes = findRemixesForSong(song.name, era.name, remixData);
                            if (remixes.length === 0) return null;
                            const remixKey = `${category}-${i}`;
                            return (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenRemixKey(openRemixKey === remixKey ? null : remixKey);
                                  }}
                                  className={`p-1 rounded transition-all hover:bg-teal-500/20 text-teal-400/70 hover:text-teal-300 cursor-pointer ${isCurrentlyPlaying ? 'text-teal-400' : ''}`}
                                  title={`${remixes.length} Remix${remixes.length > 1 ? 'es' : ''}`}
                                >
                                  <Disc3 className="w-3.5 h-3.5" />
                                </button>
                                {openRemixKey === remixKey && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenRemixKey(null); }} />
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl min-w-[300px] max-h-64 overflow-y-auto">
                                      <div className="px-3 py-2 text-xs text-white/40 border-b border-white/10 font-semibold uppercase tracking-wider sticky top-0 bg-[#1a1a1a]">
                                        Remixes ({remixes.length})
                                      </div>
                                      {remixes.map((remix, ri) => {
                                        const link = remix['Link(s)'].split('\n')[0].trim();
                                        const isPillows = link.includes('pillows.su/f/') || link.includes('temp.imgur.gg/f/');
                                        return (
                                          <button
                                            key={ri}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isPillows) {
                                                const remixSong: Song = {
                                                  name: remix.Name.split('\n')[0] + ' [Remix]',
                                                  description: remix.Notes,
                                                  quality: remix.Quality,
                                                  available_length: remix['Available Length'],
                                                  url: link,
                                                  urls: [link]
                                                };
                                                onPlaySong(remixSong, era);
                                              } else {
                                                window.open(link, '_blank');
                                              }
                                              setOpenRemixKey(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                          >
                                            {isPillows ? <Play className="w-3 h-3 text-teal-400 shrink-0" /> : <ExternalLink className="w-3 h-3 text-white/40 shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-white truncate">{remix.Name.split('\n')[0]}</div>
                                              <div className="text-[10px] text-white/40 truncate">{remix['Artist(s)'].split('\n')[0]}</div>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 shrink-0">{remix.Quality}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                          {(() => {
                            const samples = findSamplesForSong(song.name, era.name, samplesData);
                            if (samples.length === 0) return null;
                            const sampleKey = `${category}-${i}`;
                            return (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenSampleKey(openSampleKey === sampleKey ? null : sampleKey);
                                  }}
                                  className={`p-1 rounded transition-all hover:bg-[#FF4D4D]/20 text-[#FF4D4D]/70 hover:text-[#FF4D4D] cursor-pointer ${isCurrentlyPlaying ? 'text-[#FF4D4D]' : ''}`}
                                  title={`${samples.length} Sample${samples.length > 1 ? 's' : ''}`}
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                </button>
                                {openSampleKey === sampleKey && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenSampleKey(null); }} />
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl min-w-[300px] max-h-64 overflow-y-auto">
                                      <div className="px-3 py-2 text-xs text-white/40 border-b border-white/10 font-semibold uppercase tracking-wider sticky top-0 bg-[#1a1a1a]">
                                        Samples ({samples.length})
                                      </div>
                                      {samples.map((sample, ri) => {
                                        const link = (sample['Link(s)'] || '').split('\n')[0].trim();
                                        if (!link) return null;
                                        const isPillows = link.includes('pillows.su/f/') || link.includes('temp.imgur.gg/f/');
                                        const sampleName = sample["Sample\n(Artist - Track)"] || 'Unknown Sample';
                                        return (
                                          <button
                                            key={ri}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isPillows) {
                                                const sampleSong: Song = {
                                                  name: sampleName.split('\n')[0] + ' [Sample]',
                                                  description: sample.Notes,
                                                  url: link,
                                                  urls: [link]
                                                };
                                                onPlaySong(sampleSong, era);
                                              } else {
                                                window.open(link, '_blank');
                                              }
                                              setOpenSampleKey(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                                          >
                                            {isPillows ? <Play className="w-3 h-3 text-[#FF4D4D] shrink-0" /> : <ExternalLink className="w-3 h-3 text-white/40 shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-white truncate">{sampleName.split('\n')[0]}</div>
                                              <div className="text-[10px] text-white/40 truncate">{sample.Notes?.split('\n')[0] || ''}</div>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 shrink-0">Sample</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                          <button
                            onClick={(e) => isPlayable && handleShare(e, song)}
                            className={`p-1 rounded ${isPlayable ? 'hover:bg-white/10 hover:text-white text-white/40 cursor-pointer' : 'invisible pointer-events-none'} ${isCurrentlyPlaying && isPlayable ? 'hover:bg-[var(--theme-color)]/10 text-[var(--theme-color)]' : ''}`}
                            title={isPlayable ? "Copy direct song link" : undefined}
                            disabled={!isPlayable}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {era.name === 'Recent Leaks' && visibleCount < processedSongs.length && (
                    <div className="mt-8 mb-4 flex justify-center w-full">
                      <button
                        onClick={() => setVisibleCount(prev => prev + 10)}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors uppercase tracking-widest text-xs cursor-pointer active:scale-95"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#0ba345] text-white px-6 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] text-[15px] font-medium tracking-wide z-[9999] flex items-center gap-3"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              {toastMessage}
            </motion.div>
          )}

          {zoomedImage && era.image && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(false)}
              className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
            >
              <img src={era.image} alt={era.name} className="max-w-full max-h-full object-contain shadow-2xl rounded-md" referrerPolicy="no-referrer" />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
