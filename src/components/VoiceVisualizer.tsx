
import React from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="voice-waves h-10 py-2 flex items-center justify-center gap-1">
      <div className="voice-wave-bar w-1 h-4 bg-remindher-teal rounded-full animate-wave-1"></div>
      <div className="voice-wave-bar w-1 h-6 bg-remindher-teal rounded-full animate-wave-2"></div>
      <div className="voice-wave-bar w-1 h-8 bg-remindher-teal rounded-full animate-wave-3"></div>
      <div className="voice-wave-bar w-1 h-10 bg-remindher-teal rounded-full animate-wave-4"></div>
      <div className="voice-wave-bar w-1 h-8 bg-remindher-teal rounded-full animate-wave-5"></div>
      <div className="voice-wave-bar w-1 h-6 bg-remindher-teal rounded-full animate-wave-2"></div>
      <div className="voice-wave-bar w-1 h-4 bg-remindher-teal rounded-full animate-wave-1"></div>
    </div>
  );
};

export default VoiceVisualizer;
