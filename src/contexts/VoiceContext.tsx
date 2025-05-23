
import React, { createContext, useState, useContext, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceCommandProcessor } from "@/utils/voiceCommands";
import { speakText } from "@/utils/speechSynthesis";
import { toast as sonnerToast } from "sonner";

interface VoiceContextType {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  voiceResponse: string | null;
  isProcessing: boolean;
  recognitionError: string | null;
  resetRecognitionError: () => void;
  retryRecognition: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Voice command processor
  const { processCommand } = useVoiceCommandProcessor();
  
  // Handler for speech recognition results
  const handleRecognitionResult = useCallback(async (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // Process the command when it's final
      const result = await processCommand(transcript);
      
      if (result.wasProcessed && result.response) {
        respondToUser(result.response);
      }
    }
  }, []);
  
  // Initialize speech recognition
  const { 
    isListening, 
    transcript, 
    recognitionError, 
    startListening, 
    stopListening, 
    resetRecognitionError, 
    retryRecognition 
  } = useSpeechRecognition({ 
    onResult: handleRecognitionResult
  });

  // Function to respond to user after processing commands
  const respondToUser = (message: string) => {
    setVoiceResponse(message);
    
    // Use sonner toast for enhanced UI
    sonnerToast("RemindHer", {
      description: message,
      className: "w-[400px] p-6 rounded-lg bg-gray-900 text-white font-medium",
      duration: 5000
    });
    
    // Use the speech synthesis utility
    speakText(message);
  };

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        transcript,
        startListening,
        stopListening,
        voiceResponse,
        isProcessing,
        recognitionError,
        resetRecognitionError,
        retryRecognition
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  
  if (context === undefined) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  
  return context;
};
