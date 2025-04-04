
/**
 * Speech service for text-to-speech and speech recognition
 * Optimized for accessibility applications
 */

// Speech synthesis for text-to-speech
export const speak = (text: string, rate: number = 1.0, pitch: number = 1.0, volume: number = 1.0) => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser");
    return;
  }

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Use a clear, natural voice for accessibility
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    (voice.name.includes("Daniel") || voice.name.includes("Samantha") || voice.name.includes("Google")) && 
    voice.lang.includes("en")
  );
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  // Configure speech parameters for clarity
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;
  utterance.lang = 'en-US';
  
  // Speak the text
  window.speechSynthesis.speak(utterance);
  
  return {
    cancel: () => window.speechSynthesis.cancel()
  };
};

// Speech recognition
type RecognitionCallback = (transcript: string) => void;

class SpeechRecognitionService {
  private recognition: any; // Using 'any' because browser compatibility varies
  private isListening: boolean = false;
  private callback: RecognitionCallback | null = null;
  
  constructor() {
    // Check for browser support and initialize
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (this.callback) {
          this.callback(transcript);
        }
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart if no speech was detected but we're still listening
          if (this.isListening) {
            this.stop();
            this.start(this.callback!);
          }
        }
      };
      
      this.recognition.onend = () => {
        // Restart if we're still supposed to be listening
        if (this.isListening) {
          this.recognition.start();
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  }
  
  start(callback: RecognitionCallback) {
    if (!this.recognition) {
      speak("Speech recognition is not supported in your browser.");
      return false;
    }
    
    this.callback = callback;
    this.isListening = true;
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }
  
  stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }
  
  isSupported() {
    return !!window.SpeechRecognition || !!window.webkitSpeechRecognition;
  }
}

// Create and export singleton instance
export const speechRecognition = new SpeechRecognitionService();

// Add TypeScript declarations for browser speech APIs
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
