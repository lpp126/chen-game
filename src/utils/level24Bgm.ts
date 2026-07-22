/** 第 24 关专属 BGM：玩法 + 结算循环；规则页 / 其它状态不播（不受菜单静音影响） */

export const LEVEL24_BGM_SRC = '/audio/level24-bgm.mp3';

const HUB_KEY = '__ctxiangLevel24Bgm';

type Hub = {
  el: HTMLAudioElement | null;
  shouldPlay: boolean;
};

const getHub = (): Hub => {
  const w = window as Window & { [HUB_KEY]?: Hub };
  if (!w[HUB_KEY]) {
    w[HUB_KEY] = { el: null, shouldPlay: false };
  }
  return w[HUB_KEY]!;
};

const ensureEl = (): HTMLAudioElement => {
  const hub = getHub();
  if (hub.el) return hub.el;
  const el = new Audio(LEVEL24_BGM_SRC);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0.7;
  hub.el = el;
  return el;
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

/** playing / gameover 时为 true；规则页 start、开场 intro 等为 false */
export const setLevel24BgmActive = (active: boolean) => {
  const hub = getHub();
  hub.shouldPlay = active;
  if (!active) {
    hardStop();
    return;
  }
  const el = ensureEl();
  if (!el.paused && !el.ended) return;
  void el.play().catch(() => undefined);
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    hardStop();
  });
}
