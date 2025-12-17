'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { ICE_SERVERS_DEV } from '@video-call/types';

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
  const pendingOffersRef = useRef<Set<string>>(new Set()); // Track pending offers to prevent race conditions

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    pendingOffersRef.current.delete(peerId);
    
    window.dispatchEvent(new CustomEvent('remote-stream-removed', {
      detail: { peerId }
    }));
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS_DEV  // FREE!
    });

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
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamsRef.current.set(peerId, remoteStream);
        
        // Trigger re-render by dispatching custom event
        window.dispatchEvent(new CustomEvent('remote-stream-added', {
          detail: { peerId, stream: remoteStream }
        }));
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        closePeer(peerId);
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [localStream, socket, closePeer]);

  const createOffer = useCallback(async (peerId: string) => {
    // Prevent duplicate offers (race condition protection)
    if (pendingOffersRef.current.has(peerId)) {
      return;
    }

    try {
      pendingOffersRef.current.add(peerId);
      const pc = peersRef.current.get(peerId) || createPeerConnection(peerId);
      
      // Check if connection already exists and is stable
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        pendingOffersRef.current.delete(peerId);
        return;
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('offer', { to: peerId, offer });
      }
    } catch (error) {
      // Log error but don't expose to user unless critical
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error creating offer:', error);
      }
      pendingOffersRef.current.delete(peerId);
    }
  }, [createPeerConnection, socket]);

  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    try {
      let pc = peersRef.current.get(peerId);
      
      // Handle race condition: if we already have a connection, check its state
      if (pc) {
        // If we're in a state that can't accept an offer, create new connection
        if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer') {
          // Close existing connection and create new one
          pc.close();
          peersRef.current.delete(peerId);
          pc = createPeerConnection(peerId);
        }
      } else {
        pc = createPeerConnection(peerId);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socket) {
        socket.emit('answer', { to: peerId, answer });
      }
      
      pendingOffersRef.current.delete(peerId);
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error handling offer:', error);
      }
      pendingOffersRef.current.delete(peerId);
    }
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peersRef.current.get(peerId);
      if (pc && pc.signalingState !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error handling answer:', error);
      }
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
    pendingOffersRef.current.clear();
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
      if (!pendingOffersRef.current.has(data.participant.id)) {
        void createOffer(data.participant.id);
      }
    });

    socket.on('user-left', (data: { userId: string }) => {
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
