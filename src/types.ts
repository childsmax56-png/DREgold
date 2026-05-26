export interface Song {
  name: string;
  extra?: string;
  extra2?: string;
  description?: string;
  track_length?: string;
  leak_date?: string;
  file_date?: string;
  available_length?: string;
  quality?: string;
  url?: string;
  urls?: string[];
  image?: string;
  realEra?: any;
  bpm?: string;
  fakesType?: string;
  fakesLength?: string;
}

export interface EraData {
  [category: string]: Song[];
}

export interface Era {
  name: string;
  extra?: string;
  description?: string;
  timeline?: string;
  fileInfo?: string[];
  image?: string;
  backgroundColor?: string;
  textColor?: string;
  data: EraData;
}

export interface TrackerData {
  name: string;
  tabs: string[];
  current_tab: string;
  eras: Era[];
}

export interface PlaylistSong {
  songName: string;
  eraName: string;
  url: string;
  song?: Song;
}

export interface UserPlaylist {
  id: string;
  name: string;
  cover?: string;
  songs: PlaylistSong[];
}

export interface SearchFilters {
  tags: string[];
  excludedTags: string[];
  qualities: string[];
  excludedQualities: string[];
  availableLengths: string[];
  excludedAvailableLengths: string[];
  durationOp: string;
  durationValue: string;
  playableOnly?: boolean;
  hasClips?: 'include' | 'exclude' | null;
  hasRemixes?: 'include' | 'exclude' | null;
  hasSamples?: 'include' | 'exclude' | null;
  albums?: string[];
}
