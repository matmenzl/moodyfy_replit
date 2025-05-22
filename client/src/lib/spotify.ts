import { apiRequest } from "./queryClient";

// Base URL for Spotify API
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Spotify API client
export const spotifyApi = {
  // Get user's profile information
  async getProfile(accessToken: string) {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    
    return response.json();
  },
  
  // Get user's recently played tracks
  async getRecentlyPlayed(accessToken: string, limit = 50) {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch recently played tracks");
    }
    
    return response.json();
  },
  
  // Create a new playlist for the user
  async createPlaylist(accessToken: string, userId: string, name: string, description: string) {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          public: true,
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to create playlist");
    }
    
    return response.json();
  },
  
  // Add tracks to a playlist
  async addTracksToPlaylist(accessToken: string, playlistId: string, trackUris: string[]) {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to add tracks to playlist");
    }
    
    return response.json();
  },
};

// Helper functions for frontend
export const handleSavePlaylist = async (
  accessToken: string,
  playlistName: string,
  playlistDescription: string,
  trackUris: string[]
) => {
  // Save playlist using our backend endpoint (which is safer and handles token refreshing)
  const response = await apiRequest(
    "POST",
    "/api/save-playlist",
    {
      accessToken,
      playlistName,
      playlistDescription,
      tracks: trackUris,
    }
  );
  
  return await response.json();
};
