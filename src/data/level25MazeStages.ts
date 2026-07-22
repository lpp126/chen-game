import type { MazeConfig } from '../game/mazeGraph/types';

export type MazeStageConfig = MazeConfig & {
  id: number;
  name: string;
};

/** 难度递进：格数↑、线更粗、少量环边增加交汇 */
export const LEVEL25_MAZE_STAGES: MazeStageConfig[] = [
  {
    id: 1,
    name: '入门',
    cols: 8,
    rows: 8,
    width: 670,
    height: 860,
    padding: 48,
    lineWidth: 5,
    difficulty: 'easy',
    loopRatio: 0,
    seed: 202601
  },
  {
    id: 2,
    name: '分叉',
    cols: 10,
    rows: 10,
    width: 670,
    height: 900,
    padding: 42,
    lineWidth: 7,
    difficulty: 'normal',
    loopRatio: 0.04,
    seed: 202602
  },
  {
    id: 3,
    name: '密径',
    cols: 12,
    rows: 12,
    width: 670,
    height: 920,
    padding: 36,
    lineWidth: 8,
    difficulty: 'hard',
    loopRatio: 0.07,
    seed: 202603
  },
  {
    id: 4,
    name: '迷阵',
    cols: 12,
    rows: 14,
    width: 670,
    height: 960,
    padding: 32,
    lineWidth: 9,
    difficulty: 'hard',
    loopRatio: 0.1,
    seed: 202604
  }
];

export const LEVEL25_MAX_LIVES = 3;
