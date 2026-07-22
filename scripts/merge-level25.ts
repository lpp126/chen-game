import fs from 'fs';
import { LEVEL25_STAGES } from '../src/data/level25Stages';

type Stage = (typeof LEVEL25_STAGES)[number] & { width: number; height: number };

const gen = JSON.parse(fs.readFileSync('scripts/gen-stages.json', 'utf8')) as {
  stage3: Stage;
  stage4: Stage;
};

const s1 = LEVEL25_STAGES[0];
const s2 = LEVEL25_STAGES[1];

const fmtPts = (pts: Array<{ x: number; y: number }>) =>
  pts.map((p) => `          { x: ${p.x}, y: ${p.y} }`).join(',\n');

const fmtLine = (l: Stage['lines'][number]) => `      {
        id: '${l.id}',
        dir: '${l.dir}',
        points: [
${fmtPts(l.points)}
        ]
      }`;

const fmtStage = (s: Stage) => `  {
    id: ${s.id},
    name: '${s.name}',
    width: ${s.width},
    height: ${s.height},
    solution: [${s.solution.map((x) => `'${x}'`).join(', ')}],
    lines: [
${s.lines.map(fmtLine).join(',\n')}
    ]
  }`;

const file = `import type { PolylineDef } from '../game/linePhysics/engine';

export type LineStageConfig = {
  id: number;
  name: string;
  width: number;
  height: number;
  lines: PolylineDef[];
  /** 已知可通关顺序；末段方向必须与 dir / 箭头一致 */
  solution: string[];
};

/**
 * 约定：连续折线（可长段多折、回形）、末点=箭头线头、末段方向===dir。
 * 第3关约14线、第4关约24线；solution 经逆向插入校验。
 */
export const LEVEL25_STAGES: LineStageConfig[] = [
${fmtStage({ ...s1, width: 670, height: 860 })},
${fmtStage({ ...s2, width: 670, height: 860 })},
${fmtStage(gen.stage3)},
${fmtStage(gen.stage4)}
];

export const LEVEL25_MAX_LIVES = 3;
`;

fs.writeFileSync('src/data/level25Stages.ts', file, 'utf8');
console.log('merged', gen.stage3.lines.length, gen.stage4.lines.length);
