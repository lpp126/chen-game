export const makeTone = (
  from: number,
  to: number,
  ms: number,
  gainPeak = 0.11,
  type: OscillatorType = 'triangle'
) => {
  const Ctx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + ms / 1000);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + ms / 1000 + 0.05);
  window.setTimeout(() => void ctx.close(), ms + 120);
};

export const playCorrect = () => makeTone(520, 880, 160, 0.12);
export const playWrong = () => makeTone(220, 140, 200, 0.12, 'sawtooth');
export const playWin = () => makeTone(440, 920, 280, 0.14);
export const playTap = () => makeTone(560, 720, 90, 0.1);
export const playPop = () => makeTone(680, 1020, 120, 0.11);
