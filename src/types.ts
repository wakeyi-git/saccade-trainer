export type Mode = 'A' | 'B' | 'C'

export type Intensity = 'low' | 'medium' | 'high'

export type Phase = 0 | 1 | 2 | 3 | 4

export type Track = 'A' | 'B'

export type ActivityOpts = {
  intensity: Intensity
  durationMs: number
  signal: AbortSignal
  timeScale?: number
}

export type ActivityRunner = (root: HTMLElement, opts: ActivityOpts) => Promise<EngineReport>

export type EngineReport = {
  dropCount: number
  maxDropMs: number
  cueErrors: number[]
  reason: StopReason
}

export type StopReason = 'completed' | 'esc' | 'visibility' | 'error'

export type Student = {
  id: string                 // crypto.randomUUID()
  anonymousLabel: string     // "학생 1", "학생 A" — 실명 입력 금지
  grade: number              // 학년
  notes: string              // 사전 메모 (실명 금지)
  registeredAt: string       // ISO8601
}

export type Session = {
  id: string                 // crypto.randomUUID()
  date: string               // YYYY-MM-DD
  createdAt: string          // ISO8601
  mode: Mode
  activity: string           // 'A1' | 'A2' | ...
  intensity: Intensity
  durationMs: number
  studentIds: string[]       // 빈 배열이면 학급 전체
  phase: Phase
  track: Track
  selfReport: string         // 학생 1줄
  teacherComment: string     // 교사 1줄
  engineReport: EngineReport
}

export type Settings = {
  defaultPhase: Phase
  defaultTrack: Track
  autoBackup: boolean        // 회기 저장 시 JSON 자동 다운로드
}

export const DEFAULT_SETTINGS: Settings = {
  defaultPhase: 1,
  defaultTrack: 'A',
  autoBackup: true
}
