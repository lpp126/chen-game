import { getSettlementImage } from './levelSettlementImages';

const CHAR_SPRITE = '/images/背带裤小添.webp';

const l20 = (name: string) => `/images/level25/${encodeURIComponent(name)}`;

/** 第 20 关谐音梗题图（与 Level25WordFunGame 题库一致） */
const LEVEL20_PIC_FILES = [
  '1题-彩虹.webp',
  '1答案-彩虹屁.webp',
  '题2-马.webp',
  '答2-二维码.webp',
  '3题-蛋.webp',
  '3答-扯淡.webp',
  '4题-公鸡.webp',
  '4答-肱二头肌.webp',
  '5题-鹅.webp',
  '5答-俄罗斯.webp',
  '6题-房.webp',
  '6答-破防.webp',
  '7题-柴犬.webp',
  '7答-财源滚滚.webp',
  '8题-鸡.webp',
  '8答-叫花鸡.webp',
  '9题-骨头.webp',
  '9答-反骨.webp',
  '10题-好酒.webp',
  '10答-好久不见.webp',
  '11题-鸡蛋.webp',
  '11答-鸡蛋灌饼.webp',
  '13题-鸡.webp',
  '13答-洗衣机.webp',
  '14题-拉客.webp',
  '14答-拉二胡.webp',
  '15题-油条.webp',
  '15答-井井有条.webp',
  '16题-梅西.webp',
  '16答-西梅.webp',
  '17题-气球.webp',
  '17答-告白气球.webp',
  '18题-蜂蜜.webp',
  '18答-闺蜜.webp',
  '19题-布.webp',
  '19题拉布布.webp'
];

/** 返回本关需要预加载的图片 URL（含结算表情包） */
export function getLevelAssetUrls(levelId: number): string[] {
  const urls: string[] = [];
  const settlement = getSettlementImage(levelId);
  if (settlement) urls.push(settlement);

  switch (levelId) {
    case 1:
      urls.push('/images/bg-room.webp', '/images/奶嘴添添.webp', '/images/bottle-hd.webp');
      break;
    case 3:
    case 13:
      urls.push(CHAR_SPRITE);
      break;
    case 5:
      urls.push('/images/level5-puzzle.webp');
      break;
    case 11:
      urls.push('/images/找3.webp', '/images/找5.webp', '/images/找6.webp');
      break;
    case 20:
      LEVEL20_PIC_FILES.forEach((f) => urls.push(l20(f)));
      break;
    default:
      break;
  }

  return [...new Set(urls)];
}

export function levelNeedsHeavyAssets(levelId: number): boolean {
  return getLevelAssetUrls(levelId).length > 1; // 结算图以外还有玩法图
}
