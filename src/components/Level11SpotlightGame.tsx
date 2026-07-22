import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playSoftClick, playSparkle, playWin, playWrong } from '../utils/levelAudio';

type Hotspot = { x: number; y: number; w: number; h: number };

/** 热点：相对整张图片宽高的百分比矩形 { x, y, w, h } */
const STAGES = [
  {
    src: '/images/找3.webp',
    label: '找到数字 3',
    target: '3',
    hotspots: [{ x: 58.8, y: 56.2, w: 8, h: 8 }] as Hotspot[]
  },
  {
    src: '/images/找5.webp',
    label: '找到数字 5',
    target: '5',
    hotspots: [{ x: 43.8, y: 38.1, w: 8, h: 8 }] as Hotspot[]
  },
  {
    src: '/images/找6.webp',
    label: '找到数字 6',
    target: '6',
    hotspots: [{ x: 32.7, y: 64.6, w: 8, h: 8 }] as Hotspot[]
  }
];

const STAGE_TIME = 30;
const MAX_STAGE_MISS = 10;

const hitHotspot = (px: number, py: number, spots: Hotspot[]) =>
  spots.some((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);

/** 用 clientWidth/Height（设计稿坐标）；勿用 getBoundingClientRect 直接当布局尺寸（外层有 scale） */
const getContentBox = (wrap: HTMLElement, img: HTMLImageElement) => {
  const ww = wrap.clientWidth;
  const wh = wrap.clientHeight;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (ww <= 0 || wh <= 0 || !nw || !nh) return null;
  const scale = Math.min(ww / nw, wh / nh);
  const width = nw * scale;
  const height = nh * scale;
  return {
    left: (ww - width) / 2,
    top: (wh - height) / 2,
    width,
    height
  };
};

const contentPercent = (
  wrap: HTMLElement,
  img: HTMLImageElement,
  clientX: number,
  clientY: number
): { px: number; py: number } | null => {
  const box = getContentBox(wrap, img);
  if (!box) return null;
  const wr = wrap.getBoundingClientRect();
  if (wr.width <= 0 || wr.height <= 0) return null;
  const localX = (clientX - wr.left) * (wrap.clientWidth / wr.width);
  const localY = (clientY - wr.top) * (wrap.clientHeight / wr.height);
  const x = localX - box.left;
  const y = localY - box.top;
  if (x < 0 || y < 0 || x > box.width || y > box.height) return null;
  return { px: (x / box.width) * 100, py: (y / box.height) * 100 };
};

export const Level11SpotlightGame: React.FC = () => {
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
  const isActive = status === 'playing' && currentLevelId === 11;

  const [stageIdx, setStageIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STAGE_TIME);
  const [stageMisses, setStageMisses] = useState(0);
  const [totalMisses, setTotalMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [stageFailed, setStageFailed] = useState(false);
  const [failReason, setFailReason] = useState<'time' | 'miss'>('time');
  const [flashWrong, setFlashWrong] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const endedRef = useRef(false);

  const stage = STAGES[stageIdx];

  const resetStage = useCallback((idx: number) => {
    setStageIdx(idx);
    setTimeLeft(STAGE_TIME);
    setStageMisses(0);
    setStageFailed(false);
    setFailReason('time');
    setFlashWrong(false);
    setFlashOk(false);
  }, []);

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const stars = totalMisses === 0 ? 3 : totalMisses <= 5 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, totalMisses]);

  useEffect(() => {
    if (!isActive) return;
    endedRef.current = false;
    setTotalMisses(0);
    setEnded(false);
    resetStage(0);
  }, [isActive, runId, resetStage]);

  useEffect(() => {
    if (!isActive || gameplayPaused || ended || stageFailed || flashOk) return;
    if (timeLeft <= 0) {
      playWrong();
      setFailReason('time');
      setStageFailed(true);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [isActive, gameplayPaused, ended, stageFailed, flashOk, timeLeft]);

  const registerMiss = () => {
    playWrong();
    setFlashWrong(true);
    window.setTimeout(() => setFlashWrong(false), 280);
    setStageMisses((m) => {
      const next = m + 1;
      if (next >= MAX_STAGE_MISS) {
        setFailReason('miss');
        setStageFailed(true);
      }
      return next;
    });
    setTotalMisses((m) => m + 1);
  };

  const onImageClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isActive || gameplayPaused || ended || stageFailed || flashOk) return;
    const el = imgRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const pos = contentPercent(wrap, el, e.clientX, e.clientY);
    if (!pos) {
      registerMiss();
      return;
    }

    if (hitHotspot(pos.px, pos.py, stage.hotspots)) {
      playSparkle();
      playCorrect();
      setFlashOk(true);
      window.setTimeout(() => {
        if (stageIdx + 1 >= STAGES.length) {
          succeed();
        } else {
          resetStage(stageIdx + 1);
        }
      }, 450);
    } else {
      registerMiss();
    }
  };

  const retryStage = () => {
    if (!isActive || ended) return;
    resetStage(stageIdx);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔍 眼力大作战"
        onPause={() => setGameplayPaused(true)}
        hint={stage.label}
        stats={[
          { label: '关', value: `${Math.min(stageIdx + 1, STAGES.length)}/${STAGES.length}` },
          { label: '倒计时', value: `${timeLeft}s` },
          { label: '失误', value: `${stageMisses}/${MAX_STAGE_MISS}` }
        ]}
      />

      <div ref={wrapRef} className="flex-1 min-h-0 relative overflow-hidden" onClick={onImageClick}>
        <img
          ref={imgRef}
          src={stage.src}
          alt={stage.label}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          style={{
            filter: flashWrong ? 'brightness(0.75) sepia(0.4) hue-rotate(-20deg)' : undefined,
            outline: flashOk ? `4px solid ${FRESH.success}` : undefined,
            outlineOffset: -4
          }}
        />
        {flashWrong && <div className="absolute inset-0 pointer-events-none bg-[#c75b7a]/18" />}
      </div>

      {stageFailed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/45 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold" style={{ color: FRESH.text }}>
              {failReason === 'miss' ? '失误次数用完' : '时间到了'}
            </h3>
            <p className="text-sm" style={{ color: FRESH.textMuted }}>
              {failReason === 'miss'
                ? `本关失误已达 ${MAX_STAGE_MISS} 次，没能找到数字 ${stage.target}`
                : `没能在 ${STAGE_TIME} 秒内找到数字 ${stage.target}`}
            </p>
            <button type="button" onClick={retryStage} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">
              重试本关
            </button>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#e3f2fc] font-semibold">
              从头再来
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-white border border-[#d6ecf8]">
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
