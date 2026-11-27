/**
 * Advances deterministic simulation ticks independently from render frames.
 * Large frame delays are bounded; inactive tabs discard their accumulated time.
 */
export class FixedStepClock {
  private accumulatedMs = 0;

  constructor(
    readonly stepDurationMs = 250,
    readonly maxStepsPerAdvance = 5
  ) {
    if (!Number.isFinite(stepDurationMs) || stepDurationMs <= 0) {
      throw new RangeError("Simulation step duration must be a positive finite number.");
    }
    if (!Number.isInteger(maxStepsPerAdvance) || maxStepsPerAdvance < 1) {
      throw new RangeError("Maximum steps per frame must be a positive whole number.");
    }
  }

  /**
   * onAcceptedTime runs before any simulation ticks and receives only the
   * newly accepted time after the frame-delay cap. Visual animation can use
   * this to stay synchronized without consuming time discarded by the clock.
   */
  advance(
    elapsedMs: number,
    canAdvance: boolean,
    onTick: () => void,
    onAcceptedTime?: (elapsedMs: number) => void
  ): number {
    if (!canAdvance) {
      this.accumulatedMs = 0;
      return 0;
    }

    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError("Elapsed frame time must be a non-negative finite number.");
    }

    const maximumAccumulation = this.stepDurationMs * this.maxStepsPerAdvance;
    const previousAccumulation = this.accumulatedMs;
    this.accumulatedMs = Math.min(
      maximumAccumulation,
      this.accumulatedMs + elapsedMs
    );
    const acceptedElapsed = this.accumulatedMs - previousAccumulation;
    if (acceptedElapsed > 0) onAcceptedTime?.(acceptedElapsed);

    let steps = 0;
    while (
      this.accumulatedMs >= this.stepDurationMs &&
      steps < this.maxStepsPerAdvance
    ) {
      onTick();
      this.accumulatedMs -= this.stepDurationMs;
      steps += 1;
    }

    return steps;
  }

  reset(): void {
    this.accumulatedMs = 0;
  }
}
