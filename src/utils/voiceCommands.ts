import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * `useVoiceCommandProcessor`: Hook that returns a function to process voice commands.
 */
export const useVoiceCommandProcessor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setThemeByVoice } = useTheme();
  const { login, register, logout } = useAuth();

  const processCommand = async (command: string): Promise<{ wasProcessed: boolean; response?: string }> => {
    const lowerCommand = command.toLowerCase();

    // Theme commands
    if (lowerCommand.includes("switch to dark mode") || lowerCommand.includes("dark mode")) {
      setThemeByVoice("dark"); // pass only one argument
      return { wasProcessed: true, response: "Switched to dark mode" };
    } 
    if (lowerCommand.includes("switch to light mode") || lowerCommand.includes("light mode")) {
      setThemeByVoice("light"); // pass only one argument
      return { wasProcessed: true, response: "Switched to light mode" };
    }
    
    // Navigation commands
    if (lowerCommand.includes("go to reminders") || lowerCommand.includes("show reminders")) {
      navigate("/reminders");
      return { wasProcessed: true, response: "Opening reminders page" };
    }
    if (lowerCommand.includes("go to tasks") || lowerCommand.includes("show tasks") || lowerCommand.includes("task assignment")) {
      navigate("/tasks");
      return { wasProcessed: true, response: "Opening task assignment page" };
    }
    if (lowerCommand.includes("go to pantry") || lowerCommand.includes("show pantry")) {
      navigate("/pantry");
      return { wasProcessed: true, response: "Opening pantry management page" };
    }
    if (lowerCommand.includes("go to assistant") || lowerCommand.includes("talk to me")) {
      navigate("/assistant");
      return { wasProcessed: true, response: "Opening voice assistant page. What's on your mind today?" };
    }
    
    // Auth commands
    if (lowerCommand.includes("login with")) {
      const usernameMatch = command.match(/login with (\w+)(?: and |,| )?(\w+)?/);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        const password = usernameMatch[2] || "password"; // Demo only

        try {
          await login(username, password); // only two arguments
          toast({
            title: "Login Successful",
            description: `Welcome back, ${username}`,
          });
        } catch {
          toast({
            title: "Login Failed",
            description: "Please try again.",
            variant: "destructive",
          });
        }

        return { wasProcessed: true, response: `Logging in as ${username}` };
      } else {
        return { wasProcessed: true, response: "Please say login with username and password" };
      }
    }
    if (lowerCommand.includes("register with")) {
      const usernameMatch = command.match(/register with (\w+)(?: and |,| )?(\w+)?/);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        const password = usernameMatch[2] || "password"; // Demo only
        
        try {
          await register(username, password, undefined); // pass third arg as undefined
          toast({
            title: "Registration Successful",
            description: `Account created for ${username}`,
          });
        } catch {
          toast({
            title: "Registration Failed",
            description: "Please try again.",
            variant: "destructive",
          });
        }
          
        return { wasProcessed: true, response: `Creating account for ${username}` };
      } else {
        return { wasProcessed: true, response: "Please say register with username and password" };
      }
    }
    if (lowerCommand.includes("log me out") || lowerCommand.includes("logout")) {
      logout();
      navigate("/");
      return { wasProcessed: true, response: "You've been logged out" };
    }

    return { wasProcessed: false };
  };

  return { processCommand };
};
