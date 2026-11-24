import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cx } from './internal.js';

export interface SplitterProps {
    /**
     * Where the width is remembered on this device (the screen and the split, such as "mail:folders"); never sent
     * anywhere. Without one, nothing is remembered.
     */
    readonly storageKey?: string;
    /** The leading column's width in px, when the host keeps it; without one the splitter keeps it itself. */
    readonly value?: number;
    /** The leading column's default width in px: what a double-click puts it back to. */
    readonly default: number;
    /** The leading column's least width in px. */
    readonly min: number;
    /** The leading column's greatest width in px (or the width that leaves the trailing column its least). */
    readonly max: number;
    /** How far an arrow key moves it, in px; Shift with an arrow moves it 64. */
    readonly step?: number;
    /** The handle's accessible name, naming the columns it resizes ("Resize the folder list"). */
    readonly label: string;
    /**
     * The new width: while it is dragged (`done` false), and once more when the drag ends, on each key, on a
     * double-click and when a remembered width is read back (`done` true).
     */
    readonly onChange: (width: number, done: boolean) => void;
    readonly className?: string;
    readonly style?: CSSProperties;
}

/** Shift with an arrow key moves the handle this far. */
const SHIFT_STEP = 64;
/** The prefix of every width the splitters remember, so they share the device's storage with nothing else. */
const STORAGE_PREFIX = 'cms-splitter:';

/** The width remembered on this device under `storageKey`, or null: none, or storage that cannot be read. */
export function readSplitterWidth(storageKey: string): number | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
        if (raw === null) return null;
        const width = Number(raw);
        return Number.isFinite(width) ? width : null;
    } catch {
        return null;
    }
}

function remember(storageKey: string | undefined, width: number): void {
    if (storageKey === undefined) return;
    try {
        window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(width));
    } catch {
        // Storage refused (a private window, blocked site data): the width holds for this view only.
    }
}

function forget(storageKey: string | undefined): void {
    if (storageKey === undefined) return;
    try {
        window.localStorage.removeItem(STORAGE_PREFIX + storageKey);
    } catch {
        // Storage refused: nothing was remembered there to forget.
    }
}

/**
 * The handle between two columns (contract component `splitter`: default, hover, dragging, focused, at-min, at-max).
 * A vertical strip at least 8px wide that draws nothing at rest and the accent line on hover, while dragged and with
 * focus. A drag moves the leading column within min and max and remembers its width on release; a double-click puts it
 * back to its default and forgets it. It is a focusable separator: Left and Right move it by step (Shift: 64), Home and
 * End take it to min and max, Enter and Escape leave it; each key is remembered as a release is. A remembered width is
 * read back, within today's limits, when it is first drawn.
 */
export function Splitter({ storageKey, value, default: initial, min, max, step = 16, label, onChange, className, style }: SplitterProps): ReactNode {
    const most = Math.max(min, max);
    const clamp = (w: number) => Math.round(Math.min(Math.max(w, min), most));
    const [own, setOwn] = useState(() => {
        const kept = storageKey === undefined ? null : readSplitterWidth(storageKey);
        return clamp(kept ?? initial);
    });
    const shown = clamp(value ?? own);
    const drag = useRef<{ x: number; from: number; last: number; sign: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    // A remembered width the host does not show yet is handed to it as the column's width.
    useLayoutEffect(() => {
        if (storageKey === undefined) return;
        const kept = readSplitterWidth(storageKey);
        if (kept === null) return;
        const width = clamp(kept);
        if (value === undefined || width !== clamp(value)) {
            setOwn(width);
            onChange(width, true);
        }
        // Read once, when the handle is first drawn.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (width: number, done: boolean) => {
        const w = clamp(width);
        setOwn(w);
        if (done) remember(storageKey, w);
        onChange(w, done);
    };
    const end = () => {
        const d = drag.current;
        drag.current = null;
        setDragging(false);
        if (d !== null && d.last !== d.from) set(d.last, true);
    };

    return (
        <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={label}
            aria-valuenow={shown}
            aria-valuemin={min}
            aria-valuemax={most}
            className={cx('cms-splitter', dragging && 'is-dragging', shown <= min && 'is-at-min', shown >= most && 'is-at-max', className)}
            style={style}
            onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
                // Only the primary button (or a touch or a pen) drags.
                if (e.button > 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                // Right to left the leading column is on the right: moving the handle left widens it.
                const sign = getComputedStyle(e.currentTarget).direction === 'rtl' ? -1 : 1;
                drag.current = { x: e.clientX, from: shown, last: shown, sign };
                setDragging(true);
            }}
            onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
                const d = drag.current;
                if (d === null || !Number.isFinite(e.clientX)) return;
                d.last = clamp(d.from + d.sign * (e.clientX - d.x));
                set(d.last, false);
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onDoubleClick={() => {
                forget(storageKey);
                const w = clamp(initial);
                setOwn(w);
                onChange(w, true);
            }}
            onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                const by = e.shiftKey ? SHIFT_STEP : step;
                const sign = getComputedStyle(e.currentTarget).direction === 'rtl' ? -1 : 1;
                const to = e.key === 'ArrowLeft' ? shown - sign * by
                    : e.key === 'ArrowRight' ? shown + sign * by
                    : e.key === 'Home' ? min
                    : e.key === 'End' ? most
                    : null;
                // Any other key (Enter and Escape among them) leaves the width as it is.
                if (to === null) return;
                e.preventDefault();
                set(to, true);
            }}
        />
    );
}
