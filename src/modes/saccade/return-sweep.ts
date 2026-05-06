import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import wordPool from '../../data/word-pool-default.json'

type Config = {
  rows: number
  rowGapEm: number
  indent: boolean
  dwellMs: number       // 점프 직전 머무는 시간
  fontPx: number
  wordsPerRow: number
}

const PRESETS: Record<Intensity, Config> = {
  low:    { rows: 2, rowGapEm: 1.5, indent: false, dwellMs: 1000, fontPx: 36, wordsPerRow: 5 },
  medium: { rows: 3, rowGapEm: 2.0, indent: false, dwellMs:  600, fontPx: 36, wordsPerRow: 5 },
  high:   { rows: 4, rowGapEm: 3.0, indent: true,  dwellMs:  300, fontPx: 36, wordsPerRow: 5 }
}

type Spot = { row: number; col: 'start' | 'end' }

export const runReturnSweep: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas'

  const center = document.createElement('div')
  center.style.position = 'absolute'
  center.style.top = '50%'
  center.style.left = '50%'
  center.style.transform = 'translate(-50%, -50%)'
  center.style.display = 'flex'
  center.style.flexDirection = 'column'
  center.style.gap = `${cfg.rowGapEm}em`

  // 단어 그리드 생성
  const wordEls: HTMLSpanElement[][] = []
  for (let r = 0; r < cfg.rows; r++) {
    const row = document.createElement('div')
    row.className = 'row' + (cfg.indent && r > 0 ? ' row--indent' : '')
    row.style.position = 'relative'
    row.style.left = '0'
    row.style.transform = 'none'
    row.style.fontSize = `${cfg.fontPx}px`
    row.style.gap = '1em'

    const start = r * cfg.wordsPerRow
    const slice = wordPool.words.slice(start, start + cfg.wordsPerRow)
    const els = slice.map((w) => {
      const el = document.createElement('span')
      el.className = 'word'
      el.textContent = w
      return el
    })
    wordEls.push(els)
    row.append(...els)
    center.append(row)
  }
  canvas.append(center)
  root.append(canvas)

  // sweep 시퀀스: row0-end → row1-start → row1-end → ... → rowN-1-end → 다시 row0-end
  const seq: Spot[] = []
  for (let r = 0; r < cfg.rows; r++) {
    if (r > 0) seq.push({ row: r, col: 'start' })
    seq.push({ row: r, col: 'end' })
  }

  const cues: Cue<Spot>[] = []
  for (let t = 0, i = 0; t < opts.durationMs; t += cfg.dwellMs, i = (i + 1) % seq.length) {
    cues.push({ atMs: t, payload: seq[i] })
  }

  const engine = new StimulusEngine<Spot>()
  let last: HTMLSpanElement | null = null
  engine.onCue((cue) => {
    const els = wordEls[cue.payload.row]
    const target = cue.payload.col === 'start' ? els[0] : els[els.length - 1]
    if (last) last.classList.remove('word--on')
    target.classList.add('word--on')
    last = target
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
