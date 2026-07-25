import React, { useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { playDrop, playThud, playWin, playWrong } from '../utils/levelAudio';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../utils/levelTheme';

type BlockType = 'rect' | 'square' | 'triangle' | 'cylinder' | 'arch' | 'cloud' | 'star';
type Palette = 'rose' | 'sage' | 'mist' | 'sand' | 'sky';

interface BlockSpec {
  id: string;
  type: BlockType;
  w: number;
  h: number;
  palette: Palette;
}

interface PlacedMeta {
  releasedAt: number;
  settled: boolean;
  settleAt: number;
  /** 自由下落时的世界坐标 X（直线下落） */
  releaseX: number;
  /** 是否已碰过接盘或其他积木；接触后交给物理模拟平衡/滑落 */
  hasContacted: boolean;
}

type MatterBody = Matter.Body & {
  plugin: {
    blockId?: string;
    blockType?: BlockType;
    palette?: Palette;
  };
};

const VIEW_W = DESIGN_WIDTH;
const VIEW_H = DESIGN_HEIGHT;
const STAGE_TOP = 112;
const TABLE_TOP = 1060;
const TABLE_BODY_H = 22;
const BASE_VISUAL_H = 66;
/** 底座顶面（视觉与物理碰撞面共用） */
const BASE_SURFACE_Y = TABLE_TOP - 30;
const GOAL_LINE_Y = 300;
const SPAWN_Y = 200;
const STABLE_SPEED = 0.18;
const TOTAL_BLOCKS = 20;
const BASE_WIDTH = 390;
const BASE_MOVE_AMPLITUDE = 128;
const BASE_MOVE_SPEED = 0.0012;

const BASE_COLORS: Record<Palette, { base: string; grain: string }> = {
  rose: { base: '#6bb5ff', grain: '#b8d9ef' },
  sage: { base: '#3aab8e', grain: '#b8e8dc' },
  mist: { base: '#7eb8da', grain: '#d6ecf8' },
  sand: { base: '#7cb8a8', grain: '#cce8df' },
  sky: { base: '#4a9fd8', grain: '#c5e2f2' }
};

const cloudGradients = ['linear-gradient(160deg, #c5e2f2, #eaf4fc)', 'linear-gradient(160deg, #b8e8dc, #e8f8f4)'];

const createLevel4Pool = (): BlockSpec[] => [
  { id: 'b1', type: 'rect', w: 140, h: 44, palette: 'sand' },
  { id: 'b2', type: 'rect', w: 130, h: 42, palette: 'mist' },
  { id: 'b3', type: 'square', w: 74, h: 74, palette: 'rose' },
  { id: 'b4', type: 'rect', w: 150, h: 40, palette: 'sage' },
  { id: 'b5', type: 'square', w: 68, h: 68, palette: 'sky' },
  { id: 'b6', type: 'triangle', w: 96, h: 72, palette: 'sand' },
  { id: 'b7', type: 'cylinder', w: 86, h: 86, palette: 'mist' },
  { id: 'b8', type: 'rect', w: 128, h: 38, palette: 'rose' },
  { id: 'b9', type: 'triangle', w: 88, h: 68, palette: 'sage' },
  { id: 'b10', type: 'cylinder', w: 92, h: 92, palette: 'sand' },
  { id: 'b11', type: 'arch', w: 132, h: 64, palette: 'mist' },
  { id: 'b12', type: 'rect', w: 116, h: 40, palette: 'sky' },
  { id: 'b13', type: 'cloud', w: 126, h: 62, palette: 'rose' },
  { id: 'b14', type: 'rect', w: 124, h: 40, palette: 'sage' },
  { id: 'b15', type: 'star', w: 92, h: 92, palette: 'sand' },
  { id: 'b16', type: 'cloud', w: 134, h: 68, palette: 'sky' },
  { id: 'b17', type: 'triangle', w: 100, h: 72, palette: 'rose' },
  { id: 'b18', type: 'star', w: 88, h: 88, palette: 'mist' },
  { id: 'b19', type: 'arch', w: 138, h: 66, palette: 'sage' },
  { id: 'b20', type: 'cloud', w: 122, h: 60, palette: 'sky' }
];

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const toLocalPoint = (event: React.PointerEvent<HTMLDivElement>): { x: number; y: number } => {
  const rect = event.currentTarget.getBoundingClientRect();
  const sx = VIEW_W / rect.width;
  const stageHeight = VIEW_H - STAGE_TOP;
  const sy = stageHeight / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: STAGE_TOP + (event.clientY - rect.top) * sy
  };
};

const makeBody = (spec: BlockSpec, x: number, y: number): MatterBody => {
  // 圆形/星形摩擦系数略低，落在斜面（如三角边）时能按平衡原理滑落；
  // 方块类高摩擦，落稳后无惯性侧滑，但悬空/落偏仍可被挤出掉落。
  const isRoundish = spec.type === 'cylinder' || spec.type === 'star' || spec.type === 'cloud';
  const common: Matter.IChamferableBodyDefinition = {
    // 必须先以动态体创建，再在生成时 setStatic(true) 冻结；
    // 否则某些情况下 setStatic(false) 不会正确恢复质量/惯性，导致“松手不下落”。
    isStatic: false,
    friction: isRoundish ? 0.28 : 0.95,
    frictionStatic: isRoundish ? 0.35 : 1,
    restitution: 0,
    density: spec.type === 'cloud' ? 0.0008 : spec.type === 'cylinder' ? 0.00115 : 0.001,
    inertia: Infinity,
    frictionAir: spec.type === 'cloud' ? 0.1 : 0.03,
    slop: 0.02
  };

  let body: MatterBody;
  if (spec.type === 'triangle') {
    // 尖朝上、底边水平，与视觉 clipPath 一致；避免 Bodies.polygon(3) 默认侧向尖角导致落地异常
    const hw = spec.w * 0.5;
    const hh = spec.h * 0.5;
    const triangleVerts = [
      { x: 0, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ];
    const created = Matter.Bodies.fromVertices(x, y, [triangleVerts], common);
    if (created) {
      body = created as MatterBody;
    } else {
      // 备用：用旋转后的顶点直接构造平底三角
      const r = Math.min(spec.w, spec.h) * 0.55;
      const tip = { x: 0, y: -r };
      const br = { x: r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6) };
      const bl = { x: -r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6) };
      body = Matter.Bodies.fromVertices(x, y, [[tip, br, bl]], common) as MatterBody;
    }
  } else if (spec.type === 'cylinder' || spec.type === 'cloud') {
    body = Matter.Bodies.circle(x, y, spec.w * 0.5, common) as MatterBody;
  } else if (spec.type === 'star') {
    body = Matter.Bodies.polygon(x, y, 5, spec.w * 0.48, common) as MatterBody;
  } else {
    body = Matter.Bodies.rectangle(x, y, spec.w, spec.h, {
      ...common,
      chamfer: { radius: spec.type === 'arch' ? 20 : 12 }
    }) as MatterBody;
  }

  // fromVertices / polygon 会重算惯性，需再次锁死旋转以保持尖朝上
  Matter.Body.setInertia(body, Infinity);
  Matter.Body.setAngle(body, 0);
  Matter.Body.setAngularVelocity(body, 0);

  body.plugin.blockId = spec.id;
  body.plugin.blockType = spec.type;
  body.plugin.palette = spec.palette;
  return body;
};

export const Level4StackGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    completeLevel,
    runId,
    adminMode,
    testCompleteLevel
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 4;

  const engineRef = useRef<Matter.Engine | null>(null);
  const worldBodiesRef = useRef<Record<string, MatterBody>>({});
  const placedMetaRef = useRef<Record<string, PlacedMeta>>({});
  const activeBodyIdRef = useRef<string | null>(null);
  const poolRef = useRef<BlockSpec[]>([]);
  const usedCountRef = useRef(0);
  const hasCollapsedRef = useRef(false);
  const finishedRef = useRef(false);
  const failedRef = useRef(false);
  const collapseCountRef = useRef(0);
  const stableStartRef = useRef<number | null>(null);
  const holdPointerRef = useRef(false);
  const shapeTickRef = useRef(0);
  const settleCountRef = useRef(0);
  const movingBaseRef = useRef<MatterBody | null>(null);
  const lastBaseXRef = useRef(VIEW_W / 2);

  const [renderBodies, setRenderBodies] = useState<MatterBody[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [usedCount, setUsedCount] = useState(0);
  const [heightPercent, setHeightPercent] = useState(0);
  const [fallingReset, setFallingReset] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sparklePhase, setSparklePhase] = useState(0);
  const [baseX, setBaseX] = useState(VIEW_W / 2);

  const currentSpec = useMemo(
    () => (currentBlockId ? poolRef.current.find((b) => b.id === currentBlockId) ?? null : null),
    [currentBlockId]
  );

  const createStaticWorld = () => {
    if (!engineRef.current) return;
    const table = Matter.Bodies.rectangle(VIEW_W / 2, BASE_SURFACE_Y + TABLE_BODY_H / 2, BASE_WIDTH, TABLE_BODY_H, {
      isStatic: true,
      friction: 1,
      frictionStatic: 1,
      restitution: 0
    }) as MatterBody;
    const floor = Matter.Bodies.rectangle(VIEW_W / 2, VIEW_H + 260, VIEW_W * 2, 120, {
      isStatic: true,
      friction: 1,
      frictionStatic: 1,
      restitution: 0
    }) as MatterBody;
    const leftWall = Matter.Bodies.rectangle(-28, VIEW_H / 2, 56, VIEW_H * 1.2, { isStatic: true }) as MatterBody;
    const rightWall = Matter.Bodies.rectangle(VIEW_W + 28, VIEW_H / 2, 56, VIEW_H * 1.2, { isStatic: true }) as MatterBody;
    Matter.Composite.add(engineRef.current.world, [floor, leftWall, rightWall, table]);
    movingBaseRef.current = table;
  };

  const spawnNextBlock = () => {
    if (!engineRef.current || finishedRef.current || hasCollapsedRef.current || failedRef.current) return;
    const next = poolRef.current[usedCountRef.current];
    if (!next) {
      setCurrentBlockId(null);
      return;
    }
    const body = makeBody(next, VIEW_W / 2, SPAWN_Y);
    Matter.Body.setStatic(body, true);
    worldBodiesRef.current[next.id] = body;
    activeBodyIdRef.current = next.id;
    setCurrentBlockId(next.id);
    Matter.Composite.add(engineRef.current.world, body);
    setRenderBodies((cur) => [...cur, body]);
  };

  const fullyResetLevel = () => {
    if (!engineRef.current) return;
    Matter.Composite.clear(engineRef.current.world, false);
    worldBodiesRef.current = {};
    placedMetaRef.current = {};
    activeBodyIdRef.current = null;
    usedCountRef.current = 0;
    settleCountRef.current = 0;
    stableStartRef.current = null;
    hasCollapsedRef.current = false;
    finishedRef.current = false;
    failedRef.current = false;
    holdPointerRef.current = false;
    movingBaseRef.current = null;
    lastBaseXRef.current = VIEW_W / 2;
    setRenderBodies([]);
    setHeightPercent(0);
    setUsedCount(0);
    setCurrentBlockId(null);
    setFallingReset(false);
    setFailed(false);
    setBaseX(VIEW_W / 2);
    poolRef.current = createLevel4Pool();
    createStaticWorld();
    spawnNextBlock();
  };

  const triggerCollapseReset = () => {
    if (hasCollapsedRef.current || finishedRef.current || failedRef.current) return;
    hasCollapsedRef.current = true;
    stableStartRef.current = null;
    collapseCountRef.current += 1;
    setFallingReset(true);
    window.setTimeout(() => fullyResetLevel(), 900);
  };

  const triggerHeightFail = () => {
    if (failedRef.current || finishedRef.current || hasCollapsedRef.current) return;
    failedRef.current = true;
    holdPointerRef.current = false;
    setFailed(true);
    playWrong();
  };

  const onBlockSettled = () => {
    settleCountRef.current += 1;
    playThud();
  };

  const releaseCurrentBlock = () => {
    const activeId = activeBodyIdRef.current;
    if (!activeId) return;
    const body = worldBodiesRef.current[activeId];
    if (!body) return;
    playDrop();
    Matter.Body.setStatic(body, false);
    Matter.Sleeping.set(body, false);
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);
    placedMetaRef.current[activeId] = {
      releasedAt: Date.now(),
      settled: false,
      settleAt: 0,
      releaseX: body.position.x,
      hasContacted: false
    };
    usedCountRef.current += 1;
    setUsedCount(usedCountRef.current);
    activeBodyIdRef.current = null;
    setCurrentBlockId(null);
    window.setTimeout(() => spawnNextBlock(), 120);
  };

  const tryReleasePointerBlock = () => {
    if (!holdPointerRef.current) return;
    holdPointerRef.current = false;
    if (!gameplayPaused && !hasCollapsedRef.current && !finishedRef.current && !failedRef.current) {
      releaseCurrentBlock();
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.08 }
    });
    engine.constraintIterations = 3;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engineRef.current = engine;
    fullyResetLevel();

    return () => {
      const currentEngine = engineRef.current;
      if (!currentEngine) return;
      Matter.Composite.clear(currentEngine.world, false);
      Matter.Engine.clear(currentEngine);
      engineRef.current = null;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    // 通过全局 runId，确保“重新开始”一定会重置本关物理世界与本地状态
    if (runId > 0) fullyResetLevel();
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive) return;
    let raf = 0;
    const tick = () => {
      shapeTickRef.current += 0.02;
      setSparklePhase((v) => (v + 1) % 360);
      if (engineRef.current) {
        if (!gameplayPaused && !failedRef.current) {
          Matter.Engine.update(engineRef.current, 1000 / 60);
          const now = Date.now();
          const nextBaseX = VIEW_W / 2 + Math.sin(now * BASE_MOVE_SPEED) * BASE_MOVE_AMPLITUDE;
          const baseDeltaX = nextBaseX - lastBaseXRef.current;
          lastBaseXRef.current = nextBaseX;
          if (movingBaseRef.current) {
            Matter.Body.setPosition(movingBaseRef.current, { x: nextBaseX, y: BASE_SURFACE_Y + TABLE_BODY_H / 2 });
          }
          setBaseX(nextBaseX);
          const allBodies = Object.values(worldBodiesRef.current);
          const releasedBodies = allBodies.filter((body) => {
            const id = body.plugin.blockId;
            return Boolean(id && placedMetaRef.current[id]);
          });
          const releasedBodySet = new Set<MatterBody>(releasedBodies);
          const baseBody = movingBaseRef.current;
          const carriedBodies = new Set<MatterBody>();

          // 本帧有支撑接触的积木（接盘或其他已释放积木）
          const contactingSupport = new Set<MatterBody>();
          if (baseBody && engineRef.current) {
            for (const pair of engineRef.current.pairs.list) {
              if (!pair.isActive) continue;
              const a = pair.bodyA as MatterBody;
              const b = pair.bodyB as MatterBody;
              const aReleased = releasedBodySet.has(a);
              const bReleased = releasedBodySet.has(b);

              if ((a === baseBody && bReleased) || (aReleased && bReleased)) contactingSupport.add(b);
              if ((b === baseBody && aReleased) || (aReleased && bReleased)) contactingSupport.add(a);
            }
          }

          let minTop = BASE_SURFACE_Y;
          /** 仅已落稳积木的最高点，用于过线判定（避免下落中的块把高度顶过目标线） */
          let settledMinTop = BASE_SURFACE_Y;
          let stableBodies = 0;
          let dynamicBodies = 0;
          let settledReleasedBodies = 0;

          for (const body of allBodies) {
            const meta = body.plugin.blockId ? placedMetaRef.current[body.plugin.blockId] : undefined;

            if (!body.isStatic) {
              dynamicBodies += 1;
              Matter.Body.setAngle(body, 0);
              Matter.Body.setAngularVelocity(body, 0);
            }

            if (meta) {
              if (contactingSupport.has(body)) {
                meta.hasContacted = true;
              }

              if (!meta.hasContacted) {
                // 尚未触碰：锁定水平位置，保持垂直下落
                if (Math.abs(body.position.x - meta.releaseX) > 0.001) {
                  Matter.Body.setPosition(body, { x: meta.releaseX, y: body.position.y });
                }
                Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
              } else {
                // 已接触：交给物理做平衡判定。
                // 仅清除“落稳后的残余惯性滑动”——垂直方向已几乎静止、且横向速度很小；
                // 斜面/落偏产生的持续侧向推力通常更大，不会被误杀，从而仍可滑落。
                const vy = body.velocity.y;
                const vx = body.velocity.x;
                if (Math.abs(vy) <= 0.22 && Math.abs(vx) <= 0.5) {
                  Matter.Body.setVelocity(body, { x: 0, y: vy });
                }
              }
            }

            if (body.position.y > VIEW_H + 250 || body.position.x < -180 || body.position.x > VIEW_W + 180) {
              triggerCollapseReset();
            }

            if (meta && !meta.settled) {
              minTop = Math.min(minTop, body.bounds.min.y);
              const speed = body.speed;
              if (!body.isStatic && speed <= STABLE_SPEED) stableBodies += 1;
              if (meta.hasContacted && speed <= 0.14 && Math.abs(body.velocity.y) <= 0.12) {
                if (!meta.settleAt) meta.settleAt = now;
                if (now - meta.settleAt > 380) {
                  meta.settled = true;
                  onBlockSettled();
                }
              } else {
                meta.settleAt = 0;
              }
            } else if (meta?.settled) {
              minTop = Math.min(minTop, body.bounds.min.y);
              settledMinTop = Math.min(settledMinTop, body.bounds.min.y);
              settledReleasedBodies += 1;
              if (!body.isStatic && body.speed <= STABLE_SPEED) stableBodies += 1;
            }
          }

          // 接盘水平移动时：平移与接盘连通的整叠积木（保留相对运动，如正在滑落的块）
          if (Math.abs(baseDeltaX) > 0.001 && baseBody && releasedBodySet.size > 0) {
            const adjacency = new Map<MatterBody, Set<MatterBody>>();
            const queue: MatterBody[] = [];

            const addEdge = (a: MatterBody, b: MatterBody) => {
              if (!adjacency.has(a)) adjacency.set(a, new Set<MatterBody>());
              adjacency.get(a)?.add(b);
            };

            for (const pair of engineRef.current.pairs.list) {
              if (!pair.isActive) continue;
              const a = pair.bodyA as MatterBody;
              const b = pair.bodyB as MatterBody;
              const aReleased = releasedBodySet.has(a);
              const bReleased = releasedBodySet.has(b);

              if (a === baseBody && bReleased) {
                carriedBodies.add(b);
                queue.push(b);
                continue;
              }
              if (b === baseBody && aReleased) {
                carriedBodies.add(a);
                queue.push(a);
                continue;
              }
              if (aReleased && bReleased) {
                addEdge(a, b);
                addEdge(b, a);
              }
            }

            while (queue.length > 0) {
              const current = queue.shift() as MatterBody;
              const neighbors = adjacency.get(current);
              if (!neighbors) continue;
              for (const next of neighbors) {
                if (carriedBodies.has(next)) continue;
                carriedBodies.add(next);
                queue.push(next);
              }
            }

            for (const body of carriedBodies) {
              Matter.Body.setPosition(body, { x: body.position.x + baseDeltaX, y: body.position.y });
              // 接盘平移后消掉横向冲量，避免“已落稳却永远 allStable=false”
              const id = body.plugin.blockId;
              const meta = id ? placedMetaRef.current[id] : undefined;
              if (meta?.settled) {
                Matter.Body.setVelocity(body, { x: 0, y: 0 });
              }
            }
          }

          const safeTop = Number.isFinite(minTop) ? minTop : BASE_SURFACE_Y;
          const progressTop = settledReleasedBodies > 0 ? settledMinTop : safeTop;
          const progress =
            releasedBodies.length > 0
              ? clamp(((BASE_SURFACE_Y - progressTop) / (BASE_SURFACE_Y - GOAL_LINE_Y)) * 100, 0, 100)
              : 0;
          setHeightPercent(progress);

          // 过线以已落稳堆高为准；结算不再强依赖 allStable（移动接盘会持续产生微速度）
          const passedLine = settledReleasedBodies >= 4 && settledMinTop <= GOAL_LINE_Y;
          const allSettled = releasedBodies.length > 0 && settledReleasedBodies === releasedBodies.length;
          const allStable = dynamicBodies > 0 && stableBodies >= Math.max(1, dynamicBodies - 1);
          const noBlocksLeft = usedCountRef.current >= TOTAL_BLOCKS && !activeBodyIdRef.current;

          if (
            !finishedRef.current &&
            !failedRef.current &&
            !hasCollapsedRef.current &&
            noBlocksLeft &&
            allSettled &&
            (dynamicBodies === 0 || allStable) &&
            !passedLine
          ) {
            triggerHeightFail();
          }

          if (!finishedRef.current && passedLine && allSettled && !hasCollapsedRef.current && !failedRef.current) {
            if (stableStartRef.current === null) stableStartRef.current = now;
            if (now - stableStartRef.current >= 1000) {
              finishedRef.current = true;
              playWin();
              const stars = collapseCountRef.current === 0 && usedCountRef.current <= 11 ? 3 : usedCountRef.current <= 16 ? 2 : 1;
              completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
            }
          } else if (!passedLine || !allSettled) {
            stableStartRef.current = null;
          }
        }

        setRenderBodies([...Object.values(worldBodiesRef.current)]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, gameplayPaused, completeLevel]);

  useEffect(() => {
    if (!isActive) return;
    const onPointerUp = () => tryReleasePointerBlock();
    const onPointerCancel = () => tryReleasePointerBlock();
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [isActive, gameplayPaused]);

  if (!isActive) return null;

  const remainBlocks = TOTAL_BLOCKS - usedCount;
  const activeBody = currentBlockId ? worldBodiesRef.current[currentBlockId] : null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto overflow-hidden bg-[#dcecf5] flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, #eaf4fc 0%, #d6ecf8 34%, #c5e2f2 34.4%, #b5d8eb 100%), repeating-linear-gradient(90deg, #ffffff0f 0 8px, #0000000b 8px 10px)'
        }}
      />

      <LevelTopBar
        title="☁️ 云端小塔"
        onPause={() => setGameplayPaused(true)}
        stats={[
          { label: '高度', value: `${Math.floor(heightPercent)}%` },
          { label: '剩余积木', value: String(remainBlocks) }
        ]}
      />

      <div className="relative flex-1 min-h-0">
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-[#e3c67eaa] z-20 pointer-events-none"
        style={{ top: GOAL_LINE_Y - STAGE_TOP }}
      />

      <div className="absolute left-5 top-2 z-20 text-xs text-[#9c8144] bg-[#fff6d8aa] px-3 py-1 rounded-full pointer-events-none">
        目标高度线
      </div>

      <div
        className="absolute z-[20] pointer-events-none"
        style={{
          left: baseX - (BASE_WIDTH + 56) / 2,
          top: BASE_SURFACE_Y - STAGE_TOP,
          width: BASE_WIDTH + 56,
          height: BASE_VISUAL_H,
          borderRadius: 20,
          background: 'linear-gradient(180deg, #e5d5c0 0%, #d4c0a8 100%)',
          border: '2px solid #c9a86c',
          boxShadow: '0 10px 28px rgba(74,68,67,0.18), 0 2px 0 #fff8ef inset'
        }}
      />

      {/* 仅装饰最底边，不遮挡移动底座 */}
      <div className="absolute left-0 right-0 bottom-0 h-[72px] z-[5] pointer-events-none bg-[linear-gradient(180deg,transparent_0%,#efe8de_70%)] opacity-80" />

      {renderBodies.map((body) => {
        const type = body.plugin.blockType ?? 'rect';
        const palette = body.plugin.palette ?? 'mist';
        const bodyW = body.bounds.max.x - body.bounds.min.x;
        const bodyH = body.bounds.max.y - body.bounds.min.y;
        // 用物理包围盒定位，避免三角形等非对称形状质心与几何中心偏移造成错位
        const left = body.bounds.min.x;
        const top = body.bounds.min.y - STAGE_TOP;
        const cloudSquash = type === 'cloud' ? clamp(1 - Math.abs(body.velocity.y) * 0.08, 0.82, 1) : 1;

        let shapeStyle: React.CSSProperties = {
          borderRadius: 16,
          background: `linear-gradient(150deg, ${BASE_COLORS[palette].base}, ${BASE_COLORS[palette].grain})`
        };
        if (type === 'square') {
          shapeStyle.borderRadius = 10;
        } else if (type === 'triangle') {
          shapeStyle = {
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: `linear-gradient(180deg, ${BASE_COLORS[palette].grain}, ${BASE_COLORS[palette].base})`
          };
        } else if (type === 'cylinder') {
          shapeStyle = {
            borderRadius: 999,
            background: `radial-gradient(circle at 35% 30%, ${BASE_COLORS[palette].grain}, ${BASE_COLORS[palette].base})`
          };
        } else if (type === 'arch') {
          shapeStyle = {
            borderRadius: '20px 20px 10px 10px',
            background: `linear-gradient(160deg, ${BASE_COLORS[palette].grain}, ${BASE_COLORS[palette].base})`
          };
        } else if (type === 'cloud') {
          shapeStyle = {
            borderRadius: 999,
            background: cloudGradients[Math.abs(Math.round(body.position.x)) % cloudGradients.length]
          };
        } else if (type === 'star') {
          shapeStyle = {
            clipPath: 'polygon(50% 3%,61% 35%,96% 35%,68% 56%,79% 90%,50% 69%,21% 90%,32% 56%,4% 35%,39% 35%)',
            background: `radial-gradient(circle at 50% 40%, #f9f6ea, ${BASE_COLORS[palette].base})`,
            filter: `drop-shadow(0 0 ${4 + (sparklePhase % 6)}px #fff2b2)`
          };
        }

        return (
          <div
            key={body.plugin.blockId ?? `${body.id}`}
            className="absolute pointer-events-none z-[25]"
            style={{
              left,
              top,
              width: bodyW,
              height: bodyH,
              transform: `scaleY(${cloudSquash})`,
              transformOrigin: '50% 100%'
            }}
          >
            <div
              className="w-full h-full border border-white/40 shadow-[0_5px_10px_rgba(0,0,0,0.11)]"
              style={shapeStyle}
            />
          </div>
        );
      })}

      {activeBody && currentSpec && (
        <div className="absolute left-1/2 -translate-x-1/2 top-3 z-30 text-xs text-[#1a3348] bg-white/65 rounded-full px-3 py-1 pointer-events-none">
          当前积木：{currentSpec.type === 'rect'
            ? '长方块'
            : currentSpec.type === 'square'
              ? '正方块'
              : currentSpec.type === 'triangle'
                ? '三角块'
                : currentSpec.type === 'cylinder'
                  ? '圆柱块'
                  : currentSpec.type === 'arch'
                    ? '拱形块'
                    : currentSpec.type === 'cloud'
                      ? '云朵块'
                      : '星星块'}
        </div>
      )}

      <div className="absolute inset-0 z-[40]">
        <div
          className="absolute inset-0"
          onPointerDown={(event) => {
            if (gameplayPaused || hasCollapsedRef.current || finishedRef.current || failed) return;
            const id = activeBodyIdRef.current;
            if (!id) return;
            const body = worldBodiesRef.current[id];
            if (!body) return;
            const { x, y } = toLocalPoint(event);
            const contains =
              x >= body.bounds.min.x - 22 &&
              x <= body.bounds.max.x + 22 &&
              y >= body.bounds.min.y - 22 &&
              y <= body.bounds.max.y + 22;
            if (!contains) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            holdPointerRef.current = true;
          }}
          onPointerMove={(event) => {
            if (!holdPointerRef.current || gameplayPaused) return;
            const id = activeBodyIdRef.current;
            if (!id) return;
            const body = worldBodiesRef.current[id];
            if (!body || !body.isStatic) return;
            const { x } = toLocalPoint(event);
            const clampedX = clamp(x, 90, VIEW_W - 90);
            Matter.Body.setPosition(body, { x: clampedX, y: SPAWN_Y });
          }}
          onPointerUp={() => tryReleasePointerBlock()}
          onPointerCancel={() => tryReleasePointerBlock()}
          onPointerLeave={() => tryReleasePointerBlock()}
        />
      </div>

      <div className="absolute left-0 right-0 bottom-[32px] z-40 text-center text-sm text-[#1a3348] pointer-events-none">
        按住积木拖动并松开；稳定堆高并通过目标线即可结算
      </div>

      {fallingReset && (
        <div className="absolute inset-0 z-[60] bg-white/20 backdrop-blur-[1px] flex items-center justify-center">
          <div className="px-5 py-3 rounded-2xl bg-white/70 text-[#1a3348] text-sm">积木倒塌了，正在温柔重置...</div>
        </div>
      )}
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#1a3348]">云端还没搭够高</h3>
            <p className="text-sm text-[#3d5a72]">
              积木已用完，高度 {Math.floor(heightPercent)}%，还没碰到目标线。再试一次吧。
            </p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}

      {adminMode && (
        <div className="absolute right-4 top-36 z-50">
          <button onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            测试通关
          </button>
        </div>
      )}
    </div>
  );
};
