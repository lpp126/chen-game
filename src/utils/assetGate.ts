/** 本屏/本关资源门禁：有未完成项时全屏提示「正在加载」 */

export type AssetGateSnapshot = {
  active: boolean;
  label: string;
  progress: number;
};

type GateItem = { label: string; progress: number; priority: number };

const gates = new Map<string, GateItem>();
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
};

const snapshot = (): AssetGateSnapshot => {
  if (gates.size === 0) {
    return { active: false, label: '', progress: 0 };
  }
  let top: GateItem | null = null;
  for (const item of gates.values()) {
    if (!top || item.priority > top.priority) top = item;
  }
  return {
    active: true,
    label: top?.label ?? '正在加载',
    progress: top?.progress ?? 0
  };
};

/** priority 越大越优先展示文案；同屏可并存多个 gate */
export function setAssetGate(key: string, label: string, progress: number, priority = 10) {
  gates.set(key, {
    label: label || '正在加载',
    progress: Math.max(0, Math.min(1, progress)),
    priority
  });
  notify();
}

export function clearAssetGate(key: string) {
  if (!gates.has(key)) return;
  gates.delete(key);
  notify();
}

export function clearAllAssetGates() {
  if (gates.size === 0) return;
  gates.clear();
  notify();
}

export function getAssetGateSnapshot() {
  return snapshot();
}

export function subscribeAssetGate(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isAssetGateBlocking() {
  return gates.size > 0;
}
