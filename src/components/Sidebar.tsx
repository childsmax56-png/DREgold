import { motion } from 'motion/react';
import { FolderArchive, Disc3, Star, AlertTriangle, FileAudio, Video, HelpCircle, List, Scissors, Library } from 'lucide-react';

const getIcon = (name: string) => {
  if (name.includes('Unreleased')) return FolderArchive;
  if (name.includes('Released')) return Disc3;
  if (name.includes('Recent')) return Star;
  if (name.includes('Best')) return Star;
  if (name.includes('Grail') || name.includes('Wanted')) return AlertTriangle;
  if (name.includes('Stem')) return FileAudio;
  if (name.includes('Video')) return Video;
  if (name.includes('Misc') || name.includes('Lost')) return HelpCircle;
  if (name.includes('Yedit')) return Scissors;
  if (name.includes('Sub')) return Library;
  return List;
};

export function Sidebar({ tabs, activeTab, setActiveTab }: { tabs: string[], activeTab: string, setActiveTab: (t: string) => void }) {
  return (
    <div className="hidden md:flex w-64 h-full glass-panel flex-col pt-6 pb-24 z-20 relative shrink-0 overflow-y-auto">
      <div className="px-6 mb-8">
        <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">Library</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const Icon = getIcon(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative group ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/80'}`} />
                <span className="truncate text-left">{tab}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto px-6 pt-8">
        <p className="text-[10px] text-white/30 leading-relaxed">
          XGOLD does not host or hold any illegal files. All links are external and provided as-is for educational and archival purposes only. 2026
        </p>
      </div>
    </div>
  );
}
