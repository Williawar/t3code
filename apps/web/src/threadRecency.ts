/**
 * Most-recently-used thread order for `thread.cycleRecent`, the Ctrl+Tab
 * switcher. Visits are recorded from the route; the list is session-only and
 * never persisted. Pressing the shortcut steps one thread further back in
 * visit order. While the walk is in progress the order is frozen, so holding
 * the modifier and pressing again keeps moving back instead of bouncing
 * between the two newest threads. Releasing the modifier ends the walk and
 * the thread landed on becomes the most recent.
 */

const THREAD_RECENCY_LIMIT = 50;

export interface ThreadRecencyState {
  /** Scoped thread keys, most recent first. */
  readonly history: readonly string[];
  /** Index into `history` of the thread landed on mid-walk; null when idle. */
  readonly walkIndex: number | null;
}

export const EMPTY_THREAD_RECENCY_STATE: ThreadRecencyState = { history: [], walkIndex: null };

function moveToFront(history: readonly string[], threadKey: string): readonly string[] {
  if (history[0] === threadKey) return history;
  return [threadKey, ...history.filter((key) => key !== threadKey)].slice(0, THREAD_RECENCY_LIMIT);
}

export function recordThreadVisit(
  state: ThreadRecencyState,
  threadKey: string | null,
): ThreadRecencyState {
  if (threadKey === null || state.walkIndex !== null) return state;
  const history = moveToFront(state.history, threadKey);
  return history === state.history ? state : { history, walkIndex: null };
}

export function cycleRecentThread(
  state: ThreadRecencyState,
  input: {
    currentThreadKey: string | null;
    isKnownThread: (threadKey: string) => boolean;
  },
): { state: ThreadRecencyState; target: string | null } {
  const { currentThreadKey, isKnownThread } = input;
  const walking = state.walkIndex !== null;
  let history: readonly string[] = state.history.filter(
    (key) => key === currentThreadKey || isKnownThread(key),
  );
  if (!walking && currentThreadKey !== null) {
    history = moveToFront(history, currentThreadKey);
  }
  if (history.length < 2) {
    return { state: { history, walkIndex: null }, target: null };
  }
  const fromIndex = walking ? Math.min(state.walkIndex ?? 0, history.length - 1) : 0;
  const walkIndex = (fromIndex + 1) % history.length;
  return { state: { history, walkIndex }, target: history[walkIndex] ?? null };
}

export function endThreadRecencyWalk(
  state: ThreadRecencyState,
  currentThreadKey: string | null,
): ThreadRecencyState {
  if (state.walkIndex === null) return state;
  return recordThreadVisit({ history: state.history, walkIndex: null }, currentThreadKey);
}

export function isModifierKeyName(key: string): boolean {
  switch (key) {
    case "Control":
    case "Meta":
    case "OS":
    case "Command":
    case "Alt":
    case "Option":
    case "Shift":
      return true;
    default:
      return false;
  }
}
