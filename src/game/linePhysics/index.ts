export {
  LinePhysicsEngine,
  normalizeDir,
  clonePoints,
  distPointSeg2,
  segmentsIntersect,
  polylinesCollide,
  hitTestPolyline,
  translatePoints,
  isOutsideBounds
} from './engine';
export type { Vec2, LineState, DirKey, PolylineDef, Polyline, EngineConfig, EngineEvent } from './engine';
