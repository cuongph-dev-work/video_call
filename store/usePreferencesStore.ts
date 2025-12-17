'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PreferencesState {
  // User preferences
  displayName: string;
  selectedMic: string;
  selectedCamera: string;
  selectedSpeaker: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface PreferencesActions {
  setDisplayName: (name: string) => void;
  setSelectedMic: (deviceId: string) => void;
  setSelectedCamera: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  reset: () => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

const initialState: PreferencesState = {
  displayName: '',
  selectedMic: '',
  selectedCamera: '',
  selectedSpeaker: '',
  audioEnabled: true,
  videoEnabled: true,
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setDisplayName: (name) => set({ displayName: name }),
      setSelectedMic: (deviceId) => set({ selectedMic: deviceId }),
      setSelectedCamera: (deviceId) => set({ selectedCamera: deviceId }),
      setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setVideoEnabled: (enabled) => set({ videoEnabled: enabled }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      // Migration function to handle old localStorage keys
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
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
