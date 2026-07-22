import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { getLevelStartTheme } from '../data/levelStartThemes';
import { FRESH, hudGlass, mobileContentInset, mobileTextMin, mobileTextTitle } from '../utils/levelTheme';
import { MuteButton } from './MuteButton';
import { unlockAudio } from '../utils/audioManager';
import { AccountSyncModal } from './AccountSyncModal';
import { WishWallModal } from './WishWallModal';

const DEV_UNLOCK_ALL_LEVELS = false;

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
    accountNickname,
    goHome,
    goOrangeShop,
    enterLevelStart,
    unlockAllLevels,
    resetCurrentModeData,
    logoutAdmin,
    syncAdminToPlayer
  } = useGameStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [wishWallOpen, setWishWallOpen] = useState(false);

  useEffect(() => {
    if (status === 'level_select' && !accountNickname && !adminMode) {
      goHome();
    }
  }, [status, accountNickname, adminMode, goHome]);

  if (status !== 'level_select') return null;

  const completedCount = Object.values(saveData.levels).filter((item) => item.completed).length;
  const continueLevel = LEVELS.find((level) => !saveData.levels[String(level.levelId)]?.completed)?.levelId ?? LEVELS[LEVELS.length - 1].levelId;
  const progress = Math.round((completedCount / LEVELS.length) * 100);
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
        <div className={`${hudGlass} px-4 pt-3 pb-3.5`}>
          <div className="relative flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/90 border border-white shadow-sm active:scale-95 transition-transform shrink-0 z-10"
            >
              <svg className="w-4 h-4" style={{ color: FRESH.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5 shrink-0 z-10">
              <button
                type="button"
                onClick={() => setWishWallOpen(true)}
                className="px-2.5 h-9 rounded-lg border border-white/85 font-bold shadow-sm active:scale-95 leading-none text-white"
                style={{
                  background: 'linear-gradient(135deg, #ffb347, #ff8c42)',
                  fontSize: 24
                }}
                title="留言墙"
              >
                💌留言墙
              </button>
              {accountNickname && (
                <button
                  type="button"
                  onClick={() => setAccountOpen(true)}
                  className="px-2.5 h-9 rounded-lg bg-white/80 border border-white/85 font-bold shadow-sm active:scale-95 max-w-[9rem] truncate leading-none"
                  style={{ color: FRESH.text, fontSize: 25 }}
                  title="账号详情"
                >
                  {accountNickname}
                </button>
              )}
              <MuteButton className="!w-8 !h-8 !text-sm" />
              <button
                type="button"
                onClick={goOrangeShop}
                className="flex items-center gap-0.5 px-2 h-8 rounded-lg bg-white/80 border border-white/85 text-xs font-bold shadow-sm active:scale-95"
                style={{ color: FRESH.text }}
              >
                🍊{saveData.totalOranges}
              </button>
            </div>
          </div>
          <div className="text-center px-1 pt-3">
            <h2 className="font-bold leading-none whitespace-nowrap tracking-wide" style={{ color: FRESH.text, fontSize: 36 }}>
              24帧 · 添添放映厅
            </h2>
            <p className="mt-2 whitespace-nowrap leading-none" style={{ color: FRESH.textMuted, fontSize: 24 }}>
              已通关 {completedCount} / {LEVELS.length} · {progress}%
            </p>
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
                onClick={() => {
                  unlockAudio();
                  enterLevelStart(level.levelId);
                }}
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
          onClick={() => {
            unlockAudio();
            enterLevelStart(continueLevel);
          }}
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

      <AccountSyncModal open={accountOpen} detailsOnly onClose={() => setAccountOpen(false)} />
      <WishWallModal open={wishWallOpen} onClose={() => setWishWallOpen(false)} />
    </div>
  );
};
