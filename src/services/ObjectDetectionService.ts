
/**
 * Object detection service using TensorFlow.js COCO-SSD model
 */

import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { speak } from './SpeechService';

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

class ObjectDetectionService {
  private model: cocossd.ObjectDetection | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private videoElement: HTMLVideoElement | null = null;
  private lastReadTime: number = 0;
  private detectionInterval: number | null = null;
  private previousObjects: DetectedObject[] = [];
  private readThreshold: number = 0.65; // Confidence threshold
  
  // Load the model
  async initialize(): Promise<boolean> {
    try {
      await tf.ready();
      console.log('TensorFlow.js is ready');
      
      if (!this.model) {
        console.log('Loading COCO-SSD model...');
        this.model = await cocossd.load();
        this.isInitialized = true;
        console.log('COCO-SSD model loaded');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing object detection:', error);
      speak("Failed to initialize object detection. Please try again later.");
      return false;
    }
  }
  
  // Start detection with camera feed
  async start(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }
    
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }
    
    try {
      this.videoElement = videoElement;
      
      // Set up camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'environment', // Use rear camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve(true);
          };
        });
        
        speak("Object detection started. I will describe objects around you.");
        
        this.isRunning = true;
        this.runDetection();
        return true;
      } else {
        speak("Camera access is not available on your device");
        return false;
      }
    } catch (error) {
      console.error('Error starting object detection:', error);
      speak("Failed to start the camera for object detection");
      return false;
    }
  }
  
  // Stop detection
  stop(): void {
    this.isRunning = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    // Stop camera
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    
    this.previousObjects = [];
    speak("Object detection stopped");
  }
  
  // Run the detection loop
  private runDetection(): void {
    if (!this.model || !this.videoElement || !this.isRunning) return;
    
    this.detectionInterval = window.setInterval(async () => {
      if (!this.isRunning || !this.model || !this.videoElement) return;
      
      try {
        const predictions = await this.model.detect(this.videoElement);
        this.processResults(predictions);
      } catch (error) {
        console.error('Error during object detection:', error);
      }
    }, 1000); // Run detection every second
  }
  
  // Process and announce detected objects
  private processResults(predictions: cocossd.DetectedObject[]): void {
    if (!predictions || predictions.length === 0) return;
    
    const now = Date.now();
    // Don't read too frequently - wait at least 3 seconds between readings
    if (now - this.lastReadTime < 3000) return;
    
    // Filter predictions by confidence
    const significantObjects = predictions
      .filter(pred => pred.score > this.readThreshold)
      .map(pred => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox as [number, number, number, number]
      }));
    
    if (significantObjects.length === 0) return;
    
    // Check if objects are different from previous detection
    const newObjects = this.findNewObjects(significantObjects);
    if (newObjects.length === 0) return;
    
    // Update previous objects list
    this.previousObjects = significantObjects;
    
    // Announce objects with positions
    this.announceObjects(newObjects);
    this.lastReadTime = now;
  }
  
  // Find objects that weren't detected in previous frame
  private findNewObjects(currentObjects: DetectedObject[]): DetectedObject[] {
    if (this.previousObjects.length === 0) return currentObjects;
    
    return currentObjects.filter(current => {
      // Check if we already announced this type of object recently
      const existingObject = this.previousObjects.find(prev => prev.class === current.class);
      return !existingObject;
    });
  }
  
  // Generate human-friendly position descriptions
  private getPositionDescription(bbox: [number, number, number, number]): string {
    const [x, y, width, height] = bbox;
    const videoWidth = this.videoElement?.width || 640;
    const videoHeight = this.videoElement?.height || 480;
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const horizontalPosition = centerX < videoWidth / 3 ? "to your left" : 
                              centerX > (videoWidth * 2/3) ? "to your right" : 
                              "in front of you";
                              
    const verticalPosition = centerY < videoHeight / 3 ? "above" : 
                            centerY > (videoHeight * 2/3) ? "below" : 
                            "";
    
    const size = (width * height) / (videoWidth * videoHeight);
    const distance = size > 0.5 ? "very close" : 
                     size > 0.2 ? "nearby" : 
                     size > 0.05 ? "at medium distance" : 
                     "far away";
    
    return `${horizontalPosition} ${verticalPosition} ${distance}`.trim();
  }
  
  // Announce detected objects using text-to-speech
  private announceObjects(objects: DetectedObject[]): void {
    // Limit to announcing 3 most important objects
    const topObjects = objects.sort((a, b) => b.score - a.score).slice(0, 3);
    
    if (topObjects.length === 1) {
      const obj = topObjects[0];
      const position = this.getPositionDescription(obj.bbox);
      speak(`${obj.class} ${position}`);
    } else {
      const descriptions = topObjects.map(obj => {
        const position = this.getPositionDescription(obj.bbox);
        return `${obj.class} ${position}`;
      });
      
      speak(descriptions.join(". "));
    }
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
}

// Export a singleton instance
export const objectDetection = new ObjectDetectionService();
