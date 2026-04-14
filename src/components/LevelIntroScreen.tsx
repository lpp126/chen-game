import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { LEVEL_INTRO_TEXTS } from '../data/levelIntroTexts';
import { FALLBACK_INTRO_BACKGROUND, LEVEL_INTRO_BACKGROUNDS } from '../data/levelIntroBackgrounds';

export const LevelIntroScreen: React.FC = () => {
  const { status, currentLevelId, proceedToStartScreen } = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== 'level_intro') return;
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(timer);
  }, [status, currentLevelId]);

  const level = LEVELS.find((item) => item.levelId === currentLevelId) ?? LEVELS[0];
  const introBgImage = LEVEL_INTRO_BACKGROUNDS[level.levelId] ?? FALLBACK_INTRO_BACKGROUND;
  const lines = useMemo(
    () =>
      LEVEL_INTRO_TEXTS[level.levelId] ?? [
        `平行世界的你，${level.age}岁了。`,
        `这一年的关键词是“${level.theme}”，你会在“${level.title}”里，遇见新的挑战与惊喜。`,
        '深呼吸，准备好后点右下角“开始游戏”，进入关卡开始界面。'
      ],
    [level]
  );

  if (status !== 'level_intro') return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto bg-cover bg-center"
      style={{ backgroundImage: `url("${introBgImage}")` }}
    >
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[2px]" />
      <div
        className={`relative h-full px-10 py-14 text-[#2F2A28] transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-[34rem] mt-10">
          <h2 className="text-2xl font-bold mb-6">第{level.levelId}关 · {level.age}岁</h2>
          <div className="space-y-5 text-lg leading-relaxed text-[#2F2A28]/95">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <button
          onClick={proceedToStartScreen}
          className="absolute right-8 bottom-8 px-6 py-3 rounded-full bg-white/90 text-[#4A4443] font-bold shadow-lg active:scale-95 transition"
        >
          开始游戏
        </button>
      </div>
    </div>
  );
};
