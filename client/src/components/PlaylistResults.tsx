import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaylistData, Track } from "@/lib/types";
import { Edit, Check } from "lucide-react";

interface PlaylistResultsProps {
  playlist: PlaylistData;
  onSaveToSpotify: () => void;
  onRegeneratePlaylist?: () => void; // Neue Funktion zum Regenerieren der Playlist
  onTitleChange?: (newTitle: string) => void; // Optional: Callback für Titeländerungen
}

export default function PlaylistResults({ playlist, onSaveToSpotify, onRegeneratePlaylist, onTitleChange }: PlaylistResultsProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(playlist.title);
  
  // Update editedTitle, wenn sich playlist.title ändert (z.B. bei Regenerierung der Playlist)
  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(playlist.title);
    }
  }, [playlist.title, isEditingTitle]);
  
  // Titel bearbeiten abschließen
  const handleFinishEditing = () => {
    if (editedTitle.trim() === '') {
      // Leerer Titel nicht erlaubt, bleib beim ursprünglichen
      setEditedTitle(playlist.title);
    } else if (editedTitle !== playlist.title && onTitleChange) {
      // Nur Callback auslösen, wenn sich der Titel geändert hat und Callback existiert
      onTitleChange(editedTitle);
    }
    setIsEditingTitle(false);
  };
  
  return (
    <section>
      <Card className="bg-spotify-gray rounded-xl shadow-lg mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Playlist Cover and Description */}
            <div className="w-full md:w-1/3">
              <div className="aspect-square rounded-lg shadow-lg overflow-hidden mb-4 relative bg-gradient-to-br from-spotify-dark-gray to-spotify-black">
                {/* Album Art Collage */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-2 opacity-70">
                  {playlist.tracks.slice(0, 4).map((track, index) => (
                    <div key={index} className="rounded-md bg-spotify-gray overflow-hidden">
                      {track.albumImage ? (
                        <img 
                          src={track.albumImage} 
                          alt={`Album art for ${track.title}`} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            // Fallback image if loading fails - verwende stabiles Spotify Logo
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = "https://www.scdn.co/i/_global/twitter_card-default.jpg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-spotify-dark-gray flex items-center justify-center">
                          <span className="text-xs text-center text-spotify-light-gray">Album</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Playlist Title Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4 bg-black bg-opacity-60 rounded-lg w-full max-w-[90%]">
                    <div className="text-xs uppercase tracking-wider text-spotify-green mb-1 flex items-center justify-center">
                      Your Mood Playlist
                      {onTitleChange && (
                        <button 
                          onClick={() => setIsEditingTitle(!isEditingTitle)}
                          className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                          aria-label={isEditingTitle ? "Save title" : "Edit title"}
                        >
                          {isEditingTitle ? <Check size={14} /> : <Edit size={14} />}
                        </button>
                      )}
                    </div>
                    {isEditingTitle ? (
                      <div className="relative w-full">
                        <Input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="bg-black bg-opacity-30 border-spotify-green focus:border-spotify-bright text-white font-bold text-center py-1 px-2 text-lg w-full"
                          onBlur={handleFinishEditing}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleFinishEditing();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleFinishEditing}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-spotify-green text-black rounded-full p-1"
                          aria-label="Save title"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-bold text-lg md:text-xl">{editedTitle}</h3>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-spotify-dark-gray p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm uppercase text-spotify-light-gray">Playlist Description</h4>
                <p className="text-sm text-white">{playlist.description}</p>
              </div>
              
              <div className="mt-4 flex flex-col gap-3">
                <Button 
                  onClick={onSaveToSpotify}
                  className="spotify-button bg-spotify-green hover:bg-spotify-bright text-black font-bold py-3 px-6 rounded-full transition flex items-center justify-center w-full"
                >
                  <span>Save to Spotify</span>
                </Button>
                
                {onRegeneratePlaylist && (
                  <Button 
                    onClick={onRegeneratePlaylist}
                    variant="outline"
                    className="bg-transparent border-white hover:bg-white/10 text-white py-2 px-4 rounded-full transition flex items-center justify-center w-full"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    <span>Generate New Playlist</span>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Playlist Tracks */}
            <div className="w-full md:w-2/3">
              <h3 className="font-semibold mb-4 text-lg md:text-xl">Your Mood-Based Playlist</h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {playlist.tracks.map((track, index) => (
                  <div key={track.id} className="playlist-item bg-spotify-dark-gray rounded-lg p-3 flex items-center">
                    <div className="text-spotify-light-gray mr-3 w-5 text-center">{index + 1}</div>
                    <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0 bg-spotify-black">
                      {track.albumImage ? (
                        <img 
                          src={track.albumImage} 
                          alt={`Album cover for ${track.title}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback image if loading fails - verwende stabiles Spotify Logo
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = "https://www.scdn.co/i/_global/twitter_card-default.jpg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-spotify-dark-gray flex items-center justify-center">
                          <span className="text-xs text-center text-spotify-light-gray">Album</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow overflow-hidden mr-2">
                      <div className="truncate font-medium">{track.title}</div>
                      <div className="truncate text-sm text-spotify-light-gray">{track.artist}</div>
                    </div>
                    <a 
                      href={track.previewUrl || track.externalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="play-button w-8 h-8 rounded-full bg-spotify-black flex items-center justify-center flex-shrink-0 hover:bg-spotify-green transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
