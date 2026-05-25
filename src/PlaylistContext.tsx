import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPlaylist, PlaylistSong } from './types';

const STORAGE_KEY = 'xgold_playlists';

interface PlaylistContextValue {
  playlists: UserPlaylist[];
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, entry: PlaylistSong) => void;
  removeFromPlaylist: (playlistId: string, url: string, songName: string) => void;
  moveSong: (playlistId: string, from: number, to: number) => void;
  setCover: (id: string, cover: string) => void;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (name: string): string => {
    const id = Math.random().toString(36).slice(2, 10);
    setPlaylists(prev => [...prev, { id, name, songs: [] }]);
    return id;
  };

  const renamePlaylist = (id: string, name: string) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const addToPlaylist = (playlistId: string, entry: PlaylistSong) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      if (p.songs.some(s => s.songName === entry.songName && s.url === entry.url)) return p;
      return { ...p, songs: [...p.songs, entry] };
    }));
  };

  const removeFromPlaylist = (playlistId: string, url: string, songName: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id !== playlistId ? p : { ...p, songs: p.songs.filter(s => !(s.songName === songName && s.url === url)) }
    ));
  };

  const setCover = (id: string, cover: string) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, cover } : p));
  };

  const moveSong = (playlistId: string, from: number, to: number) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      const songs = [...p.songs];
      const [item] = songs.splice(from, 1);
      songs.splice(to, 0, item);
      return { ...p, songs };
    }));
  };

  return (
    <PlaylistContext.Provider value={{ playlists, createPlaylist, renamePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, moveSong, setCover }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylists must be used within PlaylistProvider');
  return ctx;
}
