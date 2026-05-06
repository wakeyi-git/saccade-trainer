import { ACTIVITIES, INTENSITY_LABEL, findActivity } from '../activities'
import { getSettings, listStudents } from '../storage'
import type { Intensity, Phase, Student, Track } from '../types'

export function renderTeacherConsole(root: HTMLElement): () => void {
  let cancelled = false
  const settings = getSettings()
  const state = {
    activityId: ACTIVITIES[0].id,
    intensity: ACTIVITIES[0].defaultIntensity as Intensity,
    duration: ACTIVITIES[0].defaultDuration,
    studentIds: [] as string[],
    phase: settings.defaultPhase as Phase,
    track: settings.defaultTrack as Track
  }

  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = '<h1>교사 콘솔</h1><p class="muted">불러오는 중…</p>'
  root.append(page)

  void load()

  async function load(): Promise<void> {
    const students = await listStudents()
    if (cancelled) return
    page.innerHTML = renderHTML(students, state)
    bind(students)
  }

  function bind(students: Student[]): void {
    const $activity = page.querySelector<HTMLSelectElement>('#f-activity')!
    const $intensity = page.querySelector<HTMLSelectElement>('#f-intensity')!
    const $duration = page.querySelector<HTMLSelectElement>('#f-duration')!
    const $phase = page.querySelector<HTMLSelectElement>('#f-phase')!
    const $track = page.querySelector<HTMLSelectElement>('#f-track')!
    const $start = page.querySelector<HTMLAnchorElement>('#f-start')!
    const $desc = page.querySelector<HTMLSpanElement>('#f-desc')!

    function refreshOptions(): void {
      const meta = findActivity('A', state.activityId)!
      $intensity.innerHTML = meta.intensities
        .map((i) => `<option value="${i}"${i === state.intensity ? ' selected' : ''}>${INTENSITY_LABEL[i]}</option>`)
        .join('')
      $duration.innerHTML = meta.durations
        .map((d) => `<option value="${d}"${d === state.duration ? ' selected' : ''}>${d}초</option>`)
        .join('')
      $desc.textContent = meta.description
    }

    function refreshStart(): void {
      const params = new URLSearchParams()
      params.set('i', state.intensity)
      params.set('d', String(state.duration))
      if (state.studentIds.length > 0) params.set('s', state.studentIds.join(','))
      params.set('p', String(state.phase))
      params.set('tk', state.track)
      $start.href = `#/run/A/${state.activityId}?${params.toString()}`
    }

    $activity.addEventListener('change', () => {
      state.activityId = $activity.value
      const meta = findActivity('A', state.activityId)!
      if (!meta.intensities.includes(state.intensity)) state.intensity = meta.defaultIntensity
      if (!meta.durations.includes(state.duration)) state.duration = meta.defaultDuration
      refreshOptions()
      refreshStart()
    })
    $intensity.addEventListener('change', () => {
      state.intensity = $intensity.value as Intensity
      refreshStart()
    })
    $duration.addEventListener('change', () => {
      state.duration = Number.parseInt($duration.value, 10)
      refreshStart()
    })
    $phase.addEventListener('change', () => {
      state.phase = Number.parseInt($phase.value, 10) as Phase
      refreshStart()
    })
    $track.addEventListener('change', () => {
      state.track = $track.value as Track
      refreshStart()
    })

    page.querySelectorAll<HTMLInputElement>('.f-student').forEach((cb) => {
      cb.addEventListener('change', () => {
        const checked = page.querySelectorAll<HTMLInputElement>('.f-student:checked')
        state.studentIds = Array.from(checked).map((el) => el.value)
        refreshStart()
      })
    })

    void students
    refreshOptions()
    refreshStart()
  }

  return () => {
    cancelled = true
  }
}

function renderHTML(students: Student[], state: { activityId: string; phase: Phase; track: Track }): string {
  return `
    <h1>교사 콘솔</h1>
    <p class="muted">M2: 회기 종료 후 자기보고·관찰 1줄을 입력해 저장합니다. 자동 백업 JSON이 다운로드됩니다.</p>

    <div class="field">
      <label for="f-activity">활동</label>
      <select id="f-activity">
        ${ACTIVITIES.map(
          (a) => `<option value="${a.id}"${a.id === state.activityId ? ' selected' : ''}>${a.id} · ${a.label}</option>`
        ).join('')}
      </select>
      <span id="f-desc" class="muted"></span>
    </div>

    <div class="field"><label for="f-intensity">강도</label><select id="f-intensity"></select></div>
    <div class="field"><label for="f-duration">시간</label><select id="f-duration"></select></div>

    <div class="field">
      <label for="f-phase">Phase</label>
      <select id="f-phase">
        ${[0, 1, 2, 3, 4]
          .map((p) => `<option value="${p}"${p === state.phase ? ' selected' : ''}>${p}</option>`)
          .join('')}
      </select>
    </div>

    <div class="field">
      <label for="f-track">Track</label>
      <select id="f-track">
        <option value="A"${state.track === 'A' ? ' selected' : ''}>A · 학급 루틴</option>
        <option value="B"${state.track === 'B' ? ' selected' : ''}>B · 개별 지원</option>
      </select>
    </div>

    <div class="field">
      <label>대상 (선택 안 하면 학급 전체)</label>
      ${
        students.length === 0
          ? '<p class="muted">등록된 학생이 없습니다. <a href="#/setup">설정</a>에서 등록하세요.</p>'
          : `<div class="checkbox-list">
              ${students
                .map(
                  (s) => `
                <label class="checkbox-list__item">
                  <input class="f-student" type="checkbox" value="${s.id}" />
                  <span>${escapeHtml(s.anonymousLabel)} <span class="muted">(${s.grade}학년)</span></span>
                </label>
              `
                )
                .join('')}
            </div>`
      }
    </div>

    <div class="btn-row">
      <a id="f-start" class="btn btn--primary btn--lg" href="#/run/A/A1">회기 시작 ▶</a>
      <a class="btn" href="#/setup">설정</a>
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
