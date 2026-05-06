import type { ActivityRunner, EngineReport, Intensity, StopReason } from '../../types'
import wordPool from '../../data/word-pool-default.json'

type Config = {
  fixationMs: number
  wordCount: number
}

const PRESETS: Record<Intensity, Config> = {
  low:    { fixationMs: 3000, wordCount:  5 },
  medium: { fixationMs: 5000, wordCount:  8 },
  high:   { fixationMs: 8000, wordCount: 12 }
}

export const runFixationCard: ActivityRunner = (root, opts) => {
  const cfg = PRESETS[opts.intensity]
  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas fixation-canvas'

  const word = document.createElement('div')
  word.className = 'fixation-word'
  const meter = document.createElement('div')
  meter.className = 'fixation-meter'
  const meterFill = document.createElement('div')
  meterFill.className = 'fixation-meter__fill'
  meter.append(meterFill)
  const inputWrap = document.createElement('div')
  inputWrap.className = 'fixation-input'
  inputWrap.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = '떠오른 것 한 줄 (Enter)'
  inputWrap.append(input)

  canvas.append(word, meter, inputWrap)
  root.append(canvas)

  const words = shuffle(wordPool.words).slice(0, cfg.wordCount)

  let cancelled = false
  const onAbort = () => {
    cancelled = true
  }
  if (opts.signal.aborted) cancelled = true
  else opts.signal.addEventListener('abort', onAbort, { once: true })

  return run().finally(() => opts.signal.removeEventListener('abort', onAbort))

  async function run(): Promise<EngineReport> {
    for (const w of words) {
      if (cancelled) break
      word.textContent = w
      inputWrap.style.display = 'none'
      input.value = ''
      meter.style.display = ''
      // 응시 시간 카운트다운
      meterFill.style.transition = 'none'
      meterFill.style.width = '0%'
      requestAnimationFrame(() => {
        meterFill.style.transition = `width ${cfg.fixationMs / Math.max(opts.timeScale ?? 1, 1)}ms linear`
        meterFill.style.width = '100%'
      })
      await delay(cfg.fixationMs / Math.max(opts.timeScale ?? 1, 1), () => cancelled)
      if (cancelled) break
      // 입력 단계 (학생 자유 시간; ESC로 다음/종료)
      meter.style.display = 'none'
      inputWrap.style.display = ''
      input.focus()
      const accepted = await waitInputOrAbort(input, () => cancelled)
      if (!accepted) break
    }
    return makeReport(cancelled)
  }
}

function delay(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((res) => {
    const start = performance.now()
    const tick = () => {
      if (isCancelled() || performance.now() - start >= ms) res()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function waitInputOrAbort(input: HTMLInputElement, isCancelled: () => boolean): Promise<boolean> {
  return new Promise((res) => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        cleanup()
        res(true)
      }
    }
    input.addEventListener('keydown', onKey)
    const poll = () => {
      if (isCancelled()) {
        cleanup()
        res(false)
      } else {
        requestAnimationFrame(poll)
      }
    }
    requestAnimationFrame(poll)
    function cleanup(): void {
      input.removeEventListener('keydown', onKey)
    }
  })
}

function makeReport(cancelled: boolean): EngineReport {
  return {
    dropCount: 0,
    maxDropMs: 0,
    cueErrors: [],
    reason: cancelled ? 'esc' : 'completed' as StopReason
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
