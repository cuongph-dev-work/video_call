'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PreferencesState {
  // User preferences
  userId: string;
  displayName: string;
  selectedMic: string;
  selectedCamera: string;
  selectedSpeaker: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  
  // Media settings
  videoQuality: 'auto' | '360p' | '720p' | '1080p';
  mirrorVideo: boolean;
  
  // Room admission tracking
  admittedRooms: Record<string, { roomId: string; admittedAt: number }>;
}

interface PreferencesActions {
  setDisplayName: (name: string) => void;
  setSelectedMic: (deviceId: string) => void;
  setSelectedCamera: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  
  // Media settings actions
  setVideoQuality: (quality: 'auto' | '360p' | '720p' | '1080p') => void;
  setMirrorVideo: (enabled: boolean) => void;
  
  // Room admission actions
  markRoomAsAdmitted: (roomId: string) => void;
  isAdmittedToRoom: (roomId: string) => boolean;
  clearAdmittedRoom: (roomId: string) => void;
  
  reset: () => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

const initialState: PreferencesState = {
  userId: '',
  displayName: '',
  selectedMic: '',
  selectedCamera: '',
  selectedSpeaker: '',
  audioEnabled: true,
  videoEnabled: true,
  
  // Media settings defaults
  videoQuality: 'auto',
  mirrorVideo: true,
  
  // Room admission defaults
  admittedRooms: {},
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      setDisplayName: (name) => set({ displayName: name }),
      setSelectedMic: (deviceId) => set({ selectedMic: deviceId }),
      setSelectedCamera: (deviceId) => set({ selectedCamera: deviceId }),
      setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setVideoEnabled: (enabled) => set({ videoEnabled: enabled }),
      
      // Media settings actions
      setVideoQuality: (quality) => set({ videoQuality: quality }),
      setMirrorVideo: (enabled) => set({ mirrorVideo: enabled }),
      
      // Room admission actions
      markRoomAsAdmitted: (roomId) => set((state) => ({
        admittedRooms: {
          ...state.admittedRooms,
          [roomId]: { roomId, admittedAt: Date.now() },
        },
      })),
      
      isAdmittedToRoom: (roomId) => {
        const state = get();
        return !!state.admittedRooms[roomId];
      },
      
      clearAdmittedRoom: (roomId) => set((state) => {
        const { [roomId]: _, ...rest } = state.admittedRooms;
        return { admittedRooms: rest };
      }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      // Migration function to handle old localStorage keys
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // Generate userId if not exists
          if (!state.userId) {
            state.userId = crypto.randomUUID();
          }

          // Migrate from old localStorage keys if they exist
          const oldUsername = localStorage.getItem('username');
          const oldDisplayName = localStorage.getItem('displayName');
          
          // Use old values if store is empty
          if (!state.displayName && (oldUsername || oldDisplayName)) {
            state.displayName = oldUsername || oldDisplayName || '';
          }
        }
      },
    }
  )
);
