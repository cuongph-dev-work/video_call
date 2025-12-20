'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { ICE_SERVERS_DEV } from '@video-call/types';

interface UsePeerConnectionProps {
  localStream: MediaStream | null;
  socket: Socket | null;
  roomId: string;
  userId: string | null;
}

interface Participant {
  id: string;
  displayName?: string;
}

export function usePeerConnection({ localStream, socket, userId }: UsePeerConnectionProps) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const pendingOffersRef = useRef<Set<string>>(new Set()); // Track pending offers to prevent race conditions
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map()); // Queue ICE candidates until remote description is set

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    pendingOffersRef.current.delete(peerId);
    pendingIceCandidatesRef.current.delete(peerId);
    
    window.dispatchEvent(new CustomEvent('remote-stream-removed', {
      detail: { peerId }
    }));
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS_DEV
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
      console.log('🎥 ontrack fired for peer:', peerId);
      console.log('   Streams:', event.streams.length);
      
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log('   Remote stream tracks:', remoteStream.getTracks().length);
        remoteStreamsRef.current.set(peerId, remoteStream);
        
        // Trigger re-render by dispatching custom event
        window.dispatchEvent(new CustomEvent('remote-stream-added', {
          detail: { peerId, stream: remoteStream }
        }));
        console.log('   ✅ Dispatched remote-stream-added event');
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('🔗 Connection state for', peerId, ':', state);
      
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        closePeer(peerId);
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [localStream, socket, closePeer]);

  const createOffer = useCallback(async (peerId: string) => {
    console.log('📤 Creating offer for peer:', peerId);
    
    // Prevent duplicate offers (race condition protection)
    if (pendingOffersRef.current.has(peerId)) {
      console.log('   ⚠️ Offer already pending, skipping');
      return;
    }

    try {
      pendingOffersRef.current.add(peerId);
      const pc = peersRef.current.get(peerId) || createPeerConnection(peerId);
      
      // Check if connection already exists and is stable
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.log('   ⚠️ Invalid signaling state:', pc.signalingState);
        pendingOffersRef.current.delete(peerId);
        return;
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('   ✅ Offer created and set as local description');
      
      if (socket) {
        socket.emit('offer', { to: peerId, offer });
        console.log('   ✅ Offer sent to peer');
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error creating offer:', error);
      }
      pendingOffersRef.current.delete(peerId);
    }
  }, [createPeerConnection, socket]);

  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    console.log('📨 Received offer from peer:', peerId);
    
    try {
      let pc = peersRef.current.get(peerId);
      
      // Handle race condition: if we already have a connection, check its state
      if (pc) {
        console.log('   Existing peer connection state:', pc.signalingState);
        
        // If in wrong state, close and recreate
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          console.log('   Closing existing connection in bad state');
          pc.close();
          peersRef.current.delete(peerId);
          pc = createPeerConnection(peerId);
        } else if (pc.signalingState === 'have-local-offer') {
          // We sent an offer, they sent an offer - glare situation
          // Use tie-breaker: close if our ID is lower
          const shouldClose = userId && peerId && userId < peerId;
          if (shouldClose) {
            console.log('   Glare detected, closing our connection (tie-breaker)');
            pc.close();
            peersRef.current.delete(peerId);
            pc = createPeerConnection(peerId);
          } else {
            console.log('   Glare detected, ignoring their offer (tie-breaker)');
            return;
          }
        }
      } else {
        console.log('   Creating new peer connection for offer');
        pc = createPeerConnection(peerId);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('   ✅ Remote description set (offer)');
      
      // Process any queued ICE candidates now that remote description is set
      const queuedCandidates = pendingIceCandidatesRef.current.get(peerId) || [];
      console.log('   Processing', queuedCandidates.length, 'queued ICE candidates');
      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Silently ignore OperationErrors - not critical
          if (err instanceof Error && err.name !== 'OperationError') {
            console.error('Error adding queued ICE candidate:', err);
          }
        }
      }
      pendingIceCandidatesRef.current.delete(peerId);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('   ✅ Answer created and set as local description');
      
      if (socket) {
        socket.emit('answer', { to: peerId, answer });
        console.log('   ✅ Answer sent to peer');
      }
      
      pendingOffersRef.current.delete(peerId);
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error handling offer:', error);
      }
      pendingOffersRef.current.delete(peerId);
    }
  }, [createPeerConnection, socket, userId]);

  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    console.log('📨 Received answer from peer:', peerId);
    
    try {
      const pc = peersRef.current.get(peerId);
      if (!pc) {
        console.warn('   ⚠️ No peer connection found');
        return;
      }
      
      if (pc.signalingState === 'closed') {
        console.warn('   ⚠️ Connection closed');
        return;
      }
      
      // Check if we're in the right state to accept an answer
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`   ⚠️ Wrong state for answer: ${pc.signalingState}`);
        
        // If we're in have-remote-offer, we need to rollback
        if (pc.signalingState === 'have-remote-offer') {
          console.log('   🔄 Rolling back to stable state');
          await pc.setLocalDescription({ type: 'rollback' });
        } else {
          // Not in a state where we can accept answer, skip it
          return;
        }
      }
      
      console.log('   Peer connection state:', pc.signalingState);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('   ✅ Remote description set (answer)');
      
      // Process any queued ICE candidates
      const queuedCandidates = pendingIceCandidatesRef.current.get(peerId) || [];
      console.log('   Processing', queuedCandidates.length, 'queued ICE candidates');
      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Silently ignore OperationErrors - not critical
          if (err instanceof Error && err.name !== 'OperationError') {
            console.error('Error adding queued ICE candidate:', err);
          }
        }
      }
      pendingIceCandidatesRef.current.delete(peerId);
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error handling answer:', error);
      }
    }
  }, []);

  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peersRef.current.get(peerId);
      
      if (!pc) {
        console.warn('⚠️ No peer connection for ICE candidate from:', peerId);
        return;
      }
      
      // Check if remote description is set
      if (!pc.remoteDescription) {
        console.log('⏳ Queuing ICE candidate (no remote description yet)');
        
        // Queue the candidate
        const queue = pendingIceCandidatesRef.current.get(peerId) || [];
        queue.push(candidate);
        pendingIceCandidatesRef.current.set(peerId, queue);
        return;
      }
      
      // Remote description is set, add candidate immediately
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      // Silently handle errors - ICE candidates failures are not critical
      if (error instanceof Error && error.name !== 'OperationError') {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingOffersRef.current.clear();
    pendingIceCandidatesRef.current.clear();
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

    // When we join a room, create offers for all existing participants
    socket.on('room-joined', (data: { roomId: string; participants: Participant[] }) => {
      data.participants.forEach((participant) => {
        if (participant.id !== userId && !pendingOffersRef.current.has(participant.id)) {
          void createOffer(participant.id);
        }
      });
    });

    // When a new participant joins (for users already in room)
    socket.on('user-joined', (data: { participant: Participant }) => {
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
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, createOffer, closePeer, userId]);

  // CRITICAL: Renegotiate when local stream becomes available
  useEffect(() => {
    if (!localStream || peersRef.current.size === 0) return;

    console.log('🔄 Local stream now available, checking existing peer connections...');
    
    // For each existing peer connection
    peersRef.current.forEach(async (pc, peerId) => {
      const senders = pc.getSenders();
      const hasAnyTracks = senders.some(sender => sender.track !== null);
      
      if (!hasAnyTracks) {
        console.log('   Adding tracks to existing peer:', peerId);
        
        // Add all local tracks
        localStream.getTracks().forEach(track => {
          console.log('     Adding track:', track.kind, track.enabled);
          pc.addTrack(track, localStream);
        });
        
        // Renegotiate
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          if (socket) {
            socket.emit('offer', { to: peerId, offer });
            console.log('   ✅ Renegotiation offer sent to:', peerId);
          }
        } catch (error) {
          console.error('   ❌ Error renegotiating:', error);
        }
      }
    });
  }, [localStream, socket]);

  // CRITICAL: Renegotiate when track states change (enabled/disabled) OR tracks added/removed
  const previousTrackCountRef = useRef<number>(0);
  const trackStatesRef = useRef<Map<string, boolean>>(new Map());
  
  useEffect(() => {
    if (!localStream || peersRef.current.size === 0) return;

    console.log('👀 Monitoring track changes...');

    // Initialize refs if needed
    if (previousTrackCountRef.current === 0) {
      previousTrackCountRef.current = localStream.getTracks().length;
      trackStatesRef.current.clear();
      localStream.getTracks().forEach(track => {
        trackStatesRef.current.set(track.id, track.enabled);
      });
    }

    let renegotiationTimeout: NodeJS.Timeout | null = null;
    
    // Debounced renegotiation function
    const scheduleRenegotiation = () => {
      if (renegotiationTimeout) {
        clearTimeout(renegotiationTimeout);
      }
      
      renegotiationTimeout = setTimeout(async () => {
        console.log('🔄 Tracks changed, renegotiating with all peers...');
        
        const currentTracks = localStream.getTracks();
        
        // Update senders first
        for (const [peerId, pc] of peersRef.current.entries()) {
          try {
            // Skip if not in stable state
            if (pc.signalingState !== 'stable') {
              console.warn(`   ⚠️ Skipping ${peerId} - not in stable state:`, pc.signalingState);
              continue;
            }
            
            // Get current senders
            const senders = pc.getSenders();
            const currentVideoSender = senders.find(s => s.track?.kind === 'video');
            const currentAudioSender = senders.find(s => s.track?.kind === 'audio');
            
            const newVideoTrack = currentTracks.find(t => t.kind === 'video');
            const newAudioTrack = currentTracks.find(t => t.kind === 'audio');
            
            // Replace or add video track
            if (currentVideoSender && newVideoTrack) {
              await currentVideoSender.replaceTrack(newVideoTrack);
              console.log('   ✅ Replaced video track for:', peerId);
            } else if (!currentVideoSender && newVideoTrack) {
              pc.addTrack(newVideoTrack, localStream);
              console.log('   ✅ Added video track for:', peerId);
            } else if (currentVideoSender && !newVideoTrack) {
              pc.removeTrack(currentVideoSender);
              console.log('   ✅ Removed video track for:', peerId);
            }
            
            // Replace or add audio track
            if (currentAudioSender && newAudioTrack) {
              await currentAudioSender.replaceTrack(newAudioTrack);
            } else if (!currentAudioSender && newAudioTrack) {
              pc.addTrack(newAudioTrack, localStream);
            }
            
            // Renegotiate
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            if (socket) {
              socket.emit('offer', { to: peerId, offer });
              console.log('   ✅ Renegotiation offer sent to:', peerId);
            }
          } catch (error) {
            console.error('   ❌ Error renegotiating with', peerId, ':', error);
          }
        }
      }, 200); // Debounce 200ms
    };

    // Check track states AND count periodically
    const checkTracks = () => {
      const currentTracks = localStream.getTracks();
      const currentTrackCount = currentTracks.length;
      let hasChanges = false;
      
      // Check if track count changed (track added/removed)
      if (currentTrackCount !== previousTrackCountRef.current) {
        console.log(`   Track count changed:`, previousTrackCountRef.current, '→', currentTrackCount);
        previousTrackCountRef.current = currentTrackCount;
        hasChanges = true;
        
        // Update track states map
        trackStatesRef.current.clear();
        currentTracks.forEach(track => {
          trackStatesRef.current.set(track.id, track.enabled);
        });
      } else {
        // Check if existing track enabled states changed
        currentTracks.forEach(track => {
          const previousState = trackStatesRef.current.get(track.id);
          if (previousState !== track.enabled) {
            console.log(`   Track ${track.kind} enabled state changed:`, previousState, '→', track.enabled);
            trackStatesRef.current.set(track.id, track.enabled);
            hasChanges = true;
          }
        });
      }

      // Schedule renegotiation if tracks changed
      if (hasChanges) {
        scheduleRenegotiation();
      }
    };

    const interval = setInterval(checkTracks, 300);
    return () => {
      clearInterval(interval);
      if (renegotiationTimeout) {
        clearTimeout(renegotiationTimeout);
      }
    };
  }, [localStream, socket]);

  return {
    getPeers: () => peersRef.current,
    getRemoteStreams: () => remoteStreamsRef.current,
    createOffer,
    closeAllPeers,
  };
}
