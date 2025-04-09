
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

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

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResult;
    isFinal: boolean;
    length: number;
  };
  length: number;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { toast } = useToast();
  const { setThemeByVoice } = useTheme();
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const maxReconnectAttempts = 3;

  const resetRecognitionError = useCallback(() => {
    setRecognitionError(null);
    setReconnectAttempts(0);
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    // First check if browser support exists
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setRecognitionError("Your browser doesn't support speech recognition");
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
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

    recognition.onresult = (event: any) => {
      console.log("Got speech recognition result", event);
      let interimTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        interimTranscript += transcript;
        
        if (event.results[i].isFinal && i === event.results.length - 1) {
          processCommand(transcript.toLowerCase());
        }
      }
      
      setTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
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
  }, [toast, reconnectAttempts, recognitionError]);

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

  // Process voice commands
  const processCommand = useCallback((command: string) => {
    if (command.includes("switch to dark mode") || command.includes("dark mode")) {
      setThemeByVoice("dark");
      respondToUser("Switched to dark mode");
    } 
    else if (command.includes("switch to light mode") || command.includes("light mode")) {
      setThemeByVoice("light");
      respondToUser("Switched to light mode");
    }
    else if (command.includes("go to reminders") || command.includes("show reminders")) {
      navigate("/reminders");
      respondToUser("Opening reminders page");
    }
    else if (command.includes("go to tasks") || command.includes("show tasks") || command.includes("task assignment")) {
      navigate("/tasks");
      respondToUser("Opening task assignment page");
    }
    else if (command.includes("go to pantry") || command.includes("show pantry")) {
      navigate("/pantry");
      respondToUser("Opening pantry management page");
    }
    else if (command.includes("go to assistant") || command.includes("talk to me")) {
      navigate("/assistant");
      respondToUser("Opening voice assistant page. What's on your mind today?");
    }
    else if (command.includes("login with")) {
      const usernameMatch = command.match(/login with (\w+)(?: and |,| )?(\w+)?/);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        const password = usernameMatch[2] || "password"; // Demo only
        login(username, password)
          .then(() => respondToUser(`Welcome back, ${username}`))
          .catch(() => respondToUser("Login failed. Please try again."));
      } else {
        respondToUser("Please say login with username and password");
      }
    }
    else if (command.includes("register with")) {
      const usernameMatch = command.match(/register with (\w+)(?: and |,| )?(\w+)?/);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        const password = usernameMatch[2] || "password"; // Demo only
        register(username, password)
          .then(() => respondToUser(`Account created for ${username}`))
          .catch(() => respondToUser("Registration failed. Please try again."));
      } else {
        respondToUser("Please say register with username and password");
      }
    }
    else if (command.includes("log me out") || command.includes("logout")) {
      logout();
      respondToUser("You've been logged out");
      navigate("/");
    }
    else {
      respondToUser("I heard you say: " + command);
    }
  }, [setThemeByVoice, navigate, login, register, logout]);

  const respondToUser = (message: string) => {
    setVoiceResponse(message);
    toast({
      title: "RemindHer",
      description: message,
    });
    
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

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
