'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Home,
  MessageSquare,
  Calendar,
  Clock,
  HelpCircle,
  Menu,
  MonitorUp,
  Keyboard,
} from 'lucide-react';

// Sub-Components
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, active = false, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 group w-full"
    aria-label={label}
  >
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 ${active
      ? 'bg-[#1f2937] text-[#3b82f6] shadow-md'
      : 'text-gray-400 hover:bg-[#1f2937] hover:text-white'
      }`}>
      {icon}
    </div>
  </button>
);

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

const QuickAction = ({ icon, label, href = "#", onClick }: QuickActionProps) => (
  <a
    className="hover:text-[#3b82f6] transition-colors flex items-center gap-2 group cursor-pointer"
    href={href}
    onClick={onClick}
  >
    <div className="w-8 h-8 rounded-full bg-[#1f2937] flex items-center justify-center group-hover:bg-[#1f2937]/80 transition-colors">
      {icon}
    </div>
    {label}
  </a>
);

// Main Component
export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as "10:30 AM"
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Format date as "Thứ Ba, 24 Th10"
  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const handleNewMeeting = useCallback(() => {
    const roomId = 'room-' + Math.random().toString(36).substring(2, 9);
    router.push(`/room/${roomId}`);
  }, [router]);

  const handleJoinMeeting = useCallback(() => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.trim()}`);
    }
  }, [roomCode, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoinMeeting();
    }
  }, [handleJoinMeeting]);

  return (
    <div className="flex h-screen bg-[#0b0e11] text-white font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-24 bg-[#111418] border-r border-[#232936] flex flex-col items-center py-6 gap-8 z-20 hidden sm:flex">
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20 mb-4">
          <Video className="w-7 h-7" />
        </div>

        <nav className="flex flex-col gap-6 w-full px-4">
          <NavItem icon={<Home size={24} />} label="Home" active />
          <NavItem icon={<MessageSquare size={24} />} label="Chat" />
          <NavItem icon={<Calendar size={24} />} label="Calendar" />
          <NavItem icon={<Clock size={24} />} label="History" />
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <button className="h-10 w-10 rounded-full overflow-hidden border-2 border-[#232936] hover:border-[#3b82f6] transition-all">
            <img
              alt="User Profile"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf4jNLfHvYqgMO02pMaLHmtMbBnu1NpRvMbeSSRwBTSMRFHQ0JNplvezEcDVU_4lB5MO7RtwU2i_X_eKy7xC2YWcMkbglQGopYk_DViMNFSSXaDiiTzL7Z97KAGRpqUAN0FzoB3dg6SIGxtIDF9whfyQEwpw6jx42AlDsKVsmZx0tU6u2nvZ3fO-MTS8U2OsxWBKgNAFRNCUMIfy9kqF2NcaDyxNGiU_CKY8Vt6n2DCV7epvejuuosOm--isQAoyN4Oo1N2QtZJcw"
            />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sm:hidden fixed top-0 w-full z-50 bg-[#111418]/90 backdrop-blur-md border-b border-[#232936] px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">VideoCall</span>
        </div>
        <button className="text-white" aria-label="Menu">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Desktop Header */}
        <header className="w-full h-20 flex items-center justify-between px-8 z-10 hidden sm:flex shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">Tổng quan</h2>
            <p className="text-sm text-gray-400">Chào mừng trở lại, Alexander</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-white">{formattedTime}</span>
              <span className="text-xs text-gray-400">{formattedDate}</span>
            </div>
            <div className="h-8 w-[1px] bg-[#232936]" />
            <button className="flex items-center gap-2 bg-[#161b22] border border-[#232936] hover:border-gray-500 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors">
              <HelpCircle className="w-5 h-5" />
              <span>Trợ giúp</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 relative z-10 flex flex-col pt-20 sm:pt-0">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-12">
            <div className="w-full text-center space-y-12">
              {/* Hero Section */}
              <div className="space-y-6 max-w-2xl mx-auto">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                  Kết nối <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-purple-400">không giới hạn</span>
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed font-light">
                  Trải nghiệm họp trực tuyến mượt mà, bảo mật cao. <br className="hidden sm:block" />
                  Tạo phòng họp ngay lập tức hoặc tham gia cùng đội ngũ của bạn.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* New Meeting Button */}
                  <button
                    onClick={handleNewMeeting}
                    className="sm:flex-none sm:w-auto flex-1 flex items-center justify-center gap-3 h-14 px-6 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 group whitespace-nowrap"
                  >
                    <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Cuộc họp mới</span>
                  </button>

                  {/* Join Input */}
                  <div className="flex-1 relative group min-w-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Keyboard className="w-5 h-5 text-gray-500 group-focus-within:text-[#3b82f6] transition-colors" />
                    </div>
                    <input
                      className="block w-full h-14 pl-10 pr-24 bg-[#161b22] border border-[#232936] rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all focus:outline-none"
                      placeholder="Nhập mã họp"
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      className="absolute right-2 top-2 bottom-2 px-4 bg-[#1f2937] hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!roomCode.trim()}
                      onClick={handleJoinMeeting}
                    >
                      Tham gia
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
                  <QuickAction icon={<Calendar className="w-5 h-5" />} label="Lên lịch" />
                  <QuickAction icon={<MonitorUp className="w-5 h-5" />} label="Chia sẻ màn hình" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full py-6 mt-auto border-t border-[#232936]/50 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
            <p>© 2023 VideoCall App. All rights reserved.</p>
            <div className="flex gap-6">
              <a className="hover:text-white transition-colors" href="#">Điều khoản</a>
              <a className="hover:text-white transition-colors" href="#">Bảo mật</a>
              <a className="hover:text-white transition-colors" href="#">Trợ giúp</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
