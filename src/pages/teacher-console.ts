import { ACTIVITIES, INTENSITY_LABEL, findActivity } from '../activities'
import type { Intensity } from '../types'

export function renderTeacherConsole(root: HTMLElement): void {
  let activityId = ACTIVITIES[0].id
  let intensity: Intensity = ACTIVITIES[0].defaultIntensity
  let duration = ACTIVITIES[0].defaultDuration

  root.innerHTML = `
    <div class="page">
      <h1>교사 콘솔</h1>
      <p class="muted">M1: 모드 A의 4개 활동, 강도/시간 선택 가능. 기록 저장은 M2에서 추가됩니다.</p>

      <div class="field">
        <label for="f-activity">활동</label>
        <select id="f-activity">
          ${ACTIVITIES.map(
            (a) => `<option value="${a.id}">${a.id} · ${a.label}</option>`
          ).join('')}
        </select>
        <span id="f-desc" class="muted"></span>
      </div>

      <div class="field">
        <label for="f-intensity">강도</label>
        <select id="f-intensity"></select>
      </div>

      <div class="field">
        <label for="f-duration">시간</label>
        <select id="f-duration"></select>
      </div>

      <div class="btn-row">
        <a id="f-start" class="btn btn--primary btn--lg" href="#/run/A/A1">회기 시작 ▶</a>
        <a class="btn" href="#/">홈</a>
      </div>
    </div>
  `

  const $activity = root.querySelector<HTMLSelectElement>('#f-activity')!
  const $intensity = root.querySelector<HTMLSelectElement>('#f-intensity')!
  const $duration = root.querySelector<HTMLSelectElement>('#f-duration')!
  const $start = root.querySelector<HTMLAnchorElement>('#f-start')!
  const $desc = root.querySelector<HTMLSpanElement>('#f-desc')!

  function refreshOptions() {
    const meta = findActivity('A', activityId)!
    $intensity.innerHTML = meta.intensities
      .map((i) => `<option value="${i}"${i === intensity ? ' selected' : ''}>${INTENSITY_LABEL[i]}</option>`)
      .join('')
    $duration.innerHTML = meta.durations
      .map((d) => `<option value="${d}"${d === duration ? ' selected' : ''}>${d}초</option>`)
      .join('')
    $desc.textContent = meta.description
  }

  function refreshStart() {
    $start.href = `#/run/A/${activityId}?i=${intensity}&d=${duration}`
  }

  $activity.addEventListener('change', () => {
    activityId = $activity.value
    const meta = findActivity('A', activityId)!
    if (!meta.intensities.includes(intensity)) intensity = meta.defaultIntensity
    if (!meta.durations.includes(duration)) duration = meta.defaultDuration
    refreshOptions()
    refreshStart()
  })

  $intensity.addEventListener('change', () => {
    intensity = $intensity.value as Intensity
    refreshStart()
  })

  $duration.addEventListener('change', () => {
    duration = Number.parseInt($duration.value, 10)
    refreshStart()
  })

  refreshOptions()
  refreshStart()
}
