'use client';

import { useState, useEffect, useRef } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export function useLocalStream() {
  // Get preferences from store
  const {
    selectedMic: storedMic,
    selectedCamera: storedCamera,
    selectedSpeaker: storedSpeaker,
    audioEnabled: storedAudioEnabled,
    videoEnabled: storedVideoEnabled,
    setSelectedMic: updateStoredMic,
    setSelectedCamera: updateStoredCamera,
    setSelectedSpeaker: updateStoredSpeaker,
    setAudioEnabled: updateStoredAudioEnabled,
    setVideoEnabled: updateStoredVideoEnabled,
  } = usePreferencesStore();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use store values with local state fallback
  const [selectedMic, setSelectedMic] = useState<string>(storedMic);
  const [selectedCamera, setSelectedCamera] = useState<string>(storedCamera);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>(storedSpeaker);
  const [audioEnabled, setAudioEnabled] = useState(storedAudioEnabled);
  const [videoEnabled, setVideoEnabled] = useState(storedVideoEnabled);

  // Initialize stream when devices are selected
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
        const videoInputs = deviceList.filter(d => d.kind === 'videoinput');
        const audioOutputs = deviceList.filter(d => d.kind === 'audiooutput');

        // Set default devices: use stored values or first available
        const defaultMic = storedMic || (audioInputs.length > 0 ? audioInputs[0].deviceId : '');
        const defaultCamera = storedCamera || (videoInputs.length > 0 ? videoInputs[0].deviceId : '');
        const defaultSpeaker = storedSpeaker || (audioOutputs.length > 0 ? audioOutputs[0].deviceId : '');
        
        setSelectedMic(defaultMic);
        setSelectedCamera(defaultCamera);
        setSelectedSpeaker(defaultSpeaker);
        
        // Update store with defaults if not set
        if (!storedMic && defaultMic) updateStoredMic(defaultMic);
        if (!storedCamera && defaultCamera) updateStoredCamera(defaultCamera);
        if (!storedSpeaker && defaultSpeaker) updateStoredSpeaker(defaultSpeaker);
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    };

    void getDevices();
  }, []); // Run once on mount to get devices

  useEffect(() => {
    if (!selectedMic || !selectedCamera) return;

    let isMounted = true;

    const initStream = async () => {
      try {
        // Stop previous stream before creating new one
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
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

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        
        console.error('Failed to get media stream:', err);
        const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setError(message);
      }
    };

    void initStream();

    return () => {
      isMounted = false;
      // Clean up stream from ref
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [selectedMic, selectedCamera]); // FIXED: Added dependencies so stream initializes when devices are set

  const toggleAudio = () => {
    if (stream) {
      const newState = !audioEnabled;
      stream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setAudioEnabled(newState);
      updateStoredAudioEnabled(newState); // Persist to store
    }
  };

  const toggleVideo = async () => {
    if (!stream) return;

    const currentlyEnabled = videoEnabled;
    
    if (currentlyEnabled) {
      // Turning OFF: Stop video tracks completely to turn off camera LED
      stream.getVideoTracks().forEach(track => {
        track.stop(); // Stop track completely (turns off camera LED)
      });
      
      // Remove video tracks from stream
      stream.getVideoTracks().forEach(track => {
        stream.removeTrack(track);
      });
      
      setVideoEnabled(false);
      updateStoredVideoEnabled(false); // Persist to store
    } else {
      // Turning ON: Request new video track
      try {
        // Request video track with selected device
        const videoConstraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          },
        };

        const tempStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        const newVideoTrack = tempStream.getVideoTracks()[0];

        // Add new video track to current stream
        if (streamRef.current) {
          streamRef.current.addTrack(newVideoTrack);
          
          // Create new stream to trigger video element update
          const newStream = new MediaStream(streamRef.current.getTracks());
          streamRef.current = newStream;
          setStream(newStream);
        }

        setVideoEnabled(true);
        updateStoredVideoEnabled(true); // Persist to store
        setError(null);
      } catch (err) {
        console.error('Failed to restart camera:', err);
        setError('Failed to turn on camera');
      }
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (!streamRef.current) return;

    try {
      // Get new audio track with selected device
      const audioConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: { exact: deviceId },
        },
      };

      const tempStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      const newAudioTrack = tempStream.getAudioTracks()[0];
      
      // Set enabled state to match current state
      newAudioTrack.enabled = audioEnabled;

      // Remove old audio track from current stream
      const oldAudioTracks = streamRef.current.getAudioTracks();
      oldAudioTracks.forEach(track => {
        streamRef.current!.removeTrack(track);
        track.stop();
      });

      // Add new audio track to current stream  
      streamRef.current.addTrack(newAudioTrack);
      
      // Update local and store state
      setSelectedMic(deviceId);
      updateStoredMic(deviceId); // Persist to store
    } catch (err) {
      console.error('Failed to switch microphone:', err);
      setError('Failed to switch microphone');
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!streamRef.current) return;

    try {
      // Get new video track with selected device
      const videoConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          deviceId: { exact: deviceId },
        },
      };

      const tempStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      const newVideoTrack = tempStream.getVideoTracks()[0];
      
      // Set enabled state to match current state  
      newVideoTrack.enabled = videoEnabled;

      // Remove old video track from current stream
      const oldVideoTracks = streamRef.current.getVideoTracks();
      oldVideoTracks.forEach(track => {
        streamRef.current!.removeTrack(track);
        track.stop();
      });

      // Add new video track to current stream
      streamRef.current.addTrack(newVideoTrack);
      
      // For camera switch, create new stream to trigger video element update
      const newStream = new MediaStream(streamRef.current.getTracks());
      streamRef.current = newStream;
      setStream(newStream); // This triggers re-render for camera preview
      setSelectedCamera(deviceId);
      updateStoredCamera(deviceId); // Persist to store
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError('Failed to switch camera');
    }
  };

  const switchSpeaker = async (deviceId: string, audioElement?: HTMLAudioElement | HTMLVideoElement) => {
    try {
      // Check if browser supports setSinkId
      if (!audioElement || !('setSinkId' in HTMLMediaElement.prototype)) {
        console.warn('setSinkId is not supported in this browser');
        setError('Speaker switching not supported in this browser');
        return;
      }

      // Type assertion for setSinkId (not in standard TypeScript types yet)
      await (audioElement as any).setSinkId(deviceId);
      setSelectedSpeaker(deviceId);
      updateStoredSpeaker(deviceId); // Persist to store
    } catch (err) {
      console.error('Failed to switch speaker:', err);
      setError('Failed to switch speaker');
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
    selectedSpeaker,
    error,
    toggleAudio,
    toggleVideo,
    switchMicrophone,
    switchCamera,
    switchSpeaker,
    stopStream,
  };
}
