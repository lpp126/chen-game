import React from 'react';
import { FRESH, hudGlass, hudPauseBtn, hudStatPill, mobileContentInset, mobileTextMin, mobileTextTitle } from '../utils/levelTheme';

export type LevelStat = { label: string; value: string };

interface LevelTopBarProps {
  title: string;
  stats: LevelStat[];
  onPause: () => void;
  hint?: string;
  extra?: React.ReactNode;
}

export { LEVEL_TOP_RESERVED } from '../utils/levelTheme';

export const LevelTopBar: React.FC<LevelTopBarProps> = ({ title, stats, onPause, hint, extra }) => (
  <header
    className={`relative z-[80] shrink-0 pt-3 pb-2 pointer-events-auto ${mobileContentInset}`}
    style={{ background: `linear-gradient(180deg, ${FRESH.bg} 0%, ${FRESH.bgMid}ee 70%, transparent 100%)` }}
  >
    <div className={`${hudGlass} px-3.5 py-2.5`}>
      <div className="flex items-center gap-2.5">
        <p className={`flex-1 min-w-0 ${mobileTextTitle} font-bold truncate leading-tight`} style={{ color: FRESH.text }}>
          {title}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPause();
          }}
          className={hudPauseBtn}
        >
          暂停
        </button>
      </div>

      {stats.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {stats.map((s) => (
            <span key={s.label} className={hudStatPill}>
              <span className="text-xs" style={{ color: FRESH.textMuted }}>
                {s.label}
              </span>
              <span className="font-semibold">{s.value}</span>
            </span>
          ))}
        </div>
      )}

      {hint && (
        <p className={`mt-2 text-center ${mobileTextMin} leading-snug px-1`} style={{ color: FRESH.textSoft }}>
          {hint}
        </p>
      )}
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  </header>
);
