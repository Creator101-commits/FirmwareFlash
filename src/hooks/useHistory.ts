import { useState, useCallback } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater;
}

// lightweight undo/redo stack; past is capped at 20 entries.
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  // update present AND push previous value onto the undo stack.
  const push = useCallback((updater: Updater<T>) => {
    setState((h) => {
      const next = resolve(updater, h.present);
      return {
        past: [...h.past.slice(-19), h.present],
        present: next,
        future: [],
      };
    });
  }, []);

  // update present silently — no undo entry created (used for param edits).
  const set = useCallback((updater: Updater<T>) => {
    setState((h) => ({ ...h, present: resolve(updater, h.present) }));
  }, []);

  const undo = useCallback(() => {
    setState((h) => {
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((h) => {
      if (h.future.length === 0) return h;
      return {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      };
    });
  }, []);

  return {
    present: state.present,
    push,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
