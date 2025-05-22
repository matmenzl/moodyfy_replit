import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  message: string;
  onTryAgain: () => void;
}

export default function ErrorState({ title, message, onTryAgain }: ErrorStateProps) {
  return (
    <section>
      <Card className="bg-[hsl(var(--spotify-gray))] rounded-xl shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--spotify-error))] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-[hsl(var(--spotify-light-gray))] mb-6">{message}</p>
            
            <Button 
              onClick={onTryAgain}
              className="spotify-button bg-[hsl(var(--spotify-dark-gray))] hover:bg-[hsl(var(--spotify-gray))] text-white font-bold py-3 px-6 rounded-full transition"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
