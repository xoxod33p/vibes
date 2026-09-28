export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  filename: string;
  cover?: string | null;
  user_id?: string | null;
  uploaded_at: string;
  status?: "pending" | "ready" | "error";
}

export interface Playlist {
  id: string;
  name: string;
  user_id?: string | null;
  created_at: string;
  song_count?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  playlist_count?: number;
  favorite_count?: number;
}

export interface CacheInfo {
  ffmpeg_available: boolean;
  ffmpeg_path: string | null;
  allowed_bitrates: number[];
  transcode: {
    files: number;
    size_bytes: number;
  };
  uploads: {
    size_bytes: number;
  };
  api_cache_entries: number;
}

export interface WsDownloadProgress {
  songId: string;
  title: string;
  artist?: string;
  status: "pending" | "downloading" | "transcoding" | "ready" | "error";
  progress: number; // 0 - 100
  speed?: string;
  eta?: string;
  totalSize?: string;
  error?: string;
}

