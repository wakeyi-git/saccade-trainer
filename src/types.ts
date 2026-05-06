export type Mode = 'A' | 'B' | 'C'

export type Intensity = 'low' | 'medium' | 'high'

export type ActivityOpts = {
  intensity: Intensity
  durationMs: number
  signal: AbortSignal
  timeScale?: number   // 기본 1, 테스트용 가속 (예: 10이면 60초→6초 벽시계)
}

export type ActivityRunner = (root: HTMLElement, opts: ActivityOpts) => Promise<EngineReport>

export type EngineReport = {
  dropCount: number
  maxDropMs: number
  cueErrors: number[]
  reason: StopReason
}

export type StopReason = 'completed' | 'esc' | 'visibility' | 'error'
