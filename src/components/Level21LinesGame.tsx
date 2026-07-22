import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playSoftClick, playWin, playWrong } from '../utils/levelAudio';

type ColorOpt = { id: string; name: string; ink: string };
type AskMode = 'board' | 'ink' | 'meaning';

const COLORS: ColorOpt[] = [
  { id: 'red', name: '红', ink: '#c75b7a' },
  { id: 'blue', name: '蓝', ink: '#4a9fd8' },
  { id: 'green', name: '绿', ink: '#3aab8e' },
  { id: 'yellow', name: '黄', ink: '#d4a017' },
  { id: 'purple', name: '紫', ink: '#8b6bb8' }
];

const ASK_HINT: Record<AskMode, string> = {
  board: '请选：底板的颜色',
  ink: '请选：字的颜色（墨色）',
  meaning: '请选：字的含义（字义）'
};

const ASK_SHORT: Record<AskMode, string> = {
  board: '底板颜色',
  ink: '字的颜色',
  meaning: '字义'
};

const TARGET_ROUNDS = 12;
const MAX_MISS = 3;
const ROUND_MS = 3000;

const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const pickDifferent = (avoid: string[]) => {
  const pool = COLORS.filter((c) => !avoid.includes(c.id));
  if (pool.length === 0) return randColor();
  return pool[Math.floor(Math.random() * pool.length)];
};

const pickRound = () => {
  const word = randColor();
  const ink = pickDifferent([word.id]);
  // 底板与字色必须不同，保证可读
  const board = pickDifferent([ink.id]);
  const modes: AskMode[] = ['board', 'ink', 'meaning'];
  const ask = modes[Math.floor(Math.random() * modes.length)];
  const answerId = ask === 'board' ? board.id : ask === 'ink' ? ink.id : word.id;
  return {
    wordName: word.name,
    inkId: ink.id,
    inkColor: ink.ink,
    boardId: board.id,
    boardColor: board.ink,
    ask,
    answerId
  };
};

export const Level21LinesGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 16;

  const [round, setRound] = useState(0);
  const [prompt, setPrompt] = useState(() => pickRound());
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deadline, setDeadline] = useState(() => Date.now() + ROUND_MS);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const roundRef = useRef(0);
  const missesRef = useRef(0);
  const endedRef = useRef(false);
  const answeringRef = useRef(false);

  const timeLeft = Math.max(0, deadline - now);

  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses === 1) return 2;
    return 1;
  }, [failed, misses]);

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const stars = missesRef.current === 0 ? 3 : missesRef.current === 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  const armRound = useCallback((_r: number) => {
    setPrompt(pickRound());
    setDeadline(Date.now() + ROUND_MS);
    setNow(Date.now());
    setFlash(null);
    answeringRef.current = false;
  }, []);

  const registerMiss = useCallback(() => {
    if (endedRef.current || answeringRef.current) return;
    answeringRef.current = true;
    playWrong();
    setFlash('bad');
    const nm = missesRef.current + 1;
    missesRef.current = nm;
    setMisses(nm);
    if (nm >= MAX_MISS) {
      fail();
      return;
    }
    window.setTimeout(() => armRound(roundRef.current), 220);
  }, [armRound, fail]);

  useEffect(() => {
    if (!isActive) return;
    roundRef.current = 0;
    missesRef.current = 0;
    endedRef.current = false;
    setRound(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
    armRound(0);
  }, [isActive, runId, armRound]);

  useEffect(() => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const tick = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) registerMiss();
    }, 50);
    return () => window.clearInterval(tick);
  }, [isActive, gameplayPaused, ended, failed, deadline, registerMiss]);

  const pick = (colorId: string) => {
    if (!isActive || gameplayPaused || ended || failed || answeringRef.current) return;
    answeringRef.current = true;
    if (colorId === prompt.answerId) {
      playCorrect();
      setFlash('ok');
      const nr = roundRef.current + 1;
      roundRef.current = nr;
      setRound(nr);
      if (nr >= TARGET_ROUNDS) succeed();
      else window.setTimeout(() => armRound(nr), 160);
    } else {
      playWrong();
      setFlash('bad');
      const nm = missesRef.current + 1;
      missesRef.current = nm;
      setMisses(nm);
      if (nm >= MAX_MISS) fail();
      else window.setTimeout(() => armRound(roundRef.current), 220);
    }
  };

  if (!isActive) return null;

  const pct = Math.max(0, Math.min(100, (timeLeft / ROUND_MS) * 100));

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🎨 分心捕手"
        onPause={() => setGameplayPaused(true)}
        hint={`本轮问：${ASK_SHORT[prompt.ask]} · 每题 3 秒`}
        stats={[
          { label: '轮次', value: `${Math.min(round + 1, TARGET_ROUNDS)}/${TARGET_ROUNDS}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-5">
        <div className="w-full max-w-[320px] h-2 rounded-full bg-white/50 overflow-hidden border border-white/70">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${pct}%`,
              background: pct < 30 ? FRESH.danger : FRESH.sage
            }}
          />
        </div>

        <div
          className={`w-full max-w-[320px] rounded-3xl border-2 border-white/80 shadow-lg py-10 flex items-center justify-center ${
            flash === 'ok' ? 'ring-4 ring-[#3aab8e]/40' : flash === 'bad' ? 'ring-4 ring-[#c75b7a]/40' : ''
          }`}
          style={{ background: prompt.boardColor }}
        >
          <span
            className="text-6xl font-black tracking-wide select-none"
            style={{
              color: prompt.inkColor,
              textShadow: '0 1px 0 rgba(255,255,255,0.35), 0 -1px 0 rgba(0,0,0,0.12)'
            }}
          >
            {prompt.wordName}
          </span>
        </div>

        <p className="text-sm font-bold" style={{ color: FRESH.text }}>
          {ASK_HINT[prompt.ask]}
        </p>
        <p className="text-xs -mt-2" style={{ color: FRESH.textMuted }}>
          底板 · 字色 · 字义 可能都不一样，看清题目再点
        </p>

        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                playSoftClick();
                pick(c.id);
              }}
              className="py-3.5 rounded-2xl border-2 border-white shadow-md font-bold text-white active:scale-95"
              style={{ background: c.ink }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold">注意力被干扰带走了</h3>
            <p className="text-xs text-[#5a7a92]">预估星级 {starsPreview}/3</p>
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
