/** 第 24 关专属 BGM：玩法 + 结算循环；规则页 / 其它状态不播（不受菜单静音影响） */

import { clearAssetLoad, reportAssetLoad } from '../components/AssetLoadOverlay';
import { blobToObjectUrl, loadWithProgress } from './loadWithProgress';

export const LEVEL24_BGM_SRC = '/audio/level24-bgm.mp3';

const HUB_KEY = '__ctxiangLevel24Bgm';

type Hub = {
  el: HTMLAudioElement | null;
  shouldPlay: boolean;
  loading: boolean;
  objectUrl: string | null;
};

const getHub = (): Hub => {
  const w = window as Window & { [HUB_KEY]?: Hub };
  if (!w[HUB_KEY]) {
    w[HUB_KEY] = { el: null, shouldPlay: false, loading: false, objectUrl: null };
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

const ensureLoaded = async () => {
  const hub = getHub();
  if (hub.el) return hub.el;
  if (hub.loading) return null;
  hub.loading = true;
  reportAssetLoad('关卡音乐', 0.02);
  try {
    const blob = await loadWithProgress(LEVEL24_BGM_SRC, (p) => reportAssetLoad('关卡音乐', Math.max(0.02, p)));
    const url = blobToObjectUrl(blob);
    hub.objectUrl = url;
    const el = new Audio(url);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0.7;
    hub.el = el;
    clearAssetLoad();
    return el;
  } catch {
    // 回退直链
    const el = new Audio(LEVEL24_BGM_SRC);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0.7;
    hub.el = el;
    clearAssetLoad();
    return el;
  } finally {
    hub.loading = false;
  }
};

/** playing / gameover 时为 true；规则页 start、开场 intro 等为 false */
export const setLevel24BgmActive = (active: boolean) => {
  const hub = getHub();
  hub.shouldPlay = active;
  if (!active) {
    hardStop();
    clearAssetLoad();
    return;
  }
  void ensureLoaded().then(() => {
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
