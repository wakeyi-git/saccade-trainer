import { runTwoPoint } from '../modes/saccade/two-point'
import type { ActivityRunner, EngineReport, Mode } from '../types'

const REGISTRY: Record<string, ActivityRunner> = {
  'A/A1': runTwoPoint
}

export function renderRunner(
  root: HTMLElement,
  params: { mode: string; activity: string }
): () => void {
  const key = `${params.mode}/${params.activity}`
  const runner = REGISTRY[key]
  if (!runner) {
    root.innerHTML = `
      <div class="page">
        <h1>알 수 없는 활동</h1>
        <p class="muted">${key}는 아직 구현되지 않았습니다.</p>
        <a class="btn" href="#/teacher">콘솔로</a>
      </div>
    `
    return () => {}
  }

  const container = document.createElement('div')
  container.className = 'runner'
  const hint = document.createElement('div')
  hint.className = 'runner__hint'
  hint.textContent = 'ESC로 종료'
  container.append(hint)
  root.append(container)

  const controller = new AbortController()

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !controller.signal.aborted) {
      controller.abort('esc')
    }
  }
  document.addEventListener('keydown', onKey)

  const onFsChange = () => {
    if (!document.fullscreenElement && !controller.signal.aborted) {
      controller.abort('esc')
    }
  }
  document.addEventListener('fullscreenchange', onFsChange)

  enterFullscreen(container).then(() => {
    runner(container, { intensity: 'medium', durationMs: 60_000, signal: controller.signal })
      .then((report) => showReport(root, container, report, params))
      .catch((err) => showError(root, container, err))
  })

  return () => {
    if (!controller.signal.aborted) controller.abort('esc')
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('fullscreenchange', onFsChange)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}

async function enterFullscreen(el: HTMLElement): Promise<void> {
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
  } catch {
    // 풀스크린 거부 시에도 자극 화면은 그대로 표시 (윈도우 모드)
  }
}

function showReport(
  root: HTMLElement,
  container: HTMLElement,
  report: EngineReport,
  params: { mode: string; activity: string }
): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  container.remove()

  const mode = params.mode as Mode
  const wrap = document.createElement('div')
  wrap.className = 'runner__report'
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
