import { getLevelAssetUrls } from '../data/levelAssets';
import { clearAssetGate, setAssetGate } from './assetGate';

const ready = new Set<number>();
const inflight = new Map<number, Promise<void>>();

const preloadImage = (url: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

const mapPool = async <T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) => {
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const cur = items[idx];
      idx += 1;
      await worker(cur);
    }
  });
  await Promise.all(runners);
};

export function isLevelAssetsReady(levelId: number): boolean {
  return ready.has(levelId);
}

/** 整关图片素材（玩法图 + 结算表情包）优先下载，未完成时挂全屏加载门禁 */
export function prefetchLevelAssets(levelId: number): Promise<void> {
  if (ready.has(levelId)) return Promise.resolve();
  const existing = inflight.get(levelId);
  if (existing) return existing;

  const urls = getLevelAssetUrls(levelId);
  if (urls.length === 0) {
    ready.add(levelId);
    return Promise.resolve();
  }

  const gateKey = `level-${levelId}-assets`;
  const label = `正在加载第${levelId}关素材`;
  setAssetGate(gateKey, `${label}（0/${urls.length}）`, 0.02, 96);

  let finished = 0;
  const promise = mapPool(urls, 4, async (url) => {
    await preloadImage(url);
    finished += 1;
    setAssetGate(gateKey, `${label}（${finished}/${urls.length}）`, finished / urls.length, 96);
  })
    .then(() => {
      ready.add(levelId);
      clearAssetGate(gateKey);
    })
    .catch(() => {
      ready.add(levelId);
      clearAssetGate(gateKey);
    })
    .finally(() => {
      inflight.delete(levelId);
    });

  inflight.set(levelId, promise);
  return promise;
}
