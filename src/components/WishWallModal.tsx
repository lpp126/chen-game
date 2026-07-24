import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBirthdayWishes, isCloudConfigured, type BirthdayWishItem } from '../services/accountSave';
import { FRESH } from '../utils/levelTheme';

type DanmakuItem = BirthdayWishItem & {
  id: string;
  top: number;
  duration: number;
  delay: number;
  size: number;
  tint: string;
};

const TINTS = ['#ff8c42', '#3a9fc4', '#45b896', '#c9892a', '#e86b8a', '#6b7fd7', '#d4a017'];
const LANE_HEIGHT = 46;
const LANE_PAD = 5;
const PASS_SEC = 15;

type Props = {
  open: boolean;
  onClose: () => void;
};

const fontSizeFor = (item: BirthdayWishItem) => {
  const len = item.message.length;
  if (len > 40) return 21;
  if (len > 24) return 23;
  return 25;
};

const textWidthFor = (item: BirthdayWishItem, size: number) =>
  (item.nickname.length + item.message.length) * size * 0.66 + 44;

/** 略紧的追赶间距：允许轻微挡一点，同屏更满 */
const chaseGapSec = (item: BirthdayWishItem, stageW: number, size: number) => {
  const travel = Math.max(stageW, 1) * 2.65;
  const need = textWidthFor(item, size) * 0.72 + 40;
  return Math.max(2.1, Math.min(5.8, (need * PASS_SEC) / travel));
};

export const WishWallModal: React.FC<Props> = ({ open, onClose }) => {
  const [items, setItems] = useState<BirthdayWishItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [areaSize, setAreaSize] = useState({ w: 700, h: 900 });
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      if (!isCloudConfigured()) {
        if (!cancelled) {
          setItems([]);
          setError('云端未配置，暂时无法读取留言墙');
          setLoading(false);
        }
        return;
      }
      try {
        const list = await fetchBirthdayWishes();
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError('留言墙加载失败，请稍后再试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setAreaSize({
        w: Math.max(320, el.clientWidth),
        h: Math.max(400, el.clientHeight)
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, loading]);

  const laneCount = useMemo(() => {
    const usable = areaSize.h - LANE_PAD * 2;
    // 在可排轨道基础上再挤进 1 轨
    return Math.max(11, Math.floor(usable / LANE_HEIGHT) + 1);
  }, [areaSize.h]);

  const danmaku = useMemo<DanmakuItem[]>(() => {
    if (!items.length) return [];

    const usable = areaSize.h - LANE_PAD * 2;
    const step = usable / laneCount;
    const lanes: BirthdayWishItem[][] = Array.from({ length: laneCount }, () => []);

    // 全量上墙，不按批切换；留言少时循环铺满各轨
    const pool = [...items];
    if (pool.length < laneCount) {
      let i = 0;
      while (pool.length < laneCount) {
        pool.push(items[i % items.length]);
        i += 1;
      }
    }
    pool.forEach((item, i) => {
      lanes[i % laneCount].push(item);
    });

    const result: DanmakuItem[] = [];
    lanes.forEach((laneItems, laneIdx) => {
      if (!laneItems.length) return;
      const top = LANE_PAD + laneIdx * step + 4;
      const meta = laneItems.map((item) => {
        const size = fontSizeFor(item);
        return { item, size, gap: chaseGapSec(item, areaSize.w, size) };
      });
      const gap = Math.max(...meta.map((m) => m.gap));
      const cycle = Math.max(PASS_SEC, gap * meta.length + 0.3);

      meta.forEach((m, j) => {
        result.push({
          ...m.item,
          id: `l${laneIdx}-${j}-${m.item.nickname}-${m.item.message.slice(0, 6)}-${result.length}`,
          top,
          duration: cycle,
          delay: -j * gap - (laneIdx % 5) * 0.22,
          size: m.size,
          tint: TINTS[(laneIdx + j * 2) % TINTS.length]
        });
      });
    });
    return result;
  }, [items, laneCount, areaSize.w, areaSize.h]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] pointer-events-auto flex items-stretch justify-center px-[2%] py-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="关闭留言墙"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-lg rounded-[1.6rem] overflow-hidden border-2 shadow-2xl flex flex-col h-full"
        style={{
          borderColor: '#f0c56a',
          background: 'linear-gradient(180deg, #1a2438 0%, #0f1828 55%, #152033 100%)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,200,120,0.2)'
        }}
      >
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-white/10 shrink-0">
          <div>
            <p className="text-[14px] font-semibold tracking-[0.22em]" style={{ color: '#f0c56a' }}>
              WISH WALL
            </p>
            <h3 className="text-xl font-bold text-white mt-0.5">留言墙</h3>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              此后万里 ·只添星辉
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 text-white/90 text-lg leading-none active:scale-95"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div ref={stageRef} className="relative flex-1 min-h-0 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(255,180,80,0.28), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(74,159,216,0.2), transparent 45%)'
            }}
          />
          <style>{`
            @keyframes wish-danmaku {
              0% { transform: translate3d(102%, 0, 0); }
              100% { transform: translate3d(-155%, 0, 0); }
            }
          `}</style>

          {loading && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
              正在连接云端留言墙…
            </p>
          )}

          {!loading && error && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-center px-6 text-white/70">
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-center px-6 text-white/70">
              还没有留言哦
              <br />
              通关第 24 关后可以为添添留下祝福
            </p>
          )}

          {!loading &&
            !error &&
            danmaku.map((d) => (
              <div
                key={d.id}
                className="absolute left-0 whitespace-nowrap pointer-events-none select-none leading-none"
                style={{
                  top: d.top,
                  animation: `wish-danmaku ${d.duration}s linear ${d.delay}s infinite`,
                  animationFillMode: 'both',
                  color: '#fff',
                  fontSize: d.size,
                  textShadow: `0 0 8px ${d.tint}88, 0 2px 3px rgba(0,0,0,0.55)`
                }}
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border"
                  style={{
                    background: 'rgba(12,18,32,0.7)',
                    borderColor: `${d.tint}55`
                  }}
                >
                  <span className="font-bold shrink-0" style={{ color: d.tint }}>
                    @{d.nickname}
                  </span>
                  <span className="opacity-95">{d.message}</span>
                </span>
              </div>
            ))}
        </div>

        <div className="px-4 py-3 border-t border-white/10 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full text-sm font-bold text-white active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
