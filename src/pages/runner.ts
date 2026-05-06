import { runTwoPoint } from '../modes/saccade/two-point'
import { runLineTrack } from '../modes/saccade/line-track'
import { runReturnSweep } from '../modes/saccade/return-sweep'
import { runWordFlash } from '../modes/saccade/word-flash'
import { findActivity } from '../activities'
import type { ActivityRunner, EngineReport, Intensity, Mode } from '../types'

const REGISTRY: Record<string, ActivityRunner> = {
  'A/A1': runTwoPoint,
  'A/A2': runLineTrack,
  'A/A3': runReturnSweep,
  'A/A4': runWordFlash
}

export function renderRunner(
  root: HTMLElement,
  params: { mode: string; activity: string },
  query: URLSearchParams
): () => void {
  const meta = findActivity(params.mode, params.activity)
  const key = `${params.mode}/${params.activity}`
  const runner = REGISTRY[key]
  if (!meta || !runner) {
    root.innerHTML = `
      <div class="page">
        <h1>알 수 없는 활동</h1>
        <p class="muted">${key}는 아직 구현되지 않았습니다.</p>
        <a class="btn" href="#/teacher">콘솔로</a>
      </div>
    `
    return () => {}
  }

  const intensity = parseIntensity(query.get('i'), meta.defaultIntensity)
  const durationSec = parseDuration(query.get('d'), meta.durations, meta.defaultDuration)
  const timeScale = parseTimeScale(query.get('t'))
  const autoExit = query.get('autoexit') === '1'

  const container = document.createElement('div')
  container.className = 'runner'
  const hint = document.createElement('div')
  hint.className = 'runner__hint'
  hint.textContent = `${meta.id} · ${meta.label} · ${intensity} · ${durationSec}s${timeScale > 1 ? ` · ×${timeScale}` : ''} · ESC`
  container.append(hint)
  root.append(container)

  const controller = new AbortController()

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !controller.signal.aborted) controller.abort('esc')
  }
  document.addEventListener('keydown', onKey)

  const onFsChange = () => {
    if (!document.fullscreenElement && !controller.signal.aborted) controller.abort('esc')
  }
  document.addEventListener('fullscreenchange', onFsChange)

  const fsPromise = timeScale > 1 ? Promise.resolve() : enterFullscreen(container)
  fsPromise.then(() => {
    runner(container, {
      intensity,
      durationMs: durationSec * 1000,
      signal: controller.signal,
      timeScale
    })
      .then((report) => showReport(root, container, report, params, autoExit))
      .catch((err) => showError(root, container, err))
  })

  return () => {
    if (!controller.signal.aborted) controller.abort('esc')
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('fullscreenchange', onFsChange)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}

function parseIntensity(raw: string | null, fallback: Intensity): Intensity {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  return fallback
}

function parseDuration(raw: string | null, _allowed: number[], fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, 600)
}

function parseTimeScale(raw: string | null): number {
  const n = raw ? Number.parseFloat(raw) : NaN
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(n, 100)
}

async function enterFullscreen(el: HTMLElement): Promise<void> {
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
  } catch {
    /* 풀스크린 거부 시 윈도우 모드로 계속 */
  }
}

function showReport(
  root: HTMLElement,
  container: HTMLElement,
  report: EngineReport,
  params: { mode: string; activity: string },
  autoExit: boolean
): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  container.remove()

  const mode = params.mode as Mode
  const wrap = document.createElement('div')
  wrap.className = 'runner__report'
  wrap.dataset['testReport'] = '1'
  wrap.dataset['cueCount'] = String(report.cueErrors.length)
  wrap.dataset['avgError'] = avg(report.cueErrors).toFixed(2)
  wrap.dataset['maxError'] = max(report.cueErrors).toFixed(2)
  wrap.dataset['dropCount'] = String(report.dropCount)
  wrap.innerHTML = `
    <h1>회기 종료</h1>
    <p class="muted">${mode}/${params.activity} · ${report.reason}</p>
    <table class="report-table">
      <tr><td>cue 수</td><td>${report.cueErrors.length}</td></tr>
      <tr><td>평균 오차</td><td>${avg(report.cueErrors).toFixed(1)} ms</td></tr>
      <tr><td>최대 오차</td><td>${max(report.cueErrors).toFixed(1)} ms</td></tr>
      <tr><td>드롭 프레임</td><td>${report.dropCount} (max ${report.maxDropMs.toFixed(1)} ms)</td></tr>
    </table>
    <div class="btn-row">
      <a class="btn btn--primary" href="#/teacher">콘솔로</a>
      <a class="btn" href="#/">홈</a>
    </div>
  `
  root.append(wrap)

  if (autoExit) {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('runner:autoexit', { detail: report }))
    })
  }
}

function showError(root: HTMLElement, container: HTMLElement, err: unknown): void {
  container.remove()
  root.innerHTML = `
    <div class="page">
      <h1>오류</h1>
      <pre>${String(err)}</pre>
      <a class="btn" href="#/">홈</a>
    </div>
  `
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function max(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => (a > b ? a : b), 0)
}
