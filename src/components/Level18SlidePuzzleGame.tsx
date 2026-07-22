import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playUnlock, playWin, playWrong } from '../utils/levelAudio';

const DIGIT_LEN = 4;
const MAX_GUESSES = 10;

type HistoryItem = { guess: number[]; a: number; b: number };

const shuffleDigits = () => {
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DIGIT_LEN);
};

/** A = 数字对且位置对；B = 数字对但位置错 */
const scoreAB = (secret: number[], guess: number[]) => {
  let a = 0;
  let b = 0;
  const secretUsed = Array(DIGIT_LEN).fill(false);
  const guessUsed = Array(DIGIT_LEN).fill(false);
  for (let i = 0; i < DIGIT_LEN; i += 1) {
    if (guess[i] === secret[i]) {
      a += 1;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }
  for (let i = 0; i < DIGIT_LEN; i += 1) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < DIGIT_LEN; j += 1) {
      if (secretUsed[j]) continue;
      if (guess[i] === secret[j]) {
        b += 1;
        secretUsed[j] = true;
        break;
      }
    }
  }
  return { a, b };
};

export const Level18SlidePuzzleGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 18;

  const [secret, setSecret] = useState<number[]>(() => shuffleDigits());
  const [digits, setDigits] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hardMode, setHardMode] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const remaining = MAX_GUESSES - history.length;
  const starsPreview = useMemo(() => {
    if (failed) return 0;
    if (history.length <= 4) return 3;
    if (history.length <= 7) return 2;
    return 1;
  }, [failed, history.length]);

  const succeed = useCallback(
    (guessCount: number) => {
      setEnded(true);
      playWin();
      const stars = guessCount <= 4 ? 3 : guessCount <= 7 ? 2 : 1;
      window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
    },
    [completeLevel]
  );

  useEffect(() => {
    if (!isActive) return;
    setSecret(shuffleDigits());
    setDigits([0, 0, 0, 0]);
    setHistory([]);
    setHardMode(false);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId]);

  const spin = (wi: number, delta: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    playPop();
    setDigits((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[wi] = (next[wi] + delta + 10) % 10;
      return next;
    });
  };

  const submit = () => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const unique = new Set(digits);
    if (unique.size < DIGIT_LEN) {
      playWrong();
      return;
    }
    const { a, b } = scoreAB(secret, digits);
    const item: HistoryItem = { guess: [...digits], a, b };
    const nextHistory = [item, ...history];
    setHistory(nextHistory);
    if (a === DIGIT_LEN) {
      playUnlock();
      succeed(nextHistory.length);
      return;
    }
    playWrong();
    if (nextHistory.length >= MAX_GUESSES) {
      setFailed(true);
      setEnded(true);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔐 门锁四码"
        onPause={() => setGameplayPaused(true)}
        hint="猜 4 位不重复数字 · A对位对 · B对位错"
        stats={[
          { label: '剩余', value: `${remaining}` },
          { label: '尝试', value: `${history.length}/${MAX_GUESSES}` }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col items-center gap-4 px-4 pt-2 pb-4 overflow-hidden">
        <div className="flex items-center gap-3 w-full max-w-[360px] justify-between">
          <p className="text-sm text-[#5a7a92]">剩余 {remaining} 次机会</p>
          <button
            type="button"
            onClick={() => setHardMode((h) => !h)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              hardMode ? 'bg-[#c75b7a]/15 border-[#c75b7a]/40 text-[#c75b7a]' : 'bg-white/80 border-white text-[#1a3348]'
            }`}
          >
            {hardMode ? '困难：隐藏提示' : '普通：显示 AB'}
          </button>
        </div>

        <div className="flex gap-3">
          {digits.map((d, wi) => (
            <div key={wi} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => spin(wi, 1)}
                className="w-11 h-9 rounded-xl bg-white/90 border border-white font-bold active:scale-95"
              >
                ▲
              </button>
              <div className="w-14 h-16 rounded-2xl bg-[#e3f2fc] border-2 border-white flex items-center justify-center text-3xl font-bold text-[#1a3348]">
                {d}
              </div>
              <button
                type="button"
                onClick={() => spin(wi, -1)}
                className="w-11 h-9 rounded-xl bg-white/90 border border-white font-bold active:scale-95"
              >
                ▼
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={ended || failed}
          className="w-full max-w-[280px] py-3.5 rounded-2xl bg-[#3aab8e] text-white font-bold border-2 border-white shadow-md active:scale-95 disabled:opacity-50"
        >
          确认猜测
        </button>
        <p className="text-xs text-[#5a7a92]">四位数字不可重复 · 例：密文 2514，猜 2541 → 2A2B</p>

        <div className="flex-1 min-h-0 w-full max-w-[360px] overflow-y-auto rounded-2xl border border-white/70 bg-white/55 px-3 py-2">
          {history.length === 0 ? (
            <p className="text-center text-sm text-[#5a7a92] py-6">猜测记录会显示在这里</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li
                  key={`${h.guess.join('')}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-white/90 border border-white px-3 py-2"
                >
                  <span className="font-mono text-lg tracking-widest text-[#1a3348]">{h.guess.join('')}</span>
                  {hardMode ? (
                    <span className="text-xs text-[#5a7a92]">已记录</span>
                  ) : (
                    <span className="font-bold text-[#3aab8e]">
                      {h.a}A{h.b}B
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#1a3348]">机会用尽</h3>
            <p className="text-sm text-[#5a7a92]">正确答案是 {secret.join('')}</p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}

      {adminMode && (
        <div className="absolute left-3 bottom-4 z-50 text-[10px] text-black/40">密文 {secret.join('')}</div>
      )}
    </div>
  );
};
