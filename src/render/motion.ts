import type { GridPoint } from "../core/types";

interface MotionSegment {
  from: GridPoint;
  to: GridPoint;
  elapsedMs: number;
  durationMs: number;
}

interface MotionTrack {
  position: GridPoint;
  segments: MotionSegment[];
  trail: GridPoint[];
  animationTimeMs: number;
}

/**
 * Presents completed, authoritative grid moves as continuous visual travel.
 * It never changes Agent coordinates or simulation state.
 */
export class AgentMotionAnimator {
  private readonly tracks = new Map<string, MotionTrack>();

  constructor(
    readonly defaultDurationMs = 250,
    readonly trailLimit = 16
  ) {
    if (!Number.isFinite(defaultDurationMs) || defaultDurationMs <= 0) {
      throw new RangeError("Movement duration must be a positive finite number.");
    }
    if (!Number.isInteger(trailLimit) || trailLimit < 1) {
      throw new RangeError("Trail limit must be a positive whole number.");
    }
  }

  enqueue(
    agentId: string,
    from: GridPoint,
    to: GridPoint,
    durationMs = this.defaultDurationMs
  ): void {
    if (!agentId.trim()) throw new RangeError("Agent ID cannot be empty.");
    if (![from.x, from.y, to.x, to.y, durationMs].every(Number.isFinite) || durationMs <= 0) {
      throw new RangeError("Movement coordinates and duration must be finite, with a positive duration.");
    }

    let track = this.tracks.get(agentId);
    if (!track) {
      track = {
        position: { ...from },
        segments: [],
        trail: [{ ...from }],
        animationTimeMs: 0
      };
      this.tracks.set(agentId, track);
    }

    const previous = track.segments.at(-1)?.to ?? track.position;
    const segmentFrom = { ...previous };
    const segmentTo = { ...to };

    if (segmentFrom.x === segmentTo.x && segmentFrom.y === segmentTo.y) return;

    track.segments.push({
      from: segmentFrom,
      to: segmentTo,
      elapsedMs: 0,
      durationMs
    });
  }

  advance(elapsedMs: number, canAdvance = true): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError("Animation elapsed time must be a non-negative finite number.");
    }
    if (!canAdvance || elapsedMs === 0) return;

    for (const track of this.tracks.values()) {
      let remaining = elapsedMs;

      while (remaining > 0 && track.segments.length > 0) {
        const segment = track.segments[0];
        if (!segment) break;

        const available = segment.durationMs - segment.elapsedMs;
        const consumed = Math.min(remaining, available);
        segment.elapsedMs += consumed;
        track.animationTimeMs += consumed;
        remaining -= consumed;

        const progress = Math.min(1, segment.elapsedMs / segment.durationMs);
        const eased = progress * progress * (3 - 2 * progress);
        track.position = {
          x: segment.from.x + (segment.to.x - segment.from.x) * eased,
          y: segment.from.y + (segment.to.y - segment.from.y) * eased
        };

        if (progress >= 1) {
          track.position = { ...segment.to };
          track.segments.shift();
          track.trail.push({ ...segment.to });
          if (track.trail.length > this.trailLimit) {
            track.trail.splice(0, track.trail.length - this.trailLimit);
          }
        }
      }
    }
  }

  getPosition(agentId: string, fallback: GridPoint): GridPoint {
    const position = this.tracks.get(agentId)?.position;
    return position ? { ...position } : { ...fallback };
  }

  getTrail(agentId: string): GridPoint[] {
    return (this.tracks.get(agentId)?.trail ?? []).map((point) => ({ ...point }));
  }

  isMoving(agentId: string): boolean {
    return (this.tracks.get(agentId)?.segments.length ?? 0) > 0;
  }

  getWalkCycle(agentId: string): number {
    const track = this.tracks.get(agentId);
    if (!track || track.segments.length === 0) return 0;
    return Math.sin(track.animationTimeMs / 65);
  }

  forget(agentId: string): void {
    this.tracks.delete(agentId);
  }

  clear(): void {
    this.tracks.clear();
  }
}
