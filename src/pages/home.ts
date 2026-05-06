export function renderHome(root: HTMLElement): void {
  root.innerHTML = `
    <div class="page">
      <h1>Saccade Trainer</h1>
      <p class="muted">디지털네이티브 안구운동 훈련 도구 — v0.1 (M0)</p>
      <div class="btn-row">
        <a class="btn btn--primary btn--lg" href="#/teacher">교사 콘솔</a>
        <a class="btn btn--lg" href="#/run/A/A1">A1 두 점 점프 바로 시작</a>
      </div>
      <p class="muted">M0 단계: 모드 A의 A1 활동만 동작합니다. ESC로 언제든 종료.</p>
    </div>
  `
}
