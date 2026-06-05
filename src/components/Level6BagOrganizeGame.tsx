import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';

type ItemType = 'pencil' | 'eraser' | 'ruler' | 'sharpener' | 'glue' | 'crayon';

interface ItemSpec {
  type: ItemType;
  label: string;
  icon: string;
  color: string;
  count: number;
}

interface DeskTile {
  id: string;
  type: ItemType;
  layer: 1 | 2 | 3;
  x: number;
  y: number;
  removed: boolean;
  picked: boolean;
}

interface TrayEntry {
  tileId: string;
  type: ItemType;
}

interface FlyFx {
  id: string;
  icon: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const SPECS: ItemSpec[] = [
  { type: 'pencil', label: '铅笔', icon: '✏️', color: '#ffe08a', count: 9 },
  { type: 'eraser', label: '橡皮', icon: '◻️', color: '#f5f5f3', count: 9 },
  { type: 'ruler', label: '直尺', icon: '📏', color: '#d7e7ff', count: 6 },
  { type: 'sharpener', label: '卷笔刀', icon: '🔴', color: '#ffc9c9', count: 6 },
  { type: 'glue', label: '胶棒', icon: '🧴', color: '#f2f2ff', count: 3 },
  { type: 'crayon', label: '蜡笔', icon: '🖍️', color: '#ffe6c2', count: 3 }
];

const LAYER_COUNTS: Array<{ layer: 1 | 2 | 3; count: number; width: number; height: number }> = [
  { layer: 1, count: 16, width: 550, height: 360 },
  { layer: 2, count: 12, width: 460, height: 300 },
  { layer: 3, count: 8, width: 360, height: 220 }
];

const ITEM_W = 92;
const ITEM_H = 78;
const GAMEPLAY_SHIFT_Y = 50;
const TABLE_LEFT = 32;
const TABLE_TOP = 150 + GAMEPLAY_SHIFT_Y;
const TABLE_W = 686;
const TABLE_H = 640;
const TABLE_CX = TABLE_W / 2;
const TABLE_CY = TABLE_H / 2;
const SAFE_LEFT = ITEM_W / 2 + 16;
const SAFE_RIGHT = TABLE_W - ITEM_W / 2 - 72;
const SAFE_TOP = ITEM_H / 2 + 12;
const SAFE_BOTTOM = TABLE_H - ITEM_H / 2 - 14;
const BLOCK_DIST = 72;
const BASE_CAPACITY = 7;
const COMBO_GAP_MS = 2000;

const byType = SPECS.reduce<Record<ItemType, ItemSpec>>((acc, cur) => ({ ...acc, [cur.type]: cur }), {
  pencil: SPECS[0],
  eraser: SPECS[1],
  ruler: SPECS[2],
  sharpener: SPECS[3],
  glue: SPECS[4],
  crayon: SPECS[5]
});

const makeTone = (start: number, end: number, ms: number, gainPeak = 0.14, type: OscillatorType = 'triangle') => {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(start, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + ms / 1000);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + ms / 1000 + 0.02);
  window.setTimeout(() => void ctx.close(), ms + 120);
};

const playClick = () => makeTone(560, 610, 100, 0.12);
const playFly = () => makeTone(470, 760, 130, 0.11);
const playClear = () => makeTone(780, 1020, 180, 0.16);
const playHeartbeat = () => makeTone(140, 130, 150, 0.08, 'sine');
const playTool = () => makeTone(350, 520, 120, 0.11);
const playLose = () => makeTone(260, 170, 220, 0.12, 'sine');
const playWin = () => makeTone(620, 980, 250, 0.16);

const buildDeckOrder = () => {
  const all: ItemType[] = [];
  SPECS.forEach((spec) => {
    for (let i = 0; i < spec.count; i += 1) all.push(spec.type);
  });
  return all.sort(() => Math.random() - 0.5);
};

const clampDeskPoint = (x: number, y: number) => ({
  x: Math.min(SAFE_RIGHT, Math.max(SAFE_LEFT, x)),
  y: Math.min(SAFE_BOTTOM, Math.max(SAFE_TOP, y))
});

const generateLayerSlots = (count: number, width: number, height: number) => {
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);
  const stepX = width / Math.max(1, cols - 1);
  const stepY = height / Math.max(1, rows - 1);
  const slots: Array<{ x: number; y: number }> = [];
  for (let idx = 0; idx < count; idx += 1) {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const rawX = TABLE_CX - width / 2 + col * stepX + (Math.random() - 0.5) * 24;
    const rawY = TABLE_CY - height / 2 + row * stepY + (Math.random() - 0.5) * 22;
    slots.push(clampDeskPoint(rawX, rawY));
  }
  return slots.sort(() => Math.random() - 0.5);
};

const buildInitialTiles = (): DeskTile[] => {
  const order = buildDeckOrder();
  let cursor = 0;
  const tiles: DeskTile[] = [];
  LAYER_COUNTS.forEach((cfg) => {
    const slots = generateLayerSlots(cfg.count, cfg.width, cfg.height);
    slots.forEach((slot, i) => {
      tiles.push({
        id: `tile-${cfg.layer}-${i}`,
        type: order[cursor++],
        layer: cfg.layer,
        x: slot.x,
        y: slot.y,
        removed: false,
        picked: false
      });
    });
  });
  return tiles;
};

const resetFromInitial = (initial: DeskTile[]) =>
  initial.map((tile) => ({ ...tile, removed: false, picked: false, x: tile.x, y: tile.y }));

const slotX = (idx: number) => 112 + idx * 74;

export const Level6BagOrganizeGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, testCompleteLevel, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 6;

  const [tiles, setTiles] = useState<DeskTile[]>([]);
  const [tray, setTray] = useState<TrayEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [tools, setTools] = useState({ undo: 2, shuffle: 1, plus: 1 });
  const [toolUsedCount, setToolUsedCount] = useState(0);
  const [extraSlotOn, setExtraSlotOn] = useState(false);
  const [extraSlotLeft, setExtraSlotLeft] = useState(0);
  const [failState, setFailState] = useState(false);
  const [showRescue, setShowRescue] = useState(false);
  const [rescuedOnce, setRescuedOnce] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboText, setComboText] = useState('');
  const [clearFlash, setClearFlash] = useState(false);
  const [flying, setFlying] = useState<FlyFx | null>(null);
  const [pickedPulseId, setPickedPulseId] = useState<string | null>(null);
  const [slotWarning, setSlotWarning] = useState(false);
  const [done, setDone] = useState(false);

  const startRef = useRef(0);
  const finishRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const comboAtRef = useRef(0);
  const initialTilesRef = useRef<DeskTile[]>([]);
  const rescuePromptedRef = useRef(false);

  const capacity = extraSlotOn ? 8 : BASE_CAPACITY;
  const remainingCount = useMemo(() => tiles.filter((tile) => !tile.removed && !tile.picked).length, [tiles]);

  const blockedIds = useMemo(() => {
    const blocked = new Set<string>();
    const alive = tiles.filter((tile) => !tile.removed && !tile.picked);
    alive.forEach((tile) => {
      const covering = alive.some(
        (other) => other.layer > tile.layer && Math.hypot(other.x - tile.x, other.y - tile.y) < BLOCK_DIST
      );
      if (covering) blocked.add(tile.id);
    });
    return blocked;
  }, [tiles]);

  useEffect(() => {
    if (!isActive) return;
    const initial = buildInitialTiles();
    initialTilesRef.current = initial;
    setTiles(resetFromInitial(initial));
    setTray([]);
    setElapsed(0);
    setTools({ undo: 2, shuffle: 1, plus: 1 });
    setToolUsedCount(0);
    setExtraSlotOn(false);
    setExtraSlotLeft(0);
    setFailState(false);
    setShowRescue(false);
    setRescuedOnce(false);
    setCombo(0);
    setComboText('');
    setClearFlash(false);
    setFlying(null);
    setPickedPulseId(null);
    setSlotWarning(false);
    setDone(false);
    finishRef.current = false;
    rescuePromptedRef.current = false;
    startRef.current = Date.now();
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive || gameplayPaused || done || failState) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isActive, gameplayPaused, done, failState]);

  useEffect(() => {
    if (!extraSlotOn || extraSlotLeft <= 0) return;
    const timer = window.setInterval(() => setExtraSlotLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [extraSlotOn, extraSlotLeft]);

  useEffect(() => {
    if (extraSlotOn && extraSlotLeft === 0) setExtraSlotOn(false);
  }, [extraSlotOn, extraSlotLeft]);

  useEffect(() => {
    if (!isActive || tiles.length === 0 || finishRef.current || remainingCount !== 0) return;
    finishRef.current = true;
    setDone(true);
    playWin();
    finishTimerRef.current = window.setTimeout(() => {
      const stars = toolUsedCount === 0 ? 3 : toolUsedCount <= 2 ? 2 : 1;
      completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
    }, 1200);
  }, [isActive, tiles.length, remainingCount, toolUsedCount, completeLevel]);

  useEffect(
    () => () => {
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const distinct = new Set(tray.map((v) => v.type)).size;
    const warning = tray.length >= 5 && distinct >= 5 && !done && !failState;
    setSlotWarning(warning);
    if (warning) playHeartbeat();
  }, [tray, done, failState]);

  const tryFailCheck = (nextTray: TrayEntry[]) => {
    const countByType = nextTray.reduce<Record<string, number>>((acc, cur) => {
      acc[cur.type] = (acc[cur.type] ?? 0) + 1;
      return acc;
    }, {});
    const hasTriplet = Object.values(countByType).some((count) => count >= 3);
    if (nextTray.length >= capacity && !hasTriplet) {
      setFailState(true);
      playLose();
      if (!rescuedOnce && tools.undo > 0 && !rescuePromptedRef.current) {
        rescuePromptedRef.current = true;
        setShowRescue(true);
      }
    }
  };

  const pickTile = (tile: DeskTile) => {
    if (gameplayPaused || failState || done || blockedIds.has(tile.id) || tile.removed || tile.picked) return;
    playClick();
    playFly();
    setPickedPulseId(tile.id);
    window.setTimeout(() => setPickedPulseId(null), 180);
    setTiles((prev) => prev.map((v) => (v.id === tile.id ? { ...v, picked: true } : v)));
    const currentLen = tray.length;
    setFlying({
      id: tile.id,
      icon: byType[tile.type].icon,
      fromX: TABLE_LEFT + tile.x - 32,
      fromY: TABLE_TOP + tile.y - 26,
      toX: slotX(currentLen) - 32,
      toY: 1174 + GAMEPLAY_SHIFT_Y
    });
    window.setTimeout(() => setFlying(null), 360);

    const nextTray = [...tray, { tileId: tile.id, type: tile.type }];
    const sameType = nextTray.filter((v) => v.type === tile.type);
    if (sameType.length >= 3) {
      const removedSet = new Set(sameType.slice(-3).map((v) => v.tileId));
      const prunedTray = nextTray.filter((v) => !removedSet.has(v.tileId));
      setTray(prunedTray);
      setTiles((prev) => prev.map((v) => (removedSet.has(v.id) ? { ...v, removed: true, picked: false } : v)));
      const now = Date.now();
      const nextCombo = now - comboAtRef.current <= COMBO_GAP_MS ? combo + 1 : 1;
      comboAtRef.current = now;
      setCombo(nextCombo);
      setComboText(nextCombo >= 2 ? `连消 x${nextCombo}` : '');
      if (nextCombo >= 2) makeTone(860 + nextCombo * 70, 1080 + nextCombo * 70, 220, 0.18);
      else playClear();
      setClearFlash(true);
      window.setTimeout(() => setClearFlash(false), 220);
      if (nextCombo >= 2) window.setTimeout(() => setComboText(''), 1200);
      tryFailCheck(prunedTray);
    } else {
      setTray(nextTray);
      tryFailCheck(nextTray);
    }
  };

  const useUndo = () => {
    if (tools.undo <= 0 || tray.length === 0 || done) return;
    const last = tray[tray.length - 1];
    setTools((prev) => ({ ...prev, undo: prev.undo - 1 }));
    setToolUsedCount((v) => v + 1);
    setTray((prev) => prev.slice(0, -1));
    setTiles((prev) => prev.map((tile) => (tile.id === last.tileId ? { ...tile, picked: false } : tile)));
    setFailState(false);
    setShowRescue(false);
    setRescuedOnce(true);
    playTool();
  };

  const useShuffle = () => {
    if (tools.shuffle <= 0 || done) return;
    setTools((prev) => ({ ...prev, shuffle: prev.shuffle - 1 }));
    setToolUsedCount((v) => v + 1);
    setTiles((prev) => {
      const alive = prev.filter((tile) => !tile.removed && !tile.picked);
      const points = alive.map((v) => ({ x: v.x, y: v.y })).sort(() => Math.random() - 0.5);
      let i = 0;
      return prev.map((tile) => {
        if (tile.removed || tile.picked) return tile;
        const point = points[i++];
        const next = clampDeskPoint(point.x, point.y);
        return { ...tile, x: next.x, y: next.y };
      });
    });
    playTool();
  };

  const usePlusSlot = () => {
    if (tools.plus <= 0 || done) return;
    setTools((prev) => ({ ...prev, plus: prev.plus - 1 }));
    setToolUsedCount((v) => v + 1);
    setExtraSlotOn(true);
    setExtraSlotLeft(10);
    setFailState(false);
    playTool();
  };

  const resetBoard = () => {
    setTiles(resetFromInitial(initialTilesRef.current));
    setTray([]);
    setElapsed(0);
    setTools({ undo: 2, shuffle: 1, plus: 1 });
    setToolUsedCount(0);
    setExtraSlotOn(false);
    setExtraSlotLeft(0);
    setFailState(false);
    setShowRescue(false);
    setRescuedOnce(false);
    setCombo(0);
    setComboText('');
    setClearFlash(false);
    setPickedPulseId(null);
    setSlotWarning(false);
    setDone(false);
    finishRef.current = false;
    rescuePromptedRef.current = false;
    startRef.current = Date.now();
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto overflow-hidden bg-[#f6efe4]">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #f8f3ea 0%, #f2e7d6 100%)' }} />
      <LevelTopBar
        title="✏️ 第一天上学啦"
        onPause={() => setGameplayPaused(true)}
        stats={[
          { label: '⏱', value: `${elapsed}s` },
          { label: '剩余文具', value: String(remainingCount) }
        ]}
      />

      <div className="absolute left-8 right-8 top-[200px] h-[640px] rounded-[34px] overflow-hidden border border-[#e6d3b7] bg-[#d9b98e] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35),0_12px_24px_rgba(98,70,42,0.2)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.32),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(18deg,#b88f63,#b88f63 4px,#d8b488 4px,#d8b488 11px)' }} />
        {tiles
          .filter((tile) => !tile.removed && !tile.picked)
          .sort((a, b) => a.layer - b.layer)
          .map((tile) => {
            const blocked = blockedIds.has(tile.id);
            return (
              <button
                key={tile.id}
                onClick={() => pickTile(tile)}
                disabled={blocked || failState || done}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border text-[#4f463d] ${
                  blocked ? 'border-[#cbb79d] bg-[#e4d6c4] opacity-75' : 'border-white/80 bg-white/90 hover:scale-105'
                } ${pickedPulseId === tile.id ? 'animate-[pulse_0.2s_ease-in-out]' : ''}`}
                style={{
                  left: tile.x,
                  top: tile.y,
                  width: ITEM_W,
                  height: ITEM_H,
                  boxShadow: `0 ${tile.layer * 2 + 5}px ${tile.layer * 4 + 8}px rgba(0,0,0,0.16)`
                }}
              >
                <div className="text-2xl leading-none">{byType[tile.type].icon}</div>
                <div className="text-[11px] mt-1">{byType[tile.type].label}</div>
                <div className="absolute inset-0 rounded-2xl" style={{ backgroundColor: byType[tile.type].color, opacity: 0.3 }} />
              </button>
            );
          })}
        {clearFlash && <div className="absolute inset-0 bg-white/30 animate-pulse pointer-events-none" />}
        {comboText && <div className="absolute left-1/2 top-12 -translate-x-1/2 text-2xl font-bold text-[#fff6b8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.32)]">{comboText}</div>}
      </div>

      <div className="absolute left-8 right-8 top-[880px] h-20 grid grid-cols-3 gap-3 z-50">
        <button onClick={useUndo} disabled={tools.undo <= 0 || done} className="rounded-2xl bg-white/85 border border-white text-sm text-[#4a4138]">
          ↶ 撤回 x{tools.undo}
        </button>
        <button onClick={useShuffle} disabled={tools.shuffle <= 0 || done} className="rounded-2xl bg-white/85 border border-white text-sm text-[#4a4138]">
          🔀 洗牌 x{tools.shuffle}
        </button>
        <button onClick={usePlusSlot} disabled={tools.plus <= 0 || done} className="rounded-2xl bg-white/85 border border-white text-sm text-[#4a4138]">
          ➕ 加槽 x{tools.plus}
        </button>
      </div>

      <div
        className={`absolute left-6 right-6 top-[1024px] h-24 rounded-3xl border-2 p-3 flex items-center gap-2 transition-all ${
          slotWarning ? 'border-red-400 bg-red-50/80 animate-pulse' : 'border-[#e9dbc7] bg-[#fff8ef]/80'
        }`}
      >
        {Array.from({ length: capacity }).map((_, idx) => {
          const entry = tray[idx];
          return (
            <div key={`slot-${idx}`} className="w-[74px] h-[66px] rounded-2xl border border-[#d9ccb7] bg-[#f5ecdf] flex items-center justify-center">
              {entry ? <span className="text-2xl">{byType[entry.type].icon}</span> : <span className="text-[#c6baa8]">＿</span>}
            </div>
          );
        })}
      </div>
      <div className="absolute left-0 right-0 top-[1248px] text-center text-sm text-[#62574d] z-40">
        收纳槽 {capacity}格 {extraSlotOn ? `（加槽剩余${extraSlotLeft}s）` : ''} · 清空全部文具即可通关
      </div>

      {flying && (
        <div
          className="absolute pointer-events-none text-3xl z-[70]"
          style={{
            left: flying.fromX,
            top: flying.fromY,
            animation: 'flyToSlot 360ms cubic-bezier(.2,.9,.2,1) forwards',
            ['--toX' as string]: `${flying.toX - flying.fromX}px`,
            ['--toY' as string]: `${flying.toY - flying.fromY}px`
          }}
        >
          {flying.icon}
        </div>
      )}

      {failState && (
        <div className="absolute inset-0 z-[85] bg-black/40 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#4a4138]">收纳槽满了</h3>
            <p className="text-sm text-[#3d5a72]">课桌还没清空，试试道具补救或重新挑战。</p>
            {showRescue && tools.undo > 0 && (
              <button onClick={useUndo} className="w-full py-2 rounded-xl bg-[#f9dccf] text-[#5f4c3e] font-semibold">
                使用撤回补救（↶）
              </button>
            )}
            <button onClick={resetBoard} className="w-full py-2 rounded-xl bg-[#e3f2fc] text-[#5f4c3e]">
              再试试
            </button>
          </div>
        </div>
      )}

      {adminMode && (
        <div className="absolute right-4 top-36 z-50">
          <button onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            直接通关
          </button>
        </div>
      )}

      <style>{`
        @keyframes flyToSlot {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          80% { transform: translate(var(--toX), calc(var(--toY) - 18px)) scale(0.86); opacity: 1; }
          100% { transform: translate(var(--toX), var(--toY)) scale(0.78); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
};
