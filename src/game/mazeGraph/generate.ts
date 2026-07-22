/**
 * 随机 DFS 生成生成树迷宫，再定向箭头指向终点。
 * 只产出 grid + edges，不负责绘制。
 */
import {
  type Dir,
  type GridNode,
  type MazeConfig,
  type MazeEdge,
  type MazeGraph,
  DIR_DELTA,
  OPPOSITE,
  keyOf,
  neighbor
} from './types';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/** 可复现的简易 PRNG */
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T,>(arr: T[], rnd: () => number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const inBounds = (gx: number, gy: number, cols: number, rows: number) =>
  gx >= 0 && gy >= 0 && gx < cols && gy < rows;

/** 构建像素网格 */
const buildGrid = (cols: number, rows: number, width: number, height: number, padding: number) => {
  const cell = Math.min((width - padding * 2) / (cols - 1 || 1), (height - padding * 2) / (rows - 1 || 1));
  const ox = (width - cell * (cols - 1)) / 2;
  const oy = (height - cell * (rows - 1)) / 2;
  const grid: GridNode[][] = [];
  for (let gy = 0; gy < rows; gy += 1) {
    const row: GridNode[] = [];
    for (let gx = 0; gx < cols; gx += 1) {
      row.push({ gx, gy, x: ox + gx * cell, y: oy + gy * cell });
    }
    grid.push(row);
  }
  return { grid, cell };
};

/**
 * 随机 DFS 生成无向生成树边（存为 from→to 的 dir）。
 * 每个已访问格只连一次，天然有分叉与死胡同。
 */
const dfsSpanningTree = (
  cols: number,
  rows: number,
  start: { gx: number; gy: number },
  rnd: () => number
): Array<{ gx: number; gy: number; direction: Dir }> => {
  const visited = new Set<string>();
  const undirected: Array<{ gx: number; gy: number; direction: Dir }> = [];
  const stack: Array<{ gx: number; gy: number }> = [start];
  visited.add(keyOf(start.gx, start.gy));

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = shuffle(
      DIRS.filter((d) => {
        const n = neighbor(cur.gx, cur.gy, d);
        return inBounds(n.gx, n.gy, cols, rows) && !visited.has(keyOf(n.gx, n.gy));
      }),
      rnd
    );
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const dir = opts[0];
    const n = neighbor(cur.gx, cur.gy, dir);
    visited.add(keyOf(n.gx, n.gy));
    undirected.push({ gx: cur.gx, gy: cur.gy, direction: dir });
    stack.push(n);
  }
  return undirected;
};

/** 再随机加少量环边，增加交汇感（不破坏连通） */
const pickLoops = (
  cols: number,
  rows: number,
  tree: Array<{ gx: number; gy: number; direction: Dir }>,
  ratio: number,
  rnd: () => number
) => {
  if (ratio <= 0) return [] as Array<{ gx: number; gy: number; direction: Dir }>;
  const has = new Set<string>();
  const edgeKey = (gx: number, gy: number, dir: Dir) => {
    const n = neighbor(gx, gy, dir);
    const a = keyOf(gx, gy);
    const b = keyOf(n.gx, n.gy);
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };
  for (const e of tree) has.add(edgeKey(e.gx, e.gy, e.direction));

  const candidates: Array<{ gx: number; gy: number; direction: Dir }> = [];
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      for (const dir of ['right', 'down'] as Dir[]) {
        const n = neighbor(gx, gy, dir);
        if (!inBounds(n.gx, n.gy, cols, rows)) continue;
        const k = edgeKey(gx, gy, dir);
        if (!has.has(k)) candidates.push({ gx, gy, direction: dir });
      }
    }
  }
  const nAdd = Math.floor(candidates.length * ratio);
  return shuffle(candidates, rnd).slice(0, nAdd);
};

/**
 * 以终点为根 BFS，把生成树边定向为「子 → 父」（箭头朝终点）。
 * 环边单独标记 isLoop，可随时抽取。
 */
const orientTowardEnd = (
  cols: number,
  rows: number,
  treeEdges: Array<{ gx: number; gy: number; direction: Dir }>,
  loopEdges: Array<{ gx: number; gy: number; direction: Dir }>,
  end: { gx: number; gy: number }
): MazeEdge[] => {
  const adj = new Map<string, Array<{ to: string; dir: Dir }>>();
  const addAdj = (gx: number, gy: number, dir: Dir) => {
    const n = neighbor(gx, gy, dir);
    const a = keyOf(gx, gy);
    const b = keyOf(n.gx, n.gy);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, dir });
    adj.get(b)!.push({ to: a, dir: OPPOSITE[dir] });
  };
  for (const e of treeEdges) addAdj(e.gx, e.gy, e.direction);

  const parent = new Map<string, string | null>();
  const q = [keyOf(end.gx, end.gy)];
  parent.set(q[0], null);
  while (q.length) {
    const cur = q.shift()!;
    for (const link of adj.get(cur) ?? []) {
      if (parent.has(link.to)) continue;
      parent.set(link.to, cur);
      q.push(link.to);
    }
  }

  const edges: MazeEdge[] = [];
  let id = 0;
  const pushOriented = (e: { gx: number; gy: number; direction: Dir }, isLoop: boolean) => {
    const a = keyOf(e.gx, e.gy);
    const n = neighbor(e.gx, e.gy, e.direction);
    const b = keyOf(n.gx, n.gy);
    if (!isLoop) {
      if (parent.get(a) === b) {
        edges.push({ id: `E${id++}`, gx: e.gx, gy: e.gy, direction: e.direction, removed: false });
      } else if (parent.get(b) === a) {
        edges.push({
          id: `E${id++}`,
          gx: n.gx,
          gy: n.gy,
          direction: OPPOSITE[e.direction],
          removed: false
        });
      } else {
        edges.push({ id: `E${id++}`, gx: e.gx, gy: e.gy, direction: e.direction, removed: false });
      }
    } else {
      // 环边：尽量朝终点（若一端是另一端祖先）
      if (parent.get(a) === b) {
        edges.push({
          id: `E${id++}`,
          gx: e.gx,
          gy: e.gy,
          direction: e.direction,
          removed: false,
          isLoop: true
        });
      } else if (parent.get(b) === a) {
        edges.push({
          id: `E${id++}`,
          gx: n.gx,
          gy: n.gy,
          direction: OPPOSITE[e.direction],
          removed: false,
          isLoop: true
        });
      } else {
        edges.push({
          id: `E${id++}`,
          gx: e.gx,
          gy: e.gy,
          direction: e.direction,
          removed: false,
          isLoop: true
        });
      }
    }
  };

  for (const e of treeEdges) pushOriented(e, false);
  for (const e of loopEdges) pushOriented(e, true);
  return edges;
};

export const generateMaze = (cfg: MazeConfig): MazeGraph => {
  const rnd = mulberry32(cfg.seed ?? (Date.now() % 1e9));
  const { grid, cell } = buildGrid(cfg.cols, cfg.rows, cfg.width, cfg.height, cfg.padding);

  // 起点靠左缘中部，终点靠右缘中部（留出边缘）
  const start = { gx: 0, gy: Math.floor(cfg.rows / 2) };
  const end = { gx: cfg.cols - 1, gy: Math.floor(cfg.rows / 2) };

  const tree = dfsSpanningTree(cfg.cols, cfg.rows, start, rnd);
  const loops = pickLoops(cfg.cols, cfg.rows, tree, cfg.loopRatio, rnd);
  const edges = orientTowardEnd(cfg.cols, cfg.rows, tree, loops, end);

  return {
    cols: cfg.cols,
    rows: cfg.rows,
    width: cfg.width,
    height: cfg.height,
    padding: cfg.padding,
    cell,
    lineWidth: cfg.lineWidth,
    difficulty: cfg.difficulty,
    grid,
    edges,
    start,
    end
  };
};

export const edgeEndpoints = (graph: MazeGraph, edge: MazeEdge) => {
  const from = graph.grid[edge.gy][edge.gx];
  const { dx, dy } = DIR_DELTA[edge.direction];
  const to = graph.grid[edge.gy + dy][edge.gx + dx];
  return { from, to };
};
