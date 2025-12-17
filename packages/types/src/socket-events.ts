// Socket.io Event Types
import { RTCOffer, RTCAnswer, ICECandidate } from './webrtc';
import { Participant } from './meeting';
import { ChatMessage } from './chat';

// Client to Server Events
export interface ClientToServerEvents {
  'join-room': (data: {
    roomId: string;
    displayName: string;
    password?: string;
  }) => void;

  'leave-room': (data: { roomId: string }) => void;

  offer: (data: { to: string; offer: RTCOffer }) => void;

  answer: (data: { to: string; answer: RTCAnswer }) => void;

  'ice-candidate': (data: { to: string; candidate: ICECandidate }) => void;

  'toggle-audio': (data: { roomId: string; enabled: boolean }) => void;

  'toggle-video': (data: { roomId: string; enabled: boolean }) => void;

  'screen-share-start': (data: { roomId: string }) => void;

  'screen-share-stop': (data: { roomId: string }) => void;

  'chat-message': (data: {
    roomId: string;
    content: string;
    isPrivate: boolean;
    recipientId?: string;
  }) => void;

  'raise-hand': (data: { roomId: string }) => void;

  'mute-participant': (data: { roomId: string; participantId: string }) => void;

  'remove-participant': (data: { roomId: string; participantId: string }) => void;

  'admit-user': (data: { roomId: string; userId: string }) => void;

  'reject-user': (data: { roomId: string; userId: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'room-joined': (data: {
    roomId: string;
    participants: Participant[];
  }) => void;

  'user-joined': (data: { participant: Participant }) => void;

  'user-left': (data: { userId: string }) => void;

  offer: (data: { from: string; offer: RTCOffer }) => void;

  answer: (data: { from: string; answer: RTCAnswer }) => void;

  'ice-candidate': (data: { from: string; candidate: ICECandidate }) => void;

  'participant-audio-changed': (data: {
    userId: string;
    enabled: boolean;
  }) => void;

  'participant-video-changed': (data: {
    userId: string;
    enabled: boolean;
  }) => void;

  'screen-share-started': (data: {
    userId: string;
    displayName: string;
  }) => void;

  'screen-share-stopped': (data: { userId: string }) => void;

  'chat-message': (data: ChatMessage) => void;

  'active-speaker-changed': (data: {
    userId: string;
    displayName: string;
  }) => void;

  'hand-raised': (data: { userId: string; displayName: string }) => void;

  'mute-request': (data: { fromHost: boolean }) => void;

  'removed-from-room': (data: { reason?: string }) => void;

  'user-waiting': (data: {
    userId: string;
    displayName: string;
    avatar?: string;
  }) => void;

  admitted: (data: { roomId: string }) => void;

  rejected: (data: { reason?: string }) => void;

  error: (data: { code: string; message: string }) => void;
}

// Socket Error Codes
export enum SocketErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  ROOM_FULL = 'ROOM_FULL',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_HOST = 'NOT_HOST',
  INVALID_PARTICIPANT = 'INVALID_PARTICIPANT',
}
