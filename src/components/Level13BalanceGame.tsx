import React, { useCallback, useEffect, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

type Tile = { rot: number };

/** 仅直管：偶数 rot = 横通，奇数 = 竖（断流） */
const PUZZLES: Tile[][] = [
  [{ rot: 1 }, { rot: 3 }, { rot: 1 }, { rot: 3 }, { rot: 1 }],
  [{ rot: 3 }, { rot: 1 }, { rot: 0 }, { rot: 3 }, { rot: 1 }],
  [{ rot: 1 }, { rot: 1 }, { rot: 3 }, { rot: 1 }, { rot: 3 }]
];

const isHorizontal = (t: Tile) => t.rot % 2 === 0;
const isConnected = (tiles: Tile[]) => tiles.every(isHorizontal);

export const Level13BalanceGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 13;

  const [pIdx, setPIdx] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => PUZZLES[0].map((t) => ({ ...t })));
  const [ended, setEnded] = useState(false);
  const [msg, setMsg] = useState('点击水管旋转至横向，让水从左流到右');

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 }), 280);
  }, [completeLevel]);

  useEffect(() => {
    if (!isActive) return;
    setPIdx(0);
    setTiles(PUZZLES[0].map((t) => ({ ...t })));
    setEnded(false);
    setMsg('点击水管旋转至横向，让水从左流到右');
  }, [isActive, runId]);

  const tap = (i: number) => {
    if (!isActive || gameplayPaused || ended) return;
    playPop();
    setTiles((prev) => prev.map((t, idx) => (idx === i ? { rot: (t.rot + 1) % 4 } : t)));
    setMsg('横管 ━ 才能通水');
  };

  const test = () => {
    if (!isActive || gameplayPaused || ended) return;
    if (isConnected(tiles)) {
      playCorrect();
      if (pIdx + 1 >= PUZZLES.length) {
        setMsg('三路全通！');
        window.setTimeout(succeed, 400);
      } else {
        const ni = pIdx + 1;
        setPIdx(ni);
        setTiles(PUZZLES[ni].map((t) => ({ ...t })));
        setMsg(`第 ${ni + 1} 关`);
      }
    } else {
      playWrong();
      setMsg('还有竖管，继续旋转');
    }
  };

  const hint = () => {
    setTiles(tiles.map(() => ({ rot: 0 })));
    setMsg('已全部转横向，点「通水」');
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="💧 接水管"
        onPause={() => setGameplayPaused(true)}
        hint={msg}
        stats={[
          { label: '关', value: `${pIdx + 1}/${PUZZLES.length}` },
          { label: '⭐', value: '3/3' }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-2 w-full max-w-[360px]">
          <span className="text-3xl shrink-0">🚰</span>
          <div className="flex flex-1 gap-1.5">
            {tiles.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                className={`flex-1 h-16 rounded-xl border-2 border-white shadow-md text-3xl font-bold active:scale-95 ${
                  isHorizontal(t) ? 'bg-[#b8d9f5]' : 'bg-white/90'
                }`}
              >
                {isHorizontal(t) ? '━' : '┃'}
              </button>
            ))}
          </div>
          <span className="text-3xl shrink-0">🌸</span>
        </div>
        <div className="flex gap-3 w-full max-w-[320px]">
          <button type="button" onClick={hint} className="flex-1 py-3 rounded-xl bg-white/90 border border-white font-semibold text-sm active:scale-95">💡 提示</button>
          <button type="button" onClick={test} className="flex-[2] py-3 rounded-xl bg-[#7eb0d4] text-white font-bold border-2 border-white shadow-md active:scale-95">通水</button>
        </div>
      </div>
    </div>
  );
};
