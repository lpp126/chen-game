/** 蓝绿 cinematic 风格：与首页封面统一的天光、青绿、玻璃 HUD */
export const FRESH = {
  bg: '#dcecf5',
  bgMid: '#cfe4f0',
  bgDeep: '#b8d9ef',
  bgGrad: 'linear-gradient(180deg, #eaf4fc 0%, #d6ecf8 38%, #c5e2f2 68%, #b5d8eb 100%)',
  text: '#1a3348',
  textMuted: '#5a7a92',
  textSoft: '#3d5a72',
  accent: '#3d8fd9',
  accentGlow: '#6bb5ff',
  accentSoft: '#e3f2fc',
  sage: '#3aab8e',
  rose: '#5a9fd4',
  mist: '#7eb8da',
  sand: '#7cb8a8',
  sky: '#4a9fd8',
  teal: '#2a9d8f',
  danger: '#c75b7a',
  success: '#3aab8e',
  cinematicDark: '#0a1628'
} as const;

export const PALETTE = [FRESH.sky, FRESH.sage, FRESH.mist, FRESH.teal, FRESH.rose] as const;

/** 手机端 UI 字号（rem，配合 html 32px 根字号） */
export const mobileTextMin = 'text-sm';
export const mobileTextTitle = 'text-base';
export const mobileContentInset = 'px-5';

export const freshHud =
  'absolute inset-x-4 top-14 flex flex-wrap justify-between gap-y-1 text-sm bg-white/65 backdrop-blur-md rounded-2xl px-4 py-2.5 text-[#1a3348] border border-white/70 shadow-[0_4px_20px_rgba(26,51,72,0.1)] z-40';

export const freshPause =
  'absolute right-4 top-4 z-[70] px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-white/75 text-sm text-[#1a3348] pointer-events-auto';

export const freshPrimary =
  'px-10 py-4 rounded-2xl font-bold text-white shadow-md active:scale-[0.98] transition-transform';

/** 统一 HUD：顶栏预留高度（供绝对定位关卡参考） */
export const LEVEL_TOP_RESERVED = 108;

/** 毛玻璃面板（选关顶栏、游戏 TopBar 共用） */
export const hudGlass =
  'rounded-[1.15rem] bg-white/68 backdrop-blur-xl border border-white/75 shadow-[0_4px_24px_rgba(26,51,72,0.1)]';

export const hudPauseBtn =
  'shrink-0 px-3 py-1.5 rounded-xl bg-white/80 border border-white/85 text-sm font-semibold text-[#1a3348] shadow-sm active:scale-95 transition-transform';

export const hudStatPill =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/55 border border-white/70 text-sm text-[#1a3348]';

export const pauseOverlay =
  'absolute inset-0 flex items-center justify-center px-10 bg-[#0a1628]/40 backdrop-blur-[8px] pointer-events-auto';

export const pausePanel =
  'w-full max-w-[420px] rounded-[1.35rem] bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_16px_48px_rgba(26,51,72,0.2)] px-5 py-5';

export const pauseBtnPrimary =
  'w-full py-3 rounded-2xl text-base font-bold text-white border border-white/40 shadow-[0_8px_24px_rgba(61,143,217,0.35)] active:scale-[0.98] transition-transform';

export const pauseBtnSecondary =
  'w-full py-2.5 rounded-2xl text-sm font-semibold text-[#1a3348] bg-white/75 border border-white/80 active:scale-[0.98] transition-transform';

/** 关卡失败弹窗（与第 9 关等共用） */
export const failOverlay =
  'absolute inset-0 z-[90] bg-[#0a1628]/35 backdrop-blur-[6px] flex items-center justify-center px-10';

export const failPanel =
  'w-full rounded-3xl bg-white/92 backdrop-blur-xl border border-white/80 p-6 text-center space-y-3 shadow-[0_16px_40px_rgba(26,51,72,0.15)]';

export const failBtnPrimary =
  'w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] active:scale-[0.98]';

export const failBtnSecondary = 'w-full py-3 rounded-xl font-semibold text-[#1a3348] bg-[#e3f2fc] active:scale-[0.98]';
