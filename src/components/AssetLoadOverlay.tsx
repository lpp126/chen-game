import React, { useEffect, useState } from 'react';
import { FRESH } from '../utils/levelTheme';
import {
  clearAssetGate,
  getAssetGateSnapshot,
  setAssetGate,
  subscribeAssetGate,
  type AssetGateSnapshot
} from '../utils/assetGate';

/** @deprecated 兼容旧调用 */
export function reportAssetLoad(label: string, progress: number, done = false) {
  if (done || !label) {
    clearAssetGate('legacy');
    return;
  }
  setAssetGate('legacy', label.startsWith('正在') ? label : `正在加载${label}`, progress, 50);
}

export function clearAssetLoad() {
  clearAssetGate('legacy');
}

export const AssetLoadOverlay: React.FC = () => {
  const [snap, setSnap] = useState<AssetGateSnapshot>(() => getAssetGateSnapshot());

  useEffect(() => subscribeAssetGate(() => setSnap(getAssetGateSnapshot())), []);

  if (!snap.active) return null;

  const pct = Math.round(snap.progress * 100);

  return (
    <div
      className="absolute inset-0 z-[220] flex flex-col items-center justify-center px-8"
      style={{ background: 'rgba(10, 22, 40, 0.88)', backdropFilter: 'blur(6px)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl px-5 py-6 border border-white/70 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.96)' }}
      >
        <p className="text-center text-lg font-bold mb-1" style={{ color: FRESH.text }}>
          {snap.label || '正在加载'}
        </p>
        <p className="text-center text-sm mb-5" style={{ color: FRESH.textMuted }}>
          资源下载中，请稍候…
        </p>
        <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: `${FRESH.mist}55` }}>
          <div
            className="h-full rounded-full transition-[width] duration-150 ease-out"
            style={{
              width: `${Math.max(pct, 4)}%`,
              background: `linear-gradient(90deg, ${FRESH.sky}, ${FRESH.sage})`
            }}
          />
        </div>
        <p className="text-center text-base font-semibold tabular-nums" style={{ color: FRESH.teal }}>
          {pct}%
        </p>
      </div>
    </div>
  );
};
