import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../utils/levelTheme';

type PlatformType = 'basic' | 'cloud' | 'moving-horizontal' | 'moving-vertical' | 'swing';
type Platform = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PlatformType;
  color?: string;
  phase?: number;
  amplitude?: number;
  speed?: number;
  rope?: number;
};

type Collectible = {
  id: string;
  x: number;
  y: number;
  collected: boolean;
};

const VIEW_W = DESIGN_WIDTH;
const VIEW_H = DESIGN_HEIGHT;
const WORLD_H = VIEW_H * 4;
const BABY_W = 56;
const BABY_H = 72;
const GRAVITY = 0.66;
const MOVE_SPEED = 4.8;
const JUMP_SPEED = -15.2;
const CLOUD_BONUS = 1.5;
const DEEP_PIT_Y = WORLD_H + 180;
const CONTROL_SAFE_H = 220; // 底部按钮安全留白，不渲染关卡画面
const PLAY_VIEW_H = VIEW_H - CONTROL_SAFE_H;
const CAMERA_PLAYER_RATIO = 0.52; // 基于可视游戏区，让宝宝停留在中部略偏下
const START_POS = { x: 120, y: WORLD_H - 430 }; // 初始点上移，避免被底部按钮遮挡
const COLORS = ['#c08f8f', '#d6b584', '#8aa3c4', '#90b49b'];
const BABY_SPRITE = '/images/背带裤小添.png';

const createPlatforms = (): Platform[] => [
  { id: 'ground', x: 70, y: WORLD_H - 120, w: 220, h: 42, type: 'basic', color: '#8aa3c4' },
  { id: 'p1', x: 360, y: WORLD_H - 250, w: 180, h: 38, type: 'basic', color: '#d6b584' },
  { id: 'p2', x: 120, y: WORLD_H - 380, w: 180, h: 38, type: 'cloud' },
  { id: 'p3', x: 420, y: WORLD_H - 560, w: 170, h: 38, type: 'moving-horizontal', color: '#90b49b', amplitude: 80, speed: 0.0013, phase: 0.2 },
  { id: 'p4', x: 170, y: WORLD_H - 770, w: 150, h: 38, type: 'swing', color: '#c08f8f', amplitude: 80, speed: 0.0017, rope: 86, phase: 0.4 },
  { id: 'cp1base', x: 420, y: WORLD_H - 920, w: 210, h: 38, type: 'basic', color: '#8aa3c4' },
  { id: 'p5', x: 100, y: WORLD_H - 1090, w: 150, h: 38, type: 'moving-vertical', color: '#d6b584', amplitude: 90, speed: 0.0014, phase: 0.3 },
  { id: 'p6', x: 400, y: WORLD_H - 1280, w: 170, h: 38, type: 'basic', color: '#90b49b' },
  { id: 'p7', x: 110, y: WORLD_H - 1450, w: 170, h: 38, type: 'cloud' },
  { id: 'p8', x: 420, y: WORLD_H - 1650, w: 150, h: 38, type: 'moving-horizontal', color: '#c08f8f', amplitude: 75, speed: 0.0016, phase: 0.7 },
  { id: 'p9', x: 250, y: WORLD_H - 1850, w: 160, h: 38, type: 'swing', color: '#d6b584', amplitude: 70, speed: 0.0019, rope: 74, phase: 0.8 },
  { id: 'cp2base', x: 70, y: WORLD_H - 2060, w: 220, h: 38, type: 'basic', color: '#8aa3c4' },
  { id: 'p10', x: 400, y: WORLD_H - 2240, w: 180, h: 38, type: 'moving-vertical', color: '#90b49b', amplitude: 95, speed: 0.0013, phase: 0.15 },
  { id: 'p11', x: 140, y: WORLD_H - 2430, w: 150, h: 38, type: 'basic', color: '#c08f8f' },
  { id: 'p12', x: 430, y: WORLD_H - 2610, w: 180, h: 38, type: 'cloud' },
  { id: 'p13', x: 170, y: WORLD_H - 2790, w: 170, h: 38, type: 'moving-horizontal', color: '#d6b584', amplitude: 90, speed: 0.0012, phase: 0.5 },
  { id: 'goal-base', x: 320, y: WORLD_H - 3010, w: 210, h: 40, type: 'basic', color: '#90b49b' }
];

const createStars = (): Collectible[] => [
  { id: 's1', x: 330, y: WORLD_H - 320, collected: false },
  { id: 's2', x: 580, y: WORLD_H - 520, collected: false },
  { id: 's3', x: 250, y: WORLD_H - 700, collected: false },
  { id: 's4', x: 540, y: WORLD_H - 940, collected: false },
  { id: 's5', x: 330, y: WORLD_H - 1160, collected: false },
  { id: 's6', x: 500, y: WORLD_H - 1540, collected: false },
  { id: 's7', x: 190, y: WORLD_H - 1730, collected: false },
  { id: 's8', x: 355, y: WORLD_H - 1990, collected: false },
  { id: 's9', x: 580, y: WORLD_H - 2360, collected: false },
  { id: 's10', x: 300, y: WORLD_H - 2720, collected: false }
];

const createOranges = (): Collectible[] => [
  { id: 'o1', x: 550, y: WORLD_H - 790, collected: false },
  { id: 'o2', x: 80, y: WORLD_H - 1240, collected: false },
  { id: 'o3', x: 600, y: WORLD_H - 1700, collected: false },
  { id: 'o4', x: 90, y: WORLD_H - 2280, collected: false },
  { id: 'o5', x: 610, y: WORLD_H - 2670, collected: false }
];

const checkpoints = [
  { id: 'cp1', x: 520, y: WORLD_H - 970 },
  { id: 'cp2', x: 170, y: WORLD_H - 2110 }
];

export const Level3JumpGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    completeLevel,
    adminMode,
    testCompleteLevel
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 3;

  const [player, setPlayer] = useState(() => ({ x: START_POS.x, y: START_POS.y, vx: 0, vy: 0 }));
  const [cameraY, setCameraY] = useState(() => Math.min(Math.max(START_POS.y - PLAY_VIEW_H * CAMERA_PLAYER_RATIO, 0), WORLD_H - PLAY_VIEW_H));
  const [availableJumps, setAvailableJumps] = useState(2);
  const [isGrounded, setIsGrounded] = useState(false);
  const [landingSquash, setLandingSquash] = useState(1);
  const [emotion, setEmotion] = useState<'idle' | 'jump' | 'fall'>('idle');
  const [timeLeft, setTimeLeft] = useState(120);
  const [stars, setStars] = useState<Collectible[]>(createStars);
  const [orangeBlocks, setOrangeBlocks] = useState<Collectible[]>(createOranges);
  const [activeCp, setActiveCp] = useState(0);
  const [spawnPoint, setSpawnPoint] = useState({ x: START_POS.x, y: START_POS.y });
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number; ttl: number; type: 'dust' | 'spiral' }>>([]);
  const [toast, setToast] = useState('');
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [lastTick, setLastTick] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const levelStart = useRef(0);
  const finishedRef = useRef(false);
  const nextEffectId = useRef(1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const platformsBase = useMemo(createPlatforms, []);
  const dynamicPlatforms = useMemo(() => {
    if (!isActive) return platformsBase;
    const now = Date.now();
    return platformsBase.map((p) => {
      if (p.type === 'moving-horizontal') {
        const dx = Math.sin(now * (p.speed ?? 0.001) + (p.phase ?? 0)) * (p.amplitude ?? 70);
        return { ...p, x: p.x + dx };
      }
      if (p.type === 'moving-vertical') {
        const dy = Math.sin(now * (p.speed ?? 0.001) + (p.phase ?? 0)) * (p.amplitude ?? 80);
        return { ...p, y: p.y + dy };
      }
      if (p.type === 'swing') {
        const dx = Math.sin(now * (p.speed ?? 0.0014) + (p.phase ?? 0)) * (p.amplitude ?? 80);
        return { ...p, x: p.x + dx };
      }
      return p;
    });
  }, [isActive, platformsBase, lastTick]);

  const starCount = stars.filter((s) => s.collected).length;
  const orangeCount = orangeBlocks.filter((o) => o.collected).length;

  useEffect(() => {
    if (!isActive) return;
    levelStart.current = Date.now();
    finishedRef.current = false;
    setPlayer({ x: START_POS.x, y: START_POS.y, vx: 0, vy: 0 });
    setCameraY(Math.min(Math.max(START_POS.y - PLAY_VIEW_H * CAMERA_PLAYER_RATIO, 0), WORLD_H - PLAY_VIEW_H));
    setAvailableJumps(2);
    setIsGrounded(false);
    setLandingSquash(1);
    setEmotion('idle');
    setTimeLeft(120);
    setStars(createStars());
    setOrangeBlocks(createOranges());
    setActiveCp(0);
    setSpawnPoint({ x: START_POS.x, y: START_POS.y });
    setEffects([]);
    setToast('');
  }, [isActive]);

  useEffect(() => {
    if (!isActive || gameplayPaused) return;
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - levelStart.current) / 1000;
      setTimeLeft(Math.max(0, 120 - Math.floor(elapsed)));
    }, 200);
    return () => window.clearInterval(timer);
  }, [isActive, gameplayPaused]);

  const spawnEffect = (x: number, y: number, type: 'dust' | 'spiral') => {
    const id = nextEffectId.current++;
    setEffects((cur) => [...cur.slice(-36), { id, x, y, ttl: 1, type }]);
  };

  const playCloudBounceSound = () => {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = audioCtxRef.current ?? new Ctx();
    audioCtxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  };

  const triggerJump = () => {
    if (gameplayPaused) return;
    if (availableJumps <= 0) return;
    setPlayer((cur) => ({ ...cur, vy: JUMP_SPEED }));
    setAvailableJumps((n) => n - 1);
    setIsGrounded(false);
    setEmotion('jump');
    if (availableJumps === 1) {
      for (let i = 0; i < 5; i++) {
        spawnEffect(player.x + BABY_W / 2 + i * 2, player.y + BABY_H / 2 - i * 5, 'spiral');
      }
    } else {
      for (let i = 0; i < 4; i++) spawnEffect(player.x + 16 + i * 8, player.y + BABY_H, 'dust');
    }
  };

  useEffect(() => {
    if (!isActive || gameplayPaused) return;
    let raf = 0;
    const tick = () => {
      setLastTick(Date.now());
      setEffects((cur) => cur.map((v) => ({ ...v, ttl: v.ttl - 0.04 })).filter((v) => v.ttl > 0));

      setPlayer((cur) => {
        let vx = 0;
        if (leftPressed) vx -= MOVE_SPEED;
        if (rightPressed) vx += MOVE_SPEED;

        let next = { ...cur, vx, vy: cur.vy + GRAVITY };
        next.x = Math.min(Math.max(next.x + next.vx, 0), VIEW_W - BABY_W);
        next.y += next.vy;
        let landed = false;
        let standOn: Platform | null = null;

        for (const p of dynamicPlatforms) {
          const wasAbove = cur.y + BABY_H <= p.y + 6;
          const nowBelowTop = next.y + BABY_H >= p.y;
          const overlapX = next.x + BABY_W > p.x + 4 && next.x < p.x + p.w - 4;
          if (wasAbove && nowBelowTop && overlapX && next.vy >= 0) {
            next.y = p.y - BABY_H;
            next.vy = 0;
            landed = true;
            standOn = p;
            break;
          }
        }

        if (landed) {
          if (!isGrounded) {
            setLandingSquash(0.9);
            window.setTimeout(() => setLandingSquash(1), 130);
            spawnEffect(next.x + BABY_W / 2, next.y + BABY_H, 'dust');
          }
          setIsGrounded(true);
          setAvailableJumps(2);
          setEmotion(Math.abs(next.vx) > 0 ? 'jump' : 'idle');
          if (standOn?.type === 'cloud') {
            next.vy = JUMP_SPEED * CLOUD_BONUS;
            setIsGrounded(false);
            setAvailableJumps(1);
            setEmotion('jump');
            playCloudBounceSound();
            setToast('噗哟～ 云朵蹦床触发！');
            window.setTimeout(() => setToast(''), 900);
            for (let i = 0; i < 6; i++) spawnEffect(next.x + 8 + i * 7, next.y + BABY_H - 8, 'spiral');
          }
        } else {
          setIsGrounded(false);
          setEmotion(next.vy > 14 ? 'fall' : 'jump');
        }

        if (next.y > DEEP_PIT_Y) {
          setEmotion('fall');
          setToast('掉落深渊，回到糖果中转站');
          window.setTimeout(() => setToast(''), 900);
          return { x: spawnPoint.x, y: spawnPoint.y, vx: 0, vy: 0 };
        }

        const centerX = next.x + BABY_W / 2;
        const centerY = next.y + BABY_H / 2;
        const cpIndex = checkpoints.findIndex((cp) => Math.hypot(centerX - cp.x, centerY - cp.y) < 44);
        if (cpIndex >= 0 && cpIndex !== activeCp) {
          setActiveCp(cpIndex);
          setSpawnPoint({ x: checkpoints[cpIndex].x - BABY_W / 2, y: checkpoints[cpIndex].y - BABY_H - 8 });
          setToast(`已激活检查点 ${cpIndex + 1}/2`);
          window.setTimeout(() => setToast(''), 900);
        }

        setStars((curStars) =>
          curStars.map((s) => (s.collected ? s : Math.hypot(centerX - s.x, centerY - s.y) < 30 ? { ...s, collected: true } : s))
        );

        setOrangeBlocks((curOranges) =>
          curOranges.map((o) => {
            if (o.collected) return o;
            if (Math.hypot(centerX - o.x, centerY - o.y) < 30) {
              setToast('🍊 +1');
              window.setTimeout(() => setToast(''), 700);
              return { ...o, collected: true };
            }
            return o;
          })
        );

        const goalX = 415;
        const goalY = WORLD_H - 3068;
        if (!finishedRef.current && Math.hypot(centerX - goalX, centerY - goalY) < 55) {
          finishedRef.current = true;
          const elapsed = (Date.now() - levelStart.current) / 1000;
          const collectedStars = stars.filter((s) => s.collected).length;
          const rank = collectedStars >= 10 && elapsed <= 120 ? 3 : collectedStars >= 5 ? 2 : 1;
          completeLevel({ stars: rank, orangesCollected: orangeCount, orangeTotal: 5 });
        }

        const targetCam = Math.min(Math.max(next.y - PLAY_VIEW_H * CAMERA_PLAYER_RATIO, 0), WORLD_H - PLAY_VIEW_H);
        setCameraY((cam) => cam + (targetCam - cam) * 0.14);
        return next;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    isActive,
    gameplayPaused,
    dynamicPlatforms,
    leftPressed,
    rightPressed,
    activeCp,
    spawnPoint.x,
    spawnPoint.y,
    completeLevel,
    orangeCount,
    stars
  ]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto overflow-hidden bg-[#dceeff]">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #cfe6ff 0%, #e4f2ff 38%, #f7fbff 75%, #fff8ee 100%)' }} />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #ffffffcc 0 8%, transparent 9%), radial-gradient(circle at 75% 15%, #ffffffaa 0 7%, transparent 8%), radial-gradient(circle at 60% 65%, #ffe8f2aa 0 6%, transparent 7%)'
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(132, 156, 181, 0.15) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(132, 156, 181, 0.08) 0 1px, transparent 1px 6px)'
        }}
      />
      <div className="absolute top-24 left-10 w-60 h-24 rounded-full blur-sm bg-white/60" />
      <div className="absolute top-36 right-8 w-52 h-20 rounded-full blur-sm bg-white/55" />
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[560px] h-40 opacity-45"
        style={{
          background:
            'conic-gradient(from 210deg at 50% 100%, transparent 0deg, #ffd1d180 40deg, #ffe9b280 62deg, #d6f3ff90 84deg, #e7d8ff80 102deg, transparent 118deg)'
        }}
      />
      <LevelTopBar
        title="🧱 积木世界快乐跳跃"
        onPause={() => setGameplayPaused(true)}
        stats={[
          { label: '🍊', value: `${orangeCount}/5` },
          { label: '⭐', value: `${starCount}/10` },
          { label: '⏱', value: `${timeLeft}s` }
        ]}
      />

      <div ref={stageRef} className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: PLAY_VIEW_H }}>
        <div className="absolute left-0 w-full" style={{ height: WORLD_H, transform: `translateY(${-cameraY}px)` }}>
          {dynamicPlatforms.map((p) => (
            <React.Fragment key={p.id}>
              {p.type === 'swing' && (
                <div className="absolute w-1 bg-yellow-100/80 rounded-full" style={{ left: p.x + p.w / 2, top: p.y - (p.rope ?? 80), height: p.rope ?? 80 }} />
              )}
              <div
                className={`absolute rounded-[18px] border border-white/40 shadow-sm ${p.type === 'cloud' ? 'shadow-white/50' : ''}`}
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.w,
                  height: p.h,
                  background:
                    p.type === 'cloud'
                      ? 'radial-gradient(circle at 30% 35%, #fff 0 20%, #eff6ff 46%, #d8edff 100%)'
                      : `linear-gradient(160deg, ${p.color ?? COLORS[(p.id.length + 1) % COLORS.length]}, #ffffff55), repeating-linear-gradient(125deg, #ffffff22 0 5px, #00000008 5px 9px)`,
                  filter: p.type === 'cloud' ? 'drop-shadow(0 0 9px rgba(255,255,255,0.75))' : 'none'
                }}
              />
            </React.Fragment>
          ))}

          {checkpoints.map((cp, idx) => (
            <div key={cp.id} className="absolute text-2xl" style={{ left: cp.x - 12, top: cp.y - 45, opacity: activeCp >= idx ? 1 : 0.4 }}>
              🚩
            </div>
          ))}

          <div className="absolute rounded-[24px] border border-white/70 backdrop-blur-sm" style={{ left: 335, top: WORLD_H - 3126, width: 160, height: 110, background: 'linear-gradient(155deg, #ffcde3aa, #d9ebffbb)' }}>
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-2xl">⭐🏰</div>
          </div>

          {stars.map((s) => (
            <div
              key={s.id}
              className={`absolute text-2xl transition-all ${s.collected ? 'opacity-0 scale-50' : 'opacity-100 animate-spin'}`}
              style={{ left: s.x - 12, top: s.y - 14, animationDuration: '6s' }}
            >
              ✦
            </div>
          ))}

          {orangeBlocks.map((o) => (
            <div
              key={o.id}
              className={`absolute rounded-xl border border-amber-100/80 ${o.collected ? 'opacity-0 scale-75' : 'opacity-100'}`}
              style={{
                left: o.x - 18,
                top: o.y - 16,
                width: 36,
                height: 32,
                background: 'linear-gradient(145deg, #ffb347, #ff8f1f)',
                boxShadow: '0 0 14px rgba(255, 175, 70, 0.8)'
              }}
            />
          ))}

          <div className="absolute pointer-events-none" style={{ left: 42, top: WORLD_H - 3300, width: 260, height: 260, borderRadius: 999, background: 'radial-gradient(circle, #ffffff55 0%, transparent 65%)' }} />
          <div className="absolute pointer-events-none" style={{ right: 50, top: WORLD_H - 2300, width: 220, height: 220, borderRadius: 999, background: 'radial-gradient(circle, #ffffff44 0%, transparent 65%)' }} />

          {effects.map((e) => (
            <div
              key={e.id}
              className={`absolute rounded-full ${e.type === 'spiral' ? 'bg-cyan-100' : 'bg-yellow-100'}`}
              style={{
                left: e.x,
                top: e.y,
                width: e.type === 'spiral' ? 8 : 6,
                height: e.type === 'spiral' ? 8 : 6,
                opacity: e.ttl,
                transform: `scale(${0.6 + e.ttl})`
              }}
            />
          ))}

          <div
            className="absolute flex items-center justify-center"
            style={{
              left: player.x - 24,
              top: player.y - 38,
              width: 104,
              height: 132,
              transform: `scale(1, ${landingSquash})`,
              transition: 'transform 120ms linear'
            }}
          >
            <img src={BABY_SPRITE} alt="背带裤小添" className="w-full h-full object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.18)]" />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/80 text-base shadow-sm">
              {emotion === 'idle' ? '😊' : emotion === 'fall' ? '😖' : '😮'}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 z-45 pointer-events-none" style={{ height: CONTROL_SAFE_H, background: 'linear-gradient(180deg, #eef7ff 0%, #f8fbff 55%, #ffffff 100%)' }} />

      {toast && <div className="absolute left-1/2 -translate-x-1/2 top-28 z-50 bg-black/55 text-white text-sm px-4 py-2 rounded-full">{toast}</div>}

      <div className="absolute left-0 right-0 bottom-6 z-50 flex justify-between px-8">
        <div className="flex gap-3">
          <button
            onPointerDown={() => setLeftPressed(true)}
            onPointerUp={() => setLeftPressed(false)}
            onPointerLeave={() => setLeftPressed(false)}
            className="w-20 h-20 rounded-3xl bg-white/40 backdrop-blur-md border border-white/75 text-3xl text-[#1a3348] shadow-[inset_0_2px_8px_rgba(255,255,255,0.35)]"
          >
            ←
          </button>
          <button
            onPointerDown={() => setRightPressed(true)}
            onPointerUp={() => setRightPressed(false)}
            onPointerLeave={() => setRightPressed(false)}
            className="w-20 h-20 rounded-3xl bg-white/40 backdrop-blur-md border border-white/75 text-3xl text-[#1a3348] shadow-[inset_0_2px_8px_rgba(255,255,255,0.35)]"
          >
            →
          </button>
        </div>
        <button
          onPointerDown={triggerJump}
          className="w-24 h-24 rounded-3xl bg-white/40 backdrop-blur-md border border-white/75 text-4xl text-[#1a3348] shadow-[inset_0_2px_8px_rgba(255,255,255,0.35)]"
        >
          ↑
        </button>
      </div>

      {adminMode && (
        <div className="absolute right-4 top-32 z-50">
          <button onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">测试通关</button>
        </div>
      )}
    </div>
  );
};
