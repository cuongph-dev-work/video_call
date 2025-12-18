'use client';

import { useState, useEffect } from 'react';

export function useRemoteStreams() {
    const [remoteStreamsList, setRemoteStreamsList] = useState<Array<{ id: string; stream: MediaStream }>>([]);

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

    return { remoteStreamsList };
}
