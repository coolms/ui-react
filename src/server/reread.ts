import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State that expires is re-read, not remembered (contract: reaction R1; server states `node-rwx`, `elevation`,
 * `space-writable`, `consent`, `navi-offered`). A component reads it with useReread: it is read once, and read again on
 * every event that can have changed it -- the window getting focus back after being away, and any `rereadAll()` the app
 * raises after an elevation was granted or ended, or a refusal came back. The copy held between reads is only the last
 * answer, never a decision of its own.
 */
const REREAD = 'coolms-kit:reread';

/** Tell every useReread on the page to read again (an elevation granted or ended, a refusal answered). */
export function rereadAll(): void {
    window.dispatchEvent(new Event(REREAD));
}

export interface Reread<T> {
    readonly value: T | undefined;
    readonly error: unknown;
    readonly loading: boolean;
    readonly reread: () => void;
}

export function useReread<T>(read: () => Promise<T>): Reread<T> {
    const [value, setValue] = useState<T | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const [loading, setLoading] = useState(true);
    const readRef = useRef(read);
    readRef.current = read;
    const seq = useRef(0);

    const reread = useCallback(() => {
        const mine = ++seq.current;
        setLoading(true);
        readRef.current().then(
            v => {
                if (mine !== seq.current) return;
                setValue(v);
                setError(undefined);
                setLoading(false);
            },
            e => {
                if (mine !== seq.current) return;
                setError(e);
                setLoading(false);
            },
        );
    }, []);

    useEffect(() => {
        reread();
        const onFocus = () => reread();
        window.addEventListener('focus', onFocus);
        window.addEventListener(REREAD, onFocus);
        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener(REREAD, onFocus);
        };
    }, [reread]);

    return { value, error, loading, reread };
}
