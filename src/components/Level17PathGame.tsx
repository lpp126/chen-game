import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playFlip, playLock, playWin, playWrong } from '../utils/levelAudio';
import { emojiSafeStyle } from '../utils/emojiSafe';

type Mode = 'investigate' | 'accuse';

type StageConfig = { cols: number; rows: number; villains: number; minPointers: number };

const STAGES: StageConfig[] = [
  { cols: 3, rows: 3, villains: 1, minPointers: 1 },
  { cols: 4, rows: 3, villains: 2, minPointers: 2 },
  { cols: 4, rows: 4, villains: 3, minPointers: 3 }
];

const MAX_MISS = 3;
/** 每人 2 条发言的概率（更少） */
const TWO_CLUE_CHANCE = 0.12;

const FACES = ['🧑', '👩', '👨', '🧔', '👱', '👧', '👦', '🧓', '👴', '👵', '🧑‍🦰', '👩‍🦱', '👨‍🦳', '🧑‍🦲', '👩‍🎤', '👨‍💼'];

type ClueDim = 'row' | 'col' | 'adj';
type ClueItem = { dim: ClueDim; text: string };

type Card = {
  id: number;
  row: number;
  col: number;
  emoji: string;
  isVillain: boolean;
  faceUp: boolean;
  caught: boolean;
  clues: string[];
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const neighbors = (id: number, cols: number, rows: number): number[] => {
  const r = Math.floor(id / cols);
  const c = id % cols;
  const out: number[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
  }
  return out;
};

/** 两条发言只允许：行+列 / 行+相邻 / 列+相邻 */
const dimsCompatible = (a: ClueDim, b: ClueDim) =>
  (a === 'row' && (b === 'col' || b === 'adj')) ||
  (a === 'col' && (b === 'row' || b === 'adj')) ||
  (a === 'adj' && (b === 'row' || b === 'col'));

const canAddClue = (list: ClueItem[], next: ClueItem) => {
  if (list.some((c) => c.text === next.text)) return false;
  if (list.length === 0) return true;
  if (list.length >= 2) return false;
  return dimsCompatible(list[0].dim, next.dim);
};

/** 好人 G 可对坏人 V 给出的「位置相关」线索（均为真话） */
const pointingCluesFor = (
  g: number,
  v: number,
  cols: number,
  rows: number,
  villainSet: Set<number>
): ClueItem[] => {
  const gr = Math.floor(g / cols);
  const gc = g % cols;
  const vr = Math.floor(v / cols);
  const vc = v % cols;
  const rowCount = [...villainSet].filter((x) => Math.floor(x / cols) === gr).length;
  const colCount = [...villainSet].filter((x) => x % cols === gc).length;
  const opts: ClueItem[] = [];
  if (gr === vr) {
    opts.push({ dim: 'row', text: '我和某个坏人在同一行' });
    opts.push({ dim: 'row', text: `第 ${gr + 1} 行有 ${rowCount} 个坏人` });
  }
  if (gc === vc) {
    opts.push({ dim: 'col', text: '我和某个坏人在同一列' });
    opts.push({ dim: 'col', text: `第 ${gc + 1} 列有 ${colCount} 个坏人` });
  }
  if (neighbors(g, cols, rows).includes(v)) {
    const adjBad = neighbors(g, cols, rows).filter((n) => villainSet.has(n)).length;
    opts.push({ dim: 'adj', text: `我的相邻格子里有 ${adjBad} 个坏人` });
  }
  return opts;
};

/** 好人可说的任意真话线索池（带维度） */
const allTruthfulClues = (id: number, cols: number, rows: number, villainSet: Set<number>): ClueItem[] => {
  const r = Math.floor(id / cols);
  const c = id % cols;
  const rowCount = [...villainSet].filter((v) => Math.floor(v / cols) === r).length;
  const colCount = [...villainSet].filter((v) => v % cols === c).length;
  const adjBad = neighbors(id, cols, rows).filter((n) => villainSet.has(n)).length;
  const pool: ClueItem[] = [
    { dim: 'row', text: `第 ${r + 1} 行有 ${rowCount} 个坏人` },
    { dim: 'col', text: `第 ${c + 1} 列有 ${colCount} 个坏人` },
    { dim: 'adj', text: `我的相邻格子里有 ${adjBad} 个坏人` }
  ];
  if ([...villainSet].some((v) => Math.floor(v / cols) === r)) {
    pool.push({ dim: 'row', text: '我和某个坏人在同一行' });
  }
  if ([...villainSet].some((v) => v % cols === c)) {
    pool.push({ dim: 'col', text: '我和某个坏人在同一列' });
  }
  if (rowCount === 0) pool.push({ dim: 'row', text: '这一行没有坏人' });
  if (colCount === 0) pool.push({ dim: 'col', text: '这一列没有坏人' });
  // 去重 text
  const seen = new Set<string>();
  return pool.filter((c) => {
    if (seen.has(c.text)) return false;
    seen.add(c.text);
    return true;
  });
};

const formatClues = (emoji: string, clues: string[]) => `${emoji}：${clues.join('；')}`;

const tryBuildBoard = (stage: StageConfig): Card[] | null => {
  const total = stage.cols * stage.rows;
  const indices = shuffle(Array.from({ length: total }, (_, i) => i));
  const villainSet = new Set(indices.slice(0, stage.villains));
  const goods = indices.slice(stage.villains);
  const faces = shuffle([...FACES]);
  const clueMap = new Map<number, ClueItem[]>();
  const ensure = (id: number) => {
    if (!clueMap.has(id)) clueMap.set(id, []);
    return clueMap.get(id)!;
  };

  // 保证每个坏人至少有 minPointers 个好人给出位置相关线索
  for (const v of villainSet) {
    const eligible = shuffle(
      goods.filter((g) => pointingCluesFor(g, v, stage.cols, stage.rows, villainSet).length > 0)
    );
    let assigned = 0;
    for (const g of eligible) {
      if (assigned >= stage.minPointers) break;
      const list = ensure(g);
      const opts = shuffle(
        pointingCluesFor(g, v, stage.cols, stage.rows, villainSet).filter((c) => canAddClue(list, c))
      );
      if (opts.length === 0) continue;
      list.push(opts[0]);
      assigned += 1;
    }
    if (assigned < stage.minPointers) return null;
  }

  // 每人至少 1 条；少数补第 2 条，且必须不同维度组合
  for (const g of goods) {
    const list = ensure(g);
    const pool = allTruthfulClues(g, stage.cols, stage.rows, villainSet);
    if (list.length === 0) {
      const first = shuffle(pool);
      if (first.length === 0) return null;
      list.push(first[0]);
    }
    if (list.length === 1 && Math.random() < TWO_CLUE_CHANCE) {
      const secondOpts = shuffle(pool.filter((c) => canAddClue(list, c)));
      if (secondOpts.length > 0) list.push(secondOpts[0]);
    }
  }

  return Array.from({ length: total }, (_, id) => {
    const isVillain = villainSet.has(id);
    return {
      id,
      row: Math.floor(id / stage.cols),
      col: id % stage.cols,
      emoji: faces[id % faces.length],
      isVillain,
      faceUp: false,
      caught: false,
      clues: isVillain ? ['……无可奉告'] : (clueMap.get(id) ?? []).map((c) => c.text)
    };
  });
};

const buildBoard = (stage: StageConfig): Card[] => {
  for (let i = 0; i < 80; i += 1) {
    const board = tryBuildBoard(stage);
    if (board) return board;
  }
  // 极端情况：降低指认要求再生成
  const fallback = { ...stage, minPointers: Math.max(1, stage.minPointers - 1) };
  for (let i = 0; i < 40; i += 1) {
    const board = tryBuildBoard(fallback);
    if (board) return board;
  }
  return tryBuildBoard({ ...stage, minPointers: 0 })!;
};

/** 开局先翻开一张随机好人牌 */
const openStarterGood = (board: Card[]): { cards: Card[]; starter: Card | null } => {
  const goods = board.filter((c) => !c.isVillain);
  if (goods.length === 0) return { cards: board, starter: null };
  const starter = goods[Math.floor(Math.random() * goods.length)];
  const cards = board.map((c) => (c.id === starter.id ? { ...c, faceUp: true } : c));
  return { cards, starter: { ...starter, faceUp: true } };
};

const startStageBoard = (stage: StageConfig) => {
  const { cards, starter } = openStarterGood(buildBoard(stage));
  return {
    cards,
    lastClue: starter
      ? `开局提示 · ${formatClues(starter.emoji, starter.clues)}`
      : '翻开好人听线索，再切换「指认」抓坏人'
  };
};

export const Level17PathGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    completeLevel,
    adminMode,
    testCompleteLevel,
    runId
  } = useGameStore();
  const isActive = status === 'playing' && currentLevelId === 17;

  const [stageIdx, setStageIdx] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [mode, setMode] = useState<Mode>('investigate');
  const [lastClue, setLastClue] = useState('');
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const stage = STAGES[stageIdx];
  const caughtCount = cards.filter((c) => c.caught).length;
  const villainTotal = stage.villains;

  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses === 1) return 2;
    return 1;
  }, [failed, misses]);

  const succeedAll = useCallback(() => {
    setEnded(true);
    playWin();
    const stars = misses === 0 ? 3 : misses === 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, misses]);

  const resetStage = useCallback((idx: number) => {
    const started = startStageBoard(STAGES[idx]);
    setStageIdx(idx);
    setCards(started.cards);
    setMode('investigate');
    setLastClue(started.lastClue);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setMisses(0);
    setEnded(false);
    setFailed(false);
    resetStage(0);
  }, [isActive, runId, resetStage]);

  const onCardTap = (id: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const card = cards[id];
    if (card.caught) return;

    if (mode === 'investigate') {
      if (card.faceUp) {
        if (!card.isVillain) {
          playFlip();
          setLastClue(formatClues(card.emoji, card.clues));
        }
        return;
      }

      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, faceUp: true } : c)));
      if (card.isVillain) {
        playWrong();
        setLastClue(`${card.emoji}：糟糕，调查时翻到了坏人！`);
        setFailed(true);
        setEnded(true);
      } else {
        playFlip();
        playCorrect();
        setLastClue(formatClues(card.emoji, card.clues));
      }
      return;
    }

    if (card.isVillain) {
      playLock();
      playCorrect();
      const next = cards.map((c) => (c.id === id ? { ...c, faceUp: true, caught: true } : c));
      setCards(next);
      const left = next.filter((c) => c.isVillain && !c.caught).length;
      setLastClue(`抓到坏人 ${card.emoji}！还剩 ${left} 人`);
      if (left <= 0) {
        if (stageIdx + 1 >= STAGES.length) {
          window.setTimeout(() => succeedAll(), 450);
        } else {
          window.setTimeout(() => resetStage(stageIdx + 1), 600);
        }
      }
    } else {
      playWrong();
      const nm = misses + 1;
      setMisses(nm);
      setLastClue(`${card.emoji} 是好人！指认失误`);
      if (!card.faceUp) {
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, faceUp: true } : c)));
      }
      if (nm >= MAX_MISS) {
        setFailed(true);
        setEnded(true);
      }
    }
  };

  if (!isActive) return null;

  const hint =
    mode === 'investigate'
      ? '调查：只翻好人听线索；翻到坏人直接失败 · 点已翻开牌可回顾发言'
      : '指认：点选你认为的坏人';

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🕵️ 人群识谎"
        onPause={() => setGameplayPaused(true)}
        hint={hint}
        stats={[
          { label: '关', value: `${Math.min(stageIdx + 1, STAGES.length)}/${STAGES.length}` },
          { label: '抓获', value: `${caughtCount}/${villainTotal}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col px-4 pb-5 gap-3">
        <div className="flex gap-2 justify-center pt-1">
          {(
            [
              ['investigate', '🔍', '调查'],
              ['accuse', '🚨', '指认']
            ] as const
          ).map(([m, icon, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                mode === m ? 'text-white scale-[1.02]' : 'bg-white/70 text-[#1a3348]'
              }`}
              style={{
                background: mode === m ? FRESH.accent : undefined,
                borderColor: mode === m ? FRESH.accent : FRESH.mist
              }}
            >
              <span style={emojiSafeStyle}>{icon}</span> {label}
            </button>
          ))}
        </div>

        <p className="text-center text-xs font-semibold" style={{ color: FRESH.textMuted }}>
          本关 {stage.rows}×{stage.cols} · 坏人 {villainTotal} 名 · 每名坏人至少 {stage.minPointers} 人给出位置线索
        </p>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div
            className="grid gap-2.5 w-full max-w-[620px]"
            style={{ gridTemplateColumns: `repeat(${stage.cols}, minmax(0, 1fr))` }}
          >
            {cards.map((c) => {
              const showFace = c.faceUp || c.caught;
              // 勿用 native disabled：iOS/Safari 会把按钮内 emoji 洗成空白
              const inert = ended || failed || c.caught;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCardTap(c.id)}
                  aria-disabled={inert}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 px-1 transition-all active:scale-95 ${
                    inert ? 'pointer-events-none opacity-90' : ''
                  } ${
                    c.caught
                      ? 'bg-[#fde8e8] border-[#e07070]'
                      : showFace
                        ? 'bg-white border-[#B2CEE5]'
                        : mode === 'accuse'
                          ? 'bg-[#ffe8e0]/80 border-[#e8a090]'
                          : 'bg-[#B2CEE5]/45 border-[#B2CEE5]'
                  }`}
                >
                  {showFace ? (
                    <>
                      <span className="text-2xl" style={emojiSafeStyle}>
                        {c.emoji}
                      </span>
                      {c.caught || (c.isVillain && c.faceUp) ? (
                        <span className="text-[10px] font-bold text-[#c75b7a]">坏人</span>
                      ) : (
                        <div className="flex flex-col gap-0.5 px-0.5 mt-0.5 w-full">
                          {c.clues.map((line, i) => (
                            <span
                              key={i}
                              className="text-[8px] leading-tight text-center font-medium text-[#3d5a72]"
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xl opacity-70" style={emojiSafeStyle}>
                      ❔
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 border border-white/90 px-4 py-3 min-h-[64px] shadow-sm">
          <p className="text-[11px] font-semibold mb-1" style={{ color: FRESH.textMuted }}>
            发言 / 线索
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: FRESH.text }}>
            {lastClue}
          </p>
        </div>
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/40 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold" style={{ color: FRESH.text }}>
              {misses >= MAX_MISS ? '指认失误过多' : '调查翻到了坏人'}
            </h3>
            <p className="text-sm" style={{ color: FRESH.textMuted }}>
              {misses >= MAX_MISS ? '好人被冤枉了…再仔细听听线索吧' : '调查时只能翻好人；坏人要用「指认」抓住'}
            </p>
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
        <div className="absolute right-4 top-36 z-50">
          <button type="button" onClick={testCompleteLevel} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            测试通关
          </button>
        </div>
      )}
    </div>
  );
};
