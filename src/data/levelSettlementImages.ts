import { LEVELS } from './levels';

/** 文件名已标注「第 N 关结算」的专用图 */
const LABELED: Record<number, string> = {
  1: '/images/第一关结算.webp',
  2: '/images/第二关结算.webp',
  3: '/images/第三关结算.webp',
  5: '/images/第五关结算.webp',
  6: '/images/第6关结算.webp',
  9: '/images/第九关结算.webp',
  13: '/images/第13关结算.webp',
  22: '/images/第22关结算.webp',
  23: '/images/第23关结算.webp'
};

/**
 * 未标注关卡用的长英文+数字文件名图库。
 * 按关卡做确定性随机分配（同一关始终同一张，刷新不换图）。
 */
const HASH_POOL = [
  '1a34572a2bad10143c331e95126548ca.webp',
  '2dce4bb73281a0acf9a982e0ef6c8667.webp',
  '326645672467315223031d051747294e.webp',
  '3808f7093ea4e16b13c7965f717b4188.webp',
  '457887795164abaed2f804dfe0f63861.webp',
  '4888480f5686936d6a074185e1cbbc57.webp',
  '4af0e360009d69715a14ea35fb46ce5c.webp',
  '562db94af030c80616f076cb1e565e7e.webp',
  '61bb29382cbb69b57990202872582c3a.webp',
  '7cca898dc5bac3722b5650a58dafa731.webp',
  'b3252bdef338f2bd5266dd5e1a1c8f5b.webp',
  'c802e8f903bee3e53847d5ff34ed94a5.webp',
  'ce93dff5d2135f81c17b45fa92dd89e2.webp',
  'e224ac69996767e2b77ccd9ba3d48731.webp',
  'fedda77419b21077198fdc512f168e8e.webp'
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildMap(): Record<number, string> {
  const map: Record<number, string> = { ...LABELED };
  const unlabeled = LEVELS.map((l) => l.levelId).filter((id) => !LABELED[id]);
  const rand = mulberry32(20260722);
  const pool = shuffleInPlace([...HASH_POOL], rand);
  unlabeled.forEach((levelId, i) => {
    map[levelId] = `/images/${pool[i % pool.length]}`;
  });
  return map;
}

export const LEVEL_SETTLEMENT_IMAGES = buildMap();

export function getSettlementImage(levelId: number): string | null {
  return LEVEL_SETTLEMENT_IMAGES[levelId] ?? null;
}
