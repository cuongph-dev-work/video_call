'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocalStream } from '@/domains/media/hooks/useLocalStream';
import { usePeerConnection } from '@/shared/hooks/usePeerConnection';
import { useScreenShare } from '@/domains/media/hooks/useScreenShare';
import { useMediaRecorder } from '@/domains/media/hooks/useMediaRecorder';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useChatStore } from '@/domains/chat/stores/useChatStore';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { useSocket } from '@/shared/hooks/useSocket';

// New hooks
import { useRoomStore, selectParticipantsList, selectRemoteStreamsList } from '@/domains/room/stores/useRoomStore';
import { useRoomController } from '@/domains/room/hooks/useRoomController';
import { useRoomAccess } from '@/domains/room/hooks/useRoomAccess';

// Types
import { Participant } from '@/domains/room/types';

// Components
import { RoomHeader } from '@/domains/room/components/RoomHeader';
import { VideoSection } from '@/domains/room/components/VideoSection';
import { ControlBar } from '@/domains/room/components/ControlBar';
import { Sidebar } from '@/domains/room/components/Sidebar';
import { PreJoinScreen } from '@/domains/room/components/PreJoinScreen';
import { WaitingUsersNotification } from '@/shared/components/WaitingUsersNotification';
import { RecordingIndicator } from '@/domains/media/components/RecordingIndicator';
import { KeyboardShortcutsHelp } from '@/shared/components/KeyboardShortcutsHelp';
import { WaitingRoomScreen } from '@/domains/room/components/WaitingRoomScreen';
import { ConnectionStatus } from '@/shared/components/ConnectionStatus';
import { PasswordModal } from '@/shared/components/PasswordModal';
import { RoomNotFoundModal } from '@/shared/components/RoomNotFoundModal';
import { RejectionModal } from '@/shared/components/RejectionModal';
import { MobileChat } from '@/domains/chat/components/MobileChat';

const RoomSettingsModal = dynamic(
    () => import('@/domains/settings/components').then((mod) => mod.RoomSettingsModal),
    { ssr: false }
);

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { isMobile, isTablet } = useResponsive();

    // User preferences
    const userId = usePreferencesStore((state) => state.userId);
    const displayName = usePreferencesStore((state) => state.displayName);

    // Local media
    const {
        stream: localStream,
        audioEnabled,
        videoEnabled,
        devices,
        selectedMic,
        selectedCamera,
        selectedSpeaker,
        error: streamError,
        stopStream,
        switchMicrophone,
        switchCamera,
        switchSpeaker,
        toggleAudio,
        toggleVideo,
    } = useLocalStream();

    // Room state from centralized store (inline selectors to avoid infinite loop)
    const isJoined = useRoomStore((state) => state.isJoined);
    const isHost = useRoomStore((state) => state.isHost);
    const participantsMap = useRoomStore((state) => state.participants);
    const remoteStreamsMap = useRoomStore((state) => state.remoteStreams);
    const waitingUsers = useRoomStore((state) => state.waitingUsers);
    const isChatOpen = useRoomStore((state) => state.isChatOpen);
    const isSettingsOpen = useRoomStore((state) => state.isSettingsOpen);
    const showShortcutsHelp = useRoomStore((state) => state.showShortcutsHelp);
    const toggleChat = useRoomStore((state) => state.toggleChat);
    const toggleSettings = useRoomStore((state) => state.toggleSettings);
    const toggleShortcutsHelp = useRoomStore((state) => state.toggleShortcutsHelp);

    const { isConnected, reconnect, getSocket } = useSocket();

    const { isSharing, screenStream, startScreenShare, stopScreenShare } = useScreenShare(getSocket);

    // CRITICAL: Initialize controller FIRST so socket listeners are ready
    // This must happen BEFORE useRoomAccess auto-joins, otherwise we miss events!
    const controller = useRoomController(roomId, {
        toggleAudio,
        toggleVideo,
        audioEnabled,
        videoEnabled
    });

    // Chat store
    const messages = useChatStore((state) => state.messages);

    //Access & routing (this may auto-join, so controller must be ready)
    const {
        isCheckingHost,
        isInWaitingRoom,
        showRoomNotFound,
        showPasswordModal,
        passwordError,
        isValidatingPassword,
        showRejectionModal,
        rejectionMessage,
        permissions,
        setShowPasswordModal,
        setShowRejectionModal,
        handleJoin,
        handlePasswordSubmit,
    } = useRoomAccess(roomId);

    // Peer Connection
    usePeerConnection({
        localStream: isSharing ? screenStream : localStream,
        socket: getSocket(),
        roomId,
        userId,
        onRemoteStreamAdded: (peerId, stream) => {
            addRemoteStream(peerId, stream);
        },
        onRemoteStreamRemoved: (peerId) => {
            removeRemoteStream(peerId);
        },
    });

    // Recording
    const recordingStream = isSharing ? screenStream : localStream;
    const { isRecording, startRecording, stopRecording, formatDuration } =
        useMediaRecorder(recordingStream);

    // Convert Maps to arrays (memoized to avoid recreating)
    const participants = useMemo(
        () => Array.from(participantsMap.values()),
        [participantsMap]
    );

    const remoteStreamsList = useMemo(() => {
        return Array.from(remoteStreamsMap.entries()).map(([id, stream]) => ({ id, stream }));
    }, [remoteStreamsMap]);

    const hasJoinedRef = useRef(false);
    const controllerRef = useRef(controller);
    controllerRef.current = controller; // Always keep ref updated

    useEffect(() => {
        if (isJoined && userId && displayName && controller.isManagerReady && !hasJoinedRef.current) {
            hasJoinedRef.current = true;
            controllerRef.current.joinRoom();
        }
    }, [isJoined, userId, displayName, controller.isManagerReady]);

    // Get stream management functions from store (used in callbacks above)
    const addRemoteStream = useRoomStore((state) => state.addRemoteStream);
    const removeRemoteStream = useRoomStore((state) => state.removeRemoteStream);

    // Event handlers
    const handleToggleScreenShare = useCallback(async () => {
        if (isSharing) {
            stopScreenShare(roomId);
            controller.updateScreenShare(false);
        } else {
            await startScreenShare(roomId);
            controller.updateScreenShare(true);
        }
    }, [isSharing, stopScreenShare, roomId, startScreenShare, controller]);

    const handleEndCall = useCallback(() => {
        controller.leaveRoom();
        stopStream();
        if (isSharing) {
            stopScreenShare(roomId);
        }
        router.push('/');
    }, [controller, stopStream, isSharing, stopScreenShare, roomId, router]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onToggleMic: controller.toggleAudio,
        onToggleVideo: controller.toggleVideo,
        onToggleScreenShare: handleToggleScreenShare,
        onToggleRecording: isRecording ? stopRecording : startRecording,
        onEndCall: handleEndCall,
        onShowHelp: toggleShortcutsHelp,
        enabled: isJoined,
    });

    // Participants for sidebar (include local user)
    const participantsForSidebar: Participant[] = useMemo(() => {
        const localParticipant: Participant = {
            id: userId || 'local',
            displayName: displayName + ' (You)',
            audioEnabled,
            videoEnabled,
        };

        // Filter out self and deduplicate
        const uniqueRemote = participants.filter(
            (p, index, self) => p.id !== userId && self.findIndex((x) => x.id === p.id) === index
        );

        return [localParticipant, ...uniqueRemote];
    }, [userId, displayName, audioEnabled, videoEnabled, participants]);

    // Video participants for grid (first 4)
    const videoParticipants = useMemo(() => {
        const result = remoteStreamsList.slice(0, 4).map(({ id, stream }) => {
            const participant = participants.find((p) => p.id === id);
            return {
                id,
                stream,
                displayName: participant?.displayName || 'User',
                audioEnabled: participant?.audioEnabled ?? true,
                isActiveSpeaker: false,
            };
        });
        return result;
    }, [remoteStreamsList, participants]);

    // Cleanup waiting room on unmount
    useEffect(() => {
        return () => {
            if (isInWaitingRoom) {
                const socket = getSocket();
                if (socket?.connected) {
                    socket.emit('leave-waiting-room', { roomId });
                }
            }
        };
    }, [isInWaitingRoom, roomId, getSocket]);

    // Real-time clock for meeting info
    const [currentTime, setCurrentTime] = useState(new Date());
    const [roomName, setRoomName] = useState<string>('Meeting Room');

    // Fetch room name
    useEffect(() => {
        const fetchRoomName = async () => {
            try {
                const roomApi = await import('@/shared/api/room-api').then(m => m.roomApi);
                const settings = await roomApi.getSettings(roomId);
                if (settings.settings?.roomName) {
                    setRoomName(settings.settings.roomName);
                }
            } catch {
                // Keep default name
            }
        };

        if (isJoined) {
            void fetchRoomName();
        }
    }, [roomId, isJoined]);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    // Meeting info with real-time data
    const meetingInfo = useMemo(
        () => ({
            title: roomName,
            date: currentTime.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            }),
            time: currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }),
        [roomName, currentTime]
    );

    // Render logic
    if (showRoomNotFound) {
        return <RoomNotFoundModal isOpen={showRoomNotFound} />;
    }

    if (isCheckingHost) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0b0e11]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Đang tải phòng họp...</p>
                </div>
            </div>
        );
    }

    if (isInWaitingRoom) {
        const handleLeaveWaiting = () => {
            const socket = getSocket();
            if (socket?.connected) {
                socket.emit('leave-waiting-room', { roomId });
            }
            router.push('/');
        };
        return <WaitingRoomScreen roomId={roomId} displayName={displayName} onLeave={handleLeaveWaiting} />;
    }

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
                toggleAudio={controller.toggleAudio}
                toggleVideo={controller.toggleVideo}
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
                onOpenSettings={toggleSettings}
                onShowHelp={toggleShortcutsHelp}
            />

            {/* Recording Indicator */}
            {isRecording && <RecordingIndicator formatDuration={formatDuration} />}

            {/* Waiting Users Notification */}
            {waitingUsers.length > 0 && (
                <WaitingUsersNotification
                    waitingUsers={waitingUsers}
                    onAdmit={controller.admitUser}
                    onReject={controller.rejectUser}
                />
            )}

            <main className="flex-1 flex overflow-hidden relative px-6 pb-6 gap-6">
                {/* Video Section + Controls */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <VideoSection
                        mainSpeaker={{
                            stream: isSharing
                                ? (screenStream ?? undefined)
                                : videoEnabled
                                    ? (localStream ?? undefined)
                                    : undefined,
                            displayName: displayName + (isSharing ? ' (Screen)' : ''),
                            audioEnabled,
                        }}
                        participants={videoParticipants}
                        recordingTime={formatDuration()}
                        isRecording={isRecording}
                    />

                    <ControlBar
                        audioEnabled={audioEnabled}
                        videoEnabled={videoEnabled}
                        screenSharing={isSharing}
                        isHost={isHost}
                        permissions={permissions}
                        onToggleAudio={controller.toggleAudio}
                        onToggleVideo={controller.toggleVideo}
                        onToggleScreenShare={handleToggleScreenShare}
                        onToggleChat={isMobile ? toggleChat : undefined}
                        onEndCall={handleEndCall}
                    />
                </div>

                <Sidebar participants={participantsForSidebar} messages={messages} onSendMessage={controller.sendMessage} />
            </main>

            {/* Mobile Chat */}
            <MobileChat isOpen={isChatOpen} onClose={toggleChat} messages={messages} onSendMessage={controller.sendMessage} />

            {/* Room Settings Modal */}
            {isSettingsOpen && (
                <RoomSettingsModal isOpen={isSettingsOpen} onClose={toggleSettings} roomId={roomId} isHost={isHost} isJoined={isJoined} />
            )}

            {/* Keyboard Shortcuts Help */}
            {showShortcutsHelp && <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={toggleShortcutsHelp} />}

            {/* Connection Status Indicator */}
            <ConnectionStatus isConnected={isConnected} onRetry={reconnect} />

            {/* Password Modal */}
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSubmit={handlePasswordSubmit}
                error={passwordError}
                isValidating={isValidatingPassword}
            />

            {/* Rejection Modal */}
            <RejectionModal isOpen={showRejectionModal} message={rejectionMessage} onClose={() => setShowRejectionModal(false)} />
        </div>
    );
}
