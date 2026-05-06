import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import { getParagraphOrFallback } from '../../storage'

type Config = { periodMs: number; fontPx: number }

const PRESETS: Record<Intensity, Config> = {
  low:    { periodMs: 1500, fontPx: 28 },
  medium: { periodMs: 1000, fontPx: 32 },
  high:   { periodMs:  700, fontPx: 36 }
}

export const runChunkTrainer: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const para = await getParagraphOrFallback(opts.paragraphId ?? null)
  const chunkSize = Math.max(1, Math.min(opts.chunkSize ?? 2, 5))

  const words = para.text.split(/\s+/).filter((w) => w.length > 0)
  const groups: number[][] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    groups.push(words.slice(i, i + chunkSize).map((_, j) => i + j))
  }

  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas chunk-canvas'

  const titleEl = document.createElement('div')
  titleEl.className = 'chunk-title'
  titleEl.textContent = `${para.title} · 청킹 ${chunkSize}어절`

  const flow = document.createElement('div')
  flow.className = 'chunk-flow'
  flow.style.fontSize = `${cfg.fontPx}px`

  const wordEls = words.map((w) => {
    const span = document.createElement('span')
    span.className = 'word'
    span.textContent = w
    return span
  })
  for (const el of wordEls) flow.append(el, document.createTextNode(' '))

  canvas.append(titleEl, flow)
  root.append(canvas)

  const cues: Cue<number>[] = []
  for (let t = 0, i = 0; t < opts.durationMs; t += cfg.periodMs, i = (i + 1) % groups.length) {
    cues.push({ atMs: t, payload: i })
  }

  const engine = new StimulusEngine<number>()
  let lastIdx = -1
  engine.onCue((cue) => {
    if (lastIdx >= 0) for (const w of groups[lastIdx]) wordEls[w].classList.remove('word--on')
    for (const w of groups[cue.payload]) wordEls[w].classList.add('word--on')
    lastIdx = cue.payload
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
