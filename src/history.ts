import { Song, Era } from './types';

export interface HistoryEntry {
  songName: string;
  eraName: string;
  artist: string;
  playCount: number;
  lastPlayed: number;
  albumArt: string;
}

export function getListeningHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const saved = localStorage.getItem('xgold_listening_history');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse listening history', e);
  }
  return [];
}

export function removeHistoryEntry(songName: string, eraName: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    const history = getListeningHistory();
    const updatedHistory = history.filter(e => !(e.songName === songName && e.eraName === eraName));
    localStorage.setItem('xgold_listening_history', JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (e) {
    console.error('Failed to remove listening history entry', e);
  }
}

export function recordListeningHistory(song: Song, era: Era, artist: string, albumArt: string) {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const history = getListeningHistory();
    const existingIndex = history.findIndex(e => e.songName === song.name && e.eraName === era.name);
    
    if (existingIndex >= 0) {
      history[existingIndex].playCount += 1;
      history[existingIndex].lastPlayed = Date.now();
      history[existingIndex].artist = artist;
      history[existingIndex].albumArt = albumArt;
    } else {
      history.push({
        songName: song.name,
        eraName: era.name,
        artist,
        playCount: 1,
        lastPlayed: Date.now(),
        albumArt
      });
    }
    
    history.sort((a, b) => {
      if (b.playCount !== a.playCount) {
        return b.playCount - a.playCount;
      }
      return b.lastPlayed - a.lastPlayed;
    });
    
    localStorage.setItem('xgold_listening_history', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save listening history', e);
  }
}

export function clearListeningHistory() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('xgold_listening_history');
}
