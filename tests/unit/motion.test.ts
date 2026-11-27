import { describe, expect, it } from "vitest";
import { AgentMotionAnimator } from "../../src/render/motion";

describe("agent motion animation", () => {
  it("interpolates continuously between the centres of two tiles", () => {
    const animator = new AgentMotionAnimator(200);
    animator.enqueue("agent-1", { x: 2, y: 3 }, { x: 3, y: 3 });
    animator.advance(100);

    expect(animator.getPosition("agent-1", { x: 0, y: 0 })).toEqual({ x: 2.5, y: 3 });
  });

  it("reaches the exact tile centre after the segment duration", () => {
    const animator = new AgentMotionAnimator(200);
    animator.enqueue("agent-1", { x: 2, y: 3 }, { x: 3, y: 3 });
    animator.advance(200);

    expect(animator.getPosition("agent-1", { x: 0, y: 0 })).toEqual({ x: 3, y: 3 });
  });

  it("plays multiple simulation moves in order if several ticks happen between frames", () => {
    const animator = new AgentMotionAnimator(200);
    animator.enqueue("agent-1", { x: 0, y: 0 }, { x: 1, y: 0 });
    animator.enqueue("agent-1", { x: 1, y: 0 }, { x: 2, y: 0 });
    animator.enqueue("agent-1", { x: 2, y: 0 }, { x: 2, y: 1 });
    animator.advance(450);

    expect(animator.getPosition("agent-1", { x: 0, y: 0 })).toEqual({ x: 2, y: 0.25 });
  });

  it("retains a short trail of tiles actually travelled", () => {
    const animator = new AgentMotionAnimator(100, 3);
    animator.enqueue("agent-1", { x: 0, y: 0 }, { x: 1, y: 0 });
    animator.enqueue("agent-1", { x: 1, y: 0 }, { x: 2, y: 0 });
    animator.enqueue("agent-1", { x: 2, y: 0 }, { x: 3, y: 0 });
    animator.enqueue("agent-1", { x: 3, y: 0 }, { x: 4, y: 0 });
    animator.advance(400);

    expect(animator.getTrail("agent-1")).toEqual([
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 }
    ]);
  });

  it("does not advance while the simulation is paused", () => {
    const animator = new AgentMotionAnimator(200);
    animator.enqueue("agent-1", { x: 0, y: 0 }, { x: 1, y: 0 });
    animator.advance(100, false);

    expect(animator.getPosition("agent-1", { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});
