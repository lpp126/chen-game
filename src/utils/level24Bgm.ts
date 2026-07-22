/** 第 24 关专属 BGM：玩法 + 结算循环；规则页 / 其它状态不播（不受菜单静音影响） */

import { clearAssetGate, setAssetGate } from './assetGate';
import { blobToObjectUrl, loadWithProgress } from './loadWithProgress';

export const LEVEL24_BGM_SRC = '/audio/level24-bgm.mp3';

const GATE = 'level24-bgm';
const HUB_KEY = '__ctxiangLevel24Bgm';

type Hub = {
  el: HTMLAudioElement | null;
  shouldPlay: boolean;
  promise: Promise<HTMLAudioElement> | null;
  objectUrl: string | null;
};

const getHub = (): Hub => {
  const w = window as Window & { [HUB_KEY]?: Hub };
  if (!w[HUB_KEY]) {
    w[HUB_KEY] = { el: null, shouldPlay: false, promise: null, objectUrl: null };
  }
  return w[HUB_KEY]!;
};

const hardStop = () => {
  const hub = getHub();
  const el = hub.el;
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
};

const playIfNeeded = () => {
  const hub = getHub();
  if (!hub.shouldPlay || !hub.el) return;
  if (!hub.el.paused && !hub.el.ended) return;
  void hub.el.play().catch(() => undefined);
};

/** 优先下载第 24 关 BGM；未完成时会挂上加载门禁 */
export function prefetchLevel24Bgm(): Promise<HTMLAudioElement> {
  const hub = getHub();
  if (hub.el) return Promise.resolve(hub.el);
  if (hub.promise) return hub.promise;

  setAssetGate(GATE, '正在加载关卡音乐', 0.02, 90);
  hub.promise = loadWithProgress(LEVEL24_BGM_SRC, (p) => {
    setAssetGate(GATE, '正在加载关卡音乐', Math.max(0.02, p), 90);
  })
    .then((blob) => {
      const url = blobToObjectUrl(blob);
      hub.objectUrl = url;
      const el = new Audio(url);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0.7;
      hub.el = el;
      clearAssetGate(GATE);
      return el;
    })
    .catch(() => {
      const el = new Audio(LEVEL24_BGM_SRC);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0.7;
      hub.el = el;
      clearAssetGate(GATE);
      return el;
    })
    .finally(() => {
      hub.promise = null;
    });

  return hub.promise;
}

export function isLevel24BgmReady(): boolean {
  return Boolean(getHub().el);
}

/** playing / gameover 时为 true；规则页 start、开场 intro 等为 false */
export const setLevel24BgmActive = (active: boolean) => {
  const hub = getHub();
  hub.shouldPlay = active;
  if (!active) {
    hardStop();
    return;
  }
  void prefetchLevel24Bgm().then(() => {
    if (getHub().shouldPlay) playIfNeeded();
  });
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    hardStop();
    const hub = getHub();
    if (hub.objectUrl) {
      URL.revokeObjectURL(hub.objectUrl);
      hub.objectUrl = null;
    }
  });
}
