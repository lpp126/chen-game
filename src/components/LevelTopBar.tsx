import React from 'react';
import { FRESH, hudGlass, hudPauseBtn, hudStatPill, mobileContentInset, mobileTextMin, mobileTextTitle } from '../utils/levelTheme';

export type LevelStat = { label: string; value: string };

interface LevelTopBarProps {
  title: string;
  stats: LevelStat[];
  onPause: () => void;
  hint?: string;
  extra?: React.ReactNode;
  /** 第 1 关：不遮挡 Phaser 下落轨迹 */
  variant?: 'default' | 'minimal';
  /** 统计放在标题与暂停按钮之间（单行紧凑） */
  statsInline?: boolean;
}

export { LEVEL_TOP_RESERVED } from '../utils/levelTheme';

export const LevelTopBar: React.FC<LevelTopBarProps> = ({
  title,
  stats,
  onPause,
  hint,
  extra,
  variant = 'default',
  statsInline = false
}) => {
  const minimal = variant === 'minimal';
  const panelClass = minimal
    ? 'rounded-[1.15rem] bg-white/20 backdrop-blur-[2px] border border-white/35 shadow-none'
    : hudGlass;

  const statPills = stats.map((s) => (
    <span key={s.label} className={hudStatPill}>
      <span className="text-xs" style={{ color: FRESH.textMuted }}>
        {s.label}
      </span>
      <span className="font-semibold">{s.value}</span>
    </span>
  ));

  return (
  <header
    className={`relative z-[80] shrink-0 pt-3 pb-2 pointer-events-auto ${mobileContentInset}`}
    style={minimal ? undefined : { background: `linear-gradient(180deg, ${FRESH.bg}cc 0%, transparent 52%)` }}
  >
    <div className={`${panelClass} px-3.5 py-2.5`}>
      <div className="flex items-center gap-2.5">
        <p className={`min-w-0 ${statsInline ? 'shrink' : 'flex-1'} ${mobileTextTitle} font-bold truncate leading-tight`} style={{ color: FRESH.text }}>
          {title}
        </p>
        {statsInline && stats.length > 0 && <div className="flex flex-1 flex-wrap items-center justify-center gap-2">{statPills}</div>}
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

      {!statsInline && stats.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{statPills}</div>
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
};
