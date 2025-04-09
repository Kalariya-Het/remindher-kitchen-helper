
import React from "react";
import { useVoice } from "@/contexts/VoiceContext";
import VoiceVisualizer from "./VoiceVisualizer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const VoicePrompt: React.FC = () => {
  const { isListening, transcript, recognitionError, retryRecognition } = useVoice();

  return (
    <div className="flex flex-col items-center mt-4">
      <VoiceVisualizer isActive={isListening} />
      
      {isListening ? (
        <p className="text-lg font-medium mt-2">Listening...</p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          {recognitionError ? "Tap the mic button to try again" : "Press the mic button to speak"}
        </p>
      )}
      
      {recognitionError && (
        <Alert variant="destructive" className="mt-4 w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Voice Recognition Error</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <div>{recognitionError}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryRecognition}
              className="self-end flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {transcript && (
        <div className="mt-4 p-4 bg-accent rounded-lg w-full max-w-md">
          <p className="text-sm font-medium">I heard:</p>
          <p className="text-lg">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VoicePrompt;
