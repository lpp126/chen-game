import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { getSettlementImage } from '../data/levelSettlementImages';
import { BIRTHDAY_WISH_MAX, clampBirthdayWishInput, countNicknameChars } from '../services/accountSave';
import { FRESH, failBtnPrimary, failBtnSecondary } from '../utils/levelTheme';

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  spin: number;
  glyph: string;
  opacity: number;
};

const BirthdayFx: React.FC = () => {
  const particles = useMemo<Particle[]>(() => {
    const glyphs = ['🎂', '🕯️', '🍊', '✨', '🎈', '💛', '🎊'];
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: (i * 17 + 11) % 100,
      delay: (i % 12) * 0.18,
      duration: 4.2 + (i % 7) * 0.35,
      size: 14 + (i % 5) * 4,
      drift: ((i % 9) - 4) * 18,
      spin: 180 + (i % 6) * 60,
      glyph: glyphs[i % glyphs.length],
      opacity: 0.55 + (i % 4) * 0.1
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,214,140,0.35) 0%, transparent 48%), radial-gradient(ellipse at 50% 100%, rgba(74,159,216,0.18) 0%, transparent 42%)'
        }}
      />
      <style>{`
        @keyframes bday-fall {
          0% { transform: translate3d(0,-12%,0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 112vh, 0) rotate(var(--spin)); opacity: 0.15; }
        }
        @keyframes bday-glow {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(255,200,120,0)); transform: scale(1); }
          50% { filter: drop-shadow(0 8px 18px rgba(255,186,90,0.35)); transform: scale(1.04); }
        }
        @keyframes bday-title {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); letter-spacing: 0.02em; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.08em; }
        }
        @keyframes bday-burst {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 0.85; transform: scale(1); }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 select-none"
          style={
            {
              left: `${p.left}%`,
              fontSize: p.size,
              opacity: p.opacity,
              animation: `bday-fall ${p.duration}s linear ${p.delay}s infinite`,
              ['--drift' as string]: `${p.drift}px`,
              ['--spin' as string]: `${p.spin}deg`
            } as React.CSSProperties
          }
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
};

export const GameOver: React.FC = () => {
  const {
    status,
    stars,
    goLevelSelect,
    restartCurrentLevel,
    goNextLevel,
    currentLevelId,
    saveData,
    adminMode,
    accountNickname,
    saveBirthdayWish
  } = useGameStore();
  const [fxReady, setFxReady] = useState(false);
  const [wishDraft, setWishDraft] = useState('');
  const [wishBusy, setWishBusy] = useState(false);
  const [wishHint, setWishHint] = useState('');
  const [wishSynced, setWishSynced] = useState(false);

  const isBirthdayClear = currentLevelId === 24;

  useEffect(() => {
    if (status !== 'gameover') {
      setFxReady(false);
      return;
    }
    if (!isBirthdayClear) return;
    const t = window.setTimeout(() => setFxReady(true), 40);
    return () => window.clearTimeout(t);
  }, [status, isBirthdayClear, currentLevelId]);

  useEffect(() => {
    if (status !== 'gameover' || !isBirthdayClear) return;
    const existing = saveData.birthdayWish ?? '';
    setWishDraft(existing);
    setWishHint('');
    setWishSynced(Boolean(existing && accountNickname));
  }, [status, isBirthdayClear, currentLevelId, saveData.birthdayWish, accountNickname]);

  if (status !== 'gameover') return null;

  const isLast = currentLevelId >= LEVELS.length;
  const settlementImage = getSettlementImage(currentLevelId);
  const wishLen = countNicknameChars(wishDraft);
  const wishDirty = wishDraft.trim() !== (saveData.birthdayWish ?? '').trim();

  const onSubmitWish = async () => {
    if (wishBusy) return;
    setWishBusy(true);
    setWishHint('');
    try {
      const result = await saveBirthdayWish(wishDraft);
      setWishHint(result.message);
      setWishSynced(result.syncedCloud);
      if (result.ok) {
        setWishDraft(useGameStore.getState().saveData.birthdayWish ?? '');
      }
    } finally {
      setWishBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto backdrop-blur-sm overflow-y-auto"
      style={{
        background: isBirthdayClear
          ? `linear-gradient(180deg, #fff6e8 0%, ${FRESH.bg} 42%, ${FRESH.bgMid} 100%)`
          : `${FRESH.bg}f2`
      }}
    >
      {isBirthdayClear && fxReady && <BirthdayFx />}

      <div className="relative z-[2] min-h-full flex flex-col items-center justify-start px-5 py-6">
        {isBirthdayClear ? (
          <div className="mb-4 text-center" style={{ animation: 'bday-title 0.7s ease-out both' }}>
            <p
              className="text-xs font-semibold tracking-[0.28em] mb-2"
              style={{ color: FRESH.teal }}
            >
              HAPPY BIRTHDAY
            </p>
            <h1 className="text-[1.85rem] font-bold leading-snug" style={{ color: FRESH.text }}>
              生日快乐，陈添祥
            </h1>
            <p className="mt-2 text-sm" style={{ color: FRESH.textSoft }}>
              二十四帧人生 · 橙子粒常相伴❤️
            </p>
          </div>
        ) : (
          <h1 className="text-3xl font-bold mb-5" style={{ color: FRESH.text }}>
            通关成功！
          </h1>
        )}

        <div className="flex gap-3 mb-5">
          {[1, 2, 3].map((orange) => (
            <div
              key={orange}
              className={`w-12 h-12 transform ${orange === 2 ? '-translate-y-2' : ''} flex items-center justify-center rounded-full transition-all duration-500 ${
                stars >= orange ? 'text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'
              }`}
              style={stars >= orange ? { background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` } : undefined}
            >
              <span className="text-2xl">🍊</span>
            </div>
          ))}
        </div>

        <div
          className="w-full max-w-sm mb-6 flex flex-col items-center gap-3"
          style={isBirthdayClear ? { animation: 'bday-burst 0.85s ease-out both' } : undefined}
        >
          {settlementImage ? (
            <img
              src={settlementImage}
              alt={`第${currentLevelId}关结算`}
              className="w-44 h-44 object-contain drop-shadow-md"
              style={isBirthdayClear ? { animation: 'bday-glow 2.4s ease-in-out infinite' } : undefined}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="w-36 h-36 rounded-2xl border-2 border-dashed bg-white/60 flex items-center justify-center text-center px-3 text-4xl"
              style={{
                borderColor: `${FRESH.mist}88`,
                color: `${FRESH.text}99`,
                animation: isBirthdayClear ? 'bday-glow 2.4s ease-in-out infinite' : undefined
              }}
            >
              {isBirthdayClear ? '🎂' : '🎉'}
            </div>
          )}
          {isBirthdayClear && (
            <p
              className="text-center text-sm font-medium px-4 leading-relaxed"
              style={{ color: FRESH.textSoft }}
            >
              愿每一帧快乐，都刚好落在你身上。
            </p>
          )}
        </div>

        {isBirthdayClear && (
          <div
            className="w-full max-w-sm mb-5 rounded-3xl p-4 shadow-xl border-2"
            style={{
              background: 'linear-gradient(165deg, #fff9ef 0%, #ffffff 55%, #fff4e4 100%)',
              borderColor: '#f0c56a',
              boxShadow: '0 12px 32px rgba(240, 170, 60, 0.22)'
            }}
          >
            <div className="flex items-end justify-between gap-2 mb-2">
              <div>
                <p className="text-[15px] font-semibold tracking-[0.18em]" style={{ color: '#c9892a' }}>
                  MESSAGE FOR TIANXIANG
                </p>
                <h2 className="text-lg font-bold mt-0.5" style={{ color: FRESH.text }}>
                  想对添添说的话
                </h2>
              </div>
              <span className="text-xs tabular-nums shrink-0" style={{ color: FRESH.textMuted }}>
                {Math.min(wishLen, BIRTHDAY_WISH_MAX)}/{BIRTHDAY_WISH_MAX}
              </span>
            </div>
            <textarea
              value={wishDraft}
              onChange={(e) => setWishDraft(clampBirthdayWishInput(e.target.value))}
              rows={4}
              placeholder="写下你想对添添说的话…"
              className="w-full resize-none rounded-2xl px-3.5 py-3 text-[24px] leading-relaxed outline-none border bg-white/90 focus:ring-2 placeholder:text-[18px]"
              style={{
                color: FRESH.text,
                borderColor: '#f0d29a',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
            />
            <button
              type="button"
              disabled={wishBusy || !wishDraft.trim() || (!wishDirty && Boolean(saveData.birthdayWish))}
              onClick={() => void onSubmitWish()}
              className="mt-3 w-full py-3 rounded-full text-base font-bold shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              style={{
                background: 'linear-gradient(135deg, #ffb347, #ff8c42)',
                color: '#fff8f0'
              }}
            >
              {wishBusy
                ? '同步中…'
                : !wishDirty && saveData.birthdayWish
                  ? wishSynced
                    ? '已送出 ✓'
                    : '已保存'
                  : '提交'}
            </button>
            <p
              className="mt-2 text-center text-xs leading-relaxed"
              style={{ color: wishSynced ? FRESH.teal : FRESH.textMuted }}
            >
              {wishHint ||
                (accountNickname ? (
                  <>
                    将在游戏首页留言墙滚动展示
                    <br />
                    寿星添添进入首页即可看到
                  </>
                ) : (
                  '建议先登录昵称账号，留言才能同步到云端'
                ))}
            </p>
          </div>
        )}

        <div className="bg-white/90 rounded-3xl p-4 w-full max-w-sm shadow-xl space-y-3 mb-6 border border-white/80">
          <div className="flex justify-between items-center pb-4 border-b border-white/60">
            <span className="font-medium" style={{ color: FRESH.textMuted }}>
              本关橙子
            </span>
            <span className="text-lg font-bold" style={{ color: FRESH.text }}>
              🍊 {stars}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium" style={{ color: FRESH.textMuted }}>
              累计总橙子
            </span>
            <span className="text-lg font-bold" style={{ color: FRESH.text }}>
              🍊 {saveData.totalOranges}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[16rem] pb-3">
          <button
            onClick={restartCurrentLevel}
            className={`w-full py-3 rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90 ${failBtnPrimary}`}
          >
            再玩一次
          </button>
          <button
            onClick={isLast ? goLevelSelect : goNextLevel}
            className={`w-full py-3 rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90 ${failBtnPrimary}`}
          >
            {isLast ? '返回主页' : '下一关'}
          </button>
          <button
            onClick={goLevelSelect}
            className={`w-full py-3 rounded-full text-lg font-bold shadow-sm transform active:scale-95 transition-all ${failBtnSecondary}`}
          >
            返回主页
          </button>
        </div>
        {adminMode && <p className="mt-3 text-xs text-red-500">管理员模式下可连续跳关测试</p>}
      </div>
    </div>
  );
};
