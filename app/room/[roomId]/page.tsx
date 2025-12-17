'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSocket } from '@/shared/hooks/useSocket';
import { useLocalStream } from '@/domains/media/hooks/useLocalStream';
import { usePeerConnection } from '@/shared/hooks/usePeerConnection';
import { useScreenShare } from '@/domains/media/hooks/useScreenShare';
import { useMediaRecorder } from '@/domains/media/hooks/useMediaRecorder';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useChatStore } from '@/domains/chat/stores/useChatStore';

// New components
import { RoomHeader } from '@/domains/room/components/RoomHeader';
import { VideoSection } from '@/domains/room/components/VideoSection';
import { ControlBar } from '@/domains/room/components/ControlBar';
import { Sidebar } from '@/domains/room/components/Sidebar';
import { PreJoinScreen } from '@/domains/room/components/PreJoinScreen';
import { WaitingUsersNotification } from '@/shared/components/WaitingUsersNotification';
import { RecordingIndicator } from '@/domains/media/components/RecordingIndicator';
import { KeyboardShortcutsHelp } from '@/shared/components/KeyboardShortcutsHelp';
import type { WaitingUser } from '../../../../../packages/types/src/waiting-room';

// Lazy load RoomSettingsModal
const RoomSettingsModal = dynamic(
    () => import('@/domains/settings/components').then((mod) => mod.RoomSettingsModal),
    { ssr: false }
);

interface Participant {
    id: string;
    displayName: string;
    avatar?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    isScreenSharing?: boolean;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const [isJoined, setIsJoined] = useState(false);
    const [displayName, setDisplayName] = useState('');

    const { getSocket, isConnected } = useSocket();
    const {
        stream: localStream,
        audioEnabled,
        videoEnabled,
        devices,
        selectedMic,
        selectedCamera,
        selectedSpeaker,
        error: streamError,
        toggleAudio,
        toggleVideo,
        stopStream,
        switchMicrophone,
        switchCamera,
        switchSpeaker,
    } = useLocalStream();

    const { isSharing, screenStream, startScreenShare, stopScreenShare } = useScreenShare(getSocket);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { addMessage } = useChatStore();

    usePeerConnection({
        localStream: isSharing ? screenStream : localStream,
        socket: getSocket(),
        roomId,
    });

    const [remoteStreamsList, setRemoteStreamsList] = useState<Array<{ id: string; stream: MediaStream }>>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Recording - use combined stream (screen share or local)
    const recordingStream = isSharing ? screenStream : localStream;
    const {
        isRecording,
        duration: recordingDuration,
        startRecording,
        stopRecording,
        formatDuration,
    } = useMediaRecorder(recordingStream);

    // Track if already joined to prevent re-joining on HMR
    const hasJoinedRef = useRef(false);

    // Join room when socket connects (AND user has joined via UI)
    useEffect(() => {
        const socket = getSocket();
        if (socket && isConnected && roomId && !hasJoinedRef.current && isJoined && displayName) {
            hasJoinedRef.current = true;

            socket.emit('join-room', {
                roomId,
                displayName,
            });

            socket.on('room-joined', (data: { roomId: string; participants: Participant[] }) => {
                setParticipants(data.participants || []);
            });

            socket.on('user-joined', (data: { participant: Participant }) => {
                setParticipants(prev => {
                    // Prevent duplicates
                    if (prev.find(p => p.id === data.participant.id)) return prev;
                    return [...prev, data.participant];
                });
            });

            socket.on('user-left', (data: { userId: string }) => {
                setParticipants(prev => prev.filter(p => p.id !== data.userId));
            });

            socket.on('participant-audio-changed', (data: { userId: string; enabled: boolean }) => {
                setParticipants(prev =>
                    prev.map(p => (p.id === data.userId ? { ...p, audioEnabled: data.enabled } : p))
                );
            });

            socket.on('participant-video-changed', (data: { userId: string; enabled: boolean }) => {
                setParticipants(prev =>
                    prev.map(p => (p.id === data.userId ? { ...p, videoEnabled: data.enabled } : p))
                );
            });

            // Chat message listener
            socket.on('chat-message', (data: Message) => {
                setMessages(prev => [...prev, data]);
            });

            // Waiting room listeners
            socket.on('user-waiting', (data: { user: WaitingUser; waitingCount: number }) => {
                setWaitingUsers(prev => {
                    // Check if user already in list
                    if (prev.find(u => u.id === data.user.id)) return prev;
                    return [...prev, data.user];
                });
            });

            socket.on('waiting-count-updated', () => {
                // Get fresh list from server if count changed
                socket.emit('get-waiting-users', { roomId });
            });

            socket.on('waiting-users-list', (data: { roomId: string; users: WaitingUser[] }) => {
                setWaitingUsers(data.users);
            });
        }

        return () => {
            // Only remove listeners if we actually joined or if socket exists
            if (socket) {
                socket.off('room-joined');
                socket.off('user-joined');
                socket.off('user-left');
                socket.off('participant-audio-changed');
                socket.off('participant-video-changed');
                socket.off('chat-message');
                socket.off('user-waiting');
                socket.off('waiting-count-updated');
                socket.off('waiting-users-list');
            }
            // DON'T reset hasJoinedRef here - it causes re-join on HMR
            // The ref persists across re-renders to prevent duplicate joins
        };
    }, [getSocket, isConnected, roomId, displayName, isJoined]);

    // Listen for remote stream events
    useEffect(() => {
        const handleRemoteStreamAdded = (event: CustomEvent) => {
            const { peerId, stream } = event.detail;
            setRemoteStreamsList(prev => {
                const existing = prev.find(s => s.id === peerId);
                if (existing) return prev;
                return [...prev, { id: peerId, stream }];
            });
        };

        const handleRemoteStreamRemoved = (event: CustomEvent) => {
            const { peerId } = event.detail;
            setRemoteStreamsList(prev => prev.filter(s => s.id !== peerId));
        };

        window.addEventListener('remote-stream-added', handleRemoteStreamAdded as EventListener);
        window.addEventListener('remote-stream-removed', handleRemoteStreamRemoved as EventListener);

        return () => {
            window.removeEventListener('remote-stream-added', handleRemoteStreamAdded as EventListener);
            window.removeEventListener('remote-stream-removed', handleRemoteStreamRemoved as EventListener);
        };
    }, []);

    // Event handlers
    const handleEndCall = useCallback(() => {
        const socket = getSocket();
        if (socket && isJoined) {
            socket.emit('leave-room', { roomId });
        }
        stopStream();
        if (isSharing) {
            stopScreenShare(roomId);
        }
        router.push('/');
    }, [getSocket, roomId, stopStream, isSharing, stopScreenShare, router, isJoined]);

    const handleToggleAudio = useCallback(() => {
        toggleAudio();
        const socket = getSocket();
        if (socket) {
            socket.emit('toggle-audio', { roomId, enabled: !audioEnabled });
        }
    }, [toggleAudio, getSocket, roomId, audioEnabled]);

    const handleToggleVideo = useCallback(() => {
        toggleVideo();
        const socket = getSocket();
        if (socket) {
            socket.emit('toggle-video', { roomId, enabled: !videoEnabled });
        }
    }, [toggleVideo, getSocket, roomId, videoEnabled]);

    const handleToggleScreenShare = useCallback(async () => {
        if (isSharing) {
            stopScreenShare(roomId);
        } else {
            await startScreenShare(roomId);
        }
    }, [isSharing, stopScreenShare, roomId, startScreenShare]);

    const handleSendMessage = useCallback((content: string) => {
        const socket = getSocket();
        if (socket) {
            const message: Message = {
                id: Date.now().toString(),
                senderId: socket.id || 'unknown',
                senderName: displayName,
                content,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            socket.emit('chat-message', { roomId, message });
            setMessages(prev => [...prev, message]);
        }
    }, [getSocket, displayName, roomId]);

    // Waiting room handlers
    const handleAdmitUser = useCallback((userId: string) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('admit-user', { roomId, userId });
            // Remove from local state immediately for better UX
            setWaitingUsers(prev => prev.filter(u => u.id !== userId));
        }
    }, [getSocket, roomId]);

    const handleRejectUser = useCallback((userId: string) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('reject-user', { roomId, userId, reason: 'Access denied' });
            // Remove from local state immediately
            setWaitingUsers(prev => prev.filter(u => u.id !== userId));
        }
    }, [getSocket, roomId]);

    // PRE-JOIN HANDLER
    const handleJoin = (name: string) => {
        setDisplayName(name);
        setIsJoined(true);
    };

    // Keyboard shortcuts - must be after all handlers
    useKeyboardShortcuts({
        onToggleMic: handleToggleAudio,
        onToggleVideo: handleToggleVideo,
        onToggleScreenShare: handleToggleScreenShare,
        onToggleRecording: isRecording ? stopRecording : startRecording,
        onEndCall: handleEndCall,
        onShowHelp: () => setShowShortcutsHelp(prev => !prev),
        enabled: isJoined, // Only enable shortcuts when joined
    });

    // Prepare participants data for components (deduplicate)
    const participantsForSidebar: Participant[] = useMemo(() => {
        const socketId = getSocket()?.id || 'local';
        const localParticipant: Participant = {
            id: socketId,
            displayName: displayName + ' (You)',
            audioEnabled,
            videoEnabled,
        };

        // Filter out duplicates and self
        const uniqueRemote = participants.filter(
            (p, index, self) =>
                p.id !== socketId &&
                self.findIndex(x => x.id === p.id) === index
        );

        return [localParticipant, ...uniqueRemote];
    }, [getSocket, displayName, audioEnabled, videoEnabled, participants]);

    // Prepare video participants (only first 4 for thumbnails)
    const videoParticipants = useMemo(() => {
        return remoteStreamsList.slice(0, 4).map(({ id, stream }) => {
            const participant = participants.find(p => p.id === id);
            return {
                id,
                stream,
                displayName: participant?.displayName || 'User',
                audioEnabled: participant?.audioEnabled ?? true,
                isActiveSpeaker: false,
            };
        });
    }, [remoteStreamsList, participants]);

    // Mock meeting info
    const meetingInfo = useMemo(() => ({
        title: '[Internal] Weekly Meeting',
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }), []);

    if (!isJoined) {
        return (
            <PreJoinScreen
                roomId={roomId}
                onJoin={handleJoin}
                localStream={localStream}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                devices={devices}
                selectedMic={selectedMic}
                selectedCamera={selectedCamera}
                selectedSpeaker={selectedSpeaker}
                streamError={streamError}
                toggleAudio={toggleAudio}
                toggleVideo={toggleVideo}
                switchMicrophone={switchMicrophone}
                switchCamera={switchCamera}
                switchSpeaker={switchSpeaker}
            />
        );
    }

    return (
        <div className="bg-[#13161f] text-white font-sans overflow-hidden h-screen flex flex-col">
            <RoomHeader
                meetingTitle={meetingInfo.title}
                meetingDate={meetingInfo.date}
                meetingTime={meetingInfo.time}
                roomCode={roomId}
                participants={participantsForSidebar.slice(0, 5)}
                currentUser={{
                    displayName,
                    role: 'Host',
                }}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onShowHelp={() => setShowShortcutsHelp(true)}
            />

            {/* Recording Indicator */}
            {isRecording && (
                <RecordingIndicator
                    formatDuration={formatDuration}
                />
            )}

            {/* Waiting Users Notification */}
            {waitingUsers.length > 0 && (
                <WaitingUsersNotification
                    waitingUsers={waitingUsers}
                    onAdmit={handleAdmitUser}
                    onReject={handleRejectUser}
                />
            )}

            <main className="flex-1 flex overflow-hidden relative px-6 pb-6 gap-6">
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <VideoSection
                        mainSpeaker={{
                            stream: (isSharing ? screenStream : localStream) || undefined,
                            displayName: displayName + (isSharing ? ' (Screen)' : ''),
                        }}
                        participants={videoParticipants}
                        recordingTime={formatDuration()}
                        isRecording={isRecording}
                    />

                    <ControlBar
                        audioEnabled={audioEnabled}
                        videoEnabled={videoEnabled}
                        screenSharing={isSharing}
                        recording={isRecording}
                        onToggleAudio={handleToggleAudio}
                        onToggleVideo={handleToggleVideo}
                        onToggleScreenShare={handleToggleScreenShare}
                        onToggleRecording={() => {
                            if (isRecording) {
                                stopRecording();
                            } else {
                                startRecording();
                            }
                        }}
                        onEndCall={handleEndCall}
                    />
                </div>

                <Sidebar
                    participants={participantsForSidebar}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                />
            </main>

            {/* Room Settings Modal */}
            {isSettingsModalOpen && (
                <RoomSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    roomId={roomId}
                    participants={participantsForSidebar}
                />
            )}

            {/* Keyboard Shortcuts Help Modal */}
            <KeyboardShortcutsHelp
                isOpen={showShortcutsHelp}
                onClose={() => setShowShortcutsHelp(false)}
            />
        </div>
    );
}
