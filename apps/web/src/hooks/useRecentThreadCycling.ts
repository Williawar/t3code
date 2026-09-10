import { useCallback, useEffect, useRef } from "react";

import {
  cycleRecentThread,
  EMPTY_THREAD_RECENCY_STATE,
  endThreadRecencyWalk,
  isModifierKeyName,
  recordThreadVisit,
} from "../threadRecency";

/**
 * Backs `thread.cycleRecent`. Records the routed thread as visited and ends an
 * in-progress walk when a modifier key is released or the window blurs, so a
 * held Ctrl+Tab, Ctrl+Tab steps two threads back while Ctrl+Tab, release,
 * Ctrl+Tab flips between the two newest.
 */
export function useRecentThreadCycling(routeThreadKey: string | null) {
  const stateRef = useRef(EMPTY_THREAD_RECENCY_STATE);
  const routeThreadKeyRef = useRef(routeThreadKey);

  useEffect(() => {
    routeThreadKeyRef.current = routeThreadKey;
    stateRef.current = recordThreadVisit(stateRef.current, routeThreadKey);
  }, [routeThreadKey]);

  useEffect(() => {
    const endWalk = () => {
      stateRef.current = endThreadRecencyWalk(stateRef.current, routeThreadKeyRef.current);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isModifierKeyName(event.key)) endWalk();
    };
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", endWalk);
    return () => {
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", endWalk);
    };
  }, []);

  return useCallback((isKnownThread: (threadKey: string) => boolean): string | null => {
    const result = cycleRecentThread(stateRef.current, {
      currentThreadKey: routeThreadKeyRef.current,
      isKnownThread,
    });
    stateRef.current = result.state;
    return result.target;
  }, []);
}
