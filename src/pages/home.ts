export function renderHome(root: HTMLElement): void {
  root.innerHTML = `
    <div class="page">
      <h1>Saccade Trainer</h1>
      <p class="muted">디지털네이티브 안구운동 훈련 도구 — v0.1 (M2)</p>
      <div class="btn-row">
        <a class="btn btn--primary btn--lg" href="#/teacher">교사 콘솔 ▶</a>
        <a class="btn btn--lg" href="#/setup">설정</a>
        <a class="btn btn--lg" href="#/export">내보내기</a>
      </div>
      <p class="muted">학생 등록·회기 운영·자기보고 입력·옵시디언 마크다운 내보내기를 지원합니다. ESC로 회기 종료.</p>
    </div>
  `
}
