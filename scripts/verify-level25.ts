import { LinePhysicsEngine } from '../src/game/linePhysics/engine';
import { LEVEL25_STAGES } from '../src/data/level25Stages';

const assertSimpleChain = (id: string, points: { x: number; y: number }[]) => {
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const d1x = b.x - a.x;
    const d1y = b.y - a.y;
    const d2x = c.x - b.x;
    const d2y = c.y - b.y;
    if (Math.abs(d1x * d2y - d1y * d2x) < 1e-6 && d1x * d2x + d1y * d2y < 0) {
      throw new Error(`line ${id}: 180° reverse`);
    }
  }
};

for (const stage of LEVEL25_STAGES) {
  for (const line of stage.lines) assertSimpleChain(line.id, line.points);
  const eng = new LinePhysicsEngine({
    bounds: { x: 0, y: 0, w: stage.width, h: stage.height },
    boundsMargin: 40
  });
  eng.load(stage.lines);
  const ok = eng.verifyOrder(stage.solution);
  console.log(
    `stage ${stage.id} ${stage.name}: ${ok ? 'OK' : 'FAIL'} lines=${stage.lines.length} order=${stage.solution.join('>')}`
  );
}
