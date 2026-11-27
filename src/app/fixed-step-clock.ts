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
   * Applies accepted frame time in chronological slices. Visual animation
   * advances up to the next fixed tick, then the simulation makes its
   * decision, then the remaining frame time advances that newly queued move.
   * This keeps rendered movement aligned even if one frame contains multiple
   * simulation ticks.
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
    const nextAccumulation = Math.min(
      maximumAccumulation,
      this.accumulatedMs + elapsedMs
    );
    let remaining = nextAccumulation - this.accumulatedMs;
    let offset = this.accumulatedMs;
    let steps = 0;

    // Walk through accepted frame time in chronological order.
    while (remaining > 0) {
      const toNextTick = this.stepDurationMs - offset;
      const consumed = Math.min(remaining, toNextTick);
      if (consumed > 0) {
        onAcceptedTime?.(consumed);
        offset += consumed;
        remaining -= consumed;
      }

      if (offset >= this.stepDurationMs && steps < this.maxStepsPerAdvance) {
        onTick();
        offset -= this.stepDurationMs;
        steps += 1;
      } else {
        break;
      }
    }

    this.accumulatedMs = offset;
    return steps;
  }

  reset(): void {
    this.accumulatedMs = 0;
  }
}
