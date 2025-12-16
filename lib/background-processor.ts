/**
 * Background Processor using MediaPipe Selfie Segmentation
 * Supports blur and custom image backgrounds
 */

// MediaPipe type definitions
export interface MediaPipeConfig {
  locateFile: (file: string) => string;
}

export interface SegmentationOptions {
  modelSelection?: 0 | 1; // 0: General model, 1: Landscape model (faster)
  selfieMode?: boolean;
}

export interface SegmentationResults {
  segmentationMask: HTMLCanvasElement;
  image: HTMLCanvasElement | HTMLVideoElement;
}

export interface SelfieSegmentationInstance {
  setOptions(options: SegmentationOptions): void;
  onResults(callback: (results: SegmentationResults) => void): void;
  send(inputs: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

export interface SelfieSegmentationClass {
  new (config?: MediaPipeConfig): SelfieSegmentationInstance;
  name?: string;
}

// Mock implementation for development
class MockSelfieSegmentation implements SelfieSegmentationInstance {
  setOptions(): void {
    // Mock implementation
  }
  
  onResults(): void {
    // Mock implementation
  }
  
  send(): Promise<void> {
    return Promise.resolve();
  }
  
  close(): void {
    // Mock implementation
  }
}

// Lazy-loaded MediaPipe reference
let cachedSelfieSegmentation: SelfieSegmentationClass | null = null;

async function getSelfieSegmentation(): Promise<SelfieSegmentationClass> {
  if (cachedSelfieSegmentation) {
    return cachedSelfieSegmentation;
  }

  try {
    const mediapipe = await import('@mediapipe/selfie_segmentation');
    cachedSelfieSegmentation = mediapipe.SelfieSegmentation as SelfieSegmentationClass;
    return cachedSelfieSegmentation;
  } catch (error) {
    console.warn(
      'MediaPipe not installed. Virtual backgrounds will not work. Run: pnpm add @mediapipe/selfie_segmentation',
      error
    );
    // Return mock as fallback
    cachedSelfieSegmentation = MockSelfieSegmentation as unknown as SelfieSegmentationClass;
    return cachedSelfieSegmentation;
  }
}

export type BackgroundType = 'none' | 'blur' | 'image';

export interface BackgroundConfig {
  type: BackgroundType;
  blurAmount?: number; // 0-20, default 10
  imageUrl?: string;
}

export class BackgroundProcessor {
  private segmentation: SelfieSegmentationInstance | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private config: BackgroundConfig = { type: 'none' };
  private isProcessing = false;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('BackgroundProcessor requires browser environment');
    }

    try {
      // Lazy load MediaPipe
      const SelfieSegmentation = await getSelfieSegmentation();
      const isRealMediaPipe = SelfieSegmentation.name !== 'MockSelfieSegmentation';
      
      if (isRealMediaPipe) {
        this.segmentation = new SelfieSegmentation({
          locateFile: (file: string) => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        this.segmentation.setOptions({
          modelSelection: 1,
          selfieMode: true,
        });
      } else {
        // Mock mode
        this.segmentation = new SelfieSegmentation();
        console.warn('Using mock MediaPipe - backgrounds will not work');
      }

      // Create canvas for processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }

      this.isProcessing = true;
    } catch (error) {
      console.error('Failed to initialize BackgroundProcessor:', error);
      throw error;
    }
  }

  async setBackground(config: BackgroundConfig): Promise<void> {
    this.config = config;

    if (config.type === 'image' && config.imageUrl) {
      await this.loadBackgroundImage(config.imageUrl);
    }
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    outputCanvas: HTMLCanvasElement,
  ): Promise<void> {
    if (!this.segmentation || !this.canvas || !this.ctx || !this.isProcessing) {
      return;
    }

    // Skip if config is 'none'
    if (this.config.type === 'none') {
      // Just copy video to output canvas
      const outputCtx = outputCanvas.getContext('2d');
      if (outputCtx) {
        outputCanvas.width = videoElement.videoWidth;
        outputCanvas.height = videoElement.videoHeight;
        outputCtx.drawImage(videoElement, 0, 0);
      }
      return;
    }

    // Set canvas dimensions
    this.canvas.width = videoElement.videoWidth;
    this.canvas.height = videoElement.videoHeight;
    outputCanvas.width = videoElement.videoWidth;
    outputCanvas.height = videoElement.videoHeight;

    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    try {
      // Process with MediaPipe
      await this.segmentation.send({ image: videoElement });

      // Listen for results
      this.segmentation.onResults((results) => {
        if (!this.ctx || !this.canvas) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context state
        this.ctx.save();

        // Draw segmentation mask
        this.ctx.drawImage(
          results.segmentationMask,
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );

        // Use mask as composite operation
        this.ctx.globalCompositeOperation = 'source-in';
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        // Restore context
        this.ctx.globalCompositeOperation = 'destination-over';

        // Apply background based on type
        if (this.config.type === 'blur') {
          this.applyBlur(results.image, this.config.blurAmount || 10);
        } else if (this.config.type === 'image' && this.backgroundImage) {
          this.ctx.drawImage(
            this.backgroundImage,
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          );
        }

        this.ctx.restore();

        // Copy to output canvas
        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputCtx.drawImage(this.canvas, 0, 0);
      });
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }

  private applyBlur(image: HTMLCanvasElement | HTMLVideoElement, amount: number): void {
    if (!this.ctx || !this.canvas) return;

    // Draw blurred background
    this.ctx.filter = `blur(${amount}px)`;
    this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = 'none';
  }

  /**
   * Create a MediaStream from processed canvas
   */
  createStream(canvas: HTMLCanvasElement, frameRate: number = 30): MediaStream {
    const stream = canvas.captureStream(frameRate);
    return stream;
  }

  /**
   * Stop processing and cleanup resources
   */
  dispose(): void {
    this.isProcessing = false;

    if (this.segmentation) {
      this.segmentation.close();
      this.segmentation = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.backgroundImage = null;
  }

  /**
   * Check if processor is supported in current browser
   */
  static async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const hasCanvasSupport = !!(
      window.HTMLCanvasElement &&
      typeof window.HTMLCanvasElement.prototype.captureStream === 'function'
    );

    try {
      const SelfieSegmentation = await getSelfieSegmentation();
      const hasRealMediaPipe = SelfieSegmentation.name !== 'MockSelfieSegmentation';
      return hasCanvasSupport && hasRealMediaPipe;
    } catch {
      return false;
    }
  }
}

