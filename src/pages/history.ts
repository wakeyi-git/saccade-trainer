import { findActivity, INTENSITY_LABEL } from '../activities'
import { getStudent, listSessionsByStudent } from '../storage'
import type { Session, Student } from '../types'

export function renderHistory(root: HTMLElement, params: { studentId: string }): () => void {
  let cancelled = false
  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = '<h1>학생 누적 기록</h1><p class="muted">불러오는 중…</p>'
  root.append(page)

  void load()
  return () => {
    cancelled = true
  }

  async function load(): Promise<void> {
    const [student, sessions] = await Promise.all([
      getStudent(params.studentId),
      listSessionsByStudent(params.studentId)
    ])
    if (cancelled) return
    if (!student) {
      page.innerHTML = '<h1>학생을 찾을 수 없음</h1><a class="btn" href="#/setup">설정</a>'
      return
    }
    page.innerHTML = render(student, sessions)
  }
}

function render(student: Student, sessions: Session[]): string {
  return `
    <h1>${student.anonymousLabel} · 누적 기록</h1>
    <p class="muted">학년 ${student.grade} · 회기 ${sessions.length}개</p>
    ${sessions.length === 0
      ? '<p class="muted">기록된 회기가 없습니다.</p>'
      : sessions.map(renderRow).join('')
    }
    <div class="btn-row">
      <a class="btn" href="#/setup">설정</a>
      <a class="btn" href="#/teacher">콘솔</a>
    </div>
  `
}

function renderRow(session: Session): string {
  const meta = findActivity(session.mode, session.activity)
  const label = meta?.label ?? session.activity
  return `
    <div class="history-row">
      <div class="history-row__meta">
        <strong>${session.date}</strong>
        <span class="muted"> · ${session.mode}/${session.activity} ${label} · ${INTENSITY_LABEL[session.intensity]} · Phase ${session.phase}/Track ${session.track}</span>
      </div>
      ${session.selfReport ? `<div class="history-row__self">학생: ${escapeHtml(session.selfReport)}</div>` : ''}
      ${session.teacherComment ? `<div class="history-row__teacher">교사: ${escapeHtml(session.teacherComment)}</div>` : ''}
    </div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
    }
    return c
  })
}
