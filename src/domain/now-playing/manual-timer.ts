export type TimerClock = () => number

export class ManualTimer {
  private readonly clock: TimerClock
  private elapsedMilliseconds = 0
  private startedAt: number | undefined

  constructor(clock: TimerClock = () => performance.now()) {
    this.clock = clock
  }

  play(): void {
    if (this.isPlaying()) return
    this.startedAt = this.clock()
  }

  pause(): void {
    if (!this.isPlaying()) return
    this.elapsedMilliseconds = this.getElapsedMilliseconds()
    this.startedAt = undefined
  }

  reset(): void {
    this.elapsedMilliseconds = 0
    this.startedAt = undefined
  }

  seek(seconds: number): void {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
    this.elapsedMilliseconds = safeSeconds * 1000

    if (this.isPlaying()) {
      this.startedAt = this.clock()
    }
  }

  getCurrentTime(): number {
    return Math.max(0, this.getElapsedMilliseconds() / 1000)
  }

  isPlaying(): boolean {
    return this.startedAt !== undefined
  }

  private getElapsedMilliseconds(): number {
    if (this.startedAt === undefined) return Math.max(0, this.elapsedMilliseconds)
    return Math.max(0, this.elapsedMilliseconds + this.clock() - this.startedAt)
  }
}
