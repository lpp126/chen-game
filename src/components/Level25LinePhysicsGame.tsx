import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playSoftClick, playWin, playWrong } from '../utils/levelAudio';
import { LinePhysicsEngine, type Polyline } from '../game/linePhysics/engine';
import { LEVEL25_MAX_LIVES, LEVEL25_STAGES } from '../data/level25Stages';

type Props = {
  /** 挂载在第几关（默认 25；并入 13 时传 13） */
  hostLevelId?: number;
  stageLabel?: string;
  /** 全部折线小关清完时回调（优先于直接 completeLevel） */
  onAllClear?: (lostLives: number) => void;
  /** 与搭桥小关统一的天蓝青绿配色 */
  skyTheme?: boolean;
};

const SKY = {
  page: 'linear-gradient(180deg, #eaf4fc 0%, #d6ecf8 40%, #c5e2f2 70%, #a8d4ef 100%)',
  board: '#eef7fc',
  letter: '#cfe8f8',
  grid: '#b7d4ea',
  line: '#2a6f96',
  moving: '#2f9d88',
  bounce: '#c75b7a',
  bounceArrow: '#e07a96',
  okRing: '#3aab8e',
  badRing: '#c75b7a'
} as const;

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  head: { x: number; y: number },
  dir: { x: number; y: number },
  color: string
) => {
  const len = 16;
  const tip = { x: head.x + dir.x * len, y: head.y + dir.y * len };
  const base = { x: head.x - dir.x * 1, y: head.y - dir.y * 1 };
  const wing = 8;
  const px = -dir.y;
  const py = dir.x;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(base.x + px * wing, base.y + py * wing);
  ctx.lineTo(base.x - px * wing, base.y - py * wing);
  ctx.closePath();
  ctx.fill();
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: Polyline,
  engine: LinePhysicsEngine,
  sky: boolean
) => {
  const bounce = line.state === 'bounce';
  const moving = line.state === 'moving';
  const stroke = bounce
    ? sky
      ? SKY.bounce
      : '#e74c5c'
    : moving
      ? sky
        ? SKY.moving
        : '#2a5f8e'
      : sky
        ? SKY.line
        : '#152a45';
  const width = bounce ? 10 : 8;
  const { head, dir } = engine.arrowMeta(line);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  const pts = line.points;
  const inset = 10;
  for (let i = 0; i < pts.length; i += 1) {
    let p = pts[i];
    if (i === pts.length - 1 && line.head !== 'start') {
      p = { x: head.x - dir.x * inset, y: head.y - dir.y * inset };
    } else if (i === 0 && line.head === 'start') {
      p = { x: head.x - dir.x * inset, y: head.y - dir.y * inset };
    }
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  const tail = line.head === 'start' ? pts[pts.length - 1] : pts[0];
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.arc(tail.x, tail.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  drawArrow(ctx, head, dir, bounce ? (sky ? SKY.bounceArrow : '#ff6b7a') : stroke);
};

export const Level25LinePhysicsGame: React.FC<Props> = ({
  hostLevelId = 25,
  stageLabel,
  onAllClear,
  skyTheme = false
}) => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    completeLevel,
    adminMode,
    testCompleteLevel,
    runId
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === hostLevelId;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LinePhysicsEngine | null>(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const stageIdxRef = useRef(0);
  const livesRef = useRef(LEVEL25_MAX_LIVES);
  const endedRef = useRef(false);
  const pausedRef = useRef(false);
  /** 逻辑坐标 → 画布 CSS 的 contain 变换 */
  const viewRef = useRef({ scale: 1, ox: 0, oy: 0, cssW: 1, cssH: 1 });

  const [stageIdx, setStageIdx] = useState(0);
  const [lives, setLives] = useState(LEVEL25_MAX_LIVES);
  const [remain, setRemain] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const stage = LEVEL25_STAGES[stageIdx] ?? LEVEL25_STAGES[0];
  const totalStages = LEVEL25_STAGES.length;

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const lost = LEVEL25_MAX_LIVES - livesRef.current;
    window.setTimeout(() => {
      if (onAllClear) onAllClear(lost);
      else {
        const stars = lost === 0 ? 3 : lost === 1 ? 2 : 1;
        completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
      }
    }, 320);
  }, [completeLevel, onAllClear]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  const loadStage = useCallback(
    (idx: number) => {
      const cfg = LEVEL25_STAGES[idx];
      if (!cfg) return;
      const engine = new LinePhysicsEngine({
        speed: 400,
        hitThreshold: 22,
        bounceDuration: 0.48,
        bounds: { x: 0, y: 0, w: cfg.width, h: cfg.height },
        boundsMargin: 36
      });
      engine.load(cfg.lines);
      engine.on((e) => {
        if (e.type === 'cleared') {
          playCorrect();
          setFlash('ok');
          window.setTimeout(() => setFlash(null), 220);
          setRemain(engine.lines.length);
        } else if (e.type === 'bounce') {
          playWrong();
          setFlash('bad');
          window.setTimeout(() => setFlash(null), 280);
          const nl = livesRef.current - 1;
          livesRef.current = nl;
          setLives(nl);
          if (nl <= 0) fail();
        } else if (e.type === 'win') {
          const next = stageIdxRef.current + 1;
          if (next >= LEVEL25_STAGES.length) succeed();
          else {
            playCorrect();
            window.setTimeout(() => {
              stageIdxRef.current = next;
              setStageIdx(next);
              loadStage(next);
            }, 380);
          }
        }
      });
      engineRef.current = engine;
      setRemain(engine.lines.length);
    },
    [fail, succeed]
  );

  const resetRun = useCallback(() => {
    endedRef.current = false;
    livesRef.current = LEVEL25_MAX_LIVES;
    stageIdxRef.current = 0;
    setStageIdx(0);
    setLives(LEVEL25_MAX_LIVES);
    setEnded(false);
    setFailed(false);
    setFlash(null);
    loadStage(0);
  }, [loadStage]);

  useEffect(() => {
    if (!isActive) return;
    resetRun();
  }, [isActive, runId, resetRun]);

  useEffect(() => {
    pausedRef.current = gameplayPaused || ended || failed;
  }, [gameplayPaused, ended, failed]);

  const skyThemeRef = useRef(skyTheme);
  skyThemeRef.current = skyTheme;

  useEffect(() => {
    if (!isActive) return;
    lastTsRef.current = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const sky = skyThemeRef.current;
      if (engine && canvas && !pausedRef.current) {
        engine.update(dt);
      }
      if (engine && canvas && wrap) {
        const ctx = canvas.getContext('2d');
        const cfg = LEVEL25_STAGES[stageIdxRef.current];
        if (ctx && cfg) {
          const dpr = window.devicePixelRatio || 1;
          const cssW = wrap.clientWidth || cfg.width;
          const cssH = wrap.clientHeight || cfg.height;
          if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
            canvas.width = Math.floor(cssW * dpr);
            canvas.height = Math.floor(cssH * dpr);
          }
          const scale = Math.min(cssW / cfg.width, cssH / cfg.height);
          const ox = (cssW - cfg.width * scale) / 2;
          const oy = (cssH - cfg.height * scale) / 2;
          viewRef.current = { scale, ox, oy, cssW, cssH };

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
          ctx.fillStyle = sky ? SKY.letter : '#dfe8f0';
          ctx.fillRect(0, 0, cssW, cssH);

          ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

          ctx.fillStyle = sky ? SKY.board : '#eef3f7';
          ctx.fillRect(0, 0, cfg.width, cfg.height);
          // 柔和天光底
          if (sky) {
            const g = ctx.createLinearGradient(0, 0, 0, cfg.height);
            g.addColorStop(0, '#f3f9fd');
            g.addColorStop(0.55, '#e8f4fb');
            g.addColorStop(1, '#d9eef8');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, cfg.width, cfg.height);
          }
          ctx.strokeStyle = sky ? SKY.grid : '#d5e0ea';
          ctx.lineWidth = 1;
          const grid = 18;
          for (let x = 0; x <= cfg.width; x += grid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, cfg.height);
            ctx.stroke();
          }
          for (let y = 0; y <= cfg.height; y += grid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cfg.width, y);
            ctx.stroke();
          }

          // 圆角盘面描边
          if (sky) {
            ctx.strokeStyle = 'rgba(74,159,216,0.35)';
            ctx.lineWidth = 3;
            ctx.strokeRect(2, 2, cfg.width - 4, cfg.height - 4);
          }

          for (const line of engine.lines) drawLine(ctx, line, engine, sky);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive]);

  const toLocal = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const cfg = LEVEL25_STAGES[stageIdxRef.current];
    if (!canvas || !cfg) return null;
    // 必须用 getBoundingClientRect（含父级 scale），与点击坐标同一空间
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const scale = Math.min(rect.width / cfg.width, rect.height / cfg.height);
    if (scale < 1e-6) return null;
    const ox = (rect.width - cfg.width * scale) / 2;
    const oy = (rect.height - cfg.height * scale) / 2;
    return {
      x: (clientX - rect.left - ox) / scale,
      y: (clientY - rect.top - oy) / scale
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (pausedRef.current || endedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toLocal(e.clientX, e.clientY);
    if (!p || !engineRef.current) return;
    playSoftClick();
    engineRef.current.pointerDown(p.x, p.y);
  };

  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden"
      style={{ background: skyTheme ? SKY.page : FRESH.bgGrad }}
    >
      <LevelTopBar
        title={skyTheme ? `🌊 折线过河 ${stageIdx + 1}/${totalStages} · ${stage.name}` : `➡️ 折线逃生 ${stageIdx + 1}/${totalStages} · ${stage.name}`}
        onPause={() => setGameplayPaused(true)}
        hint={
          stageLabel
            ? `${stageLabel} · 点击折线沿箭头滑出，撞线扣命`
            : '点击折线，沿箭头滑出；撞线扣命'
        }
        stats={[
          ...(stageLabel ? [{ label: '进度', value: stageLabel }] : []),
          { label: '盘面', value: `${stageIdx + 1}/${totalStages}` },
          { label: '剩余', value: `${remain}` },
          { label: '生命', value: `${lives}/${LEVEL25_MAX_LIVES}` }
        ]}
      />
      <div ref={wrapRef} className="flex-1 min-h-0 relative px-3 pb-3 pt-1" style={{ overflow: 'hidden' }}>
        {skyTheme && (
          <>
            <div className="pointer-events-none absolute top-8 left-6 w-20 h-9 rounded-full bg-white/45" />
            <div className="pointer-events-none absolute top-14 right-10 w-24 h-10 rounded-full bg-white/35" />
          </>
        )}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 z-10 w-full h-full ${skyTheme ? 'rounded-[1.35rem]' : 'rounded-2xl'}`}
          style={{
            touchAction: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            boxShadow: flash === 'bad'
              ? `0 0 0 3px ${skyTheme ? SKY.badRing : '#e74c5c'}`
              : flash === 'ok'
                ? `0 0 0 3px ${skyTheme ? SKY.okRing : '#3d8bfd'}`
                : skyTheme
                  ? '0 8px 28px rgba(42,111,150,0.18)'
                  : undefined
          }}
          onPointerDown={onPointerDown}
        />
        {(ended || failed) && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(234,244,252,.62)' }}
          >
            <div
              className="rounded-3xl bg-white/92 border border-white/80 px-8 py-5 shadow-lg"
              style={{ color: failed ? FRESH.danger : FRESH.text }}
            >
              <div className="text-2xl font-extrabold text-center">{failed ? '失败了' : '通关！'}</div>
            </div>
          </div>
        )}
      </div>
      {adminMode && (
        <button
          type="button"
          onClick={() => testCompleteLevel()}
          style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 20 }}
        >
          跳过
        </button>
      )}
    </div>
  );
};
