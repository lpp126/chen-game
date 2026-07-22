/** 迷宫图：grid 节点 + edges 连接（先数据后绘制） */

export type Dir = 'up' | 'down' | 'left' | 'right';

export type GridNode = {
  /** 格子坐标 */
  gx: number;
  gy: number;
  /** 画布中心像素 */
  x: number;
  y: number;
};

/** 有向边：从 (gx,gy) 沿 direction 连到邻格 */
export type MazeEdge = {
  id: string;
  gx: number;
  gy: number;
  direction: Dir;
  /** 是否已被抽取 */
  removed: boolean;
  /** 额外环边：可随时抽取，不参与叶边约束 */
  isLoop?: boolean;
};

export type MazeDifficulty = 'easy' | 'normal' | 'hard';

export type MazeConfig = {
  cols: number;
  rows: number;
  /** 画布宽高 */
  width: number;
  height: number;
  /** 边距，起终点贴边 */
  padding: number;
  lineWidth: number;
  difficulty: MazeDifficulty;
  /** 额外加边比例（制造少量环，增加交汇）0~1 */
  loopRatio: number;
  seed?: number;
};

export type MazeGraph = {
  cols: number;
  rows: number;
  width: number;
  height: number;
  padding: number;
  cell: number;
  lineWidth: number;
  difficulty: MazeDifficulty;
  /** grid[gy][gx] */
  grid: GridNode[][];
  edges: MazeEdge[];
  start: { gx: number; gy: number };
  end: { gx: number; gy: number };
};

export const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  left: { dx: -1, dy: 0 },
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 }
};

export const OPPOSITE: Record<Dir, Dir> = {
  right: 'left',
  left: 'right',
  down: 'up',
  up: 'down'
};

export const keyOf = (gx: number, gy: number) => `${gx},${gy}`;

export const neighbor = (gx: number, gy: number, dir: Dir) => {
  const { dx, dy } = DIR_DELTA[dir];
  return { gx: gx + dx, gy: gy + dy };
};
