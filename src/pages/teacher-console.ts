export function renderTeacherConsole(root: HTMLElement): void {
  root.innerHTML = `
    <div class="page">
      <h1>교사 콘솔</h1>
      <p class="muted">M0 단계는 A1 활동·강도 보통·60초 고정. 강도/시간 선택은 M1에서 추가됩니다.</p>

      <div class="field">
        <label>모드</label>
        <select disabled><option>A · Saccade Trainer</option></select>
      </div>

      <div class="field">
        <label>활동</label>
        <select disabled><option>A1 · 두 점 점프</option></select>
      </div>

      <div class="field">
        <label>강도</label>
        <select disabled><option>보통 (간격 60%, 주기 1.2s)</option></select>
      </div>

      <div class="field">
        <label>시간</label>
        <select disabled><option>60초</option></select>
      </div>

      <div class="btn-row">
        <a class="btn btn--primary btn--lg" href="#/run/A/A1">회기 시작 ▶</a>
        <a class="btn" href="#/">홈</a>
      </div>
    </div>
  `
}
