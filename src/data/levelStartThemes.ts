/** 各关「开始 / 规则页」视觉主题 — 蓝绿 cinematic 色系 */
export type LevelStartPattern = 'dots' | 'grid' | 'waves' | 'sparkle' | 'rings';

export interface LevelStartTheme {
  emoji: string;
  subtitle: string;
  bgGradient: string;
  orbGradient: string;
  accent: string;
  accentSoft: string;
  cardBorder: string;
  pattern: LevelStartPattern;
  coverImage?: string;
}

type Hue = 'sky' | 'teal' | 'aurora' | 'deep';

const HUES: Record<Hue, { bg: [string, string, string]; orb: [string, string]; accent: string; soft: string; border: string }> = {
  sky: {
    bg: ['#eaf4fc', '#d6ecf8', '#bddff5'],
    orb: ['#8ecdf0', '#4a9fd8'],
    accent: '#2b7fc4',
    soft: '#eef7fd',
    border: '#a8d8f0'
  },
  teal: {
    bg: ['#e6f7f3', '#d0efe8', '#b8e5db'],
    orb: ['#72d4bc', '#3aab8e'],
    accent: '#2a9580',
    soft: '#edfbf7',
    border: '#9edfcc'
  },
  aurora: {
    bg: ['#e8f6fc', '#d4ecf8', '#bfe3f2'],
    orb: ['#6ec8e8', '#52b788'],
    accent: '#3d8fd9',
    soft: '#f0f9ff',
    border: '#a5d4ef'
  },
  deep: {
    bg: ['#e2edf8', '#ccdff0', '#b3cce6'],
    orb: ['#7eb0dc', '#4a7ab8'],
    accent: '#3568a8',
    soft: '#eef4fb',
    border: '#9bb8dc'
  }
};

const cinematic = (
  emoji: string,
  subtitle: string,
  hue: Hue,
  pattern: LevelStartPattern = 'dots',
  coverImage?: string
): LevelStartTheme => {
  const c = HUES[hue];
  return {
    emoji,
    subtitle,
    bgGradient: `linear-gradient(165deg, ${c.bg[0]} 0%, ${c.bg[1]} 45%, ${c.bg[2]} 100%)`,
    orbGradient: `linear-gradient(145deg, ${c.orb[0]}, ${c.orb[1]})`,
    accent: c.accent,
    accentSoft: c.soft,
    cardBorder: c.border,
    pattern,
    coverImage
  };
};

export const LEVEL_START_THEMES: Record<number, LevelStartTheme> = {
  1: cinematic('🍼', '随节拍喂养，把饱食度喂到满格', 'aurora', 'sparkle'),
  2: cinematic('👣', '点击地面，引导宝宝爬向出口', 'teal', 'waves'),
  3: cinematic('🦘', '跳跃收集星星，抵达终点旗帜', 'sky', 'dots'),
  4: cinematic('🧱', '搭起积木塔，让塔顶触达金线', 'deep', 'grid'),
  5: cinematic('📖', '拖动拼图，还原萤光故事页', 'sky', 'sparkle'),
  6: cinematic('🎒', '整理书包，三消清空桌面', 'teal', 'grid'),
  7: cinematic('🔢', '滑动合并数字，向 1024 进发', 'deep', 'grid'),
  8: cinematic('🗼', '经典三柱汉诺塔，移盘到右侧', 'teal', 'rings'),
  9: cinematic('📘', '拨开迷雾，限时心算破译作业', 'sky', 'waves'),
  10: cinematic('💡', '翻转灯光，熄灭全部格子', 'aurora', 'sparkle'),
  11: cinematic('🔍', '对比两图，找出唯一不同', 'deep', 'dots'),
  12: cinematic('🤝', '翻牌配对，在步数内找齐同桌', 'teal', 'grid'),
  13: cinematic('💧', '旋转水管接通，让水流到达花盆', 'sky', 'waves'),
  14: cinematic('⚡', '心算比大小，选出更大的一侧', 'aurora', 'sparkle'),
  15: cinematic('🃏', '四则运算凑 24，按顺序选牌运算', 'deep', 'rings'),
  16: cinematic('🔢', '四格数独，填满且无冲突', 'teal', 'grid'),
  17: cinematic('🧩', '观察规律，选出序列下一项', 'sky', 'dots'),
  18: cinematic('🔐', '读线索转轮盘，解开数字锁', 'deep', 'rings'),
  19: cinematic('🏗', '飘移落块叠楼，对齐越准越稳', 'aurora', 'grid'),
  20: cinematic('🎬', '记住亮灯顺序，按序复现', 'sky', 'sparkle'),
  21: cinematic('📝', '打乱词块，按语序拼成完整句', 'teal', 'waves'),
  22: cinematic('✏️', '沿连线一笔连完所有点', 'deep', 'rings'),
  23: cinematic('🎨', '九格辨色，找出略有差异的一格', 'aurora', 'dots'),
  24: cinematic('🎂', '按顺序制作生日蛋糕', 'sky', 'sparkle')
};

export const getLevelStartTheme = (levelId: number): LevelStartTheme =>
  LEVEL_START_THEMES[levelId] ?? LEVEL_START_THEMES[1];

export const parseRuleLine = (line: string): { icon: string; text: string } => {
  const trimmed = line.trim();
  const space = trimmed.indexOf(' ');
  if (space <= 0) return { icon: '•', text: trimmed };
  return { icon: trimmed.slice(0, space), text: trimmed.slice(space + 1) };
};
