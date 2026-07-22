// === 新玩法：自由摆放 + 旋转（旧吸附玩法见 Level5PuzzleGame.legacy.tsx）===
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { DESIGN_WIDTH, DESIGN_HEIGHT, FRESH } from '../utils/levelTheme';
import { playCorrect, playFlip, playPop, playWin } from '../utils/levelAudio';
import { useLevelAssetsGate } from '../hooks/useLevelAssetsGate';

type Rotation = 0 | 90 | 180 | 270;

interface PieceData {
  id: string;
  row: number;
  col: number;
}

interface DragState {
  pieceId: string;
  fromSlot: number | null;
  x: number;
  y: number;
}

const GRID = 4;
const TOTAL = GRID * GRID;
/** 接近满宽，手机上更易看清 */
const BOARD_SIZE = 680;
const CELL = BOARD_SIZE / GRID;
const TRAY_PIECE = 148;
const REF_SIZE = 168;
const REF_DEFAULT = { x: DESIGN_WIDTH - REF_SIZE - 12, y: 118 };
const PUZZLE_IMAGE = '/images/level5-puzzle.webp';
const ROTATIONS: Rotation[] = [0, 90, 180, 270];

const randomRotation = (): Rotation => ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];

const buildPieces = (): PieceData[] => {
  const pieces: PieceData[] = [];
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      pieces.push({ id: `piece-${row}-${col}`, row, col });
    }
  }
  return pieces.sort(() => Math.random() - 0.5);
};

const targetSlot = (piece: PieceData) => piece.row * GRID + piece.col;

/** 外层 App 有 transform:scale，需把视口坐标换算回设计稿坐标 */
const toStagePoint = (stage: HTMLDivElement, clientX: number, clientY: number) => {
  const rect = stage.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (DESIGN_WIDTH / rect.width),
    y: (clientY - rect.top) * (DESIGN_HEIGHT / rect.height)
  };
};

export const Level5PuzzleGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    completeLevel,
    runId,
    adminMode,
    testCompleteLevel
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 5;
  const assetsReady = useLevelAssetsGate(5, isActive, runId);

  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(TOTAL).fill(null));
  const [rotations, setRotations] = useState<Record<string, Rotation>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [refPos, setRefPos] = useState(REF_DEFAULT);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(0);
  const finishRef = useRef(false);
  const pointerDownRef = useRef<{ pieceId: string; x: number; y: number; t: number; fromSlot: number | null } | null>(null);
  const refDragRef = useRef<{ ox: number; oy: number; startX: number; startY: number } | null>(null);

  const trayPieces = useMemo(
    () => pieces.filter((p) => !slots.includes(p.id) && drag?.pieceId !== p.id),
    [pieces, slots, drag]
  );
  const placedCount = useMemo(() => slots.filter(Boolean).length, [slots]);

  const succeed = useCallback(() => {
    if (finishRef.current) return;
    finishRef.current = true;
    setCompleted(true);
    playWin();
    const stars = elapsed <= 120 ? 3 : elapsed <= 210 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 500);
  }, [completeLevel, elapsed]);

  const resetBoard = useCallback(() => {
    const seed = buildPieces();
    const rots: Record<string, Rotation> = {};
    seed.forEach((p) => {
      let r = randomRotation();
      if (Math.random() < 0.7 && r === 0) r = ROTATIONS[1 + Math.floor(Math.random() * 3)];
      rots[p.id] = r;
    });
    setPieces(seed);
    setSlots(Array(TOTAL).fill(null));
    setRotations(rots);
    setDrag(null);
    setRefPos(REF_DEFAULT);
    setElapsed(0);
    setCompleted(false);
    finishRef.current = false;
    startRef.current = Date.now();
    pointerDownRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive) return;
    resetBoard();
  }, [isActive, runId, resetBoard]);

  useEffect(() => {
    if (!isActive || gameplayPaused || completed) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isActive, gameplayPaused, completed]);

  const checkWin = useCallback(
    (nextSlots: (string | null)[], nextRots: Record<string, Rotation>) => {
      if (nextSlots.some((id) => !id)) return;
      const ok = nextSlots.every((id, slot) => {
        if (!id) return false;
        const piece = pieces.find((p) => p.id === id);
        if (!piece) return false;
        return targetSlot(piece) === slot && (nextRots[id] ?? 0) === 0;
      });
      if (ok) succeed();
    },
    [pieces, succeed]
  );

  const slotAtPoint = (clientX: number, clientY: number): number | null => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * GRID);
    const row = Math.floor(((clientY - rect.top) / rect.height) * GRID);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return null;
    return row * GRID + col;
  };

  const stagePoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: clientX, y: clientY };
    return toStagePoint(stage, clientX, clientY);
  };

  useEffect(() => {
    if (!isActive || !drag || gameplayPaused || completed) return;

    const onMove = (event: PointerEvent) => {
      const pt = stagePoint(event.clientX, event.clientY);
      setDrag((cur) => (cur ? { ...cur, x: pt.x, y: pt.y } : cur));
    };

    const onUp = (event: PointerEvent) => {
      const cur = drag;
      setDrag(null);
      if (!cur || gameplayPaused || completed) return;

      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      const moved =
        !down ||
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > 12 ||
        Date.now() - down.t > 280;

      if (!moved && cur.fromSlot !== null) {
        playFlip();
        setRotations((prev) => {
          const curRot = prev[cur.pieceId] ?? 0;
          const nextRot = ((curRot + 90) % 360) as Rotation;
          const next = { ...prev, [cur.pieceId]: nextRot };
          checkWin(slots, next);
          return next;
        });
        return;
      }

      const target = slotAtPoint(event.clientX, event.clientY);
      setSlots((prev) => {
        const next = [...prev];
        if (cur.fromSlot !== null) next[cur.fromSlot] = null;

        if (target === null) {
          playPop();
          return next;
        }

        const occupant = next[target];
        if (occupant && occupant !== cur.pieceId) {
          if (cur.fromSlot !== null) next[cur.fromSlot] = occupant;
        }
        next[target] = cur.pieceId;
        playCorrect();
        checkWin(next, rotations);
        return next;
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
  }, [isActive, drag, gameplayPaused, completed, slots, rotations, checkWin]);

  const beginRefDrag = (event: React.PointerEvent) => {
    if (gameplayPaused || completed || drag) return;
    event.preventDefault();
    event.stopPropagation();
    const pt = stagePoint(event.clientX, event.clientY);
    refDragRef.current = {
      ox: pt.x - refPos.x,
      oy: pt.y - refPos.y,
      startX: event.clientX,
      startY: event.clientY
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onRefPointerMove = (event: React.PointerEvent) => {
    const cur = refDragRef.current;
    if (!cur) return;
    event.preventDefault();
    event.stopPropagation();
    const pt = stagePoint(event.clientX, event.clientY);
    const maxX = DESIGN_WIDTH - REF_SIZE - 4;
    const maxY = DESIGN_HEIGHT - REF_SIZE - 40;
    setRefPos({
      x: Math.min(Math.max(pt.x - cur.ox, 4), maxX),
      y: Math.min(Math.max(pt.y - cur.oy, 64), maxY)
    });
  };

  const endRefDrag = (event: React.PointerEvent) => {
    if (!refDragRef.current) return;
    event.stopPropagation();
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    refDragRef.current = null;
  };

  const beginDrag = (pieceId: string, fromSlot: number | null, event: React.PointerEvent) => {
    if (gameplayPaused || completed || refDragRef.current) return;
    event.preventDefault();
    const pt = stagePoint(event.clientX, event.clientY);
    pointerDownRef.current = { pieceId, x: event.clientX, y: event.clientY, t: Date.now(), fromSlot };
    setDrag({ pieceId, fromSlot, x: pt.x, y: pt.y });
  };

  const renderPieceFace = (piece: PieceData, size: number, rot: Rotation, extraClass = '') => (
    <div
      className={`relative overflow-hidden rounded-lg border-2 border-white/80 shadow-md ${extraClass}`}
      style={{ width: size, height: size, transform: `rotate(${rot}deg)` }}
    >
      <img
        src={PUZZLE_IMAGE}
        alt=""
        draggable={false}
        className="absolute max-w-none pointer-events-none select-none"
        style={{
          width: size * GRID,
          height: size * GRID,
          left: -piece.col * size,
          top: -piece.row * size
        }}
      />
    </div>
  );

  if (!isActive || !assetsReady) return null;

  const dragPiece = drag ? pieces.find((p) => p.id === drag.pieceId) : null;
  const dragSize = CELL - 8;

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden"
      style={{ background: FRESH.bgGrad }}
    >
      <LevelTopBar
        title="🧩 萤光故事页"
        onPause={() => setGameplayPaused(true)}
        statsInline
        stats={[{ label: '进度', value: `${placedCount}/${TOTAL}` }]}
      />

      {/* 可拖动参考图：默认再下移，不挡棋盘时可自行挪开 */}
      <div
        className="absolute z-[70] rounded-2xl overflow-hidden border-[3px] border-white shadow-xl bg-white/95 touch-none cursor-grab active:cursor-grabbing"
        style={{ left: refPos.x, top: refPos.y, width: REF_SIZE }}
        onPointerDown={beginRefDrag}
        onPointerMove={onRefPointerMove}
        onPointerUp={endRefDrag}
        onPointerCancel={endRefDrag}
      >
        <img src={PUZZLE_IMAGE} alt="参考图" className="w-full h-auto block pointer-events-none" draggable={false} />
        <div className="text-xs text-center py-1 text-[#5a7a92] bg-white/95 font-semibold pointer-events-none">拖动参考图</div>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col items-center pt-8 px-4 pb-4 gap-3">
        {/* 大棋盘 */}
        <div
          ref={boardRef}
          className="relative rounded-3xl border-[3px] border-white/90 bg-white/40 shadow-lg shrink-0"
          style={{ width: BOARD_SIZE, height: BOARD_SIZE, marginTop: 28 }}
        >
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {Array.from({ length: TOTAL }, (_, slot) => {
              const pieceId = slots[slot];
              const piece = pieceId ? pieces.find((p) => p.id === pieceId) : null;
              const isDraggingHere = drag?.pieceId === pieceId;
              return (
                <div
                  key={slot}
                  className="border border-white/60 bg-white/25 flex items-center justify-center"
                  style={{ width: CELL, height: CELL }}
                >
                  {piece && !isDraggingHere && (
                    <button
                      type="button"
                      className="p-0 active:scale-95 touch-none"
                      onPointerDown={(e) => beginDrag(piece.id, slot, e)}
                    >
                      {renderPieceFace(piece, CELL - 8, rotations[piece.id] ?? 0)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-[#5a7a92] text-center px-2 shrink-0">
          拖入任意格 · 点击已放碎片可旋转
        </p>

        {/* 大托盘 */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto rounded-3xl border-2 border-white/70 bg-white/45 px-3 py-3">
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {trayPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className="p-1 rounded-xl bg-white/85 border-2 border-white shadow-sm active:scale-95 touch-none"
                onPointerDown={(e) => beginDrag(piece.id, null, e)}
              >
                {renderPieceFace(piece, TRAY_PIECE, rotations[piece.id] ?? 0)}
              </button>
            ))}
          </div>
          {trayPieces.length === 0 && !drag && (
            <p className="text-center text-base text-[#5a7a92] py-8">托盘已空 · 点棋盘上碎片旋转调整</p>
          )}
        </div>
      </div>

      {dragPiece && drag && (
        <div
          className="absolute pointer-events-none z-50 drop-shadow-2xl"
          style={{
            left: drag.x,
            top: drag.y,
            transform: 'translate(-50%, -50%)',
            width: dragSize,
            height: dragSize
          }}
        >
          {renderPieceFace(dragPiece, dragSize, rotations[dragPiece.id] ?? 0, 'opacity-95')}
        </div>
      )}

      {adminMode && (
        <div className="absolute left-4 top-36 z-50 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => testCompleteLevel?.()}
            className="px-3 py-2 bg-black/35 text-white rounded-full text-xs"
          >
            测试通关
          </button>
          <button
            type="button"
            onClick={restartCurrentLevel}
            className="px-3 py-2 bg-black/35 text-white rounded-full text-xs"
          >
            重置
          </button>
        </div>
      )}
    </div>
  );
};

/* ===== LEGACY SNAP GAMEPLAY (archived) =====
 * 完整旧代码已备份至同目录 Level5PuzzleGame.legacy.tsx（导出 Level5PuzzleGameLegacy）。
 * 恢复方式：将 Level5PuzzleGame.legacy.tsx 内容拷回本文件，并把导出名改回 Level5PuzzleGame。
 * ========================================== */
