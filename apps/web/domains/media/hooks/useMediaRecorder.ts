'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blob: Blob | null;
}

export function useMediaRecorder(stream: MediaStream | null) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateDuration = useCallback(() => {
    if (state.isRecording && !state.isPaused && startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, duration: elapsed }));
    }
  }, [state.isRecording, state.isPaused]);

  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      durationIntervalRef.current = setInterval(updateDuration, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused, updateDuration]);

  const startRecording = useCallback(() => {
    if (!stream || state.isRecording) return;

    try {
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
      };

      // Fallback to other codecs if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          blob,
        }));
      };

      mediaRecorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
        }));
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }));
    } catch {
      // Silently handle error - user will see recording button state
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
      }));
    }
  }, [stream, state.isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      startTimeRef.current = 0;
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
      startTimeRef.current = Date.now() - state.duration * 1000;
    }
  }, [state.isRecording, state.isPaused, state.duration]);

  const downloadRecording = useCallback(() => {
    if (state.blob) {
      const url = URL.createObjectURL(state.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [state.blob]);

  const formatDuration = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.isRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    formatDuration: () => formatDuration(state.duration),
  };
}

