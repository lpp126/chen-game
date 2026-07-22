import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { DESIGN_HEIGHT, FRESH } from '../utils/levelTheme';
import { unlockAudio } from '../utils/audioManager';
import { AccountSyncModal } from './AccountSyncModal';
import { WishWallModal } from './WishWallModal';

const HOME_COVER = '/images/首页封面.webp';

/** 750×1334 设计稿：slogan 约在 y≈1218，按钮底边与其留空 */
const START_BTN_BOTTOM_PX = Math.round(DESIGN_HEIGHT * 0.165);

export const HomeScreen: React.FC = () => {
  const { status, goLevelSelect, accountNickname, adminMode, showAdminLogin, showAdminLoginModal, loginAdmin, hydrateCloudSave } =
    useGameStore();
  const timerRef = useRef<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [wishWallOpen, setWishWallOpen] = useState(false);

  if (status !== 'home') return null;

  const startPress = () => {
    timerRef.current = window.setTimeout(() => {
      showAdminLoginModal(true);
    }, 3000);
  };

  const endPress = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleLogin = () => {
    if (!loginAdmin(username, password)) {
      setError('账号或密码错误');
      return;
    }
    setError('');
    setUsername('');
    setPassword('');
    window.alert('管理员模式已开启');
  };

  const enterGame = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unlockAudio();
    if (accountNickname || adminMode) {
      void hydrateCloudSave();
      goLevelSelect();
      return;
    }
    setLoginOpen(true);
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden bg-[#0a1628]">
      <img
        src={HOME_COVER}
        alt="24帧人生"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        draggable={false}
      />

      <button
        type="button"
        onClick={() => setWishWallOpen(true)}
        className="absolute top-4 right-3.5 z-30 flex items-center gap-1.5 px-3 h-9 rounded-full border border-white/70 text-[22px] font-bold text-white active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, rgba(255,179,71,0.92), rgba(255,140,66,0.92))',
          boxShadow: '0 5px 14px rgba(255,140,66,0.32)'
        }}
      >
        <span className="text-[26px]" aria-hidden>
          💌
        </span>
        留言墙
      </button>

      <button
        type="button"
        onClick={enterGame}
        className="absolute left-1/2 z-30 flex h-[72px] w-[320px] -translate-x-1/2 items-center justify-center gap-3 rounded-full border border-white/75 text-[28px] font-bold leading-none tracking-[0.08em] text-white whitespace-nowrap active:scale-[0.97] transition-transform touch-manipulation"
        style={{
          bottom: START_BTN_BOTTOM_PX,
          background: 'linear-gradient(90deg, #3a9fc4 0%, #45b896 100%)',
          boxShadow: '0 6px 22px rgba(26, 80, 140, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        }}
        aria-label="进入游戏"
      >
        <span className="text-[18px] text-white/90 leading-none" aria-hidden>
          ✦
        </span>
        进入游戏
        <span className="text-[18px] text-white/90 leading-none" aria-hidden>
          ✦
        </span>
      </button>

      <div
        className="absolute inset-x-0 bottom-0 h-[4%] z-10"
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      />

      {showAdminLogin && (
        <div className="absolute inset-0 z-[60] bg-black/40 flex items-center justify-center px-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-[20rem]">
            <h3 className="text-lg font-bold mb-4 text-center" style={{ color: FRESH.text }}>
              管理员登录
            </h3>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="账号"
              className="w-full rounded-xl px-3 py-2 mb-3 text-sm border"
              style={{ borderColor: `${FRESH.mist}88` }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full rounded-xl px-3 py-2 mb-2 text-sm border"
              style={{ borderColor: `${FRESH.mist}88` }}
            />
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` }}
              >
                登录
              </button>
              <button
                onClick={() => showAdminLoginModal(false)}
                className="flex-1 border rounded-xl py-2 text-sm font-semibold"
                style={{ borderColor: `${FRESH.mist}88`, color: FRESH.text }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <AccountSyncModal open={loginOpen} required onClose={() => setLoginOpen(false)} />
      <WishWallModal open={wishWallOpen} onClose={() => setWishWallOpen(false)} />
    </div>
  );
};
