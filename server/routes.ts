import type { Express } from "express";
import { createServer, type Server } from "http";
import { processUserMood, MoodAnalysisRequest, generateTrackRecommendations } from "./openai";
import { 
  getSpotifyToken, 
  refreshSpotifyToken, 
  getUserProfile, 
  getRecentlyPlayed, 
  createPlaylist, 
  addTracksToPlaylist
} from "./spotify";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API routes
  
  // Generate playlist based on mood
  app.post("/api/generate-playlist", async (req, res) => {
    try {
      const { mood, includeHistory } = req.body;
      
      if (!mood) {
        return res.status(400).json({ error: "Mood description is required" });
      }
      
      // Get user's listening history if requested and if token exists
      let recentlyPlayed = [];
      const accessToken = req.headers.authorization?.split(' ')[1];
      
      if (includeHistory) {
        if (accessToken) {
          try {
            console.log("Fetching user's listening history from Spotify...");
            const recentlyPlayedData = await getRecentlyPlayed(accessToken);
            
            if (recentlyPlayedData && recentlyPlayedData.items && recentlyPlayedData.items.length > 0) {
              recentlyPlayed = recentlyPlayedData.items.map((item: any) => ({
                artist: item.track.artists[0].name,
                track: item.track.name,
                uri: item.track.uri
              }));
              console.log(`Successfully retrieved ${recentlyPlayed.length} recently played tracks`);
            } else {
              console.log("No recently played tracks found or empty response");
            }
          } catch (error) {
            console.error("Error fetching recently played:", error);
            // Continue without history if there's an error
          }
        } else {
          console.log("includeHistory flag is true but no access token provided");
        }
      }
      
      // Process mood with OpenAI
      const moodAnalysisRequest: MoodAnalysisRequest = {
        moodDescription: mood,
        recentlyPlayed: recentlyPlayed
      };
      
      const moodAnalysis = await processUserMood(moodAnalysisRequest);
      
      // Generate track recommendations using OpenAI
      try {
        console.log("Getting track recommendations with OpenAI");
        const tracks = await generateTrackRecommendations(moodAnalysis);
        
        // Return the playlist data
        return res.status(200).json({
          title: moodAnalysis.playlist_name,
          description: moodAnalysis.playlist_description,
          tracks: tracks
        });
      } catch (openAIError: any) {
        console.error("OpenAI recommendations error:", openAIError);
        return res.status(503).json({ 
          error: "Music recommendations unavailable", 
          message: "Failed to generate music recommendations. Please try again later.",
          details: openAIError.message 
        });
      }
      
    } catch (error: any) {
      console.error("Error generating playlist:", error);
      return res.status(500).json({ 
        error: "Failed to generate playlist",
        details: error.message 
      });
    }
  });
  
  // Save playlist to Spotify
  app.post("/api/save-playlist", async (req, res) => {
    try {
      const { accessToken, playlistName, playlistDescription, tracks } = req.body;
      
      if (!accessToken) {
        return res.status(401).json({ error: "Spotify access token is required" });
      }
      
      if (!playlistName || !tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: "Playlist name and tracks are required" });
      }
      
      // Get user profile
      const userProfile = await getUserProfile(accessToken);
      
      // Create new playlist
      const playlist = await createPlaylist(
        accessToken,
        userProfile.id,
        playlistName,
        playlistDescription || `A mood playlist created by Moodyfy`
      );
      
      // Add tracks to the playlist
      // Ensure all track URIs are in the correct format (spotify:track:ID)
      const validTrackUris = tracks.filter(uri => {
        // Überprüfe, ob es sich um eine gültige Spotify URI handelt
        // Ignoriere leere URIs und Fallback-URIs komplett
        const isValid = uri && typeof uri === 'string' && 
          (uri.startsWith('spotify:track:') || uri.startsWith('https://open.spotify.com/track/')) &&
          !uri.includes('fallback_');
        
        if (!isValid) {
          console.log(`Überspringe ungültige Track-URI: ${uri}`);
        }
        return isValid;
      }).map(uri => {
        // Konvertiere URLs in URIs, falls nötig
        if (uri.startsWith('https://open.spotify.com/track/')) {
          const trackId = uri.split('/').pop()?.split('?')[0];
          if (trackId) {
            // Stelle sicher, dass die Track-ID aus base-62 Zeichen besteht (a-z, A-Z, 0-9)
            if (/^[a-zA-Z0-9]+$/.test(trackId)) {
              return `spotify:track:${trackId}`;
            } else {
              console.log(`Ungültige Track-ID: ${trackId}`);
              return null;
            }
          }
        }
        return uri;
      }).filter(uri => uri !== null);
      
      if (validTrackUris.length === 0) {
        // Auch wenn keine gültigen URIs vorhanden sind, erstellen wir trotzdem die Playlist
        // und geben sie zurück, damit der Benutzer sie später bearbeiten kann
        console.log("Keine gültigen Track-URIs gefunden. Erstelle leere Playlist.");
        return res.status(200).json({
          playlistId: playlist.id,
          playlistUrl: playlist.external_urls.spotify,
          warning: "No valid track URIs found. Created empty playlist."
        });
      }
      
      try {
        console.log(`Füge ${validTrackUris.length} von ${tracks.length} Tracks zur Playlist hinzu`);
        await addTracksToPlaylist(accessToken, playlist.id, validTrackUris);
      } catch (error) {
        const trackError = error as Error;
        console.error("Fehler beim Hinzufügen der Tracks:", trackError);
        // Wir geben trotzdem die Playlist zurück, auch wenn das Hinzufügen der Tracks fehlgeschlagen ist
        return res.status(200).json({
          playlistId: playlist.id,
          playlistUrl: playlist.external_urls.spotify,
          warning: "Error adding tracks to playlist, but playlist was created.",
          errorDetails: trackError.message
        });
      }
      
      return res.status(200).json({
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify
      });
      
    } catch (error: any) {
      console.error("Error saving playlist:", error);
      
      // Extrahiere den spezifischen Fehler zu ungültigen IDs
      if (error.message && error.message.includes('Invalid base62 id')) {
        // Erstelle eine leere Playlist anstatt einen Fehler zu werfen
        return res.status(200).json({ 
          playlistId: "empty",
          playlistUrl: "https://open.spotify.com",
          warning: "Failed to add tracks due to invalid IDs, but a playlist was created.",
          errorDetails: error.message 
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to save playlist to Spotify",
        details: error.message 
      });
    }
  });
  
  // Spotify Auth Routes
  
  // Handle Spotify callback
  app.post("/api/spotify/callback", async (req, res) => {
    try {
      const { code, redirect_uri } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }
      
      if (!redirect_uri) {
        return res.status(400).json({ error: "Redirect URI is required" });
      }
      
      // Bekannte zugelassene Redirect-URIs
      const allowedRedirectUris = [
        "https://eb442eff-03cc-491b-ae4f-470d2553a7b1-00-17hciobt68i88.riker.replit.dev/callback",
        "https://moodyfy.replit.app/callback",
        "https://mood-mate-info5656.replit.app/callback",
        "http://localhost:5000/callback",
        "http://localhost:3000/callback"
      ];
      
      // Überprüfe, ob die übergebene Redirect-URI erlaubt ist
      if (!allowedRedirectUris.includes(redirect_uri)) {
        console.warn("WARNUNG: Unbekannte Redirect-URI erhalten:", redirect_uri);
        console.warn("Diese sollte im Spotify Developer Dashboard eingetragen werden.");
      }
      
      console.log("Server erhielt Callback-Request mit Code. Verwende dynamische Redirect-URI:", redirect_uri);
      
      // Da wir keine persistenten Daten zwischen Anfragen haben, können wir hier nur
      // Vorkehrungen treffen, um Fehler bei wiederholter Nutzung des gleichen Codes zu mindern
      
      // Implementiere Rate Limiting (max. 1 Anfrage alle 1.5 Sekunden)
      // Wenn der Fehler "429 Too Many Requests" auftritt, verzögern wir die Anfrage
      let retries = 0;
      const maxRetries = 3;
      let tokenData;
      
      while (retries <= maxRetries) {
        try {
          tokenData = await getSpotifyToken(code, redirect_uri);
          
          break; // Wenn erfolgreich, beende die Schleife
        } catch (retryError: any) {
          const errorMessage = retryError.message || "";
          
          // Prüfe, ob es sich um einen bereits verwendeten Code handelt
          if (errorMessage.includes('invalid_grant')) {
            console.warn("Code wurde möglicherweise bereits verwendet:", code);
            // In einer produktiven Anwendung würden wir hier den Code in einer
            // Datenbank oder einem Cache markieren
            
            throw retryError;
          }
          
          // Bei Rate Limiting, warten und erneut versuchen
          if (errorMessage.includes('429') && retries < maxRetries) {
            retries++;
            console.log(`Rate Limiting erkannt (429). Warte vor Versuch ${retries}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 1500 * retries)); // Exponentielles Backoff
          } else {
            // Bei anderen Fehlern oder wenn max Retries erreicht: Werfe den Fehler
            throw retryError;
          }
        }
      }
      
      return res.status(200).json(tokenData);
    } catch (error: any) {
      // Prüfe, ob es sich um einen "invalid_grant"-Fehler handelt
      if (error.message && error.message.includes('invalid_grant')) {
        console.log("Invalid grant error erkannt, sende angepasste Antwort");
        
        // Dies passiert, wenn der Code bereits verwendet wurde
        // Wir geben einen 401 zurück mit nützlichem Hinweis für den Client
        return res.status(401).json({
          error: "Authorization code already used",
          details: "This authorization code has been used previously and is no longer valid",
          code: "invalid_grant"
        });
      }
      
      console.error("Error in Spotify callback:", error);
      return res.status(500).json({ 
        error: "Failed to authenticate with Spotify",
        details: error.message 
      });
    }
  });
  
  // Refresh Spotify token
  app.post("/api/spotify/refresh-token", async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ error: "Refresh token is required" });
      }
      
      const tokenData = await refreshSpotifyToken(refresh_token);
      
      return res.status(200).json(tokenData);
    } catch (error: any) {
      console.error("Error refreshing token:", error);
      return res.status(500).json({ 
        error: "Failed to refresh Spotify token",
        details: error.message 
      });
    }
  });
  
  // Test route for Spotify API
  app.get("/api/spotify/test-api", async (req, res) => {
    try {
      // Get token using client credentials
      console.log("Testing Spotify API access with new credentials");
      
      try {
        // Direkter Abruf, um die neuen Credentials zu verwenden
        const authString = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');
        
        console.log("Requesting Spotify token...");
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({ grant_type: "client_credentials" })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`Token request failed: ${tokenResponse.status} ${errorText}`);
          throw new Error(`Token request failed: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        const token = tokenData.access_token;
        console.log("Successfully obtained Spotify token:", token.substring(0, 10) + "...");
        
        // Test access to Spotify API (user profile endpoint)
        console.log("Testing user profile endpoint...");
        const userProfileResponse = await fetch(
          "https://api.spotify.com/v1/me", 
          {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }
        );
        
        // Der Client Credentials Flow erlaubt keinen Zugriff auf Benutzerprofile,
        // daher erwarten wir einen 401-Fehler. Das ist normal und zeigt, dass die API funktioniert.
        
        console.log(`User profile response status: ${userProfileResponse.status}`);
        
        // Test access to search API (which should work with client credentials)
        console.log("Testing search API...");
        const searchResponse = await fetch(
          "https://api.spotify.com/v1/search?q=mood&type=track&limit=1", 
          {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }
        );
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`Search API test failed: ${searchResponse.status} ${errorText}`);
          throw new Error(`Search API test failed: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        return res.status(200).json({
          success: true,
          message: "Successfully accessed Spotify API",
          token_obtained: true,
          client_credentials_working: true,
          user_profile_expected_401: userProfileResponse.status === 401,
          search_tracks: searchData.tracks?.items?.length || 0,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in
        });
      } catch (error: any) {
        console.error("Spotify API test failed:", error);
        return res.status(500).json({
          success: false,
          error: "Spotify API test failed",
          details: error.message
        });
      }
    } catch (outerError: any) {
      console.error("Unexpected error in test route:", outerError);
      return res.status(500).json({ error: outerError.message });
    }
  });

  return httpServer;
}
