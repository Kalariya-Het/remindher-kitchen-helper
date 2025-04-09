
/// <reference types="vite/client" />

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

declare class SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
}

declare module 'uuid' {
  export function v4(): string;
}
