
/**
 * Shake detection utility based on device accelerometer
 * Optimized for mobile devices, especially for emergency applications
 */

// Add a declaration for the iOS-specific DeviceMotionEvent interface
interface DeviceMotionEventIOS extends DeviceMotionEvent {
  requestPermission?: () => Promise<string>;
}

// Add a declaration for the constructor
interface DeviceMotionEventIOSConstructor {
  new(type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEvent;
  prototype: DeviceMotionEvent;
  requestPermission?: () => Promise<string>;
}

type ShakeCallback = () => void;

interface ShakeOptions {
  threshold?: number;  // Acceleration threshold to trigger shake
  timeout?: number;    // Timeout between shakes in ms
}

export class ShakeDetector {
  private lastTime: number = 0;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastZ: number = 0;
  private shakeTimeout: number | null = null;
  private onShake: ShakeCallback;
  private threshold: number;
  private timeout: number;
  private isListening: boolean = false;
  private consecutiveShakes: number = 0;
  private requiredShakes: number = 2; // Require at least 2 consecutive shakes
  private permissionGranted: boolean = false;
  private debugMode: boolean = true; // Enable debug mode

  constructor(onShake: ShakeCallback, options: ShakeOptions = {}) {
    this.onShake = onShake;
    this.threshold = options.threshold || 8; // Lower threshold for better sensitivity (was 10)
    this.timeout = options.timeout || 1000; // Default timeout between shakes
    
    this.handleMotion = this.handleMotion.bind(this);
    
    if (this.debugMode) {
      console.log('ShakeDetector initialized with threshold:', this.threshold);
    }
  }

  start(): void {
    if (this.isListening) return;
    
    console.log('Starting shake detection with threshold:', this.threshold);
    
    if (window.DeviceMotionEvent) {
      // Cast to our extended interface
      const DeviceMotionEventIOS = window.DeviceMotionEvent as unknown as DeviceMotionEventIOSConstructor;
      
      // Request permission for iOS devices (iOS 13+)
      if (typeof DeviceMotionEventIOS.requestPermission === 'function') {
        DeviceMotionEventIOS.requestPermission()
          .then(response => {
            if (response === 'granted') {
              this.permissionGranted = true;
              window.addEventListener('devicemotion', this.handleMotion, false);
              this.isListening = true;
              console.log('Shake detection started with permission');
            } else {
              console.warn('Device motion permission denied');
              // Still try to add the listener - might work on some older iOS devices
              try {
                window.addEventListener('devicemotion', this.handleMotion, false);
                this.isListening = true;
                console.log('Shake detection started (fallback method)');
              } catch (e) {
                console.error('Failed to start motion detection:', e);
              }
            }
          })
          .catch(error => {
            console.error('Error requesting device motion permission:', error);
            // Try fallback method - might work on some devices
            try {
              window.addEventListener('devicemotion', this.handleMotion, false);
              this.isListening = true;
              console.log('Shake detection started without explicit permission');
            } catch (e) {
              console.error('Failed to start motion detection:', e);
            }
          });
      } else {
        // For non-iOS devices that don't require permission
        try {
          window.addEventListener('devicemotion', this.handleMotion, false);
          this.isListening = true;
          console.log('Shake detection started (non-iOS device)');
        } catch (error) {
          console.error('Error starting shake detection:', error);
        }
      }
    } else {
      console.warn('Device motion not supported on this device');
    }
  }

  stop(): void {
    if (!this.isListening) return;
    
    try {
      window.removeEventListener('devicemotion', this.handleMotion);
      console.log('Shake detection stopped');
    } catch (error) {
      console.error('Error removing device motion listener:', error);
    }
    
    this.isListening = false;
    this.consecutiveShakes = 0;
    
    if (this.shakeTimeout !== null) {
      clearTimeout(this.shakeTimeout);
      this.shakeTimeout = null;
    }
  }

  private handleMotion(event: DeviceMotionEvent): void {
    const current = Date.now();
    const acceleration = event.accelerationIncludingGravity;
    
    if (!acceleration) {
      if (this.debugMode) console.log('No acceleration data available');
      return;
    }
    
    // Only register after enough time has passed (increased sampling rate)
    if ((current - this.lastTime) > 80) { // Reduced from 100ms to 80ms for better responsiveness
      const deltaTime = current - this.lastTime;
      this.lastTime = current;
      
      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;
      
      const deltaX = Math.abs(this.lastX - x);
      const deltaY = Math.abs(this.lastY - y);
      const deltaZ = Math.abs(this.lastZ - z);
      
      // Log values occasionally for debugging
      if (this.debugMode && Math.random() < 0.05) {
        console.log('Motion detected - deltaX:', deltaX, 'deltaY:', deltaY, 'deltaZ:', deltaZ);
      }
      
      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;
      
      // Calculate speed of movement (adjusted formula for better sensitivity)
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) / deltaTime * 10000;
      
      // Also detect rapid movement in any single axis
      const maxAxisChange = Math.max(deltaX, deltaY, deltaZ);
      const isSingleAxisShake = maxAxisChange > this.threshold / 1.5;
      
      if (speed > this.threshold || isSingleAxisShake) {
        console.log('Shake detected with speed:', speed, 'threshold:', this.threshold, 'maxAxisChange:', maxAxisChange);
        
        // Increment consecutive shakes counter
        this.consecutiveShakes++;
        
        // If we've detected enough consecutive shakes or a very strong shake
        if (this.consecutiveShakes >= this.requiredShakes || speed > this.threshold * 1.5) {
          // Prevent multiple triggers
          if (this.shakeTimeout !== null) return;
          
          console.log('Triggering shake callback with speed:', speed);
          
          // Trigger shake event
          this.onShake();
          this.consecutiveShakes = 0;
          
          this.shakeTimeout = window.setTimeout(() => {
            this.shakeTimeout = null;
          }, this.timeout);
        }
        
        // Reset consecutive shakes after a timeout (increased window)
        setTimeout(() => {
          if (this.consecutiveShakes > 0) {
            this.consecutiveShakes = 0;
          }
        }, 2500); // Increased from 2000ms to 2500ms
      }
    }
  }

  // For browsers/devices that don't support device motion
  // Simulates shake for testing or triggers from button presses
  simulateShake(): void {
    console.log('Simulating shake event');
    this.onShake();
  }

  // Check if permission has been granted
  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }
  
  // Adjust threshold dynamically
  setThreshold(threshold: number): void {
    console.log('Setting shake threshold to:', threshold);
    this.threshold = threshold;
  }
}
