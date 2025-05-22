import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import MoodInput from "@/components/MoodInput";
import LoadingState from "@/components/LoadingState";
import ConnectSpotify from "@/components/ConnectSpotify";
import PlaylistResults from "@/components/PlaylistResults";
import PlaylistSaved from "@/components/PlaylistSaved";
import ErrorState from "@/components/ErrorState";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PlaylistData, Track } from "@/lib/types";
import { PlaylistParams } from "@/components/MoodInput";

type AppState = 
  | "moodInput" 
  | "loading" 
  | "connectSpotify" 
  | "playlistResults" 
  | "playlistSaved"  
  | "error";

export default function Home() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const [errorTitle, setErrorTitle] = useState("Oops! Something went wrong");
  const [errorMessage, setErrorMessage] = useState("We couldn't process your request. Please try again later or check your connection.");
  
  // App state management
  const [currentState, setCurrentState] = useState<AppState>("moodInput");
  const [mood, setMood] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [playlistParams, setPlaylistParams] = useState<PlaylistParams>({
    length: 20,
    diversity: 2,
    popularity: 50,
    includeHistory: false
  });
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");
  
  // Spotify authentication
  const { 
    isAuthenticated, 
    login,
    handleCallback,
    spotifyAccessToken
  } = useSpotifyAuth();

  // Handle Spotify callback
  useEffect(() => {
    if (location === "/callback") {
      const code = params.get("code");
      if (code) {
        // Show loading state while authenticating
        setCurrentState("loading");
        
        handleCallback(code)
          .then(() => {
            // Redirect back to home after successful auth
            setLocation("/");
            
            // Continue with playlist creation if we were in the middle of it
            if (playlistData && currentState === "connectSpotify") {
              setCurrentState("loading");
              toast({
                title: "Saving playlist to Spotify",
                description: "Please wait while we save your playlist..."
              });
              
              savePlaylistMutation.mutate({
                playlistName: playlistData.title,
                playlistDescription: playlistData.description,
                tracks: playlistData.tracks.map(track => track.uri)
              });
            } else {
              // If we weren't in the process of saving, go back to the playlist results
              if (playlistData) {
                setCurrentState("playlistResults");
              } else {
                setCurrentState("moodInput");
              }
            }
          })
          .catch((error) => {
            console.error("Auth callback error:", error);
            
            // Zeige detailliertere Fehlermeldung
            let errorMsg = "We couldn't authenticate your Spotify account. ";
            
            if (error.message && error.message.includes("State mismatch")) {
              errorMsg += "There was a security verification issue. This might happen if you're using a different browser or device than when you started the authentication process.";
            } else if (error.message && error.message.includes("No access token")) {
              errorMsg += "Spotify didn't provide an access token. Check if your Spotify credentials are correct in the developer dashboard.";
            } else {
              errorMsg += "Please try again or check your connection.";
            }
            
            setErrorTitle("Authentication Failed");
            setErrorMessage(errorMsg);
            setCurrentState("error");
            
            // Zeige Hinweis-Toast mit Debugging-Infos
            toast({
              title: "Debug Info",
              description: `Current URL: ${window.location.href}. If this error persists, make sure this URL is registered in your Spotify Developer Dashboard.`,
              variant: "destructive",
            });
          });
      } else {
        const error = params.get("error");
        if (error) {
          setErrorTitle("Authentication Cancelled");
          setErrorMessage("You cancelled the Spotify authentication process.");
          setCurrentState("error");
        }
        setLocation("/");
      }
    }
  }, [location, params, handleCallback, setLocation, playlistData, currentState, toast]);

  // Mutation to generate playlist based on mood and parameters
  const generatePlaylistMutation = useMutation({
    mutationFn: async ({
      mood, 
      params
    }: {
      mood: string, 
      params: PlaylistParams
    }) => {
      const response = await apiRequest(
        "POST", 
        "/api/generate-playlist", 
        { 
          mood, 
          length: params.length,
          diversity: params.diversity,
          popularity: params.popularity,
          includeHistory: params.includeHistory
        }
      );
      return response.json();
    },
    onSuccess: (data: PlaylistData) => {
      setPlaylistData(data);
      setCurrentState("playlistResults");
    },
    onError: (error) => {
      console.error("Generate playlist error:", error);
      setErrorTitle("Playlist Generation Failed");
      setErrorMessage("We couldn't generate a playlist based on your mood. Please try again.");
      setCurrentState("error");
    }
  });

  // Mutation to save playlist to Spotify
  const savePlaylistMutation = useMutation({
    mutationFn: async (data: {
      playlistName: string,
      playlistDescription: string,
      tracks: string[]
    }) => {
      const response = await apiRequest(
        "POST", 
        "/api/save-playlist", 
        { ...data, accessToken: spotifyAccessToken }
      );
      return response.json();
    },
    onSuccess: (data: {playlistUrl: string, warning?: string}) => {
      setSpotifyPlaylistUrl(data.playlistUrl);
      
      // Wenn eine Warnung zurückkommt, zeigen wir sie an, wechseln aber trotzdem zum "playlistSaved" Zustand
      if (data.warning) {
        console.log("Playlist gespeichert mit Warnung:", data.warning);
      }
      
      setCurrentState("playlistSaved");
    },
    onError: (error) => {
      console.error("Save playlist error:", error);
      setErrorTitle("Couldn't Save Playlist");
      setErrorMessage("We couldn't save your playlist to Spotify. Please try again.");
      setCurrentState("error");
    }
  });

  // Handle mood input submission with advanced parameters
  const handleGeneratePlaylist = (moodText: string, params: PlaylistParams) => {
    setMood(moodText);
    setPlaylistParams(params);
    setIncludeHistory(params.includeHistory);
    setCurrentState("loading");
    
    // Ensure we only use history when the user is authenticated
    const finalParams = {
      ...params,
      includeHistory: params.includeHistory && isAuthenticated
    };
    
    // If user wants to use history but isn't authenticated, log it
    if (params.includeHistory && !isAuthenticated) {
      console.log("Listening history requested but user not authenticated");
    }
    
    generatePlaylistMutation.mutate({
      mood: moodText,
      params: finalParams
    });
  };

  // Handle save to Spotify
  const handleSaveToSpotify = () => {
    if (!playlistData) return;
    
    if (!isAuthenticated) {
      setCurrentState("connectSpotify");
    } else {
      // Filtere Tracks mit ungültigen URIs heraus
      const validTracks = playlistData.tracks.filter(track => {
        // Entweder korrekte Spotify Track URI oder URL
        return track.uri.startsWith('spotify:track:') || 
               track.uri.startsWith('https://open.spotify.com/track/');
      });
      
      if (validTracks.length === 0) {
        toast({
          title: "Keine gültigen Tracks",
          description: "Es wurden keine gültigen Spotify-Tracks gefunden.",
          variant: "destructive"
        });
        return;
      }
      
      savePlaylistMutation.mutate({
        playlistName: playlistData.title, // Verwendet immer den aktuellsten Titel (inkl. Bearbeitungen)
        playlistDescription: playlistData.description,
        tracks: validTracks.map(track => track.uri)
      });
    }
  };

  // Handle create another playlist from scratch (clear mood)
  const handleCreateAnother = () => {
    setMood("");
    setIncludeHistory(false);
    setPlaylistData(null);
    setCurrentState("moodInput");
  };
  
  // Handle regenerate playlist with the same mood
  const handleRegeneratePlaylist = () => {
    if (!mood) return;
    
    setCurrentState("loading");
    toast({
      title: "Generating New Playlist",
      description: "Creating a different playlist based on your mood..."
    });
    
    // Make a copy of parameters and ensure history is only used when authenticated
    const finalParams = {
      ...playlistParams,
      includeHistory: playlistParams.includeHistory && isAuthenticated
    };
    
    generatePlaylistMutation.mutate({
      mood,
      params: finalParams
    });
  };

  // Playlist-Titel aktualisieren
  const handleTitleChange = (newTitle: string) => {
    if (playlistData) {
      // Aktualisieren des Playlist-Titels im lokalen State
      setPlaylistData({
        ...playlistData,
        title: newTitle
      });
    }
  };
  
  // Handle try again button click
  const handleTryAgain = () => {
    setCurrentState("moodInput");
  };

  // Main render function
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <header className="mb-8 md:mb-12 text-center">
        <div className="flex items-center justify-center mb-1">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Moodyfy</h1>
          <div className="ml-2 flex space-x-1 items-end h-8">
            <div className="equalizer-bar bg-[hsl(var(--spotify-green))] w-1 h-3 rounded-sm"></div>
            <div className="equalizer-bar bg-[hsl(var(--spotify-green))] w-1 h-5 rounded-sm"></div>
            <div className="equalizer-bar bg-[hsl(var(--spotify-green))] w-1 h-2 rounded-sm"></div>
          </div>
        </div>
        <p className="text-[hsl(var(--spotify-light-gray))] text-lg">Turn your feelings into music</p>
      </header>
      
      {/* Main content */}
      {currentState === "moodInput" && (
        <MoodInput onSubmit={handleGeneratePlaylist} />
      )}
      
      {currentState === "loading" && (
        <LoadingState isPending={generatePlaylistMutation.isPending || savePlaylistMutation.isPending} />
      )}
      
      {currentState === "connectSpotify" && (
        <ConnectSpotify onConnect={login} />
      )}
      
      {currentState === "playlistResults" && playlistData && (
        <PlaylistResults 
          playlist={playlistData} 
          onSaveToSpotify={handleSaveToSpotify}
          onRegeneratePlaylist={handleRegeneratePlaylist}
          onTitleChange={handleTitleChange}
        />
      )}
      
      {currentState === "playlistSaved" && (
        <PlaylistSaved 
          playlistUrl={spotifyPlaylistUrl} 
          onCreateAnother={handleCreateAnother} 
        />
      )}
      
      {currentState === "error" && (
        <ErrorState 
          title={errorTitle} 
          message={errorMessage} 
          onTryAgain={handleTryAgain} 
        />
      )}
      
      {/* Footer */}
      <footer className="mt-12 text-center text-[hsl(var(--spotify-light-gray))] text-sm">
        <p>Moodyfy uses Spotify and OpenAI to turn your feelings into the perfect playlist.</p>
        <p className="mt-1">Not affiliated with Spotify or OpenAI.</p>
      </footer>
    </div>
  );
}
