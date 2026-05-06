// Web Audio 비프음 (모드 B 신호용). 색 신호와 *동시* 사용을 가정 (사양서 §9.2).

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new C()
  }
  return ctx
}

export function beep(opts: { frequency?: number; durationMs?: number; gain?: number } = {}): void {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume().catch(() => {})
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = opts.frequency ?? 800
    gain.gain.value = opts.gain ?? 0.08
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + (opts.durationMs ?? 120) / 1000)
  } catch {
    /* 자동재생 정책으로 막히면 무시 — 시각 신호만으로도 동작 */
  }
}
