import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import wordPool from '../../data/word-pool-default.json'

type Config = {
  wordCount: number
  periodMs: number
  fontPx: number
  gapEm: number
}

const PRESETS: Record<Intensity, Config> = {
  low:    { wordCount: 5,  periodMs: 1000, fontPx: 24, gapEm: 0.5 },
  medium: { wordCount: 8,  periodMs:  700, fontPx: 36, gapEm: 1.0 },
  high:   { wordCount: 12, periodMs:  500, fontPx: 48, gapEm: 1.5 }
}

export const runLineTrack: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas'

  const row = document.createElement('div')
  row.className = 'row'
  row.style.top = '50%'
  row.style.transform = 'translate(-50%, -50%)'
  row.style.fontSize = `${cfg.fontPx}px`
  row.style.gap = `${cfg.gapEm}em`

  const words = wordPool.words.slice(0, cfg.wordCount)
  const wordEls = words.map((w) => {
    const el = document.createElement('span')
    el.className = 'word'
    el.textContent = w
    return el
  })
  row.append(...wordEls)
  canvas.append(row)
  root.append(canvas)

  const cues: Cue<number>[] = []
  for (let t = 0, i = 0; t < opts.durationMs; t += cfg.periodMs, i = (i + 1) % cfg.wordCount) {
    cues.push({ atMs: t, payload: i })
  }

  const engine = new StimulusEngine<number>()
  let lastIdx = -1
  engine.onCue((cue) => {
    if (lastIdx >= 0) wordEls[lastIdx].classList.remove('word--on')
    wordEls[cue.payload].classList.add('word--on')
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
