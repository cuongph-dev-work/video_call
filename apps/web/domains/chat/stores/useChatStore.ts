'use client';

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isPrivate: boolean;
  recipientId?: string;
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  addMessage: (message: ChatMessage, incrementUnread?: boolean) => void;
  clearMessages: () => void;
  markAsRead: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unreadCount: 0,
  
  addMessage: (message, incrementUnread = true) =>
    set((state) => ({
      messages: [...state.messages, message],
      unreadCount: incrementUnread ? state.unreadCount + 1 : state.unreadCount,
    })),
  
  clearMessages: () =>
    set({ messages: [], unreadCount: 0 }),
  
  markAsRead: () =>
    set({ unreadCount: 0 }),
}));
