
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShakeDetector } from '@/utils/shakeDetection';
import { getPrimaryContact } from '@/utils/emergencyContacts';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { speak } from '@/services/SpeechService';

interface EmergencyCallButtonProps {
  isShakeEnabled: boolean;
}

const EmergencyCallButton: React.FC<EmergencyCallButtonProps> = ({ isShakeEnabled }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [shakeDetector, setShakeDetector] = useState<ShakeDetector | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const callTimeoutRef = useRef<number | null>(null);
  const callLinkRef = useRef<HTMLAnchorElement | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  useEffect(() => {
    return () => {
      if (callTimeoutRef.current) {
        window.clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Use a lower threshold for better detection
    const detector = new ShakeDetector(handleShakeDetected, {
      threshold: 5, // Lowered from 8 to 5 for better sensitivity
      timeout: 500, // Reduced from 1000 to 500ms for faster response
    });
    
    setShakeDetector(detector);
    
    // Debug shake detection
    console.log('Shake detector initialized with threshold: 5');
    
    return () => {
      detector.stop();
    };
  }, []);

  useEffect(() => {
    if (shakeDetector) {
      if (isShakeEnabled && !callInProgress && !isActivated) {
        shakeDetector.start();
        console.log('Shake detection started - active and listening');
        
        // Debug info for confirming detection
        window.addEventListener('devicemotion', (event) => {
          if (event.acceleration) {
            const { x, y, z } = event.acceleration;
            if (x && y && z && (Math.abs(x) > 10 || Math.abs(y) > 10 || Math.abs(z) > 10)) {
              console.log('Strong motion detected:', { x, y, z });
            }
          }
        }, { once: false });
      } else {
        shakeDetector.stop();
        console.log('Shake detection stopped');
      }
    }
    
    return () => {
      if (shakeDetector) {
        shakeDetector.stop();
      }
    };
  }, [isShakeEnabled, shakeDetector, callInProgress, isActivated]);

  useEffect(() => {
    let timer: number | null = null;
    
    if (isActivated && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
        // Speak countdown for accessibility
        speak(`${countdown - 1}`, 0.6, 1.0);
      }, 1000);
    } else if (isActivated && countdown === 0 && !callInProgress) {
      makeEmergencyCall();
    }
    
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [isActivated, countdown, callInProgress]);

  useEffect(() => {
    const link = document.createElement('a');
    link.setAttribute('rel', 'noopener noreferrer');
    link.style.display = 'none';
    document.body.appendChild(link);
    callLinkRef.current = link;
    
    return () => {
      if (callLinkRef.current) {
        document.body.removeChild(callLinkRef.current);
      }
    };
  }, []);

  const handleShakeDetected = () => {
    console.log('Shake detected function triggered!');
    
    if (isActivated || callInProgress) {
      console.log('Ignoring shake - already activated or call in progress');
      return;
    }
    
    const contact = getPrimaryContact();
    
    if (!contact) {
      toast({
        title: "No emergency contact found",
        description: "Please add an emergency contact in settings",
        variant: "destructive",
      });
      speak("No emergency contact found. Please add an emergency contact in settings.", 0.6, 1.0);
      return;
    }
    
    setIsActivated(true);
    setCountdown(5);
    
    toast({
      title: "Emergency sequence activated",
      description: `Calling ${contact.name} in 5 seconds. Tap cancel to abort.`,
      variant: "destructive",
    });
    speak(`Emergency call will start in 5 seconds. Tap cancel to abort.`, 0.6, 1.0);
  };

  const makeEmergencyCall = () => {
    if (callInProgress || callTimeoutRef.current) {
      console.log('Call already in progress or cooldown active, preventing duplicate call');
      return;
    }
    
    const contact = getPrimaryContact();
    
    if (!contact) {
      setIsActivated(false);
      toast({
        title: "Error",
        description: "No emergency contact found",
        variant: "destructive", 
      });
      speak("No emergency contact found.", 0.6, 1.0);
      return;
    }
    
    setCallInProgress(true);
    
    const formattedNumber = contact.phoneNumber.replace(/[\s()-]/g, '');
    
    toast({
      title: "Emergency call initiated",
      description: `Calling ${contact.name} at ${contact.phoneNumber}`,
      variant: "destructive",
    });
    speak(`Calling emergency contact ${contact.name}`, 0.6, 1.0);
    
    try {
      if (callLinkRef.current) {
        callLinkRef.current.href = `tel:${formattedNumber}`;
        
        setTimeout(() => {
          if (callLinkRef.current) {
            callLinkRef.current.click();
            console.log('Click triggered on call link');
          }
        }, 100);
      } else {
        window.location.href = `tel:${formattedNumber}`;
        console.log('Using window.location for call');
      }
      
      const callFrame = document.createElement('iframe');
      callFrame.style.display = 'none';
      document.body.appendChild(callFrame);
      callFrame.src = `tel:${formattedNumber}`;
      console.log('Call iframe added to document');
      
      setTimeout(() => {
        document.body.removeChild(callFrame);
      }, 2000);
      
      callTimeoutRef.current = window.setTimeout(() => {
        setIsActivated(false);
        setCallInProgress(false);
        callTimeoutRef.current = null;
        console.log('Call cooldown period completed');
      }, 15000);
    } catch (error) {
      console.error("Error making emergency call:", error);
      
      setTimeout(() => {
        setIsActivated(false);
        setCallInProgress(false);
      }, 3000);
      
      toast({
        title: "Call error",
        description: "There was a problem initiating the call. Please try the manual call button instead.",
        variant: "destructive",
      });
      speak("Call error. Please use the manual call button instead.", 0.6, 1.0);
    }
  };

  const cancelEmergencyCall = () => {
    if (callTimeoutRef.current) {
      window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    setIsActivated(false);
    setCountdown(0);
    
    setCallInProgress(true);
    setTimeout(() => {
      setCallInProgress(false);
    }, 3000);
    
    toast({
      title: "Emergency call canceled",
      description: "Emergency sequence has been aborted",
    });
    speak("Emergency call canceled", 0.6, 1.0);
  };

  const simulateShake = () => {
    if (shakeDetector && !callInProgress && !isActivated && !callTimeoutRef.current) {
      console.log('Simulating shake event');
      shakeDetector.simulateShake();
    } else {
      console.log('Cannot simulate shake - call in progress or already activated');
    }
  };

  const manualCall = () => {
    if (callInProgress || isActivated || callTimeoutRef.current) {
      toast({
        title: "Call in progress",
        description: "Please wait before attempting another call",
        variant: "destructive",
      });
      speak("Call in progress. Please wait.", 0.6, 1.0);
      return;
    }
    
    const contact = getPrimaryContact();
    if (!contact) {
      toast({
        title: "No emergency contact found",
        description: "Please add an emergency contact in settings",
        variant: "destructive",
      });
      speak("No emergency contact found. Please add an emergency contact in settings.", 0.6, 1.0);
      return;
    }
    
    const formattedNumber = contact.phoneNumber.replace(/[\s()-]/g, '');
    
    try {
      const callLink = document.createElement('a');
      callLink.href = `tel:${formattedNumber}`;
      callLink.setAttribute('rel', 'noopener noreferrer');
      callLink.setAttribute('target', '_blank');
      callLink.style.display = 'none';
      document.body.appendChild(callLink);
      callLink.click();
      console.log('Manual call link clicked');
      
      setTimeout(() => {
        document.body.removeChild(callLink);
      }, 1000);
      
      setTimeout(() => {
        window.location.href = `tel:${formattedNumber}`;
      }, 100);
    } catch (error) {
      console.error("Error making manual call:", error);
      window.location.href = `tel:${formattedNumber}`;
    }
    
    setCallInProgress(true);
    setTimeout(() => {
      setCallInProgress(false);
    }, 5000);
    
    toast({
      title: "Manual call initiated",
      description: `Calling ${contact.name}`,
    });
    speak(`Calling ${contact.name}`, 0.6, 1.0);
  };

  const getStatusText = () => {
    if (callInProgress || callTimeoutRef.current) {
      return "Call in progress or cooling down. Please wait...";
    }
    if (isActivated) {
      return `Emergency call will start in ${countdown} seconds. Tap cancel to abort.`;
    }
    if (isShakeEnabled && isMobile) {
      return "Shake your device vigorously to trigger an emergency call";
    }
    if (isShakeEnabled && !isMobile) {
      return "Shake detection is enabled. For best results, use a mobile device.";
    }
    return "Shake detection is disabled. Enable it in settings.";
  };

  return (
    <div className="relative">
      {!isMobile && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
          <AlertTitle>Mobile Device Required</AlertTitle>
          <AlertDescription>
            Shake detection works best on mobile devices. Please open this app on your mobile phone for the full experience.
          </AlertDescription>
        </Alert>
      )}
      
      {(callInProgress || callTimeoutRef.current) && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
          <AlertTitle>Call Processing</AlertTitle>
          <AlertDescription>
            Emergency call function is active or cooling down. Please wait a moment before trying again.
          </AlertDescription>
        </Alert>
      )}
      
      {isActivated ? (
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-bold mb-4 text-destructive animate-pulse`}>
            {countdown}
          </div>
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full py-8 text-xl"
            onClick={cancelEmergencyCall}
          >
            <PhoneOff className="mr-2 h-6 w-6" />
            Cancel Emergency ({countdown})
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full py-8 text-xl"
            onClick={simulateShake}
            disabled={callInProgress || isActivated || callTimeoutRef.current !== null}
          >
            <Phone className="mr-2 h-6 w-6" />
            {callInProgress || callTimeoutRef.current !== null ? "Call in Progress..." : "Trigger Emergency Call"}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={manualCall}
            disabled={callInProgress || isActivated || callTimeoutRef.current !== null}
          >
            <Phone className="mr-2 h-4 w-4" />
            Manual Call (Backup)
          </Button>
          
          <p className="text-sm text-muted-foreground">
            {getStatusText()}
          </p>
          
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Shake your device vigorously from side to side to activate emergency call.</p>
            <p className="mt-1">If shake detection isn't working, please use the button above.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyCallButton;
