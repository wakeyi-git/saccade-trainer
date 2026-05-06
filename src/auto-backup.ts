import type { Session } from './types'

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function downloadBlob(filename: string, blob: Blob): void {
  triggerDownload(blob, filename)
}

export function backupSession(session: Session): void {
  const safeDate = session.date.replace(/-/g, '')
  const filename = `session-${safeDate}-${session.activity}-${session.id.slice(0, 8)}.json`
  downloadJson(filename, session)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 100)
}
