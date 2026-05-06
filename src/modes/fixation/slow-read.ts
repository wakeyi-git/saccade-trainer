import type { ActivityRunner, EngineReport, StopReason } from '../../types'
import { getParagraphOrFallback } from '../../storage'

export const runSlowRead: ActivityRunner = async (root, opts) => {
  const para = await getParagraphOrFallback(opts.paragraphId ?? null)

  const canvas = document.createElement('div')
  canvas.className = 'runner__canvas slow-canvas'

  const titleEl = document.createElement('h2')
  titleEl.className = 'slow-title'
  titleEl.textContent = para.title

  const paraEl = document.createElement('p')
  paraEl.className = 'slow-paragraph'
  paraEl.textContent = para.text

  const meter = document.createElement('div')
  meter.className = 'slow-meter'
  const fill = document.createElement('div')
  fill.className = 'slow-meter__fill'
  meter.append(fill)

  const inputWrap = document.createElement('div')
  inputWrap.className = 'slow-input'
  inputWrap.style.display = 'none'
  inputWrap.innerHTML = `
    <p>이 단락에서 떠오르는 <strong>세 단어</strong>를 적어 주세요.</p>
    <input type="text" placeholder="단어1, 단어2, 단어3 (Enter)" />
  `
  const input = inputWrap.querySelector('input')!

  canvas.append(titleEl, paraEl, meter, inputWrap)
  root.append(canvas)

  let cancelled = false
  const onAbort = () => {
    cancelled = true
  }
  if (opts.signal.aborted) cancelled = true
  else opts.signal.addEventListener('abort', onAbort, { once: true })

  return run().finally(() => opts.signal.removeEventListener('abort', onAbort))

  async function run(): Promise<EngineReport> {
    fill.style.transition = 'none'
    fill.style.width = '0%'
    requestAnimationFrame(() => {
      fill.style.transition = `width ${opts.durationMs / Math.max(opts.timeScale ?? 1, 1)}ms linear`
      fill.style.width = '100%'
    })
    await delay(opts.durationMs / Math.max(opts.timeScale ?? 1, 1), () => cancelled)
    if (cancelled) return makeReport(true)

    inputWrap.style.display = ''
    input.focus()
    await new Promise<void>((res) => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          input.removeEventListener('keydown', onKey)
          res()
        }
      }
      input.addEventListener('keydown', onKey)
      const poll = () => {
        if (cancelled) {
          input.removeEventListener('keydown', onKey)
          res()
        } else {
          requestAnimationFrame(poll)
        }
      }
      requestAnimationFrame(poll)
    })
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

function makeReport(cancelled: boolean): EngineReport {
  return {
    dropCount: 0,
    maxDropMs: 0,
    cueErrors: [],
    reason: cancelled ? 'esc' : 'completed' as StopReason
  }
}
