
/**
 * Speech service for text-to-speech and speech recognition
 * Optimized for accessibility applications
 */

// Speech synthesis for text-to-speech
export const speak = (text: string, rate: number = 0.8, pitch: number = 1.0, volume: number = 1.0) => {
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
  utterance.rate = rate; // Slower default rate (0.8 instead of 1.0)
  utterance.pitch = pitch;
  utterance.volume = volume;
  utterance.lang = 'en-US';
  
  // Add event listener to handle completion
  let speakingTimeout: number | null = null;
  
  utterance.onend = () => {
    if (speakingTimeout) {
      clearTimeout(speakingTimeout);
      speakingTimeout = null;
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    if (speakingTimeout) {
      clearTimeout(speakingTimeout);
      speakingTimeout = null;
    }
  };
  
  // Speak the text
  window.speechSynthesis.speak(utterance);
  
  // Set a safety timeout to prevent the speech from hanging
  speakingTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, text.length * 100 + 5000); // Estimate timeout based on text length
  
  return {
    cancel: () => {
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
        speakingTimeout = null;
      }
      window.speechSynthesis.cancel();
    }
  };
};

// Speech recognition
type RecognitionCallback = (transcript: string) => void;

class SpeechRecognitionService {
  private recognition: any; // Using 'any' because browser compatibility varies
  private isListening: boolean = false;
  private callback: RecognitionCallback | null = null;
  private restartTimeout: number | null = null;
  
  constructor() {
    // Check for browser support and initialize
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true; // Changed to true to get partial results
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: any) => {
        // Get both interim and final results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          
          // Only send final results to callback to avoid duplicates
          if (result.isFinal && this.callback) {
            console.log('Speech recognition final result:', transcript);
            this.callback(transcript);
          }
        }
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'network' || event.error === 'not-allowed' || event.error === 'aborted') {
          // Restart if no speech was detected but we're still listening
          if (this.isListening) {
            this.stop();
            this.restartWithDelay(2000); // Longer delay to avoid rapid restarts
          }
        }
      };
      
      this.recognition.onend = () => {
        // Restart if we're still supposed to be listening
        if (this.isListening && !this.restartTimeout) {
          console.log('Speech recognition ended, restarting...');
          this.restartWithDelay(1000);
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  }
  
  restartWithDelay(delay: number) {
    if (this.restartTimeout) {
      window.clearTimeout(this.restartTimeout);
    }
    
    this.restartTimeout = window.setTimeout(() => {
      if (this.isListening) {
        try {
          console.log('Restarting speech recognition...');
          this.recognition.start();
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }
      this.restartTimeout = null;
    }, delay);
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
      console.log('Speech recognition started');
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      // If we get an error about the recognition already being started, try stopping and restarting
      try {
        this.recognition.stop();
        setTimeout(() => {
          if (this.isListening) {
            this.recognition.start();
          }
        }, 100);
        return true;
      } catch (innerError) {
        console.error('Error during speech recognition recovery:', innerError);
        return false;
      }
    }
  }
  
  stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      if (this.restartTimeout) {
        window.clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      try {
        this.recognition.stop();
        console.log('Speech recognition stopped');
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
