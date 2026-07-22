/** 各关共用 WebAudio 音效（无外部音频文件） */

import { isMuted } from './audioManager';

type Osc = OscillatorType;

let sharedCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (isMuted()) return null;
  const Ctx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
};

export const makeTone = (
  from: number,
  to: number,
  ms: number,
  gainPeak = 0.11,
  type: Osc = 'triangle'
) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, from), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + ms / 1000);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.04);
};

/** 短促和弦（通关感） */
export const makeChord = (freqs: number[], ms = 320, gainPeak = 0.08, type: Osc = 'sine') => {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    const peak = gainPeak * (1 - i * 0.12);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, peak), t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.05);
  });
};

// —— 通用反馈 ——
export const playCorrect = () => makeTone(520, 880, 150, 0.11);
export const playWrong = () => makeTone(220, 130, 190, 0.11, 'sawtooth');
export const playWin = () => makeChord([523, 659, 784, 1046], 380, 0.09);
export const playTap = () => makeTone(560, 720, 80, 0.09);
export const playPop = () => makeTone(680, 1020, 110, 0.1);

/** 记忆灯：按色号变调 */
export const playToneIndex = (i: number) => {
  const base = [392, 494, 587, 698][i % 4];
  makeTone(base, base * 1.15, 140, 0.1, 'sine');
};

// —— 主题动作音 ——
export const playStep = () => makeTone(180, 240, 70, 0.08, 'sine');
export const playJump = () => makeTone(300, 520, 100, 0.1, 'triangle');
export const playLand = () => makeTone(160, 110, 90, 0.1, 'sine');
export const playCollect = () => makeTone(760, 1180, 140, 0.12);
export const playDrop = () => makeTone(420, 180, 160, 0.1, 'triangle');
export const playThud = () => makeTone(90, 60, 140, 0.12, 'sine');
export const playFlip = () => makeTone(480, 640, 90, 0.09, 'square');
export const playMatch = () => makeChord([660, 880], 200, 0.09);
export const playToggle = () => makeTone(400, 560, 80, 0.09);
export const playSwipe = () => makeTone(280, 420, 100, 0.08, 'sawtooth');
export const playMerge = () => makeTone(300, 560, 140, 0.1);
export const playLock = () => makeTone(360, 280, 160, 0.1, 'triangle');
export const playUnlock = () => makeChord([440, 554, 659], 260, 0.085);
export const playTick = () => makeTone(880, 880, 40, 0.06, 'square');
export const playWhoosh = () => makeTone(500, 200, 180, 0.08, 'sawtooth');
export const playSparkle = () => makeTone(900, 1400, 160, 0.09, 'sine');
export const playBridge = () => makeTone(220, 340, 200, 0.09, 'triangle');
export const playCandle = () => makeTone(620, 860, 130, 0.09, 'sine');
export const playSplash = () => makeTone(200, 90, 180, 0.1, 'sawtooth');
export const playSoftClick = () => makeTone(640, 700, 60, 0.07);
export const playDeal = () => makeTone(500, 380, 80, 0.08, 'triangle');
export const playAccent = () => makeTone(740, 980, 100, 0.1);

/** 按关卡取一组「推荐音效」别名，便于各关统一语义 */
export type LevelSfxPack = {
  ok: () => void;
  bad: () => void;
  win: () => void;
  act: () => void;
};

export const getLevelSfx = (levelId: number): LevelSfxPack => {
  const packs: Record<number, LevelSfxPack> = {
    1: { ok: playCorrect, bad: playWrong, win: playWin, act: playTap },
    2: { ok: playStep, bad: playWrong, win: playWin, act: playSoftClick },
    3: { ok: playCollect, bad: playLand, win: playWin, act: playJump },
    4: { ok: playThud, bad: playWrong, win: playWin, act: playDrop },
    5: { ok: playCorrect, bad: playWrong, win: playWin, act: playPop },
    6: { ok: playMatch, bad: playWrong, win: playWin, act: playPop },
    7: { ok: playMerge, bad: playWrong, win: playWin, act: playSwipe },
    8: { ok: playCorrect, bad: playWrong, win: playWin, act: playDeal },
    9: { ok: playCorrect, bad: playWrong, win: playWin, act: playTick },
    10: { ok: playCorrect, bad: playWrong, win: playWin, act: playToggle },
    11: { ok: playSparkle, bad: playWrong, win: playWin, act: playSoftClick },
    12: { ok: playMatch, bad: playWrong, win: playWin, act: playFlip },
    13: { ok: playCorrect, bad: playSplash, win: playWin, act: playBridge },
    14: { ok: playAccent, bad: playWrong, win: playWin, act: playPop },
    15: { ok: playCorrect, bad: playWrong, win: playWin, act: playPop },
    16: { ok: playCorrect, bad: playWrong, win: playWin, act: playSoftClick },
    17: { ok: playLock, bad: playWrong, win: playWin, act: playFlip },
    18: { ok: playUnlock, bad: playWrong, win: playWin, act: playTick },
    19: { ok: playThud, bad: playWrong, win: playWin, act: playDrop },
    20: { ok: playCorrect, bad: playWrong, win: playWin, act: playSoftClick },
    21: { ok: playCorrect, bad: playWrong, win: playWin, act: playDeal },
    22: { ok: playCorrect, bad: playWrong, win: playWin, act: playToneIndex.bind(null, 0) },
    23: { ok: playSparkle, bad: playWrong, win: playWin, act: playSoftClick },
    24: { ok: playCandle, bad: playWrong, win: playWin, act: playWhoosh }
  };
  return packs[levelId] ?? { ok: playCorrect, bad: playWrong, win: playWin, act: playTap };
};
