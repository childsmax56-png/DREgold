import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { Era } from '../types';
import { ArtEntry } from './ArtGallery';
import { ArtImage, resolveImbbUrl } from './ArtGallery';
import { CUSTOM_IMAGES } from '../utils';

function isImageUrl(url: string): boolean {
  const lc = url.toLowerCase();
  return (
    url.includes('ibb.co') ||
    url.includes('i.imgur.com') ||
    url.includes('imgur.com/') ||
    url.includes('pillows.su/f/') ||
    url.includes('i.scdn.co') ||
    lc.endsWith('.png') ||
    lc.endsWith('.jpg') ||
    lc.endsWith('.jpeg') ||
    lc.endsWith('.webp') ||
    lc.endsWith('.gif')
  );
}

async function resolveToDirectUrl(url: string): Promise<string> {
  // Non-direct imgbb page URL — resolve to direct image URL
  if (url.includes('ibb.co') && !url.includes('i.ibb.co')) {
    const direct = await resolveImbbUrl(url);
    return direct ?? url;
  }
  return url;
}

interface Props {
  eras: Era[];
  artData: ArtEntry[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function CoverPickerModal({ eras, artData, onSelect, onClose }: Props) {
  const [tab, setTab] = useState<'eras' | 'art'>('eras');
  const [search, setSearch] = useState('');
  const [resolving, setResolving] = useState(false);

  const eraCovers = useMemo(() =>
    eras
      .filter(e => e.name !== 'Favorites' && (CUSTOM_IMAGES[e.name] || e.image))
      .map(e => ({ url: CUSTOM_IMAGES[e.name] || e.image!, label: e.name }))
      .filter(e => !search || e.label.toLowerCase().includes(search.toLowerCase())),
    [eras, search]
  );

  const artCovers = useMemo(() => {
    const seen = new Set<string>();
    return artData
      .map(entry => {
        const url = entry['Link(s)']?.split('\n')[0]?.trim();
        if (!url || !isImageUrl(url) || seen.has(url)) return null;
        seen.add(url);
        return { url, label: entry.Name, era: entry.Era };
      })
      .filter((e): e is { url: string; label: string; era: string } => e !== null)
      .filter(e =>
        !search ||
        e.label.toLowerCase().includes(search.toLowerCase()) ||
        e.era.toLowerCase().includes(search.toLowerCase())
      );
  }, [artData, search]);

  const items = tab === 'eras' ? eraCovers : artCovers;

  const handleSelect = async (url: string) => {
    setResolving(true);
    const direct = await resolveToDirectUrl(url);
    setResolving(false);
    onSelect(direct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10300] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-bold text-white">Choose Cover</h2>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 shrink-0">
          <div className="flex gap-1">
            {(['eras', 'art'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  tab === t
                    ? 'bg-[var(--theme-color)]/20 text-[var(--theme-color)]'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {t === 'eras' ? 'Era Covers' : 'Art Gallery'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1 pl-8 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {resolving ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--theme-color)]/30 border-t-[var(--theme-color)] rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-white/30 text-sm py-12">No results</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(item.url)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/5 hover:border-[var(--theme-color)] transition-all cursor-pointer"
                  title={item.label}
                >
                  <ArtImage url={item.url} alt={item.label} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
