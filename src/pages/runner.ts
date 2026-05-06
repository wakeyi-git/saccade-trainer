import { runTwoPoint } from '../modes/saccade/two-point'
import { runLineTrack } from '../modes/saccade/line-track'
import { runReturnSweep } from '../modes/saccade/return-sweep'
import { runWordFlash } from '../modes/saccade/word-flash'
import { findActivity } from '../activities'
import { getSettings, putSession } from '../storage'
import { backupSession } from '../auto-backup'
import { navigate } from '../router'
import type {
  ActivityRunner,
  EngineReport,
  Intensity,
  Mode,
  Phase,
  Session,
  Track
} from '../types'

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

  const settings = getSettings()
  const intensity = parseIntensity(query.get('i'), meta.defaultIntensity)
  const durationSec = parseDuration(query.get('d'), meta.defaultDuration)
  const timeScale = parseTimeScale(query.get('t'))
  const autoExit = query.get('autoexit') === '1'
  const studentIds = parseStudents(query.get('s'))
  const phase = parsePhase(query.get('p'), settings.defaultPhase)
  const track = parseTrack(query.get('tk'), settings.defaultTrack)

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
      .then(async (report) => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        container.remove()
        if (autoExit) {
          showInPlaceReport(root, report, params)
        } else {
          await persistAndNavigate(root, report, {
            mode: params.mode as Mode,
            activity: params.activity,
            intensity,
            durationMs: durationSec * 1000,
            studentIds,
            phase,
            track,
            autoBackup: settings.autoBackup
          })
        }
      })
      .catch((err) => showError(root, container, err))
  })

  return () => {
    if (!controller.signal.aborted) controller.abort('esc')
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('fullscreenchange', onFsChange)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}

async function persistAndNavigate(
  root: HTMLElement,
  report: EngineReport,
  ctx: {
    mode: Mode
    activity: string
    intensity: Intensity
    durationMs: number
    studentIds: string[]
    phase: Phase
    track: Track
    autoBackup: boolean
  }
): Promise<void> {
  const now = new Date()
  const session: Session = {
    id: crypto.randomUUID(),
    date: toLocalDate(now),
    createdAt: now.toISOString(),
    mode: ctx.mode,
    activity: ctx.activity,
    intensity: ctx.intensity,
    durationMs: ctx.durationMs,
    studentIds: ctx.studentIds,
    phase: ctx.phase,
    track: ctx.track,
    selfReport: '',
    teacherComment: '',
    engineReport: report
  }
  try {
    await putSession(session)
    if (ctx.autoBackup) backupSession(session)
    navigate(`/report/${session.id}`)
  } catch (err) {
    showError(root, document.createElement('div'), err)
  }
}

function showInPlaceReport(
  root: HTMLElement,
  report: EngineReport,
  params: { mode: string; activity: string }
): void {
  const wrap = document.createElement('div')
  wrap.className = 'runner__report'
  wrap.dataset['testReport'] = '1'
  wrap.dataset['cueCount'] = String(report.cueErrors.length)
  wrap.dataset['avgError'] = avg(report.cueErrors).toFixed(2)
  wrap.dataset['maxError'] = max(report.cueErrors).toFixed(2)
  wrap.dataset['dropCount'] = String(report.dropCount)
  wrap.innerHTML = `
    <h1>회기 종료 (테스트)</h1>
    <p class="muted">${params.mode}/${params.activity} · ${report.reason}</p>
    <table class="report-table">
      <tr><td>cue 수</td><td>${report.cueErrors.length}</td></tr>
      <tr><td>평균 오차</td><td>${avg(report.cueErrors).toFixed(1)} ms</td></tr>
      <tr><td>최대 오차</td><td>${max(report.cueErrors).toFixed(1)} ms</td></tr>
      <tr><td>드롭 프레임</td><td>${report.dropCount}</td></tr>
    </table>
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

function parseIntensity(raw: string | null, fallback: Intensity): Intensity {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  return fallback
}

function parseDuration(raw: string | null, fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, 600)
}

function parseTimeScale(raw: string | null): number {
  const n = raw ? Number.parseFloat(raw) : NaN
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(n, 100)
}

function parseStudents(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
}

function parsePhase(raw: string | null, fallback: Phase): Phase {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4) return n
  return fallback
}

function parseTrack(raw: string | null, fallback: Track): Track {
  if (raw === 'A' || raw === 'B') return raw
  return fallback
}

async function enterFullscreen(el: HTMLElement): Promise<void> {
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
  } catch {
    /* 풀스크린 거부 시 윈도우 모드로 계속 */
  }
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function max(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => (a > b ? a : b), 0)
}
