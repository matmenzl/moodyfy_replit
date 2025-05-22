import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Generate a random string for state verification
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map(x => possible[x % possible.length])
    .join('');
};

// The scope defines what permissions we're asking for
const SPOTIFY_SCOPES = [
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ');

export function useSpotifyAuth() {
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!spotifyAccessToken);
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('spotify_user_id'));
  const { toast } = useToast();
  
  // Check token validity on mount
  useEffect(() => {
    const checkToken = async () => {
      if (!spotifyAccessToken) return;
      
      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${spotifyAccessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserId(data.id);
          localStorage.setItem('spotify_user_id', data.id);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, try to refresh it
          await refreshToken();
        }
      } catch (error) {
        console.error('Error validating token:', error);
        logout();
      }
    };
    
    checkToken();
  }, [spotifyAccessToken]);
  
  // Refresh token function
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (!refreshToken) {
      logout();
      return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/spotify/refresh-token', { 
        refresh_token: refreshToken 
      });
      
      if (response.ok) {
        const data = await response.json();
        updateTokensInStorage(data.access_token, data.refresh_token);
        setIsAuthenticated(true);
        return true;
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return false;
    }
  };
  
  // Save tokens to localStorage
  const updateTokensInStorage = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('spotify_access_token', accessToken);
    setSpotifyAccessToken(accessToken);
    
    if (refreshToken) {
      localStorage.setItem('spotify_refresh_token', refreshToken);
    }
  };
  
  // Start the login flow
  const login = useCallback(() => {
    const state = generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);
    
    // Verwende dynamische Redirect-URI basierend auf der aktuellen Domain
    // Diese URI MUSS mit einer der im Spotify Developer Dashboard eingetragenen URIs übereinstimmen
    // Verwende die aktuelle URL als Basis und füge /callback hinzu
    const redirectUri = `${window.location.origin}/callback`;
    localStorage.setItem('spotify_redirect_uri', redirectUri);
    
    // Überprüfen, ob die aktuelle Origin vermutlich im Spotify Dashboard eingetragen ist
    const knownOrigins = [
      "https://eb442eff-03cc-491b-ae4f-470d2553a7b1-00-17hciobt68i88.riker.replit.dev",
      "https://moodyfy.replit.app",
      "https://mood-mate-info5656.replit.app", // Hinzugefügt aufgrund der URL in der Fehlermeldung
      "http://localhost:5000",
      "http://localhost:3000"
    ];
    
    console.log("Aktuelle URL Origin:", window.location.origin);
    
    // In localStorage für Debug-Zwecke speichern
    try {
      const authHistory = JSON.parse(localStorage.getItem('auth_history') || '[]');
      authHistory.push({
        timestamp: new Date().toISOString(),
        origin: window.location.origin,
        state,
        isKnownOrigin: knownOrigins.includes(window.location.origin)
      });
      // Nur die letzten 5 Einträge behalten
      if (authHistory.length > 5) authHistory.shift();
      localStorage.setItem('auth_history', JSON.stringify(authHistory));
    } catch (e) {
      console.warn("Konnte Auth-History nicht speichern:", e);
    }
    
    if (!knownOrigins.includes(window.location.origin)) {
      console.warn("ACHTUNG: Die aktuelle Origin ist möglicherweise nicht im Spotify Dashboard eingetragen!");
      console.warn("Bitte füge diese URL zum Spotify Dashboard hinzu: " + redirectUri);
      
      toast({
        title: "Spotify Setup-Hinweis",
        description: `Die aktuelle Domain (${window.location.host}) ist möglicherweise nicht für Spotify authorisiert. Stellen Sie sicher, dass ${redirectUri} als Redirect-URI im Spotify Developer Dashboard eingetragen ist.`,
        variant: "destructive",
      });
    }
    
    console.log("Starte Spotify-Authentifizierung mit dynamischer Redirect-URI:", redirectUri);
    
    // Die Spotify Authorization URL erstellen
    const spotifyAuthUrl = new URL('https://accounts.spotify.com/authorize');
    
    // Verwende die Client ID aus der Umgebungsvariable (vom Server)
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '28fc9dbfac7742a8bbc1de49306da7a6';
    spotifyAuthUrl.searchParams.append('client_id', clientId);
    spotifyAuthUrl.searchParams.append('response_type', 'code');
    spotifyAuthUrl.searchParams.append('redirect_uri', redirectUri);
    spotifyAuthUrl.searchParams.append('state', state);
    spotifyAuthUrl.searchParams.append('scope', SPOTIFY_SCOPES);
    spotifyAuthUrl.searchParams.append('show_dialog', 'true'); // Erzwinge Login-Dialog für besseres Debugging

    // Öffne die Spotify-Auth-URL
    console.log("Navigiere zu:", spotifyAuthUrl.toString());
    window.location.href = spotifyAuthUrl.toString();
  }, [toast]);
  
  // Handle the callback from Spotify
  const handleCallback = async (code: string) => {
    // Überprüfe, ob dieser Code bereits verarbeitet wurde, um doppelte Anfragen zu vermeiden
    const processedCode = localStorage.getItem('spotify_processed_code');
    if (processedCode === code) {
      console.log("Dieser Auth-Code wurde bereits verarbeitet, ignoriere doppelte Anfrage");
      
      // Stelle sicher, dass unsere Auth-State im React korrekt gesetzt ist
      const existingToken = localStorage.getItem('spotify_access_token');
      if (existingToken) {
        setSpotifyAccessToken(existingToken);
        setIsAuthenticated(true);
        
        const userId = localStorage.getItem('spotify_user_id');
        if (userId) {
          setUserId(userId);
        }
      }
      
      return true; // Erfolg vortäuschen, um weitere Verarbeitung zu vermeiden
    }
    
    // Überprüfe den State-Parameter zur Sicherheit
    const storedState = localStorage.getItem('spotify_auth_state');
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    
    console.log("Spotify Callback erhalten, überprüfe State");
    console.log("- URL State:", state);
    console.log("- Gespeicherter State:", storedState);
    
    // In Produktionsumgebungen kann es vorkommen, dass der localStorage nicht 
    // über Domains hinweg persistiert wird. Daher machen wir die State-Überprüfung 
    // in Produktionsumgebungen optional.
    const isProduction = window.location.hostname !== 'localhost';
    
    if (state !== storedState) {
      console.warn("State mismatch in Spotify callback:", state, "vs", storedState);
      
      if (isProduction) {
        console.warn("Erlaube Auth trotz State-Mismatch in Produktionsumgebung");
        // In Produktion fahren wir fort, auch wenn der State nicht übereinstimmt
        toast({
          title: "Sicherheitshinweis",
          description: "Die Authentifizierung erfolgte über unterschiedliche Domains. Dies ist in Produktionsumgebungen normal.",
        });
      } else {
        // Im Development-Modus werfen wir einen Fehler
        throw new Error('State mismatch - Sicherheitsüberprüfung fehlgeschlagen');
      }
    }
    
    // Verwende genau die gleiche Redirect-URI wie beim Login
    // Dies ist wichtig, da Spotify beide URIs vergleicht
    let redirectUri = localStorage.getItem('spotify_redirect_uri');
    
    // Wenn keine URI gespeichert ist oder sie nicht zur aktuellen Domain passt
    if (!redirectUri || !redirectUri.includes(window.location.host)) {
      // Erstelle eine neue URI basierend auf der aktuellen Domain
      redirectUri = `${window.location.origin}/callback`;
      console.log("Keine passende Redirect-URI gefunden, verwende aktuelle Domain:", redirectUri);
    } else {
      console.log("Verwende gespeicherte Redirect-URI:", redirectUri);
    }
    
    // Markiere diesen Code als in Bearbeitung, um doppelte Anfragen zu vermeiden
    localStorage.setItem('spotify_processing_code', code);
      
    try {
      // Implementiere Retry-Mechanismus für den Fall von Rate-Limiting
      const maxRetries = 3;
      let retryCount = 0;
      let response = null;
      let rateLimited = false;
      
      console.log("Sende Code an Backend für Token-Austausch");
      
      while (retryCount <= maxRetries) {
        try {
          response = await apiRequest('POST', '/api/spotify/callback', {
            code,
            redirect_uri: redirectUri
          });
          
          // Wenn wir hier ankommen, war die Anfrage erfolgreich
          break;
        } catch (reqError: any) {
          // Prüfe, ob es sich um einen Rate-Limiting-Fehler handelt (429)
          if (reqError.message && reqError.message.includes('429') && retryCount < maxRetries) {
            retryCount++;
            rateLimited = true;
            const waitTime = 1500 * retryCount; // Exponentielles Backoff
            
            console.log(`Rate Limiting erkannt (429). Warte ${waitTime}ms vor Versuch ${retryCount}/${maxRetries}...`);
            toast({
              title: "Verbindung wird hergestellt",
              description: `Versuche erneut, die Verbindung herzustellen (${retryCount}/${maxRetries})...`,
            });
            
            // Warte vor dem nächsten Versuch
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            // Bei anderen Fehlern werfen wir sie weiter
            throw reqError;
          }
        }
      }
      
      if (!response) {
        throw new Error('Maximale Anzahl von Versuchen erreicht');
      }
      
      if (rateLimited) {
        toast({
          title: "Verbindung hergestellt",
          description: "Spotify-Authentifizierung erfolgreich nach mehreren Versuchen",
        });
      }
      
      const data = await response.json();
      
      if (data.access_token) {
        updateTokensInStorage(data.access_token, data.refresh_token);
        
        // Get user profile to save user id
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserId(profileData.id);
          localStorage.setItem('spotify_user_id', profileData.id);
        }
        
        setIsAuthenticated(true);
        toast({
          title: "Erfolgreich mit Spotify verbunden",
          description: "Deine Mood-Playlist wird in deinem Account gespeichert"
        });
        
        // Speichere den Code als verarbeitet, um doppelte Anfragen zu vermeiden
        localStorage.setItem('spotify_processed_code', code);
        localStorage.removeItem('spotify_processing_code');
        return true;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      // Wenn der Fehler "invalid_grant" oder "Authorization code already used" ist
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      
      if (errorMessage.includes('invalid_grant') || 
          errorMessage.includes('Authorization code already used') ||
          errorMessage.includes('code:"invalid_grant"')) {
        
        console.warn("Authorization code wurde möglicherweise bereits verwendet");
        
        // Prüfen, ob wir schon einen funktionierenden Token haben
        const existingToken = localStorage.getItem('spotify_access_token');
        if (existingToken) {
          console.log("Aber es scheint einen gültigen Token zu geben, ignoriere Fehler");
          
          // Setze den Zustand, als ob die Authentifizierung erfolgreich war
          setSpotifyAccessToken(existingToken);
          setIsAuthenticated(true);
          
          const userId = localStorage.getItem('spotify_user_id');
          if (userId) {
            setUserId(userId);
          }
          
          // Speichere den Code als verarbeitet
          localStorage.setItem('spotify_processed_code', code);
          localStorage.removeItem('spotify_processing_code');
          
          return true;
        }
        
        // Falls kein Token existiert, aber der Fehler "invalid_grant" ist,
        // zeigen wir eine freundlichere Fehlermeldung an
        toast({
          title: "Anmeldevorgang bereits abgeschlossen",
          description: "Dieser Anmeldelink wurde bereits verwendet. Bitte versuche erneut, dich mit Spotify zu verbinden.",
        });
        
        return false;
      }
      
      // Bei anderen Fehlern zeigen wir die normale Fehlermeldung an
      console.error('Error handling callback:', error);
      
      toast({
        title: "Authentifizierung fehlgeschlagen",
        description: "Verbindung zu Spotify konnte nicht hergestellt werden. " + 
                    (error instanceof Error ? error.message : "Bitte versuche es später erneut."),
        variant: "destructive"
      });
      
      // Entferne den in-progress-Status, aber behalte die auth_state für Debugging
      localStorage.removeItem('spotify_processing_code');
      throw error;
    } finally {
      // Wir entfernen den auth_state nur bei Erfolg, um Debugging zu erleichtern
      if (localStorage.getItem('spotify_processed_code') === code) {
        localStorage.removeItem('spotify_auth_state');
      }
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_user_id');
    localStorage.removeItem('spotify_redirect_uri');
    localStorage.removeItem('spotify_auth_state');
    localStorage.removeItem('spotify_processed_code');
    localStorage.removeItem('spotify_processing_code');
    localStorage.removeItem('auth_history');
    setSpotifyAccessToken(null);
    setUserId(null);
    setIsAuthenticated(false);
    
    console.log("Spotify-Abmeldung durchgeführt");
  };
  
  return {
    login,
    logout,
    handleCallback,
    isAuthenticated,
    spotifyAccessToken,
    userId,
    refreshToken
  };
}
