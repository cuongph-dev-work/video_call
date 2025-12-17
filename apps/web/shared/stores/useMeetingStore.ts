'use client';

import { create } from 'zustand';

interface Participant {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
}

interface MeetingStore {
  // Room state
  currentRoom: string | null;
  isInMeeting: boolean;
  
  // Participants
  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  
  // Media state
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  
  // UI state
  isChatOpen: boolean;
  isParticipantPanelOpen: boolean;
  activeSpeakerId: string | null;
  
  // Actions
  setRoom: (roomId: string) => void;
  leaveRoom: () => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  setLocalParticipant: (participant: Participant) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  toggleChat: () => void;
  toggleParticipantPanel: () => void;
  setActiveSpeaker: (userId: string | null) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  // Initial state
  currentRoom: null,
  isInMeeting: false,
  participants: new Map(),
  localParticipant: null,
  localStream: null,
  remoteStreams: new Map(),
  isChatOpen: false,
  isParticipantPanelOpen: false,
  activeSpeakerId: null,

  // Actions
  setRoom: (roomId) => set({ currentRoom: roomId, isInMeeting: true }),
  
  leaveRoom: () => set({
    currentRoom: null,
    isInMeeting: false,
    participants: new Map(),
    remoteStreams: new Map(),
  }),

  addParticipant: (participant) => set((state) => {
    const newParticipants = new Map(state.participants);
    newParticipants.set(participant.id, participant);
    return { participants: newParticipants };
  }),

  removeParticipant: (userId) => set((state) => {
    const newParticipants = new Map(state.participants);
    newParticipants.delete(userId);
    return { participants: newParticipants };
  }),

  updateParticipant: (userId, updates) => set((state) => {
    const participant = state.participants.get(userId);
    if (participant) {
      const newParticipants = new Map(state.participants);
      newParticipants.set(userId, { ...participant, ...updates });
      return { participants: newParticipants };
    }
    return state;
  }),

  setLocalParticipant: (participant) => set({ localParticipant: participant }),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (userId, stream) => set((state) => {
    const newStreams = new Map(state.remoteStreams);
    newStreams.set(userId, stream);
    return { remoteStreams: newStreams };
  }),

  removeRemoteStream: (userId) => set((state) => {
    const newStreams = new Map(state.remoteStreams);
    newStreams.delete(userId);
    return { remoteStreams: newStreams };
  }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  toggleParticipantPanel: () => set((state) => ({
    isParticipantPanelOpen: !state.isParticipantPanelOpen,
  })),

  setActiveSpeaker: (userId) => set({ activeSpeakerId: userId }),

  reset: () => set({
    currentRoom: null,
    isInMeeting: false,
    participants: new Map(),
    localParticipant: null,
    localStream: null,
    remoteStreams: new Map(),
    isChatOpen: false,
    isParticipantPanelOpen: false,
    activeSpeakerId: null,
  }),
}));
