import {
  deleteParagraph,
  deleteStudent,
  getSettings,
  listParagraphs,
  listStudents,
  putParagraph,
  putSettings,
  putStudent
} from '../storage'
import type { Paragraph, Phase, Student, Track } from '../types'

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
    const [students, paragraphs, settings] = await Promise.all([
      listStudents(),
      listParagraphs(),
      Promise.resolve(getSettings())
    ])
    if (cancelled) return
    page.innerHTML = renderHTML(
      students,
      paragraphs,
      settings.defaultPhase,
      settings.defaultTrack,
      settings.autoBackup,
      settings.soundCues
    )
    bindStudent()
    bindParagraph()
    bindSettings()
    refreshStudentList(students)
    refreshParagraphList(paragraphs)
  }

  function bindStudent(): void {
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
      refreshStudentList(await listStudents())
    })
  }

  function bindParagraph(): void {
    const $title = page.querySelector<HTMLInputElement>('#p-title')!
    const $text = page.querySelector<HTMLTextAreaElement>('#p-text')!
    const $grade = page.querySelector<HTMLInputElement>('#p-grade')!
    const $add = page.querySelector<HTMLButtonElement>('#p-add')!
    const $msg = page.querySelector<HTMLSpanElement>('#p-msg')!

    $add.addEventListener('click', async () => {
      const title = $title.value.trim()
      const text = $text.value.trim()
      if (title.length === 0 || text.length === 0) {
        $msg.textContent = '제목과 본문을 모두 입력하세요.'
        return
      }
      const para: Paragraph = {
        id: crypto.randomUUID(),
        title,
        text,
        grade: Number.parseInt($grade.value, 10) || 3,
        source: 'teacher',
        createdAt: new Date().toISOString()
      }
      await putParagraph(para)
      $title.value = ''
      $text.value = ''
      $msg.textContent = ''
      refreshParagraphList(await listParagraphs())
    })
  }

  function bindSettings(): void {
    const $phase = page.querySelector<HTMLSelectElement>('#s-phase')!
    const $track = page.querySelector<HTMLSelectElement>('#s-track')!
    const $auto = page.querySelector<HTMLInputElement>('#s-auto')!
    const $sound = page.querySelector<HTMLInputElement>('#s-sound')!
    $phase.addEventListener('change', () => {
      putSettings({ defaultPhase: Number.parseInt($phase.value, 10) as Phase })
    })
    $track.addEventListener('change', () => {
      putSettings({ defaultTrack: $track.value as Track })
    })
    $auto.addEventListener('change', () => {
      putSettings({ autoBackup: $auto.checked })
    })
    $sound.addEventListener('change', () => {
      putSettings({ soundCues: $sound.checked })
    })
  }

  function refreshStudentList(students: Student[]): void {
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
        refreshStudentList(await listStudents())
      })
    })
  }

  function refreshParagraphList(paragraphs: Paragraph[]): void {
    const $list = page.querySelector<HTMLDivElement>('#p-list')!
    $list.innerHTML = `
      <table class="report-table" style="width:100%">
        <thead>
          <tr><th align="left">제목</th><th>학년</th><th align="left">본문</th><th>출처</th><th></th></tr>
        </thead>
        <tbody>
          ${paragraphs
            .map(
              (p) => `
            <tr>
              <td>${escapeHtml(p.title)}</td>
              <td>${p.grade}</td>
              <td class="muted" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${escapeHtml(p.text)}
              </td>
              <td class="muted">${p.source === 'builtin' ? '빌트인' : '교사'}</td>
              <td>${p.source === 'teacher' ? `<button class="btn p-del" data-id="${p.id}">삭제</button>` : ''}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    $list.querySelectorAll<HTMLButtonElement>('.p-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset['id']!
        if (!confirm('이 단락을 삭제할까요? 이미 사용한 회기 기록에는 영향 없습니다.')) return
        await deleteParagraph(id)
        refreshParagraphList(await listParagraphs())
      })
    })
  }
}

function renderHTML(
  students: Student[],
  paragraphs: Paragraph[],
  phase: Phase,
  track: Track,
  autoBackup: boolean,
  soundCues: boolean
): string {
  void students
  void paragraphs
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

    <h2>본문 단락 풀</h2>
    <p class="muted">B1·B3·C2·A5 활동에서 사용합니다. 빌트인 외에 교사가 단락을 추가할 수 있습니다 (한 단락 60~200자 권장).</p>
    <div class="field">
      <label>새 단락 추가</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input id="p-title" placeholder="제목" style="flex:1; min-width:160px;" />
        <input id="p-grade" type="number" min="1" max="6" value="3" style="width:80px;" title="학년" />
      </div>
      <textarea id="p-text" rows="3" placeholder="본문 (한 단락)"></textarea>
      <div class="btn-row" style="margin-top:8px;">
        <button id="p-add" class="btn btn--primary">단락 추가</button>
        <span id="p-msg" class="muted"></span>
      </div>
    </div>
    <div id="p-list"></div>

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
    <div class="field">
      <label><input id="s-sound" type="checkbox"${soundCues ? ' checked' : ''} /> 모드 B 신호음 사용 (옆 반 방해 시 끄기)</label>
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
