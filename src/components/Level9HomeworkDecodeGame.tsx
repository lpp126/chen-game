import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const TARGET_CORRECT = 8;
const MAX_MISTAKES = 4;
const QUESTION_MS = 7000;

type Problem = { a: number; b: number; op: '+' | '-' };

const randomProblem = (): Problem => {
  const op = Math.random() < 0.5 ? '+' : '-';
  if (op === '+') {
    const a = 8 + Math.floor(Math.random() * 35);
    const b = 5 + Math.floor(Math.random() * 30);
    return { a, b, op };
  }
  const a = 20 + Math.floor(Math.random() * 40);
  const b = 3 + Math.floor(Math.random() * Math.min(a - 5, 25));
  return { a, b, op };
};

const answerOf = (p: Problem) => (p.op === '+' ? p.a + p.b : p.a - p.b);

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildChoices = (correct: number): number[] => {
  const pool = new Set<number>([correct]);
  while (pool.size < 3) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? -1 : 1);
    pool.add(Math.max(0, correct + delta));
  }
  return shuffle([...pool]);
};

const newRound = () => {
  const p = randomProblem();
  return { problem: p, choices: buildChoices(answerOf(p)) };
};

export const Level9HomeworkDecodeGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 9;

  const [{ problem, choices }, setRound] = useState(newRound);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_MS);
  const timeLeftRef = useRef(QUESTION_MS);
  const questionTimerConsumedRef = useRef(false);

  const starsPreview = useMemo(() => {
    if (failed) return mistakes <= 2 ? 1 : 0;
    if (mistakes === 0) return 3;
    if (mistakes <= 2) return 2;
    return 1;
  }, [failed, mistakes]);

  const nextProblem = useCallback(() => {
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = QUESTION_MS;
    setTimeLeftMs(QUESTION_MS);
    setRound(newRound());
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setCorrectCount(0);
    setMistakes(0);
    setEnded(false);
    setFailed(false);
    setFeedback(null);
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = QUESTION_MS;
    setTimeLeftMs(QUESTION_MS);
    setRound(newRound());
  }, [isActive, runId]);

  const succeed = useCallback(() => {
    if (ended) return;
    setEnded(true);
    playWin();
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, ended, mistakes]);

  const fail = useCallback(() => {
    if (ended) return;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, [ended]);

  const bumpMistake = useCallback(() => {
    setMistakes((m) => {
      const next = m + 1;
      if (next >= MAX_MISTAKES) fail();
      else {
        playWrong();
        window.setTimeout(() => nextProblem(), 520);
      }
      return next;
    });
  }, [fail, nextProblem]);

  useEffect(() => {
    if (!isActive || ended || failed || gameplayPaused || feedback !== null) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      timeLeftRef.current -= dt * 1000;
      const left = Math.max(0, timeLeftRef.current);
      setTimeLeftMs(left);
      if (left <= 0) {
        if (questionTimerConsumedRef.current) return;
        questionTimerConsumedRef.current = true;
        setFeedback('时间到啦，下一题加油！');
        bumpMistake();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, ended, failed, gameplayPaused, feedback, problem, bumpMistake]);

  const pick = (value: number) => {
    if (!isActive || gameplayPaused || ended || feedback !== null) return;
    if (value === answerOf(problem)) {
      playCorrect();
      setCorrectCount((prev) => {
        const next = prev + 1;
        if (next >= TARGET_CORRECT) window.setTimeout(() => succeed(), 0);
        else nextProblem();
        return next;
      });
      return;
    }
    setFeedback('不对哦，再心算一次～');
    bumpMistake();
  };

  if (!isActive) return null;

  const mistOpacity = Math.max(0.12, 0.55 - correctCount * 0.06);

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: mistOpacity,
          background: 'linear-gradient(165deg,rgba(210,220,236,0.55),rgba(165,182,212,0.35))'
        }}
      />
      <LevelTopBar
        title="📘 作业迷雾破译"
        onPause={() => setGameplayPaused(true)}
        hint={feedback ?? `限时心算 · 每题 ${QUESTION_MS / 1000} 秒`}
        stats={[
          { label: '进度', value: `${correctCount}/${TARGET_CORRECT}` },
          { label: '失误', value: `${mistakes}/${MAX_MISTAKES}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="shrink-0 px-5 pt-2">
        <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-[#3d4f68] shrink-0">⏱ {(Math.ceil(timeLeftMs / 100) / 10).toFixed(1)}s</span>
          <div className="flex-1 h-2 rounded-full bg-[#e4eaf5] overflow-hidden border border-[#d5deee]">
            <div
              className={`h-full transition-all ${timeLeftMs < 1500 ? 'bg-[#e85d5d]' : 'bg-[#3aab8e]'}`}
              style={{ width: `${Math.max(0, Math.min(1, timeLeftMs / QUESTION_MS)) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 pb-8">
        <div className="w-full max-w-[360px] rounded-3xl bg-white/92 border border-white shadow-lg px-6 py-10 text-center">
          <p className="text-sm text-[#5a7a92] mb-4">拨开迷雾，选出正确答案</p>
          <div className="text-[40px] font-extrabold tracking-wide text-[#1a3348] mb-2">
            {problem.a} {problem.op} {problem.b} = ?
          </div>
          {feedback && <p className="text-sm text-[#c45c5c] mt-2">{feedback}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-[360px] mt-6">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={ended || feedback !== null}
              onClick={() => pick(c)}
              className="py-4 rounded-2xl text-xl font-bold bg-white/90 border-2 border-white text-[#1a3348] shadow-md active:scale-[0.98] disabled:opacity-45"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#1a3348]">迷雾有点浓</h3>
            <p className="text-sm text-[#3d5a72]">深呼吸，再试一次会更清晰。</p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">再来一局</button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">返回关卡</button>
          </div>
        </div>
      )}
    </div>
  );
};
