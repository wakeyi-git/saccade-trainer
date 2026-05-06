import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import { getParagraphOrFallback, getSettings } from '../../storage'
import { beep } from '../../sound'

type Side = 'top' | 'bottom'

type Config = {
  periodMs: number
}

const PRESETS: Record<Intensity, Config> = {
  low:    { periodMs: 12_000 },
  medium: { periodMs:  8_000 },
  high:   { periodMs:  5_000 }
}

const SCROLL_LABELS = ['파랑', '빨강', '노랑', '초록', '검정', '회색', '주황', '보라']
const SCROLL_COLORS = ['#1a73e8', '#d93025', '#f9ab00', '#188038', '#222', '#5f6368', '#e8710a', '#9334e6']

export const runSplit: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const settings = getSettings()
  const para = await getParagraphOrFallback(opts.paragraphId ?? null)

  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas split-canvas'

  const top = document.createElement('div')
  top.className = 'split-pane split-pane--top'
  const stack = document.createElement('div')
  stack.className = 'scroll-stack'
  for (let i = 0; i < 12; i++) {
    const card = document.createElement('div')
    card.className = 'scroll-card'
    card.style.background = SCROLL_COLORS[i % SCROLL_COLORS.length]
    card.textContent = SCROLL_LABELS[i % SCROLL_LABELS.length]
    stack.append(card)
  }
  top.append(stack)

  const bottom = document.createElement('div')
  bottom.className = 'split-pane split-pane--bottom'
  const paraEl = document.createElement('div')
  paraEl.className = 'split-paragraph'
  paraEl.textContent = para.text
  bottom.append(paraEl)

  canvas.append(top, bottom)
  root.append(canvas)

  const cues: Cue<Side>[] = []
  for (let t = 0, side: Side = 'bottom'; t < opts.durationMs; t += cfg.periodMs) {
    cues.push({ atMs: t, payload: side })
    side = side === 'top' ? 'bottom' : 'top'
  }

  const engine = new StimulusEngine<Side>()
  engine.onCue((cue) => {
    if (cue.payload === 'top') {
      top.classList.add('split-pane--active')
      bottom.classList.remove('split-pane--active')
    } else {
      bottom.classList.add('split-pane--active')
      top.classList.remove('split-pane--active')
    }
    if (settings.soundCues) beep({ frequency: cue.payload === 'top' ? 880 : 440 })
  })

  const onAbort = () => engine.stop((opts.signal.reason as StopReason) ?? 'esc')
  if (opts.signal.aborted) onAbort()
  else opts.signal.addEventListener('abort', onAbort, { once: true })

  let report: EngineReport
  try {
    report = await engine.start({ durationMs: opts.durationMs, cues, timeScale: opts.timeScale })
  } finally {
    opts.signal.removeEventListener('abort', onAbort)
  }
  return report
}
