import { clearAssetGate, setAssetGate } from './assetGate';
import { blobToObjectUrl, loadWithProgress } from './loadWithProgress';

export const HOME_COVER_SRC = '/images/home-cover.webp';

const GATE = 'home-cover';

type Cache = {
  promise: Promise<string> | null;
  url: string | null;
};

const HUB = '__ctxiangHomeCover';

const getCache = (): Cache => {
  const w = window as Window & { [HUB]?: Cache };
  if (!w[HUB]) w[HUB] = { promise: null, url: null };
  return w[HUB]!;
};

/** 尽早、优先下载首页封面（可在 main 入口调用） */
export function prefetchHomeCover(): Promise<string> {
  const cache = getCache();
  if (cache.url) return Promise.resolve(cache.url);
  if (cache.promise) return cache.promise;

  setAssetGate(GATE, '正在加载首页封面', 0.02, 100);
  cache.promise = loadWithProgress(HOME_COVER_SRC, (p) => {
    setAssetGate(GATE, '正在加载首页封面', Math.max(0.02, p), 100);
  })
    .then((blob) => {
      const url = blobToObjectUrl(blob);
      cache.url = url;
      clearAssetGate(GATE);
      return url;
    })
    .catch(() => {
      // 回退直链
      cache.url = HOME_COVER_SRC;
      clearAssetGate(GATE);
      return HOME_COVER_SRC;
    });

  return cache.promise;
}

export function getHomeCoverUrl(): string | null {
  return getCache().url;
}

export function isHomeCoverReady(): boolean {
  return Boolean(getCache().url);
}
