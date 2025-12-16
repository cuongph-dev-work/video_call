'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { rtcConfig } from '@/lib/webrtc-config';

interface UsePeerConnectionProps {
  localStream: MediaStream | null;
  socket: Socket | null;
  roomId: string;
}

interface Participant {
  id: string;
}

export function usePeerConnection({ localStream, socket }: UsePeerConnectionProps) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    
    window.dispatchEvent(new CustomEvent('remote-stream-removed', {
      detail: { peerId }
    }));
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('📥 Received remote track from', peerId);
      const [remoteStream] = event.streams;
      remoteStreamsRef.current.set(peerId, remoteStream);
      
      // Trigger re-render by dispatching custom event
      window.dispatchEvent(new CustomEvent('remote-stream-added', {
        detail: { peerId, stream: remoteStream }
      }));
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection with ${peerId}:`, pc.connectionState);
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closePeer(peerId);
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [localStream, socket, closePeer]);

  const createOffer = useCallback(async (peerId: string) => {
    try {
      const pc = peersRef.current.get(peerId) || createPeerConnection(peerId);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('offer', { to: peerId, offer });
      }
      
      console.log('📤 Sent offer to', peerId);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, socket]);

  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const pc = peersRef.current.get(peerId) || createPeerConnection(peerId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socket) {
        socket.emit('answer', { to: peerId, answer });
      }
      
      console.log('📤 Sent answer to', peerId);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('✅ Set remote description (answer) from', peerId);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('offer', (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      void handleOffer(data.from, data.offer);
    });

    socket.on('answer', (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      void handleAnswer(data.from, data.answer);
    });

    socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
      void handleIceCandidate(data.from, data.candidate);
    });

    socket.on('user-joined', (data: { participant: Participant }) => {
      // Create offer for new participant
      console.log('👤 User joined:', data.participant.id);
      void createOffer(data.participant.id);
    });

    socket.on('user-left', (data: { userId: string }) => {
      console.log('👋 User left:', data.userId);
      closePeer(data.userId);
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, createOffer, closePeer]);

  return {
    getPeers: () => peersRef.current,
    getRemoteStreams: () => remoteStreamsRef.current,
    createOffer,
    closeAllPeers,
  };
}
