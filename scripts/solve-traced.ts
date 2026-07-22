/**
 * 校验/求解从参考图描出的折线关卡
 */
import fs from 'fs';
import { LinePhysicsEngine, type PolylineDef } from '../src/game/linePhysics/engine';

const data = JSON.parse(fs.readFileSync('scripts/traced-stage.json', 'utf8')) as {
  width: number;
  height: number;
  lines: PolylineDef[];
};

const fixDir = (lines: PolylineDef[]): PolylineDef[] =>
  lines.map((l) => {
    const pts = l.points;
    if (pts.length < 2) return l;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dir: PolylineDef['dir'] = l.dir;
    if (Math.abs(dx) >= Math.abs(dy)) dir = dx >= 0 ? 'right' : 'left';
    else dir = dy >= 0 ? 'down' : 'up';
    return { ...l, dir };
  });

const lines = fixDir(data.lines);

const makeEng = (ids: Set<string>) => {
  const eng = new LinePhysicsEngine({
    bounds: { x: 0, y: 0, w: data.width, h: data.height },
    boundsMargin: 40,
    speed: 400
  });
  eng.load(lines.filter((l) => ids.has(l.id)));
  return eng;
};

const freeOf = (ids: Set<string>) => {
  const eng = makeEng(ids);
  return [...ids].filter((id) => eng.canEscape(id));
};

/** 带回溯的求解（优先解锁度高的自由线） */
const solve = (rem: Set<string>, depth = 0): string[] | null => {
  if (rem.size === 0) return [];
  let free = freeOf(rem);
  if (!free.length) return null;

  // 评分：移走后新自由线数量
  const scored = free.map((id) => {
    const next = new Set(rem);
    next.delete(id);
    const nf = freeOf(next).length;
    return { id, nf };
  });
  scored.sort((a, b) => b.nf - a.nf || a.id.localeCompare(b.id));

  // 限制分支
  const tryIds = scored.slice(0, Math.min(6, scored.length)).map((s) => s.id);
  for (const id of tryIds) {
    const next = new Set(rem);
    next.delete(id);
    const rest = solve(next, depth + 1);
    if (rest) return [id, ...rest];
  }
  // 若剪枝失败，再试其余
  for (const { id } of scored.slice(6)) {
    const next = new Set(rem);
    next.delete(id);
    const rest = solve(next, depth + 1);
    if (rest) return [id, ...rest];
  }
  return null;
};

const all = new Set(lines.map((l) => l.id));
console.log('lines', lines.length, 'free0', freeOf(all).length, freeOf(all).slice(0, 12).join(','));

const t0 = Date.now();
const order = solve(all);
console.log('solve ms', Date.now() - t0, order ? `OK ${order.length}` : 'FAIL');

if (order) {
  const eng = makeEng(all);
  const ok = eng.verifyOrder(order);
  console.log('verify', ok);
  fs.writeFileSync(
    'scripts/traced-stage.json',
    JSON.stringify({ width: data.width, height: data.height, lines, solution: order, count: lines.length }, null, 2)
  );
}
