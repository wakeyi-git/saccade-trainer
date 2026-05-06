import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import paragraphPool from '../../data/paragraph-pool-default.json'

type Config = {
  wordsPerMinute: number
  concurrent: number          // 동시 표시 단어 수
  textKind: 'sentence' | 'paragraph' | 'two'
  rows: number
  cols: number
}

const PRESETS: Record<Intensity, Config> = {
  low:    { wordsPerMinute:  60, concurrent: 1, textKind: 'sentence',  rows: 1, cols: 5 },
  medium: { wordsPerMinute: 100, concurrent: 3, textKind: 'paragraph', rows: 2, cols: 6 },
  high:   { wordsPerMinute: 150, concurrent: 5, textKind: 'two',       rows: 3, cols: 6 }
}

type Cell = { row: number; col: number; word: string }

export const runWordFlash: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas'

  const grid = document.createElement('div')
  grid.className = 'flash-grid'

  const slotEls: HTMLSpanElement[][] = []
  for (let r = 0; r < cfg.rows; r++) {
    const rowEl = document.createElement('div')
    rowEl.className = 'flash-row'
    const cols: HTMLSpanElement[] = []
    for (let c = 0; c < cfg.cols; c++) {
      const slot = document.createElement('span')
      slot.className = 'flash-slot'
      rowEl.append(slot)
      cols.push(slot)
    }
    grid.append(rowEl)
    slotEls.push(cols)
  }
  canvas.append(grid)
  root.append(canvas)

  const words = pickWords(cfg.textKind)
  const periodMs = 60_000 / cfg.wordsPerMinute
  const totalSlots = cfg.rows * cfg.cols

  const cues: Cue<Cell>[] = []
  for (let t = 0, i = 0; t < opts.durationMs; t += periodMs, i++) {
    const word = words[i % words.length]
    const slot = i % totalSlots
    cues.push({
      atMs: t,
      payload: { row: Math.floor(slot / cfg.cols), col: slot % cfg.cols, word }
    })
  }

  type Active = { row: number; col: number }
  const active: Active[] = []

  const engine = new StimulusEngine<Cell>()
  engine.onCue((cue) => {
    const el = slotEls[cue.payload.row][cue.payload.col]
    el.textContent = cue.payload.word
    el.classList.add('flash-slot--on')
    active.push({ row: cue.payload.row, col: cue.payload.col })
    while (active.length > cfg.concurrent) {
      const old = active.shift()!
      const oldEl = slotEls[old.row][old.col]
      oldEl.classList.remove('flash-slot--on')
      oldEl.textContent = ''
    }
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

function pickWords(kind: Config['textKind']): string[] {
  const paras = paragraphPool.paragraphs
  let text: string
  switch (kind) {
    case 'sentence':
      text = firstSentence(paras[0].text)
      break
    case 'paragraph':
      text = paras[0].text
      break
    case 'two':
      text = paras[0].text + ' ' + paras[1].text
      break
  }
  return text.split(/\s+/).filter((w) => w.length > 0)
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?。]*[.!?。]/)
  return m ? m[0] : text
}
