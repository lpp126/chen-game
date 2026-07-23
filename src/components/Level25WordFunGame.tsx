import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playSoftClick, playWin, playWrong } from '../utils/levelAudio';
import { useLevelAssetsGate } from '../hooks/useLevelAssetsGate';
import { COLOR_EMOJI_FONT, emojiSafeStyle } from '../utils/emojiSafe';

const MAX_LIVES = 3;
const ROUND_COUNT = 6;
const IMG = '/images/level25';

type PicPuzzle = {
  kind: 'pic';
  id: number;
  topSrc: string;
  bottomSrc: string;
  topLabel: string;
  answer: string;
  aliases?: string[];
};

type EmojiPuzzle = {
  kind: 'emoji';
  id: number;
  clues: string[];
  answer: string;
  aliases?: string[];
};

type Puzzle = PicPuzzle | EmojiPuzzle;

const img = (name: string) => `${IMG}/${encodeURIComponent(name)}`;

/** 阶段一：谐音梗对比图 */
const PIC_POOL: PicPuzzle[] = [
  { kind: 'pic', id: 1, topSrc: img('1题-彩虹.webp'), bottomSrc: img('1答案-彩虹屁.webp'), topLabel: '彩虹', answer: '彩虹屁' },
  { kind: 'pic', id: 2, topSrc: img('题2-马.webp'), bottomSrc: img('答2-二维码.webp'), topLabel: '马', answer: '二维码' },
  { kind: 'pic', id: 3, topSrc: img('3题-蛋.webp'), bottomSrc: img('3答-扯淡.webp'), topLabel: '蛋', answer: '扯淡' },
  { kind: 'pic', id: 4, topSrc: img('4题-公鸡.webp'), bottomSrc: img('4答-肱二头肌.webp'), topLabel: '公鸡', answer: '肱二头肌' },
  { kind: 'pic', id: 5, topSrc: img('5题-鹅.webp'), bottomSrc: img('5答-俄罗斯.webp'), topLabel: '鹅', answer: '俄罗斯' },
  { kind: 'pic', id: 6, topSrc: img('6题-房.webp'), bottomSrc: img('6答-破防.webp'), topLabel: '房', answer: '破防' },
  { kind: 'pic', id: 7, topSrc: img('7题-柴犬.webp'), bottomSrc: img('7答-财源滚滚.webp'), topLabel: '柴犬', answer: '财源滚滚' },
  { kind: 'pic', id: 8, topSrc: img('8题-鸡.webp'), bottomSrc: img('8答-叫花鸡.webp'), topLabel: '鸡', answer: '叫花鸡' },
  { kind: 'pic', id: 9, topSrc: img('9题-骨头.webp'), bottomSrc: img('9答-反骨.webp'), topLabel: '骨头', answer: '反骨' },
  { kind: 'pic', id: 10, topSrc: img('10题-好酒.webp'), bottomSrc: img('10答-好久不见.webp'), topLabel: '好酒', answer: '好久不见' },
  { kind: 'pic', id: 11, topSrc: img('11题-鸡蛋.webp'), bottomSrc: img('11答-鸡蛋灌饼.webp'), topLabel: '鸡蛋', answer: '鸡蛋灌饼' },
  { kind: 'pic', id: 13, topSrc: img('13题-鸡.webp'), bottomSrc: img('13答-洗衣机.webp'), topLabel: '鸡', answer: '洗衣机' },
  { kind: 'pic', id: 14, topSrc: img('14题-拉客.webp'), bottomSrc: img('14答-拉二胡.webp'), topLabel: '拉客', answer: '拉二胡' },
  { kind: 'pic', id: 15, topSrc: img('15题-油条.webp'), bottomSrc: img('15答-井井有条.webp'), topLabel: '油条', answer: '井井有条' },
  { kind: 'pic', id: 16, topSrc: img('16题-梅西.webp'), bottomSrc: img('16答-西梅.webp'), topLabel: '梅西', answer: '西梅' },
  { kind: 'pic', id: 17, topSrc: img('17题-气球.webp'), bottomSrc: img('17答-告白气球.webp'), topLabel: '气球', answer: '告白气球' },
  { kind: 'pic', id: 18, topSrc: img('18题-蜂蜜.webp'), bottomSrc: img('18答-闺蜜.webp'), topLabel: '蜂蜜', answer: '闺蜜' },
  { kind: 'pic', id: 19, topSrc: img('19题-布.webp'), bottomSrc: img('19题拉布布.webp'), topLabel: '布', answer: '拉布布' }
];

/** 阶段二：四 emoji 猜四字成语（合并两套题库，答案去重） */
const EMOJI_POOL: EmojiPuzzle[] = [
  { kind: 'emoji', id: 101, clues: ['🐻', '有', '🍊', '🎋'], answer: '胸有成竹' },
  { kind: 'emoji', id: 102, clues: ['🔥', '🌲', '🎵', '🎆'], answer: '火树银花' },
  { kind: 'emoji', id: 103, clues: ['🌂', '🦴', '🐱', '🦌'], answer: '三顾茅庐' },
  { kind: 'emoji', id: 104, clues: ['🍬', '💪', '🚧', '🚗'], answer: '螳臂当车' },
  { kind: 'emoji', id: 105, clues: ['🍃', '🚌', '👌', '🐉'], answer: '叶公好龙' },
  { kind: 'emoji', id: 106, clues: ['🐑', '🚶', '🐯', '👄'], answer: '羊入虎口' },
  { kind: 'emoji', id: 107, clues: ['🔪', '⛰️', '🔥', '🌊'], answer: '刀山火海' },
  { kind: 'emoji', id: 108, clues: ['🎒', '🪞', '🍐', '🍌'], answer: '背井离乡' },
  { kind: 'emoji', id: 109, clues: ['🍬', '🍬', '🪡', '🪡'], answer: '堂堂正正' },
  { kind: 'emoji', id: 110, clues: ['✋', '👄', '🚶', '🍼'], answer: '守口如瓶' },
  { kind: 'emoji', id: 111, clues: ['⬅️', '🤔', '➡️', '🤔'], answer: '左思右想' },
  { kind: 'emoji', id: 112, clues: ['🍜', '🍜', '✋', '🪦'], answer: '绵绵不绝' },
  { kind: 'emoji', id: 113, clues: ['➖', '7️⃣', '📖', '8️⃣'], answer: '横七竖八' },
  { kind: 'emoji', id: 114, clues: ['🔨', '🥬', '😋', '🌊'], answer: '大材小用' },
  { kind: 'emoji', id: 115, clues: ['🪞', '🧎', '🎫', '🐘'], answer: '金桂飘香' },
  { kind: 'emoji', id: 116, clues: ['🖐🏻', '🔒', '🦴', '🐔'], answer: '无所顾忌' },
  { kind: 'emoji', id: 117, clues: ['👄', '🧱', '🐍', '🚶'], answer: '唇枪舌战' },
  { kind: 'emoji', id: 201, clues: ['🍏', '🌹', '🐷', '🐴'], answer: '青梅竹马' },
  { kind: 'emoji', id: 202, clues: ['😄', '👆', '🌹', '🔥'], answer: '喜上眉梢' },
  { kind: 'emoji', id: 203, clues: ['🐔', '✈️', '🥚', '🔨'], answer: '鸡飞蛋打' },
  { kind: 'emoji', id: 204, clues: ['🎈', '👄', '8️⃣', '🐍'], answer: '七嘴八舌' },
  { kind: 'emoji', id: 205, clues: ['✅', '🐂', '🤘', '🎹'], answer: '对牛弹琴' },
  { kind: 'emoji', id: 206, clues: ['♨️', '♨️', '☀️', '👆'], answer: '蒸蒸日上' },
  { kind: 'emoji', id: 207, clues: ['🧊', '🧊', '🈶', '🎁'], answer: '彬彬有礼' },
  { kind: 'emoji', id: 208, clues: ['🚶', '🐴', '👀', '🌸'], answer: '走马观花' },
  { kind: 'emoji', id: 209, clues: ['🐟', '🎵', '♻️', '🍚'], answer: '余音绕梁' },
  { kind: 'emoji', id: 210, clues: ['🚶', '🐏', '🐴', '🍅'], answer: '人仰马翻' },
  { kind: 'emoji', id: 211, clues: ['🐦', '🌧️', '🌼', '🤔'], answer: '鸟语花香' },
  { kind: 'emoji', id: 212, clues: ['🐷', '☀️', '💎', '🎈'], answer: '珠光宝气' },
  { kind: 'emoji', id: 213, clues: ['👨', '👩', '👵', '👦'], answer: '男女老少' },
  { kind: 'emoji', id: 214, clues: ['🐶', '🐔', '🪂', '🧱'], answer: '狗急跳墙' }
];

/** 阶段二压轴：固定最后一题，不进随机池 */
const EMOJI_FINALE: EmojiPuzzle = {
  kind: 'emoji',
  id: 900,
  clues: ['🍊', '👶🏻', '💪', '🏊', '⭕', '❤️', '🍊', '🍬', '🐘'],
  answer: '橙子粒永远爱陈添祥'
};

const buildEmojiDeck = (): EmojiPuzzle[] => [...shufflePick(EMOJI_POOL, ROUND_COUNT), EMOJI_FINALE];

const ROUND_FONT =
  '"Rounded Mplus 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif';

const normalize = (s: string) => s.replace(/\s+/g, '').trim().toLowerCase();

const blanks = (n: number) => '＿'.repeat(n);

const shufflePick = <T,>(pool: T[], n: number): T[] => {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
};

export const Level25WordFunGame: React.FC = () => {
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
  const isActive = status === 'playing' && currentLevelId === 20;
  const assetsReady = useLevelAssetsGate(20, isActive, runId);

  const [stage, setStage] = useState<1 | 2>(1);
  const [deck, setDeck] = useState<Puzzle[]>(() => shufflePick(PIC_POOL, ROUND_COUNT));
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [shake, setShake] = useState(false);
  const [stageBanner, setStageBanner] = useState(false);

  const stageRef = useRef<1 | 2>(1);
  const indexRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const endedRef = useRef(false);
  const lockingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deckRef = useRef(deck);

  const puzzle = deck[index] ?? deck[0];
  const total = deck.length || ROUND_COUNT;
  const answerLen = puzzle?.answer.length ?? 4;

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const lost = MAX_LIVES - livesRef.current;
    const stars = lost === 0 ? 3 : lost === 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 320);
  }, [completeLevel]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  const enterStage2 = useCallback(() => {
    const next = buildEmojiDeck();
    deckRef.current = next;
    stageRef.current = 2;
    indexRef.current = 0;
    livesRef.current = MAX_LIVES;
    lockingRef.current = false;
    setStage(2);
    setDeck(next);
    setIndex(0);
    setLives(MAX_LIVES);
    setInput('');
    setFlash(null);
    setShake(false);
    setStageBanner(true);
    window.setTimeout(() => setStageBanner(false), 1100);
  }, []);

  const resetRun = useCallback(() => {
    const next = shufflePick(PIC_POOL, ROUND_COUNT);
    deckRef.current = next;
    stageRef.current = 1;
    indexRef.current = 0;
    livesRef.current = MAX_LIVES;
    endedRef.current = false;
    lockingRef.current = false;
    setStage(1);
    setDeck(next);
    setIndex(0);
    setLives(MAX_LIVES);
    setInput('');
    setEnded(false);
    setFailed(false);
    setFlash(null);
    setShake(false);
    setStageBanner(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    resetRun();
  }, [isActive, runId, resetRun]);

  useEffect(() => {
    if (!isActive || ended || failed || gameplayPaused || stageBanner) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [isActive, index, stage, ended, failed, gameplayPaused, stageBanner]);

  const submit = () => {
    if (!isActive || gameplayPaused || ended || failed || lockingRef.current || !puzzle) return;
    const guess = normalize(input);
    if (!guess) return;

    lockingRef.current = true;
    playSoftClick();
    const ok =
      guess === normalize(puzzle.answer) ||
      (puzzle.aliases ?? []).some((a) => normalize(a) === guess);

    if (ok) {
      playCorrect();
      setFlash('ok');
      const next = indexRef.current + 1;
      if (next >= deckRef.current.length) {
        if (stageRef.current === 1) {
          window.setTimeout(() => enterStage2(), 320);
          return;
        }
        succeed();
        return;
      }
      window.setTimeout(() => {
        indexRef.current = next;
        setIndex(next);
        setInput('');
        setFlash(null);
        lockingRef.current = false;
      }, 280);
      return;
    }

    playWrong();
    setFlash('bad');
    setShake(true);
    window.setTimeout(() => setShake(false), 420);
    const nl = livesRef.current - 1;
    livesRef.current = nl;
    setLives(nl);
    if (nl <= 0) {
      fail();
      return;
    }
    window.setTimeout(() => {
      setInput('');
      setFlash(null);
      lockingRef.current = false;
      inputRef.current?.focus();
    }, 360);
  };

  if (!isActive || !assetsReady || !puzzle) return null;

  const isPic = puzzle.kind === 'pic';
  const title = '🐑 梗图夜话';
  const hint = stage === 1 ? '上下对照猜谐音梗' : 'emoji猜词';
  const clueCols = isPic ? 4 : puzzle.clues.length <= 4 ? 4 : 3;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden"
      style={{ background: FRESH.bgGrad, fontFamily: ROUND_FONT }}
    >
      <style>{`@keyframes l25-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
      <LevelTopBar
        title={title}
        onPause={() => setGameplayPaused(true)}
        hint={hint}
        stats={[
          { label: '阶段', value: `${stage}/2` },
          { label: '进度', value: `${Math.min(index + 1, total)}/${total}` },
          { label: '生命', value: `${lives}/${MAX_LIVES}` }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col px-4 pb-5 pt-1">
        <div
          className={`flex-1 min-h-0 w-full rounded-[22px] bg-white border border-[#cccccc] px-4 pt-3 pb-3 shadow-sm flex flex-col ${
            flash === 'ok' ? 'ring-4 ring-[#3aab8e]/25' : flash === 'bad' ? 'ring-4 ring-[#c75b7a]/25' : ''
          }`}
          style={{
            animation: shake ? 'l25-shake 0.4s ease' : undefined
          }}
        >
          <div className="flex items-center justify-between shrink-0 mb-2 px-0.5">
            <div className="flex items-center gap-1.5" aria-label={`生命 ${lives}`}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span
                  key={i}
                  className="text-[22px] leading-none select-none"
                  style={{
                    color: i < lives ? '#e74c5c' : '#d0d0d0',
                    filter: i < lives ? 'none' : 'grayscale(1)',
                    opacity: i < lives ? 1 : 0.85
                  }}
                >
                  ♥
                </span>
              ))}
            </div>
            <span className="text-[15px] font-bold tracking-wide text-[#222]">
              关卡 {stage}-{index + 1}
            </span>
          </div>

          {isPic ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                <div className="w-full flex-1 min-h-0 rounded-[16px] overflow-hidden bg-[#FFF279] flex items-center justify-center">
                  <img
                    src={puzzle.topSrc}
                    alt={puzzle.topLabel}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
                <p className="shrink-0 mt-2.5 text-[26px] font-bold text-black tracking-wide">这是{puzzle.topLabel}</p>
              </div>

              <div className="shrink-0 my-2.5 border-t border-dashed border-[#cccccc]" />

              <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                <div className="w-full flex-1 min-h-0 rounded-[16px] overflow-hidden bg-[#FF9E9E] flex items-center justify-center">
                  <img
                    src={puzzle.bottomSrc}
                    alt="猜词线索"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
                <p className="shrink-0 mt-2.5 text-[26px] font-bold text-black tracking-wide">
                  这是{blanks(answerLen)}
                  <span className="text-[18px] font-bold text-[#444]">（{answerLen}个字）</span>
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-1">
              <div
                className="w-full grid gap-2.5"
                style={{ gridTemplateColumns: `repeat(${clueCols}, minmax(0, 1fr))` }}
              >
                {puzzle.clues.map((c, i) => (
                  <div
                    key={`${puzzle.id}-${i}`}
                    className="aspect-square rounded-[18px] bg-[#FFF6C8] border border-[#f0e2a0] flex items-center justify-center shadow-sm"
                  >
                    <span
                      className="leading-none select-none"
                      style={{
                        fontSize:
                          puzzle.clues.length > 6
                            ? 36
                            : c.length === 1 && /[\u4e00-\u9fff]/.test(c)
                              ? 42
                              : 48,
                        // 汉字可粗体；emoji 用正常字重 + 彩色字体栈，避免 iOS 空白
                        ...(c.length === 1 && /[\u4e00-\u9fff]/.test(c)
                          ? { fontWeight: 800 }
                          : { ...emojiSafeStyle, fontFamily: COLOR_EMOJI_FONT })
                      }}
                    >
                      {c}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[26px] font-bold text-black tracking-wide text-center">
                这是{blanks(answerLen)}
                <span className="text-[18px] font-bold text-[#444]">（{answerLen}个字）</span>
              </p>
              <p className="text-sm font-semibold text-[#6a7a8a]">
                {puzzle.id === EMOJI_FINALE.id ? '看符号谐音/意象，猜出完整句子' : '看符号谐音/意象，猜出成语'}
              </p>
            </div>
          )}
        </div>

        <form
          className="w-full shrink-0 flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            maxLength={answerLen + 4}
            disabled={ended || failed || stageBanner}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`输入 ${answerLen} 个字`}
            className="flex-1 min-w-0 h-14 rounded-2xl bg-white border border-[#cccccc] px-4 text-[22px] font-bold text-black placeholder:text-[22px] placeholder:font-bold placeholder:text-[#888] outline-none focus:border-[#4a9fd8] disabled:opacity-50"
            style={{ fontFamily: ROUND_FONT }}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button
            type="submit"
            disabled={ended || failed || stageBanner || !input.trim()}
            className="shrink-0 h-14 px-5 rounded-2xl bg-[#3aab8e] text-white text-[20px] font-bold border-2 border-white shadow-md active:scale-95 disabled:opacity-45"
          >
            确定
          </button>
        </form>
      </div>

      {stageBanner && (
        <div className="absolute inset-0 z-[85] bg-[#0a1628]/35 flex items-center justify-center px-10 pointer-events-none">
          <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-lg">
            <p className="text-xl font-bold" style={{ color: FRESH.text }}>
              阶段二开启
            </p>
            <p className="mt-1 text-sm" style={{ color: FRESH.textMuted }}>
              emoji猜词 · 最后一题有惊喜
            </p>
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/40 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3" style={{ fontFamily: ROUND_FONT }}>
            <h3 className="text-lg font-bold" style={{ color: FRESH.text }}>
              生命耗尽
            </h3>
            <p className="text-sm" style={{ color: FRESH.textMuted }}>
              本题答案：{puzzle.answer}
            </p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">
              重新挑战
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
          onClick={testCompleteLevel}
          className="absolute right-4 top-36 z-50 px-3 py-2 bg-black/35 text-white rounded-full text-xs"
        >
          测试通关
        </button>
      )}
    </div>
  );
};
