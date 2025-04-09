
/**
 * Utility for handling speech synthesis
 */
export const speakText = (message: string) => {
  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = 'en-US';
  speech.volume = 1;
  speech.rate = 1;
  speech.pitch = 1;
  window.speechSynthesis.speak(speech);
};
