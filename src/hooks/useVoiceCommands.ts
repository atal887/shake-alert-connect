
import { useState, useEffect, useCallback, useRef } from 'react';
import { speak, speechRecognition } from '@/services/SpeechService';
import { objectDetection } from '@/services/ObjectDetectionService';
import { navigationService } from '@/services/NavigationService';
import { ShakeDetector } from '@/utils/shakeDetection';
import { getPrimaryContact } from '@/utils/emergencyContacts';
import { useToast } from '@/hooks/use-toast';

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
  
  const lastCommandRef = useRef<string>('');
  const commandTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  const processCommand = useCallback(async (command: string) => {
    // Prevent duplicate commands within a short timeframe
    if (command === lastCommandRef.current && commandTimeoutRef.current) {
      console.log('Ignoring duplicate command:', command);
      return;
    }
    
    // Update state with the new command
    setState(prev => ({ ...prev, lastCommand: command }));
    lastCommandRef.current = command;
    
    // Set a timeout to clear the last command reference
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    commandTimeoutRef.current = window.setTimeout(() => {
      lastCommandRef.current = '';
      commandTimeoutRef.current = null;
    }, 5000);
    
    console.log('Voice command received:', command);
    
    const normalizedCommand = command.toLowerCase().trim();
    
    // Simple command matching with improved flexibility
    if (normalizedCommand.includes('help') || normalizedCommand.includes('command') || normalizedCommand.includes('what can you do')) {
      speak(
        "Available commands: Where am I, Start navigation to, Stop navigation, " + 
        "Start object detection, Stop object detection, Call emergency, and Help.",
        0.7 // Slower rate for the help message
      );
      
      toast({
        title: "Voice Commands",
        description: "List of available commands provided",
      });
    }
    else if (normalizedCommand.includes('where am i') || normalizedCommand.includes('my location')) {
      toast({
        title: "Getting Location",
        description: "Retrieving your current location",
      });
      navigationService.getCurrentLocation();
    }
    else if (normalizedCommand.match(/(?:start|begin) navigation to (.+)/i) || 
             normalizedCommand.match(/(?:navigate|take me) to (.+)/i) ||
             normalizedCommand.match(/(?:go|direct me) to (.+)/i)) {
      
      // Extract destination from various command formats
      let match = normalizedCommand.match(/(?:start|begin) navigation to (.+)/i) || 
                  normalizedCommand.match(/(?:navigate|take me) to (.+)/i) ||
                  normalizedCommand.match(/(?:go|direct me) to (.+)/i);
      
      if (match && match[1]) {
        const destination = match[1].trim();
        speak(`Starting navigation to ${destination}`, 0.7);
        
        toast({
          title: "Starting Navigation",
          description: `Destination: ${destination}`,
        });
        
        const success = await navigationService.startNavigation(destination);
        if (!success) {
          speak(`I couldn't start navigation to ${destination}. Please try again.`, 0.7);
          toast({
            title: "Navigation Failed",
            description: "Could not start navigation to the destination",
            variant: "destructive",
          });
        }
      } else {
        speak("Please specify a destination, for example: Navigate to Central Park", 0.7);
      }
    }
    else if (normalizedCommand.includes('stop navigation') || normalizedCommand.includes('cancel navigation') || normalizedCommand.includes('end navigation')) {
      navigationService.stopNavigation();
      speak("Navigation stopped", 0.7);
      toast({
        title: "Navigation Stopped",
        description: "Navigation has been terminated",
      });
    }
    else if (normalizedCommand.includes('start object detection') || 
             normalizedCommand.includes('detect objects') || 
             normalizedCommand.includes('what do you see') ||
             normalizedCommand.includes('scan surroundings')) {
      
      speak("Starting object detection", 0.7);
      toast({
        title: "Object Detection",
        description: "Starting to scan surroundings",
      });
      
      const videoElement = document.getElementById('detection-video') as HTMLVideoElement;
      if (videoElement) {
        objectDetection.start(videoElement);
      } else {
        speak("Object detection video element not found", 0.7);
        toast({
          title: "Detection Error",
          description: "Could not initialize camera",
          variant: "destructive",
        });
      }
    }
    else if (normalizedCommand.includes('stop object detection') || 
             normalizedCommand.includes('stop detecting') || 
             normalizedCommand.includes('stop scanning')) {
      
      objectDetection.stop();
      speak("Object detection stopped", 0.7);
      toast({
        title: "Detection Stopped",
        description: "Object detection has been turned off",
      });
    }
    else if (normalizedCommand.includes('call emergency') || 
             normalizedCommand.includes('emergency call') || 
             normalizedCommand.includes('help me') ||
             normalizedCommand.includes('i need help')) {
      
      const contact = getPrimaryContact();
      if (contact) {
        speak(`Calling emergency contact ${contact.name}`, 0.7);
        
        toast({
          title: "Emergency Call",
          description: `Calling ${contact.name}`,
          variant: "destructive",
        });
        
        // Trigger emergency call
        const formattedNumber = contact.phoneNumber.replace(/[\s()-]/g, '');
        window.location.href = `tel:${formattedNumber}`;
      } else {
        speak("No emergency contact found. Please add an emergency contact in the settings.", 0.7);
        toast({
          title: "No Emergency Contact",
          description: "Please add a contact in settings",
          variant: "destructive",
        });
      }
    }
    else if (normalizedCommand.includes('hello') || normalizedCommand.includes('hi') || normalizedCommand.includes('hey')) {
      speak("Hello! I'm your accessibility assistant. How can I help you today?", 0.7);
    }
    else {
      speak("I didn't understand that command. Say 'help' for a list of available commands.", 0.7);
      toast({
        title: "Unknown Command",
        description: "Try saying 'help' for available commands",
      });
    }
  }, [toast]);
  
  const startListening = useCallback(() => {
    if (speechRecognition.isSupported()) {
      const started = speechRecognition.start((transcript) => {
        processCommand(transcript);
      });
      
      if (started) {
        setState(prev => ({ ...prev, isListening: true }));
        speak("Voice commands activated. Say 'help' for available commands.", 0.7);
        toast({
          title: "Voice Commands Active",
          description: "Say 'help' for available commands",
        });
      } else {
        speak("Failed to start voice command recognition.", 0.7);
        toast({
          title: "Voice Recognition Failed",
          description: "Could not start speech recognition",
          variant: "destructive",
        });
      }
    } else {
      speak("Voice commands are not supported in your browser.", 0.7);
      toast({
        title: "Not Supported",
        description: "Voice commands unavailable in this browser",
        variant: "destructive",
      });
    }
  }, [processCommand, toast]);
  
  const stopListening = useCallback(() => {
    speechRecognition.stop();
    setState(prev => ({ ...prev, isListening: false }));
    speak("Voice commands deactivated", 0.7);
    toast({
      title: "Voice Commands Inactive",
      description: "Voice recognition turned off",
    });
  }, [toast]);
  
  useEffect(() => {
    // Auto-start voice recognition when the hook is used
    startListening();
    
    return () => {
      stopListening();
      
      // Clear any pending timeouts
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = null;
      }
    };
  }, [startListening, stopListening]);
  
  return {
    state,
    startListening,
    stopListening,
    processCommand
  };
}
