import { clearAssetGate, setAssetGate } from './assetGate';
import { blobToObjectUrl, loadWithProgress } from './loadWithProgress';

export const LEVEL1_BGM_SRC = '/audio/level1-bgm.mp3';

const GATE = 'level1-bgm';
const HUB = '__ctxiangLevel1Bgm';

type Cache = {
  promise: Promise<string> | null;
  url: string | null;
};

const getCache = (): Cache => {
  const w = window as Window & { [HUB]?: Cache };
  if (!w[HUB]) w[HUB] = { promise: null, url: null };
  return w[HUB]!;
};

/** 优先下载第 1 关 BGM，返回可给 Phaser 使用的 URL */
export function prefetchLevel1Bgm(): Promise<string> {
  const cache = getCache();
  if (cache.url) return Promise.resolve(cache.url);
  if (cache.promise) return cache.promise;

  setAssetGate(GATE, '正在加载关卡音乐', 0.02, 90);
  cache.promise = loadWithProgress(LEVEL1_BGM_SRC, (p) => {
    setAssetGate(GATE, '正在加载关卡音乐', Math.max(0.02, p), 90);
  })
    .then((blob) => {
      const url = blobToObjectUrl(blob);
      cache.url = url;
      clearAssetGate(GATE);
      return url;
    })
    .catch(() => {
      cache.url = LEVEL1_BGM_SRC;
      clearAssetGate(GATE);
      return LEVEL1_BGM_SRC;
    });

  return cache.promise;
}

export function getLevel1BgmUrl(): string | null {
  return getCache().url;
}

export function isLevel1BgmReady(): boolean {
  return Boolean(getCache().url);
}
