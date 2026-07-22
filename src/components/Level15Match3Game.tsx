import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

const TARGET_ROUNDS = 5;

/** 中间步骤可全程整除的题 */
const INTEGER_POOL: number[][] = [
  [1, 2, 3, 4], // 1×2×3×4 = 24
  [1, 1, 2, 8], // 8×(2+1×1) = 24
  [2, 2, 2, 3], // (2+2)×(2×3) = 24
  [2, 3, 4, 6], // 2+4+3×6 = 24
  [3, 3, 4, 8], // (3+3)×(8-4) = 24
  [4, 4, 4, 3], // 4×(4+3)-4 = 24
  [5, 5, 5, 5], // 5×5-5÷5 = 24
  [6, 6, 6, 2], // 6+6+6×2 = 24
  [8, 8, 2, 2], // (8-2)×(8÷2) = 24
  [2, 4, 6, 8], // 8×6÷(4÷2) = 24
  [3, 4, 5, 6], // 6×(5+(3-4)) = 6×4 = 24
  [2, 2, 7, 8], // 8×(7-(2+2)) = 8×3 = 24
  [5, 5, 2, 4], // 4+2×(5+5) = 24
  [1, 3, 6, 8], // 6×(8-(1+3)) = 6×4 = 24
  [2, 4, 7, 8], // 4×((2×7)-8) = 4×6 = 24
  [1, 1, 5, 8] // 8×(5-(1+1)) = 8×3 = 24
];

/** 需要分数 / 小数中间结果的题（仅作最后一小题） */
const FRACTION_POOL: number[][] = [
  [1, 3, 4, 6], // 6÷(1-3÷4) = 24【分数：3/4，1-3/4=1/4】
  [5, 5, 5, 1], // 5×(5-1÷5) = 24【分数：1/5，5-1/5=24/5】
  [1, 5, 5, 5], // 5×(5-1÷5) = 24【分数：1/5，5-1/5=24/5】
  [1, 4, 5, 6], // 6÷((5÷4)-1) = 24【分数：5/4，5/4-1=1/4】
  [1, 6, 6, 8] // 6÷(1-6÷8) = 24【分数：6/8=3/4，1-3/4=1/4】
];

type Op = '+' | '-' | '×' | '÷';
type Step = 'num1' | 'op' | 'num2';

const EPS = 1e-9;
const nearEq = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const gcd = (a: number, b: number): number => {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
};

const shuffleInPlace = <T,>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** 前 N-1 题从整除题库抽；最后一题从分数题库抽 */
const buildRoundSet = (): number[][] => {
  const ints = INTEGER_POOL.map((p) => [...p]);
  shuffleInPlace(ints);
  const fracs = FRACTION_POOL.map((p) => [...p]);
  shuffleInPlace(fracs);
  const rounds = [...ints.slice(0, TARGET_ROUNDS - 1), fracs[0]];
  return rounds.map((nums) => shuffleInPlace([...nums]));
};
const calc = (a: number, b: number, op: Op): number | null => {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      if (Math.abs(b) < EPS) return null;
      return a / b;
    default:
      return null;
  }
};

/** 整数直接显示；能化简的分数优先；否则短小数 */
const fmt = (n: number) => {
  if (!Number.isFinite(n)) return '?';
  if (nearEq(n, Math.round(n))) return String(Math.round(n));
  for (let d = 2; d <= 24; d += 1) {
    const num = Math.round(n * d);
    if (nearEq(num / d, n)) {
      const g = gcd(num, d);
      const nn = num / g;
      const dd = d / g;
      if (dd === 1) return String(nn);
      return `${nn}/${dd}`;
    }
  }
  const s = n.toFixed(4).replace(/\.?0+$/, '');
  return s;
};

/** 合并后收敛浮点误差，保留足够精度给后续运算 */
const snap = (n: number) => Math.round(n * 1e6) / 1e6;

export const Level15Match3Game: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 15;

  const [roundSet, setRoundSet] = useState<number[][]>(() => buildRoundSet());
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<number[]>(() => [...roundSet[0]]);
  const [step, setStep] = useState<Step>('num1');
  const [firstIdx, setFirstIdx] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [expr, setExpr] = useState<string>('');
  const [mistakes, setMistakes] = useState(0);
  const [ended, setEnded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const starsPreview = useMemo(() => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), [mistakes]);

  const resetRoundState = useCallback((r: number, set?: number[][]) => {
    const source = set ?? roundSet;
    const nums = [...(source[r] ?? SOLVABLE_POOL[0])];
    setCards(nums);
    setStep('num1');
    setFirstIdx(null);
    setPendingOp(null);
    setExpr('');
    setMsg(null);
  }, [roundSet]);

  const freshAllRounds = useCallback(() => {
    const next = buildRoundSet();
    setRoundSet(next);
    setRound(0);
    setCards([...next[0]]);
    setStep('num1');
    setFirstIdx(null);
    setPendingOp(null);
    setExpr('');
    setMsg(null);
    setMistakes(0);
    setEnded(false);
  }, []);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    freshAllRounds();
  }, [isActive, runId, freshAllRounds]);

  const failRound = (r: number) => {
    playWrong();
    setMistakes((m) => m + 1);
    setMsg('结果不是 24，已换一组新数字');
    window.setTimeout(() => resetRoundState(r), 500);
  };

  const tapCard = (i: number) => {
    if (!isActive || gameplayPaused || ended) return;
    if (step === 'num1') {
      playPop();
      setFirstIdx(i);
      setExpr(fmt(cards[i]));
      setStep('op');
      return;
    }
    if (step === 'num2' && firstIdx !== null && i !== firstIdx) {
      const a = cards[firstIdx];
      const b = cards[i];
      const op = pendingOp!;
      const result = calc(a, b, op);
      if (result === null || !Number.isFinite(result)) {
        playWrong();
        setMistakes((m) => m + 1);
        resetRoundState(round);
        return;
      }
      const rounded = snap(result);
      playPop();
      setExpr(`${fmt(a)} ${op} ${fmt(b)} = ${fmt(rounded)}`);
      const nextCards = cards.filter((_, idx) => idx !== firstIdx && idx !== i);
      nextCards.push(rounded);
      setCards(nextCards);
      setFirstIdx(null);
      setPendingOp(null);
      setStep('num1');

      if (nextCards.length === 1) {
        if (nearEq(nextCards[0], 24)) {          playCorrect();
          setMsg('等于 24！');
          if (round + 1 >= TARGET_ROUNDS) window.setTimeout(succeed, 450);
          else {
            window.setTimeout(() => {
              setRound((r) => {
                const nr = r + 1;
                setCards([...roundSet[nr]]);
                setStep('num1');
                setFirstIdx(null);
                setPendingOp(null);
                setExpr('');
                setMsg(null);
                return nr;
              });
            }, 650);
          }
        } else {
          failRound(round);
        }
      }
    }
  };

  const tapOp = (op: Op) => {
    if (!isActive || gameplayPaused || ended || step !== 'op') return;
    playPop();
    setPendingOp(op);
    setExpr((e) => `${e} ${op}`);
    setStep('num2');
  };

  const stepHint =
    step === 'num1' ? '先点一张数字牌' : step === 'op' ? '再点运算符号' : '再点第二张数字牌';

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🃏 竞赛二十四点"
        onPause={() => setGameplayPaused(true)}
        hint={msg ?? `${stepHint} · 合并直到剩一张等于 24`}
        stats={[
          { label: '轮', value: `${Math.min(round + 1, TARGET_ROUNDS)}/${TARGET_ROUNDS}` },
          { label: '失误', value: String(mistakes) }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-5">
        {expr && (
          <p className="text-sm font-semibold text-[#5a7a92] bg-white/70 px-4 py-2 rounded-full border border-white">
            {expr}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((n, i) => {
            const canPick = step === 'num1' || (step === 'num2' && firstIdx !== i);
            return (
              <button
                key={`${round}-${i}-${n}`}
                type="button"
                onClick={() => tapCard(i)}
                disabled={!canPick}
                className={`w-20 h-28 rounded-2xl border-2 border-white shadow-lg text-3xl font-bold active:scale-95 transition-all ${
                  firstIdx === i ? 'bg-[#3aab8e] text-white scale-105' : 'bg-white/90 text-[#1a3348]'
                } ${!canPick ? 'opacity-40' : ''}`}
              >
                {fmt(n)}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-3 w-full max-w-[320px]">
          {(['+', '-', '×', '÷'] as Op[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => tapOp(op)}
              disabled={step !== 'op'}
              className={`py-4 rounded-2xl border-2 text-2xl font-bold active:scale-95 ${
                step === 'op' ? 'bg-[#3aab8e] text-white border-white shadow-md' : 'bg-white/60 border-white/80 text-[#1a3348] opacity-50'
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
