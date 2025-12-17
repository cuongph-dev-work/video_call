'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundProcessor, BackgroundConfig, BackgroundType } from '@/domains/media/lib/background-processor';

interface UseVirtualBackgroundProps {
  videoElement: HTMLVideoElement | null;
  enabled: boolean;
}

export function useVirtualBackground({ videoElement, enabled }: UseVirtualBackgroundProps) {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<BackgroundConfig>({ type: 'none' });

  const processorRef = useRef<BackgroundProcessor | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize processor
  useEffect(() => {
    if (!enabled || !BackgroundProcessor.isSupported()) {
      setError(enabled ? 'Virtual backgrounds not supported in this browser' : null);
      return;
    }

    const initProcessor = async () => {
      try {
        const processor = new BackgroundProcessor();
        await processor.initialize();
        
        processorRef.current = processor;
        outputCanvasRef.current = document.createElement('canvas');
        
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize virtual background:', err);
        setError('Failed to initialize virtual background');
      }
    };

    void initProcessor();

    return () => {
      cleanup();
    };
  }, [enabled]);

  // Process video frames
  const processFrames = useCallback(async () => {
    if (
      !isReady ||
      !processorRef.current ||
      !videoElement ||
      !outputCanvasRef.current ||
      videoElement.readyState < 2
    ) {
      return;
    }

    try {
      await processorRef.current.processFrame(videoElement, outputCanvasRef.current);
      
      // Continue processing
      animationFrameRef.current = requestAnimationFrame(processFrames);
    } catch (err) {
      console.error('Error processing frame:', err);
      setError('Error processing video');
    }
  }, [isReady, videoElement]);

  // Start/stop processing based on config
  useEffect(() => {
    if (!isReady || !videoElement || currentConfig.type === 'none') {
      stopProcessing();
      return;
    }

    startProcessing();

    return () => {
      stopProcessing();
    };
  }, [isReady, videoElement, currentConfig, processFrames]);

  const startProcessing = useCallback(() => {
    if (isProcessing) return;

    setIsProcessing(true);
    void processFrames();
  }, [isProcessing, processFrames]);

  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  const setBackground = useCallback(
    async (config: BackgroundConfig) => {
      if (!processorRef.current || !isReady) {
        return;
      }

      try {
        setCurrentConfig(config);
        await processorRef.current.setBackground(config);
        setError(null);
      } catch (err) {
        console.error('Failed to set background:', err);
        setError('Failed to apply background');
      }
    },
    [isReady],
  );

  const setBackgroundType = useCallback(
    async (type: BackgroundType, options?: { blurAmount?: number; imageUrl?: string }) => {
      const config: BackgroundConfig = {
        type,
        blurAmount: options?.blurAmount,
        imageUrl: options?.imageUrl,
      };
      await setBackground(config);
    },
    [setBackground],
  );

  const getProcessedStream = useCallback((): MediaStream | null => {
    if (!outputCanvasRef.current || !processorRef.current || currentConfig.type === 'none') {
      return null;
    }

    // Cache stream
    if (!processedStreamRef.current) {
      processedStreamRef.current = processorRef.current.createStream(outputCanvasRef.current);
    }

    return processedStreamRef.current;
  }, [currentConfig.type]);

  const cleanup = useCallback(() => {
    stopProcessing();

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.dispose();
      processorRef.current = null;
    }

    outputCanvasRef.current = null;
    setIsReady(false);
    setIsProcessing(false);
  }, [stopProcessing]);

  return {
    isReady,
    isProcessing,
    error,
    currentConfig,
    setBackground,
    setBackgroundType,
    getProcessedStream,
    outputCanvas: outputCanvasRef.current,
    isSupported: BackgroundProcessor.isSupported(),
  };
}

