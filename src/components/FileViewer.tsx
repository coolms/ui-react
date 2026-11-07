import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Glyph, cx } from './internal';

/** One of the top bar's file actions, as Download, Print and Open separately are: the caller's words and handler. */
export interface FileViewerAction {
    readonly label: string;
    readonly icon: ReactNode;
    readonly onSelect: () => void;
}

/** The other files of a set, for previous and next. A side with no handler is that end of the list. */
export interface FileViewerSiblings {
    readonly position: string;
    readonly index: number;
    readonly total: number;
    readonly previousLabel: string;
    readonly nextLabel: string;
    readonly onPrevious?: () => void;
    readonly onNext?: () => void;
}

/** The editing state: the content hosts the type's own editor, and the viewer has none of its own. */
export interface FileViewerEditing {
    readonly status: ReactNode;
    readonly doneLabel: string;
    readonly onDone: () => void;
    /** It holds unsaved work: Close calls onDirtyClose, which asks the person, rather than closing. */
    readonly dirty?: boolean;
    readonly onDirtyClose: () => void;
}

export interface FileViewerProps {
    /** The file's name: the dialog's name, truncated where it does not fit, with the whole of it available. */
    readonly name: string;
    /** The file type's badge. */
    readonly badge: ReactNode;
    readonly closeLabel: string;
    readonly onClose: () => void;
    /** Download, Print and Open separately, as the file allows, in that order. */
    readonly actions?: readonly FileViewerAction[];
    /** The name of the menu holding the actions on a phone. */
    readonly moreLabel?: string;
    /** Only with the server's write permission for this file: absent, never disabled, without it. */
    readonly edit?: { readonly label: string; readonly icon: ReactNode; readonly onEdit: () => void };
    readonly editing?: FileViewerEditing;
    readonly siblings?: FileViewerSiblings;
    /** What the viewer bar holds, from the adapter: page, zoom, fit. It never holds a file action. */
    readonly bar?: ReactNode;
    /** A paged file's pages, at a wide width. */
    readonly thumbnails?: ReactNode;
    /** A set of attachments, along the foot above the viewer bar at a wide width. */
    readonly strip?: ReactNode;
    /** Plus, minus and 0, where the adapter has zoom. */
    readonly onZoom?: (how: 'in' | 'out' | 'reset') => void;
    /** The adapter: it scrolls inside itself, and the overlay never scrolls as a document. */
    readonly children: ReactNode;
}

const FOCUSABLE = 'input, select, textarea, button:not([disabled]), iframe, [href], [tabindex]:not([tabindex="-1"])';
/** How far a finger travels, more sideways than down, to move to another file. */
const SWIPE_PX = 60;

/** Whether a key press belongs to what has the focus: a field uses the keys, and so does whatever says it does. */
function usesKeys(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"], [data-viewer-keys]') !== null;
}

/** Whether an adapter has taken the gesture, as a picture being panned has. */
function usesSwipe(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-viewer-gestures]') !== null;
}

/** What Tab can reach: a control hidden at this width is not drawn, and the browser passes over it. */
function drawn(element: HTMLElement): boolean {
    return element.getClientRects().length > 0;
}

/**
 * One way to look at a file (contract component `file-viewer`): over the page, dark whatever the scheme, with an
 * adapter in the content. Close leaves the whole viewer, asking first with unsaved changes; Done returns from editing
 * to viewing. Escape closes only while viewing: while editing it belongs to the editor. Focus starts on Close, stays
 * inside, and returns to what opened it.
 */
export function FileViewer(props: FileViewerProps): ReactNode {
    const { name, badge, closeLabel, onClose, actions = [], moreLabel = 'More', edit, editing, siblings, bar, thumbnails, strip, onZoom, children } = props;
    const panel = useRef<HTMLDivElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    const nameId = useId();
    const [menu, setMenu] = useState(false);
    const swipe = useRef<{ readonly x: number; readonly y: number } | null>(null);

    useEffect(() => {
        const returnTo = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        close.current?.focus();
        return () => {
            document.body.style.overflow = overflow;
            (returnTo as HTMLElement | null)?.focus?.();
        };
    }, []);

    const askToClose = () => {
        if (editing?.dirty) editing.onDirtyClose();
        else onClose();
    };

    const onTouchStart = (event: TouchEvent) => {
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        swipe.current = touch === undefined || editing !== undefined || usesSwipe(event.target) ? null : { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = (event: TouchEvent) => {
        const from = swipe.current;
        const touch = event.changedTouches[0];
        swipe.current = null;
        if (from === null || touch === undefined) return;
        const across = touch.clientX - from.x;
        if (Math.abs(across) < SWIPE_PX || Math.abs(across) < Math.abs(touch.clientY - from.y)) return;
        if (across > 0) siblings?.onPrevious?.();
        else siblings?.onNext?.();
    };

    return createPortal(
        <div
            ref={panel}
            className={cx('cms-viewer', editing !== undefined && 'is-editing')}
            role="dialog"
            aria-modal="true"
            aria-labelledby={nameId}
            tabIndex={-1}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    if (editing !== undefined) return;
                    event.stopPropagation();
                    if (menu) setMenu(false);
                    else onClose();
                } else if (event.key === 'Tab') {
                    const inside = Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(drawn);
                    if (inside.length === 0) return;
                    const first = inside[0]!;
                    const last = inside[inside.length - 1]!;
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                } else if (editing === undefined && !usesKeys(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    // With a modifier the key is the browser's: its own zoom, or going back.
                    if (event.key === 'ArrowLeft') siblings?.onPrevious?.();
                    else if (event.key === 'ArrowRight') siblings?.onNext?.();
                    else if (event.key === '+' || event.key === '=') onZoom?.('in');
                    else if (event.key === '-') onZoom?.('out');
                    else if (event.key === '0') onZoom?.('reset');
                }
            }}
        >
            {siblings !== undefined ? <span className="cms-visually-hidden" role="status">{`${name}, ${siblings.position}`}</span> : null}
            <header className="cms-viewer__top">
                <button ref={close} type="button" className="cms-viewer__icon" aria-label={closeLabel} onClick={askToClose}>
                    <Glyph name="close" />
                </button>
                <span className="cms-viewer__badge">{badge}</span>
                <h2 className="cms-viewer__name" id={nameId} title={name}>{name}</h2>
                {siblings !== undefined ? <span className="cms-viewer__position">{siblings.position}</span> : null}
                <span className="cms-viewer__space" />
                {editing !== undefined ? (
                    <>
                        <span className="cms-viewer__status" role="status">{editing.status}</span>
                        <button type="button" className="cms-viewer__button cms-viewer__button--edit" onClick={editing.onDone}>{editing.doneLabel}</button>
                    </>
                ) : (
                    <>
                        <span className="cms-viewer__actions">
                            {actions.map((action) => (
                                <button key={action.label} type="button" className="cms-viewer__button" onClick={action.onSelect}>
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </span>
                        {edit !== undefined ? (
                            <button type="button" className="cms-viewer__button cms-viewer__button--edit" aria-label={edit.label} onClick={edit.onEdit}>
                                {edit.icon}
                                <span className="cms-viewer__wide">{edit.label}</span>
                            </button>
                        ) : null}
                        {actions.length > 0 ? (
                            <span className="cms-viewer__more">
                                <button type="button" className="cms-viewer__icon" aria-label={moreLabel} aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
                                    <Icon name="more" />
                                </button>
                                {menu ? (
                                    <span className="cms-viewer__menu">
                                        {actions.map((action) => (
                                            <button
                                                key={action.label}
                                                type="button"
                                                className="cms-viewer__button"
                                                onClick={() => {
                                                    setMenu(false);
                                                    action.onSelect();
                                                }}
                                            >
                                                {action.icon}
                                                {action.label}
                                            </button>
                                        ))}
                                    </span>
                                ) : null}
                            </span>
                        ) : null}
                    </>
                )}
            </header>
            <div className="cms-viewer__body">
                {thumbnails != null && editing === undefined ? <nav className="cms-viewer__thumbnails">{thumbnails}</nav> : null}
                <div className="cms-viewer__content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                    {children}
                    {editing === undefined && siblings?.onPrevious ? (
                        <button type="button" className="cms-viewer__side cms-viewer__side--previous" aria-label={siblings.previousLabel} onClick={siblings.onPrevious}>
                            <Glyph name="back" />
                        </button>
                    ) : null}
                    {editing === undefined && siblings?.onNext ? (
                        <button type="button" className="cms-viewer__side cms-viewer__side--next" aria-label={siblings.nextLabel} onClick={siblings.onNext}>
                            <Glyph name="back" />
                        </button>
                    ) : null}
                    {editing === undefined && siblings !== undefined ? (
                        <div className="cms-viewer__dots" aria-hidden="true">
                            {Array.from({ length: Math.min(siblings.total, 7) }, (_, at) => (
                                <i key={at} className={at === Math.min(siblings.index, 6) ? 'is-current' : undefined} />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
            {editing === undefined && strip != null ? <div className="cms-viewer__strip">{strip}</div> : null}
            {bar != null ? <footer className="cms-viewer__bar">{bar}</footer> : null}
        </div>,
        document.body,
    );
}
