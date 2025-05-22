import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LoadingStateProps {
  isPending: boolean;
}

export default function LoadingState({ isPending }: LoadingStateProps) {
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const loadingSteps = [
    'Analyzing your mood...',
    'Finding matching genres...',
    'Curating the perfect tracks...',
    'Creating your personalized playlist...'
  ];

  useEffect(() => {
    if (!isPending) return;
    
    let currentStep = 0;
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      if (currentProgress >= 100) {
        clearInterval(interval);
        return;
      }
      
      currentProgress += 2;
      setProgress(currentProgress);
      
      if (currentProgress % 25 === 0 && currentStep < loadingSteps.length - 1) {
        currentStep++;
        setLoadingStep(currentStep);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPending]);

  return (
    <section className="mb-8">
      <Card className="bg-spotify-gray rounded-xl shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-full border-t-4 border-l-4 border-spotify-green animate-spin"></div>
            <h3 className="text-xl font-semibold">{loadingSteps[loadingStep]}</h3>
            <p className="text-spotify-light-gray mt-2">Looking for the perfect beats...</p>
            
            <div className="mt-6 w-full max-w-md">
              <Progress 
                value={progress} 
                className="h-2.5 bg-spotify-dark-gray"
                indicatorClassName="bg-spotify-green"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
