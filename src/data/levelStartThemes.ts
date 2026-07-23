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
  1: cinematic('🍼', '1 岁 · 跟着节拍喂饱这一天', 'aurora', 'sparkle'),
  2: cinematic('👣', '2 岁 · 点地爬行，抵达客厅出口', 'teal', 'waves'),
  3: cinematic('🦘', '3 岁 · 跳起来够星星，冲向旗帜', 'sky', 'dots'),
  4: cinematic('🧱', '4 岁 · 叠高小塔，触达金线', 'deep', 'grid'),
  5: cinematic('🧩', '5 岁 · 旋转拼回萤光故事页', 'sky', 'sparkle'),
  6: cinematic('🎒', '6 岁 · 入学前把桌面三消收干净', 'teal', 'grid'),
  7: cinematic('🔢', '7 岁 · 滑动合并，合出 512', 'deep', 'grid'),
  8: cinematic('🗼', '8 岁 · 课后移塔：三盘再四盘', 'teal', 'rings'),
  9: cinematic('📘', '9 岁 · 心算冲刺后再比大小', 'sky', 'waves'),
  10: cinematic('💡', '10 岁 · 翻转熄灯，解开房间谜题', 'aurora', 'sparkle'),
  11: cinematic('🔎', '11 岁 · 限时找出隐藏的 3、5、6', 'deep', 'dots'),
  12: cinematic('🤝', '12 岁 · 记住同桌：4×4 再到 6×6', 'teal', 'grid'),
  13: cinematic('🌉', '13 岁 · 先过河，再折线逃生', 'sky', 'waves'),
  14: cinematic('⚡', '14 岁 · 灯亮就点，反应三连加速', 'deep', 'rings'),
  15: cinematic('🃏', '15 岁 · 社团赛：四则运算凑 24', 'deep', 'rings'),
  16: cinematic('🎨', '16 岁 · 抗干扰：看清问的是哪一项', 'teal', 'waves'),
  17: cinematic('🕵️', '17 岁 · 调查听真话，指认抓坏人', 'sky', 'dots'),
  18: cinematic('🔐', '18 岁 · 用 AB 推理拧开门锁', 'deep', 'rings'),
  19: cinematic('🏗', '19 岁 · 对齐落块，把楼叠得更高', 'aurora', 'grid'),
  20: cinematic('🐑', '20 岁 · 夜话：谐音梗 + emoji 成语', 'aurora', 'dots'),
  21: cinematic('🔢', '21 岁 · 夜灯数独，两题复位大脑', 'teal', 'grid'),
  22: cinematic('🎬', '22 岁 · 试镜：记住顺序再复现', 'sky', 'sparkle'),
  23: cinematic('🎨', '23 岁 · 分毫色差，六轮眼力挑战', 'aurora', 'dots'),
  24: cinematic('🕯️', '24 岁 · 插满二十四烛，生日快乐', 'sky', 'sparkle')
};

export const getLevelStartTheme = (levelId: number): LevelStartTheme =>
  LEVEL_START_THEMES[levelId] ?? LEVEL_START_THEMES[1];

export const parseRuleLine = (line: string): { icon: string; text: string } => {
  const trimmed = line.trim();
  const space = trimmed.indexOf(' ');
  if (space <= 0) return { icon: '•', text: trimmed };
  return { icon: trimmed.slice(0, space), text: trimmed.slice(space + 1) };
};
