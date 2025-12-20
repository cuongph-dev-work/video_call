'use client';

import { create } from 'zustand';
import type { Participant } from '../types';
import type { WaitingUser } from '@video-call/types';

interface ParticipantWithQuality extends Participant {
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface RoomState {
  // Room info
  roomId: string | null;
  isJoined: boolean;
  isHost: boolean;

  // Participants - Map for O(1) lookup
  participants: Map<string, ParticipantWithQuality>;

  // Remote streams - Map for O(1) lookup
  remoteStreams: Map<string, MediaStream>;

  // UI state
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  showShortcutsHelp: boolean;

  // Waiting room
  waitingUsers: WaitingUser[];

  // Actions - Room
  setRoomId: (id: string) => void;
  setJoined: (joined: boolean) => void;
  setHost: (isHost: boolean) => void;
  reset: () => void;

  // Actions - Participants
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantState: (
    userId: string,
    state: Partial<ParticipantWithQuality>
  ) => void;
  setParticipants: (participants: Participant[]) => void;

  // Actions - Remote Streams
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;

  // Actions - UI
  toggleChat: () => void;
  toggleSettings: () => void;
  toggleShortcutsHelp: () => void;

  // Actions - Waiting Room
  addWaitingUser: (user: WaitingUser) => void;
  removeWaitingUser: (userId: string) => void;
  setWaitingUsers: (users: WaitingUser[]) => void;
}

const initialState = {
  roomId: null,
  isJoined: false,
  isHost: false,
  participants: new Map(),
  remoteStreams: new Map(),
  isChatOpen: false,
  isSettingsOpen: false,
  showShortcutsHelp: false,
  waitingUsers: [],
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  // Room actions
  setRoomId: (id) => set({ roomId: id }),
  setJoined: (joined) => set({ isJoined: joined }),
  setHost: (isHost) => set({ isHost }),
  reset: () => set(initialState),

  // Participant actions
  addParticipant: (participant) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.id, participant);
      return { participants: newParticipants };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(userId);
      return { participants: newParticipants };
    }),

  updateParticipantState: (userId, stateUpdate) =>
    set((state) => {
      const participant = state.participants.get(userId);
      if (!participant) return state;

      const newParticipants = new Map(state.participants);
      newParticipants.set(userId, { ...participant, ...stateUpdate });
      return { participants: newParticipants };
    }),

  setParticipants: (participants) =>
    set(() => {
      const participantsMap = new Map(
        participants.map((p) => [p.id, p])
      );
      return { participants: participantsMap };
    }),

  // Remote stream actions
  addRemoteStream: (userId, stream) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.set(userId, stream);
      return { remoteStreams: newStreams };
    }),

  removeRemoteStream: (userId) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.delete(userId);
      return { remoteStreams: newStreams };
    }),

  // UI actions
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleShortcutsHelp: () =>
    set((state) => ({ showShortcutsHelp: !state.showShortcutsHelp })),

  // Waiting room actions
  addWaitingUser: (user) =>
    set((state) => ({
      waitingUsers: [...state.waitingUsers, user],
    })),

  removeWaitingUser: (userId) =>
    set((state) => ({
      waitingUsers: state.waitingUsers.filter((u) => u.id !== userId),
    })),

  setWaitingUsers: (users) => set({ waitingUsers: users }),
}));

// Selectors for optimized subscriptions
export const selectParticipants = (state: RoomState) => state.participants;
export const selectParticipantsList = (state: RoomState) =>
  Array.from(state.participants.values());
export const selectRemoteStreams = (state: RoomState) => state.remoteStreams;
export const selectRemoteStreamsList = (state: RoomState) =>
  Array.from(state.remoteStreams.entries()).map(([id, stream]) => ({
    id,
    stream,
  }));
