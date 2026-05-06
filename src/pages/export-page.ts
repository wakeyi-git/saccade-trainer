import { downloadBlob } from '../auto-backup'
import { exportSnapshotJson, exportZip, importSnapshotFromFile } from '../export'
import { listSessions } from '../storage'

export function renderExport(root: HTMLElement): () => void {
  let cancelled = false
  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = '<h1>내보내기</h1><p class="muted">불러오는 중…</p>'
  root.append(page)

  void load()
  return () => {
    cancelled = true
  }

  async function load(): Promise<void> {
    const sessions = await listSessions()
    if (cancelled) return
    const totalCount = sessions.length
    const dates = sessions.map((s) => s.date).sort()
    const oldest = dates[0]
    const newest = dates[dates.length - 1]
    page.innerHTML = renderHTML(totalCount, oldest, newest)
    bind()
  }

  function bind(): void {
    const $from = page.querySelector<HTMLInputElement>('#x-from')!
    const $to = page.querySelector<HTMLInputElement>('#x-to')!
    const $zip = page.querySelector<HTMLButtonElement>('#x-zip')!
    const $snap = page.querySelector<HTMLButtonElement>('#x-snap')!
    const $msg = page.querySelector<HTMLDivElement>('#x-msg')!
    const $importFile = page.querySelector<HTMLInputElement>('#x-import-file')!
    const $importMode = page.querySelector<HTMLSelectElement>('#x-import-mode')!
    const $importBtn = page.querySelector<HTMLButtonElement>('#x-import-btn')!

    $zip.addEventListener('click', async () => {
      $zip.disabled = true
      $msg.textContent = 'zip 생성 중…'
      try {
        const blob = await exportZip({
          fromDate: $from.value || undefined,
          toDate: $to.value || undefined
        })
        const fname = `saccade-trainer-md-${new Date().toISOString().slice(0, 10)}.zip`
        downloadBlob(fname, blob)
        $msg.textContent = `${fname} 다운로드 완료.`
      } catch (e) {
        $msg.textContent = `오류: ${String(e)}`
      } finally {
        $zip.disabled = false
      }
    })

    $snap.addEventListener('click', async () => {
      $snap.disabled = true
      $msg.textContent = '스냅샷 생성 중…'
      try {
        const { filename, blob } = await exportSnapshotJson()
        downloadBlob(filename, blob)
        $msg.textContent = `${filename} 다운로드 완료.`
      } catch (e) {
        $msg.textContent = `오류: ${String(e)}`
      } finally {
        $snap.disabled = false
      }
    })

    $importBtn.addEventListener('click', async () => {
      const f = $importFile.files?.[0]
      if (!f) {
        $msg.textContent = '복원할 JSON 파일을 선택하세요.'
        return
      }
      const mode = $importMode.value as 'merge' | 'replace'
      if (mode === 'replace' && !confirm('덮어쓰기는 기존 데이터를 모두 지웁니다. 계속할까요?')) return
      $importBtn.disabled = true
      $msg.textContent = '복원 중…'
      try {
        await importSnapshotFromFile(f, mode)
        $msg.textContent = '복원 완료. 페이지를 새로고침하세요.'
      } catch (e) {
        $msg.textContent = `오류: ${String(e)}`
      } finally {
        $importBtn.disabled = false
      }
    })
  }
}

function renderHTML(total: number, oldest?: string, newest?: string): string {
  return `
    <h1>내보내기</h1>
    <p class="muted">회기 ${total}개${oldest ? ` (${oldest} ~ ${newest})` : ''}</p>

    <h2>옵시디언 마크다운 (zip)</h2>
    <p class="muted">회기 일지·학생 누적 기록을 옵시디언 형식으로 묶어서 다운로드합니다.</p>
    <div class="field">
      <label>기간 필터 (선택)</label>
      <div style="display:flex; gap:8px; align-items:center;">
        <input id="x-from" type="date" />
        <span class="muted">~</span>
        <input id="x-to" type="date" />
      </div>
    </div>
    <div class="btn-row">
      <button id="x-zip" class="btn btn--primary">마크다운 zip 다운로드</button>
    </div>

    <h2>스냅샷 (JSON)</h2>
    <p class="muted">학생·회기·설정 전체를 JSON으로 백업합니다. 학교 PC 교체·복구용.</p>
    <div class="btn-row">
      <button id="x-snap" class="btn">JSON 스냅샷 다운로드</button>
    </div>

    <h2>복원</h2>
    <div class="field">
      <label for="x-import-file">JSON 파일</label>
      <input id="x-import-file" type="file" accept="application/json" />
    </div>
    <div class="field">
      <label for="x-import-mode">방식</label>
      <select id="x-import-mode">
        <option value="merge">병합 (기존 데이터 유지)</option>
        <option value="replace">덮어쓰기 (기존 데이터 삭제)</option>
      </select>
    </div>
    <div class="btn-row">
      <button id="x-import-btn" class="btn">복원</button>
    </div>

    <div id="x-msg" class="muted" style="margin-top:16px;"></div>

    <div class="btn-row">
      <a class="btn" href="#/teacher">콘솔</a>
      <a class="btn" href="#/setup">설정</a>
      <a class="btn" href="#/">홈</a>
    </div>
  `
}
