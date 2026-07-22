import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const TARGET_CORRECT = 8;
const MAX_MISTAKES_S1 = 4;
const QUESTION_MS = 5000;

const COMPARE_TARGET = 6;
const MAX_MISTAKES_S2 = 3;
const COMPARE_MS = 6000;

type Problem = { a: number; b: number; op: '+' | '-' };
type CompareQ = { left: string; right: string; lv: number; rv: number };

const COMPARE_ROUNDS: CompareQ[] = [
  { left: '7 + 8', right: '20 − 4', lv: 15, rv: 16 },
  { left: '6 × 3', right: '25 − 8', lv: 18, rv: 17 },
  { left: '48 ÷ 4', right: '5 × 3', lv: 12, rv: 15 },
  { left: '9 + 14', right: '30 − 6', lv: 23, rv: 24 },
  { left: '11 × 2', right: '35 − 12', lv: 22, rv: 23 },
  { left: '100 ÷ 5', right: '6 × 4', lv: 20, rv: 24 }
];

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

  const [stage, setStage] = useState<1 | 2>(1);
  const [stageBanner, setStageBanner] = useState(false);

  const [{ problem, choices }, setRound] = useState(newRound);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [stage1Misses, setStage1Misses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_MS);
  const timeLeftRef = useRef(QUESTION_MS);
  const questionTimerConsumedRef = useRef(false);
  const stageRef = useRef<1 | 2>(1);
  const endedRef = useRef(false);
  const mistakesRef = useRef(0);

  const [cmpIdx, setCmpIdx] = useState(0);
  const [cmpDone, setCmpDone] = useState(0);
  const [pickSide, setPickSide] = useState<'left' | 'right' | null>(null);

  const q = COMPARE_ROUNDS[cmpIdx % COMPARE_ROUNDS.length];

  const starsPreview = useMemo(() => {
    const totalMiss = stage === 1 ? mistakes : stage1Misses + mistakes;
    if (failed) return totalMiss <= 2 ? 1 : 0;
    if (totalMiss === 0) return 3;
    if (totalMiss <= 2) return 2;
    return 1;
  }, [failed, mistakes, stage, stage1Misses]);

  const nextProblem = useCallback(() => {
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = QUESTION_MS;
    setTimeLeftMs(QUESTION_MS);
    setRound(newRound());
    setFeedback(null);
  }, []);

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const totalMiss = stage1Misses + mistakesRef.current;
    const stars = totalMiss === 0 ? 3 : totalMiss <= 2 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, stage1Misses]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  const enterStage2 = useCallback(() => {
    stageRef.current = 2;
    setStage1Misses(mistakesRef.current);
    setStage(2);
    mistakesRef.current = 0;
    setMistakes(0);
    setCmpIdx(0);
    setCmpDone(0);
    setPickSide(null);
    setFeedback(null);
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = COMPARE_MS;
    setTimeLeftMs(COMPARE_MS);
    setStageBanner(true);
    window.setTimeout(() => setStageBanner(false), 1100);
  }, []);

  const armCompareRound = useCallback(() => {
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = COMPARE_MS;
    setTimeLeftMs(COMPARE_MS);
    setPickSide(null);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    endedRef.current = false;
    stageRef.current = 1;
    mistakesRef.current = 0;
    setStage(1);
    setStageBanner(false);
    setCorrectCount(0);
    setMistakes(0);
    setStage1Misses(0);
    setEnded(false);
    setFailed(false);
    setFeedback(null);
    questionTimerConsumedRef.current = false;
    timeLeftRef.current = QUESTION_MS;
    setTimeLeftMs(QUESTION_MS);
    setRound(newRound());
    setCmpIdx(0);
    setCmpDone(0);
    setPickSide(null);
  }, [isActive, runId]);

  const bumpMistake = useCallback(() => {
    setMistakes((m) => {
      const next = m + 1;
      mistakesRef.current = next;
      if (next >= MAX_MISTAKES_S1) fail();
      else {
        playWrong();
        window.setTimeout(() => nextProblem(), 520);
      }
      return next;
    });
  }, [fail, nextProblem]);

  const bumpCompareMistake = useCallback(() => {
    setMistakes((m) => {
      const next = m + 1;
      mistakesRef.current = next;
      if (next >= MAX_MISTAKES_S2) fail();
      else {
        playWrong();
        window.setTimeout(() => {
          setCmpIdx((i) => i + 1);
          armCompareRound();
        }, 520);
      }
      return next;
    });
  }, [armCompareRound, fail]);

  useEffect(() => {
    if (!isActive || stage !== 1 || ended || failed || gameplayPaused || feedback !== null || stageBanner) return;
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
  }, [isActive, stage, ended, failed, gameplayPaused, feedback, problem, bumpMistake, stageBanner]);

  useEffect(() => {
    if (!isActive || stage !== 2 || ended || failed || gameplayPaused || pickSide !== null || stageBanner) return;
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
        bumpCompareMistake();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, stage, ended, failed, gameplayPaused, pickSide, cmpIdx, bumpCompareMistake, stageBanner]);

  const pick = (value: number) => {
    if (!isActive || stage !== 1 || gameplayPaused || ended || feedback !== null || stageBanner) return;
    if (value === answerOf(problem)) {
      playCorrect();
      setCorrectCount((prev) => {
        const next = prev + 1;
        if (next >= TARGET_CORRECT) {
          window.setTimeout(() => enterStage2(), 200);
        } else nextProblem();
        return next;
      });
      return;
    }
    setFeedback('不对哦，再心算一次～');
    bumpMistake();
  };

  const chooseCompare = (side: 'left' | 'right') => {
    if (!isActive || stage !== 2 || gameplayPaused || ended || failed || pickSide || stageBanner) return;
    const bigger = q.lv >= q.rv ? 'left' : 'right';
    setPickSide(side);
    if (side === bigger) {
      playCorrect();
      const nd = cmpDone + 1;
      setCmpDone(nd);
      if (nd >= COMPARE_TARGET) window.setTimeout(() => succeed(), 450);
      else
        window.setTimeout(() => {
          setCmpIdx((i) => i + 1);
          armCompareRound();
        }, 550);
    } else {
      playWrong();
      setMistakes((m) => {
        const nm = m + 1;
        mistakesRef.current = nm;
        if (nm >= MAX_MISTAKES_S2) {
          fail();
          return nm;
        }
        window.setTimeout(() => armCompareRound(), 500);
        return nm;
      });
    }
  };

  if (!isActive) return null;

  const mistOpacity = Math.max(0.12, 0.55 - correctCount * 0.06);
  const maxMiss = stage === 1 ? MAX_MISTAKES_S1 : MAX_MISTAKES_S2;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      {stage === 1 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: mistOpacity,
            background: 'linear-gradient(165deg,rgba(210,220,236,0.55),rgba(165,182,212,0.35))'
          }}
        />
      )}
      <LevelTopBar
        title={stage === 1 ? '📘 作业本冲刺' : '⚡ 比大小'}
        onPause={() => setGameplayPaused(true)}
        hint={
          stageBanner
            ? '第二关开启 · 比大小'
            : stage === 1
              ? (feedback ?? `第一关 · 限时心算 · 每题 ${QUESTION_MS / 1000} 秒`)
              : '第二关 · 限时比大小 · 每题 6 秒'
        }
        stats={[
          { label: '小关', value: `${stage}/2` },
          {
            label: '进度',
            value: stage === 1 ? `${correctCount}/${TARGET_CORRECT}` : `${cmpDone}/${COMPARE_TARGET}`
          },
          { label: '失误', value: `${mistakes}/${maxMiss}` }
        ]}
      />

      {stage === 1 ? (
        <>
          <div className="shrink-0 px-5 pt-2">
            <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-[#3d4f68] shrink-0">⏱ {(Math.ceil(timeLeftMs / 100) / 10).toFixed(1)} 秒</span>
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
                  disabled={ended || feedback !== null || stageBanner}
                  onClick={() => pick(c)}
                  className="py-4 rounded-2xl text-xl font-bold bg-white/90 border-2 border-white text-[#1a3348] shadow-md active:scale-[0.98] disabled:opacity-45"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 px-5 pt-2">
            <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-[#3d4f68] shrink-0">⏱ {(Math.ceil(timeLeftMs / 100) / 10).toFixed(1)} 秒</span>
              <div className="flex-1 h-2 rounded-full bg-[#e4eaf5] overflow-hidden border border-[#d5deee]">
                <div
                  className={`h-full transition-all ${timeLeftMs < 1500 ? 'bg-[#e85d5d]' : 'bg-[#3aab8e]'}`}
                  style={{ width: `${Math.max(0, Math.min(1, timeLeftMs / COMPARE_MS)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-6 pb-8">
            <p className="text-sm text-[#5a7a92]">心算比大小 · 每题限时 6 秒</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-[360px]">
              {(['left', 'right'] as const).map((side) => {
                const label = side === 'left' ? q.left : q.right;
                const sel = pickSide === side;
                const win = pickSide && (q.lv >= q.rv ? 'left' : 'right') === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => chooseCompare(side)}
                    disabled={!!pickSide || stageBanner || ended}
                    className={`py-10 rounded-3xl border-2 border-white shadow-lg text-2xl font-bold active:scale-95 transition-all ${
                      sel && win ? 'bg-[#3aab8e] text-white' : sel ? 'bg-[#e3f2fc] text-[#c75b7a]' : 'bg-white/90 text-[#1a3348]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {stageBanner && (
        <div className="absolute inset-0 z-[85] bg-[#0a1628]/35 flex items-center justify-center px-10 pointer-events-none">
          <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-lg">
            <p className="text-xl font-bold text-[#1a3348]">第二关开启</p>
            <p className="mt-1 text-sm text-[#5a7a92]">两侧算式，限时 6 秒点选更大的一侧</p>
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#1a3348]">{stage === 1 ? '迷雾有点浓' : '比大小失手了'}</h3>
            <p className="text-sm text-[#3d5a72]">预估星级 {starsPreview}/3 · 再试一次会更清晰。</p>
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
