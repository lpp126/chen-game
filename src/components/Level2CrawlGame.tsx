import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LevelTopBar } from './LevelTopBar';
import { playSoftClick, playStep, playWin } from '../utils/levelAudio';

type Point = { x: number; y: number };

const CELL = 40;
const MAZE_COLS = 17;
const MAZE_ROWS = 33;
const OFFSET_X = 20;
const OFFSET_Y = 12;
const MAZE_W = OFFSET_X + MAZE_COLS * CELL;
const MAZE_H = OFFSET_Y + MAZE_ROWS * CELL;
/** 适配顶栏下方区域，略留边距、不裁切 */
const MAZE_FIT_BOOST = 0.92;
const STAGE_TOP = 76;

const cellCenter = (gx: number, gy: number): Point => ({
  x: OFFSET_X + gx * CELL + CELL / 2,
  y: OFFSET_Y + gy * CELL + CELL / 2
});

const generateHellMaze = (rows: number, cols: number): number[][] => {
  const maze = Array.from({ length: rows }, () => Array(cols).fill(1));
  const dirs = [
    [0, 2],
    [0, -2],
    [2, 0],
    [-2, 0]
  ];

  const stack: Array<[number, number]> = [[1, 1]];
  maze[1][1] = 0;

  while (stack.length) {
    const [cy, cx] = stack[stack.length - 1];
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    let carved = false;
    for (const [dy, dx] of shuffled) {
      const ny = cy + dy;
      const nx = cx + dx;
      if (ny <= 0 || ny >= rows - 1 || nx <= 0 || nx >= cols - 1) continue;
      if (maze[ny][nx] === 0) continue;
      maze[cy + dy / 2][cx + dx / 2] = 0;
      maze[ny][nx] = 0;
      stack.push([ny, nx]);
      carved = true;
      break;
    }
    if (!carved) stack.pop();
  }

  maze[1][1] = 0;
  maze[rows - 2][cols - 2] = 0;
  return maze;
};

export const Level2CrawlGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    completeLevel,
    adminMode,
    runId,
    restartCurrentLevel,
    goLevelSelect,
    goNextLevel
  } = useGameStore();

  const [maze] = useState(() => generateHellMaze(MAZE_ROWS, MAZE_COLS));
  const [player, setPlayer] = useState<Point>(cellCenter(1, 1));
  const [path, setPath] = useState<Point[]>([]);
  const [blockMark, setBlockMark] = useState<Point | null>(null);
  const [footprints, setFootprints] = useState<Array<Point & { id: number; ttl: number }>>([]);
  const [toast, setToast] = useState('');
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const dragRef = useRef({ dragging: false, moved: false, sx: 0, sy: 0 });
  const finishedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const [fitScale, setFitScale] = useState(1);

  const isActive = status === 'playing' && currentLevelId === 2;
  const exitPos = cellCenter(MAZE_COLS - 2, MAZE_ROWS - 2);

  const walkable = useMemo(() => {
    const grid = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(false));
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) grid[y][x] = maze[y][x] === 0;
    }
    return grid;
  }, [maze]);

  useEffect(() => {
    if (!isActive) return;
    setStartAt(Date.now());
    setPlayer(cellCenter(1, 1));
    setPath([]);
    setBlockMark(null);
    setFootprints([]);
    setToast('');
    finishedRef.current = false;
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive) return;
    const el = stageRef.current;
    if (!el) return;

    const updateFit = () => {
      const node = stageRef.current;
      if (!node) return;
      // 用布局尺寸（750×1334 稿内坐标），避免外层 transform: scale 导致内置/外置浏览器算出来不一致
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;

      const scale = Math.min(width / MAZE_W, height / MAZE_H) * MAZE_FIT_BOOST;
      const drawW = MAZE_W * scale;
      const drawH = MAZE_H * scale;
      fitRef.current = {
        scale,
        offsetX: (width - drawW) / 2,
        offsetY: (height - drawH) / 2
      };
      setFitScale(scale);
    };

    updateFit();
    const raf = requestAnimationFrame(updateFit);
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    window.addEventListener('resize', updateFit);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', updateFit);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    let raf = 0;
    const step = () => {
      setPath((cur) => {
        if (!cur.length || gameplayPaused) return cur;
        const next = cur[0];
        setPlayer((p) => {
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const dist = Math.hypot(dx, dy);
          const speed = 1.8;
          if (dist <= speed) return { x: next.x, y: next.y };
          const np = { x: p.x + (dx / dist) * speed, y: p.y + (dy / dist) * speed };
          setFootprints((f) => [...f.slice(-30), { ...np, id: Date.now() + Math.random(), ttl: 1 }]);
          return np;
        });
        return Math.hypot(next.x - player.x, next.y - player.y) < 5 ? cur.slice(1) : cur;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isActive, player.x, player.y, gameplayPaused]);

  useEffect(() => {
    if (!isActive) return;
    if (gameplayPaused) return;
    const t = window.setInterval(() => {
      setFootprints((f) => f.map((v) => ({ ...v, ttl: v.ttl - 0.08 })).filter((v) => v.ttl > 0));
    }, 60);
    return () => window.clearInterval(t);
  }, [isActive, gameplayPaused]);

  const doFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    playWin();
    const elapsed = (Date.now() - startAt) / 1000;
    const starsRank = elapsed <= 90 ? 3 : 2;
    completeLevel({ stars: starsRank, orangesCollected: starsRank, orangeTotal: 3 });
  };

  useEffect(() => {
    if (!isActive || gameplayPaused) return;
    if (Math.hypot(player.x - exitPos.x, player.y - exitPos.y) < 36) {
      doFinish();
    }
  }, [player, isActive, exitPos.x, exitPos.y, gameplayPaused, startAt]);

  const straightRoute = (from: Point, to: Point): Point[] | null => {
    const sx = Math.floor((from.x - OFFSET_X) / CELL);
    const sy = Math.floor((from.y - OFFSET_Y) / CELL);
    const tx = Math.floor((to.x - OFFSET_X) / CELL);
    const ty = Math.floor((to.y - OFFSET_Y) / CELL);
    if (tx < 0 || ty < 0 || tx >= MAZE_COLS || ty >= MAZE_ROWS) return null;
    if (!walkable[ty]?.[tx]) return null;
    if (sx !== tx && sy !== ty) return null;

    const route: Point[] = [];
    if (sx === tx) {
      const step = ty > sy ? 1 : -1;
      for (let y = sy + step; y !== ty + step; y += step) {
        if (!walkable[y]?.[sx]) return null;
        route.push(cellCenter(sx, y));
      }
      return route;
    }

    const step = tx > sx ? 1 : -1;
    for (let x = sx + step; x !== tx + step; x += step) {
      if (!walkable[sy]?.[x]) return null;
      route.push(cellCenter(x, sy));
    }
    return route;
  };

  const toWorldPoint = (clientX: number, clientY: number): Point => {
    const el = stageRef.current;
    if (!el) return { x: clientX, y: clientY };
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

    const logicalX = ((clientX - rect.left) / rect.width) * el.clientWidth;
    const logicalY = ((clientY - rect.top) / rect.height) * el.clientHeight;
    const { scale, offsetX, offsetY } = fitRef.current;
    return {
      x: Math.min(Math.max((logicalX - offsetX) / scale, 0), MAZE_W - 1),
      y: Math.min(Math.max((logicalY - offsetY) / scale, 0), MAZE_H - 1)
    };
  };

  const handleTap = (clientX: number, clientY: number) => {
    const p = toWorldPoint(clientX, clientY);
    const snapped = {
      x: OFFSET_X + Math.floor((p.x - OFFSET_X) / CELL) * CELL + CELL / 2,
      y: OFFSET_Y + Math.floor((p.y - OFFSET_Y) / CELL) * CELL + CELL / 2
    };
    const route = straightRoute(player, snapped);
    if (!route) {
      const sx = Math.floor((player.x - OFFSET_X) / CELL);
      const sy = Math.floor((player.y - OFFSET_Y) / CELL);
      const tx = Math.floor((snapped.x - OFFSET_X) / CELL);
      const ty = Math.floor((snapped.y - OFFSET_Y) / CELL);
      const sameAxis = sx === tx || sy === ty;
      setToast(sameAxis ? '前方有障碍，无法直走到达' : '该点需要拐弯，请分步点击');
      setTimeout(() => setToast(''), 700);
      setBlockMark({ x: p.x, y: p.y });
      setTimeout(() => setBlockMark(null), 350);
      return;
    }
    playSoftClick();
    playStep();
    setPath(route);
  };

  const adminDirectPass = () => {
    completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 });
  };

  const adminNextLevel = () => {
    completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 });
    setTimeout(() => goNextLevel(), 60);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto bg-[#dcecf5] overflow-hidden">
      <LevelTopBar
        title="🐣 第一步探险"
        onPause={() => setGameplayPaused(true)}
        stats={[]}
      />

      {adminMode && (
        <div className="absolute right-4 top-36 z-[90] pointer-events-auto">
          <button
            onClick={() => setShowAdminTools((v) => !v)}
            className="px-3 py-2 bg-black/30 text-white rounded-full text-xs"
          >
            测试
          </button>
          {showAdminTools && (
            <div className="mt-2 w-28 bg-white rounded-xl p-2 shadow space-y-1">
              <button onClick={adminDirectPass} className="w-full text-xs bg-red-50 rounded py-1">直接通关</button>
              <button onClick={restartCurrentLevel} className="w-full text-xs bg-gray-50 rounded py-1">重置本关</button>
              <button onClick={adminNextLevel} className="w-full text-xs bg-red-50 rounded py-1">下一关</button>
            </div>
          )}
        </div>
      )}

      <div
        ref={stageRef}
        className="absolute inset-x-0 bottom-0 touch-none overflow-hidden flex items-center justify-center"
        style={{ top: STAGE_TOP }}
        onPointerDown={(e) => {
          dragRef.current = { dragging: true, moved: false, sx: e.clientX, sy: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.dragging || gameplayPaused) return;
          const dx = e.clientX - dragRef.current.sx;
          const dy = e.clientY - dragRef.current.sy;
          if (Math.abs(dx) + Math.abs(dy) > 6) dragRef.current.moved = true;
        }}
        onPointerUp={(e) => {
          if (!dragRef.current.moved && !gameplayPaused) handleTap(e.clientX, e.clientY);
          dragRef.current.dragging = false;
        }}
      >
        <div
          className="relative shrink-0"
          style={{
            width: MAZE_W,
            height: MAZE_H,
            transform: `scale(${fitScale})`,
            transformOrigin: 'center center',
            backgroundImage:
              'linear-gradient(to right, rgba(70,70,70,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,70,70,0.10) 1px, transparent 1px)',
            backgroundSize: `${CELL}px ${CELL}px`,
            backgroundPosition: `${OFFSET_X}px ${OFFSET_Y}px`
          }}
        >
          {maze.map((row, gy) =>
            row.map((cell, gx) =>
              cell === 1 ? (
                <div
                  key={`w-${gx}-${gy}`}
                  className="absolute rounded-md"
                  style={{
                    left: OFFSET_X + gx * CELL + 6,
                    top: OFFSET_Y + gy * CELL + 6,
                    width: Math.max(8, CELL - 12),
                    height: Math.max(8, CELL - 12),
                    background: '#b9c6c9'
                  }}
                />
              ) : null
            )
          )}
          {footprints.map((f) => (
            <div key={f.id} className="absolute w-2 h-2 rounded-full bg-yellow-200" style={{ left: f.x, top: f.y, opacity: f.ttl }} />
          ))}
          <div className="absolute text-3xl" style={{ left: exitPos.x - 14, top: exitPos.y - 14 }}>🌟</div>
          <div className="absolute w-5 h-5 rounded-full bg-pink-300 border-2 border-white" style={{ left: player.x - 10, top: player.y - 10 }} />
          {blockMark && <div className="absolute text-red-500 text-xl font-bold" style={{ left: blockMark.x - 8, top: blockMark.y - 8 }}>×</div>}
        </div>
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 z-[90] bg-black/60 text-white px-4 py-2 rounded-full text-sm" style={{ top: STAGE_TOP + 8 }}>
          {toast}
        </div>
      )}
    </div>
  );
};
