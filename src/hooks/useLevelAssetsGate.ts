import { useEffect, useState } from 'react';
import { isLevelAssetsReady, prefetchLevelAssets } from '../utils/levelAssetCache';

/** 关卡组件门禁：素材未齐时不渲染玩法 */
export function useLevelAssetsGate(levelId: number, isActive: boolean, runId: number): boolean {
  const [ready, setReady] = useState(() => isLevelAssetsReady(levelId));

  useEffect(() => {
    if (!isActive) {
      setReady(isLevelAssetsReady(levelId));
      return;
    }
    let cancelled = false;
    setReady(false);
    void prefetchLevelAssets(levelId).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isActive, levelId, runId]);

  return ready;
}
