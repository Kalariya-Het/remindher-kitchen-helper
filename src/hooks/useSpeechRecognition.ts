
import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult[];
  length: number;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  maxReconnectAttempts?: number;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  recognitionError: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetRecognitionError: () => void;
  retryRecognition: () => void;
}

export const useSpeechRecognition = ({
  onResult,
  onError,
  maxReconnectAttempts = 3
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { toast } = useToast();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const resetRecognitionError = useCallback(() => {
    setRecognitionError(null);
    setReconnectAttempts(0);
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    // First check if browser support exists
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      const errorMessage = "Your browser doesn't support speech recognition";
      setRecognitionError(errorMessage);
      toast({
        title: "Speech Recognition Not Supported",
        description: errorMessage,
        variant: "destructive",
      });
      if (onError) onError(errorMessage);
      return null;
    }

    // Create a new instance of SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition settings
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Set recognition event handlers
    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      setTranscript("");
      setRecognitionError(null);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      
      // Automatically retry if there was a network error and we haven't exceeded max attempts
      if (recognitionError === "Network error occurred. Check your internet connection." && 
          reconnectAttempts < maxReconnectAttempts) {
        console.log(`Auto-retrying recognition (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          try {
            recognition.start();
          } catch (error) {
            console.error("Error on auto-retry:", error);
          }
        }, 1000);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log("Got speech recognition result", event);
      let currentTranscript = '';
      
      // Process the results
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          const { transcript, isFinal } = result[0];
          currentTranscript += transcript;
          
          if (isFinal && i === event.results.length - 1) {
            if (onResult) onResult(transcript.toLowerCase(), true);
          }
        }
      }
      
      setTranscript(currentTranscript);
      if (onResult) onResult(currentTranscript, false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      let errorMessage = "Voice recognition error";
      switch (event.error) {
        case 'no-speech':
          errorMessage = "No speech was detected. Please try again.";
          break;
        case 'aborted':
          errorMessage = "Speech recognition was aborted.";
          break;
        case 'audio-capture':
          errorMessage = "No microphone was found. Ensure it's connected and permissions are granted.";
          break;
        case 'network':
          errorMessage = "Network error occurred. Check your internet connection.";
          // We'll handle network errors with auto-retry
          break;
        case 'not-allowed':
          errorMessage = "Microphone permission was denied. Please allow microphone access.";
          break;
        case 'service-not-allowed':
          errorMessage = "Speech recognition service is not allowed. Try a different browser.";
          break;
        default:
          errorMessage = `Error: ${event.error}. Please try again.`;
      }
      
      setRecognitionError(errorMessage);
      if (onError) onError(errorMessage);
      
      // Only show toast for non-network errors or if we've exceeded retry attempts
      if (event.error !== 'network' || reconnectAttempts >= maxReconnectAttempts) {
        toast({
          title: "Voice Recognition Error",
          description: errorMessage + (event.error === 'network' ? " Tap the mic button to try again." : ""),
          variant: "destructive",
        });
      }
    };

    return recognition;
  }, [toast, reconnectAttempts, recognitionError, onError, onResult, maxReconnectAttempts]);

  // Function to manually retry recognition after error
  const retryRecognition = useCallback(() => {
    resetRecognitionError();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      } catch (error) {
        console.error("Error retrying recognition:", error);
      }
    } else {
      recognitionRef.current = setupSpeechRecognition();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error("Error starting speech recognition on retry:", error);
        }
      }
    }
  }, [resetRecognitionError, setupSpeechRecognition]);

  const startListening = useCallback(() => {
    if (isListening) return;
    
    resetRecognitionError();
    
    // Check if we need to create a new recognition instance
    if (!recognitionRef.current) {
      recognitionRef.current = setupSpeechRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        console.log("Starting speech recognition");
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setRecognitionError("Failed to start speech recognition. Please try again.");
        toast({
          title: "Voice Recognition Error",
          description: "Failed to start. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [isListening, setupSpeechRecognition, resetRecognitionError, toast]);

  const stopListening = useCallback(() => {
    if (!isListening || !recognitionRef.current) return;
    
    try {
      console.log("Stopping speech recognition");
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, [isListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error("Error aborting speech recognition:", error);
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    recognitionError,
    startListening,
    stopListening,
    resetRecognitionError,
    retryRecognition
  };
};
