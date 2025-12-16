'use client';

import { useState } from 'react';
import { BackgroundType } from '@/lib/background-processor';

interface BackgroundSelectorProps {
  onSelect: (type: BackgroundType, options?: { blurAmount?: number; imageUrl?: string }) => void;
  currentType: BackgroundType;
}

export function BackgroundSelector({ onSelect, currentType }: BackgroundSelectorProps) {
  const [blurAmount, setBlurAmount] = useState(10);

  const toggleBlur = () => {
    if (currentType === 'blur') {
      onSelect('none');
    } else {
      onSelect('blur', { blurAmount });
    }
  };

  return (
    <div className="space-y-0">
      {/* Toggle Blur */}
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[#222730] transition-colors group">
        <div className="flex-1">
          <label 
            className="text-sm font-medium text-gray-200 cursor-pointer" 
            onClick={toggleBlur}
          >
            Làm mờ nền
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Làm mờ phần nền phía sau bạn
          </p>
        </div>
        <button
          onClick={toggleBlur}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
            currentType === 'blur' ? 'bg-blue-600' : 'bg-[#313845]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
              currentType === 'blur' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Blur Amount Slider */}
      {currentType === 'blur' && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Độ mờ</label>
            <span className="text-xs font-medium text-gray-200">{blurAmount}px</span>
          </div>
          <input
            type="range"
            min="5"
            max="20"
            value={blurAmount}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setBlurAmount(value);
              onSelect('blur', { blurAmount: value });
            }}
            className="w-full h-2 bg-[#313845] rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      )}
    </div>
  );
}

