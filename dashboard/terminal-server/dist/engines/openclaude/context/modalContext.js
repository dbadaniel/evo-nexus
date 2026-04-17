import { c as _c } from "react-compiler-runtime";
import { createContext, useContext } from 'react';
export const ModalContext = createContext(null);
export function useIsInsideModal() {
    return useContext(ModalContext) !== null;
}
/**
 * Available content rows/columns when inside a Modal, else falls back to
 * the provided terminal size. Use instead of `useTerminalSize()` when a
 * component caps its visible content height — the modal's inner area is
 * smaller than the terminal.
 */
export function useModalOrTerminalSize(fallback) {
    const $ = _c(3);
    const ctx = useContext(ModalContext);
    let t0;
    if ($[0] !== ctx || $[1] !== fallback) {
        t0 = ctx ? {
            rows: ctx.rows,
            columns: ctx.columns
        } : fallback;
        $[0] = ctx;
        $[1] = fallback;
        $[2] = t0;
    }
    else {
        t0 = $[2];
    }
    return t0;
}
export function useModalScrollRef() {
    return useContext(ModalContext)?.scrollRef ?? null;
}
//# sourceMappingURL=modalContext.js.map