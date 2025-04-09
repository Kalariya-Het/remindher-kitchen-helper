
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
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
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const { toast } = useToast();
  const { setThemeByVoice } = useTheme();
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();

  let recognitionInstance: SpeechRecognition | null = null;

  const setupSpeechRecognition = useCallback(() => {
    // Check for browser support
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
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
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setTranscript(command);
      processCommand(command);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast({
        title: "Voice Recognition Error",
        description: `Error: ${event.error}`,
        variant: "destructive",
      });
    };

    return recognition;
  }, [toast]);

  const processCommand = useCallback((command: string) => {
    // Theme commands
    if (command.includes("switch to dark mode") || command.includes("dark mode")) {
      setThemeByVoice("dark");
      respondToUser("Switched to dark mode");
    } 
    else if (command.includes("switch to light mode") || command.includes("light mode")) {
      setThemeByVoice("light");
      respondToUser("Switched to light mode");
    }
    // Navigation commands
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
    // Auth commands - simplified for demo
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
    // Generic response
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
    
    // Use speech synthesis to respond
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  const startListening = useCallback(() => {
    if (isListening) return;
    
    if (!recognitionInstance) {
      recognitionInstance = setupSpeechRecognition();
    }
    
    if (recognitionInstance) {
      recognitionInstance.start();
    }
  }, [isListening, setupSpeechRecognition]);

  const stopListening = useCallback(() => {
    if (!isListening || !recognitionInstance) return;
    
    recognitionInstance.stop();
  }, [isListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort();
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
