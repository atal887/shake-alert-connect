
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
  const { toast } = useToast();

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  // Initialize shake detector
  useEffect(() => {
    const detector = new ShakeDetector(handleShakeDetected, {
      threshold: 12, // Lower threshold to make it more sensitive
      timeout: 1000,  // Shorter timeout between detections
    });
    
    setShakeDetector(detector);
    
    return () => {
      detector.stop();
    };
  }, []);

  // Start/stop shake detection based on settings
  useEffect(() => {
    if (shakeDetector) {
      if (isShakeEnabled) {
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
  }, [isShakeEnabled, shakeDetector]);

  // Handle countdown and call triggering
  useEffect(() => {
    let timer: number | null = null;
    
    if (isActivated && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isActivated && countdown === 0) {
      makeEmergencyCall();
    }
    
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [isActivated, countdown]);

  const handleShakeDetected = () => {
    // Don't trigger if already in countdown mode
    if (isActivated) return;
    
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
    const contact = getPrimaryContact();
    
    if (!contact) {
      setIsActivated(false);
      return;
    }
    
    toast({
      title: "Emergency call initiated",
      description: `Calling ${contact.name} at ${contact.phoneNumber}`,
      variant: "destructive",
    });
    
    // On mobile devices, this will open the phone dialer
    window.location.href = `tel:${contact.phoneNumber}`;
    
    // Reset state after call is initiated
    setTimeout(() => {
      setIsActivated(false);
    }, 1000);
  };

  const cancelEmergencyCall = () => {
    setIsActivated(false);
    setCountdown(0);
    
    toast({
      title: "Emergency call canceled",
      description: "Emergency sequence has been aborted",
    });
  };

  const simulateShake = () => {
    if (shakeDetector) {
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
          >
            <Phone className="mr-2 h-6 w-6" />
            Trigger Emergency Call
          </Button>
          
          {isShakeEnabled ? (
            <p className="text-sm text-muted-foreground">
              {isMobile ? (
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
