import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { LEVEL_INTRO_TEXTS } from '../data/levelIntroTexts';

const EXIT_DURATION_MS = 600;
const AUTO_ENTER_START_MS = 10500;
const LINE_DELAYS_MS = [400, 1400, 2500, 3700, 4900];

export const LevelIntroScreen: React.FC = () => {
  const { status, currentLevelId, proceedToStartScreen } = useGameStore();
  const [bgVisible, setBgVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'level_intro') return;
    setBgVisible(false);
    setIsExiting(false);

    const enterTimer = window.setTimeout(() => setBgVisible(true), 40);
    const autoExitTimer = window.setTimeout(() => {
      setIsExiting(true);
      exitTimerRef.current = window.setTimeout(() => proceedToStartScreen(), EXIT_DURATION_MS);
    }, AUTO_ENTER_START_MS);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(autoExitTimer);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [status, currentLevelId, proceedToStartScreen]);

  const level = LEVELS.find((item) => item.levelId === currentLevelId) ?? LEVELS[0];
  const lines = useMemo(() => {
    const baseLines =
      LEVEL_INTRO_TEXTS[level.levelId] ?? [
        `${level.age}岁的你，正站在新的门前。`,
        `这一年的关键词是“${level.theme}”，你会在“${level.title}”里，遇见新的挑战与惊喜。`,
        '欢迎来到这一岁的故事，请带着勇气继续向前。'
      ];
    const year = 2002 + level.levelId;
    return [`${year}年`, `平行世界的你${level.age}岁了`, ...baseLines.slice(1)];
  }, [level]);

  if (status !== 'level_intro') return null;

  const skipIntro = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => proceedToStartScreen(), EXIT_DURATION_MS);
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden" onPointerDown={skipIntro}>
      <style>{`
        @keyframes intro-hint-breath {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <div
        className={`absolute inset-0 bg-[#0A0A0A] transition-opacity ${bgVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: '800ms' }}
      />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.18) 0.8px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.12) 0.8px, transparent 0.8px)',
        backgroundSize: '3px 3px, 5px 5px',
        backgroundPosition: '0 0, 1px 1px'
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.08),rgba(255,255,255,0)_55%)]" />

      <div
        className={`relative h-full px-10 py-16 text-white transition-opacity ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        style={{ transitionDuration: '600ms' }}
      >
        <div className="w-full max-w-[36rem] mx-auto h-full flex flex-col justify-center -translate-y-10 text-center">
          <h2 className="mb-6 text-[22px] tracking-[0.5px] text-white/90 font-light" style={{ fontFamily: 'Georgia, "Times New Roman", "Source Han Serif SC", serif' }}>
            第{level.levelId}关
          </h2>
          <div className="space-y-6 text-[21px] leading-[1.9] tracking-[0.5px] text-white/90" style={{ fontFamily: 'Georgia, "Times New Roman", "Source Han Serif SC", serif' }}>
            {lines.map((line, idx) => (
              <p
                key={line}
                className="transition-all duration-1000"
                style={{
                  opacity: bgVisible ? 0.9 : 0,
                  filter: bgVisible ? 'blur(0px)' : 'blur(2px)',
                  transitionDelay: `${LINE_DELAYS_MS[idx] ?? 5000}ms`
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        <p
          className="absolute left-1/2 -translate-x-1/2 bottom-[30px] text-[12px] tracking-[1px] text-white/40"
          style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', animation: 'intro-hint-breath 3s ease-in-out infinite' }}
        >
          轻触任意处 继续
        </p>
      </div>

      <div
        className={`absolute inset-0 pointer-events-none bg-white transition-opacity ${isExiting ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: '600ms' }}
      />
    </div>
  );
};
