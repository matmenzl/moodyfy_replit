import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlaylistSavedProps {
  playlistUrl: string;
  onCreateAnother: () => void;
}

export default function PlaylistSaved({ playlistUrl, onCreateAnother }: PlaylistSavedProps) {
  return (
    <section>
      <Card className="bg-spotify-gray rounded-xl shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-spotify-green flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-1">Playlist Successfully Saved!</h3>
            <p className="text-spotify-light-gray mb-3">Your mood playlist is now available in your Spotify library.</p>
            
            <div className="bg-yellow-900 bg-opacity-30 text-yellow-200 p-3 rounded-lg text-sm mb-6 max-w-md">
              <p className="mb-1"><strong>Note:</strong> Some songs may not appear in your Spotify playlist.</p>
              <p>This happens when songs don't have valid Spotify track IDs.</p>
            </div>
            <a 
              href={playlistUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="spotify-button inline-flex items-center justify-center bg-spotify-green hover:bg-spotify-bright text-black font-bold py-3 px-6 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z"/>
              </svg>
              <span>Open in Spotify</span>
            </a>
            
            <button 
              onClick={onCreateAnother}
              className="mt-4 text-spotify-light-gray hover:text-white underline transition"
            >
              Create another playlist
            </button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
