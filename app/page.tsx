import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  // Generate a random room ID (memoized to avoid re-generation on re-render)
  const roomId = useMemo(() => 'room-' + Math.random().toString(36).substring(2, 9), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Title */}
        <h1 className="text-6xl font-bold text-white mb-4">
          Video Call
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Connect with anyone, anywhere
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <Link href={`/room/${roomId}`}>
            <Button size="lg" className="w-full max-w-md text-lg h-14">
              🎥 Start New Meeting
            </Button>
          </Link>

          <div className="text-gray-400">
            <p className="text-sm">
              Share the room URL with others to join
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-2">📹</div>
            <h3 className="text-white font-semibold mb-1">HD Video</h3>
            <p className="text-gray-400 text-sm">Crystal clear video calls</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h3 className="text-white font-semibold mb-1">Secure</h3>
            <p className="text-gray-400 text-sm">End-to-end encrypted</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-white font-semibold mb-1">Fast</h3>
            <p className="text-gray-400 text-sm">Low latency connections</p>
          </div>
        </div>
      </div>
    </div>
  );
}
