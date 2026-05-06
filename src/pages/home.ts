export function renderHome(root: HTMLElement): void {
  root.innerHTML = `
    <div class="page">
      <h1>Saccade Trainer</h1>
      <p class="muted">디지털네이티브 안구운동 훈련 도구 — v0.1 (M1)</p>
      <div class="btn-row">
        <a class="btn btn--primary btn--lg" href="#/teacher">교사 콘솔 ▶</a>
      </div>
      <p class="muted">콘솔에서 모드 A의 4개 활동·강도·시간을 선택해 회기를 시작합니다. ESC로 언제든 종료.</p>
    </div>
  `
}
