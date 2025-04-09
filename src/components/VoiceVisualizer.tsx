
import React from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="voice-waves h-8 py-2">
      <div className="voice-wave-bar h-4 animate-wave-1"></div>
      <div className="voice-wave-bar h-4 animate-wave-2"></div>
      <div className="voice-wave-bar h-4 animate-wave-3"></div>
      <div className="voice-wave-bar h-4 animate-wave-4"></div>
      <div className="voice-wave-bar h-4 animate-wave-5"></div>
    </div>
  );
};

export default VoiceVisualizer;
