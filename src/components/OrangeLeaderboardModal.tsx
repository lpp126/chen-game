import React, { useEffect, useState } from 'react';
import { fetchOrangeLeaderboard, isCloudConfigured, type OrangeLeaderboardItem } from '../services/accountSave';
import { FRESH } from '../utils/levelTheme';
import { emojiSafeStyle } from '../utils/emojiSafe';

type Props = {
  open: boolean;
  onClose: () => void;
};

const COL_GRID = 'grid-cols-[2.8rem_minmax(0,1fr)_auto]';
/** 关卡紧贴橙子；同宽同对齐，标题与数字共用 */
const STATS_WRAP = 'grid grid-cols-[2.6rem_3rem] gap-x-0 items-center shrink-0';
const LEVEL_CELL = 'text-right tabular-nums leading-none';
const ORANGE_CELL = 'text-right tabular-nums leading-none pr-2.5';

export const OrangeLeaderboardModal: React.FC<Props> = ({ open, onClose }) => {
  const [items, setItems] = useState<OrangeLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setItems([]);
    void (async () => {
      if (!isCloudConfigured()) {
        if (!cancelled) {
          setError('云端未配置，暂时无法读取排行榜');
          setLoading(false);
        }
        return;
      }
      try {
        const list = await fetchOrangeLeaderboard();
        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('排行榜加载失败，请稍后再试');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] pointer-events-auto flex items-stretch justify-center px-[2%] py-3">
      <button
        type="button"
        className="absolute inset-0 backdrop-blur-[6px]"
        style={{ background: 'rgba(10, 22, 40, 0.35)' }}
        aria-label="关闭排行榜"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-[1.6rem] overflow-hidden border shadow-2xl flex flex-col h-full"
        style={{
          borderColor: 'rgba(255,255,255,0.85)',
          background: FRESH.bgGrad,
          boxShadow: '0 16px 48px rgba(26,51,72,0.2), 0 0 0 1px rgba(126,184,218,0.35)'
        }}
      >
        <div
          className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: `1px solid ${FRESH.mist}55` }}
        >
          <div>
            <p className="text-[14px] font-semibold tracking-[0.22em]" style={{ color: FRESH.sky }}>
              ORANGE RANK
            </p>
            <h3 className="text-xl font-bold mt-0.5 flex items-center gap-1.5" style={{ color: FRESH.text }}>
              <span style={emojiSafeStyle}>🍊</span>
              橙子排行榜
            </h3>
            <p className="text-xs mt-1" style={{ color: FRESH.textMuted }}>
              实时前 500 · 同分并列
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-lg leading-none active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.9)',
              color: FRESH.textSoft
            }}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div
          className={`mx-2 py-2 grid ${COL_GRID} gap-2 text-[24px] font-semibold shrink-0`}
          style={{ color: FRESH.textMuted, borderBottom: `1px solid ${FRESH.mist}44` }}
        >
          <span className="text-center">名次</span>
          <span>ID</span>
          <div className={STATS_WRAP}>
            <span className={LEVEL_CELL}>关卡</span>
            <span className={ORANGE_CELL}>橙子</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mx-2 py-2">
          {loading && (
            <p className="py-16 text-center text-sm" style={{ color: FRESH.textMuted }}>
              正在拉取排行榜…
            </p>
          )}
          {!loading && error && (
            <p className="py-16 text-center text-sm px-6" style={{ color: FRESH.textMuted }}>
              {error}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="py-16 text-center text-sm px-6" style={{ color: FRESH.textMuted }}>
              暂无上榜数据
              <br />
              通关赚橙子后会出现在这里
            </p>
          )}
          {!loading &&
            !error &&
            items.map((row) => {
              const isFirst = row.rank === 1;
              return (
                <div
                  key={`${row.nickname}-${row.rank}-${row.oranges}`}
                  className={`grid ${COL_GRID} gap-2 items-center rounded-xl px-0 py-2.5 mb-1.5`}
                  style={
                    isFirst
                      ? {
                          background:
                            'linear-gradient(90deg, rgba(255,196,80,0.42), rgba(255,179,71,0.18) 55%, rgba(255,255,255,0.55))',
                          boxShadow: 'inset 0 0 0 1px rgba(255,180,80,0.55)',
                          backdropFilter: 'blur(8px)'
                        }
                      : {
                          background: 'rgba(255,255,255,0.62)',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.75)',
                          backdropFilter: 'blur(8px)'
                        }
                  }
                >
                  <span
                    className={`text-center font-black tabular-nums ${isFirst ? 'text-lg' : 'text-sm'}`}
                    style={{ color: isFirst ? '#e8a020' : FRESH.textSoft }}
                  >
                    {isFirst ? '🥇' : row.rank}
                  </span>
                  <span
                    className={`truncate font-bold pl-1 ${isFirst ? 'text-[26px]' : 'text-[24px]'}`}
                    style={{ color: FRESH.text }}
                    title={row.nickname}
                  >
                    {row.nickname}
                  </span>
                  <div className={STATS_WRAP}>
                    <span
                      className={`${LEVEL_CELL} font-bold ${isFirst ? 'text-[26px]' : 'text-[24px]'}`}
                      style={{ color: isFirst ? FRESH.teal : FRESH.sky }}
                    >
                      {row.levels}
                    </span>
                    <span
                      className={`${ORANGE_CELL} font-bold ${isFirst ? 'text-[26px]' : 'text-[24px]'}`}
                      style={{ color: isFirst ? '#e8912a' : '#d4891a' }}
                    >
                      {row.oranges}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${FRESH.mist}55` }}>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full text-sm font-bold text-white active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})`,
              boxShadow: '0 8px 24px rgba(61,143,217,0.28)'
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
