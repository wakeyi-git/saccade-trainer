import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'

type Side = 'left' | 'right'

type Config = {
  gapRatio: number      // 점 간 간격 / 화면 너비
  periodMs: number      // 교대 주기
  dotPx: number         // 점 크기
}

const PRESETS: Record<Intensity, Config> = {
  low:    { gapRatio: 0.30, periodMs: 2000, dotPx: 32 },
  medium: { gapRatio: 0.60, periodMs: 1200, dotPx: 32 },
  high:   { gapRatio: 0.90, periodMs:  600, dotPx: 32 }
}

export const runTwoPoint: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas'

  const left = makeDot(cfg.dotPx)
  const right = makeDot(cfg.dotPx)
  positionDots(left, right, cfg.gapRatio)
  canvas.append(left, right)
  root.append(canvas)

  const onResize = () => positionDots(left, right, cfg.gapRatio)
  window.addEventListener('resize', onResize)

  const cues: Cue<Side>[] = []
  for (let t = 0, side: Side = 'left'; t < opts.durationMs; t += cfg.periodMs) {
    cues.push({ atMs: t, payload: side })
    side = side === 'left' ? 'right' : 'left'
  }

  const engine = new StimulusEngine<Side>()
  engine.onCue((cue) => {
    if (cue.payload === 'left') {
      left.classList.add('dot--on')
      right.classList.remove('dot--on')
    } else {
      right.classList.add('dot--on')
      left.classList.remove('dot--on')
    }
  })

  const onAbort = () => {
    const reason = (opts.signal.reason as StopReason) ?? 'esc'
    engine.stop(reason)
  }
  if (opts.signal.aborted) onAbort()
  else opts.signal.addEventListener('abort', onAbort, { once: true })

  let report: EngineReport
  try {
    report = await engine.start({ durationMs: opts.durationMs, cues, timeScale: opts.timeScale })
  } finally {
    window.removeEventListener('resize', onResize)
    opts.signal.removeEventListener('abort', onAbort)
  }
  return report
}

function makeDot(sizePx: number): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'dot'
  el.style.width = `${sizePx}px`
  el.style.height = `${sizePx}px`
  return el
}

function positionDots(left: HTMLElement, right: HTMLElement, gapRatio: number): void {
  const w = window.innerWidth
  const offsetPx = (w * gapRatio) / 2
  const cx = w / 2
  left.style.left = `${cx - offsetPx}px`
  right.style.left = `${cx + offsetPx}px`
}
