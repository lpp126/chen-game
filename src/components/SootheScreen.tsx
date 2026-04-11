import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const SootheScreen: React.FC = () => {
  const { status, triggerSoothe, endSoothe } = useGameStore();
  const [progress, setProgress] = useState(0);
  const lastAngleRef = useRef<number | null>(null);
  const totalAngleRef = useRef(0);

  useEffect(() => {
    if (status === 'soothing') {
      setProgress(0);
      lastAngleRef.current = null;
      totalAngleRef.current = 0;
    }
  }, [status]);

  if (status !== 'soothing') return null;

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(clientY - centerY, clientX - centerX);

    if (lastAngleRef.current !== null) {
      let delta = angle - lastAngleRef.current;
      // 纠正跨越 -PI 和 PI 的情况
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      if (delta > 0) { // 只累加顺时针
        totalAngleRef.current += delta;
        const targetAngle = Math.PI * 2 * 3; // 3圈
        const currentProgress = Math.min(1, Math.max(0, totalAngleRef.current / targetAngle));
        setProgress(currentProgress);

        if (currentProgress >= 1) {
          endSoothe();
        }
      }
    }

    lastAngleRef.current = angle;
  };

  const handleEnd = () => {
    // 中断，重置
    setProgress(0);
    lastAngleRef.current = null;
    totalAngleRef.current = 0;
  };

  return (
    <div 
      className="absolute inset-0 z-50 bg-black/50 flex flex-col items-center justify-center pointer-events-auto touch-none"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
      onMouseLeave={handleEnd}
    >
      <h2 className="text-[#FADCD9] text-2xl font-bold mb-8">轻轻安抚添添，顺时针画圈3秒</h2>
      <div className="relative w-48 h-48 border-4 border-dashed border-[#B2CEE5]/30 rounded-full flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle 
            cx="96" cy="96" r="90" 
            fill="none" 
            stroke="#B2CEE5" 
            strokeWidth="8" 
            strokeDasharray={90 * 2 * Math.PI}
            strokeDashoffset={90 * 2 * Math.PI * (1 - progress)}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>
        <div className="text-white text-lg font-bold">
          {Math.floor(progress * 100)}%
        </div>
      </div>
    </div>
  );
};