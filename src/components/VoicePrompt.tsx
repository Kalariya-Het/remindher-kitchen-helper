
import React from "react";
import { useVoice } from "@/contexts/VoiceContext";
import VoiceVisualizer from "./VoiceVisualizer";

const VoicePrompt: React.FC = () => {
  const { isListening, transcript } = useVoice();

  return (
    <div className="flex flex-col items-center mt-4">
      <VoiceVisualizer isActive={isListening} />
      {isListening ? (
        <p className="text-lg font-medium mt-2">Listening...</p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">Press the mic button to speak</p>
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
