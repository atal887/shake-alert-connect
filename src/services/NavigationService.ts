
/**
 * Navigation service using Mapbox API
 * Provides voice-guided navigation for visually impaired users
 */

import { speak } from './SpeechService';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  maneuver: string;
  streetName?: string;
}

export interface NavigationState {
  isNavigating: boolean;
  currentStep: NavigationStep | null;
  remainingDistance: number;
  remainingDuration: number;
  destination: string;
}

class NavigationService {
  private mapboxToken: string = '';
  private isInitialized: boolean = false;
  private watchId: number | null = null;
  private currentPosition: Coordinates | null = null;
  private destination: Coordinates | null = null;
  private route: NavigationStep[] = [];
  private currentStepIndex: number = 0;
  private announcementInterval: number | null = null;
  private lastDistance: number = 0;
  private navigationState: NavigationState = {
    isNavigating: false,
    currentStep: null,
    remainingDistance: 0,
    remainingDuration: 0,
    destination: ''
  };
  private listeners: ((state: NavigationState) => void)[] = [];
  
  async initialize(mapboxToken: string): Promise<boolean> {
    try {
      this.mapboxToken = mapboxToken;
      this.isInitialized = true;
      
      // Get initial position
      await this.updateCurrentPosition();
      return true;
    } catch (error) {
      console.error('Error initializing navigation:', error);
      speak("Failed to initialize navigation service. Please check if location services are enabled.");
      return false;
    }
  }
  
  private async updateCurrentPosition(): Promise<Coordinates | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        speak("Geolocation is not supported by your browser");
        reject(new Error("Geolocation not supported"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve(this.currentPosition);
        },
        (error) => {
          console.error('Geolocation error:', error.message);
          speak("Unable to access your location");
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }
  
  async startNavigation(destination: string): Promise<boolean> {
    if (!this.isInitialized) {
      speak("Navigation service is not initialized");
      return false;
    }
    
    try {
      // Get current position
      await this.updateCurrentPosition();
      if (!this.currentPosition) {
        speak("Unable to determine your current location");
        return false;
      }
      
      // Geocode destination to coordinates
      const destinationCoords = await this.geocodeAddress(destination);
      if (!destinationCoords) {
        speak(`Could not find location: ${destination}`);
        return false;
      }
      
      this.destination = destinationCoords;
      
      // Get route between current position and destination
      const routeData = await this.calculateRoute(this.currentPosition, destinationCoords);
      if (!routeData || routeData.length === 0) {
        speak("Could not calculate a route to your destination");
        return false;
      }
      
      this.route = routeData;
      this.currentStepIndex = 0;
      
      // Start tracking location
      this.startLocationTracking();
      
      // Update navigation state
      this.navigationState = {
        isNavigating: true,
        currentStep: this.route[0],
        remainingDistance: this.calculateRemainingDistance(),
        remainingDuration: this.calculateRemainingDuration(),
        destination: destination
      };
      
      // Notify listeners
      this.notifyListeners();
      
      // Initial announcement
      speak(`Starting navigation to ${destination}. ${this.route[0].instruction}`);
      
      // Start periodic announcements
      this.startAnnouncementInterval();
      
      return true;
    } catch (error) {
      console.error('Error starting navigation:', error);
      speak("An error occurred while starting navigation");
      return false;
    }
  }
  
  stopNavigation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.announcementInterval !== null) {
      clearInterval(this.announcementInterval);
      this.announcementInterval = null;
    }
    
    this.navigationState = {
      isNavigating: false,
      currentStep: null,
      remainingDistance: 0,
      remainingDuration: 0,
      destination: ''
    };
    
    this.route = [];
    this.currentStepIndex = 0;
    this.lastDistance = 0;
    
    speak("Navigation stopped");
    
    // Notify listeners
    this.notifyListeners();
  }
  
  private startLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        this.currentPosition = newPosition;
        this.checkProgress();
      },
      (error) => {
        console.error('Geolocation tracking error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
  
  private startAnnouncementInterval(): void {
    // Clear any existing interval
    if (this.announcementInterval !== null) {
      clearInterval(this.announcementInterval);
    }
    
    // Set up periodic announcements
    this.announcementInterval = window.setInterval(() => {
      if (!this.navigationState.isNavigating || !this.navigationState.currentStep) return;
      
      // Get current step
      const currentStep = this.navigationState.currentStep;
      
      // Calculate distance to next maneuver
      const distanceToManeuver = this.calculateDistanceToNextManeuver();
      
      // Announce based on distance
      if (distanceToManeuver < 20) {
        // Close to maneuver - announce with urgency
        speak(`${currentStep.instruction} now!`, 1.1);
      } else if (distanceToManeuver < 50) {
        // Approaching maneuver
        speak(`In ${Math.round(distanceToManeuver)} meters, ${currentStep.instruction}`);
      } else if (Math.abs(this.lastDistance - distanceToManeuver) > 50) {
        // Distance changed significantly - update user
        speak(`Continue for ${Math.round(distanceToManeuver)} meters, then ${currentStep.instruction}`);
        this.lastDistance = distanceToManeuver;
      }
    }, 15000); // Update every 15 seconds by default
  }
  
  private checkProgress(): void {
    if (!this.currentPosition || !this.destination || this.route.length === 0) return;
    
    // Calculate distance to current step's maneuver point
    const distanceToManeuver = this.calculateDistanceToNextManeuver();
    
    // Check if we've reached the maneuver point for the current step
    if (distanceToManeuver < 10 && this.currentStepIndex < this.route.length - 1) {
      // Move to next step
      this.currentStepIndex++;
      
      // Update navigation state
      this.navigationState.currentStep = this.route[this.currentStepIndex];
      this.navigationState.remainingDistance = this.calculateRemainingDistance();
      this.navigationState.remainingDuration = this.calculateRemainingDuration();
      
      // Announce next step
      speak(this.route[this.currentStepIndex].instruction);
      
      // Notify listeners
      this.notifyListeners();
    }
    
    // Check if we've reached the destination
    if (this.currentStepIndex === this.route.length - 1 && distanceToManeuver < 20) {
      speak("You have arrived at your destination");
      this.stopNavigation();
    }
  }
  
  private async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}&limit=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return { latitude, longitude };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  
  private async calculateRoute(start: Coordinates, end: Coordinates): Promise<NavigationStep[]> {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&access_token=${this.mapboxToken}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Process and simplify directions for accessibility
        return data.routes[0].legs[0].steps.map((step: any) => {
          return {
            instruction: step.maneuver.instruction || this.getDefaultInstruction(step.maneuver.type),
            distance: step.distance,
            maneuver: step.maneuver.type,
            streetName: step.name
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Route calculation error:', error);
      return [];
    }
  }
  
  private getDefaultInstruction(maneuverType: string): string {
    switch (maneuverType) {
      case 'turn':
        return 'Make a turn';
      case 'continue':
        return 'Continue straight';
      case 'arrive':
        return 'You have arrived at your destination';
      default:
        return 'Continue on your route';
    }
  }
  
  private calculateDistanceToNextManeuver(): number {
    if (!this.currentPosition || this.route.length === 0 || this.currentStepIndex >= this.route.length) {
      return 0;
    }
    
    // In a real implementation, this would calculate the actual distance
    // between the current position and the next maneuver point using
    // the Haversine formula or similar
    
    // Simplified version - just return the step distance
    return this.route[this.currentStepIndex].distance;
  }
  
  private calculateRemainingDistance(): number {
    if (this.route.length === 0 || this.currentStepIndex >= this.route.length) {
      return 0;
    }
    
    // Sum up distances of remaining steps
    return this.route.slice(this.currentStepIndex).reduce((sum, step) => sum + step.distance, 0);
  }
  
  private calculateRemainingDuration(): number {
    // Simplified calculation based on average walking speed (about 5 km/h)
    const remainingDistance = this.calculateRemainingDistance();
    const walkingSpeedMetersPerSecond = 1.4; // 5 km/h in m/s
    
    return Math.round(remainingDistance / walkingSpeedMetersPerSecond);
  }
  
  getNavigationState(): NavigationState {
    return this.navigationState;
  }
  
  addListener(callback: (state: NavigationState) => void): void {
    this.listeners.push(callback);
  }
  
  removeListener(callback: (state: NavigationState) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.navigationState));
  }
  
  async getCurrentLocation(): Promise<string | null> {
    try {
      await this.updateCurrentPosition();
      
      if (!this.currentPosition) {
        speak("Unable to determine your current location");
        return null;
      }
      
      // Reverse geocode current position
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${this.currentPosition.longitude},${this.currentPosition.latitude}.json?access_token=${this.mapboxToken}&limit=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        speak(`You are at ${place.place_name}`);
        return place.place_name;
      }
      
      speak("Your location was found, but could not be converted to an address");
      return null;
    } catch (error) {
      console.error('Error getting current location:', error);
      speak("An error occurred while trying to determine your location");
      return null;
    }
  }
}

// Export singleton instance
export const navigationService = new NavigationService();
