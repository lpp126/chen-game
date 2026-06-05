import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { getLevelStartTheme } from '../data/levelStartThemes';
import { FRESH, hudGlass, mobileContentInset, mobileTextMin, mobileTextTitle } from '../utils/levelTheme';

const DEV_UNLOCK_ALL_LEVELS = true;

const StarMini: React.FC<{ count: number; accent: string }> = ({ count, accent }) => (
  <span className="text-xs tracking-tight">
    {[1, 2, 3].map((i) => (
      <span key={i} style={{ color: i <= count ? accent : `${FRESH.sand}66` }}>
        ★
      </span>
    ))}
  </span>
);

export const LevelSelectScreen: React.FC = () => {
  const {
    status,
    saveData,
    adminMode,
    goHome,
    goOrangeShop,
    enterLevelStart,
    unlockAllLevels,
    resetCurrentModeData,
    logoutAdmin,
    syncAdminToPlayer
  } = useGameStore();

  if (status !== 'level_select') return null;

  const completedCount = Object.values(saveData.levels).filter((item) => item.completed).length;
  const continueLevel = LEVELS.find((level) => !saveData.levels[String(level.levelId)]?.completed)?.levelId ?? 24;
  const progress = Math.round((completedCount / 24) * 100);
  const continueTheme = getLevelStartTheme(continueLevel);

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto flex flex-col overflow-hidden"
      style={{ background: FRESH.bgGrad }}
    >
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />
      <div className="absolute -top-24 -right-12 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: FRESH.sky }} />
      <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none" style={{ background: FRESH.sage }} />

      {/* 顶栏 */}
      <div className={`relative z-10 shrink-0 pt-5 pb-3 ${mobileContentInset}`}>
        <div className={`${hudGlass} px-4 py-3.5`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/90 border border-white shadow-sm active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5" style={{ color: FRESH.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0 text-center">
              <h2 className={`${mobileTextTitle} font-bold leading-tight`} style={{ color: FRESH.text }}>
                24帧 · 人生放映厅
              </h2>
              <p className={`${mobileTextMin} mt-0.5`} style={{ color: FRESH.textMuted }}>
                已通关 {completedCount} / 24 · {progress}%
              </p>
            </div>
            <button
              type="button"
              onClick={goOrangeShop}
              className={`flex items-center gap-1 px-3 h-11 rounded-xl bg-white/80 border border-white/85 ${mobileTextMin} font-bold shadow-sm active:scale-95`}
              style={{ color: FRESH.text }}
            >
              🍊 {saveData.totalOranges}
            </button>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-white/45 border border-white/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${FRESH.sky}, ${FRESH.sage})` }}
            />
          </div>
        </div>
      </div>

      {adminMode && (
        <div className={`relative z-10 mb-2 ${mobileContentInset}`}>
          <div className={`px-4 py-2.5 rounded-xl text-center ${mobileTextMin} font-semibold`} style={{ background: `${FRESH.accentSoft}ee`, border: `1px solid ${FRESH.mist}66`, color: FRESH.text }}>
            🔧 管理员模式
          </div>
        </div>
      )}

      {/* 关卡网格：两列 */}
      <div className={`relative z-10 flex-1 min-h-0 overflow-y-auto pb-32 ${mobileContentInset}`}>
        <p className={`${mobileTextMin} font-semibold mb-3 px-1`} style={{ color: FRESH.textMuted }}>
          全部关卡
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {LEVELS.map((level) => {
            const theme = getLevelStartTheme(level.levelId);
            const unlocked = DEV_UNLOCK_ALL_LEVELS || adminMode || saveData.unlockedLevels.includes(level.levelId);
            const rec = saveData.levels[String(level.levelId)];
            const done = !!rec?.completed;
            const isNext = level.levelId === continueLevel && !done;

            return (
              <button
                key={level.levelId}
                type="button"
                disabled={!unlocked}
                onClick={() => enterLevelStart(level.levelId)}
                className={`text-left rounded-[1rem] border-2 p-2.5 transition-all active:scale-[0.98] ${
                  unlocked
                    ? 'bg-white/80 backdrop-blur-sm shadow-[0_6px_18px_rgba(26,51,72,0.08)]'
                    : 'bg-white/35 opacity-50'
                } ${isNext ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''}`}
                style={{
                  borderColor: unlocked ? (isNext ? theme.accent : done ? theme.accent : theme.cardBorder) : `${FRESH.mist}55`,
                  ...(isNext ? { ringColor: theme.accent } : {})
                }}
              >
                {isNext && (
                  <span
                    className="inline-block mb-1 text-[11px] font-bold px-1.5 py-px rounded-full text-white leading-tight"
                    style={{ background: theme.accent }}
                  >
                    继续这里
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="shrink-0 w-10 h-10 rounded-[0.7rem] flex items-center justify-center text-[1.35rem] border-2 border-white/85 shadow-sm"
                    style={{ background: theme.orbGradient }}
                  >
                    {unlocked ? theme.emoji : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${mobileTextMin} font-semibold leading-none`} style={{ color: FRESH.textMuted }}>
                      第{level.levelId}关
                    </p>
                    <p className={`${mobileTextTitle} font-bold leading-tight mt-0.5 truncate`} style={{ color: FRESH.text }}>
                      {level.title}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center justify-between ${mobileTextMin} pt-1.5 border-t border-white/60`} style={{ color: FRESH.textSoft }}>
                  <StarMini count={rec?.stars ?? 0} accent={theme.accent} />
                  <span>🍊 {rec?.bestOrange ?? 0}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 继续按钮 */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 pb-6 pt-5 ${mobileContentInset}`}
        style={{ background: `linear-gradient(to top, ${FRESH.bgMid} 0%, ${FRESH.bgMid}f0 55%, transparent 100%)` }}
      >
        <button
          type="button"
          onClick={() => enterLevelStart(continueLevel)}
          className={`w-full py-3.5 rounded-2xl ${mobileTextTitle} font-bold text-white border-2 border-white/60 shadow-[0_12px_32px_rgba(26,51,72,0.2)] active:scale-[0.98] flex items-center justify-center gap-2`}
          style={{ background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` }}
        >
          <span>{continueTheme.emoji}</span>
          <span>继续旅程 · 第 {continueLevel} 关</span>
        </button>
      </div>

      {adminMode && (
        <div className="absolute right-4 bottom-36 z-30 rounded-2xl border bg-white/92 backdrop-blur-md shadow-xl p-3 w-44 space-y-2" style={{ borderColor: `${FRESH.mist}88` }}>
          <button type="button" onClick={unlockAllLevels} className="w-full text-sm font-semibold rounded-xl py-2" style={{ background: FRESH.accentSoft, color: FRESH.text }}>
            全部解锁
          </button>
          <button type="button" onClick={resetCurrentModeData} className="w-full text-sm font-semibold rounded-xl py-2" style={{ background: FRESH.accentSoft, color: FRESH.text }}>
            重置进度
          </button>
          <button type="button" onClick={syncAdminToPlayer} className="w-full text-sm font-semibold rounded-xl py-2" style={{ background: FRESH.accentSoft, color: FRESH.text }}>
            同步存档
          </button>
          <button type="button" onClick={logoutAdmin} className="w-full text-sm font-semibold rounded-xl py-2 bg-white/80" style={{ color: FRESH.text }}>
            退出管理员
          </button>
        </div>
      )}
    </div>
  );
};
