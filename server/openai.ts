import OpenAI from "openai";
import { Track } from "@/lib/types";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Request type for mood analysis
export interface MoodAnalysisRequest {
  moodDescription: string;
  recentlyPlayed?: {
    artist: string;
    track: string;
    uri: string;
  }[];
}

// Response type from OpenAI
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

// Track recommendation interface for OpenAI suggested tracks
export interface OpenAITrackRecommendation {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  albumImageUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
}

/**
 * Generate music track recommendations using OpenAI
 * This function uses OpenAI to suggest tracks based on mood analysis
 */
export async function generateTrackRecommendations(moodAnalysis: MoodAnalysisResponse): Promise<Track[]> {
  try {
    console.log("Generating track recommendations with OpenAI based on mood analysis");
    
    // Construct system prompt
    const systemPrompt = `You are a music recommendation expert that specializes in finding the perfect tracks for a listener's mood.
    Your task is to recommend real, popular songs that match the mood parameters provided.
    For each song, provide accurate information including PRECISE title and artist name.
    IMPORTANT: 
    - Do not add Spotify URLs or IDs - leave the spotifyUrl field as empty string "" for ALL recommendations.
    - Be extremely precise about artist names and song titles so they can be EXACTLY found on Spotify later.
    - ONLY suggest songs that definitely exist on Spotify with accurate spellings.
    - Include ONLY popular, well-known songs that are definitely on Spotify.
    - Double-check your track information for accuracy to ensure Spotify can find it.`;
    
    // Construct user prompt with mood analysis details
    const userPrompt = `Please recommend 25 songs that match the following mood:
    
    Genres: ${moodAnalysis.genres.join(', ')}
    Artists similar to: ${moodAnalysis.artists.join(', ')}
    Mood keywords: ${moodAnalysis.mood_keywords.join(', ')}
    Energy level (1-10): ${moodAnalysis.energy_level}
    Tempo preference: ${moodAnalysis.tempo_preference}
    
    Create a cohesive playlist that would fit this mood: "${moodAnalysis.playlist_name}"
    
    IMPORTANT: 
    - I need at least 25 song recommendations to ensure variety
    - Include a good mix of well-known AND lesser-known tracks that fit the mood
    - For each artist, suggest 1-2 of their best songs that match the mood
    - Include songs from at least 15 different artists
    - Make sure all songs actually exist on Spotify and use correct spelling
    
    Respond with a JSON object in this format:
    {
      "tracks": [
        {
          "id": "unique_id_1",
          "title": "Song Title",
          "artist": "Artist Name",
          "album": "Album Name",
          "albumImageUrl": "",
          "spotifyUrl": ""
        },
        ... more tracks
      ]
    }
    
    Only include songs that actually exist. Do not make up song titles or artists.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(content);
    
    // Make sure we have a tracks array
    if (!result.tracks || !Array.isArray(result.tracks)) {
      throw new Error("Invalid track recommendations format from OpenAI");
    }
    
    console.log(`OpenAI generated ${result.tracks.length} track recommendations`);
    
    // Nach dem Empfangen der OpenAI-Empfehlungen, validieren wir sie mit Spotify
    console.log("Validiere OpenAI-Empfehlungen mit Spotify Search API");
    
    try {
      // Import und Aufruf der Spotify-Validierungsfunktion
      const validatedTracks = await import('./spotify')
        .then(module => module.validateTracksWithSpotify(result.tracks));
        
      console.log(`${validatedTracks.length} von ${result.tracks.length} Tracks wurden bei Spotify gefunden und validiert`);
      
      // Begrenze die Anzahl der Songs pro Künstler für mehr Vielfalt
      // Ziel: Maximal 2 Songs pro Künstler, aber insgesamt mindestens 15 Songs
      const artistSongCount: Record<string, number> = {};
      const uniqueArtistTracks: Track[] = [];
      
      // Zähle zunächst, wie viele Songs wir pro Künstler haben
      for (const track of validatedTracks) {
        const normalizedArtist = track.artist.toLowerCase().trim();
        artistSongCount[normalizedArtist] = (artistSongCount[normalizedArtist] || 0) + 1;
      }
      
      // Sortiere Tracks, sodass wir mit Künstlern beginnen, die weniger Songs haben
      // Das erhöht die Vielfalt
      const sortedTracks = [...validatedTracks].sort((a, b) => {
        const artistA = a.artist.toLowerCase().trim();
        const artistB = b.artist.toLowerCase().trim();
        return (artistSongCount[artistA] || 0) - (artistSongCount[artistB] || 0);
      });
      
      // Erster Durchlauf: Nimm einen Song von jedem Künstler
      const includedArtists = new Set<string>();
      for (const track of sortedTracks) {
        const normalizedArtist = track.artist.toLowerCase().trim();
        
        if (!includedArtists.has(normalizedArtist)) {
          uniqueArtistTracks.push(track);
          includedArtists.add(normalizedArtist);
        }
      }
      
      // Zweiter Durchlauf: Füge weitere Songs hinzu, aber maximal 2 pro Künstler
      // bis wir die Mindestanzahl erreicht haben
      const MAX_SONGS_PER_ARTIST = 2;
      const MIN_TOTAL_SONGS = 15;
      
      const artistsInPlaylist: Record<string, number> = {};
      for (const track of uniqueArtistTracks) {
        const normalizedArtist = track.artist.toLowerCase().trim();
        artistsInPlaylist[normalizedArtist] = 1; // Nach dem ersten Durchlauf hat jeder Künstler 1 Song
      }
      
      if (uniqueArtistTracks.length < MIN_TOTAL_SONGS) {
        for (const track of validatedTracks) {
          const normalizedArtist = track.artist.toLowerCase().trim();
          
          // Wenn wir schon 2 Songs von diesem Künstler haben, überspringe
          if (artistsInPlaylist[normalizedArtist] >= MAX_SONGS_PER_ARTIST) {
            continue;
          }
          
          // Prüfe, ob dieser Track bereits in der Liste ist
          const isDuplicate = uniqueArtistTracks.some(t => 
            t.title.toLowerCase() === track.title.toLowerCase() && 
            t.artist.toLowerCase() === track.artist.toLowerCase());
          
          if (!isDuplicate) {
            uniqueArtistTracks.push(track);
            artistsInPlaylist[normalizedArtist] = (artistsInPlaylist[normalizedArtist] || 0) + 1;
            console.log(`Füge zweiten Song von ${track.artist} hinzu: ${track.title}`);
            
            // Wenn wir genug Songs haben, brechen wir ab
            if (uniqueArtistTracks.length >= MIN_TOTAL_SONGS) {
              break;
            }
          }
        }
      }
      
      // Dritter Durchlauf: Falls wir noch immer nicht genug Songs haben,
      // lockere die Begrenzung auf und erlaube mehr Songs pro Künstler
      if (uniqueArtistTracks.length < MIN_TOTAL_SONGS) {
        for (const track of validatedTracks) {
          const normalizedArtist = track.artist.toLowerCase().trim();
          
          // Prüfe, ob dieser Track bereits in der Liste ist
          const isDuplicate = uniqueArtistTracks.some(t => 
            t.title.toLowerCase() === track.title.toLowerCase() && 
            t.artist.toLowerCase() === track.artist.toLowerCase());
          
          if (!isDuplicate) {
            uniqueArtistTracks.push(track);
            artistsInPlaylist[normalizedArtist] = (artistsInPlaylist[normalizedArtist] || 0) + 1;
            console.log(`Füge zusätzlichen Song von ${track.artist} hinzu: ${track.title}`);
            
            // Wenn wir genug Songs haben, brechen wir ab
            if (uniqueArtistTracks.length >= MIN_TOTAL_SONGS) {
              break;
            }
          }
        }
      }
      
      console.log(`${uniqueArtistTracks.length} Tracks nach Anpassung der Künstler-Diversität`);
      
      // Wenn wir genügend validierte Tracks haben, geben wir diese zurück
      if (uniqueArtistTracks.length >= 5) {
        return uniqueArtistTracks;
      }
      
      // Wenn zu wenig Tracks gefunden wurden, versuchen wir es mit der direkten Spotify-Suche
      console.log("Zu wenige validierte Tracks gefunden, verwende Spotify Recommendations API");
      const spotifyTracks = await import('./spotify')
        .then(module => module.searchForTracks(moodAnalysis));
        
      return spotifyTracks;
    } catch (error) {
      console.error("Fehler bei der Spotify-Validierung:", error);
      
      // Im Fehlerfall verwenden wir die von OpenAI generierten Tracks direkt
      console.log("Fallback: Verwende OpenAI-Tracks mit Spotify-Suchlinks statt direkter URIs");
      
      // Für Fehlerfall: Verwende OpenAI-Tracks, aber mit Suchlinks statt direkter URIs
      const defaultCoverUrl = "https://www.scdn.co/i/_global/twitter_card-default.jpg";
      
      const fallbackTracks: Track[] = result.tracks.map((track: any, index: number) => {
        // Erstelle Spotify-Suchlink statt direkter URI/URL
        const searchQuery = encodeURIComponent(`${track.title} ${track.artist}`);
        const searchUrl = `https://open.spotify.com/search/${searchQuery}`;
        
        return {
          id: track.id || `openai_${index}`,
          title: track.title || "Unknown Title",
          artist: track.artist || "Unknown Artist",
          // WICHTIG: Keine track URI, da diese zu invalid base62 id Fehlern führen könnte
          uri: "", 
          albumImage: track.albumImageUrl || defaultCoverUrl,
          previewUrl: null,
          externalUrl: searchUrl
        };
      });
      
      return fallbackTracks;
    }
  } catch (error: any) {
    console.error("Error generating track recommendations:", error);
    throw new Error(`Failed to generate track recommendations: ${error.message}`);
  }
}

export async function processUserMood(request: MoodAnalysisRequest): Promise<MoodAnalysisResponse> {
  try {
    // Prepare the system prompt
    let systemPrompt = `You are a music expert who can analyze a person's mood description and recommend suitable music. 
    Based on their mood description, determine appropriate music genres, artists, and mood keywords that would match how they're feeling.
    Also suggest an intensity level (1-10), energy level (1-10) and tempo preference (slow, medium, fast).
    Finally, create a fitting name and description for a playlist that matches their mood.`;
    
    // Prepare the user prompt
    let userPrompt = `My current mood: ${request.moodDescription}`;
    
    // Include listening history if available
    if (request.recentlyPlayed && request.recentlyPlayed.length > 0) {
      userPrompt += `\n\nHere are some tracks I've listened to recently:`;
      
      // Add up to 10 recently played tracks
      const tracks = request.recentlyPlayed.slice(0, 10);
      tracks.forEach(track => {
        userPrompt += `\n- ${track.artist} - ${track.track}`;
      });
      
      userPrompt += `\n\nPlease consider my music taste when making recommendations.`;
    }
    
    userPrompt += `\n\nRespond with a JSON object that includes these fields:
    - genres: array of music genres that match my mood
    - artists: array of suggested artists
    - mood_keywords: array of keywords that describe the emotional quality of the music
    - intensity: number (1-10) indicating how intense the music should be
    - energy_level: number (1-10) indicating how energetic the music should be
    - tempo_preference: string ("slow", "medium", or "fast")
    - playlist_name: creative name for a playlist that matches my mood
    - playlist_description: brief paragraph describing the playlist and how it relates to my mood`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(content) as MoodAnalysisResponse;
    
    // Validate result
    if (!result.genres || !Array.isArray(result.genres) || 
        !result.mood_keywords || !Array.isArray(result.mood_keywords) ||
        !result.playlist_name || !result.playlist_description) {
      throw new Error("Invalid response format from OpenAI");
    }
    
    return result;
  } catch (err) {
    const error = err as Error;
    console.error("Error analyzing mood with OpenAI:", error);
    throw new Error(`Failed to analyze mood: ${error.message || "Unknown error"}`);
  }
}
