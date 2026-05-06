import { ACTIVITIES, INTENSITY_LABEL } from '../activities'
import { getSettings, listParagraphs, listStudents } from '../storage'
import type { Intensity, Paragraph, Phase, Student, Track } from '../types'

export function renderTeacherConsole(root: HTMLElement): () => void {
  let cancelled = false
  const settings = getSettings()
  const state = {
    activityId: ACTIVITIES[0].id,
    intensity: ACTIVITIES[0].defaultIntensity as Intensity,
    duration: ACTIVITIES[0].defaultDurationSec,
    studentIds: [] as string[],
    phase: settings.defaultPhase as Phase,
    track: settings.defaultTrack as Track,
    paragraphId: '' as string,
    chunkSize: 2
  }

  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = '<h1>교사 콘솔</h1><p class="muted">불러오는 중…</p>'
  root.append(page)

  void load()

  async function load(): Promise<void> {
    const [students, paragraphs] = await Promise.all([listStudents(), listParagraphs()])
    if (cancelled) return
    page.innerHTML = renderHTML(students, paragraphs, state)
    bind(paragraphs)
  }

  function bind(paragraphs: Paragraph[]): void {
    const $activity = page.querySelector<HTMLSelectElement>('#f-activity')!
    const $intensity = page.querySelector<HTMLSelectElement>('#f-intensity')!
    const $duration = page.querySelector<HTMLInputElement>('#f-duration')!
    const $phase = page.querySelector<HTMLSelectElement>('#f-phase')!
    const $track = page.querySelector<HTMLSelectElement>('#f-track')!
    const $start = page.querySelector<HTMLAnchorElement>('#f-start')!
    const $desc = page.querySelector<HTMLSpanElement>('#f-desc')!
    const $paraField = page.querySelector<HTMLDivElement>('#f-paragraph-field')!
    const $paragraph = page.querySelector<HTMLSelectElement>('#f-paragraph')!
    const $chunkField = page.querySelector<HTMLDivElement>('#f-chunk-field')!
    const $chunk = page.querySelector<HTMLInputElement>('#f-chunk')!

    function metaOf(id: string) {
      return ACTIVITIES.find((a) => a.id === id)!
    }

    function refreshActivityOptions(): void {
      const meta = metaOf(state.activityId)
      $intensity.innerHTML = meta.intensities
        .map((i) => `<option value="${i}"${i === state.intensity ? ' selected' : ''}>${INTENSITY_LABEL[i]}</option>`)
        .join('')
      $duration.value = String(state.duration)
      $duration.placeholder = `10~600초 (권장 ${meta.recommendedDurations.join('/')}​초)`
      $desc.textContent = meta.description
      $paraField.style.display = meta.usesParagraph ? '' : 'none'
      $chunkField.style.display = meta.usesChunk ? '' : 'none'
    }

    function refreshStart(): void {
      const meta = metaOf(state.activityId)
      const params = new URLSearchParams()
      params.set('i', state.intensity)
      params.set('d', String(state.duration))
      if (state.studentIds.length > 0) params.set('s', state.studentIds.join(','))
      params.set('p', String(state.phase))
      params.set('tk', state.track)
      if (meta.usesParagraph && state.paragraphId) params.set('para', state.paragraphId)
      if (meta.usesChunk) params.set('chunk', String(state.chunkSize))
      $start.href = `#/run/${meta.mode}/${state.activityId}?${params.toString()}`
    }

    $activity.addEventListener('change', () => {
      state.activityId = $activity.value
      const meta = metaOf(state.activityId)
      if (!meta.intensities.includes(state.intensity)) state.intensity = meta.defaultIntensity
      state.duration = meta.defaultDurationSec
      refreshActivityOptions()
      refreshStart()
    })
    $intensity.addEventListener('change', () => {
      state.intensity = $intensity.value as Intensity
      refreshStart()
    })
    $duration.addEventListener('input', () => {
      const n = Number.parseInt($duration.value, 10)
      if (Number.isFinite(n) && n > 0) state.duration = Math.min(Math.max(n, 1), 600)
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
    $paragraph.addEventListener('change', () => {
      state.paragraphId = $paragraph.value
      refreshStart()
    })
    $chunk.addEventListener('input', () => {
      const n = Number.parseInt($chunk.value, 10)
      if (Number.isFinite(n) && n >= 1) state.chunkSize = Math.min(n, 5)
      refreshStart()
    })

    page.querySelectorAll<HTMLInputElement>('.f-student').forEach((cb) => {
      cb.addEventListener('change', () => {
        const checked = page.querySelectorAll<HTMLInputElement>('.f-student:checked')
        state.studentIds = Array.from(checked).map((el) => el.value)
        refreshStart()
      })
    })

    void paragraphs
    refreshActivityOptions()
    refreshStart()
  }

  return () => {
    cancelled = true
  }
}

function renderHTML(
  students: Student[],
  paragraphs: Paragraph[],
  state: { activityId: string; phase: Phase; track: Track; chunkSize: number }
): string {
  return `
    <h1>교사 콘솔</h1>
    <p class="muted">M3+: 시간을 직접 입력합니다. 단락 사용 활동에서는 풀에서 본문을 선택할 수 있습니다.</p>

    <div class="field">
      <label for="f-activity">활동</label>
      <select id="f-activity">
        ${renderActivityOptions(state.activityId)}
      </select>
      <span id="f-desc" class="muted"></span>
    </div>

    <div class="field"><label for="f-intensity">강도</label><select id="f-intensity"></select></div>

    <div class="field">
      <label for="f-duration">시간 (초)</label>
      <input id="f-duration" type="number" min="10" max="600" step="5" />
    </div>

    <div class="field" id="f-paragraph-field">
      <label for="f-paragraph">본문 단락</label>
      <select id="f-paragraph">
        <option value="">기본 (빌트인 첫 단락)</option>
        ${paragraphs
          .map(
            (p) => `<option value="${p.id}">[${p.source === 'builtin' ? '빌트인' : '교사'}] ${escapeHtml(p.title)}</option>`
          )
          .join('')}
      </select>
    </div>

    <div class="field" id="f-chunk-field">
      <label for="f-chunk">청킹 단어 수 (1~5)</label>
      <input id="f-chunk" type="number" min="1" max="5" step="1" value="${state.chunkSize}" />
      <span class="muted">의미 단위 묶음 크기. 향후 AI 연동 시 자동 의미 청킹으로 확장 예정.</span>
    </div>

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

function renderActivityOptions(selected: string): string {
  const groups: Record<string, string> = {
    A: 'A · Saccade Trainer',
    B: 'B · Mode-Switch Trainer',
    C: 'C · Fixation Builder'
  }
  return Object.entries(groups)
    .map(([mode, label]) => {
      const opts = ACTIVITIES.filter((a) => a.mode === mode)
        .map(
          (a) =>
            `<option value="${a.id}"${a.id === selected ? ' selected' : ''}>${a.id} · ${a.label}</option>`
        )
        .join('')
      return `<optgroup label="${label}">${opts}</optgroup>`
    })
    .join('')
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
