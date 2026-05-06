import { StimulusEngine, type Cue } from '../../stimulus-engine'
import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'

type Kind = 'vertical' | 'horizontal'

type Card = { kind: Kind; label: string; emoji: string }

type Config = { dwellMs: number }

const PRESETS: Record<Intensity, Config> = {
  low:    { dwellMs: 6000 },
  medium: { dwellMs: 4000 },
  high:   { dwellMs: 2000 }
}

const CARDS: Card[] = [
  { kind: 'vertical',   label: 'SNS 피드',   emoji: '📱' },
  { kind: 'vertical',   label: '뉴스 앱',     emoji: '📲' },
  { kind: 'vertical',   label: '메신저 대화', emoji: '💬' },
  { kind: 'vertical',   label: '영상 댓글',   emoji: '▶️' },
  { kind: 'horizontal', label: '책 페이지',   emoji: '📖' },
  { kind: 'horizontal', label: '신문 기사',   emoji: '📰' },
  { kind: 'horizontal', label: '교과서',      emoji: '📒' },
  { kind: 'horizontal', label: '시험지',      emoji: '📝' }
]

export const runNameCard: ActivityRunner = async (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas name-card-canvas'

  const card = document.createElement('div')
  card.className = 'name-card'
  const emoji = document.createElement('div')
  emoji.className = 'name-card__emoji'
  const label = document.createElement('div')
  label.className = 'name-card__label'
  const hint = document.createElement('div')
  hint.className = 'name-card__hint'
  hint.textContent = '이건 어떤 모드일까요? — 수직 / 수평'
  card.append(emoji, label, hint)
  canvas.append(card)
  root.append(canvas)

  const order = shuffle(CARDS)
  const cues: Cue<Card>[] = []
  for (let t = 0, i = 0; t < opts.durationMs; t += cfg.dwellMs, i++) {
    cues.push({ atMs: t, payload: order[i % order.length] })
  }

  const engine = new StimulusEngine<Card>()
  engine.onCue((cue) => {
    emoji.textContent = cue.payload.emoji
    label.textContent = cue.payload.label
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

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
