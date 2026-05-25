import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { Era, Song } from '../types';
import { isSongNotAvailable } from '../utils';
import { ReleasedEntry } from './ReleasedView';

export interface SubAlbumTrack {
  num?: string;
  name: string;
  length?: string;
  status?: 'released' | 'unreleased';
}

export interface SubAlbumEntry {
  name: string;
  parentEras: string[];
  description: string;
  tracks: SubAlbumTrack[];
}

interface SubAlbumsViewProps {
  data: SubAlbumEntry[];
  searchQuery: string;
  eras: Era[];
  releasedData: ReleasedEntry[];
  onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

// ── Song matching (adapted from TracklistsView) ───────────────────────────────

const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function normalizeName(s: string): string {
  return s
    .replace(EMOJI_RE, '')
    .replace(/️/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.startsWith(a)) return true;
  if (b.length >= 5 && a.startsWith(b)) return true;
  return false;
}

interface SongMatch { song: Song; era: Era }

interface SongIndexes {
  byEra: Map<string, SongMatch[]>;
  byName: Map<string, SongMatch>;
}

function buildIndexes(eras: Era[]): SongIndexes {
  const byEra = new Map<string, SongMatch[]>();
  const byName = new Map<string, SongMatch>();

  for (const era of eras) {
    const eraKey = normalizeName(era.name);
    const eraMatches: SongMatch[] = [];

    for (const songs of Object.values(era.data || {})) {
      for (const song of songs as Song[]) {
        const rawUrl = song.url || (song.urls?.[0]) || '';
        if (isSongNotAvailable(song, rawUrl) || !rawUrl) continue;

        const match: SongMatch = { song, era };
        eraMatches.push(match);

        const normSong = normalizeName(song.name);
        if (normSong && !byName.has(normSong)) {
          byName.set(normSong, match);
        }
      }
    }

    if (eraMatches.length) byEra.set(eraKey, eraMatches);
  }

  return { byEra, byName };
}

function extractSongTitleFromReleased(name: string): string {
  const firstLine = name.split('\n')[0].trim();
  const dashIdx = firstLine.indexOf(' - ');
  return dashIdx !== -1 ? firstLine.slice(dashIdx + 3).trim() : firstLine;
}

function extractBestPlayableUrl(linksField: string): string {
  const urls = linksField.split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().includes('link needed') && !l.toLowerCase().includes('source needed'));
  for (const u of urls) {
    if (u.includes('pillows.su/f/') || u.includes('temp.imgur.gg/f/')) return u;
  }
  for (const u of urls) {
    if (/\.(mp3|m4a|wav|ogg|flac|aac)(\?|$)/i.test(u)) return u;
  }
  for (const u of urls) {
    if (u.includes('youtube.com') || u.includes('youtu.be')) return u;
  }
  for (const u of urls) {
    if (u.includes('soundcloud.com')) return u;
  }
  for (const u of urls) {
    if (u.includes('archive.org')) return u;
  }
  return '';
}

function buildReleasedIndex(releasedData: ReleasedEntry[], eras: Era[]): Map<string, SongMatch> {
  const idx = new Map<string, SongMatch>();
  const erasMap = new Map(eras.map(e => [e.name.toLowerCase(), e]));
  for (const entry of releasedData) {
    const url = extractBestPlayableUrl(entry['Link(s)'] || '');
    if (!url) continue;
    const songTitle = extractSongTitleFromReleased(entry.Name || '');
    if (!songTitle) continue;
    const era = erasMap.get((entry.Era || '').toLowerCase()) ?? { name: entry.Era || '', image: undefined, data: {} } as Era;
    const song: Song = { name: songTitle, url, urls: [url], track_length: entry.Length };
    const norm = normalizeName(songTitle);
    if (norm && !idx.has(norm)) idx.set(norm, { song, era });
  }
  return idx;
}

function extractErasFromDescription(description: string, allEras: Era[]): string[] {
  if (!description) return [];
  const lower = description.toLowerCase();
  return allEras
    .filter(era => {
      const eraLower = era.name.toLowerCase();
      return eraLower.length >= 4 && lower.includes(eraLower);
    })
    .map(era => era.name);
}

function findMatch(trackName: string, searchEraNames: string[], idx: SongIndexes, releasedIdx?: Map<string, SongMatch>): SongMatch | null {
  const normTrack = normalizeName(trackName);
  if (!normTrack) return null;

  // Search description-derived + parent eras first (most specific)
  for (const eraName of searchEraNames) {
    const candidates = idx.byEra.get(normalizeName(eraName)) || [];
    for (const c of candidates) {
      if (namesMatch(normTrack, normalizeName(c.song.name))) return c;
    }
  }

  // Exact global unreleased name lookup
  const exact = idx.byName.get(normTrack);
  if (exact) return exact;

  // Prefix scan across unreleased
  if (normTrack.length >= 5) {
    for (const [key, match] of idx.byName) {
      if (namesMatch(normTrack, key)) return match;
    }
  }

  // Fall back to released tab
  if (releasedIdx) {
    const rel = releasedIdx.get(normTrack);
    if (rel) return rel;
    if (normTrack.length >= 5) {
      for (const [key, match] of releasedIdx) {
        if (namesMatch(normTrack, key)) return match;
      }
    }
  }

  return null;
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface SubAlbumCardProps {
  entry: SubAlbumEntry;
  matches: (SongMatch | null)[];
  onPlaySong: (song: Song, era: Era, contextTracks?: Song[]) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

function SubAlbumCard({ entry, matches, onPlaySong, currentSong, isPlaying }: SubAlbumCardProps) {
  const [open, setOpen] = useState(false);

  const playableSongs = useMemo(
    () => matches.filter((m): m is SongMatch => m !== null).map(m => m.song),
    [matches]
  );

  const handlePlay = useCallback((match: SongMatch, e: React.MouseEvent) => {
    e.stopPropagation();
    onPlaySong(match.song, match.era, playableSongs);
  }, [onPlaySong, playableSongs]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{entry.name}</p>
          {entry.parentEras.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {entry.parentEras.map(era => (
                <span
                  key={era}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--theme-color)]/15 text-[var(--theme-color)]/80 border border-[var(--theme-color)]/20"
                >
                  {era}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {entry.tracks.length > 0 && (
            <span className="text-white/30 text-xs">
              {playableSongs.length > 0 ? (
                <span><span className="text-[var(--theme-color)]/60">{playableSongs.length}</span>/{entry.tracks.length}</span>
              ) : (
                entry.tracks.length
              )}{' '}tracks
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05]">
              {entry.description && (
                <p className="text-white/55 text-xs leading-relaxed px-4 py-3">{entry.description}</p>
              )}
              {entry.tracks.length > 0 && (
                <div className={`divide-y divide-white/[0.04] ${entry.description ? 'border-t border-white/[0.04]' : ''}`}>
                  {entry.tracks.map((track, i) => {
                    const match = matches[i] ?? null;
                    const rawUrl = match ? (match.song.url || match.song.urls?.[0] || '') : '';
                    const isCurrentlyPlaying =
                      isPlaying && currentSong && match &&
                      currentSong.name === match.song.name &&
                      (currentSong.url || currentSong.urls?.[0] || '') === rawUrl;

                    return (
                      <div
                        key={i}
                        onClick={match ? (e) => handlePlay(match, e as React.MouseEvent) : undefined}
                        className={`flex items-center gap-3 px-4 py-2 transition-colors group
                          ${match ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-default'}
                          ${isCurrentlyPlaying ? 'bg-white/[0.06]' : ''}`}
                      >
                        <span className="text-white/25 text-xs w-6 text-right shrink-0 font-mono relative">
                          {match ? (
                            <>
                              <span className={`transition-opacity ${isCurrentlyPlaying ? 'opacity-0' : 'group-hover:opacity-0'}`}>
                                {track.num ?? '·'}
                              </span>
                              <span className={`absolute inset-0 flex items-center justify-end transition-opacity
                                ${isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {isCurrentlyPlaying
                                  ? <Pause className="w-3 h-3 text-[var(--theme-color)]" />
                                  : <Play className="w-3 h-3 text-[var(--theme-color)]" />}
                              </span>
                            </>
                          ) : (
                            <span className="opacity-40">{track.num ?? '·'}</span>
                          )}
                        </span>

                        <span className={`text-sm flex-1 min-w-0 truncate transition-colors
                          ${isCurrentlyPlaying
                            ? 'text-[var(--theme-color)] font-medium'
                            : match
                            ? 'text-white/80 group-hover:text-white'
                            : track.status === 'released'
                            ? 'text-emerald-400/70'
                            : 'text-white/35'}`}>
                          {track.name}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {track.status && !match && (
                            <span className={`text-[10px] font-medium ${track.status === 'released' ? 'text-emerald-400/50' : 'text-white/20'}`}>
                              {track.status}
                            </span>
                          )}
                          {track.length && (
                            <span className="text-white/25 text-xs font-mono">{track.length}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {entry.tracks.length === 0 && !entry.description && (
                <p className="text-white/30 text-xs italic px-4 py-3">No additional details available.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function SubAlbumsView({ data, searchQuery, eras, releasedData, onPlaySong, currentSong, isPlaying }: SubAlbumsViewProps) {
  const q = searchQuery.toLowerCase().trim();

  const idx = useMemo(() => buildIndexes(eras), [eras]);
  const releasedIdx = useMemo(() => buildReleasedIndex(releasedData, eras), [releasedData, eras]);

  const allMatches = useMemo(() =>
    data.map(entry => {
      const descEras = extractErasFromDescription(entry.description, eras);
      const searchEras = [...entry.parentEras, ...descEras.filter(e => !entry.parentEras.includes(e))];
      return entry.tracks.map(track => findMatch(track.name, searchEras, idx, releasedIdx));
    }),
    [data, eras, idx, releasedIdx]
  );

  const filtered = useMemo(() => {
    if (!q) return data.map((entry, i) => ({ entry, origIdx: i }));
    return data
      .map((entry, i) => ({ entry, origIdx: i }))
      .filter(({ entry, origIdx }) =>
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.parentEras.some(e => e.toLowerCase().includes(q)) ||
        entry.tracks.some(t => t.name.toLowerCase().includes(q)) ||
        (allMatches[origIdx] || []).some(m => m && m.song.name.toLowerCase().includes(q))
      );
  }, [data, allMatches, q]);

  const totalPlayable = useMemo(() =>
    allMatches.reduce((sum, ms) => sum + ms.filter(Boolean).length, 0),
    [allMatches]
  );

  return (
    <motion.div
      key="subalbums"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full"
    >
      <div className="mb-6">
        <h2 className="text-white font-display font-bold text-xl tracking-tight">Sub Albums</h2>
        <p className="text-white/40 text-xs mt-1">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
          {totalPlayable > 0 && (
            <> · <span className="text-[var(--theme-color)]/70">{totalPlayable} playable</span></>
          )}
          {' '}· Descriptions and tracklists sourced from the XXXTENTACION Wiki
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30 text-sm">No results for "{searchQuery}"</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ entry, origIdx }) => (
            <SubAlbumCard
              key={`${entry.name}-${origIdx}`}
              entry={entry}
              matches={allMatches[origIdx] ?? []}
              onPlaySong={onPlaySong}
              currentSong={currentSong}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
