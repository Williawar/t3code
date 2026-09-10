import { describe, expect, it } from "vite-plus/test";

import {
  cycleRecentThread,
  EMPTY_THREAD_RECENCY_STATE,
  endThreadRecencyWalk,
  recordThreadVisit,
  type ThreadRecencyState,
} from "./threadRecency";

const known = new Set(["a", "b", "c"]);
const isKnownThread = (key: string) => known.has(key);

function visit(...keys: Array<string | null>): ThreadRecencyState {
  return keys.reduce(recordThreadVisit, EMPTY_THREAD_RECENCY_STATE);
}

describe("threadRecency", () => {
  it("orders visits most recent first without duplicates", () => {
    expect(visit("a", "b", "a", "c", null).history).toEqual(["c", "a", "b"]);
  });

  it("a single press jumps to the previously visited thread", () => {
    const { target } = cycleRecentThread(visit("a", "b"), {
      currentThreadKey: "b",
      isKnownThread,
    });
    expect(target).toBe("a");
  });

  it("pressing again after release flips back", () => {
    let state = visit("a", "b");
    const first = cycleRecentThread(state, { currentThreadKey: "b", isKnownThread });
    state = recordThreadVisit(first.state, first.target);
    state = endThreadRecencyWalk(state, first.target);
    const second = cycleRecentThread(state, { currentThreadKey: "a", isKnownThread });
    expect(second.target).toBe("b");
  });

  it("holding the modifier walks further back and wraps", () => {
    let state = visit("a", "b", "c");
    const steps: Array<string | null> = [];
    for (let index = 0; index < 4; index += 1) {
      const step = cycleRecentThread(state, {
        currentThreadKey: steps.at(-1) ?? "c",
        isKnownThread,
      });
      // Route changes during the walk must not reorder the list.
      state = recordThreadVisit(step.state, step.target);
      steps.push(step.target);
    }
    expect(steps).toEqual(["b", "a", "c", "b"]);
  });

  it("releasing the modifier promotes the landed thread", () => {
    let state = visit("a", "b", "c");
    const step = cycleRecentThread(state, { currentThreadKey: "c", isKnownThread });
    state = cycleRecentThread(step.state, { currentThreadKey: step.target, isKnownThread }).state;
    state = endThreadRecencyWalk(state, "a");
    expect(state.walkIndex).toBeNull();
    expect(state.history).toEqual(["a", "c", "b"]);
  });

  it("skips threads that no longer exist", () => {
    const { target, state } = cycleRecentThread(visit("gone", "a", "b"), {
      currentThreadKey: "b",
      isKnownThread,
    });
    expect(target).toBe("a");
    expect(state.history).toEqual(["b", "a"]);
  });

  it("does nothing with fewer than two threads", () => {
    expect(
      cycleRecentThread(visit("a"), { currentThreadKey: "a", isKnownThread }).target,
    ).toBeNull();
    expect(
      cycleRecentThread(EMPTY_THREAD_RECENCY_STATE, { currentThreadKey: null, isKnownThread })
        .target,
    ).toBeNull();
  });

  it("starts the walk from the current thread even if it was not recorded", () => {
    const { target } = cycleRecentThread(visit("a", "b"), {
      currentThreadKey: "c",
      isKnownThread,
    });
    expect(target).toBe("b");
  });
});
