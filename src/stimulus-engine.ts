import type { EngineReport, StopReason } from './types'

export type FrameContext = {
  frameIndex: number
  elapsedMs: number
  deltaMs: number
  dropped: boolean
}

export type Cue<T = unknown> = { atMs: number; payload: T }

type FrameCb = (ctx: FrameContext) => void
type CueCb<T = unknown> = (cue: Cue<T>, actualMs: number) => void

const FRAME_BUDGET_MS = 1000 / 60
const DROP_THRESHOLD_MS = FRAME_BUDGET_MS * 1.5

export class StimulusEngine<T = unknown> {
  private rafId = 0
  private startedAt = 0
  private lastFrameAt = 0
  private frameIndex = 0
  private dropCount = 0
  private maxDropMs = 0
  private cueErrors: number[] = []
  private cuesPending: Cue<T>[] = []
  private durationMs = 0
  private running = false
  private stopReason: StopReason = 'completed'
  private resolve: ((r: EngineReport) => void) | null = null
  private frameCbs: FrameCb[] = []
  private cueCbs: CueCb<T>[] = []
  private visibilityHandler = () => {
    if (document.visibilityState === 'hidden' && this.running) {
      this.stop('visibility')
    }
  }

  onFrame(cb: FrameCb): () => void {
    this.frameCbs.push(cb)
    return () => {
      const i = this.frameCbs.indexOf(cb)
      if (i >= 0) this.frameCbs.splice(i, 1)
    }
  }

  onCue(cb: CueCb<T>): () => void {
    this.cueCbs.push(cb)
    return () => {
      const i = this.cueCbs.indexOf(cb)
      if (i >= 0) this.cueCbs.splice(i, 1)
    }
  }

  start(opts: { durationMs: number; cues?: Cue<T>[] }): Promise<EngineReport> {
    if (this.running) throw new Error('engine already running')
    this.running = true
    this.durationMs = opts.durationMs
    this.cuesPending = (opts.cues ?? []).slice().sort((a, b) => a.atMs - b.atMs)
    this.startedAt = performance.now()
    this.lastFrameAt = this.startedAt
    this.frameIndex = 0
    this.dropCount = 0
    this.maxDropMs = 0
    this.cueErrors = []
    this.stopReason = 'completed'
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.rafId = requestAnimationFrame(this.tick)
    return new Promise<EngineReport>((res) => {
      this.resolve = res
    })
  }

  stop(reason: StopReason = 'completed'): void {
    if (!this.running) return
    this.running = false
    this.stopReason = reason
    cancelAnimationFrame(this.rafId)
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.frameCbs = []
    this.cueCbs = []
    if (this.resolve) {
      this.resolve(this.getReport())
      this.resolve = null
    }
  }

  getReport(): EngineReport {
    return {
      dropCount: this.dropCount,
      maxDropMs: this.maxDropMs,
      cueErrors: this.cueErrors.slice(),
      reason: this.stopReason
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return
    const elapsedMs = now - this.startedAt
    const deltaMs = now - this.lastFrameAt
    const dropped = deltaMs > DROP_THRESHOLD_MS
    if (dropped) {
      this.dropCount++
      if (deltaMs > this.maxDropMs) this.maxDropMs = deltaMs
    }
    this.lastFrameAt = now

    while (this.cuesPending.length > 0 && this.cuesPending[0].atMs <= elapsedMs) {
      const cue = this.cuesPending.shift()!
      const error = elapsedMs - cue.atMs
      this.cueErrors.push(error)
      for (const cb of this.cueCbs) cb(cue, elapsedMs)
    }

    const ctx: FrameContext = { frameIndex: this.frameIndex++, elapsedMs, deltaMs, dropped }
    for (const cb of this.frameCbs) cb(ctx)

    if (elapsedMs >= this.durationMs) {
      this.stop('completed')
      return
    }
    this.rafId = requestAnimationFrame(this.tick)
  }
}
