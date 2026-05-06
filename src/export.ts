import { findActivity, INTENSITY_LABEL } from './activities'
import { exportSnapshot, importSnapshot, listSessions, listStudents } from './storage'
import type { Session, Student } from './types'

const PROGRAM_LINK = '[[2026-05-06 디지털네이티브 안구운동 문해력 프로그램 설계서 v0.1]]'

export type ExportRange = { fromDate?: string; toDate?: string }

export function sessionMarkdown(session: Session, students: Student[]): string {
  const meta = findActivity(session.mode, session.activity)
  const label = meta?.label ?? session.activity
  const intensityLabel = INTENSITY_LABEL[session.intensity]
  const durationSec = Math.round(session.durationMs / 1000)
  const trackLabel = session.track === 'A' ? 'A 학급 루틴' : 'B 개별 지원'
  const studentLabel = renderStudentLabel(session.studentIds, students)

  const front = [
    '---',
    `title: "${session.date} 회기 일지 — ${session.activity} ${label}"`,
    'type: session-log',
    'domains: [교육, 안구운동, 회기일지]',
    `created: ${session.date}`,
    `date: ${session.date}`,
    `mode: ${session.mode}`,
    `activity: ${session.activity}`,
    `intensity: ${session.intensity}`,
    `duration: ${durationSec}`,
    `phase: ${session.phase}`,
    `track: ${session.track}`,
    'related:',
    `  - "${PROGRAM_LINK}"`,
    '---'
  ].join('\n')

  const body = [
    `# ${session.date} 회기 일지 — ${session.activity} ${label}`,
    '',
    '## 회기 정보',
    '',
    `- 일시: ${formatDateTime(session.createdAt)}`,
    `- 활동: ${session.activity} ${label} (${intensityLabel})`,
    `- 대상: ${studentLabel}`,
    `- Phase: ${session.phase}`,
    `- Track: ${trackLabel}`,
    '',
    '## 학생 자기보고',
    '',
    session.selfReport ? `> ${session.selfReport}` : '> _(미기록)_',
    '',
    '## 교사 관찰',
    '',
    session.teacherComment || '_(미기록)_',
    '',
    '## 자극 엔진 자가진단',
    '',
    `- cue 수: ${session.engineReport.cueErrors.length}`,
    `- 평균 오차: ${avg(session.engineReport.cueErrors).toFixed(1)} ms`,
    `- 최대 오차: ${maxV(session.engineReport.cueErrors).toFixed(1)} ms`,
    `- 드롭 프레임: ${session.engineReport.dropCount} (max ${session.engineReport.maxDropMs.toFixed(1)} ms)`,
    `- 종료 사유: ${session.engineReport.reason}`,
    ''
  ].join('\n')

  return `${front}\n\n${body}`
}

export function studentLogMarkdown(student: Student, sessions: Session[]): string {
  const recent = sessions
    .filter((s) => s.studentIds.includes(student.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const front = [
    '---',
    `title: "${student.anonymousLabel} 누적 기록"`,
    'type: student-log',
    'domains: [교육, 안구운동, 학생기록]',
    `student: "${student.anonymousLabel}"`,
    `grade: ${student.grade}`,
    'related:',
    `  - "${PROGRAM_LINK}"`,
    '---'
  ].join('\n')

  const body = [
    `# ${student.anonymousLabel} 누적 기록`,
    '',
    `학년 ${student.grade} · 회기 ${recent.length}개${student.notes ? ' · ' + student.notes : ''}`,
    '',
    '## 회기 일지 (시간 역순)',
    '',
    recent.length === 0
      ? '_(기록된 회기 없음)_'
      : recent.map(renderStudentRow).join('\n\n')
  ].join('\n')

  return `${front}\n\n${body}\n`
}

function renderStudentRow(session: Session): string {
  const meta = findActivity(session.mode, session.activity)
  const label = meta?.label ?? session.activity
  const intensityLabel = INTENSITY_LABEL[session.intensity]
  const lines = [`### ${session.date} — ${session.activity} ${label} (${intensityLabel})`]
  if (session.selfReport) lines.push(`학생: ${session.selfReport}`)
  if (session.teacherComment) lines.push(`관찰: ${session.teacherComment}`)
  return lines.join('\n')
}

export async function exportZip(range: ExportRange = {}): Promise<Blob> {
  const [{ default: JSZip }, students, allSessions] = await Promise.all([
    import('jszip'),
    listStudents(),
    listSessions()
  ])
  const sessions = filterByRange(allSessions, range)

  const zip = new JSZip()
  const sessionDir = zip.folder('회기 일지')!
  for (const s of sessions) {
    const meta = findActivity(s.mode, s.activity)
    const safeLabel = (meta?.label ?? s.activity).replace(/[\\/:*?"<>|]/g, '-')
    sessionDir.file(`${s.date} 회기 일지 - ${s.activity} ${safeLabel}.md`, sessionMarkdown(s, students))
  }
  const studentDir = zip.folder('학생별')!
  for (const stu of students) {
    studentDir.file(`${stu.anonymousLabel} 누적 기록.md`, studentLogMarkdown(stu, sessions))
  }
  zip.file(
    'README.md',
    [
      `# 안구운동 훈련 회기 자료 (${rangeLabel(range)})`,
      '',
      `회기 ${sessions.length}개 · 학생 ${students.length}명`,
      '',
      `생성: ${new Date().toISOString()}`,
      '',
      '## 구성',
      '',
      '- `회기 일지/` — 회기 1건당 마크다운 파일 1개 (frontmatter 포함)',
      '- `학생별/` — 학생당 누적 기록 마크다운 파일 1개',
      '',
      '## 활용',
      '',
      '압축을 풀어 원하는 폴더에 두면 됩니다. 일반 텍스트/마크다운 편집기에서 그대로 열립니다.',
      '옵시디언 등에서는 frontmatter, `[[wikilink]]`, 태그가 자동 인식됩니다.',
      '운영 중인 vault가 있다면 vault 안의 적절한 위치(예: `안구운동/회기 일지/` 등)에 복사해 사용하세요.'
    ].join('\n')
  )

  return zip.generateAsync({ type: 'blob' })
}

export async function exportSnapshotJson(): Promise<{ filename: string; blob: Blob }> {
  const snap = await exportSnapshot()
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
  return { filename: `saccade-trainer-snapshot-${snap.exportedAt.slice(0, 10)}.json`, blob }
}

export async function importSnapshotFromFile(file: File, mode: 'merge' | 'replace'): Promise<void> {
  const text = await file.text()
  const snap = JSON.parse(text)
  if (snap.version !== 1) throw new Error(`지원하지 않는 스냅샷 버전: ${snap.version}`)
  await importSnapshot(snap, mode)
}

function renderStudentLabel(ids: string[], students: Student[]): string {
  if (ids.length === 0) return '학급 전체'
  return ids
    .map((id) => students.find((s) => s.id === id)?.anonymousLabel ?? `(삭제된 학생: ${id.slice(0, 8)})`)
    .join(', ')
}

function filterByRange(sessions: Session[], range: ExportRange): Session[] {
  return sessions.filter((s) => {
    if (range.fromDate && s.date < range.fromDate) return false
    if (range.toDate && s.date > range.toDate) return false
    return true
  })
}

function rangeLabel(range: ExportRange): string {
  if (!range.fromDate && !range.toDate) return '전체'
  return `${range.fromDate ?? '~'} ~ ${range.toDate ?? '~'}`
}

function formatDateTime(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16)
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function maxV(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => (a > b ? a : b), 0)
}
