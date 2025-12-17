'use client';

import { useState, useEffect } from 'react';
import { mediaConstraints } from '@/lib/webrtc-config';

export function useLocalStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Get available devices
  const getDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList);

      const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
      const videoInputs = deviceList.filter(d => d.kind === 'videoinput');

      if (audioInputs.length > 0 && !selectedMic) {
        setSelectedMic(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  };

  // Initialize stream when devices are selected
  useEffect(() => {
    getDevices();
  }, []); // Run once to get devices

  useEffect(() => {
    if (!selectedMic || !selectedCamera) return;

    let currentStream: MediaStream | null = null;
    let isMounted = true;

    const initStream = async () => {
      try {
        // Stop previous stream before creating new one
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            deviceId: { exact: selectedMic },
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            deviceId: { exact: selectedCamera },
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          // Component unmounted, stop tracks immediately
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        
        const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setError(message);
      }
    };

    void initStream();

    return () => {
      isMounted = false;
      // Clean up current stream
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      // Also clean up previous stream if exists
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedMic, selectedCamera, stream]);

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const switchMicrophone = (deviceId: string) => {
    setSelectedMic(deviceId);
  };

  const switchCamera = (deviceId: string) => {
    setSelectedCamera(deviceId);
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return {
    stream,
    audioEnabled,
    videoEnabled,
    devices,
    selectedMic,
    selectedCamera,
    error,
    toggleAudio,
    toggleVideo,
    switchMicrophone,
    switchCamera,
    stopStream,
  };
}
