import { findActivity, INTENSITY_LABEL } from '../activities'
import { getSession, getStudent, putSession } from '../storage'
import { navigate } from '../router'
import type { Session } from '../types'

export function renderReport(root: HTMLElement, params: { sessionId: string }): () => void {
  let cancelled = false
  const wrap = document.createElement('div')
  wrap.className = 'page'
  wrap.innerHTML = '<h1>회기 기록</h1><p class="muted">불러오는 중…</p>'
  root.append(wrap)

  void load()

  async function load(): Promise<void> {
    const session = await getSession(params.sessionId)
    if (cancelled) return
    if (!session) {
      wrap.innerHTML = `
        <h1>회기를 찾을 수 없음</h1>
        <p class="muted">id: ${params.sessionId}</p>
        <a class="btn" href="#/teacher">콘솔로</a>
      `
      return
    }
    const meta = findActivity(session.mode, session.activity)
    const studentLabels = await renderStudents(session.studentIds)
    wrap.innerHTML = renderForm(session, meta?.label ?? session.activity, studentLabels)
    bind(session)
  }

  function bind(session: Session): void {
    const $self = wrap.querySelector<HTMLTextAreaElement>('#f-self')!
    const $comment = wrap.querySelector<HTMLTextAreaElement>('#f-comment')!
    const $save = wrap.querySelector<HTMLButtonElement>('#f-save')!
    const $skip = wrap.querySelector<HTMLAnchorElement>('#f-skip')!
    $self.value = session.selfReport
    $comment.value = session.teacherComment
    $save.addEventListener('click', async () => {
      $save.disabled = true
      await putSession({
        ...session,
        selfReport: $self.value.trim(),
        teacherComment: $comment.value.trim()
      })
      navigate('/teacher')
    })
    $skip.addEventListener('click', (e) => {
      e.preventDefault()
      navigate('/teacher')
    })
  }

  return () => {
    cancelled = true
  }
}

function renderForm(session: Session, activityLabel: string, studentLabels: string): string {
  const intensityLabel = INTENSITY_LABEL[session.intensity]
  const durationSec = Math.round(session.durationMs / 1000)
  const eng = session.engineReport
  const avgErr = eng.cueErrors.length === 0 ? 0 : eng.cueErrors.reduce((a, b) => a + b, 0) / eng.cueErrors.length
  const maxErr = eng.cueErrors.length === 0 ? 0 : eng.cueErrors.reduce((a, b) => (a > b ? a : b), 0)
  return `
    <h1>회기 기록</h1>
    <p class="muted">
      ${session.date} · ${session.mode}/${session.activity} ${activityLabel} ·
      ${intensityLabel} · ${durationSec}s · Phase ${session.phase} · Track ${session.track}
    </p>
    <p class="muted">대상: ${studentLabels}</p>

    <div class="field">
      <label for="f-self">학생 자기보고 (선택)</label>
      <textarea id="f-self" rows="2" placeholder="대표 학생 1명이 입력하거나 비워둠"></textarea>
    </div>

    <div class="field">
      <label for="f-comment">교사 관찰 한 줄</label>
      <textarea id="f-comment" rows="2" placeholder="오늘 회기에서 관찰한 점"></textarea>
    </div>

    <details>
      <summary>자극 엔진 자가진단</summary>
      <table class="report-table">
        <tr><td>cue 수</td><td>${eng.cueErrors.length}</td></tr>
        <tr><td>평균 오차</td><td>${avgErr.toFixed(1)} ms</td></tr>
        <tr><td>최대 오차</td><td>${maxErr.toFixed(1)} ms</td></tr>
        <tr><td>드롭 프레임</td><td>${eng.dropCount} (max ${eng.maxDropMs.toFixed(1)} ms)</td></tr>
        <tr><td>종료 사유</td><td>${eng.reason}</td></tr>
      </table>
    </details>

    <div class="btn-row">
      <button id="f-save" class="btn btn--primary">저장</button>
      <a id="f-skip" class="btn" href="#/teacher">건너뛰기</a>
    </div>
  `
}

async function renderStudents(ids: string[]): Promise<string> {
  if (ids.length === 0) return '학급 전체'
  const labels: string[] = []
  for (const id of ids) {
    const s = await getStudent(id)
    labels.push(s ? s.anonymousLabel : `(삭제된 학생: ${id.slice(0, 8)})`)
  }
  return labels.join(', ')
}
