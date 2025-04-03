
/**
 * Shake detection utility based on device accelerometer
 * Optimized for mobile devices, especially for emergency applications
 */
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

  constructor(onShake: ShakeCallback, options: ShakeOptions = {}) {
    this.onShake = onShake;
    this.threshold = options.threshold || 12; // Lowered default threshold for better sensitivity
    this.timeout = options.timeout || 1000; // Default timeout between shakes
    
    this.handleMotion = this.handleMotion.bind(this);
  }

  start(): void {
    if (this.isListening) return;
    
    if (window.DeviceMotionEvent) {
      // Request permission for iOS devices (iOS 13+)
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(response => {
            if (response === 'granted') {
              window.addEventListener('devicemotion', this.handleMotion, false);
              this.isListening = true;
              console.log('Shake detection started with permission');
            } else {
              console.warn('Device motion permission denied');
            }
          })
          .catch(error => {
            console.error('Error requesting device motion permission:', error);
            // Fallback to try anyway - might work on non-iOS or older iOS
            window.addEventListener('devicemotion', this.handleMotion, false);
            this.isListening = true;
            console.log('Shake detection started without explicit permission');
          });
      } else {
        // For non-iOS devices that don't require permission
        window.addEventListener('devicemotion', this.handleMotion, false);
        this.isListening = true;
        console.log('Shake detection started');
      }
    } else {
      console.warn('Device motion not supported on this device');
    }
  }

  stop(): void {
    if (!this.isListening) return;
    
    window.removeEventListener('devicemotion', this.handleMotion);
    this.isListening = false;
    this.consecutiveShakes = 0;
    
    if (this.shakeTimeout !== null) {
      clearTimeout(this.shakeTimeout);
      this.shakeTimeout = null;
    }
    console.log('Shake detection stopped');
  }

  private handleMotion(event: DeviceMotionEvent): void {
    const current = Date.now();
    const acceleration = event.accelerationIncludingGravity;
    
    if (!acceleration) return;
    
    // Only register after enough time has passed
    if ((current - this.lastTime) > 100) {
      const deltaTime = current - this.lastTime;
      this.lastTime = current;
      
      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;
      
      const deltaX = Math.abs(this.lastX - x);
      const deltaY = Math.abs(this.lastY - y);
      const deltaZ = Math.abs(this.lastZ - z);
      
      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;
      
      // Calculate speed of movement
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) / deltaTime * 10000;
      
      if (speed > this.threshold) {
        console.log('Shake detected with speed:', speed);
        
        // Increment consecutive shakes counter
        this.consecutiveShakes++;
        
        // If we've detected enough consecutive shakes or a very strong shake
        if (this.consecutiveShakes >= this.requiredShakes || speed > this.threshold * 2) {
          // Prevent multiple triggers
          if (this.shakeTimeout !== null) return;
          
          // Trigger shake event
          this.onShake();
          this.consecutiveShakes = 0;
          
          this.shakeTimeout = window.setTimeout(() => {
            this.shakeTimeout = null;
          }, this.timeout);
        }
        
        // Reset consecutive shakes after a timeout
        setTimeout(() => {
          this.consecutiveShakes = 0;
        }, 2000);
      }
    }
  }

  // For browsers/devices that don't support device motion
  // Simulates shake for testing or triggers from button presses
  simulateShake(): void {
    this.onShake();
  }
}
