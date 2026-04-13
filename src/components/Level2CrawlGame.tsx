import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

type Point = { x: number; y: number };

const WORLD_W = 750;
const WORLD_H = 1330;
const CELL = 38; // 缩小格子，提升迷宫密度
const MAZE_COLS = 17; // 奇数，便于递归回溯挖路
const MAZE_ROWS = 33; // 奇数
const OFFSET_X = 52; // 让迷宫居中显示
const OFFSET_Y = 38;

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
    completeLevel,
    runOranges,
    setRunOrangeTotal,
    adminMode,
    restartCurrentLevel,
    goNextLevel
  } = useGameStore();

  const [maze] = useState(() => generateHellMaze(MAZE_ROWS, MAZE_COLS));
  const [player, setPlayer] = useState<Point>(cellCenter(1, 1));
  const [path, setPath] = useState<Point[]>([]);
  const [blockMark, setBlockMark] = useState<Point | null>(null);
  const [footprints, setFootprints] = useState<Array<Point & { id: number; ttl: number }>>([]);
  const [toast, setToast] = useState('');
  const [standingMode, setStandingMode] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const dragRef = useRef({ dragging: false, moved: false, sx: 0, sy: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);

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
    setRunOrangeTotal(0);
    setStartAt(Date.now());
  }, [isActive, setRunOrangeTotal]);

  useEffect(() => {
    if (!isActive) return;
    let raf = 0;
    const step = () => {
      setPath((cur) => {
        if (!cur.length || standingMode) return cur;
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
  }, [isActive, player.x, player.y, standingMode]);

  useEffect(() => {
    if (!isActive) return;
    const t = window.setInterval(() => {
      setFootprints((f) => f.map((v) => ({ ...v, ttl: v.ttl - 0.08 })).filter((v) => v.ttl > 0));
    }, 60);
    return () => window.clearInterval(t);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!standingMode && Math.hypot(player.x - exitPos.x, player.y - exitPos.y) < 36) {
      setStandingMode(true);
    }
  }, [player, isActive, standingMode, exitPos.x, exitPos.y]);

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
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const scaleX = WORLD_W / rect.width;
    const scaleY = WORLD_H / rect.height;
    return {
      x: Math.min(Math.max((clientX - rect.left) * scaleX, 0), WORLD_W - 1),
      y: Math.min(Math.max((clientY - rect.top) * scaleY, 0), WORLD_H - 1)
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
    setPath(route);
  };

  const doFinish = () => {
    const elapsed = (Date.now() - startAt) / 1000;
    const starsRank = elapsed <= 90 ? 3 : 2;
    completeLevel({ stars: starsRank, orangesCollected: runOranges, orangeTotal: 0 });
  };

  const adminDirectPass = () => {
    completeLevel({ stars: 3, orangesCollected: runOranges, orangeTotal: 0 });
  };

  const adminNextLevel = () => {
    completeLevel({ stars: 3, orangesCollected: runOranges, orangeTotal: 0 });
    setTimeout(() => goNextLevel(), 60);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto bg-[#f6efe8] overflow-hidden">
      <div className="absolute left-3 top-3 z-20 bg-white/80 px-3 py-1 rounded-full text-sm">第2关 匍匐的星轨（高难迷宫）</div>
      {adminMode && (
        <div className="absolute right-4 top-28 z-30 pointer-events-auto">
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
        className="absolute inset-0 touch-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(70,70,70,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,70,70,0.10) 1px, transparent 1px)',
          backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: `${OFFSET_X}px ${OFFSET_Y}px`
        }}
        onPointerDown={(e) => {
          dragRef.current = { dragging: true, moved: false, sx: e.clientX, sy: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.dragging || standingMode) return;
          const dx = e.clientX - dragRef.current.sx;
          const dy = e.clientY - dragRef.current.sy;
          if (Math.abs(dx) + Math.abs(dy) > 6) dragRef.current.moved = true;
        }}
        onPointerUp={(e) => {
          if (!dragRef.current.moved && !standingMode) handleTap(e.clientX, e.clientY);
          dragRef.current.dragging = false;
        }}
      >
        <div className="absolute" style={{ width: WORLD_W, height: WORLD_H }}>
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

      {toast && <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-black/60 text-white px-4 py-2 rounded-full z-30">{toast}</div>}

      {standingMode && (
        <div
          className="absolute inset-0 z-40 bg-black/25 flex flex-col items-center justify-center"
          onTouchStart={(e) => setSwipeStartY(e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (swipeStartY !== null && swipeStartY - e.changedTouches[0].clientY > 120) {
              setToast('你学会走路了！');
              setTimeout(doFinish, 800);
            }
            setSwipeStartY(null);
          }}
          onMouseDown={(e) => setSwipeStartY(e.clientY)}
          onMouseUp={(e) => {
            if (swipeStartY !== null && swipeStartY - e.clientY > 120) {
              setToast('你学会走路了！');
              setTimeout(doFinish, 800);
            }
            setSwipeStartY(null);
          }}
        >
          <div className="text-6xl animate-bounce">⬆️</div>
          <p className="mt-3 text-white font-bold">向上轻扫，完成站立</p>
        </div>
      )}
    </div>
  );
};
