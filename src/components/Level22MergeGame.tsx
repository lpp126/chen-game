import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

type GraphLevel = {
  title: string;
  hint: string;
  nodeCount: number;
  edges: Record<number, number[]>;
  pos: Record<number, { x: number; y: number }>;
};

const LEVELS: GraphLevel[] = [
  {
    title: '入门六连',
    hint: '6 点一笔连完',
    nodeCount: 6,
    edges: { 0: [1, 3], 1: [0, 2, 4], 2: [1, 5], 3: [0, 4], 4: [1, 3, 5], 5: [2, 4] },
    pos: { 0: { x: 80, y: 60 }, 1: { x: 180, y: 60 }, 2: { x: 280, y: 60 }, 3: { x: 80, y: 160 }, 4: { x: 180, y: 160 }, 5: { x: 280, y: 160 } }
  },
  {
    title: '七环挑战',
    hint: '7 点，中心与四角相连',
    nodeCount: 7,
    edges: { 0: [1, 3], 1: [0, 2, 4], 2: [1, 5], 3: [0, 4, 6], 4: [1, 3, 5, 6], 5: [2, 4], 6: [3, 4] },
    pos: { 0: { x: 70, y: 50 }, 1: { x: 180, y: 40 }, 2: { x: 290, y: 50 }, 3: { x: 50, y: 150 }, 4: { x: 180, y: 130 }, 5: { x: 310, y: 150 }, 6: { x: 180, y: 210 } }
  },
  {
    title: '八阵迷宫',
    hint: '8 点双行网格，竖线可穿',
    nodeCount: 8,
    edges: { 0: [1, 7], 1: [0, 2, 6], 2: [1, 3, 5], 3: [2, 4], 4: [3, 5], 5: [2, 4, 6], 6: [1, 5, 7], 7: [0, 6] },
    pos: { 0: { x: 60, y: 55 }, 1: { x: 130, y: 55 }, 2: { x: 200, y: 55 }, 3: { x: 270, y: 55 }, 4: { x: 270, y: 175 }, 5: { x: 200, y: 175 }, 6: { x: 130, y: 175 }, 7: { x: 60, y: 175 } }
  }
];

export const Level22MergeGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 22;

  const [levelIdx, setLevelIdx] = useState(0);
  const [path, setPath] = useState<number[]>([]);
  const [ended, setEnded] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  const level = LEVELS[levelIdx];
  const starsPreview = useMemo(() => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), [mistakes]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setLevelIdx(0);
    setPath([]);
    setEnded(false);
    setMistakes(0);
  }, [isActive, runId]);

  const resetPath = () => setPath([]);

  const tapNode = (n: number) => {
    if (!isActive || gameplayPaused || ended) return;
    const { edges, nodeCount } = level;
    if (path.length === 0) {
      playPop();
      setPath([n]);
      return;
    }
    const last = path[path.length - 1];
    if (path.includes(n)) {
      if (n === last) return;
      playWrong();
      setMistakes((m) => m + 1);
      resetPath();
      return;
    }
    if (!edges[last]?.includes(n)) {
      playWrong();
      setMistakes((m) => m + 1);
      resetPath();
      return;
    }
    playPop();
    const np = [...path, n];
    setPath(np);
    if (np.length === nodeCount) {
      playCorrect();
      if (levelIdx + 1 >= LEVELS.length) succeed();
      else {
        window.setTimeout(() => {
          setLevelIdx((i) => i + 1);
          resetPath();
        }, 500);
      }
    }
  };

  if (!isActive) return null;

  const lines: Array<[number, number]> = [];
  Object.entries(level.edges).forEach(([a, list]) => {
    list.forEach((b) => {
      if (Number(a) < b) lines.push([Number(a), b]);
    });
  });

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title={`✏️ ${level.title}`}
        onPause={() => setGameplayPaused(true)}
        hint={`${level.hint} · 不可重复、不可跳线 · 第 ${levelIdx + 1}/${LEVELS.length} 关`}
        stats={[
          { label: '进度', value: `${path.length}/${level.nodeCount}` },
          { label: '失误', value: String(mistakes) },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div className="relative w-[360px] h-[260px] rounded-3xl bg-white/85 border border-white shadow-lg">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {lines.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={level.pos[a].x} y1={level.pos[a].y} x2={level.pos[b].x} y2={level.pos[b].y} stroke="#ccb494" strokeWidth={3} strokeLinecap="round" />
            ))}
            {path.length > 1 &&
              path.slice(1).map((n, i) => {
                const a = path[i];
                return <line key={i} x1={level.pos[a].x} y1={level.pos[a].y} x2={level.pos[n].x} y2={level.pos[n].y} stroke="#9eb39f" strokeWidth={4} strokeLinecap="round" />;
              })}
          </svg>
          {Object.entries(level.pos).map(([id, p]) => {
            const n = Number(id);
            const active = path.includes(n);
            const last = path[path.length - 1] === n;
            return (
              <button
                key={id}
                type="button"
                onClick={() => tapNode(n)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-white shadow-md text-base font-bold active:scale-95 ${last ? 'scale-110 ring-2 ring-[#3aab8e]' : ''}`}
                style={{
                  left: p.x,
                  top: p.y,
                  background: active ? `linear-gradient(145deg, ${PALETTE[n % PALETTE.length]}, ${PALETTE[(n + 1) % PALETTE.length]})` : '#e3f2fc',
                  color: active ? '#fff' : '#1a3348'
                }}
              >
                {n + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
