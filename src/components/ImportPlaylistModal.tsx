import { usePlaylists } from '../PlaylistContext';

interface PendingImport {
  name: string;
  cover?: string;
  songs: { songName: string; eraName: string; url: string }[];
}

interface Props {
  pending: PendingImport;
  onDone: () => void;
  onNavigatePlaylists: () => void;
}

export function ImportPlaylistModal({ pending, onDone, onNavigatePlaylists }: Props) {
  const { createPlaylist, addToPlaylist, setCover } = usePlaylists();

  const handleImport = () => {
    const id = createPlaylist(pending.name);
    for (const s of pending.songs) {
      addToPlaylist(id, s);
    }
    if (pending.cover) setCover(id, pending.cover);
    onDone();
    onNavigatePlaylists();
  };

  const handleDismiss = () => {
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[10200] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-xl max-w-sm w-full p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-1">Import Playlist</h2>
        <p className="text-white/50 text-sm mb-4">
          Someone shared a playlist with you.
        </p>
        <div className="bg-white/5 rounded-lg px-4 py-3 mb-6">
          <div className="text-white font-semibold truncate">{pending.name}</div>
          <div className="text-white/40 text-xs mt-0.5">{pending.songs.length} song{pending.songs.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="flex-1 py-2.5 rounded-lg bg-[var(--theme-color)]/20 text-[var(--theme-color)] text-sm font-semibold hover:bg-[var(--theme-color)]/30 transition-colors cursor-pointer"
          >
            Add to My Playlists
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/50 text-sm font-semibold hover:bg-white/10 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
