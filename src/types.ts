export type Mode = 'A' | 'B' | 'C'

export type Intensity = 'low' | 'medium' | 'high'

export type ActivityRunner = (
  root: HTMLElement,
  opts: { intensity: Intensity; durationMs: number; signal: AbortSignal }
) => Promise<EngineReport>

export type EngineReport = {
  dropCount: number
  maxDropMs: number
  cueErrors: number[]
  reason: StopReason
}

export type StopReason = 'completed' | 'esc' | 'visibility' | 'error'
