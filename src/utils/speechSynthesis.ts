
/**
 * Utility for handling speech synthesis
 */
export const speakText = (message: string) => {
  // Cancel any existing speech
  window.speechSynthesis.cancel();
  
  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = 'en-US';
  speech.volume = 1;
  speech.rate = 1;
  speech.pitch = 1;
  
  // Retry mechanism in case speech fails
  let attempts = 0;
  const maxAttempts = 3;
  
  const trySpeech = () => {
    try {
      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Speech synthesis error:", error);
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trySpeech, 500);
      }
    }
  };
  
  trySpeech();
};
