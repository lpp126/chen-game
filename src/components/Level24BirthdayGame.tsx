import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCandle, playCorrect, playWhoosh, playWin, playWrong } from '../utils/levelAudio';

/** 第4小关不减数量：降速 + 更松碰撞 + 越插越慢（不低于 minSpeed） */
const STAGES = [
  { candles: 6, speed: 70, collision: 7, easeLate: false, minSpeed: 70 },
  { candles: 8, speed: 95, collision: 7, easeLate: false, minSpeed: 95 },
  { candles: 10, speed: 120, collision: 7, easeLate: false, minSpeed: 120 },
  { candles: 24, speed: 80, collision: 3, easeLate: true, minSpeed: 60 }
];

const DISK_R = 132;
const CANDLE_LEN = 52;
const SIZE = 430;
const CAKE = '#f3d5a8';
const CAKE_EDGE = '#d4a574';
const FLAME = '#ffb347';
const FLAME_CORE = '#ff6b4a';
/** 生日蜡烛多色循环 */
const CANDLE_COLORS = ['#ff6b8a', '#ffb347', '#ffe066', '#7bdcb5', '#6ec6ff', '#b794f6', '#ff8fab', '#5eead4'];

const candleColor = (i: number) => CANDLE_COLORS[i % CANDLE_COLORS.length];

const normAngle = (a: number) => {
  let x = a % 360;
  if (x < 0) x += 360;
  return x;
};

const angDist = (a: number, b: number) => {
  const d = Math.abs(normAngle(a) - normAngle(b));
  return Math.min(d, 360 - d);
};

/** 沿圆盘径向画一根蜡烛（含火苗） */
const CandleMark: React.FC<{
  cx: number;
  cy: number;
  angle: number;
  color: string;
  flying?: boolean;
}> = ({ cx, cy, angle, color, flying }) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const base = flying ? DISK_R - 6 : DISK_R - 4;
  const tip = flying ? DISK_R - 6 + CANDLE_LEN : DISK_R + CANDLE_LEN;
  const x1 = cx + cos * base;
  const y1 = cy + sin * base;
  const x2 = cx + cos * tip;
  const y2 = cy + sin * tip;
  const fx = cx + cos * (tip + 7);
  const fy = cy + sin * (tip + 7);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={fx} cy={fy} r={4.5} fill={FLAME} />
      <circle cx={fx} cy={fy} r={2.2} fill={FLAME_CORE} />
    </g>
  );
};

export const Level24BirthdayGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    completeLevel,
    adminMode,
    testCompleteLevel,
    runId
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 24;

  const [stageIdx, setStageIdx] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(STAGES[0].candles);
  const [rotation, setRotation] = useState(0);
  const [flying, setFlying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [misses, setMisses] = useState(0);

  const rotRef = useRef(0);
  const placedRef = useRef<number[]>([]);
  const remainingRef = useRef(STAGES[0].candles);
  const stageRef = useRef(0);
  const flyingRef = useRef(false);
  const endedRef = useRef(false);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  const stage = STAGES[stageIdx];

  const succeedAll = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const stars = misses === 0 ? 3 : misses === 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, misses]);

  const resetStage = useCallback((idx: number) => {
    stageRef.current = idx;
    setStageIdx(idx);
    setPlaced([]);
    placedRef.current = [];
    const n = STAGES[idx].candles;
    setRemaining(n);
    remainingRef.current = n;
    setFlying(false);
    flyingRef.current = false;
    setFailed(false);
    rotRef.current = 0;
    setRotation(0);
    lastTsRef.current = 0;
  }, []);

  useEffect(() => {
    pausedRef.current = gameplayPaused;
  }, [gameplayPaused]);

  useEffect(() => {
    if (!isActive) return;
    endedRef.current = false;
    setMisses(0);
    setEnded(false);
    resetStage(0);

    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      if (!pausedRef.current && !endedRef.current) {
        const s = STAGES[stageRef.current];
        const placedN = s.candles - remainingRef.current;
        const progress = placedN / Math.max(1, s.candles);
        const spd = s.easeLate
          ? s.speed + (s.minSpeed - s.speed) * progress
          : s.speed;
        rotRef.current = normAngle(rotRef.current + spd * dt);
        setRotation(rotRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, runId, resetStage]);

  const fire = () => {
    if (!isActive || gameplayPaused || ended || failed || flyingRef.current) return;
    if (remainingRef.current <= 0) return;

    // 点击瞬间锁定角度，避免飞行延迟导致偏差
    const lockAngle = normAngle(180 - rotRef.current);
    const collision = STAGES[stageRef.current].collision;
    flyingRef.current = true;
    setFlying(true);
    playWhoosh();

    window.setTimeout(() => {
      const hit = placedRef.current.some((a) => angDist(a, lockAngle) < collision);
      if (hit) {
        playWrong();
        flyingRef.current = false;
        setFlying(false);
        setMisses((m) => m + 1);
        endedRef.current = true;
        setEnded(true);
        setFailed(true);
        return;
      }

      playCandle();
      playCorrect();
      const nextPlaced = [...placedRef.current, lockAngle];
      placedRef.current = nextPlaced;
      setPlaced(nextPlaced);
      const left = remainingRef.current - 1;
      remainingRef.current = left;
      setRemaining(left);
      flyingRef.current = false;
      setFlying(false);

      if (left <= 0) {
        if (stageRef.current + 1 >= STAGES.length) {
          succeedAll();
        } else {
          window.setTimeout(() => resetStage(stageRef.current + 1), 500);
        }
      }
    }, 180);
  };

  if (!isActive) return null;

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🕯️ 二十四烛光"
        onPause={() => setGameplayPaused(true)}
        hint="点击插上蜡烛，别让蜡烛撞在一起"
        stats={[
          { label: '关', value: `${Math.min(stageIdx + 1, STAGES.length)}/${STAGES.length}` },
          { label: '剩余', value: String(remaining) }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-4">
        <button
          type="button"
          onClick={fire}
          disabled={flying || failed || ended}
          className="relative active:scale-[0.99] disabled:opacity-80"
          style={{ width: SIZE, height: SIZE }}
          aria-label="插入蜡烛"
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="drop-shadow-md">
            {!flying && remaining > 0 && !failed && !ended && (
              <g>
                <rect
                  x={cx - 3}
                  y={cy + DISK_R + 8}
                  width={6}
                  height={CANDLE_LEN}
                  rx={2}
                  fill={candleColor(placed.length)}
                  stroke="rgba(255,255,255,0.45)"
                />
                <circle cx={cx} cy={cy + DISK_R + 8 + CANDLE_LEN + 5} r={4.5} fill={FLAME} />
                <circle cx={cx} cy={cy + DISK_R + 8 + CANDLE_LEN + 5} r={2.2} fill={FLAME_CORE} />
              </g>
            )}
            {flying && <CandleMark cx={cx} cy={cy} angle={180} color={candleColor(placed.length)} flying />}

            <g transform={`rotate(${rotation} ${cx} ${cy})`}>
              <circle cx={cx} cy={cy} r={DISK_R} fill={CAKE} stroke={CAKE_EDGE} strokeWidth={4} />
              <circle cx={cx} cy={cy} r={DISK_R - 14} fill="none" stroke="#fff6e8" strokeWidth={6} opacity={0.7} />
              <circle cx={cx} cy={cy} r={18} fill="#e8b4c8" stroke="#d48aa8" strokeWidth={2} />
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14}>
                🎂
              </text>
              {placed.map((a, i) => (
                <CandleMark key={i} cx={cx} cy={cy} angle={a} color={candleColor(i)} />
              ))}
            </g>
          </svg>
        </button>

        <p className="text-sm font-semibold" style={{ color: FRESH.textSoft }}>
          本关需插入 {stage.candles} 根蜡烛
        </p>
        <button
          type="button"
          onClick={fire}
          disabled={flying || failed || ended || remaining <= 0}
          className="px-10 py-3 rounded-2xl font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
          style={{ background: FRESH.accent }}
        >
          插蜡烛
        </button>
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/40 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold" style={{ color: FRESH.text }}>
              蜡烛撞到一起了！
            </h3>
            <p className="text-sm" style={{ color: FRESH.textMuted }}>
              两根蜡烛靠得太近
            </p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}

      {adminMode && (
        <div className="absolute right-4 top-36 z-50">
          <button type="button" onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            测试通关
          </button>
        </div>
      )}
    </div>
  );
};
