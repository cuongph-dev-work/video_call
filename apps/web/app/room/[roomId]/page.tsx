'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSocket } from '@/shared/hooks/useSocket';
import { useLocalStream } from '@/domains/media/hooks/useLocalStream';
import { usePeerConnection } from '@/shared/hooks/usePeerConnection';
import { useScreenShare } from '@/domains/media/hooks/useScreenShare';
import { useMediaRecorder } from '@/domains/media/hooks/useMediaRecorder';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useChatStore } from '@/domains/chat/stores/useChatStore';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';
import { useResponsive } from '@/shared/hooks/useResponsive';

// Hooks
import { useRoomAccess } from '@/domains/room/hooks/useRoomAccess';
import { useRoomEvents } from '@/domains/room/hooks/useRoomEvents';
import { useRemoteStreams } from '@/domains/room/hooks/useRemoteStreams';
import { useParticipantSync } from '@/domains/room/hooks/useParticipantSync';

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
import { MobileChat } from '@/domains/chat/components/MobileChat';

const RoomSettingsModal = dynamic(
    () => import('@/domains/settings/components').then((mod) => mod.RoomSettingsModal),
    { ssr: false }
);

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { isMobile } = useResponsive();

    // Store
    const { messages: storeMessages } = useChatStore();
    const userId = usePreferencesStore(state => state.userId);

    // Socket & Media
    const { getSocket, isConnected, reconnect } = useSocket();
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

    // UI State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Custom Hooks
    const {
        isJoined,
        displayName,
        isCheckingHost,
        isInWaitingRoom,
        isHost,
        permissions,
        showRoomNotFound,
        showPasswordModal,
        passwordError,
        isValidatingPassword,
        setShowPasswordModal,
        handleJoin,
        handlePasswordSubmit
    } = useRoomAccess(roomId);

    const { remoteStreamsList } = useRemoteStreams();

    const {
        participants,
        waitingUsers,
        handleSendMessage,
        handleAdmitUser,
        handleRejectUser
    } = useRoomEvents({
        roomId,
        isJoined,
        displayName,
        userId: userId || '',
        isMobile,
        isChatOpen,
        audioEnabled,
        videoEnabled,
    });

    // Peer Connection
    usePeerConnection({
        localStream: isSharing ? screenStream : localStream,
        socket: getSocket(),
        roomId,
    });

    // Recording - use combined stream (screen share or local)
    const recordingStream = isSharing ? screenStream : localStream;
    const {
        isRecording,
        startRecording,
        stopRecording,
        formatDuration,
    } = useMediaRecorder(recordingStream);

    // Participant sync - emit state changes to other participants
    const { updateAudio, updateVideo, updateScreenShare } = useParticipantSync({
        roomId,
        isJoined,
        onStateChanged: (userId, state) => {
            // State changes are handled by useRoomEvents
            console.log('Participant state changed:', userId, state);
        },
    });

    // Event handlers wrapping socket emissions (UI actions)
    const handleToggleAudio = useCallback(() => {
        toggleAudio();
        updateAudio(!audioEnabled);
    }, [toggleAudio, updateAudio, audioEnabled]);

    const handleToggleVideo = useCallback(() => {
        toggleVideo();
        updateVideo(!videoEnabled);
    }, [toggleVideo, updateVideo, videoEnabled]);

    const handleToggleScreenShare = useCallback(async () => {
        if (isSharing) {
            stopScreenShare(roomId);
            updateScreenShare(false);
        } else {
            await startScreenShare(roomId);
            updateScreenShare(true);
        }
    }, [isSharing, stopScreenShare, roomId, startScreenShare, updateScreenShare]);

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

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onToggleMic: handleToggleAudio,
        onToggleVideo: handleToggleVideo,
        onToggleScreenShare: handleToggleScreenShare,
        onToggleRecording: isRecording ? stopRecording : startRecording,
        onEndCall: handleEndCall,
        onShowHelp: () => setShowShortcutsHelp(prev => !prev),
        enabled: isJoined,
    });

    // Prepare participants data for components (deduplicate)
    const participantsForSidebar: Participant[] = useMemo(() => {
        // Use userId from store for deduplication (backend uses userId, not socket.id)
        const localParticipant: Participant = {
            id: userId || 'local',
            displayName: displayName + ' (You)',
            audioEnabled,
            videoEnabled,
        };

        // Filter out self (by userId) and duplicates
        const uniqueRemote = participants.filter(
            (p, index, self) =>
                p.id !== userId &&
                self.findIndex(x => x.id === p.id) === index
        );

        return [localParticipant, ...uniqueRemote];
    }, [userId, displayName, audioEnabled, videoEnabled, participants]);

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

    // Render logic
    // Show room not found modal immediately
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
        return <WaitingRoomScreen roomId={roomId} displayName={displayName} onLeave={() => router.push('/')} />;
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
                            stream: isSharing
                                ? screenStream || undefined
                                : (videoEnabled ? localStream : undefined) || undefined,
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
                        onToggleAudio={handleToggleAudio}
                        onToggleVideo={handleToggleVideo}
                        onToggleScreenShare={handleToggleScreenShare}
                        onToggleChat={isMobile ? () => setIsChatOpen(prev => !prev) : undefined}
                        onEndCall={handleEndCall}
                    />
                </div>

                <Sidebar
                    participants={participantsForSidebar}
                    messages={storeMessages}
                    onSendMessage={handleSendMessage}
                />
            </main>

            {/* Mobile Chat */}
            <MobileChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={storeMessages}
                onSendMessage={handleSendMessage}
            />

            {/* Room Settings Modal */}
            {isSettingsModalOpen && (
                <RoomSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    roomId={roomId}
                    isHost={isHost}
                    isJoined={isJoined}
                />
            )}

            {/* Keyboard Shortcuts Help */}
            {showShortcutsHelp && (
                <KeyboardShortcutsHelp
                    isOpen={showShortcutsHelp}
                    onClose={() => setShowShortcutsHelp(false)}
                />
            )}

            {/* Connection Status Indicator */}
            <ConnectionStatus
                isConnected={isConnected}
                onRetry={reconnect}
            />

            {/* Password Modal */}
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSubmit={handlePasswordSubmit}
                error={passwordError}
                isValidating={isValidatingPassword}
            />
        </div>
    );
}
