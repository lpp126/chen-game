/**
 * 错落互补折线生成：多种形状、长短不一，同种形状每关最多 2 次。
 * 逆向插入保证可通关。
 */
import fs from 'fs';
import path from 'path';
import {
  LinePhysicsEngine,
  type DirKey,
  type PolylineDef,
  type Vec2,
  normalizeDir,
  translatePoints,
  polylinesCollide,
  isOutsideBounds
} from '../src/game/linePhysics/engine';

const W = 670;
const H = 920;
const MARGIN = 40;
const NEAR = 4;
const GAP = 22; // 更紧的平行咬合间距

type ShapeKind =
  | 'spiral'
  | 'nestedU'
  | 'comb'
  | 'stair'
  | 'bigU'
  | 'hook'
  | 'zigzag'
  | 'snake'
  | 'longBar'
  | 'elbow'
  | 'C'
  | 'S'
  | 'stepU'
  | 'meander'
  | 'corner'
  | 'wedge'
  | 'rail'
  | 'nook';

type Shape = { id: string; dir: DirKey; points: Vec2[]; kind: ShapeKind };

const DIRS: DirKey[] = ['right', 'left', 'up', 'down'];

const within = (pts: Vec2[], pad = 8) =>
  pts.every((p) => p.x >= pad && p.x <= W - pad && p.y >= pad && p.y <= H - pad);

const noReverse = (pts: Vec2[]) => {
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const d1x = b.x - a.x;
    const d1y = b.y - a.y;
    const d2x = c.x - b.x;
    const d2y = c.y - b.y;
    if (Math.abs(d1x * d2y - d1y * d2x) < 1e-6 && d1x * d2x + d1y * d2y < 0) return false;
  }
  return true;
};

const lastDir = (pts: Vec2[]): DirKey | null => {
  if (pts.length < 2) return null;
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
};

const alignHead = (pts: Vec2[], dir: DirKey): Vec2[] => {
  const d = normalizeDir(dir);
  const out = pts.map((p) => ({ ...p }));
  const last = out[out.length - 1];
  const prev = out[out.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const ok =
    (d.x !== 0 && Math.sign(dx) === d.x && Math.abs(dy) < 1) ||
    (d.y !== 0 && Math.sign(dy) === d.y && Math.abs(dx) < 1);
  if (ok) out[out.length - 1] = { x: last.x + d.x * 30, y: last.y + d.y * 30 };
  else out.push({ x: last.x + d.x * 30, y: last.y + d.y * 30 });
  return out;
};

const canEscape = (shape: Shape, others: Shape[]) => {
  const dir = normalizeDir(shape.dir);
  let pts = shape.points.map((p) => ({ ...p }));
  for (let i = 0; i < 500; i += 1) {
    pts = translatePoints(pts, dir.x * 6, dir.y * 6);
    for (const o of others) if (polylinesCollide(pts, o.points, NEAR)) return false;
    if (isOutsideBounds(pts, { x: 0, y: 0, w: W, h: H }, MARGIN)) return true;
  }
  return false;
};

const collide = (a: Shape, b: Shape) => polylinesCollide(a.points, b.points, NEAR + 2);

const rotate90 = (pts: Vec2[], k: number): Vec2[] => {
  let out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < k; i += 1) {
    out = out.map((p) => ({ x: -p.y, y: p.x }));
  }
  return out;
};

const mirrorX = (pts: Vec2[]) => pts.map((p) => ({ x: -p.x, y: p.y }));
const mirrorY = (pts: Vec2[]) => pts.map((p) => ({ x: p.x, y: -p.y }));

const finalize = (raw: Vec2[], prefer?: DirKey[]): { points: Vec2[]; dir: DirKey } | null => {
  const variants: Vec2[][] = [raw, [...raw].reverse()];
  for (const v of variants) {
    if (v.length < 2 || !noReverse(v)) continue;
    const nat = lastDir(v);
    if (!nat) continue;
    const points = alignHead(v, nat);
    if (!within(points) || !noReverse(points)) continue;
    if (prefer && prefer.length && !prefer.includes(nat)) continue;
    return { points, dir: nat };
  }
  // 不强制 prefer
  for (const v of variants) {
    if (v.length < 2 || !noReverse(v)) continue;
    const nat = lastDir(v);
    if (!nat) continue;
    const points = alignHead(v, nat);
    if (!within(points) || !noReverse(points)) continue;
    return { points, dir: nat };
  }
  return null;
};

/** —— 形状库（相对坐标，原点附近） —— */
const mkSpiral = (s: number, loops: number): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  const dirs: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1]
  ];
  let di = 0;
  for (let i = 0; i < loops * 4; i += 1) {
    const seg = Math.floor(i / 2) + 1;
    const [dx, dy] = dirs[di % 4];
    x += dx * seg * s;
    y += dy * seg * s;
    pts.push({ x, y });
    di += 1;
  }
  return pts;
};

const mkNestedU = (w: number, h: number, layers: number): Vec2[] => {
  const pts: Vec2[] = [];
  let x = 0;
  let y = 0;
  pts.push({ x, y });
  for (let L = 0; L < layers; L += 1) {
    const ww = w - L * 36;
    const hh = h - L * 28;
    if (ww < 40 || hh < 40) break;
    y += hh;
    pts.push({ x, y });
    x += ww;
    pts.push({ x, y });
    y -= hh;
    pts.push({ x, y });
    if (L + 1 < layers) {
      x -= 28;
      pts.push({ x, y });
    }
  }
  return pts;
};

const mkComb = (teeth: number, pitch: number, depth: number): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 0; i < teeth; i += 1) {
    y += depth;
    pts.push({ x, y });
    x += pitch;
    pts.push({ x, y });
    y -= depth;
    pts.push({ x, y });
    if (i < teeth - 1) {
      x += Math.round(pitch * 0.35);
      pts.push({ x, y });
    }
  }
  return pts;
};

const mkStair = (steps: number, step: number): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 0; i < steps; i += 1) {
    x += step;
    pts.push({ x, y });
    y += step;
    pts.push({ x, y });
  }
  return pts;
};

const mkBigU = (w: number, h: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: 0, y: h },
  { x: w, y: h },
  { x: w, y: 0 }
];

const mkHook = (a: number, b: number, c: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: 0, y: a },
  { x: b, y: a },
  { x: b, y: a - c }
];

const mkZigzag = (n: number, w: number, h: number): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i += 1) {
    x += w;
    pts.push({ x, y });
    y += i % 2 === 0 ? h : -h;
    pts.push({ x, y });
  }
  return pts;
};

const mkSnake = (segs: Array<[number, number]>): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (const [dx, dy] of segs) {
    x += dx;
    y += dy;
    pts.push({ x, y });
  }
  return pts;
};

const mkLongBar = (len: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: len, y: 0 }
];

const mkElbow = (a: number, b: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: a, y: 0 },
  { x: a, y: b }
];

const mkC = (w: number, h: number, lip: number): Vec2[] => [
  { x: lip, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: h },
  { x: w, y: h },
  { x: w, y: h - lip }
];

const mkS = (w: number, h: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
  { x: 0, y: h * 2 },
  { x: w, y: h * 2 }
];

const mkStepU = (w: number, h: number, step: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: 0, y: h },
  { x: step, y: h },
  { x: step, y: h - step },
  { x: w, y: h - step },
  { x: w, y: 0 }
];

const mkCorner = (a: number, b: number, c: number): Vec2[] => [
  { x: 0, y: 0 },
  { x: a, y: 0 },
  { x: a, y: b },
  { x: a - c, y: b }
];

const mkMeander = (rows: number, w: number, pitch: number): Vec2[] => {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let r = 0; r < rows; r += 1) {
    x += r % 2 === 0 ? w : -w;
    pts.push({ x, y });
    if (r < rows - 1) {
      y += pitch;
      pts.push({ x, y });
    }
  }
  return pts;
};

type Tmpl = { kind: ShapeKind; raw: Vec2[] };

const buildCatalog = (): Tmpl[] => {
  const out: Tmpl[] = [];
  const add = (kind: ShapeKind, raw: Vec2[]) => {
    // 只保留少量朝向，加快搜索
    const bases = [raw, mirrorX(raw)];
    for (const b of bases) {
      out.push({ kind, raw: b });
      out.push({ kind, raw: rotate90(b, 1) });
      out.push({ kind, raw: rotate90(b, 2) });
    }
  };

  add('spiral', mkSpiral(22, 2));
  add('spiral', mkSpiral(18, 3));
  add('nestedU', mkNestedU(160, 140, 2));
  add('nestedU', mkNestedU(200, 170, 3));
  add('comb', mkComb(3, 32, 70));
  add('comb', mkComb(5, 26, 55));
  add('stair', mkStair(5, 28));
  add('stair', mkStair(7, 24));
  add('bigU', mkBigU(140, 180));
  add('bigU', mkBigU(200, 120));
  add('hook', mkHook(160, 120, 70));
  add('hook', mkHook(220, 90, 100));
  add('zigzag', mkZigzag(4, 50, 40));
  add('zigzag', mkZigzag(6, 38, 32));
  add(
    'snake',
    mkSnake([
      [80, 0],
      [0, 60],
      [100, 0],
      [0, -90],
      [70, 0],
      [0, 50]
    ])
  );
  add(
    'snake',
    mkSnake([
      [0, 120],
      [90, 0],
      [0, -70],
      [110, 0],
      [0, 100],
      [-60, 0]
    ])
  );
  add('longBar', mkLongBar(180));
  add('longBar', mkLongBar(260));
  add('elbow', mkElbow(150, 110));
  add('elbow', mkElbow(90, 180));
  add('C', mkC(150, 130, 50));
  add('C', mkC(190, 100, 40));
  add('S', mkS(110, 55));
  add('S', mkS(140, 70));
  add('stepU', mkStepU(180, 140, 40));
  add('stepU', mkStepU(150, 170, 50));
  add('corner', mkCorner(120, 100, 60));
  add('corner', mkCorner(160, 80, 90));
  add('corner', mkCorner(90, 70, 40)); // 小角块填缝
  add('meander', mkMeander(3, 160, 36));
  add('meander', mkMeander(4, 120, 32));
  add('elbow', mkElbow(70, 90)); // 短肘
  add('hook', mkHook(100, 80, 45));
  add('longBar', mkLongBar(120));
  add('zigzag', mkZigzag(3, 42, 28));
  // 填缝小形
  add('wedge', mkSnake([[60, 0], [0, 50], [40, 0]]));
  add('wedge', mkSnake([[0, 70], [55, 0], [0, -40]]));
  add('rail', mkSnake([[200, 0], [0, 28], [-140, 0]]));
  add('rail', mkSnake([[0, 180], [28, 0], [0, -120]]));
  add('nook', mkC(100, 80, 30));
  add('nook', mkStepU(110, 90, 28));
  return out;
};

const CATALOG = buildCatalog();

const segs = (pts: Vec2[]) => {
  const out: Array<{ a: Vec2; b: Vec2; horiz: boolean }> = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    out.push({ a, b, horiz: Math.abs(a.y - b.y) < 1e-6 });
  }
  return out;
};

/** 平行贴合分：强奖励咬合，弱惩罚空洞 */
const fitScore = (pts: Vec2[], others: Shape[]): number => {
  if (!others.length) {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return 800 - Math.min(...xs, ...ys, W - Math.max(...xs), H - Math.max(...ys));
  }
  let score = 0;
  let nestHits = 0;
  const A = segs(pts);
  for (const o of others) {
    const B = segs(o.points);
    for (const s of A) {
      for (const t of B) {
        if (s.horiz !== t.horiz) continue;
        if (s.horiz) {
          const dist = Math.abs(s.a.y - t.a.y);
          if (dist < GAP * 0.45 || dist > GAP * 1.55) continue;
          const lo = Math.max(Math.min(s.a.x, s.b.x), Math.min(t.a.x, t.b.x));
          const hi = Math.min(Math.max(s.a.x, s.b.x), Math.max(t.a.x, t.b.x));
          const overlap = hi - lo;
          if (overlap > 8) {
            score += overlap * (2.2 - Math.abs(dist - GAP) / GAP);
            nestHits += 1;
          }
        } else {
          const dist = Math.abs(s.a.x - t.a.x);
          if (dist < GAP * 0.45 || dist > GAP * 1.55) continue;
          const lo = Math.max(Math.min(s.a.y, s.b.y), Math.min(t.a.y, t.b.y));
          const hi = Math.min(Math.max(s.a.y, s.b.y), Math.max(t.a.y, t.b.y));
          const overlap = hi - lo;
          if (overlap > 8) {
            score += overlap * (2.2 - Math.abs(dist - GAP) / GAP);
            nestHits += 1;
          }
        }
      }
    }
  }
  // 靠近已有团块（更密），而不是故意散开
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let minDist = Infinity;
  for (const o of others) {
    for (const p of o.points) {
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < minDist) minDist = d;
    }
  }
  score += Math.max(0, 220 - minDist);
  score += nestHits * 80;
  if (nestHits === 0) score -= 120;
  score += pts.length * 2;
  return score;
};

/** 在已有线段旁生成候选锚点（平行偏移 GAP） */
const nestAnchors = (others: Shape[]): Array<{ x: number; y: number }> => {
  const out: Array<{ x: number; y: number }> = [];
  for (const o of others) {
    for (let i = 0; i < o.points.length - 1; i += 1) {
      const a = o.points[i];
      const b = o.points[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (Math.abs(a.y - b.y) < 1e-6) {
        out.push({ x: mx, y: my - GAP }, { x: mx, y: my + GAP });
        out.push({ x: a.x, y: a.y - GAP }, { x: b.x, y: b.y + GAP });
      } else {
        out.push({ x: mx - GAP, y: my }, { x: mx + GAP, y: my });
        out.push({ x: a.x - GAP, y: a.y }, { x: b.x + GAP, y: b.y });
      }
    }
  }
  return out.filter((p) => p.x > 12 && p.y > 12 && p.x < W - 12 && p.y < H - 12);
};

const placeOne = (
  id: string,
  kind: ShapeKind,
  others: Shape[],
  kindCount: Map<ShapeKind, number>
): Shape | null => {
  if ((kindCount.get(kind) ?? 0) >= 2) return null;
  const tmpls = CATALOG.filter((t) => t.kind === kind);
  if (!tmpls.length) return null;

  // 优先咬合锚点，再补不规则格点
  const cells: Array<{ x: number; y: number }> = [];
  if (others.length) {
    for (const a of nestAnchors(others)) {
      cells.push({ x: a.x - 40, y: a.y - 40 });
      cells.push({ x: a.x - 20, y: a.y - 10 });
      cells.push({ x: a.x, y: a.y });
    }
  }
  for (let x = 16; x < W - 36; x += 14 + ((x * 3) % 9)) {
    for (let y = 16; y < H - 36; y += 15 + ((y * 5) % 11)) {
      cells.push({ x, y });
    }
  }
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  // 有邻线时多采咬合区：前半偏锚点
  const sample = cells.slice(0, others.length === 0 ? 120 : 100);
  const tmplSample = [...tmpls].sort(() => Math.random() - 0.5).slice(0, Math.min(12, tmpls.length));

  type Cand = { shape: Shape; score: number };
  const cands: Cand[] = [];

  for (const cell of sample) {
    for (const t of tmplSample) {
      const xs = t.raw.map((p) => p.x);
      const ys = t.raw.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const shifted = t.raw.map((p) => ({ x: p.x - minX + cell.x, y: p.y - minY + cell.y }));
      const fin = finalize(shifted);
      if (!fin) continue;
      const shape: Shape = { id, dir: fin.dir, points: fin.points, kind };
      if (!within(shape.points)) continue;
      if (others.some((o) => collide(shape, o))) continue;
      if (!canEscape(shape, others)) continue;
      cands.push({ shape, score: fitScore(shape.points, others) });
      if (cands.length >= 24) break;
    }
    if (cands.length >= 24) break;
  }

  // 要求后半段尽量有咬合
  if (cands.length) {
    const nested = cands.filter((c) => fitScore(c.shape.points, others) > (others.length ? 80 : 0));
    const pool = nested.length >= 3 ? nested : cands;
    pool.sort((a, b) => b.score - a.score);
    const top = pool.slice(0, Math.min(6, pool.length));
    return top[Math.floor(Math.random() * Math.min(3, top.length))].shape;
  }
  return null;
};

const ALL_KINDS: ShapeKind[] = [
  'spiral',
  'nestedU',
  'comb',
  'stair',
  'bigU',
  'hook',
  'zigzag',
  'snake',
  'longBar',
  'elbow',
  'C',
  'S',
  'stepU',
  'meander',
  'corner',
  'wedge',
  'rail',
  'nook'
];

const build = (target: number, allowSpiral: boolean) => {
  const placed: Shape[] = [];
  const kindCount = new Map<ShapeKind, number>();
  const pool = ALL_KINDS.filter((k) => allowSpiral || k !== 'spiral');

  // 打乱种类顺序，保证多样性优先
  const order = [...pool].sort(() => Math.random() - 0.5);

  let guard = 0;
  while (placed.length < target && guard < target * 20) {
    guard += 1;
    // 优先还没用过的种类，其次只用过 1 次的
    const unused = order.filter((k) => (kindCount.get(k) ?? 0) === 0);
    const once = order.filter((k) => (kindCount.get(k) ?? 0) === 1);
    const pickPool = unused.length ? unused : once.length ? once : [];
    if (!pickPool.length) break;

    // 交错长短：按已放数量交替偏好“大”种类
    const preferLong = placed.length % 3 !== 1;
    const longish: ShapeKind[] = ['spiral', 'nestedU', 'comb', 'snake', 'meander', 'zigzag', 'stair'];
    const shortish: ShapeKind[] = ['elbow', 'corner', 'longBar', 'hook', 'C', 'bigU', 'S', 'stepU', 'wedge', 'rail', 'nook'];
    const prefer = preferLong ? longish : shortish;
    const ranked = [...pickPool].sort((a, b) => {
      const as = prefer.includes(a) ? 0 : 1;
      const bs = prefer.includes(b) ? 0 : 1;
      return as - bs;
    });

    let got: Shape | null = null;
    for (const kind of ranked.slice(0, 6)) {
      got = placeOne(`L${placed.length}`, kind, placed, kindCount);
      if (got) break;
    }
    // 再试其余
    if (!got) {
      for (const kind of ranked.slice(6)) {
        got = placeOne(`L${placed.length}`, kind, placed, kindCount);
        if (got) break;
      }
    }
    if (!got) continue;
    placed.push(got);
    kindCount.set(got.kind, (kindCount.get(got.kind) ?? 0) + 1);
  }

  if (placed.length < Math.floor(target * 0.75)) throw new Error(`few ${placed.length}`);

  const solution = placed.map((p) => p.id).reverse();
  const eng = new LinePhysicsEngine({
    bounds: { x: 0, y: 0, w: W, h: H },
    boundsMargin: MARGIN,
    speed: 400
  });
  eng.load(placed);
  if (!eng.verifyOrder(solution)) throw new Error('unsolvable');

  const kinds: Record<string, number> = {};
  for (const p of placed) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;

  return {
    width: W,
    height: H,
    solution,
    kinds,
    lines: placed.map((l) => ({
      id: l.id,
      dir: l.dir,
      points: l.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
    })) as PolylineDef[]
  };
};

let s3: ReturnType<typeof build> | null = null;
let s4: ReturnType<typeof build> | null = null;

for (let a = 0; a < 40; a += 1) {
  try {
    if (!s3) s3 = build(18, false);
  } catch {
    /* */
  }
  try {
    if (!s4) s4 = build(30, true);
  } catch {
    /* */
  }
  if (s3 && s4) break;
}

// 第4关若不足 28，再补一轮填缝
if (s4 && s4.lines.length < 28) {
  for (let a = 0; a < 25; a += 1) {
    try {
      const denser = build(30, true);
      if (denser.lines.length > s4.lines.length) s4 = denser;
      if (s4.lines.length >= 28) break;
    } catch {
      /* */
    }
  }
}

if (!s3 || !s4) {
  console.error('fail', { s3: !!s3, s4: !!s4 });
  process.exit(1);
}

const out = {
  stage3: { id: 3, name: '密折', ...s3 },
  stage4: { id: 4, name: '迷阵', ...s4 }
};
fs.writeFileSync(path.join(process.cwd(), 'scripts', 'gen-stages.json'), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify({
    ok: true,
    s3: s3.lines.length,
    s4: s4.lines.length,
    kinds3: s3.kinds,
    kinds4: s4.kinds,
    max3: Math.max(...Object.values(s3.kinds)),
    max4: Math.max(...Object.values(s4.kinds))
  })
);
