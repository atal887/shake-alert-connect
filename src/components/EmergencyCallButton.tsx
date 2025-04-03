
import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShakeDetector } from '@/utils/shakeDetection';
import { getPrimaryContact } from '@/utils/emergencyContacts';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface EmergencyCallButtonProps {
  isShakeEnabled: boolean;
}

const EmergencyCallButton: React.FC<EmergencyCallButtonProps> = ({ isShakeEnabled }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [shakeDetector, setShakeDetector] = useState<ShakeDetector | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  useEffect(() => {
    const detector = new ShakeDetector(handleShakeDetected, {
      threshold: 12,
      timeout: 1000,
    });
    
    setShakeDetector(detector);
    
    return () => {
      detector.stop();
    };
  }, []);

  useEffect(() => {
    if (shakeDetector) {
      if (isShakeEnabled && !callInProgress) {
        shakeDetector.start();
        console.log('Shake detection started');
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
  }, [isShakeEnabled, shakeDetector, callInProgress]);

  useEffect(() => {
    let timer: number | null = null;
    
    if (isActivated && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
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

  const handleShakeDetected = () => {
    if (isActivated || callInProgress) return;
    
    const contact = getPrimaryContact();
    
    if (!contact) {
      toast({
        title: "No emergency contact found",
        description: "Please add an emergency contact in settings",
        variant: "destructive",
      });
      return;
    }
    
    setIsActivated(true);
    setCountdown(5);
    
    toast({
      title: "Emergency sequence activated",
      description: `Calling ${contact.name} in 5 seconds. Tap cancel to abort.`,
      variant: "destructive",
    });
  };

  const makeEmergencyCall = () => {
    // Prevent multiple calls being triggered
    if (callInProgress) return;
    
    const contact = getPrimaryContact();
    
    if (!contact) {
      setIsActivated(false);
      return;
    }
    
    setCallInProgress(true);
    
    toast({
      title: "Emergency call initiated",
      description: `Calling ${contact.name} at ${contact.phoneNumber}`,
      variant: "destructive",
    });
    
    try {
      const callLink = document.createElement('a');
      callLink.href = `tel:${contact.phoneNumber.replace(/\s+/g, '')}`;
      callLink.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(callLink);
      
      // One-time click with proper cleanup
      callLink.click();
      document.body.removeChild(callLink);
      
      // Reset after a reasonable delay to prevent immediate re-triggering
      setTimeout(() => {
        setIsActivated(false);
        
        // Add a longer delay before allowing new calls
        setTimeout(() => {
          setCallInProgress(false);
        }, 3000);
      }, 1000);
    } catch (error) {
      console.error("Error making emergency call:", error);
      setIsActivated(false);
      setCallInProgress(false);
      
      toast({
        title: "Error making emergency call",
        description: "There was a problem initiating the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelEmergencyCall = () => {
    setIsActivated(false);
    setCountdown(0);
    
    // Add a small delay before allowing new calls
    setTimeout(() => {
      setCallInProgress(false);
    }, 1000);
    
    toast({
      title: "Emergency call canceled",
      description: "Emergency sequence has been aborted",
    });
  };

  const simulateShake = () => {
    if (shakeDetector && !callInProgress) {
      shakeDetector.simulateShake();
    }
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
      
      {callInProgress && !isActivated && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
          <AlertTitle>Call in Progress</AlertTitle>
          <AlertDescription>
            Emergency call function is cooling down. Please wait a moment before trying again.
          </AlertDescription>
        </Alert>
      )}
      
      {isActivated ? (
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-bold mb-4 text-emergency animate-pulse-emergency`}>
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
        <div className="flex flex-col items-center">
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full py-8 text-xl mb-4"
            onClick={simulateShake}
            disabled={callInProgress}
          >
            <Phone className="mr-2 h-6 w-6" />
            {callInProgress ? "Call in Progress..." : "Trigger Emergency Call"}
          </Button>
          
          {isShakeEnabled ? (
            <p className="text-sm text-muted-foreground">
              {isMobile ? (
                callInProgress ? 
                "Please wait a moment before triggering another call." :
                "Shake your device vigorously to trigger an emergency call"
              ) : (
                "Shake detection is enabled. For best results, use a mobile device."
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Shake detection is disabled. Enable it in settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyCallButton;
