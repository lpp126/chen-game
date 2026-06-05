import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const PAIRS = ['🐱', '🐶', '🐼', '🦊', '🐰', '🐻', '🐸', '🦁'] as const;
const MAX_FLIPS = 28;

type Card = { id: number; emoji: string; faceUp: boolean; matched: boolean };

const buildDeck = (): Card[] => {
  const emojis = [...PAIRS, ...PAIRS];
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

  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [flips, setFlips] = useState(0);
  const [lock, setLock] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const starsPreview = useMemo(() => {
    if (failed) return flips <= 24 ? 1 : 0;
    if (flips <= 18) return 3;
    if (flips <= 24) return 2;
    return 1;
  }, [failed, flips]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    const stars = flips <= 18 ? 3 : flips <= 24 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, flips]);

  useEffect(() => {
    if (!isActive) return;
    setCards(buildDeck());
    setPicked([]);
    setFlips(0);
    setLock(false);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId]);

  useEffect(() => {
    if (matchedCount >= PAIRS.length && !ended) succeed();
  }, [matchedCount, ended, succeed]);

  useEffect(() => {
    if (flips >= MAX_FLIPS && matchedCount < PAIRS.length) {
      setFailed(true);
      playWrong();
    }
  }, [flips, matchedCount]);

  const flip = (id: number) => {
    if (!isActive || gameplayPaused || lock || ended || failed) return;
    const card = cards[id];
    if (card.matched || card.faceUp) return;
    const next = cards.map((c) => (c.id === id ? { ...c, faceUp: true } : c));
    setCards(next);
    const np = [...picked, id];
    setPicked(np);
    if (np.length < 2) return;
    setLock(true);
    setFlips((f) => f + 1);
    const [a, b] = np;
    if (next[a].emoji === next[b].emoji) {
      playCorrect();
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

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🤝 同桌连线"
        onPause={() => setGameplayPaused(true)}
        hint="翻开相同图案配对，步数越少星级越高"
        stats={[
          { label: '配对', value: `${matchedCount}/${PAIRS.length}` },
          { label: '步数', value: `${flips}/${MAX_FLIPS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex items-center justify-center px-5 pb-8">
        <div className="grid grid-cols-4 gap-3 w-full max-w-[620px]">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flip(c.id)}
            disabled={c.matched || c.faceUp || lock}
            className={`aspect-square rounded-2xl text-3xl font-bold border-2 transition-all ${
              c.matched ? 'bg-[#d4f0d4] border-[#8bc98b] opacity-60' : c.faceUp ? 'bg-white border-[#B2CEE5]' : 'bg-[#B2CEE5]/40 border-[#B2CEE5] text-transparent'
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
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">再来一局</button>
            <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-[#e3f2fc]">返回关卡</button>
          </div>
        </div>
      )}
    </div>
  );
};
