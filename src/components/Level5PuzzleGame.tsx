import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../utils/levelTheme';

type EdgeType = -1 | 0 | 1;

interface PieceData {
  id: string;
  row: number;
  col: number;
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
}

interface DragState {
  pieceId: string;
  x: number;
  y: number;
  snapped: boolean;
}

interface ReboundGhost {
  id: number;
  piece: PieceData;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startAt: number;
}

const GRID = 4;
const BOARD_SIZE = 560;
const CELL = BOARD_SIZE / GRID;
const TAB = 20;
const PIECE_SIZE = CELL + TAB * 2;
const BOARD_X = (DESIGN_WIDTH - BOARD_SIZE) / 2;
const BOARD_Y = 96;
const SNAP_DISTANCE = 58;
const LEVEL_TIME_TARGET = 120;
const PUZZLE_IMAGE = '/images/level5-puzzle.png';
const REBOUND_MS = 320;
const SNAP_TARGET_Y_OFFSET = CELL - PIECE_SIZE / 3 + PIECE_SIZE / 10;

const toStagePoint = (stage: HTMLDivElement, clientX: number, clientY: number) => {
  const rect = stage.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (DESIGN_WIDTH / rect.width),
    y: (clientY - rect.top) * (DESIGN_HEIGHT / rect.height)
  };
};

const buildPieces = (): PieceData[] => {
  const pieces: PieceData[] = [];
  const vertical: EdgeType[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID - 1 }, () => 0 as EdgeType));
  const horizontal: EdgeType[][] = Array.from({ length: GRID - 1 }, () => Array.from({ length: GRID }, () => 0 as EdgeType));

  for (let r = 0; r < GRID; r += 1) {
    for (let c = 0; c < GRID - 1; c += 1) {
      vertical[r][c] = (r + c) % 2 === 0 ? 1 : -1;
    }
  }
  for (let r = 0; r < GRID - 1; r += 1) {
    for (let c = 0; c < GRID; c += 1) {
      horizontal[r][c] = (r + c) % 2 === 0 ? -1 : 1;
    }
  }

  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      pieces.push({
        id: `piece-${row}-${col}`,
        row,
        col,
        top: row === 0 ? 0 : (-horizontal[row - 1][col] as EdgeType),
        right: col === GRID - 1 ? 0 : vertical[row][col],
        bottom: row === GRID - 1 ? 0 : horizontal[row][col],
        left: col === 0 ? 0 : (-vertical[row][col - 1] as EdgeType)
      });
    }
  }

  return pieces.sort(() => Math.random() - 0.5);
};

const edgePath = (edge: EdgeType, side: 'top' | 'right' | 'bottom' | 'left'): string => {
  const bump = TAB * edge;
  const neck = CELL * 0.23;
  const center = TAB + CELL / 2;
  if (side === 'top') {
    if (edge === 0) return `L ${TAB + CELL} ${TAB}`;
    return `L ${center - neck} ${TAB}
      C ${center - neck * 0.4} ${TAB} ${center - neck * 0.65} ${TAB - bump} ${center} ${TAB - bump}
      C ${center + neck * 0.65} ${TAB - bump} ${center + neck * 0.4} ${TAB} ${center + neck} ${TAB}
      L ${TAB + CELL} ${TAB}`;
  }
  if (side === 'right') {
    if (edge === 0) return `L ${TAB + CELL} ${TAB + CELL}`;
    return `L ${TAB + CELL} ${center - neck}
      C ${TAB + CELL} ${center - neck * 0.4} ${TAB + CELL + bump} ${center - neck * 0.65} ${TAB + CELL + bump} ${center}
      C ${TAB + CELL + bump} ${center + neck * 0.65} ${TAB + CELL} ${center + neck * 0.4} ${TAB + CELL} ${center + neck}
      L ${TAB + CELL} ${TAB + CELL}`;
  }
  if (side === 'bottom') {
    if (edge === 0) return `L ${TAB} ${TAB + CELL}`;
    return `L ${center + neck} ${TAB + CELL}
      C ${center + neck * 0.4} ${TAB + CELL} ${center + neck * 0.65} ${TAB + CELL + bump} ${center} ${TAB + CELL + bump}
      C ${center - neck * 0.65} ${TAB + CELL + bump} ${center - neck * 0.4} ${TAB + CELL} ${center - neck} ${TAB + CELL}
      L ${TAB} ${TAB + CELL}`;
  }
  if (edge === 0) return `L ${TAB} ${TAB}`;
  return `L ${TAB} ${center + neck}
    C ${TAB} ${center + neck * 0.4} ${TAB - bump} ${center + neck * 0.65} ${TAB - bump} ${center}
    C ${TAB - bump} ${center - neck * 0.65} ${TAB} ${center - neck * 0.4} ${TAB} ${center - neck}
    L ${TAB} ${TAB}`;
};

const piecePath = (piece: PieceData): string =>
  `M ${TAB} ${TAB}
   ${edgePath(piece.top, 'top')}
   ${edgePath(piece.right, 'right')}
   ${edgePath(piece.bottom, 'bottom')}
   ${edgePath(piece.left, 'left')}
   Z`;

const pieceCenter = (piece: PieceData) => ({
  x: BOARD_X + piece.col * CELL + CELL / 2,
  y: BOARD_Y + piece.row * CELL + CELL / 2
});

const playClick = () => {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.09);
  window.setTimeout(() => void ctx.close(), 120);
};

export const Level5PuzzleGame: React.FC = () => {
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
  const isActive = status === 'playing' && currentLevelId === 5;

  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [glowOn, setGlowOn] = useState(false);
  const [showFinalReveal, setShowFinalReveal] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [reboundGhosts, setReboundGhosts] = useState<ReboundGhost[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(0);
  const finishRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const reboundIdRef = useRef(1);

  const placedCount = useMemo(() => Object.values(placed).filter(Boolean).length, [placed]);
  useEffect(() => {
    if (!isActive) return;
    const seed = buildPieces();
    setPieces(seed);
    setPlaced({});
    setDrag(null);
    setMistakes(0);
    setElapsed(0);
    setCompleted(false);
    setGlowOn(false);
    setShowFinalReveal(false);
    setShakeId(null);
    setReboundGhosts([]);
    finishRef.current = false;
    startRef.current = Date.now();
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive || gameplayPaused || completed) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 200);
    return () => window.clearInterval(timer);
  }, [isActive, gameplayPaused, completed]);

  useEffect(() => {
    if (!isActive || finishRef.current || placedCount < GRID * GRID) return;
    finishRef.current = true;
    setCompleted(true);
    setGlowOn(true);
    setShowFinalReveal(true);
    finishTimerRef.current = window.setTimeout(() => {
      const stars = mistakes === 0 && elapsed <= LEVEL_TIME_TARGET ? 3 : mistakes >= 8 && elapsed > 210 ? 1 : 2;
      completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 });
    }, 3000);
  }, [isActive, placedCount, mistakes, elapsed, completeLevel]);

  useEffect(() => () => {
    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isActive || !drag || gameplayPaused || completed) return;
    const onMove = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const point = toStagePoint(stage, event.clientX, event.clientY);
      const piece = pieces.find((p) => p.id === drag.pieceId);
      if (!piece) return;
      const home = pieceCenter(piece);
      const targetY = home.y + SNAP_TARGET_Y_OFFSET;
      const centerX = point.x;
      const centerY = point.y;
      const dist = Math.hypot(home.x - centerX, targetY - centerY);
      const snapped = dist < SNAP_DISTANCE;
      setDrag((cur) => (cur ? { ...cur, x: snapped ? home.x : centerX, y: snapped ? targetY : centerY, snapped } : cur));
    };

    const onUp = () => {
      setDrag((cur) => {
        if (!cur || gameplayPaused || completed) return null;
        if (cur.snapped) {
          setPlaced((prev) => ({ ...prev, [cur.pieceId]: true }));
          playClick();
        } else {
          const piece = pieces.find((p) => p.id === cur.pieceId);
          if (piece) {
            const idx = pieces.findIndex((p) => p.id === piece.id);
            const trayCol = idx % 3;
            const trayRow = Math.floor(idx / 3);
            setReboundGhosts((prev) => [
              ...prev,
              {
                id: reboundIdRef.current++,
                piece,
                fromX: cur.x,
                fromY: cur.y,
                toX: 134 + trayCol * 200,
                toY: 815 + trayRow * 118,
                startAt: Date.now()
              }
            ]);
          }
          setMistakes((m) => m + 1);
          setShakeId(cur.pieceId);
          window.setTimeout(() => setShakeId(null), 220);
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isActive, drag, gameplayPaused, completed, pieces]);

  useEffect(() => {
    if (!isActive || reboundGhosts.length === 0) return;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      setReboundGhosts((cur) => cur.filter((g) => now - g.startAt <= REBOUND_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, reboundGhosts.length]);

  const onDragStart = (event: React.PointerEvent<HTMLButtonElement>, pieceId: string) => {
    if (gameplayPaused || completed) return;
    const stage = stageRef.current;
    if (!stage) return;
    const point = toStagePoint(stage, event.clientX, event.clientY);
    setDrag({
      pieceId,
      x: point.x,
      y: point.y,
      snapped: false
    });
  };

  if (!isActive) return null;

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 z-30 pointer-events-auto overflow-hidden bg-[#f6efe7]"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 20% 15%, #fff4e8 0%, #f6efe7 45%, #f1e7db 100%)' }}
      />
      <LevelTopBar
        title="🧩 故事夜的萤光页"
        onPause={() => setGameplayPaused(true)}
        stats={[
          { label: '⏱', value: `${elapsed}s` },
          { label: '进度', value: `${placedCount}/${GRID * GRID}` },
          { label: '失误', value: String(mistakes) }
        ]}
      />

      <div className="absolute left-0 right-0 top-[7.5rem] flex justify-center">
        <div className="relative" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
          <div className="absolute inset-0 rounded-[22px] bg-[#ece8e2] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]" />
          {!showFinalReveal &&
            pieces.map((piece) => {
              const isPlaced = Boolean(placed[piece.id]);
              const p = piecePath(piece);
              const x = piece.col * CELL - TAB;
              const y = piece.row * CELL - TAB;
              return (
                <div key={`slot-${piece.id}`} className="absolute" style={{ left: x, top: y, width: PIECE_SIZE, height: PIECE_SIZE }}>
                  <svg viewBox={`0 0 ${PIECE_SIZE} ${PIECE_SIZE}`} className="w-full h-full">
                    <defs>
                      <clipPath id={`slot-clip-${piece.id}`}>
                        <path d={p} />
                      </clipPath>
                    </defs>
                    <image
                      href={PUZZLE_IMAGE}
                      x={TAB - piece.col * CELL}
                      y={TAB - piece.row * CELL}
                      width={BOARD_SIZE}
                      height={BOARD_SIZE}
                      preserveAspectRatio="none"
                      clipPath={`url(#slot-clip-${piece.id})`}
                      style={{ filter: isPlaced ? 'none' : 'grayscale(100%) brightness(1.08)' }}
                    />
                    <path d={p} fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth={1} />
                  </svg>
                </div>
              );
            })}
          {showFinalReveal && (
            <div className="absolute inset-0 overflow-hidden rounded-[22px]">
              <img
                src={PUZZLE_IMAGE}
                alt="拼图完整版"
                className="absolute inset-0 w-full h-full object-cover animate-[pulse_1.6s_ease-in-out_infinite]"
                style={{
                  transform: 'scale(1.02)',
                  filter: 'saturate(1.08) brightness(1.04)',
                  animation: 'fadeInScale 420ms ease-out forwards, pulse 1.6s ease-in-out infinite 420ms'
                }}
              />
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          )}
          {!showFinalReveal && drag?.snapped && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute w-10 h-10 rounded-full bg-white/40 blur-md"
                style={{ left: drag.x - BOARD_X - 20, top: drag.y - BOARD_Y - 20 }}
              />
            </div>
          )}
        </div>
      </div>

      <div className={`absolute left-0 right-0 bottom-20 top-[730px] px-4 ${showFinalReveal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="h-full rounded-[22px] border border-white/60 bg-white/40 backdrop-blur-[2px] overflow-y-auto px-3 py-4">
          <div className="grid grid-cols-3 gap-3 pb-8">
            {pieces
              .filter((piece) => !placed[piece.id])
              .map((piece) => (
                <button
                  key={piece.id}
                  onPointerDown={(event) => onDragStart(event, piece.id)}
                  className={`relative p-2 rounded-xl bg-white/70 border border-white/80 shadow-[0_4px_10px_rgba(0,0,0,0.08)] ${shakeId === piece.id ? 'animate-[pulse_0.2s_ease-in-out]' : ''}`}
                >
                  <svg viewBox={`0 0 ${PIECE_SIZE} ${PIECE_SIZE}`} className="w-full h-auto">
                    <defs>
                      <clipPath id={`tray-clip-${piece.id}`}>
                        <path d={piecePath(piece)} />
                      </clipPath>
                    </defs>
                    <image
                      href={PUZZLE_IMAGE}
                      x={TAB - piece.col * CELL}
                      y={TAB - piece.row * CELL}
                      width={BOARD_SIZE}
                      height={BOARD_SIZE}
                      preserveAspectRatio="none"
                      clipPath={`url(#tray-clip-${piece.id})`}
                    />
                    <path d={piecePath(piece)} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} />
                  </svg>
                </button>
              ))}
          </div>
        </div>
      </div>

      {!showFinalReveal && drag && !placed[drag.pieceId] && (() => {
        const piece = pieces.find((v) => v.id === drag.pieceId);
        if (!piece) return null;
        return (
          <div
            className="absolute pointer-events-none z-50"
            style={{ left: drag.x - PIECE_SIZE / 2, top: drag.y - PIECE_SIZE / 2, width: PIECE_SIZE, height: PIECE_SIZE }}
          >
            <svg viewBox={`0 0 ${PIECE_SIZE} ${PIECE_SIZE}`} className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
              <defs>
                <clipPath id={`drag-clip-${piece.id}`}>
                  <path d={piecePath(piece)} />
                </clipPath>
              </defs>
              <image
                href={PUZZLE_IMAGE}
                x={TAB - piece.col * CELL}
                y={TAB - piece.row * CELL}
                width={BOARD_SIZE}
                height={BOARD_SIZE}
                preserveAspectRatio="none"
                clipPath={`url(#drag-clip-${piece.id})`}
              />
              <path d={piecePath(piece)} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} />
            </svg>
          </div>
        );
      })()}

      <div className="absolute left-0 right-0 bottom-8 text-center text-sm text-[#6a625e] z-40">
        拖动下方碎片到上方网格，靠近正确位置会轻柔吸附；错误会弹回
      </div>

      {glowOn && (
        <div className="absolute inset-0 z-60 pointer-events-none">
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
          <div className="absolute left-1/2 top-[390px] -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-white/30 blur-2xl" />
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>

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
