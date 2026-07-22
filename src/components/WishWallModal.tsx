import React, { useEffect, useMemo, useState } from 'react';
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

type Props = {
  open: boolean;
  onClose: () => void;
};

export const WishWallModal: React.FC<Props> = ({ open, onClose }) => {
  const [items, setItems] = useState<BirthdayWishItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const danmaku = useMemo<DanmakuItem[]>(() => {
    if (!items.length) return [];

    const LANE_COUNT = 12;
    const DURATION = 22;
    const TOP_START = 3;
    const TOP_END = 91;
    const laneStep = (TOP_END - TOP_START) / Math.max(1, LANE_COUNT - 1);

    // 至多两轮：保证多数轨道只有 1～2 条，长文案也不易追上遮挡
    const pool = items.length <= LANE_COUNT ? [...items, ...items] : items;

    const lanes: BirthdayWishItem[][] = Array.from({ length: LANE_COUNT }, () => []);
    pool.forEach((item, i) => {
      lanes[i % LANE_COUNT].push(item);
    });

    const result: DanmakuItem[] = [];
    lanes.forEach((laneItems, laneIdx) => {
      const n = laneItems.length;
      if (!n) return;
      const top = TOP_START + laneIdx * laneStep;
      laneItems.forEach((item, j) => {
        // 同轨均分相位 + 统一速度 → 相对间距恒定
        const delay = n <= 1 ? -((laneIdx * 0.17) % 1) * DURATION : -((j / n) * DURATION);
        const globalIdx = result.length;
        result.push({
          ...item,
          id: `${laneIdx}-${j}-${item.nickname}-${item.message.slice(0, 6)}`,
          top,
          duration: DURATION,
          delay,
          size: 22 + (globalIdx % 5),
          tint: TINTS[globalIdx % TINTS.length]
        });
      });
    });
    return result;
  }, [items]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] pointer-events-auto flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="关闭留言墙"
        onClick={onClose}
      />

      <div
        className="relative z-10 m-auto w-[92%] max-w-md rounded-[1.6rem] overflow-hidden border-2 shadow-2xl"
        style={{
          borderColor: '#f0c56a',
          background: 'linear-gradient(180deg, #1a2438 0%, #0f1828 55%, #152033 100%)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,200,120,0.2)'
        }}
      >
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-white/10">
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

        <div className="relative h-[68vh] max-h-[580px] min-h-[380px] overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(255,180,80,0.28), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(74,159,216,0.2), transparent 45%)'
            }}
          />
          <style>{`
            @keyframes wish-danmaku {
              0% { transform: translate3d(105%, 0, 0); }
              100% { transform: translate3d(-115%, 0, 0); }
            }
            @keyframes wish-spark {
              0%, 100% { filter: drop-shadow(0 0 0 rgba(255,200,120,0)); }
              50% { filter: drop-shadow(0 0 8px rgba(255,200,120,0.55)); }
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
                className="absolute left-0 whitespace-nowrap pointer-events-none select-none"
                style={{
                  top: `${d.top}%`,
                  opacity: 1,
                  animation: `wish-danmaku ${d.duration}s linear ${d.delay}s infinite, wish-spark 2.8s ease-in-out infinite`,
                  animationFillMode: 'both',
                  color: '#fff',
                  fontSize: d.size,
                  textShadow: `0 0 10px ${d.tint}88, 0 2px 4px rgba(0,0,0,0.55)`
                }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: `${d.tint}66`,
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <span className="font-bold" style={{ color: d.tint }}>
                    @{d.nickname}
                  </span>
                  <span className="opacity-90">{d.message}</span>
                </span>
              </div>
            ))}
        </div>

        <div className="px-4 py-3 border-t border-white/10 text-center">
         
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2.5 rounded-full text-sm font-bold text-white active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
