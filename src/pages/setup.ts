import { deleteStudent, getSettings, listStudents, putSettings, putStudent } from '../storage'
import type { Phase, Student, Track } from '../types'

const NAME_PATTERN = /^학생\s?[A-Z0-9가-힣]{1,4}$/

export function renderSetup(root: HTMLElement): () => void {
  let cancelled = false
  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = '<h1>설정</h1><p class="muted">불러오는 중…</p>'
  root.append(page)

  void load()
  return () => {
    cancelled = true
  }

  async function load(): Promise<void> {
    const students = await listStudents()
    const settings = getSettings()
    if (cancelled) return
    page.innerHTML = renderHTML(students, settings.defaultPhase, settings.defaultTrack, settings.autoBackup)
    bind()
    renderList(await listStudents())
  }

  function bind(): void {
    const $add = page.querySelector<HTMLButtonElement>('#s-add')!
    const $label = page.querySelector<HTMLInputElement>('#s-label')!
    const $grade = page.querySelector<HTMLInputElement>('#s-grade')!
    const $notes = page.querySelector<HTMLInputElement>('#s-notes')!
    const $msg = page.querySelector<HTMLSpanElement>('#s-msg')!

    $add.addEventListener('click', async () => {
      const label = $label.value.trim()
      if (!NAME_PATTERN.test(label)) {
        $msg.textContent = '익명 라벨 형식만 허용됩니다 (예: "학생 1", "학생 A").'
        return
      }
      const grade = Number.parseInt($grade.value, 10) || 3
      const student: Student = {
        id: crypto.randomUUID(),
        anonymousLabel: label,
        grade,
        notes: $notes.value.trim(),
        registeredAt: new Date().toISOString()
      }
      await putStudent(student)
      $label.value = ''
      $notes.value = ''
      $msg.textContent = ''
      renderList(await listStudents())
    })

    const $phase = page.querySelector<HTMLSelectElement>('#s-phase')!
    const $track = page.querySelector<HTMLSelectElement>('#s-track')!
    const $auto = page.querySelector<HTMLInputElement>('#s-auto')!
    $phase.addEventListener('change', () => {
      putSettings({ defaultPhase: Number.parseInt($phase.value, 10) as Phase })
    })
    $track.addEventListener('change', () => {
      putSettings({ defaultTrack: $track.value as Track })
    })
    $auto.addEventListener('change', () => {
      putSettings({ autoBackup: $auto.checked })
    })
  }

  function renderList(students: Student[]): void {
    const $list = page.querySelector<HTMLDivElement>('#s-list')!
    if (students.length === 0) {
      $list.innerHTML = '<p class="muted">등록된 학생이 없습니다.</p>'
      return
    }
    $list.innerHTML = `
      <table class="report-table" style="width:100%">
        <thead>
          <tr><th align="left">라벨</th><th>학년</th><th align="left">메모</th><th>등록일</th><th></th></tr>
        </thead>
        <tbody>
          ${students
            .map(
              (s) => `
            <tr data-id="${s.id}">
              <td>${escapeHtml(s.anonymousLabel)}</td>
              <td>${s.grade}</td>
              <td>${escapeHtml(s.notes)}</td>
              <td class="muted">${s.registeredAt.slice(0, 10)}</td>
              <td><button class="btn s-del" data-id="${s.id}">삭제</button></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    $list.querySelectorAll<HTMLButtonElement>('.s-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset['id']!
        if (!confirm('삭제하면 회기 기록의 학생 매핑도 끊깁니다. 계속할까요?')) return
        await deleteStudent(id)
        renderList(await listStudents())
      })
    })
  }
}

function renderHTML(students: Student[], phase: Phase, track: Track, autoBackup: boolean): string {
  void students // 초기 비어 있고 renderList가 채움
  return `
    <h1>설정</h1>

    <h2>학생 등록 (익명 ID)</h2>
    <p class="muted">실명을 입력하지 마세요. "학생 1", "학생 A" 같은 익명 라벨만 허용됩니다.</p>
    <div class="field">
      <label>새 학생 추가</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input id="s-label" placeholder="학생 1" style="flex:1; min-width:120px;" />
        <input id="s-grade" type="number" min="1" max="6" value="3" style="width:80px;" title="학년" />
        <input id="s-notes" placeholder="메모(선택)" style="flex:2; min-width:160px;" />
        <button id="s-add" class="btn btn--primary">추가</button>
      </div>
      <span id="s-msg" class="muted"></span>
    </div>

    <div id="s-list"></div>

    <h2>기본 회기 옵션</h2>
    <div class="field">
      <label for="s-phase">기본 Phase</label>
      <select id="s-phase">
        ${[0, 1, 2, 3, 4]
          .map((p) => `<option value="${p}"${p === phase ? ' selected' : ''}>${p}</option>`)
          .join('')}
      </select>
    </div>
    <div class="field">
      <label for="s-track">기본 Track</label>
      <select id="s-track">
        <option value="A"${track === 'A' ? ' selected' : ''}>A · 학급 루틴</option>
        <option value="B"${track === 'B' ? ' selected' : ''}>B · 개별 지원</option>
      </select>
    </div>
    <div class="field">
      <label><input id="s-auto" type="checkbox"${autoBackup ? ' checked' : ''} /> 회기 저장 시 JSON 자동 백업 다운로드</label>
    </div>

    <div class="btn-row">
      <a class="btn" href="#/teacher">콘솔</a>
      <a class="btn" href="#/export">내보내기</a>
      <a class="btn" href="#/">홈</a>
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
