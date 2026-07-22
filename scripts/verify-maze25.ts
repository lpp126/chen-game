import { generateMaze } from '../src/game/mazeGraph/generate';
import { MazeExtractEngine } from '../src/game/mazeGraph/engine';
import { LEVEL25_MAZE_STAGES } from '../src/data/level25MazeStages';

for (const cfg of LEVEL25_MAZE_STAGES) {
  const g = generateMaze(cfg);
  const eng = new MazeExtractEngine(g);
  let steps = 0;
  const max = g.edges.length + 5;
  while (eng.remainCount() > 0 && steps < max) {
    const leaf = eng.activeEdges().find((e) => eng.isExtractable(e));
    if (!leaf) {
      console.error('stuck', cfg.name, 'remain', eng.remainCount());
      process.exit(1);
    }
    // 直接移除（跳过动画）
    leaf.removed = true;
    steps += 1;
  }
  console.log(cfg.name, 'cols', cfg.cols, 'edges', g.edges.length, 'cleared', steps, 'ok');
}
