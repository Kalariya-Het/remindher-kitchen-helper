
import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVoice } from "@/contexts/VoiceContext";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  className?: string;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({ className }) => {
  const { isListening, startListening, stopListening } = useVoice();

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Button
      onClick={handleVoiceToggle}
      className={cn(
        "w-16 h-16 rounded-full shadow-lg",
        isListening ? "bg-remindher-coral hover:bg-remindher-coral/90" : "bg-remindher-teal hover:bg-remindher-teal/90",
        className
      )}
    >
      <div className={cn("flex items-center justify-center", { "voice-pulse": isListening })}>
        {isListening ? (
          <MicOff className="h-8 w-8 text-white" />
        ) : (
          <Mic className="h-8 w-8 text-white" />
        )}
      </div>
    </Button>
  );
};

export default VoiceButton;
