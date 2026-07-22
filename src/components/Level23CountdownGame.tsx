import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playSparkle, playWin, playWrong } from '../utils/levelAudio';

const TARGET = 6;
const MAX_MISS = 3;

type ShiftMode = 'lightness' | 'saturation' | 'hue';

type RoundTheme = {
  hex: string;
  label: string;
  mode: ShiftMode;
  /** 色差强度（随轮次递减，但仍可肉眼分辨） */
  delta: number;
  /** 网格边长：3→3→4→4→5→6 */
  size: number;
};

/** 6 小关：方格递增，色差递减小一档 */
const ROUND_THEMES: RoundTheme[] = [
  { hex: '#cda7a7', label: '玫瑰粉', mode: 'lightness', delta: 22, size: 3 },
  { hex: '#9eb39f', label: '薄荷绿', mode: 'lightness', delta: 16, size: 3 },
  { hex: '#9caec3', label: '雾蓝色', mode: 'saturation', delta: 12, size: 4 },
  { hex: '#ccb494', label: '暖沙色', mode: 'lightness', delta: 9, size: 4 },
  { hex: '#aac2d8', label: '天青色', mode: 'saturation', delta: 7, size: 5 },
  { hex: '#d4a574', label: '琥珀色', mode: 'hue', delta: 5, size: 6 }
];

type Round = {
  colors: string[];
  odd: number;
  theme: RoundTheme;
  roundIndex: number;
};

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return [h * 360, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
};

const makeOddColor = (baseHex: string, mode: ShiftMode, delta: number): string => {
  const [r, g, b] = hexToRgb(baseHex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const sign = Math.random() > 0.5 ? 1 : -1;

  if (mode === 'lightness') {
    l = clamp(l + sign * delta, 10, 90);
  } else if (mode === 'saturation') {
    s = clamp(s + sign * delta, 8, 92);
  } else {
    h = (h + sign * delta + 360) % 360;
  }

  const [nr, ng, nb] = hslToRgb(h, s, l);
  return rgbToHex(nr, ng, nb);
};

const makeRound = (roundIndex: number): Round => {
  const theme = ROUND_THEMES[Math.min(roundIndex, ROUND_THEMES.length - 1)];
  const cells = theme.size * theme.size;
  const odd = Math.floor(Math.random() * cells);
  const oddColor = makeOddColor(theme.hex, theme.mode, theme.delta);
  const colors = Array.from({ length: cells }, (_, i) => (i === odd ? oddColor : theme.hex));
  return { colors, odd, theme, roundIndex };
};

const difficultyLabel = (roundIndex: number): string => {
  if (roundIndex <= 1) return '简单';
  if (roundIndex <= 3) return '中等';
  return '困难';
};

const cellSizeClass = (size: number): string => {
  if (size <= 3) return 'w-20 h-20';
  if (size === 4) return 'w-14 h-14';
  if (size === 5) return 'w-11 h-11';
  return 'w-9 h-9';
};

export const Level23CountdownGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 23;

  const [round, setRound] = useState<Round>(() => makeRound(0));
  const [done, setDone] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses <= 2) return 2;
    return 1;
  }, [failed, misses]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setRound(makeRound(0));
    setDone(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId]);

  const tap = (i: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    if (i === round.odd) {
      playSparkle();
      playCorrect();
      const nd = done + 1;
      setDone(nd);
      if (nd >= TARGET) window.setTimeout(succeed, 400);
      else setRound(makeRound(nd));
    } else {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) setFailed(true);
        return nm;
      });
    }
  };

  if (!isActive) return null;

  const size = round.theme.size;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🎨 色差分毫"
        onPause={() => setGameplayPaused(true)}
        hint={`${size}×${size} · 色差越来越小，找出那一格`}
        stats={[
          { label: '进度', value: `${done}/${TARGET}` },
          { label: '网格', value: `${size}×${size}` },
          { label: '难度', value: difficultyLabel(round.roundIndex) },
          { label: '失误', value: `${misses}/${MAX_MISS}` }
        ]}
      />
      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div
          className="gap-1.5 p-3 rounded-3xl bg-white/80 border border-white shadow-lg"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {round.colors.map((c, i) => (
            <button
              key={`${done}-${round.theme.label}-${i}`}
              type="button"
              onClick={() => tap(i)}
              className={`${cellSizeClass(size)} rounded-xl border-2 border-white shadow-md active:scale-95 transition-transform`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <p className="text-[#1a3348] font-semibold">失误太多，再试一次吧</p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
