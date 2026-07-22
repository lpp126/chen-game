import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playBridge, playCorrect, playSplash, playWin, playWrong } from '../utils/levelAudio';
import { useLevelAssetsGate } from '../hooks/useLevelAssetsGate';
import { Level25LinePhysicsGame } from './Level25LinePhysicsGame';

/** 桥墩由粗到细；河宽逐渐变大 */
const PLATFORM_WS = [132, 102, 76, 54, 36, 28];
const GAPS = [120, 155, 190, 225, 260];

const GROW_SPEED = 180;
const FALL_MS = 320;
const WALK_SPEED = 240;
const SCROLL_MS = 560;
const CHAR_SIZE = Math.round(120 * 1.3);
const CHAR_IMG = '/images/背带裤小添.webp';
const GROUND_RATIO = 0.78;
const LEFT_MARGIN = 20;

type Phase = 'idle' | 'growing' | 'falling' | 'walking' | 'scrolling' | 'fail';
type Plat = { x: number; w: number };

type BridgeProps = {
  onBridgeClear: (fails: number) => void;
};

const buildWorld = (): Plat[] => {
  const out: Plat[] = [];
  let x = LEFT_MARGIN;
  for (let i = 0; i < PLATFORM_WS.length; i += 1) {
    out.push({ x, w: PLATFORM_WS[i] });
    if (i < GAPS.length) x += PLATFORM_WS[i] + GAPS[i];
  }
  return out;
};

/** 人物站在桥墩正中 */
const centerOn = (plat: Plat) => plat.x + plat.w / 2 - CHAR_SIZE / 2;

const Level13BridgeStage: React.FC<BridgeProps> = ({ onBridgeClear }) => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    adminMode,
    testCompleteLevel,
    runId
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 13;
  const assetsReady = useLevelAssetsGate(13, isActive, runId);

  const [curIdx, setCurIdx] = useState(0);
  const [plats, setPlats] = useState<Plat[]>(() => buildWorld());
  const [camX, setCamX] = useState(0);
  const [bridgeLen, setBridgeLen] = useState(0);
  const [bridgeAngle, setBridgeAngle] = useState(-90);
  const [charX, setCharX] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fails, setFails] = useState(0);
  const [failMsg, setFailMsg] = useState('');
  const [sceneH, setSceneH] = useState(640);
  const [sceneW, setSceneW] = useState(390);

  const phaseRef = useRef<Phase>('idle');
  const bridgeLenRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const pausedRef = useRef(false);
  const curIdxRef = useRef(0);
  const platsRef = useRef<Plat[]>(buildWorld());
  const camXRef = useRef(0);
  const failsRef = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const charXRef = useRef(0);

  const groundY = Math.round(sceneH * GROUND_RATIO);
  const skyRoom = Math.max(80, groundY - 24);
  const growVisualScale =
    (phase === 'growing' || phase === 'falling') && bridgeLen > skyRoom ? skyRoom / bridgeLen : 1;

  const totalGaps = GAPS.length;

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const setCharBoth = (x: number) => {
    charXRef.current = x;
    setCharX(x);
  };
  const setCamBoth = (x: number) => {
    camXRef.current = x;
    setCamX(x);
  };
  const setCurBoth = (i: number) => {
    curIdxRef.current = i;
    setCurIdx(i);
  };

  const resetWorld = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const world = buildWorld();
    platsRef.current = world;
    setPlats(world);
    setCamBoth(0);
    setCurBoth(0);
    setCharBoth(centerOn(world[0]));
    setBridgeLen(0);
    bridgeLenRef.current = 0;
    setBridgeAngle(-90);
    setFailMsg('');
    setPhaseBoth('idle');
    lastTsRef.current = 0;
  }, []);

  useEffect(() => {
    pausedRef.current = gameplayPaused;
  }, [gameplayPaused]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const sync = () => {
      setSceneH(Math.max(320, el.clientHeight));
      setSceneW(Math.max(320, el.clientWidth));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    failsRef.current = 0;
    setFails(0);
    resetWorld();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, runId, resetWorld]);

  const growLoop = useCallback((ts: number) => {
    if (phaseRef.current !== 'growing') return;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
    lastTsRef.current = ts;
    if (!pausedRef.current) {
      const next = bridgeLenRef.current + GROW_SPEED * dt;
      bridgeLenRef.current = next;
      setBridgeLen(next);
    }
    rafRef.current = requestAnimationFrame(growLoop);
  }, []);

  const startGrow = () => {
    if (!isActive || gameplayPaused || phaseRef.current !== 'idle') return;
    setPhaseBoth('growing');
    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(growLoop);
  };

  const scrollToStandOn = (platIdx: number) => {
    const plat = platsRef.current[platIdx];
    if (!plat) return;
    // 镜头左移，让当前桥墩贴近左侧，右侧尽量露出后续已存在的桥墩
    const targetCam = Math.max(0, plat.x - LEFT_MARGIN);
    const startCam = camXRef.current;
    const startChar = charXRef.current;
    const endChar = centerOn(plat);
    const t0 = performance.now();
    setPhaseBoth('scrolling');

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / SCROLL_MS);
      const ease = 1 - Math.pow(1 - t, 3);
      setCamBoth(startCam + (targetCam - startCam) * ease);
      setCharBoth(startChar + (endChar - startChar) * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      setCamBoth(targetCam);
      setCharBoth(endChar);
      setCurBoth(platIdx);
      setBridgeLen(0);
      bridgeLenRef.current = 0;
      setBridgeAngle(-90);
      setPhaseBoth('idle');
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const releaseGrow = () => {
    if (!isActive || phaseRef.current !== 'growing') return;
    cancelAnimationFrame(rafRef.current);
    lastTsRef.current = 0;
    setPhaseBoth('falling');

    const i = curIdxRef.current;
    const cur = platsRef.current[i];
    const next = platsRef.current[i + 1];
    if (!cur || !next) return;

    const gap = next.x - (cur.x + cur.w);
    const len = bridgeLenRef.current;
    const start = performance.now();

    const fallTick = (now: number) => {
      const t = Math.min(1, (now - start) / FALL_MS);
      const ease = 1 - Math.pow(1 - t, 3);
      setBridgeAngle(-90 + 90 * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(fallTick);
        return;
      }
      setBridgeAngle(0);

      const ok = len >= gap && len <= gap + next.w;
      if (!ok) {
        playSplash();
        playWrong();
        failsRef.current += 1;
        setFails(failsRef.current);
        setFailMsg(len < gap ? '桥太短，掉进河里了…' : '桥太长，越过对岸了…');
        setPhaseBoth('fail');
        return;
      }

      setPhaseBoth('walking');
      playBridge();
      const walkStart = performance.now();
      const startX = charXRef.current;
      const targetX = centerOn(next);
      const dist = targetX - startX;
      const walkMs = Math.max(280, (Math.abs(dist) / WALK_SPEED) * 1000);

      const walkTick = (wNow: number) => {
        const wt = Math.min(1, (wNow - walkStart) / walkMs);
        setCharBoth(startX + dist * wt);
        if (wt < 1) {
          rafRef.current = requestAnimationFrame(walkTick);
          return;
        }
        playCorrect();
        const arrived = i + 1;
        if (arrived >= totalGaps) {
          // 已过完最后一座河（站在最后一根墩上）
          playWin();
          onBridgeClear(failsRef.current);
          return;
        }
        scrollToStandOn(arrived);
      };
      rafRef.current = requestAnimationFrame(walkTick);
    };
    rafRef.current = requestAnimationFrame(fallTick);
  };

  if (!isActive || !assetsReady) return null;

  const cur = plats[curIdx];
  const pivotX = cur ? cur.x + cur.w : 0;
  const bridgeDrawLen = Math.max(bridgeLen, 0) * growVisualScale;
  const river = curIdx + 1;

  const hint =
    phase === 'idle'
      ? '小关 1/2 · 长按蓄桥，连续过河'
      : phase === 'growing'
        ? '继续按住…松手放桥'
        : phase === 'falling'
          ? '桥倒下中…'
          : phase === 'walking'
            ? '过桥中…'
            : phase === 'scrolling'
              ? '镜头前移…'
              : phase === 'fail'
                ? failMsg
                : '';

  const sx = (worldX: number) => ((worldX - camX) / sceneW) * 100;
  const sw = (w: number) => (w / sceneW) * 100;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🌉 对岸少年"
        onPause={() => setGameplayPaused(true)}
        hint={hint}
        stats={[
          { label: '小关', value: '1/2' },
          { label: '河段', value: `${Math.min(river, totalGaps)}/${totalGaps}` },
          { label: '失败', value: String(fails) }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col relative">
        <div
          ref={sceneRef}
          className="relative flex-1 min-h-0 w-full overflow-hidden select-none touch-none"
          style={{ background: 'linear-gradient(180deg, #cfe8f8 0%, #a8d4ef 55%, #7eb8da 100%)' }}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            startGrow();
          }}
          onPointerUp={releaseGrow}
          onPointerCancel={releaseGrow}
        >
          <div className="absolute top-6 left-8 w-16 h-8 rounded-full bg-white/50" />
          <div className="absolute top-10 right-10 w-20 h-9 rounded-full bg-white/40" />

          <div
            className="absolute left-0 right-0"
            style={{
              top: groundY,
              height: Math.max(0, sceneH - groundY),
              background: 'linear-gradient(180deg, #4a9fd8 0%, #2a7fb8 100%)'
            }}
          />

          {/* 全部桥墩预先存在于世界坐标，镜头只平移 */}
          {plats.map((p, i) => {
            const left = sx(p.x);
            const width = sw(p.w);
            // 略微在屏外的也画，避免边缘闪烁
            if (left + width < -8 || left > 108) return null;
            const thick = i === 0 ? FRESH.sand : FRESH.sage;
            return (
              <div
                key={`plat-${i}`}
                className="absolute"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: groundY - 18,
                  height: Math.max(0, sceneH - groundY + 18),
                  background: thick,
                  borderTop: `3px solid ${FRESH.teal}`,
                  boxShadow: i > curIdx ? 'inset 0 0 0 1px rgba(255,255,255,0.25)' : undefined
                }}
              />
            );
          })}

          {cur && (phase === 'growing' || phase === 'falling' || phase === 'walking') && (
            <div
              className="absolute"
              style={{
                left: `${sx(pivotX)}%`,
                top: groundY - 3,
                width: `${sw(bridgeDrawLen)}%`,
                height: 8,
                background: '#8b5a2b',
                borderRadius: 2,
                transform: `rotate(${bridgeAngle}deg)`,
                transformOrigin: 'left center',
                boxShadow: '0 1px 0 #5c3a1a',
                zIndex: 4
              }}
            />
          )}

          <div
            className="absolute flex items-center justify-center overflow-visible"
            style={{
              left: `${sx(charX)}%`,
              top: groundY - CHAR_SIZE + 8,
              width: CHAR_SIZE,
              height: CHAR_SIZE,
              transform: phase === 'fail' ? 'translateY(48px) rotate(18deg)' : undefined,
              transition: phase === 'fail' ? 'transform 0.45s ease-in' : undefined,
              filter: 'drop-shadow(0 3px 8px rgba(26,51,72,0.3))',
              zIndex: 5
            }}
          >
            <img
              src={CHAR_IMG}
              alt=""
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>

          {phase === 'idle' && (
            <p className="absolute bottom-4 inset-x-0 text-center text-sm font-semibold text-white/90 drop-shadow">
              按住蓄桥 · 前方桥墩一直在路上
            </p>
          )}
          {growVisualScale < 0.98 && phase === 'growing' && (
            <p className="absolute top-2 inset-x-0 text-center text-[10px] font-semibold text-white/80">
              桥很长哦…
            </p>
          )}
        </div>

        {phase === 'fail' && (
          <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center px-4 pointer-events-none">
            <div className="w-full max-w-[320px] rounded-2xl bg-white/95 border border-white p-4 text-center space-y-2 pointer-events-auto shadow-lg">
              <p className="text-sm font-semibold" style={{ color: FRESH.danger }}>
                {failMsg}
              </p>
              <button type="button" onClick={resetWorld} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">
                再试一次
              </button>
              <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#e3f2fc] font-semibold">
                从头再来
              </button>
              <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-white border border-[#d6ecf8]">
                返回关卡
              </button>
            </div>
          </div>
        )}
      </div>

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

export const Level13BalanceGame: React.FC = () => {
  const { status, currentLevelId, runId, completeLevel } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 13;
  const [part, setPart] = useState<1 | 'banner' | 2>(1);
  const bridgeFailsRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;
    setPart(1);
    bridgeFailsRef.current = 0;
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive || part !== 'banner') return;
    const t = window.setTimeout(() => setPart(2), 1800);
    return () => window.clearTimeout(t);
  }, [isActive, part]);

  const onBridgeClear = useCallback((fails: number) => {
    bridgeFailsRef.current = fails;
    setPart('banner');
  }, []);

  const onLinesClear = useCallback(
    (lineFails: number) => {
      const totalFail = bridgeFailsRef.current + lineFails;
      const stars = totalFail === 0 ? 3 : totalFail <= 2 ? 2 : 1;
      completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
    },
    [completeLevel]
  );

  if (!isActive) return null;

  if (part === 'banner') {
    return (
      <div
        className="absolute inset-0 z-40 pointer-events-auto flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #eaf4fc 0%, #d6ecf8 45%, #a8d4ef 100%)' }}
      >
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-[340px] rounded-[1.5rem] bg-white/88 backdrop-blur-xl border border-white/80 shadow-[0_16px_40px_rgba(42,111,150,0.2)] px-7 py-8 text-center">
            <p className="text-3xl mb-2">🌊</p>
            <p className="text-xl font-extrabold" style={{ color: FRESH.text }}>
              第一小关完成
            </p>
            <p className="mt-2 text-base font-semibold" style={{ color: FRESH.sky }}>
              即将进入第二小关
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: FRESH.textMuted }}>
              折线过河：点折线沿箭头滑出，别撞到其它线
            </p>
            <div className="mt-5 h-1.5 rounded-full bg-[#d6ecf8] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e]"
                style={{ animation: 'l13bar 1.8s linear forwards' }}
              />
            </div>
            <style>{`@keyframes l13bar{from{width:0%}to{width:100%}}`}</style>
            <button
              type="button"
              className="mt-5 w-full py-3 rounded-2xl font-bold text-white shadow-md active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg, #4a9fd8, #3aab8e)' }}
              onClick={() => setPart(2)}
            >
              进入第二小关
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (part === 1) return <Level13BridgeStage onBridgeClear={onBridgeClear} />;
  return (
    <Level25LinePhysicsGame
      hostLevelId={13}
      stageLabel="小关 2/2"
      onAllClear={onLinesClear}
      skyTheme
    />
  );
};
