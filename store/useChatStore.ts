'use client';

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isPrivate: boolean;
  recipientId?: string;
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  markAsRead: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unreadCount: 0,
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      unreadCount: state.unreadCount + 1,
    })),
  
  clearMessages: () =>
    set({ messages: [], unreadCount: 0 }),
  
  markAsRead: () =>
    set({ unreadCount: 0 }),
}));
