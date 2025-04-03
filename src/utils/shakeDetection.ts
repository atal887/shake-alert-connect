
/**
 * Shake detection utility based on device accelerometer
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

  constructor(onShake: ShakeCallback, options: ShakeOptions = {}) {
    this.onShake = onShake;
    this.threshold = options.threshold || 15; // Default threshold
    this.timeout = options.timeout || 1000; // Default timeout between shakes
    
    this.handleMotion = this.handleMotion.bind(this);
  }

  start(): void {
    if (this.isListening) return;
    
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', this.handleMotion, false);
      this.isListening = true;
      console.log('Shake detection started');
    } else {
      console.warn('Device motion not supported on this device');
    }
  }

  stop(): void {
    if (!this.isListening) return;
    
    window.removeEventListener('devicemotion', this.handleMotion);
    this.isListening = false;
    
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
        // Prevent multiple shakes
        if (this.shakeTimeout !== null) return;
        
        // Trigger shake event
        this.onShake();
        
        this.shakeTimeout = window.setTimeout(() => {
          this.shakeTimeout = null;
        }, this.timeout);
      }
    }
  }

  // For browsers/devices that don't support device motion
  // Simulates shake for testing
  simulateShake(): void {
    this.onShake();
  }
}
