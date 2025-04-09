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
  const { toast } = useToast();
  const { setThemeByVoice } = useTheme();
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const resetRecognitionError = useCallback(() => {
    setRecognitionError(null);
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setRecognitionError("Your browser doesn't support speech recognition");
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setRecognitionError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
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
      
      toast({
        title: "Voice Recognition Error",
        description: errorMessage,
        variant: "destructive",
      });
    };

    return recognition;
  }, [toast]);

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
    
    if (!recognitionRef.current) {
      recognitionRef.current = setupSpeechRecognition();
    }
    
    if (recognitionRef.current) {
      try {
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
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, [isListening]);

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
