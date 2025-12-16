'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useLocalStream } from '@/hooks/useLocalStream';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import { useMeetingStore } from '@/store/useMeetingStore';
import { VideoTile } from '@/components/VideoTile';
import { ControlBar } from '@/components/ControlBar';

interface Participant {
    id: string;
    displayName: string;
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;

    const { getSocket, isConnected } = useSocket();
    const {
        stream: localStream,
        audioEnabled,
        videoEnabled,
        toggleAudio,
        toggleVideo,
        stopStream,
    } = useLocalStream();

    usePeerConnection({
        localStream,
        socket: getSocket(),
        roomId,
    });

    const [remoteStreamsList, setRemoteStreamsList] = useState<Array<{ id: string; stream: MediaStream }>>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);

    // Join room when socket connects
    useEffect(() => {
        const socket = getSocket();
        if (socket && isConnected && roomId) {
            socket.emit('join-room', {
                roomId,
                displayName: 'User ' + Math.floor(Math.random() * 1000),
            });

            socket.on('room-joined', (data: { roomId: string; participants: Participant[] }) => {
                console.log('✅ Joined room:', data);
                setParticipants(data.participants || []);
            });

            socket.on('user-joined', (data: { participant: Participant }) => {
                console.log('👤 New user joined:', data);
                setParticipants(prev => [...prev, data.participant]);
            });

            socket.on('user-left', (data: { userId: string }) => {
                console.log('👋 User left:', data);
                setParticipants(prev => prev.filter(p => p.id !== data.userId));
            });
        }

        return () => {
            if (socket) {
                socket.off('room-joined');
                socket.off('user-joined');
                socket.off('user-left');
            }
        };
    }, [getSocket, isConnected, roomId]);

    // Listen for remote stream events
    useEffect(() => {
        const handleRemoteStreamAdded = (event: any) => {
            const { peerId, stream } = event.detail;
            setRemoteStreamsList(prev => {
                const existing = prev.find(s => s.id === peerId);
                if (existing) return prev;
                return [...prev, { id: peerId, stream }];
            });
        };

        const handleRemoteStreamRemoved = (event: any) => {
            const { peerId } = event.detail;
            setRemoteStreamsList(prev => prev.filter(s => s.id !== peerId));
        };

        window.addEventListener('remote-stream-added', handleRemoteStreamAdded);
        window.addEventListener('remote-stream-removed', handleRemoteStreamRemoved);

        return () => {
            window.removeEventListener('remote-stream-added', handleRemoteStreamAdded);
            window.removeEventListener('remote-stream-removed', handleRemoteStreamRemoved);
        };
    }, []);

    const handleEndCall = () => {
        const socket = getSocket();
        if (socket) {
            socket.emit('leave-room', { roomId });
        }
        stopStream();
        router.push('/');
    };

    const handleToggleAudio = () => {
        toggleAudio();
        const socket = getSocket();
        if (socket) {
            socket.emit('toggle-audio', { roomId, enabled: !audioEnabled });
        }
    };

    const handleToggleVideo = () => {
        toggleVideo();
        const socket = getSocket();
        if (socket) {
            socket.emit('toggle-video', { roomId, enabled: !videoEnabled });
        }
    };

    return (
        <div className="h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-white text-xl font-semibold">Room: {roomId}</h1>
                    <div className="text-sm text-gray-400">
                        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </div>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-auto">
                <div className={`grid gap-4 h-full ${remoteStreamsList.length === 0 ? 'grid-cols-1' :
                    remoteStreamsList.length === 1 ? 'grid-cols-2' :
                        'grid-cols-2 grid-rows-2'
                    }`}>
                    {/* Local Video */}
                    <VideoTile
                        stream={localStream}
                        displayName="You"
                        isMuted={!audioEnabled}
                        isVideoOff={!videoEnabled}
                        isLocal={true}
                    />

                    {/* Remote Videos */}
                    {remoteStreamsList.map(({ id, stream }) => (
                        <VideoTile
                            key={id}
                            stream={stream}
                            displayName={participants.find(p => p.id === id)?.displayName || 'User'}
                            isMuted={false}
                            isVideoOff={false}
                            isLocal={false}
                        />
                    ))}
                </div>
            </div>

            {/* Control Bar */}
            <ControlBar
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
                onEndCall={handleEndCall}
            />
        </div>
    );
}
