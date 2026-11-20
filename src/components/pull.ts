import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** How far down a pull has to go before letting go refreshes, in px (contract screen-shell, pull). */
export const PULL_AT = 64;

/**
 * Pull to refresh on a scroll region at its top: a touch dragged down from the very top shows how far it has gone (up
 * to half again the threshold) and, let go past the threshold, calls `onPull`. A drag that starts lower, or goes up,
 * is the region's own scroll. Returns how far it is pulled now, 0 at rest.
 */
export function usePull(region: RefObject<HTMLElement | null>, onPull: (() => void) | null): number {
    const [pulled, setPulled] = useState(0);
    const latest = useRef(onPull);
    latest.current = onPull;
    useEffect(() => {
        const el = region.current;
        if (el === null) return undefined;
        let from: number | null = null;
        let distance = 0;
        const start = (event: TouchEvent) => {
            from = el.scrollTop <= 0 && event.touches.length === 1 ? event.touches[0]!.clientY : null;
            distance = 0;
        };
        const move = (event: TouchEvent) => {
            if (from === null || latest.current === null) return;
            const dy = event.touches[0]!.clientY - from;
            if (dy <= 0) {
                from = null;
                setPulled(0);
                return;
            }
            // The page itself must not scroll or bounce while the content is pulled.
            if (event.cancelable) event.preventDefault();
            distance = Math.min(dy * 0.6, PULL_AT * 1.5);
            setPulled(distance);
        };
        const end = () => {
            if (from !== null && distance >= PULL_AT) latest.current?.();
            from = null;
            distance = 0;
            setPulled(0);
        };
        el.addEventListener('touchstart', start, { passive: true });
        el.addEventListener('touchmove', move, { passive: false });
        el.addEventListener('touchend', end);
        el.addEventListener('touchcancel', end);
        return () => {
            el.removeEventListener('touchstart', start);
            el.removeEventListener('touchmove', move);
            el.removeEventListener('touchend', end);
            el.removeEventListener('touchcancel', end);
        };
    }, [region]);
    return pulled;
}

/** The content's pull, as the shell has it: a list inside draws it as its `pulled` state. */
export interface PullState {
    /** How far it is pulled now, in px; 0 at rest. */
    readonly distance: number;
    /** The refresh it started is under way. */
    readonly refreshing: boolean;
    /** What the pull says while pulled: the time of the last sync. */
    readonly text: ReactNode;
}
export const PullContext = createContext<PullState | null>(null);

/** The pull of the screen around a list, or null outside a screen that takes one. */
export function usePullState(): PullState | null {
    return useContext(PullContext);
}
