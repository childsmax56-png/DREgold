import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Trash2, X, Search } from 'lucide-react';
import { getListeningHistory, clearListeningHistory, removeHistoryEntry, HistoryEntry } from '../history';
import { formatTextForNotification, formatTextWithTags, matchesFilters, CUSTOM_IMAGES } from '../utils';
import { useSettings } from '../SettingsContext';
import { SearchFilters, Era, Song } from '../types';

function HistoryItem({ entry, onRemove }: { entry: HistoryEntry, onRemove: (songName: string, eraName: string) => void }) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleRemove = () => {
    if (isConfirming) {
      onRemove(entry.songName, entry.eraName);
    } else {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group">
      <div className="w-16 h-16 rounded-md overflow-hidden bg-white/10 shrink-0">
        {CUSTOM_IMAGES[entry.eraName || ''] || entry.albumArt ? (
          <img src={CUSTOM_IMAGES[entry.eraName || ''] || entry.albumArt} alt={entry.eraName} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-white/30">No Art</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-bold text-white truncate">
          {formatTextWithTags(entry.songName)}
        </h4>
        <p className="text-sm text-white/50 truncate">{entry.artist} • {entry.eraName}</p>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-1 mr-2">
        <span className="text-sm font-medium text-[var(--theme-color)] bg-[var(--theme-color)]/10 px-3 py-1 rounded-md">
          {entry.playCount} {entry.playCount === 1 ? 'play' : 'plays'}
        </span>
        <span className="text-xs text-white/30">
          {new Date(entry.lastPlayed).toLocaleDateString()}
        </span>
      </div>
      <button
        onClick={handleRemove}
        className={`shrink-0 p-2 rounded-md transition-colors ${
          isConfirming 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'text-white/20 hover:text-red-400 hover:bg-red-400/10'
        }`}
        title="Remove from history"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export function HistoryView({ searchQuery = '', filters, eras = [], historyData = [] }: { searchQuery?: string, filters?: SearchFilters, eras?: Era[], historyData?: Song[] }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    setHistory(getListeningHistory());
  }, []);

  const handleClearHistory = () => {
    if (isConfirmingClear) {
      clearListeningHistory();
      setHistory([]);
      setIsConfirmingClear(false);
    } else {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 3000);
    }
  };

  const handleRemoveItem = (songName: string, eraName: string) => {
    const newHistory = removeHistoryEntry(songName, eraName);
    if (newHistory) setHistory(newHistory);
  };

  const filteredHistory = history.filter(entry => {
    let pseudoSong: Song = {
      name: entry.songName,
      extra: entry.eraName
    };
  
    let foundSong: Song | null = null;
    let realEra = eras.find(e => e.name === entry.eraName);
    if (!realEra && entry.eraName === 'Recent Leaks') {
      foundSong = historyData.find(s => s.name === entry.songName) as Song;
    } else if (realEra && realEra.data) {
      const allSongs = Object.values(realEra.data).flat();
      foundSong = allSongs.find(s => s.name === entry.songName) as Song;
    }

    if (foundSong) {
      pseudoSong = { ...foundSong, extra: foundSong.extra || entry.eraName };
    }

    if (filters) {
       return matchesFilters(pseudoSong, searchQuery || localSearch, filters);
    }
    
    const combinedQuery = (searchQuery || localSearch || '').toLowerCase();
    if (combinedQuery) {
       return entry.songName.toLowerCase().includes(combinedQuery) || (entry.eraName && entry.eraName.toLowerCase().includes(combinedQuery));
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 bg-[#050505]"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 bg-[#111] border border-white/5 rounded-xl gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-[var(--theme-color)]" />
              <h2 className="text-2xl font-display font-bold text-white">Listening History</h2>
            </div>
            
            <AnimatePresence>
              {filteredHistory.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleClearHistory}
                  className={`text-sm px-4 py-2 rounded-md transition-colors flex md:hidden items-center gap-2 ${isConfirmingClear ? 'bg-red-500 text-white hover:bg-red-600' : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'}`}
                >
                  <Trash2 className="w-4 h-4" />
                  {isConfirmingClear ? 'Are you sure?' : 'Clear'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto flex-1 md:justify-end">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/30" 
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {filteredHistory.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleClearHistory}
                  className={`text-sm px-4 py-2 rounded-md transition-colors hidden md:flex items-center gap-2 shrink-0 ${isConfirmingClear ? 'bg-red-500 text-white hover:bg-red-600' : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'}`}
                >
                  <Trash2 className="w-4 h-4" />
                  {isConfirmingClear ? 'Are you sure?' : 'Clear History'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {filteredHistory.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 text-white/40"
              >
                <History className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">No listening history yet or no results for search/filter.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-white/5"
              >
                <AnimatePresence initial={false}>
                  {filteredHistory.map((entry, idx) => (
                    <motion.div 
                      key={`${entry.eraName}-${entry.songName}`}
                      initial={false}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, x: 20, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2 }}
                    >
                      <HistoryItem entry={entry} onRemove={handleRemoveItem} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
