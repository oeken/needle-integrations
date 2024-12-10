import { useEffect, useRef } from "react";

// Used to skip runing useEffect callback in the first render of a component.
// Callback will be run only when deps change.
export function useEffectSkipFirst(effect: () => void, deps: unknown[]) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
