/** 2D 折线物理引擎 — 纯逻辑，无 UI 依赖 */

export type Vec2 = { x: number; y: number };

export type LineState = 'idle' | 'moving' | 'bounce';

export type DirKey = 'up' | 'down' | 'left' | 'right' | number;

export type PolylineDef = {
  id: string;
  /** 折线顶点（至少 2 点）；默认末点为箭头线头 */
  points: Vec2[];
  /** 全局前进方向：方位键或角度（度，0=右，逆时针） */
  dir: DirKey;
  /** 箭头在哪一端：'end'=末点（默认），'start'=首点 */
  head?: 'start' | 'end';
};

export type Polyline = {
  id: string;
  points: Vec2[];
  dir: Vec2;
  head: 'start' | 'end';
  state: LineState;
  /** 开始移动时的快照，碰撞回弹还原 */
  snapshot: Vec2[] | null;
  bounceT: number;
};

export type EngineConfig = {
  speed?: number;
  hitThreshold?: number;
  bounceDuration?: number;
  /** 离场判定边距（超出此矩形视为移出） */
  bounds?: { x: number; y: number; w: number; h: number };
  boundsMargin?: number;
};

const DIR_MAP: Record<string, Vec2> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 }
};

export const normalizeDir = (dir: DirKey): Vec2 => {
  if (typeof dir === 'number') {
    const rad = (dir * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }
  return { ...(DIR_MAP[dir] ?? DIR_MAP.right) };
};

export const clonePoints = (pts: Vec2[]): Vec2[] => pts.map((p) => ({ x: p.x, y: p.y }));

const dist2 = (a: Vec2, b: Vec2) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

/** 点到线段最短距离平方 */
export const distPointSeg2 = (p: Vec2, a: Vec2, b: Vec2): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) return dist2(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * abx;
  const qy = a.y + t * aby;
  return (p.x - qx) * (p.x - qx) + (p.y - qy) * (p.y - qy);
};

const orient = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const onSeg = (a: Vec2, b: Vec2, c: Vec2) =>
  Math.min(a.x, b.x) - 1e-6 <= c.x &&
  c.x <= Math.max(a.x, b.x) + 1e-6 &&
  Math.min(a.y, b.y) - 1e-6 <= c.y &&
  c.y <= Math.max(a.y, b.y) + 1e-6;

/** 两线段是否相交（含端点相接） */
export const segmentsIntersect = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean => {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 1e-6 && onSeg(a, b, c)) return true;
  if (Math.abs(o2) < 1e-6 && onSeg(a, b, d)) return true;
  if (Math.abs(o3) < 1e-6 && onSeg(c, d, a)) return true;
  if (Math.abs(o4) < 1e-6 && onSeg(c, d, b)) return true;
  return false;
};

/** 两折线是否碰撞（任一分段相交；近距也算撞） */
export const polylinesCollide = (a: Vec2[], b: Vec2[], near = 6): boolean => {
  const near2 = near * near;
  for (let i = 0; i < a.length - 1; i += 1) {
    for (let j = 0; j < b.length - 1; j += 1) {
      if (segmentsIntersect(a[i], a[i + 1], b[j], b[j + 1])) return true;
      if (distPointSeg2(a[i], b[j], b[j + 1]) < near2) return true;
      if (distPointSeg2(a[i + 1], b[j], b[j + 1]) < near2) return true;
      if (distPointSeg2(b[j], a[i], a[i + 1]) < near2) return true;
      if (distPointSeg2(b[j + 1], a[i], a[i + 1]) < near2) return true;
    }
  }
  return false;
};

export const hitTestPolyline = (p: Vec2, points: Vec2[], threshold: number): boolean => {
  const th2 = threshold * threshold;
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distPointSeg2(p, points[i], points[i + 1]) <= th2) return true;
  }
  return false;
};

export const translatePoints = (points: Vec2[], dx: number, dy: number): Vec2[] =>
  points.map((p) => ({ x: p.x + dx, y: p.y + dy }));

export const isOutsideBounds = (
  points: Vec2[],
  bounds: { x: number; y: number; w: number; h: number },
  margin: number
): boolean => {
  const left = bounds.x - margin;
  const top = bounds.y - margin;
  const right = bounds.x + bounds.w + margin;
  const bottom = bounds.y + bounds.h + margin;
  return points.every((p) => p.x < left || p.x > right || p.y < top || p.y > bottom);
};

export type EngineEvent =
  | { type: 'cleared'; id: string }
  | { type: 'bounce'; id: string }
  | { type: 'win' };

/**
 * 折线物理世界：点击命中 → 沿箭头匀速平移 → 与其它折线碰撞则红闪回弹
 */
export class LinePhysicsEngine {
  lines: Polyline[] = [];
  speed: number;
  hitThreshold: number;
  bounceDuration: number;
  bounds: { x: number; y: number; w: number; h: number };
  boundsMargin: number;
  movingId: string | null = null;
  private listeners: Array<(e: EngineEvent) => void> = [];

  constructor(cfg: EngineConfig = {}) {
    this.speed = cfg.speed ?? 220;
    this.hitThreshold = cfg.hitThreshold ?? 18;
    this.bounceDuration = cfg.bounceDuration ?? 0.45;
    this.bounds = cfg.bounds ?? { x: 0, y: 0, w: 750, h: 900 };
    this.boundsMargin = cfg.boundsMargin ?? 40;
  }

  on(fn: (e: EngineEvent) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private emit(e: EngineEvent) {
    this.listeners.forEach((f) => f(e));
  }

  load(defs: PolylineDef[]) {
    this.movingId = null;
    this.lines = defs.map((d) => ({
      id: d.id,
      points: clonePoints(d.points),
      dir: normalizeDir(d.dir),
      head: d.head ?? 'end',
      state: 'idle' as LineState,
      snapshot: null,
      bounceT: 0
    }));
  }

  /** 点击检测：返回命中的折线 id（优先上层/后声明） */
  hitTest(x: number, y: number): string | null {
    const p = { x, y };
    for (let i = this.lines.length - 1; i >= 0; i -= 1) {
      const line = this.lines[i];
      if (line.state !== 'idle') continue;
      if (hitTestPolyline(p, line.points, this.hitThreshold)) return line.id;
    }
    return null;
  }

  /** 启动匀速平移；已有移动中则忽略 */
  startMove(id: string): boolean {
    if (this.movingId) return false;
    const line = this.lines.find((l) => l.id === id);
    if (!line || line.state !== 'idle') return false;
    line.snapshot = clonePoints(line.points);
    line.state = 'moving';
    this.movingId = id;
    return true;
  }

  /** 点击即移动：命中则开移 */
  pointerDown(x: number, y: number): string | null {
    const id = this.hitTest(x, y);
    if (!id) return null;
    return this.startMove(id) ? id : null;
  }

  private restoreBounce(line: Polyline) {
    if (line.snapshot) line.points = clonePoints(line.snapshot);
    line.snapshot = null;
    line.state = 'bounce';
    line.bounceT = this.bounceDuration;
    this.movingId = null;
    this.emit({ type: 'bounce', id: line.id });
  }

  /**
   * 每帧推进
   * @param dt 秒
   */
  update(dt: number) {
    const clamped = Math.min(0.05, Math.max(0, dt));

    for (const line of this.lines) {
      if (line.state === 'bounce') {
        line.bounceT -= clamped;
        if (line.bounceT <= 0) {
          line.bounceT = 0;
          line.state = 'idle';
        }
      }
    }

    if (!this.movingId) return;
    const mover = this.lines.find((l) => l.id === this.movingId);
    if (!mover || mover.state !== 'moving') {
      this.movingId = null;
      return;
    }

    const step = this.speed * clamped;
    const next = translatePoints(mover.points, mover.dir.x * step, mover.dir.y * step);

    const others = this.lines.filter((l) => l.id !== mover.id);
    let hit = false;
    for (const o of others) {
      if (polylinesCollide(next, o.points, 4)) {
        hit = true;
        break;
      }
    }

    if (hit) {
      this.restoreBounce(mover);
      return;
    }

    mover.points = next;

    if (isOutsideBounds(mover.points, this.bounds, this.boundsMargin)) {
      const clearedId = mover.id;
      this.lines = this.lines.filter((l) => l.id !== clearedId);
      this.movingId = null;
      this.emit({ type: 'cleared', id: clearedId });
      if (this.lines.length === 0) this.emit({ type: 'win' });
    }
  }

  /** 箭头画在线头，朝向与相连末段一致（非全局平移方向） */
  arrowMeta(line: Polyline): { head: Vec2; dir: Vec2 } {
    const pts = line.points;
    if (pts.length < 2) return { head: pts[0] ?? { x: 0, y: 0 }, dir: line.dir };

    let head: Vec2;
    let from: Vec2;
    if (line.head === 'start') {
      head = pts[0];
      from = pts[1];
    } else {
      head = pts[pts.length - 1];
      from = pts[pts.length - 2];
    }
    const dx = head.x - from.x;
    const dy = head.y - from.y;
    const len = Math.hypot(dx, dy);
    const dir = len < 1e-6 ? { ...line.dir } : { x: dx / len, y: dy / len };
    return { head, dir };
  }

  /**
   * 判定某条线在当前局面下沿箭头方向能否一路滑出（无碰撞）。
   * 用于关卡校验 / 提示。
   */
  canEscape(id: string, step = 4, maxSteps = 500): boolean {
    const line = this.lines.find((l) => l.id === id);
    if (!line) return false;
    let pts = clonePoints(line.points);
    const others = this.lines.filter((l) => l.id !== id).map((l) => l.points);
    for (let i = 0; i < maxSteps; i += 1) {
      pts = translatePoints(pts, line.dir.x * step, line.dir.y * step);
      for (const o of others) {
        if (polylinesCollide(pts, o, 4)) return false;
      }
      if (isOutsideBounds(pts, this.bounds, this.boundsMargin)) return true;
    }
    return false;
  }

  /** 按给定顺序模拟清关，全部成功返回 true */
  verifyOrder(order: string[], step = 4): boolean {
    const backup = this.lines.map((l) => ({
      id: l.id,
      points: clonePoints(l.points),
      dir: { ...l.dir },
      head: l.head,
      state: l.state,
      snapshot: null as Vec2[] | null,
      bounceT: 0
    }));
    try {
      for (const id of order) {
        if (!this.canEscape(id, step)) return false;
        this.lines = this.lines.filter((l) => l.id !== id);
      }
      return this.lines.length === 0;
    } finally {
      this.lines = backup;
      this.movingId = null;
    }
  }
}
