// Track object
export interface Track {
  id: string;
  title: string;
  artist: string;
  uri: string;
  albumImage?: string;
  previewUrl?: string;
  externalUrl: string;
}

// Playlist data structure
export interface PlaylistData {
  title: string;
  description: string;
  tracks: Track[];
}

// Spotify Auth types
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

// OpenAI types
export interface MoodAnalysisResponse {
  genres: string[];
  artists: string[];
  mood_keywords: string[];
  intensity: number;
  energy_level: number;
  tempo_preference: string;
  playlist_name: string;
  playlist_description: string;
}
