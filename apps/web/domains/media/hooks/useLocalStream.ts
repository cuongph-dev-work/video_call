'use client';

import { useState, useEffect, useRef } from 'react';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';

export function useLocalStream() {
  // Get preferences from store
  const {
    selectedMic,
    selectedCamera,
    selectedSpeaker,
    audioEnabled,
    videoEnabled,
    setSelectedMic,
    setSelectedCamera,
    setSelectedSpeaker,
    setAudioEnabled,
    setVideoEnabled,
  } = usePreferencesStore();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize stream when devices are selected
  useEffect(() => {
    let isMounted = true;

    const initDevicesAndStream = async () => {
      try {
        // Get LATEST state from store (handles fast hydration)
        const currentStore = usePreferencesStore.getState();

        // First, request permissions to get actual device labels
        // Only request video if enabled to prevent camera flash on F5
        const permissionConstraints = {
          audio: true,
          video: currentStore.videoEnabled,
        };

        const permissionStream = await navigator.mediaDevices.getUserMedia(permissionConstraints);

        // Now enumerate devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        if (!isMounted) {
          permissionStream.getTracks().forEach(track => track.stop());
          return;
        }

        setDevices(deviceList);

        const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
        const videoInputs = deviceList.filter(d => d.kind === 'videoinput');
        const audioOutputs = deviceList.filter(d => d.kind === 'audiooutput');

        // Set default devices if not set in store
        const defaultMic = currentStore.selectedMic || (audioInputs.length > 0 ? audioInputs[0].deviceId : '');
        const defaultCamera = currentStore.selectedCamera || (videoInputs.length > 0 ? videoInputs[0].deviceId : '');
        const defaultSpeaker = currentStore.selectedSpeaker || (audioOutputs.length > 0 ? audioOutputs[0].deviceId : '');
        
        // Sync defaults to store if needed
        if (!currentStore.selectedMic && defaultMic) setSelectedMic(defaultMic);
        if (!currentStore.selectedCamera && defaultCamera) setSelectedCamera(defaultCamera);
        if (!currentStore.selectedSpeaker && defaultSpeaker) setSelectedSpeaker(defaultSpeaker);

        // Stop permission stream
        permissionStream.getTracks().forEach(track => track.stop());

        // Initialize actual stream
        // Note: We respect stored enabled states for initial constraints to avoid flash
        if (!defaultMic || !defaultCamera) {
          setError('No camera or microphone found');
          return;
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            deviceId: { exact: defaultMic },
          },
          video: currentStore.videoEnabled ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            deviceId: { exact: defaultCamera },
          } : false,
        };

        // If video is disabled, constraints.video is false.
        // getUserMedia must have at least one true.
        if (constraints.video === false && !constraints.audio) {
             // Should not happen as we always set audio constraint object
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        // Apply initial audio state
        mediaStream.getAudioTracks().forEach(track => {
            track.enabled = currentStore.audioEnabled;
        });

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

    void initDevicesAndStream();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync Audio State
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
    }
  }, [stream, audioEnabled]);

  // Sync Video State
  useEffect(() => {
    if (!streamRef.current) return;

    const handleVideoStateChange = async () => {
      const stream = streamRef.current;
      if (!stream) return;

      const hasVideoTrack = stream.getVideoTracks().length > 0;

      if (videoEnabled && !hasVideoTrack) {
        // Turn ON: Request new track
        try {
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

          stream.addTrack(newVideoTrack);
          
          // Trigger re-render
          const newStream = new MediaStream(stream.getTracks());
          streamRef.current = newStream;
          setStream(newStream);
          setError(null);
        } catch (err) {
            console.error('Failed to turn on camera:', err);
            setError('Failed to turn on camera');
            // Revert state if failed
            setVideoEnabled(false);
        }
      } else if (!videoEnabled && hasVideoTrack) {
        // Turn OFF: Stop tracks
        stream.getVideoTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });
        
        // Trigger re-render (to remove video element)
        const newStream = new MediaStream(stream.getTracks());
        streamRef.current = newStream;
        setStream(newStream);
      }
    };

    void handleVideoStateChange();
  }, [videoEnabled, selectedCamera, stream]); // Added stream to dependencies

  // Helper actions that just update the store
  const toggleAudio = () => setAudioEnabled(!audioEnabled);
  const toggleVideo = () => setVideoEnabled(!videoEnabled);

  const switchMicrophone = async (deviceId: string) => {
    if (!streamRef.current) return;
    try {
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: { exact: deviceId },
        },
      };

      const tempStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      const newAudioTrack = tempStream.getAudioTracks()[0];
      newAudioTrack.enabled = audioEnabled;

      const oldTracks = streamRef.current.getAudioTracks();
      oldTracks.forEach(track => {
        streamRef.current!.removeTrack(track);
        track.stop();
      });

      streamRef.current.addTrack(newAudioTrack);
      setSelectedMic(deviceId);
    } catch (err) {
      console.error('Failed to switch microphone:', err);
      setError('Failed to switch microphone');
    }
  };

  const switchCamera = async (deviceId: string) => {
     // Just update store, the Video Effect will handle re-negotiating if needed?
     // OR we handle it here explicitly if video is ON.
     if (!videoEnabled) {
         setSelectedCamera(deviceId);
         return;
     }
     
     // If video is ON, we need to swap tracks
     if (!streamRef.current) return;

    try {
      const videoConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          deviceId: { exact: deviceId },
        },
      };

      const tempStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      const newVideoTrack = tempStream.getVideoTracks()[0];
      
      const oldTracks = streamRef.current.getVideoTracks();
      oldTracks.forEach(track => {
        streamRef.current!.removeTrack(track);
        track.stop();
      });

      streamRef.current.addTrack(newVideoTrack);
      
      const newStream = new MediaStream(streamRef.current.getTracks());
      streamRef.current = newStream;
      setStream(newStream);
      setSelectedCamera(deviceId);
    } catch (err) {
      console.error('Failed to switch camera:', err);
      setError('Failed to switch camera');
    }
  };

  const switchSpeaker = async (deviceId: string, audioElement?: HTMLAudioElement | HTMLVideoElement) => {
    try {
      if (!audioElement || !('setSinkId' in HTMLMediaElement.prototype)) {
        console.warn('setSinkId is not supported in this browser');
        setError('Speaker switching not supported in this browser');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (audioElement as any).setSinkId(deviceId);
      setSelectedSpeaker(deviceId);
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
