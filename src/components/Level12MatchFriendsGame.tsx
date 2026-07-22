import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playFlip, playMatch, playWin, playWrong } from '../utils/levelAudio';

const EMOJI_POOL = [
  '🐱', '🐶', '🐼', '🦊', '🐰', '🐻', '🐸', '🦁',
  '🐯', '🐨', '🐵', '🐷', '🐮', '🐔', '🐧', '🐦',
  '🦄', '🐙'
] as const;

type StageConfig = { cols: number; pairCount: number; maxFlips: number };

/** 两小关：4×4（8 对）→ 6×6（18 对） */
const STAGES: StageConfig[] = [
  { cols: 4, pairCount: 8, maxFlips: 28 },
  { cols: 6, pairCount: 18, maxFlips: 60 }
];

type Card = { id: number; emoji: string; faceUp: boolean; matched: boolean };

const buildDeck = (pairCount: number): Card[] => {
  const pairs = EMOJI_POOL.slice(0, pairCount);
  const emojis = [...pairs, ...pairs];
  for (let i = emojis.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }
  return emojis.map((emoji, id) => ({ id, emoji, faceUp: false, matched: false }));
};

export const Level12MatchFriendsGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 12;

  const [stageIdx, setStageIdx] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(STAGES[0].pairCount));
  const [picked, setPicked] = useState<number[]>([]);
  const [flips, setFlips] = useState(0);
  const [totalFlips, setTotalFlips] = useState(0);
  const [lock, setLock] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const stage = STAGES[stageIdx];
  const pairTotal = stage.pairCount;
  const matchedCount = cards.filter((c) => c.matched).length / 2;

  const starsPreview = useMemo(() => {
    const f = totalFlips + flips;
    if (failed) return f <= 70 ? 1 : 0;
    if (f <= 55) return 3;
    if (f <= 70) return 2;
    return 1;
  }, [failed, flips, totalFlips]);

  const succeedAll = useCallback(() => {
    setEnded(true);
    playWin();
    const f = totalFlips + flips;
    const stars = f <= 55 ? 3 : f <= 70 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, flips, totalFlips]);

  const resetStage = useCallback((idx: number, prevTotal = 0) => {
    setStageIdx(idx);
    setCards(buildDeck(STAGES[idx].pairCount));
    setPicked([]);
    setFlips(0);
    setTotalFlips(prevTotal);
    setLock(false);
    setFailed(false);
    setAdvancing(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setEnded(false);
    resetStage(0, 0);
  }, [isActive, runId, resetStage]);

  useEffect(() => {
    if (!isActive || ended || failed || advancing) return;
    if (matchedCount < pairTotal) return;
    if (stageIdx + 1 >= STAGES.length) {
      succeedAll();
    } else {
      setAdvancing(true);
      const carried = totalFlips + flips;
      window.setTimeout(() => resetStage(stageIdx + 1, carried), 450);
    }
  }, [matchedCount, pairTotal, stageIdx, ended, failed, advancing, isActive, flips, totalFlips, resetStage, succeedAll]);

  useEffect(() => {
    if (flips >= stage.maxFlips && matchedCount < pairTotal) {
      setFailed(true);
      playWrong();
    }
  }, [flips, matchedCount, pairTotal, stage.maxFlips]);

  const flip = (id: number) => {
    if (!isActive || gameplayPaused || lock || ended || failed || advancing) return;
    const card = cards[id];
    if (card.matched || card.faceUp) return;
    const next = cards.map((c) => (c.id === id ? { ...c, faceUp: true } : c));
    setCards(next);
    playFlip();
    const np = [...picked, id];
    setPicked(np);
    if (np.length < 2) return;
    setLock(true);
    setFlips((f) => f + 1);
    const [a, b] = np;
    if (next[a].emoji === next[b].emoji) {
      playMatch();
      window.setTimeout(() => {
        setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)));
        setPicked([]);
        setLock(false);
      }, 400);
    } else {
      playWrong();
      window.setTimeout(() => {
        setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, faceUp: false } : c)));
        setPicked([]);
        setLock(false);
      }, 700);
    }
  };

  if (!isActive) return null;

  const cellText = stage.cols >= 6 ? 'text-xl' : 'text-3xl';
  const gap = stage.cols >= 6 ? 'gap-1.5' : 'gap-3';

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🤝 同桌记忆"
        onPause={() => setGameplayPaused(true)}
        hint={`${stage.cols}×${stage.cols} · 翻开相同图案配对`}
        stats={[
          { label: '关', value: `${Math.min(stageIdx + 1, STAGES.length)}/${STAGES.length}` },
          { label: '配对', value: `${matchedCount}/${pairTotal}` },
          { label: '步数', value: `${flips}/${stage.maxFlips}` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 pb-6 gap-2">
        <p className="text-xs font-semibold" style={{ color: FRESH.textMuted }}>
          {stageIdx === 0 ? '第 1 关：4×4 八对' : '第 2 关：6×6 十八对'}
        </p>
        <div
          className={`grid ${gap} w-full max-w-[620px]`}
          style={{ gridTemplateColumns: `repeat(${stage.cols}, minmax(0, 1fr))` }}
        >
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => flip(c.id)}
              disabled={c.matched || c.faceUp || lock}
              className={`aspect-square rounded-xl font-bold border-2 transition-all ${cellText} ${
                c.matched
                  ? 'bg-[#d4f0d4] border-[#8bc98b] opacity-60'
                  : c.faceUp
                    ? 'bg-white border-[#B2CEE5]'
                    : 'bg-[#B2CEE5]/40 border-[#B2CEE5] text-transparent'
              }`}
            >
              {c.faceUp || c.matched ? c.emoji : '?'}
            </button>
          ))}
        </div>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold">步数用完了</h3>
            <p className="text-xs" style={{ color: FRESH.textMuted }}>
              预估星级 {starsPreview}/3
            </p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}
      {adminMode && (
        <button
          type="button"
          onClick={() => completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 })}
          className="absolute right-4 top-36 z-50 px-3 py-2 bg-black/35 text-white rounded-full text-xs"
        >
          测试通关
        </button>
      )}
    </div>
  );
};
