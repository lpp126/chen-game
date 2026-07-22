import React, { useEffect, useState } from 'react';
import { isMuted, subscribeMute, toggleMuted } from '../utils/audioManager';

type Props = {
  className?: string;
};

/** 全局静音：仅放在选关等需要的界面 */
export const MuteButton: React.FC<Props> = ({ className = '' }) => {
  const [muted, setMutedState] = useState(isMuted);

  useEffect(() => subscribeMute(setMutedState), []);

  return (
    <button
      type="button"
      aria-label={muted ? '开启声音' : '静音'}
      title={muted ? '开启声音' : '静音'}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 border border-white/90 shadow-sm text-lg active:scale-95 transition-transform ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleMuted();
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};
