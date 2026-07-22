/** 全局音频：菜单 BGM + 静音（挂到 window，避免 HMR 双轨） */

const MUTE_KEY = 'ctxiang_audio_muted';
export const MENU_BGM_SRC = '/audio/menu-bgm.mp3';

type AudioHub = {
  el: HTMLAudioElement | null;
  muted: boolean;
  shouldPlay: boolean;
  unlocked: boolean;
  listeners: Set<(muted: boolean) => void>;
};

const HUB_KEY = '__ctxiangAudioHub';
const ALL_KEY = '__ctxiangMenuAudioSet';

const getHub = (): AudioHub => {
  const w = window as Window & { [HUB_KEY]?: AudioHub };
  if (!w[HUB_KEY]) {
    let muted = false;
    try {
      muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* ignore */
    }
    w[HUB_KEY] = {
      el: null,
      muted,
      shouldPlay: false,
      unlocked: false,
      listeners: new Set()
    };
  }
  return w[HUB_KEY]!;
};

const getAll = (): Set<HTMLAudioElement> => {
  const w = window as Window & { [ALL_KEY]?: Set<HTMLAudioElement> };
  if (!w[ALL_KEY]) w[ALL_KEY] = new Set();
  return w[ALL_KEY]!;
};

const notify = () => {
  const hub = getHub();
  hub.listeners.forEach((fn) => fn(hub.muted));
};

const hardStop = (el: HTMLAudioElement) => {
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  el.muted = true;
  el.volume = 0;
};

/** 停掉所有曾创建过的菜单音轨（含热更新残留） */
const stopAllMenuAudios = () => {
  getAll().forEach((el) => hardStop(el));
};

const ensureEl = (): HTMLAudioElement => {
  const hub = getHub();
  if (hub.el) return hub.el;
  const el = new Audio(MENU_BGM_SRC);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  el.muted = true;
  hub.el = el;
  getAll().add(el);
  return el;
};

export const isMuted = () => getHub().muted;

export const subscribeMute = (fn: (muted: boolean) => void) => {
  const hub = getHub();
  hub.listeners.add(fn);
  fn(hub.muted);
  return () => {
    hub.listeners.delete(fn);
  };
};

export const setMuted = (next: boolean) => {
  const hub = getHub();
  hub.muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }

  if (next) {
    stopAllMenuAudios();
  } else if (hub.shouldPlay) {
    stopAllMenuAudios();
    const el = ensureEl();
    el.muted = false;
    el.volume = 0.45;
    void el.play().catch(() => undefined);
  } else {
    stopAllMenuAudios();
  }

  window.dispatchEvent(new CustomEvent('ctxiang-mute', { detail: { muted: next } }));
  notify();
};

export const toggleMuted = () => setMuted(!getHub().muted);

/** 首次用户手势解锁 */
export const unlockAudio = () => {
  const hub = getHub();
  hub.unlocked = true;
  if (hub.shouldPlay && !hub.muted) {
    setMenuBgmActive(true);
  }
};

/** 仅首页 / 选关为 true；其余状态硬停全部菜单轨 */
export const setMenuBgmActive = (active: boolean) => {
  const hub = getHub();
  hub.shouldPlay = active;

  if (!active || hub.muted) {
    stopAllMenuAudios();
    return;
  }

  // 先停掉残留，只留一条主轨播放
  stopAllMenuAudios();
  const el = ensureEl();
  el.muted = false;
  el.volume = 0.45;
  void el.play().catch(() => undefined);
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopAllMenuAudios();
  });
}
