/**
 * 迷宫抽线引擎：只能抽取「当前叶边」（尾端度数为 1），
 * 沿箭头滑向终点方向并移除。
 */
import { edgeEndpoints } from './generate';
import { type Dir, type MazeEdge, type MazeGraph, DIR_DELTA, keyOf, neighbor } from './types';

export type ExtractAnim = {
  edgeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** 0..1 */
  t: number;
  dir: Dir;
};

export type MazeEvent =
  | { type: 'extracted'; id: string; remain: number }
  | { type: 'bounce'; id: string }
  | { type: 'win' };

type Listener = (e: MazeEvent) => void;

export class MazeExtractEngine {
  graph: MazeGraph;
  anim: ExtractAnim | null = null;
  private listeners: Listener[] = [];
  private speed = 520;

  constructor(graph: MazeGraph) {
    this.graph = graph;
  }

  on(fn: Listener) {
    this.listeners.push(fn);
  }

  private emit(e: MazeEvent) {
    for (const fn of this.listeners) fn(e);
  }

  activeEdges(): MazeEdge[] {
    return this.graph.edges.filter((e) => !e.removed);
  }

  remainCount() {
    return this.activeEdges().length;
  }

  /** 每个节点在剩余图中的度数 */
  private degrees(): Map<string, number> {
    const deg = new Map<string, number>();
    const bump = (k: string) => deg.set(k, (deg.get(k) ?? 0) + 1);
    for (const e of this.activeEdges()) {
      bump(keyOf(e.gx, e.gy));
      const n = neighbor(e.gx, e.gy, e.direction);
      bump(keyOf(n.gx, n.gy));
    }
    return deg;
  }

  /**
   * 可抽取：环边随时可抽；或边的箭头尾端在剩余图中度数为 1（叶边）。
   */
  isExtractable(edge: MazeEdge): boolean {
    if (edge.removed || this.anim) return false;
    if (edge.isLoop) return true;
    const deg = this.degrees();
    const tail = keyOf(edge.gx, edge.gy);
    return (deg.get(tail) ?? 0) === 1;
  }

  hitTest(px: number, py: number, threshold?: number): MazeEdge | null {
    const th = threshold ?? Math.max(14, this.graph.lineWidth * 1.6);
    const th2 = th * th;
    let best: MazeEdge | null = null;
    let bestD = th2;
    for (const e of this.activeEdges()) {
      const { from, to } = edgeEndpoints(this.graph, e);
      const d = distPointSeg2(px, py, from.x, from.y, to.x, to.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  tryExtract(edgeId: string): boolean {
    if (this.anim) return false;
    const edge = this.graph.edges.find((e) => e.id === edgeId);
    if (!edge || edge.removed) return false;
    if (!this.isExtractable(edge)) {
      this.emit({ type: 'bounce', id: edgeId });
      return false;
    }
    const { from, to } = edgeEndpoints(this.graph, edge);
    this.anim = {
      edgeId: edge.id,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      t: 0,
      dir: edge.direction
    };
    return true;
  }

  tryExtractAt(px: number, py: number): boolean {
    const hit = this.hitTest(px, py);
    if (!hit) return false;
    return this.tryExtract(hit.id);
  }

  update(dt: number) {
    if (!this.anim) return;
    const { cell } = this.graph;
    const dur = Math.max(0.12, (cell * 0.9) / this.speed);
    this.anim.t += dt / dur;
    if (this.anim.t >= 1) {
      const id = this.anim.edgeId;
      const edge = this.graph.edges.find((e) => e.id === id);
      if (edge) edge.removed = true;
      this.anim = null;
      const remain = this.remainCount();
      this.emit({ type: 'extracted', id, remain });
      if (remain === 0) this.emit({ type: 'win' });
    }
  }

  /** 动画中线段的当前端点（尾端沿箭头滑向头） */
  animSegment(): { x1: number; y1: number; x2: number; y2: number; dir: Dir } | null {
    if (!this.anim) return null;
    const a = this.anim;
    const t = Math.min(1, a.t);
    // 尾端移向箭头头，线段缩短
    const x1 = a.fromX + (a.toX - a.fromX) * t;
    const y1 = a.fromY + (a.toY - a.fromY) * t;
    return { x1, y1, x2: a.toX, y2: a.toY, dir: a.dir };
  }
}

const distPointSeg2 = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
};

export { DIR_DELTA };
