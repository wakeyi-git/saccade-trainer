import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, StopReason } from '../../types'
import { getParagraphOrFallback } from '../../storage'

type Phase = 'vertical-intro' | 'vertical' | 'horizontal-intro' | 'horizontal' | 'compare'

export const runTwoReadings: ActivityRunner = async (root, opts) => {
  const para = await getParagraphOrFallback(opts.paragraphId ?? null)
  const words = para.text.split(/\s+/).filter((w) => w.length > 0)

  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas two-readings'

  const intro = document.createElement('div')
  intro.className = 'two-readings__intro'
  const verticalEl = renderVertical(words)
  const horizontalEl = renderHorizontal(para.title, para.text)
  const compareEl = renderCompare()
  canvas.append(intro, verticalEl, horizontalEl, compareEl)
  root.append(canvas)

  function show(phase: Phase): void {
    intro.style.display = phase.endsWith('-intro') ? '' : 'none'
    verticalEl.style.display = phase === 'vertical' ? '' : 'none'
    horizontalEl.style.display = phase === 'horizontal' ? '' : 'none'
    compareEl.style.display = phase === 'compare' ? '' : 'none'
    if (phase === 'vertical-intro') intro.textContent = '① 수직 배치본을 천천히 읽어보세요'
    if (phase === 'horizontal-intro') intro.textContent = '② 같은 글을 수평 배치본으로 다시 읽어보세요'
  }

  const introMs = 2000
  const slot = (opts.durationMs - introMs * 2) / 2
  const cues: Cue<Phase>[] = [
    { atMs: 0,                     payload: 'vertical-intro' },
    { atMs: introMs,               payload: 'vertical' },
    { atMs: introMs + slot,        payload: 'horizontal-intro' },
    { atMs: introMs * 2 + slot,    payload: 'horizontal' },
    { atMs: opts.durationMs - 1,   payload: 'compare' }
  ]

  const engine = new StimulusEngine<Phase>()
  engine.onCue((cue) => show(cue.payload))

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

function renderVertical(words: string[]): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'two-readings__vertical'
  for (const w of words) {
    const line = document.createElement('div')
    line.className = 'two-readings__v-word'
    line.textContent = w
    wrap.append(line)
  }
  return wrap
}

function renderHorizontal(title: string, text: string): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'two-readings__horizontal'
  const t = document.createElement('h2')
  t.textContent = title
  const p = document.createElement('p')
  p.textContent = text
  wrap.append(t, p)
  return wrap
}

function renderCompare(): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'two-readings__compare'
  wrap.innerHTML = `
    <h2>비교</h2>
    <p>어느 쪽이 더 잘 이해됐나요?</p>
    <p class="muted">회기 종료 후 자기보고에 한 줄로 적어 주세요.</p>
  `
  return wrap
}
