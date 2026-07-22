import React, { useEffect, useState } from 'react';
import { FRESH } from '../utils/levelTheme';

export type AssetLoadDetail = {
  /** 空字符串表示结束并隐藏 */
  label: string;
  /** 0~1 */
  progress: number;
  done?: boolean;
};

const EVENT = 'ctxiang-asset-load';

/** 全局上报加载进度；label 为空或 done 时关闭提示 */
export function reportAssetLoad(label: string, progress: number, done = false) {
  window.dispatchEvent(
    new CustomEvent<AssetLoadDetail>(EVENT, {
      detail: { label, progress: Math.max(0, Math.min(1, progress)), done }
    })
  );
}

export function clearAssetLoad() {
  reportAssetLoad('', 1, true);
}

export const AssetLoadOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onLoad = (ev: Event) => {
      const detail = (ev as CustomEvent<AssetLoadDetail>).detail;
      if (!detail || detail.done || !detail.label) {
        setVisible(false);
        setLabel('');
        setProgress(0);
        return;
      }
      setVisible(true);
      setLabel(detail.label);
      setProgress(detail.progress);
    };
    window.addEventListener(EVENT, onLoad);
    return () => window.removeEventListener(EVENT, onLoad);
  }, []);

  if (!visible) return null;

  const pct = Math.round(progress * 100);

  return (
    <div className="absolute inset-0 z-[120] pointer-events-none flex items-end justify-center pb-16">
      <div
        className="pointer-events-none w-[78%] max-w-sm rounded-2xl px-4 py-3.5 border border-white/70 shadow-xl"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-bold" style={{ color: FRESH.text }}>
            {label}
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: FRESH.teal }}>
            {pct}%
          </p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${FRESH.mist}55` }}>
          <div
            className="h-full rounded-full transition-[width] duration-150 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${FRESH.sky}, ${FRESH.sage})`
            }}
          />
        </div>
        <p className="mt-2 text-[11px] text-center" style={{ color: FRESH.textMuted }}>
          加载中，请稍候…
        </p>
      </div>
    </div>
  );
};
