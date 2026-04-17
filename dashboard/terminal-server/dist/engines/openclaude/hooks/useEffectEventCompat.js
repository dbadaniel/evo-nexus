import { useCallback, useLayoutEffect, useRef } from 'react';
/**
 * React 18-compatible replacement for React 19's useEffectEvent.
 */
export function useEffectEventCompat(fn) {
    const fnRef = useRef(fn);
    useLayoutEffect(() => {
        fnRef.current = fn;
    }, [fn]);
    return useCallback((...args) => fnRef.current(...args), []);
}
//# sourceMappingURL=useEffectEventCompat.js.map