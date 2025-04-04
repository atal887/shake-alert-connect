
import { useState, useEffect, useCallback } from 'react';
import { speak, speechRecognition } from '@/services/SpeechService';
import { objectDetection } from '@/services/ObjectDetectionService';
import { navigationService } from '@/services/NavigationService';
import { ShakeDetector } from '@/utils/shakeDetection';
import { getPrimaryContact } from '@/utils/emergencyContacts';

interface VoiceCommandState {
  isListening: boolean;
  lastCommand: string;
  isSpeaking: boolean;
}

export function useVoiceCommands() {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    lastCommand: '',
    isSpeaking: false,
  });
  
  const processCommand = useCallback(async (command: string) => {
    setState(prev => ({ ...prev, lastCommand: command }));
    console.log('Voice command received:', command);
    
    const normalizedCommand = command.toLowerCase().trim();
    
    // Simple command matching
    if (normalizedCommand.includes('help') || normalizedCommand.includes('command')) {
      speak(
        "Available commands: Where am I, Start navigation to, Stop navigation, " + 
        "Start object detection, Stop object detection, Call emergency, and Help."
      );
    }
    else if (normalizedCommand.includes('where am i')) {
      navigationService.getCurrentLocation();
    }
    else if (normalizedCommand.match(/start navigation to (.+)/i)) {
      const match = normalizedCommand.match(/start navigation to (.+)/i);
      if (match && match[1]) {
        const destination = match[1].trim();
        speak(`Starting navigation to ${destination}`);
        const success = await navigationService.startNavigation(destination);
        if (!success) {
          speak(`I couldn't start navigation to ${destination}. Please try again.`);
        }
      } else {
        speak("Please specify a destination, for example: Start navigation to Central Park");
      }
    }
    else if (normalizedCommand.includes('stop navigation')) {
      navigationService.stopNavigation();
    }
    else if (normalizedCommand.includes('start object detection') || normalizedCommand.includes('detect objects')) {
      speak("Starting object detection");
      const videoElement = document.getElementById('detection-video') as HTMLVideoElement;
      if (videoElement) {
        objectDetection.start(videoElement);
      } else {
        speak("Object detection video element not found");
      }
    }
    else if (normalizedCommand.includes('stop object detection') || normalizedCommand.includes('stop detecting')) {
      objectDetection.stop();
    }
    else if (normalizedCommand.includes('call emergency') || normalizedCommand.includes('emergency call')) {
      const contact = getPrimaryContact();
      if (contact) {
        speak(`Calling emergency contact ${contact.name}`);
        // Trigger emergency call
        const formattedNumber = contact.phoneNumber.replace(/[\s()-]/g, '');
        window.location.href = `tel:${formattedNumber}`;
      } else {
        speak("No emergency contact found. Please add an emergency contact in the settings.");
      }
    }
    else if (normalizedCommand.includes('hello') || normalizedCommand.includes('hi')) {
      speak("Hello! I'm your accessibility assistant. How can I help you today?");
    }
    else {
      speak("I didn't understand that command. Say 'help' for a list of available commands.");
    }
  }, []);
  
  const startListening = useCallback(() => {
    if (speechRecognition.isSupported()) {
      const started = speechRecognition.start((transcript) => {
        processCommand(transcript);
      });
      
      if (started) {
        setState(prev => ({ ...prev, isListening: true }));
        speak("Voice commands activated. Say 'help' for available commands.");
      } else {
        speak("Failed to start voice command recognition.");
      }
    } else {
      speak("Voice commands are not supported in your browser.");
    }
  }, [processCommand]);
  
  const stopListening = useCallback(() => {
    speechRecognition.stop();
    setState(prev => ({ ...prev, isListening: true }));
    speak("Voice commands deactivated");
  }, []);
  
  useEffect(() => {
    // Auto-start voice recognition when the hook is used
    startListening();
    
    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);
  
  return {
    state,
    startListening,
    stopListening,
    processCommand
  };
}
