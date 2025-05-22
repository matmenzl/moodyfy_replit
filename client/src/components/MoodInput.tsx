import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { Info, LogOut, Music, Sliders, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Advanced playlist parameters
export interface PlaylistParams {
  length: number;       // Number of songs
  diversity: number;    // How many songs per artist (1-5)
  popularity: number;   // From 0 (obscure) to 100 (popular)
  includeHistory: boolean;
}

interface MoodInputProps {
  onSubmit: (mood: string, params: PlaylistParams) => void;
}

export default function MoodInput({ onSubmit }: MoodInputProps) {
  const [mood, setMood] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [params, setParams] = useState<PlaylistParams>({
    length: 20,
    diversity: 2,
    popularity: 50,
    includeHistory: false
  });
  const { toast } = useToast();
  const { isAuthenticated, login, logout, userId } = useSpotifyAuth();

  // Update params when includeHistory changes
  const updateIncludeHistory = (value: boolean) => {
    setParams(prev => ({ ...prev, includeHistory: value }));
  };

  const handleSubmit = () => {
    if (!mood.trim()) {
      toast({
        title: "Please describe your mood",
        description: "Tell us how you're feeling to create your playlist",
        variant: "destructive",
      });
      return;
    }
    
    // If user wants to include history but isn't authenticated
    if (params.includeHistory && !isAuthenticated) {
      setParams(prev => ({ ...prev, includeHistory: false }));
      toast({
        title: "Spotify login required",
        description: "To consider your listening history, you need to connect your Spotify account first.",
        variant: "destructive",
      });
      return;
    }
    
    // Make a copy of params to ensure includeHistory is only used when authenticated
    const finalParams = {
      ...params,
      includeHistory: params.includeHistory && isAuthenticated
    };
    
    onSubmit(mood, finalParams);
  };

  return (
    <section className="mb-8">
      <Card className="bg-spotify-gray rounded-xl shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h2 className="text-xl font-semibold">How are you feeling today?</h2>
            
            {/* Spotify Login Status */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <Badge variant="outline" className="bg-green-950/30 text-spotify-green border-spotify-green flex items-center gap-1 py-1">
                  <Music size={14} />
                  <span>Spotify Connected</span>
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500"
                        onClick={() => {
                          logout();
                          toast({
                            title: "Logged out",
                            description: "Successfully disconnected from Spotify"
                          });
                        }}
                      >
                        <LogOut size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Disconnect from Spotify</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : null}
          </div>
          
          <div className="relative">
            <Textarea 
              id="mood-input" 
              rows={3} 
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full rounded-lg bg-spotify-dark-gray p-4 text-white placeholder:text-spotify-light-gray focus:ring-2 focus:ring-spotify-green focus:outline-none resize-none"
              placeholder="Describe your mood, thoughts, or feelings..." 
            />

            <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Advanced Settings Collapsible */}
              <div className="w-full">
                <Collapsible 
                  open={advancedOpen}
                  onOpenChange={setAdvancedOpen}
                  className="w-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1 text-spotify-light-gray hover:text-white">
                        <Sliders size={16} />
                        <span>{advancedOpen ? "Hide advanced options" : "Show advanced options"}</span>
                        <ChevronDown size={16} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="space-y-4 mt-3 mb-4 bg-spotify-dark-gray p-4 rounded-lg">
                    {/* Playlist Length */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="playlist-length" className="text-sm">Playlist Length: {params.length} songs</Label>
                      </div>
                      <Slider 
                        id="playlist-length"
                        min={5} 
                        max={30} 
                        step={5}
                        value={[params.length]} 
                        onValueChange={(value) => setParams(prev => ({ ...prev, length: value[0] }))}
                        className="spotify-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>5</span>
                        <span>15</span>
                        <span>30</span>
                      </div>
                    </div>
                    
                    {/* Artist Diversity */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="artist-diversity" className="text-sm">
                          Artist Diversity: {params.diversity === 1 ? "Very diverse" : 
                                              params.diversity === 2 ? "Balanced" : 
                                              params.diversity === 3 ? "Focused" : "Very focused"}
                        </Label>
                      </div>
                      <Slider 
                        id="artist-diversity"
                        min={1} 
                        max={4} 
                        step={1}
                        value={[params.diversity]} 
                        onValueChange={(value) => setParams(prev => ({ ...prev, diversity: value[0] }))}
                        className="spotify-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Various artists</span>
                        <span>Few artists</span>
                      </div>
                    </div>
                    
                    {/* Artist Popularity */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="artist-popularity" className="text-sm">
                          Artist Popularity: {params.popularity < 30 ? "Discover unknown artists" : 
                                               params.popularity < 50 ? "Mix of known and unknown" :
                                               params.popularity < 70 ? "Mostly known artists" : "Very popular artists"}
                        </Label>
                      </div>
                      <Slider 
                        id="artist-popularity"
                        min={10} 
                        max={90} 
                        step={10}
                        value={[params.popularity]} 
                        onValueChange={(value) => setParams(prev => ({ ...prev, popularity: value[0] }))}
                        className="spotify-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Unknown</span>
                        <span>Mixed</span>
                        <span>Popular</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Include History Switch */}
                <div className="flex items-center space-x-2 mt-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="history-toggle"
                            checked={params.includeHistory}
                            onCheckedChange={updateIncludeHistory}
                            disabled={!isAuthenticated}
                            className={`spotify-switch ${!isAuthenticated ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                          <Label 
                            htmlFor="history-toggle" 
                            className={`text-sm ${!isAuthenticated ? 'text-gray-500' : 'text-spotify-light-gray'} cursor-pointer flex items-center gap-1`}
                          >
                            Consider my Spotify listening history
                            {!isAuthenticated && <Info size={14} className="text-gray-500" />}
                          </Label>
                        </div>
                      </TooltipTrigger>
                      {!isAuthenticated && (
                        <TooltipContent side="top" className="bg-gray-800 text-white max-w-xs">
                          <p>Connect with Spotify first to use your listening history.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Login Button (nur anzeigen, wenn nicht authentifiziert) */}
                  {!isAuthenticated && (
                    <Button 
                      onClick={login}
                      variant="outline" 
                      size="sm"
                      className="ml-2 text-xs bg-transparent text-spotify-green border-spotify-green hover:bg-spotify-green/10 flex items-center gap-1"
                    >
                      <Music size={14} />
                      <span>Connect to Spotify</span>
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={handleSubmit}
                className="spotify-button mt-4 bg-spotify-green hover:bg-spotify-bright text-black font-bold py-3 px-6 rounded-full transition flex items-center justify-center"
              >
                <span>Create Playlist</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
