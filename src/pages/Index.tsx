
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mic, Navigation, Eye, Phone, Info, MicOff, MapPin } from 'lucide-react';
import { speak, speechRecognition } from '@/services/SpeechService';
import { objectDetection } from '@/services/ObjectDetectionService';
import { navigationService, NavigationState } from '@/services/NavigationService';
import { ShakeDetector } from '@/utils/shakeDetection';
import { getPrimaryContact, getEmergencyContacts } from '@/utils/emergencyContacts';
import EmergencyContactsManager from '@/components/EmergencyContactsManager';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const Index = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('navigation');
  const [isShakeEnabled, setIsShakeEnabled] = useState(true);
  const [hasContacts, setHasContacts] = useState(false);
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [isObjectDetectionActive, setIsObjectDetectionActive] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shakeDetectorRef = useRef<ShakeDetector | null>(null);
  const { state: voiceState, startListening, stopListening } = useVoiceCommands();
  
  // Initial setup
  useEffect(() => {
    // Welcome message with brief instructions
    setTimeout(() => {
      speak(
        "Welcome to Vision Assist, your accessibility companion. " +
        "This app uses voice commands for navigation. " +
        "Say 'help' for available commands. " +
        "Shake the device for emergency calls."
      );
    }, 1000);
    
    // Check for emergency contacts
    const contacts = getEmergencyContacts();
    setHasContacts(contacts.length > 0);
    
    // Initialize shake detector for emergency calls
    const detector = new ShakeDetector(handleEmergencyCall, {
      threshold: 15,  // Higher threshold for more intentional activation
      timeout: 2000,  // Longer timeout to prevent accidental triggers
    });
    
    if (isShakeEnabled) {
      detector.start();
      console.log('Shake detection started');
    }
    
    shakeDetectorRef.current = detector;
    
    return () => {
      // Cleanup
      detector.stop();
      if (isObjectDetectionActive) {
        objectDetection.stop();
      }
      if (isNavigating) {
        navigationService.stopNavigation();
      }
    };
  }, []);
  
  // Setup navigation listener
  useEffect(() => {
    const handleNavigationUpdate = (state: NavigationState) => {
      setNavigationState(state);
      setIsNavigating(state.isNavigating);
    };
    
    navigationService.addListener(handleNavigationUpdate);
    
    return () => navigationService.removeListener(handleNavigationUpdate);
  }, []);
  
  // Handle shake detector toggle
  useEffect(() => {
    if (shakeDetectorRef.current) {
      if (isShakeEnabled && hasContacts) {
        shakeDetectorRef.current.start();
      } else {
        shakeDetectorRef.current.stop();
      }
    }
  }, [isShakeEnabled, hasContacts]);
  
  // Initialize services when token is provided
  useEffect(() => {
    if (mapboxToken && !isInitialized) {
      const initialize = async () => {
        const success = await navigationService.initialize(mapboxToken);
        if (success) {
          setIsInitialized(true);
          speak("Navigation system initialized and ready");
          toast({
            title: "Navigation Ready",
            description: "You can now use navigation features",
          });
        } else {
          toast({
            title: "Navigation Error",
            description: "Failed to initialize navigation system",
            variant: "destructive",
          });
        }
      };
      
      initialize();
    }
  }, [mapboxToken, isInitialized, toast]);
  
  // Tab change handler with voice feedback
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Provide audio feedback when tab changes
    const tabNames: Record<string, string> = {
      navigation: "Navigation",
      detection: "Object Detection",
      emergency: "Emergency Call",
      contacts: "Emergency Contacts"
    };
    
    speak(`${tabNames[value]} tab selected`);
  };
  
  // Emergency call handler for shake detection
  const handleEmergencyCall = () => {
    if (!hasContacts) {
      speak("No emergency contacts found. Please add an emergency contact in settings.");
      toast({
        title: "No Emergency Contacts",
        description: "Please add emergency contacts first",
        variant: "destructive",
      });
      return;
    }
    
    const contact = getPrimaryContact();
    if (!contact) return;
    
    speak(`Emergency call initiated to ${contact.name}`);
    toast({
      title: "Emergency Call",
      description: `Calling ${contact.name}`,
      variant: "destructive",
    });
    
    // Format phone number and make the call
    const formattedNumber = contact.phoneNumber.replace(/[\s()-]/g, '');
    window.location.href = `tel:${formattedNumber}`;
  };
  
  // Start navigation handler
  const handleStartNavigation = async () => {
    if (!destination) {
      speak("Please enter a destination");
      return;
    }
    
    if (!isInitialized) {
      speak("Navigation is not initialized. Please enter your Mapbox token.");
      return;
    }
    
    speak(`Starting navigation to ${destination}`);
    const success = await navigationService.startNavigation(destination);
    if (!success) {
      speak("Failed to start navigation. Please try again.");
      toast({
        title: "Navigation Error",
        description: "Could not start navigation to the destination",
        variant: "destructive",
      });
    }
  };
  
  // Stop navigation handler
  const handleStopNavigation = () => {
    navigationService.stopNavigation();
    setIsNavigating(false);
    speak("Navigation stopped");
  };
  
  // Toggle object detection
  const handleToggleObjectDetection = async () => {
    if (isObjectDetectionActive) {
      objectDetection.stop();
      setIsObjectDetectionActive(false);
    } else {
      if (videoRef.current) {
        const success = await objectDetection.start(videoRef.current);
        setIsObjectDetectionActive(success);
        if (!success) {
          toast({
            title: "Detection Error",
            description: "Failed to start object detection",
            variant: "destructive",
          });
        }
      } else {
        speak("Camera initialization failed");
      }
    }
  };
  
  // Toggle voice commands
  const handleToggleVoiceCommands = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white py-4 px-6 border-b shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-bold">Vision Assist</h1>
          </div>
          <Button 
            variant={voiceState.isListening ? "default" : "outline"}
            size="sm" 
            onClick={handleToggleVoiceCommands}
            className="flex items-center"
            aria-label={voiceState.isListening ? "Disable voice commands" : "Enable voice commands"}
          >
            {voiceState.isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {voiceState.isListening ? "Voice On" : "Voice Off"}
          </Button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {!hasContacts && (
          <Alert className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertTitle className="flex items-center">Action Required</AlertTitle>
            <AlertDescription>
              Please add at least one emergency contact to use the shake-to-call feature.
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-500 text-amber-800"
              onClick={() => handleTabChange('contacts')}
            >
              Add Contacts Now
            </Button>
          </Alert>
        )}
        
        {voiceState.lastCommand && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <p className="text-sm">
              <strong>Last voice command:</strong> {voiceState.lastCommand}
            </p>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="navigation" className="flex items-center justify-center">
              <Navigation className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Navigation</span>
            </TabsTrigger>
            <TabsTrigger value="detection" className="flex items-center justify-center">
              <Eye className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Detection</span>
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex items-center justify-center">
              <Phone className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Emergency</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center justify-center">
              <Info className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Navigation Tab */}
          <TabsContent value="navigation" className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-2xl font-bold mb-6">Voice-Guided Navigation</h2>
              
              {!isInitialized && (
                <div className="mb-4">
                  <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
                  <Input 
                    id="mapbox-token" 
                    value={mapboxToken} 
                    onChange={(e) => setMapboxToken(e.target.value)}
                    placeholder="Enter your Mapbox access token"
                    className="mb-2"
                  />
                  <Button 
                    onClick={() => setIsInitialized(true)}
                    disabled={!mapboxToken}
                  >
                    Initialize Navigation
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get a token at <a href="https://account.mapbox.com/" className="text-primary underline" target="_blank" rel="noreferrer">mapbox.com</a>
                  </p>
                </div>
              )}
              
              {isInitialized && (
                <>
                  {!isNavigating ? (
                    <div>
                      <div className="mb-4">
                        <Label htmlFor="destination">Where would you like to go?</Label>
                        <Input 
                          id="destination" 
                          value={destination} 
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Enter destination (e.g., Central Park)"
                          className="mb-2"
                        />
                      </div>
                      
                      <Button 
                        className="w-full mb-2" 
                        onClick={handleStartNavigation}
                        disabled={!destination}
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Start Navigation
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          const location = await navigationService.getCurrentLocation();
                          if (location) {
                            toast({
                              title: "Current Location",
                              description: location,
                            });
                          }
                        }}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Where Am I?
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Alert className="mb-4 bg-blue-50 border-blue-200">
                        <AlertTitle>Navigation Active</AlertTitle>
                        <AlertDescription>
                          {navigationState?.currentStep?.instruction}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span>Destination:</span>
                          <span className="font-medium">{navigationState?.destination}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining Distance:</span>
                          <span className="font-medium">{navigationState?.remainingDistance ? `${Math.round(navigationState.remainingDistance)} meters` : 'Calculating...'}</span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={handleStopNavigation}
                      >
                        Stop Navigation
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              <div className="mt-6 p-4 bg-muted rounded-md">
                <h3 className="font-medium">Voice Commands</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try saying: "Where am I?" or "Start navigation to Central Park"
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Object Detection Tab */}
          <TabsContent value="detection" className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-2xl font-bold mb-6">Object Detection</h2>
              
              <div className="relative mb-4 aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef}
                  id="detection-video"
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                
                {!isObjectDetectionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                    <p>Camera inactive</p>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full mb-4" 
                variant={isObjectDetectionActive ? "destructive" : "default"}
                onClick={handleToggleObjectDetection}
              >
                <Eye className="mr-2 h-4 w-4" />
                {isObjectDetectionActive ? "Stop Object Detection" : "Start Object Detection"}
              </Button>
              
              <div className="p-4 bg-muted rounded-md">
                <h3 className="font-medium">How it works</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Object detection will scan your environment and announce detected objects. 
                  Point your camera at different areas to hear descriptions.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Voice command: "Start object detection" or "Stop object detection"
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Emergency Tab */}
          <TabsContent value="emergency" className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-2xl font-bold mb-6 text-center">Emergency Call</h2>
              
              {hasContacts ? (
                <>
                  <Button 
                    variant="destructive" 
                    size="lg" 
                    className="w-full py-8 text-xl"
                    onClick={handleEmergencyCall}
                  >
                    <Phone className="mr-2 h-6 w-6" />
                    Emergency Call
                  </Button>
                  
                  <div className="mt-6 p-4 bg-muted rounded-md">
                    <h3 className="font-medium">Shake to Call</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isShakeEnabled 
                        ? "Shake your device vigorously to trigger an emergency call" 
                        : "Shake detection is currently disabled. Enable it below."}
                    </p>
                    
                    <div className="mt-4 flex items-center">
                      <input
                        type="checkbox"
                        id="shake-enabled"
                        checked={isShakeEnabled}
                        onChange={(e) => setIsShakeEnabled(e.target.checked)}
                        className="mr-2"
                      />
                      <Label htmlFor="shake-enabled">Enable shake-to-call</Label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 border border-dashed rounded-lg">
                  <p className="mb-4 text-muted-foreground">
                    No emergency contacts found. Please add at least one contact.
                  </p>
                  <Button 
                    onClick={() => handleTabChange('contacts')}
                    variant="outline"
                  >
                    Add Emergency Contacts
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <EmergencyContactsManager />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="border-t py-4 px-6 bg-white mt-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Vision Assist - Accessibility App
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use voice commands or shake for emergency assistance
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
