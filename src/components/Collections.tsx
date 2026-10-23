import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Offer } from '../server/capability';
import { EmptyState, ErrorBanner, Loading } from './Status';
import { cx, Glyph } from './internal';

export interface ListRow {
    readonly id: string;
    readonly primary: ReactNode;
    readonly secondary?: ReactNode;
    /** Leading visual: an Avatar, an icon. */
    readonly lead?: ReactNode;
    /** Trailing text: a date, a size. */
    readonly meta?: ReactNode;
}

export interface ListProps {
    /** What the rows are, for a screen reader ("Messages"). */
    readonly label: string;
    /** null while the first read runs. */
    readonly rows: readonly ListRow[] | null;
    /** The read failed: why, in the person's words. Wins over rows. */
    readonly error?: ReactNode;
    readonly onRetry?: () => void;
    readonly loadingText?: ReactNode;
    readonly emptyTitle?: ReactNode;
    readonly emptyHint?: ReactNode;
    readonly selected?: string | null;
    /** A press opens the row. */
    readonly onOpen?: (id: string) => void;
    /** Right-click or the context-menu key on a row: the page opens its ContextMenu at the point. */
    readonly onRowMenu?: (id: string, at: { x: number; y: number }) => void;
}

/**
 * Rows of objects, each opened by a press; a row's other actions in its menu (contract component `list`: loading,
 * empty, populated, selected, error). Up and Down move between rows; Enter opens one.
 */
export function List({ label, rows, error, onRetry, loadingText = 'Loading', emptyTitle = 'Nothing here yet', emptyHint, selected, onOpen, onRowMenu }: ListProps): ReactNode {
    const refs = useRef<Array<HTMLLIElement | null>>([]);
    if (error != null) return <ErrorBanner message={error} onRetry={onRetry} />;
    if (rows === null) return <Loading what={loadingText} layout="block" />;
    if (rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;

    const onKey = (e: KeyboardEvent<HTMLLIElement>, i: number, id: string) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            refs.current[Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
        } else if (e.key === 'Enter') {
            onOpen?.(id);
        } else if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && onRowMenu) {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            onRowMenu(id, { x: r.left + 16, y: r.bottom });
        }
    };

    return (
        <ul className="cms-list" role="listbox" aria-label={label}>
            {rows.map((row, i) => {
                const on = row.id === selected;
                return (
                    <li
                        key={row.id}
                        ref={el => {
                            refs.current[i] = el;
                        }}
                        role="option"
                        aria-selected={on}
                        tabIndex={on || (selected == null && i === 0) ? 0 : -1}
                        className={cx('cms-list__row', on && 'is-selected')}
                        onClick={() => onOpen?.(row.id)}
                        onKeyDown={e => onKey(e, i, row.id)}
                        onContextMenu={onRowMenu ? e => {
                            e.preventDefault();
                            onRowMenu(row.id, { x: e.clientX, y: e.clientY });
                        } : undefined}
                    >
                        {row.lead != null ? <span className="cms-list__lead">{row.lead}</span> : null}
                        <span className="cms-list__text">
                            <span className="cms-list__primary">{row.primary}</span>
                            {row.secondary != null ? <span className="cms-list__secondary">{row.secondary}</span> : null}
                        </span>
                        {row.meta != null ? <span className="cms-list__meta">{row.meta}</span> : null}
                    </li>
                );
            })}
        </ul>
    );
}

export interface MenuItem {
    readonly id: string;
    readonly label: ReactNode;
    /** The server's answer for this action on this subject, read with offerFor (R3). Not offered = not drawn. */
    readonly offer: Offer;
    /** Destroys or cannot be undone. */
    readonly danger?: boolean;
    readonly onSelect: () => void;
}

export interface ContextMenuProps {
    /** Where it opens; null = closed. */
    readonly at: { readonly x: number; readonly y: number } | null;
    /** Exactly the action bar's items for the selection -- the page passes the same list to both. */
    readonly items: readonly MenuItem[];
    readonly onClose: () => void;
    readonly label?: string;
}

/**
 * The selected object's actions (contract component `context-menu`: open, item-danger, item-locked, item-refused).
 * An item the server withheld is not drawn; a locked one carries its lock; a refused one is shown disabled with the
 * server's refusal. Escape, a press outside, or a choice closes it, and focus goes back where it was.
 */
export function ContextMenu({ at, items, onClose, label = 'Actions' }: ContextMenuProps): ReactNode {
    const menu = useRef<HTMLDivElement>(null);
    const returnTo = useRef<Element | null>(null);
    const [pos, setPos] = useState(at);
    const shown = items.filter(i => i.offer.offered);

    useLayoutEffect(() => {
        if (!at) return;
        // Kept inside the viewport: a menu opened near the right or bottom edge opens towards the middle.
        const el = menu.current;
        const w = el?.offsetWidth ?? 0;
        const h = el?.offsetHeight ?? 0;
        setPos({ x: Math.max(0, Math.min(at.x, window.innerWidth - w)), y: Math.max(0, Math.min(at.y, window.innerHeight - h)) });
    }, [at]);

    useEffect(() => {
        if (!at) return;
        returnTo.current = document.activeElement;
        menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
        const outside = (e: MouseEvent) => {
            if (!menu.current?.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', outside);
        return () => {
            document.removeEventListener('mousedown', outside);
            (returnTo.current as HTMLElement | null)?.focus?.();
        };
    }, [at, onClose]);

    if (!at || shown.length === 0) return null;

    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const all = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const i = all.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'Escape' || e.key === 'Tab') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            all[(i + step + all.length) % all.length]?.focus();
        }
    };

    return createPortal(
        <div
            ref={menu}
            className="cms-menu"
            role="menu"
            aria-label={label}
            style={{ left: (pos ?? at).x, top: (pos ?? at).y }}
            onKeyDown={onKey}
            onContextMenu={e => e.preventDefault()}
        >
            {shown.map(item => {
                const refused = item.offer.refusal !== undefined;
                return (
                    <div
                        key={item.id}
                        role="menuitem"
                        tabIndex={-1}
                        aria-disabled={refused || undefined}
                        title={refused ? item.offer.refusal : undefined}
                        className={cx('cms-menu__item', item.danger && 'is-danger', item.offer.locked && 'is-locked', refused && 'is-refused')}
                        onClick={() => {
                            if (refused) return;
                            onClose();
                            item.onSelect();
                        }}
                        onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === ' ') && !refused) {
                                e.preventDefault();
                                onClose();
                                item.onSelect();
                            }
                        }}
                    >
                        {item.offer.locked ? <Glyph name="lock" /> : null}
                        <span className="cms-menu__label">{item.label}</span>
                        {refused ? <span className="cms-menu__refusal">{item.offer.refusal}</span> : null}
                    </div>
                );
            })}
        </div>,
        document.body,
    );
}
