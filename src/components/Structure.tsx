import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx, Glyph } from './internal';

export interface PageHeaderProps {
    readonly title: ReactNode;
    /** Whose or what this page is about ("Work mail · 3 folders"). */
    readonly scope?: ReactNode;
    /** The page's own actions, at the right. */
    readonly actions?: ReactNode;
    /** Back to where the page was opened from. */
    readonly backLink?: { readonly label: string; readonly href?: string; readonly onBack?: () => void };
}

/** The page's title, its scope line and its actions (contract component `page-header`: default, with-actions, with-back-link). */
export function PageHeader({ title, scope, actions, backLink }: PageHeaderProps): ReactNode {
    return (
        <header className="cms-page-header">
            {backLink ? (
                <a
                    className="cms-page-header__back"
                    href={backLink.href ?? '#'}
                    onClick={e => {
                        if (backLink.onBack) {
                            e.preventDefault();
                            backLink.onBack();
                        }
                    }}
                >
                    <Glyph name="back" /> {backLink.label}
                </a>
            ) : null}
            <div className="cms-page-header__row">
                <div className="cms-page-header__titles">
                    <h1 className="cms-page-header__title">{title}</h1>
                    {scope != null ? <p className="cms-page-header__scope">{scope}</p> : null}
                </div>
                {actions != null ? <div className="cms-page-header__actions">{actions}</div> : null}
            </div>
        </header>
    );
}

export interface Tab {
    readonly id: string;
    readonly label: ReactNode;
    /** How many things the section holds, when that helps choose it. */
    readonly count?: number;
}

export interface TabStripProps {
    readonly tabs: readonly Tab[];
    readonly active: string;
    readonly onSelect: (id: string) => void;
    /** What the tabs are sections of, for a screen reader. */
    readonly label: string;
}

/**
 * Sections of one object, one at a time (contract component `tab-strip`: default, active, with-count). Arrow keys
 * move between tabs, Home and End to the ends, as a tablist does.
 */
export function TabStrip({ tabs, active, onSelect, label }: TabStripProps): ReactNode {
    const refs = useRef<Array<HTMLButtonElement | null>>([]);
    const onKey = (e: KeyboardEvent, i: number) => {
        const last = tabs.length - 1;
        const to = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
            : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
            : e.key === 'Home' ? 0
            : e.key === 'End' ? last
            : null;
        if (to === null) return;
        e.preventDefault();
        const tab = tabs[to];
        if (tab) {
            onSelect(tab.id);
            refs.current[to]?.focus();
        }
    };
    return (
        <div className="cms-tabs" role="tablist" aria-label={label}>
            {tabs.map((t, i) => {
                const on = t.id === active;
                return (
                    <button
                        key={t.id}
                        ref={el => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        className={cx('cms-tab', on && 'is-active')}
                        aria-selected={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => onSelect(t.id)}
                        onKeyDown={e => onKey(e, i)}
                    >
                        {t.label}
                        {t.count !== undefined ? <span className="cms-tab__count">{t.count}</span> : null}
                    </button>
                );
            })}
        </div>
    );
}

export interface AvatarProps {
    /** The person's or account's name: the initials, and the accessible name. */
    readonly name: string;
    readonly pictureUrl?: string;
    /** Whether they are reachable now, as the server said. */
    readonly presence?: 'online' | 'away' | 'offline';
    readonly size?: number;
}

/** Up to two initials from a name: "Ada Lovelace" -> "AL", "ada" -> "A". */
export function initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0]![0], words[words.length - 1]![0]] : [words[0]?.[0]];
    return letters.filter(Boolean).join('').toUpperCase();
}

/** Which of the six avatar tints a name takes: the same name always the same tint. */
export function tintOf(name: string): number {
    let hash = 0;
    for (const ch of name.trim().toLowerCase()) {
        hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
    }
    return (hash % 6) + 1;
}

/** A person or an account, by picture or initials (contract component `avatar`: picture, initials, presence). */
export function Avatar({ name, pictureUrl, presence, size = 32 }: AvatarProps): ReactNode {
    return (
        <span
            className={`cms-avatar cms-avatar--tint-${tintOf(name)}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
            role="img"
            aria-label={presence ? `${name}, ${presence}` : name}
        >
            {pictureUrl ? <img src={pictureUrl} alt="" className="cms-avatar__picture" /> : <span aria-hidden="true">{initialsOf(name)}</span>}
            {presence ? <span className={cx('cms-avatar__presence', `is-${presence}`)} aria-hidden="true" /> : null}
        </span>
    );
}
