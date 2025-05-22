import { Track, MoodAnalysisResponse } from "@/lib/types";
import { OpenAITrackRecommendation } from "./openai";

// Spotify API endpoints
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_RECOMMENDATIONS_URL = `${SPOTIFY_API_URL}/recommendations`;

// Spotify API credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Prüfen und Loggen der Verfügbarkeit von Anmeldeinformationen
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error("WARNUNG: Spotify API-Anmeldeinformationen fehlen! Stellen Sie sicher, dass SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET gesetzt sind.");
}

// Get Spotify access token from authorization code
export async function getSpotifyToken(code: string, redirectUri: string) {
  // Überprüfung auf fehlende Anmeldeinformationen
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify API credentials missing");
  }
  
  console.log("Token-Austausch mit Spotify...");
  console.log("Verwende Redirect-URI:", redirectUri);
  
  try {
    // Verwende direkte Authentifizierung mit Basic Auth Header
    const authString = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    
    const payload = new URLSearchParams();
    payload.append("grant_type", "authorization_code");
    payload.append("code", code);
    payload.append("redirect_uri", redirectUri);
    
    const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Spotify token error (${response.status}):`, responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`Failed to get Spotify token: ${response.status} ${JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`Failed to get Spotify token: ${response.status} - ${responseText.substring(0, 100)}`);
      }
    }
    
    // Parse JSON response
    const data = JSON.parse(responseText);
    console.log("Spotify token successfully obtained");
    
    return data;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    throw error;
  }
}

// Refresh Spotify access token
export async function refreshSpotifyToken(refreshToken: string) {
  // Überprüfung auf fehlende Anmeldeinformationen
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify API credentials missing");
  }
  
  console.log("Aktualisiere Spotify-Token...");
  
  try {
    // Verwende direkte Authentifizierung mit Basic Auth Header
    const authString = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    
    const payload = new URLSearchParams();
    payload.append("grant_type", "refresh_token");
    payload.append("refresh_token", refreshToken);
    
    const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Spotify refresh token error (${response.status}):`, responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`Failed to refresh Spotify token: ${response.status} ${JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`Failed to refresh Spotify token: ${response.status} - ${responseText.substring(0, 100)}`);
      }
    }
    
    // Parse JSON response
    const data = JSON.parse(responseText);
    console.log("Spotify token successfully refreshed");
    
    return data;
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(accessToken: string) {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to get user profile: ${response.status} ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

// Get recently played tracks
export async function getRecentlyPlayed(accessToken: string, limit = 50) {
  const response = await fetch(`${SPOTIFY_API_URL}/me/player/recently-played?limit=${limit}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to get recently played tracks: ${response.status} ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

// Create a new playlist
export async function createPlaylist(
  accessToken: string, 
  userId: string, 
  name: string, 
  description: string
) {
  const response = await fetch(`${SPOTIFY_API_URL}/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      description,
      public: true
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to create playlist: ${response.status} ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

// Add tracks to a playlist
export async function addTracksToPlaylist(
  accessToken: string, 
  playlistId: string, 
  trackUris: string[]
) {
  const response = await fetch(`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: trackUris
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to add tracks to playlist: ${response.status} ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

// Get access token for Spotify API requests (client credentials flow)
async function getSpotifyApiToken(): Promise<string> {
  try {
    console.log("Getting Spotify API token using client credentials...");
    
    // Check if we have valid client credentials
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error("Missing Spotify API credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.");
    }
    
    // Nur loggen, wenn die Client ID vorhanden ist
    console.log(`Using Client ID: ${SPOTIFY_CLIENT_ID?.substring(0, 5) || "not set"}...`);
    
    // Show more debug information
    console.log("Preparing Spotify API token request...");
    
    // Prepare authorization header (Basic auth with client_id:client_secret)
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const payload = new URLSearchParams({
      grant_type: "client_credentials"
    });
    
    // Make token request (with detailed error handling)
    console.log(`Making request to Spotify Accounts API: ${SPOTIFY_ACCOUNTS_URL}`);
    const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });
    
    // Check for successful response
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { rawText: errorText };
      }
      
      console.error(`Spotify token error (${response.status}):`, errorData);
      throw new Error(`Failed to get API token: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    // Parse response data
    const data = await response.json();
    console.log("Successfully obtained Spotify API token");
    
    return data.access_token;
  } catch (error) {
    console.error("Error getting Spotify API token:", error);
    throw error;
  }
}

// Suche nach einem Track bei Spotify anhand von Künstler und Titel
export async function searchForTrack(title: string, artist: string, token?: string): Promise<Track | null> {
  try {
    // Sicherstellen, dass wir ein Token haben
    const accessToken = token || await getSpotifyApiToken();
    
    // URL-Encodierung der Suchparameter
    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const searchUrl = `${SPOTIFY_API_URL}/search?q=${query}&type=track&limit=1`;
    
    console.log(`Suche nach Track: "${title}" von ${artist}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log("Spotify Rate-Limit erreicht, warte kurz...");
        // Kurz warten und erneut versuchen
        await new Promise(resolve => setTimeout(resolve, 1000));
        return searchForTrack(title, artist, accessToken);
      }
      
      console.error(`Fehler bei der Suche: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Überprüfen, ob Tracks gefunden wurden
    if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
      console.log(`Kein Track gefunden für: "${title}" von ${artist}`);
      return null;
    }
    
    // Extrahiere die Informationen des ersten Ergebnisses
    const firstResult = data.tracks.items[0];
    
    // Erstelle ein standardisiertes Track-Objekt
    const track: Track = {
      id: firstResult.id,
      title: firstResult.name,
      artist: firstResult.artists.map((a: any) => a.name).join(", "),
      uri: firstResult.uri,
      albumImage: firstResult.album.images[0]?.url,
      previewUrl: firstResult.preview_url || undefined,
      externalUrl: firstResult.external_urls.spotify
    };
    
    console.log(`Track gefunden: "${track.title}" von ${track.artist}`);
    return track;
  } catch (error) {
    console.error("Fehler bei der Track-Suche:", error);
    return null;
  }
}

// Verarbeite OpenAI-Empfehlungen und suche die Tracks bei Spotify
export async function validateTracksWithSpotify(recommendations: OpenAITrackRecommendation[]): Promise<Track[]> {
  console.log(`Validiere ${recommendations.length} Tracks mit Spotify`);
  
  // Holen eines API-Tokens vorab (wird für alle Anfragen wiederverwendet)
  const accessToken = await getSpotifyApiToken();
  
  // Damit wir nicht zu viele Anfragen gleichzeitig senden und in Rate-Limits laufen,
  // führen wir die Suchen sequentiell durch
  const validatedTracks: Track[] = [];
  
  for (const recommendation of recommendations) {
    // Kurz warten, um Rate-Limits zu vermeiden
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Track bei Spotify suchen
    const track = await searchForTrack(recommendation.title, recommendation.artist, accessToken);
    
    if (track) {
      validatedTracks.push(track);
    }
  }
  
  console.log(`${validatedTracks.length} von ${recommendations.length} Tracks validiert und bei Spotify gefunden.`);
  return validatedTracks;
}

// Diese Funktion sucht Tracks basierend auf der Stimmungsanalyse mit der Spotify API
// und stellt sicher, dass pro Künstler maximal ein Song in der Playlist vorkommt
export async function searchForTracks(moodAnalysis: MoodAnalysisResponse): Promise<Track[]> {
  try {
    // Hole einen Spotify-API-Token
    const token = await getSpotifyApiToken();
    
    // Musik-Genres aus der Mood-Analyse
    const genres = moodAnalysis.genres.join(',');
    // Energie-Level zwischen 0 und 1 für Spotify normalisieren
    const energy = moodAnalysis.energy_level / 10;
    
    // Spotify-Recommendations API aufrufen
    const queryParams = new URLSearchParams({
      seed_genres: genres.substring(0, 100), // Spotify begrenzt die Länge
      limit: '20',
      target_energy: energy.toString(),
      min_popularity: '50'
    });
    
    const recommendationsUrl = `${SPOTIFY_RECOMMENDATIONS_URL}?${queryParams.toString()}`;
    
    console.log(`Rufe Spotify Recommendations API auf mit Genres: ${genres.substring(0, 30)}...`);
    
    const response = await fetch(recommendationsUrl, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error(`Fehler bei den Recommendations: ${response.status}`);
      throw new Error(`Spotify recommendations failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.tracks || data.tracks.length === 0) {
      console.log("Keine Tracks von Spotify erhalten, verwende Fallback");
      return getFallbackTracks(moodAnalysis);
    }
    
    // Konvertiere Spotify-Tracks in unser Track-Format
    const tracks: Track[] = data.tracks.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(", "),
      uri: track.uri,
      albumImage: track.album.images[0]?.url,
      previewUrl: track.preview_url || undefined,
      externalUrl: track.external_urls.spotify
    }));
    
    console.log(`${tracks.length} Tracks von Spotify erhalten`);
    
    // Begrenze die Anzahl der Songs pro Künstler für mehr Vielfalt
    // Erlaube bis zu 2 Songs pro Künstler, um auf Mindestanzahl zu kommen
    const MIN_TOTAL_SONGS = 15;
    const MAX_SONGS_PER_ARTIST = 2;
    
    const artistSongCount: Record<string, number> = {};
    const uniqueArtistTracks: Track[] = [];
    
    // Erster Durchlauf: Nimm einen Song von jedem Künstler
    for (const track of tracks) {
      // Normalisiere den Künstlernamen (Hauptkünstler ohne Features)
      const mainArtist = track.artist.split(',')[0].toLowerCase().trim();
      
      if (!artistSongCount[mainArtist]) {
        uniqueArtistTracks.push(track);
        artistSongCount[mainArtist] = 1;
      }
    }
    
    // Zweiter Durchlauf: Füge weitere Songs hinzu, bis Mindestanzahl erreicht
    if (uniqueArtistTracks.length < MIN_TOTAL_SONGS) {
      for (const track of tracks) {
        const mainArtist = track.artist.split(',')[0].toLowerCase().trim();
        
        // Überspringe, wenn wir das Maximum pro Künstler erreicht haben
        if (artistSongCount[mainArtist] >= MAX_SONGS_PER_ARTIST) continue;
        
        // Überspringe, wenn der Track bereits in der Liste ist
        const isDuplicate = uniqueArtistTracks.some(t => 
          t.id === track.id || 
          (t.title.toLowerCase() === track.title.toLowerCase() && 
           t.artist.toLowerCase() === track.artist.toLowerCase()));
        
        if (!isDuplicate) {
          uniqueArtistTracks.push(track);
          artistSongCount[mainArtist] = (artistSongCount[mainArtist] || 0) + 1;
          
          if (uniqueArtistTracks.length >= MIN_TOTAL_SONGS) break;
        }
      }
    }
    
    // Dritter Durchlauf: Falls immer noch zu wenig, nehme weitere Songs ohne Künstlerlimit
    if (uniqueArtistTracks.length < MIN_TOTAL_SONGS) {
      for (const track of tracks) {
        // Überspringe, wenn der Track bereits in der Liste ist
        const isDuplicate = uniqueArtistTracks.some(t => 
          t.id === track.id || 
          (t.title.toLowerCase() === track.title.toLowerCase() && 
           t.artist.toLowerCase() === track.artist.toLowerCase()));
        
        if (!isDuplicate) {
          uniqueArtistTracks.push(track);
          
          if (uniqueArtistTracks.length >= MIN_TOTAL_SONGS) break;
        }
      }
    }
    
    console.log(`${uniqueArtistTracks.length} Tracks nach Anpassung der Künstler-Diversität`);
    return uniqueArtistTracks;
  } catch (error) {
    console.error("Fehler beim Abrufen von Spotify-Tracks:", error);
    // Bei Fehler auf Fallback-Tracks zurückgreifen
    return getFallbackTracks(moodAnalysis);
  }
}

// Fallback function to provide tracks based on mood analysis without using the API
function getFallbackTracks(moodAnalysis: MoodAnalysisResponse): Track[] {
  // Hinweis: Auch bei Fallback-Tracks stellen wir sicher, dass pro Künstler maximal ein Song vorkommt
  console.log("Using fallback tracks based on mood analysis:", moodAnalysis.playlist_name);
  
  // Create a pool of tracks organized by mood/energy
  const trackPools: Record<string, Track[]> = {
    // High energy tracks
    high: [
      {
        id: "high_1",
        title: "Don't Stop Me Now",
        artist: "Queen",
        uri: "spotify:track:7hQJA50XrCWABAu5v6QZ4i",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273008b06d5de6c2916b9081b4f",
        previewUrl: "https://p.scdn.co/mp3-preview/5a12483aa3b51331aba663131dbac3831a0cb5d0",
        externalUrl: "https://open.spotify.com/track/7hQJA50XrCWABAu5v6QZ4i"
      },
      {
        id: "high_2",
        title: "Uptown Funk",
        artist: "Mark Ronson ft. Bruno Mars",
        uri: "spotify:track:32OlwWuMpZ6b0aN2RZOeMS",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273e7d1c50e01b72a9d6bf9d892",
        previewUrl: "https://p.scdn.co/mp3-preview/4eb779428cb39d819c9b444e7cb7d7f2fabb68e6",
        externalUrl: "https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS"
      },
      {
        id: "high_3",
        title: "I Wanna Dance with Somebody",
        artist: "Whitney Houston",
        uri: "spotify:track:2tUBqZG2AbRi7Q0BIrVrEj",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273256ff8a1dce3ef9f0b5627e8",
        previewUrl: "https://p.scdn.co/mp3-preview/8d5a2c33d7b82c2d5a77b28cc4a90e3b37a1e220",
        externalUrl: "https://open.spotify.com/track/2tUBqZG2AbRi7Q0BIrVrEj"
      },
      {
        id: "high_4",
        title: "Can't Stop the Feeling!",
        artist: "Justin Timberlake",
        uri: "spotify:track:1WkMMavIMc4JZ8cfMmxHkI",
        albumImage: "https://i.scdn.co/image/ab67616d0000b2738c14b0194a7fa4b6139c4c87",
        previewUrl: "https://p.scdn.co/mp3-preview/8fcdae257b0d349e5691a4e4a069c27cae80629e",
        externalUrl: "https://open.spotify.com/track/1WkMMavIMc4JZ8cfMmxHkI"
      },
      {
        id: "high_5",
        title: "Good as Hell",
        artist: "Lizzo",
        uri: "spotify:track:3Yh9lZcWyKrK9GjbhuS0hT",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273e4f9c263d7651e0e29a114da",
        previewUrl: "https://p.scdn.co/mp3-preview/c3c56a817e70a7d7e6e1a5373dd62397cdbf18c4",
        externalUrl: "https://open.spotify.com/track/3Yh9lZcWyKrK9GjbhuS0hT"
      }
    ],
    
    // Medium energy tracks
    medium: [
      {
        id: "medium_1",
        title: "Teenage Dream",
        artist: "Katy Perry",
        uri: "spotify:track:5jzKL4BDMClWqRguW5qZvh",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273af9b92a688cba10078a83742",
        previewUrl: "https://p.scdn.co/mp3-preview/c3a06e3b023e1d7ecd153228d3ec4fe6be148aac",
        externalUrl: "https://open.spotify.com/track/5jzKL4BDMClWqRguW5qZvh"
      },
      {
        id: "medium_2",
        title: "Lover",
        artist: "Taylor Swift",
        uri: "spotify:track:1dGr1c8CrMLDpV6mPbImSI",
        albumImage: "https://i.scdn.co/image/ab67616d0000b27314fbbf10e91af2acc6fc3862",
        previewUrl: "https://p.scdn.co/mp3-preview/70c1e780849fe04b4555a5340c4373be84abe657",
        externalUrl: "https://open.spotify.com/track/1dGr1c8CrMLDpV6mPbImSI"
      },
      {
        id: "medium_3",
        title: "Watermelon Sugar",
        artist: "Harry Styles",
        uri: "spotify:track:6UelLqGlWMcVH1E5c4H7lY",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273b1c579c84122f7cb2455e0db",
        previewUrl: "https://p.scdn.co/mp3-preview/5c31d1845d0cee23f1c097c659f43b8b27c501ee",
        externalUrl: "https://open.spotify.com/track/6UelLqGlWMcVH1E5c4H7lY"
      },
      {
        id: "medium_4",
        title: "Circles",
        artist: "Post Malone",
        uri: "spotify:track:21jGcNKet2qwijlDFuPiPb",
        albumImage: "https://i.scdn.co/image/ab67616d0000b2739478c87599550dd73bfa7e02",
        previewUrl: "https://p.scdn.co/mp3-preview/9cb3c8b7ccb399c2c5346ac424cc59be9fef3c98",
        externalUrl: "https://open.spotify.com/track/21jGcNKet2qwijlDFuPiPb"
      },
      {
        id: "medium_5",
        title: "Adore You",
        artist: "Harry Styles",
        uri: "spotify:track:3jjujdWJ72nww5eGnfs2E7",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273d9195b2c7d442bc85d30320d",
        previewUrl: "https://p.scdn.co/mp3-preview/2a606e7fbd0917e3dfdfd9d9a734af12e6d4971e",
        externalUrl: "https://open.spotify.com/track/3jjujdWJ72nww5eGnfs2E7"
      }
    ],
    
    // Low energy tracks
    low: [
      {
        id: "low_1",
        title: "Cardigan",
        artist: "Taylor Swift",
        uri: "spotify:track:4R2kfaDFhslZEMJqAFNpdd",
        albumImage: "https://i.scdn.co/image/ab67616d0000b2733ebcf0e922e8f68492bf5a51",
        previewUrl: "https://p.scdn.co/mp3-preview/cf808afb96444e27cf3c6d6dc5c4b24a8bc694e3",
        externalUrl: "https://open.spotify.com/track/4R2kfaDFhslZEMJqAFNpdd"
      },
      {
        id: "low_2",
        title: "Someone You Loved",
        artist: "Lewis Capaldi",
        uri: "spotify:track:7qEHsqek33rTcFNT9PFqLf",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273fc2101e6889d6ce9025f85f2",
        previewUrl: "https://p.scdn.co/mp3-preview/6ed5646d0e5b96bf9e929ce295b7bda6352cb9a8",
        externalUrl: "https://open.spotify.com/track/7qEHsqek33rTcFNT9PFqLf"
      },
      {
        id: "low_3",
        title: "When the Party's Over",
        artist: "Billie Eilish",
        uri: "spotify:track:43zdsphuZLzwA9k4DJhU0I",
        albumImage: "https://i.scdn.co/image/ab67616d0000b27350a3147b4edd7701a876c6ce",
        previewUrl: "https://p.scdn.co/mp3-preview/949e5868e84b1c94d12b5798252de9f3d6cf64f1",
        externalUrl: "https://open.spotify.com/track/43zdsphuZLzwA9k4DJhU0I"
      },
      {
        id: "low_4",
        title: "River",
        artist: "Leon Bridges",
        uri: "spotify:track:3Hl9FgFEm4gFteAhxwpEp2",
        albumImage: "https://i.scdn.co/image/ab67616d0000b273f9f0dd245eafc8f6bc707cbd",
        previewUrl: "https://p.scdn.co/mp3-preview/15cbc72e3a01c1532cef28209f602e7ff2a6c34d",
        externalUrl: "https://open.spotify.com/track/3Hl9FgFEm4gFteAhxwpEp2"
      },
      {
        id: "low_5",
        title: "Heather",
        artist: "Conan Gray",
        uri: "spotify:track:4xqrdfXkTW4T0RauPLv3WA",
        albumImage: "https://i.scdn.co/image/ab67616d0000b2736955098c3fac3c7c80254f07",
        previewUrl: "https://p.scdn.co/mp3-preview/6bdf46e6bd952a8edf3cc7eebd4eefff44a3eb88",
        externalUrl: "https://open.spotify.com/track/4xqrdfXkTW4T0RauPLv3WA"
      }
    ]
  };
  
  // Determine which pool to use based on energy level
  let selectedPool: Track[];
  const { energy_level = 5 } = moodAnalysis;
  
  if (energy_level <= 3) {
    selectedPool = trackPools.low;
  } else if (energy_level <= 7) {
    selectedPool = trackPools.medium;
  } else {
    selectedPool = trackPools.high;
  }
  
  // Add some variety - mix in tracks from other pools
  let result: Track[] = [...selectedPool]; // Start with main pool
  
  // Add some tracks from other pools for variety
  const otherPools = Object.keys(trackPools).filter(key => {
    if (energy_level <= 3 && key !== 'low') return true;
    if (energy_level > 3 && energy_level <= 7 && key !== 'medium') return true;
    if (energy_level > 7 && key !== 'high') return true;
    return false;
  });
  
  // Add some tracks from other pools
  otherPools.forEach(poolKey => {
    // Add 1-2 tracks from each other pool
    const pool = trackPools[poolKey as keyof typeof trackPools];
    const tracksToAdd = pool.slice(0, 2);
    result = [...result, ...tracksToAdd];
  });
  
  // Ensure we have at most 15 tracks
  if (result.length > 15) {
    result = result.slice(0, 15);
  }
  
  console.log(`Generated ${result.length} fallback tracks based on energy level ${energy_level}`);
  
  // Entferne Duplikate von Künstlern auch bei Fallback-Tracks
  const uniqueArtistTracks: Track[] = [];
  const includedArtists = new Set<string>();
  
  for (const track of result) {
    // Normalisiere den Künstlernamen für Vergleiche
    const normalizedArtist = track.artist.toLowerCase().trim();
    
    // Wenn wir diesen Künstler noch nicht in der Liste haben, füge ihn hinzu
    if (!includedArtists.has(normalizedArtist)) {
      uniqueArtistTracks.push(track);
      includedArtists.add(normalizedArtist);
    } else {
      console.log(`Überspringe doppelten Künstler in Fallback-Tracks: ${track.artist} - ${track.title}`);
    }
  }
  
  console.log(`${uniqueArtistTracks.length} Fallback-Tracks nach Entfernung von Künstler-Duplikaten`);
  return uniqueArtistTracks;
}

export /**
 * Sucht Tracks in Spotify basierend auf Stimmungsanalyse
 * Diese Funktion verwendet die Spotify-API, um Tracks basierend auf Genres, Artists etc. zu finden
 * Hinweis: Aktualisierte Implementierung, die ältere Version ersetzt
 */
async function getRecommendedTracks(moodAnalysis: MoodAnalysisResponse): Promise<Track[]> {
  try {
    // Get an API token using client credentials flow
    let accessToken;
    let useSpotifyAPI = true;
    
    try {
      accessToken = await getSpotifyApiToken();
    } catch (tokenError) {
      console.warn("Failed to get Spotify API token:", tokenError);
      console.warn("Using fallback track data instead of Spotify API");
      useSpotifyAPI = false;
    }
    
    // If we couldn't get a token or are in development mode, use fallback data
    if (!useSpotifyAPI) {
      console.log("Using fallback tracks instead of Spotify API");
      return getFallbackTracks(moodAnalysis);
    }
    
    // Extract parameters from mood analysis to build search queries
    const { 
      genres = [], 
      artists = [], 
      mood_keywords = [],
      intensity = 5,
      energy_level = 5,
      tempo_preference = "medium"
    } = moodAnalysis;
    
    // Create search parameters
    const searchQueries = [];
    
    // Add genres to search
    if (genres.length > 0) {
      // Take up to 2 genres to avoid overly specific queries
      const topGenres = genres.slice(0, 2);
      searchQueries.push(...topGenres);
    }
    
    // Add artists to search
    if (artists.length > 0) {
      // Take up to 2 artists
      const topArtists = artists.slice(0, 2);
      searchQueries.push(...topArtists);
    }
    
    // Add mood keywords
    if (mood_keywords.length > 0) {
      // Take up to 3 mood keywords
      const topKeywords = mood_keywords.slice(0, 3);
      searchQueries.push(...topKeywords);
    }
    
    // Create search query text
    const searchQuery = searchQueries.join(' ');
    
    // Set additional parameters based on mood analysis
    let minEnergy = 0.1;
    let maxEnergy = 0.9;
    let minTempo = 60;
    let maxTempo = 180;
    
    // Adjust energy based on mood intensity/energy level
    if (energy_level <= 3) {
      minEnergy = 0.1;
      maxEnergy = 0.4;
    } else if (energy_level <= 7) {
      minEnergy = 0.3;
      maxEnergy = 0.7;
    } else {
      minEnergy = 0.6;
      maxEnergy = 0.9;
    }
    
    // Adjust tempo based on tempo preference
    if (tempo_preference === "slow") {
      minTempo = 60;
      maxTempo = 100;
    } else if (tempo_preference === "medium") {
      minTempo = 90;
      maxTempo = 140;
    } else if (tempo_preference === "fast") {
      minTempo = 130;
      maxTempo = 180;
    }
    
    // Prepare recommendations URL with parameters
    console.log(`Preparing recommendations URL: ${SPOTIFY_RECOMMENDATIONS_URL}`);
    const recommendationsUrl = new URL(SPOTIFY_RECOMMENDATIONS_URL);
    recommendationsUrl.searchParams.append('limit', '15'); // Get 15 tracks
    
    // Define list of valid Spotify genres (common ones)
    const validSpotifyGenres = [
      'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'blues',
      'classical', 'country', 'dance', 'deep-house', 'disco', 'drum-and-bass',
      'dubstep', 'edm', 'electro', 'electronic', 'folk', 'funk', 'guitar',
      'happy', 'hip-hop', 'house', 'indie', 'indie-pop', 'jazz', 'k-pop',
      'latin', 'metal', 'piano', 'pop', 'r-n-b', 'rap', 'reggae', 'reggaeton',
      'rock', 'sad', 'soul', 'techno', 'trance'
    ];
      
    // Always ensure we have at least one valid genre seed
    // First try to match user genres to valid Spotify genres
    let matchedGenres: string[] = [];
    
    if (genres.length > 0) {
      // Convert user genres to Spotify format and check against valid genres
      const formattedUserGenres = genres.map((g: string) => 
        g.toLowerCase().replace(/\s+/g, '-')
      );
      
      // Find matches between user genres and valid Spotify genres
      matchedGenres = formattedUserGenres.filter(genre => 
        validSpotifyGenres.includes(genre)
      );
      
      // If no matches, try to find partial matches
      if (matchedGenres.length === 0) {
        for (const userGenre of formattedUserGenres) {
          for (const validGenre of validSpotifyGenres) {
            if (validGenre.includes(userGenre) || userGenre.includes(validGenre)) {
              matchedGenres.push(validGenre);
              if (matchedGenres.length >= 2) break;
            }
          }
          if (matchedGenres.length >= 2) break;
        }
      }
    }
    
    // If no matched genres, use fallback genres based on mood
    if (matchedGenres.length === 0) {
      // Choose appropriate genres based on energy level
      if (energy_level <= 3) {
        matchedGenres = ['acoustic', 'ambient']; // Low energy
      } else if (energy_level <= 7) {
        matchedGenres = ['pop', 'indie-pop']; // Medium energy
      } else {
        matchedGenres = ['dance', 'electronic']; // High energy
      }
    }
    
    // Take up to 2 genres (Spotify allows up to 5 seed parameters in total)
    const finalGenres = matchedGenres.slice(0, 2);
    console.log('Using Spotify seed genres:', finalGenres);
    recommendationsUrl.searchParams.append('seed_genres', finalGenres.join(','));
    
    // Add audio feature parameters
    recommendationsUrl.searchParams.append('min_energy', minEnergy.toString());
    recommendationsUrl.searchParams.append('max_energy', maxEnergy.toString());
    recommendationsUrl.searchParams.append('min_tempo', minTempo.toString());
    recommendationsUrl.searchParams.append('max_tempo', maxTempo.toString());
    
    // Make recommendations request
    console.log(`Fetching recommendations with parameters:`, 
                `genres: ${genres.slice(0, 2).join(', ')}, ` +
                `energy: ${minEnergy}-${maxEnergy}, ` +
                `tempo: ${minTempo}-${maxTempo}`);
    
    const recommendationsResponse = await fetch(recommendationsUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    
    if (!recommendationsResponse.ok) {
      const errorText = await recommendationsResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { rawText: errorText };
      }
      
      console.error(`Spotify recommendations error (${recommendationsResponse.status}):`, errorData);
      console.error(`Recommendations URL: ${recommendationsUrl.toString()}`);
      
      // Instead of throwing an error, fall back to local data
      console.log("Spotify API recommendation failed, using fallback tracks");
      return getFallbackTracks(moodAnalysis);
    }
    
    const recommendationsData = await recommendationsResponse.json();
    
    // Transform Spotify tracks to our Track format
    const tracks = recommendationsData.tracks.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      uri: track.uri,
      albumImage: track.album.images[1]?.url || track.album.images[0]?.url,
      previewUrl: track.preview_url,
      externalUrl: track.external_urls.spotify
    }));
    
    return tracks;
  } catch (error: any) {
    console.error("Error searching for tracks:", error);
    
    // Instead of throwing an error, fall back to local data
    console.log("Exception in Spotify API search, using fallback tracks");
    return getFallbackTracks(moodAnalysis);
  }
}
