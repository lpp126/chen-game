import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS, LEVEL_DEFAULT_COVER } from '../data/levels';
import { LEVEL_RULES } from '../data/levelRules';
import { getLevelStartTheme } from '../data/levelStartThemes';
import { FRESH } from '../utils/levelTheme';

const PATTERN_STYLE: Record<string, React.CSSProperties> = {
  dots: {
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)',
    backgroundSize: '18px 18px'
  },
  grid: {
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  },
  waves: {
    backgroundImage:
      'repeating-radial-gradient(circle at 0 100%, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 8px, transparent 8px, transparent 16px)'
  },
  sparkle: {
    backgroundImage:
      'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.2) 0 1.5px, transparent 2.5px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.18) 0 2px, transparent 3px)',
    backgroundSize: '120px 120px, 90px 90px, 100px 100px'
  },
  rings: {
    backgroundImage:
      'radial-gradient(circle at 50% 120%, rgba(255,255,255,0.14) 0, rgba(255,255,255,0.14) 40px, transparent 41px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 28px, transparent 29px)'
  }
};

const StarRow: React.FC<{ count: number; accent: string }> = ({ count, accent }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3].map((i) => (
      <span key={i} className="text-lg leading-none" style={{ color: i <= count ? accent : `${accent}44` }}>
        ★
      </span>
    ))}
  </div>
);

export const StartScreen: React.FC = () => {
  const { status, startGame, goLevelSelect, currentLevelId, saveData } = useGameStore();

  const level = LEVELS.find((item) => item.levelId === currentLevelId) ?? LEVELS[0];
  const theme = getLevelStartTheme(level.levelId);
  const best = saveData.levels[String(level.levelId)]?.stars ?? 0;
  const rules = LEVEL_RULES[level.levelId] ?? ['🧩 完成关卡目标即可通关。'];
  const year = 2002 + level.levelId;
  const coverSrc = theme.coverImage ?? (level.coverImage !== LEVEL_DEFAULT_COVER ? level.coverImage : undefined);

  if (status !== 'start') return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto overflow-hidden flex flex-col"
      style={{ background: theme.bgGradient }}
    >
      {/* 装饰层 */}
      <div className="absolute inset-0 opacity-60 pointer-events-none" style={PATTERN_STYLE[theme.pattern]} />
      <div
        className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: theme.accentSoft }}
      />
      <div
        className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none"
        style={{ background: theme.accent }}
      />

      {/* 顶栏 */}
      <div className="relative z-20 shrink-0 px-5 pt-5 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={goLevelSelect}
          className="flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-full bg-white/72 backdrop-blur-md border border-white/80 shadow-[0_4px_20px_rgba(26,51,72,0.1)] active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" style={{ color: FRESH.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium" style={{ color: FRESH.text }}>选关</span>
        </button>
        <span className="text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full bg-white/55 backdrop-blur-sm border border-white/70" style={{ color: FRESH.textSoft }}>
          {year} 年
        </span>
      </div>

      {/* 上半部分：封面 / 标题 / 星级（保持不变） */}
      <div className="relative z-10 shrink-0 px-6 flex flex-col items-center">
        <div
          className="mt-2 mb-4 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase border backdrop-blur-sm"
          style={{ color: theme.accent, borderColor: theme.cardBorder, background: theme.accentSoft }}
        >
          第 {level.levelId} 关 · {level.age} 岁
        </div>

        <div
          className="relative w-[9.5rem] h-[9.5rem] rounded-[2rem] mb-5 flex items-center justify-center shadow-[0_20px_50px_rgba(26,51,72,0.15)] border-4 border-white/85 overflow-hidden"
          style={{ background: theme.orbGradient }}
        >
          {coverSrc ? (
            <>
              <img src={coverSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
            </>
          ) : (
            <span className="text-[4.5rem] leading-none drop-shadow-sm select-none">{theme.emoji}</span>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        </div>

        <h1 className="text-[1.65rem] font-bold text-center leading-snug mb-1 px-2" style={{ color: FRESH.text }}>{level.title}</h1>
        <p className="text-sm text-center mb-1" style={{ color: FRESH.textSoft }}>{theme.subtitle}</p>
        <p className="text-xs mb-4" style={{ color: FRESH.textMuted }}>{level.theme}</p>

        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/55 backdrop-blur-md border border-white/75 shadow-sm mb-4">
          <span className="text-xs" style={{ color: FRESH.textSoft }}>历史最佳</span>
          <StarRow count={best} accent={theme.accent} />
          <span className="text-xs font-semibold" style={{ color: theme.accent }}>
            {best}/3
          </span>
        </div>
      </div>

      {/* 下半部分：规则 + 开始 */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <h3 className="text-base font-bold mb-2.5 text-center" style={{ color: FRESH.text }}>游戏规则</h3>
        <ul className="space-y-2 list-none mb-4">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-2 text-sm leading-[1.55]" style={{ color: FRESH.text }}>
              <span className="shrink-0 font-bold w-4 text-right" style={{ color: theme.accent }}>
                {i + 1}.
              </span>
              <span className="flex-1 min-w-0">{rule}</span>
            </li>
            ))}
          </ul>

        <button
          type="button"
          onClick={startGame}
          className="w-full py-3.5 rounded-2xl text-base font-bold text-white shadow-[0_12px_28px_rgba(26,51,72,0.2)] border-2 border-white/60 active:scale-[0.98] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})`
          }}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
};
