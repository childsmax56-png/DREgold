import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Era, Song } from '../types';
import { ALBUM_RELEASE_DATES, CUSTOM_IMAGES } from '../utils';
import { HelpCircle } from 'lucide-react';

interface TimelineViewProps {
  eras: Era[];
  relatedEras?: Era[];
  onSelectEra: (era: Era) => void;
  searchQuery?: string;
}

interface EraEntry {
  era: Era;
  date: Date | null;
  dateStr: string;
  songCount: number;
  playableCount: number;
}

function parseDateStr(raw: string): Date | null {
  if (!raw || raw.includes('?')) return null;
  const [mm, dd, yyyy] = raw.split('/');
  if (!mm || !dd || !yyyy) return null;
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  return isNaN(d.getTime()) ? null : d;
}

function formatMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function countSongs(era: Era) {
  const all = Object.values(era.data || {}).flat() as Song[];
  const playable = all.filter(s => {
    const url = s.url || (s.urls && s.urls[0]) || '';
    return url && (url.includes('pillows.su/f/') || url.includes('temp.imgur.gg/f/'));
  });
  return { total: all.length, playable: playable.length };
}

export function TimelineView({ eras, relatedEras = [], onSelectEra, searchQuery = '' }: TimelineViewProps) {
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);
  const allEras = useMemo(() => [...eras, ...relatedEras], [eras, relatedEras]);

  const { dated, undated } = useMemo(() => {
    const entries: EraEntry[] = allEras.map(era => {
      const rawDate = ALBUM_RELEASE_DATES[era.name] || '';
      const { total, playable } = countSongs(era);
      return {
        era,
        date: parseDateStr(rawDate),
        dateStr: rawDate,
        songCount: total,
        playableCount: playable,
      };
    });

    const q = searchQuery.toLowerCase().trim();

    const filtered = q
      ? entries.filter(e => e.era.name.toLowerCase().includes(q))
      : entries;

    const dated = filtered
      .filter(e => e.date !== null)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());

    const undated = filtered.filter(e => e.date === null);

    return { dated, undated };
  }, [allEras, searchQuery]);

  const byYear = useMemo(() => {
    const map = new Map<number, EraEntry[]>();
    for (const entry of dated) {
      const year = entry.date!.getFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [dated]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3 }}
      className="px-4 md:px-10 py-8 max-w-4xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Timeline</h1>
        <p className="text-sm text-white/40">Projects ordered by release or session date</p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[110px] top-0 bottom-0 w-px bg-white/10 pointer-events-none" />

        {byYear.map(([year, entries]) => (
          <div key={year} className="mb-10">
            {/* Year label */}
            <div className="flex items-center gap-4 mb-4 sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-sm py-2">
              <span className="w-[104px] text-right text-base font-bold text-[var(--theme-color)] shrink-0 pr-1">
                {year}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-3">
              {entries.map(({ era, date, dateStr, songCount, playableCount }) => {
                const image = CUSTOM_IMAGES[era.name] || era.image;
                const isHovered = hoveredEra === era.name;
                return (
                  <motion.div
                    key={era.name}
                    layout
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => onSelectEra(era)}
                    onMouseEnter={() => setHoveredEra(era.name)}
                    onMouseLeave={() => setHoveredEra(null)}
                  >
                    {/* Date label */}
                    <div className="w-[104px] text-right shrink-0">
                      <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">
                        {date ? `${formatMonth(date)} ${date.getDate()}` : ''}
                      </span>
                    </div>

                    {/* Dot on the line */}
                    <div className="shrink-0 relative z-10 flex items-center justify-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-150 ${
                          isHovered
                            ? 'bg-[var(--theme-color)] border-[var(--theme-color)] scale-125'
                            : 'bg-[#0a0a0a] border-white/30'
                        }`}
                      />
                    </div>

                    {/* Card */}
                    <div
                      className={`flex items-center gap-3 flex-1 rounded-xl p-3 transition-colors duration-150 ${
                        isHovered ? 'bg-white/8' : 'bg-white/[0.03]'
                      }`}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={era.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                          <HelpCircle className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[var(--theme-color)] transition-colors">
                          {era.name}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {songCount} {songCount === 1 ? 'song' : 'songs'}
                          {playableCount > 0 && (
                            <span className="text-[var(--theme-color)]/60 ml-1">· {playableCount} playable</span>
                          )}
                        </p>
                      </div>
                      {dateStr && !dateStr.includes('?') && (
                        <span className="text-[10px] text-white/25 shrink-0 font-mono">{dateStr}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Undated section */}
        {undated.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-4">
              <span className="w-[104px] text-right text-sm font-bold text-white/30 shrink-0 pr-1">
                Unknown
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-3">
              {undated.map(({ era, songCount, playableCount }) => {
                const image = CUSTOM_IMAGES[era.name] || era.image;
                const isHovered = hoveredEra === era.name;
                return (
                  <motion.div
                    key={era.name}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => onSelectEra(era)}
                    onMouseEnter={() => setHoveredEra(era.name)}
                    onMouseLeave={() => setHoveredEra(null)}
                  >
                    <div className="w-[104px] shrink-0" />
                    <div className="shrink-0 relative z-10">
                      <div
                        className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-150 ${
                          isHovered
                            ? 'bg-white/40 border-white/40 scale-125'
                            : 'bg-[#0a0a0a] border-white/15'
                        }`}
                      />
                    </div>
                    <div
                      className={`flex items-center gap-3 flex-1 rounded-xl p-3 transition-colors duration-150 ${
                        isHovered ? 'bg-white/8' : 'bg-white/[0.03]'
                      }`}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={era.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 opacity-60"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                          <HelpCircle className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/60 truncate group-hover:text-white/80 transition-colors">
                          {era.name}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {songCount} {songCount === 1 ? 'song' : 'songs'}
                          {playableCount > 0 && (
                            <span className="ml-1">· {playableCount} playable</span>
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/20 shrink-0 font-mono">??/??/????</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {dated.length === 0 && undated.length === 0 && (
          <div className="text-center py-20 text-white/30 text-sm">No eras match your search.</div>
        )}
      </div>
    </motion.div>
  );
}
