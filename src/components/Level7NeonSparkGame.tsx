import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
}

/** 5×5 空位多，便于「一步多子」减压步数 */
const GRID_SIZE = 5;
/** 2048 链太长易劝退；本关胜利定为 1024，合并深度减半，总局步数大幅下降 */
const TARGET_VALUE = 1024;
const MOVE_DURATION_MS = 160;
const CLEAR_NEW_TILE_MS = 120;
/** 合并后空位 ≥ 此值：一步连落 3 块；否则见 DOUBLE_SPAWN_MIN_EMPTY */
const TRIPLE_SPAWN_MIN_EMPTY = 16;
/** 空位 ≥ 此值（且不足三连阈值）：一步落 2 块 */
const DOUBLE_SPAWN_MIN_EMPTY = 8;
const MAX_BOARD_SIZE = 620;
const MIN_BOARD_SIZE = 500;
const BOARD_PADDING = 18;
const GAP = 14;
const BEST_TILE_KEY = 'ctx2026_level7_best_tile';
const SWIPE_THRESHOLD = 18;

const TILE_COLORS: Record<number, { bg: string; text: string; ring?: string }> = {
  2: { bg: '#EFE3D0', text: '#4E3F31' },
  4: { bg: '#E8D1B2', text: '#4E3F31' },
  8: { bg: '#D8B188', text: '#4A3728' },
  16: { bg: '#CB9368', text: '#FAF3E5' },
  32: { bg: '#C2884D', text: '#FAF3E5' },
  64: { bg: '#876244', text: '#FAF3E5' },
  128: { bg: '#8D4E3F', text: '#FAF3E5' },
  256: { bg: '#3E322B', text: '#F6EEDB' },
  512: { bg: '#48343D', text: '#F6EEDB' },
  1024: { bg: '#7A6538', text: '#FFF3D1', ring: '#C9A45D' },
  2048: { bg: '#8B6A2D', text: '#FFF4CF', ring: '#E2BA59' }
};

const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * 前中期略提高 4 的比例（比纯 2 更省步数）；盘面变大后仍压低大块概率防堵死。
 */
const weightedSpawnPick = (pool: number[], maxTileOnBoard: number): number => {
  if (pool.length === 1) return pool[0];
  const rush = maxTileOnBoard < 384;
  const weights = pool.map((v) => {
    if (rush) {
      if (v === 2) return 24;
      if (v === 4) return 38;
      if (v === 8) return 26;
      if (v === 16) return 9;
      return 4;
    }
    if (v <= 2) return 50;
    if (v <= 4) return 28;
    if (v <= 8) return 14;
    if (v <= 16) return 6;
    return 2;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
};

/** 胜利目标 1024，掉落池收紧并更早引入 8，减少低位磨蹭步数 */
const pickSpawnValue = (maxTileOnBoard: number): number => {
  let pool: number[];
  if (maxTileOnBoard < 8) pool = [2];
  else if (maxTileOnBoard < 16) pool = [2, 4];
  else if (maxTileOnBoard < 128) pool = [2, 4, 8];
  else if (maxTileOnBoard < 512) pool = [2, 4, 8, 16];
  else pool = [2, 4, 8, 16, 32];
  return weightedSpawnPick(pool, maxTileOnBoard);
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getEmptyCells = (tiles: Tile[]) => {
  const occupied = new Set(tiles.map((tile) => `${tile.row}-${tile.col}`));
  const cells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!occupied.has(`${row}-${col}`)) cells.push({ row, col });
    }
  }
  return cells;
};

const spawnRandomTile = (tiles: Tile[], nextIdRef: React.MutableRefObject<number>) => {
  const empties = getEmptyCells(tiles);
  if (empties.length === 0) return tiles;
  const cell = randomPick(empties);
  const maxOnBoard = tiles.reduce((max, x) => Math.max(max, x.value), 0);
  const tile: Tile = {
    id: nextIdRef.current++,
    value: pickSpawnValue(maxOnBoard),
    row: cell.row,
    col: cell.col,
    isNew: true
  };
  return [...tiles, tile];
};

/** 空位越多一步落得越多；后半盘自动退回单次，避免瞬间堵死 */
const spawnAfterMove = (tiles: Tile[], nextIdRef: React.MutableRefObject<number>) => {
  const emptyBefore = getEmptyCells(tiles).length;
  let extra = 0;
  if (emptyBefore >= TRIPLE_SPAWN_MIN_EMPTY) extra = 2;
  else if (emptyBefore >= DOUBLE_SPAWN_MIN_EMPTY) extra = 1;

  let next = spawnRandomTile(tiles, nextIdRef);
  for (let i = 0; i < extra; i += 1) {
    if (getEmptyCells(next).length < 1) break;
    next = spawnRandomTile(next, nextIdRef);
  }
  return next;
};

const createInitialTiles = (nextIdRef: React.MutableRefObject<number>) => {
  let tiles: Tile[] = [];
  for (let i = 0; i < 6; i += 1) tiles = spawnRandomTile(tiles, nextIdRef);
  return tiles;
};

const lineCells = (direction: Direction, fixed: number) => {
  const cells: Array<{ row: number; col: number }> = [];
  for (let idx = 0; idx < GRID_SIZE; idx += 1) {
    if (direction === 'left') cells.push({ row: fixed, col: idx });
    if (direction === 'right') cells.push({ row: fixed, col: GRID_SIZE - 1 - idx });
    if (direction === 'up') cells.push({ row: idx, col: fixed });
    if (direction === 'down') cells.push({ row: GRID_SIZE - 1 - idx, col: fixed });
  }
  return cells;
};

const canMove = (tiles: Tile[]) => {
  const grid = Array.from({ length: GRID_SIZE }, () => Array<number>(GRID_SIZE).fill(0));
  tiles.forEach((tile) => {
    grid[tile.row][tile.col] = tile.value;
  });
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const val = grid[row][col];
      if (!val) return true;
      if (row + 1 < GRID_SIZE && grid[row + 1][col] === val) return true;
      if (col + 1 < GRID_SIZE && grid[row][col + 1] === val) return true;
    }
  }
  return false;
};

const moveTiles = (tiles: Tile[], direction: Direction) => {
  const map = new Map<string, Tile>();
  tiles.forEach((tile) => map.set(`${tile.row}-${tile.col}`, tile));
  const nextTiles: Tile[] = [];
  let scoreGain = 0;
  let moved = false;
  let maxTile = 0;

  for (let fixed = 0; fixed < GRID_SIZE; fixed += 1) {
    const cells = lineCells(direction, fixed);
    const lineTiles = cells
      .map((cell) => map.get(`${cell.row}-${cell.col}`))
      .filter((tile): tile is Tile => Boolean(tile));

    let cursor = 0;
    let idx = 0;
    while (idx < lineTiles.length) {
      const current = lineTiles[idx];
      const targetCell = cells[cursor];
      const next = lineTiles[idx + 1];
      if (next && next.value === current.value) {
        const mergedValue = current.value * 2;
        scoreGain += mergedValue;
        maxTile = Math.max(maxTile, mergedValue);
        const mergedTile: Tile = {
          id: current.id,
          value: mergedValue,
          row: targetCell.row,
          col: targetCell.col
        };
        if (current.row !== targetCell.row || current.col !== targetCell.col || next.row !== targetCell.row || next.col !== targetCell.col) {
          moved = true;
        }
        nextTiles.push(mergedTile);
        idx += 2;
        cursor += 1;
      } else {
        maxTile = Math.max(maxTile, current.value);
        const keptTile: Tile = {
          ...current,
          row: targetCell.row,
          col: targetCell.col
        };
        if (current.row !== targetCell.row || current.col !== targetCell.col) moved = true;
        nextTiles.push(keptTile);
        idx += 1;
        cursor += 1;
      }
    }
  }

  tiles.forEach((tile) => {
    if (!nextTiles.some((next) => next.id === tile.id && next.row === tile.row && next.col === tile.col && next.value === tile.value)) {
      // noop, only used for movement detection through merged branches above.
    }
  });

  return { moved, scoreGain, maxTile, tiles: nextTiles.map((tile) => ({ ...tile, isNew: false })) };
};

const audioPulse = (from: number, to: number, ms: number, gainPeak: number, type: OscillatorType = 'triangle') => {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + ms / 1000);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + ms / 1000 + 0.04);
  window.setTimeout(() => void ctx.close(), ms + 180);
};

const playSlideSound = () => audioPulse(230, 170, 110, 0.08, 'sawtooth');
const playMergeSound = () => audioPulse(290, 510, 130, 0.09, 'triangle');
const playSpawnSound = () => audioPulse(160, 130, 140, 0.08, 'sine');
const playBlockedSound = () => audioPulse(120, 90, 160, 0.08, 'sine');
const playWinSound = () => {
  [0, 180, 360, 540, 760].forEach((delay, i) => {
    window.setTimeout(() => audioPulse(340 + i * 60, 490 + i * 80, 240, 0.1, 'triangle'), delay);
  });
};

export const Level7NeonSparkGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    goHome,
    completeLevel,
    adminMode,
    testCompleteLevel,
    runId
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 7;

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [stuckHint, setStuckHint] = useState('');
  const [boardFullOverlay, setBoardFullOverlay] = useState<{ maxValue: number; stars: number } | null>(null);
  const [boardSize, setBoardSize] = useState(560);

  const nextIdRef = useRef(1);
  const finishRef = useRef(false);
  const stuckTimerRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const cellSize = useMemo(() => (boardSize - BOARD_PADDING * 2 - GAP * (GRID_SIZE - 1)) / GRID_SIZE, [boardSize]);
  const currentMax = useMemo(() => tiles.reduce((max, tile) => Math.max(max, tile.value), 0), [tiles]);

  useEffect(() => {
    const onResize = () => {
      const viewport = window.innerWidth * 0.78;
      setBoardSize(clamp(Math.floor(viewport), MIN_BOARD_SIZE, MAX_BOARD_SIZE));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    nextIdRef.current = 1;
    finishRef.current = false;
    setScore(0);
    setAnimating(false);
    setStuckHint('');
    setBoardFullOverlay(null);
    setTiles(createInitialTiles(nextIdRef));
    const saved = Number(localStorage.getItem(BEST_TILE_KEY) ?? 0);
    setBestTile(Number.isFinite(saved) ? saved : 0);
    if (stuckTimerRef.current) {
      window.clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, [isActive, runId]);

  useEffect(
    () => () => {
      if (stuckTimerRef.current) window.clearTimeout(stuckTimerRef.current);
    },
    []
  );

  const resolveFailure = (maxValue: number) => {
    if (finishRef.current) return;
    finishRef.current = true;
    const stars = maxValue >= 768 ? 2 : maxValue >= 512 ? 1 : 0;
    playBlockedSound();
    setBoardFullOverlay({ maxValue, stars });
  };

  const resolveSuccess = () => {
    if (finishRef.current) return;
    finishRef.current = true;
    playWinSound();
    window.setTimeout(() => {
      completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 });
    }, 950);
  };

  const runMove = (direction: Direction) => {
    if (!isActive || gameplayPaused || animating || finishRef.current) return;
    const movedResult = moveTiles(tiles, direction);
    if (!movedResult.moved) {
      playBlockedSound();
      setStuckHint('这个方向不能再移动了');
      if (stuckTimerRef.current) window.clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = window.setTimeout(() => setStuckHint(''), 900);
      return;
    }

    setAnimating(true);
    playSlideSound();
    if (movedResult.scoreGain > 0) playMergeSound();
    setScore((prev) => prev + movedResult.scoreGain);
    setTiles(movedResult.tiles);

    window.setTimeout(() => {
      let nextTiles = spawnAfterMove(movedResult.tiles, nextIdRef);
      playSpawnSound();
      const nextMax = nextTiles.reduce((max, tile) => Math.max(max, tile.value), 0);
      setTiles(nextTiles);
      setBestTile((prev) => {
        const nextBest = Math.max(prev, nextMax);
        localStorage.setItem(BEST_TILE_KEY, String(nextBest));
        return nextBest;
      });
      setAnimating(false);
      setStuckHint('');

      if (nextMax >= TARGET_VALUE) {
        resolveSuccess();
        return;
      }
      if (!canMove(nextTiles)) {
        resolveFailure(nextMax);
      }
      window.setTimeout(() => {
        nextTiles = nextTiles.map((tile) => ({ ...tile, isNew: false }));
        setTiles(nextTiles);
      }, CLEAR_NEW_TILE_MS);
    }, MOVE_DURATION_MS);
  };

  const handleDragStart = (x: number, y: number) => {
    dragStartRef.current = { x, y };
  };

  const handleDragEnd = (x: number, y: number) => {
    if (!dragStartRef.current) return;
    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;
    dragStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) runMove(dx > 0 ? 'right' : 'left');
    else runMove(dy > 0 ? 'down' : 'up');
  };

  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') runMove('up');
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') runMove('down');
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') runMove('left');
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') runMove('right');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, tiles, animating, gameplayPaused]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto overflow-hidden bg-[#EAE3D6]">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(32deg,#e8e0d2,#e8e0d2 6px,#ede6d9 6px,#ede6d9 13px)' }} />

      <LevelTopBar
        title="🧩 数字华容道"
        onPause={() => setGameplayPaused(true)}
        stats={[
          { label: '🏆 目标', value: String(TARGET_VALUE) },
          { label: '⭐', value: `${currentMax >= TARGET_VALUE ? 3 : currentMax >= 768 ? 2 : currentMax >= 512 ? 1 : 0}/3` }
        ]}
      />

      <div className="absolute inset-x-0 top-[160px] flex justify-center">
        <div
          className="relative rounded-[30px] border-[8px] border-[#60452F] shadow-[0_16px_36px_rgba(60,38,20,0.35)]"
          style={{ width: boardSize, height: boardSize, background: '#D7B58D', touchAction: 'none' }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleDragStart(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0];
            handleDragEnd(touch.clientX, touch.clientY);
          }}
          onPointerDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onPointerUp={(e) => handleDragEnd(e.clientX, e.clientY)}
          onPointerCancel={() => {
            dragStartRef.current = null;
          }}
        >
          <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_26%_18%,rgba(255,255,255,0.22),rgba(0,0,0,0))]" />
          <div className="absolute inset-[14px] rounded-[16px] border border-[#86664B]/30" />

          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            return (
              <div
                key={`cell-${row}-${col}`}
                className="absolute rounded-[14px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.32),inset_0_-1px_2px_rgba(70,46,24,0.15)]"
                style={{
                  width: cellSize,
                  height: cellSize,
                  left: BOARD_PADDING + col * (cellSize + GAP),
                  top: BOARD_PADDING + row * (cellSize + GAP),
                  background: '#C7A27B'
                }}
              />
            );
          })}

          {tiles.map((tile) => {
            const colors = TILE_COLORS[tile.value] ?? TILE_COLORS[2048];
            return (
              <div
                key={tile.id}
                className={`absolute rounded-[14px] border border-white/25 flex items-center justify-center font-black transition-all ${
                  animating ? 'duration-150' : 'duration-100'
                } ${tile.isNew ? 'animate-[tile-pop_180ms_ease-out]' : ''}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  left: BOARD_PADDING + tile.col * (cellSize + GAP),
                  top: BOARD_PADDING + tile.row * (cellSize + GAP),
                  background: colors.bg,
                  color: colors.text,
                  boxShadow: `0 8px 14px rgba(60,36,20,0.28), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(64,42,21,0.18), ${colors.ring ? `0 0 0 2px ${colors.ring}` : '0 0 0 0 transparent'}`,
                  fontSize:
                    GRID_SIZE >= 5
                      ? tile.value >= 1024
                        ? 22
                        : tile.value >= 128
                          ? 26
                          : 30
                      : tile.value >= 1024
                        ? 34
                        : tile.value >= 128
                          ? 40
                          : 46,
                  textShadow: '0 1px 0 rgba(255,255,255,0.18)',
                  fontFamily: '"Helvetica Neue", Arial, sans-serif'
                }}
              >
                {tile.value}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute left-12 right-12 top-[840px] h-[110px] rounded-3xl border border-[#B89871] bg-[#E7D5BE]/90 shadow-[0_8px_20px_rgba(78,53,30,0.2)] px-6 py-4 flex items-center justify-between text-[#4C3C2E]">
        <div className="text-xl font-bold">本局得分：{score}</div>
        <div className="text-xl font-bold">最高记录：{Math.max(bestTile, currentMax)}</div>
      </div>

      <div className="absolute left-8 right-8 top-[972px] rounded-2xl bg-[#F5EEE4]/80 border border-[#CDB596] px-5 py-3 text-sm text-[#675543] text-center">
        {GRID_SIZE}×{GRID_SIZE} · 通关 {TARGET_VALUE} · 开局六格 · 空位≥{TRIPLE_SPAWN_MIN_EMPTY}一步三块、≥{DOUBLE_SPAWN_MIN_EMPTY}一步两块 · 更快凑连锁（动画仍舒缓）。
      </div>
      {stuckHint && <div className="absolute left-8 right-8 top-[1036px] text-center text-sm text-[#7A4A35]">{stuckHint}</div>}

      {adminMode && (
        <div className="absolute right-4 top-36 z-50">
          <button onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            直接通关
          </button>
        </div>
      )}

      {boardFullOverlay && (
        <div className="absolute inset-0 z-[92] bg-black/45 flex items-center justify-center px-10">
          <div className="w-full max-w-[520px] rounded-3xl bg-[#F8F1E8] border border-[#C4A98C] p-6 text-center shadow-[0_20px_40px_rgba(60,38,20,0.35)] space-y-4">
            <h3 className="text-xl font-bold text-[#4a3728]">棋盘已满</h3>
            <p className="text-sm text-[#675543] leading-relaxed">
              没有空位且无法再合并，本局结束。
              <br />
              本局最高数字：<span className="font-bold text-[#4a3728]">{boardFullOverlay.maxValue}</span>
              ，通关目标 <span className="font-bold">{TARGET_VALUE}</span>
              {boardFullOverlay.stars > 0 ? (
                <>
                  <br />
                  <span className="text-[#6b5344]">已达到安慰评价：{boardFullOverlay.stars} 星；返回主页时会为你结算存档。</span>
                </>
              ) : (
                <>
                  <br />
                  <span className="text-[#6b5344]">未达到 512 不计星，可多试几局。</span>
                </>
              )}
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBoardFullOverlay(null);
                  finishRef.current = false;
                  restartCurrentLevel();
                }}
                className="w-full py-3 rounded-2xl bg-[#E9D8C0] border border-[#B89871] text-[#4a3728] font-semibold"
              >
                再来一局
              </button>
              <button
                type="button"
                onClick={() => {
                  const { stars } = boardFullOverlay;
                  setBoardFullOverlay(null);
                  if (stars > 0) {
                    completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
                  }
                  goHome();
                }}
                className="w-full py-3 rounded-2xl bg-[#EDE6DE] border border-[#CDB596] text-[#5f4c3e]"
              >
                返回主页
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tile-pop {
          0% { transform: scale(0.82); opacity: 0.65; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
