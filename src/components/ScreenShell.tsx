import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { PullContext, usePull, type PullState } from './pull.js';
import { ContextMenu, type MenuItem } from './Collections.js';
import { Icon, type IconName } from './Icon.js';
import { FilterChips, type FilterOption } from './Workspace.js';
import { cx } from './internal.js';

/** The screen's floating primary action: one action, or a menu of declared entries. */
export type ScreenPrimary =
    | { readonly label: string; readonly icon: IconName; readonly onPress: () => void }
    | { readonly label: string; readonly icon: IconName; readonly menu: readonly MenuItem[] };

export interface ScreenShellProps {
    /** The current place's name. */
    readonly title: string;
    /** On a nested screen: where Back leads, named by the parent's name. Absent at a section's root. */
    readonly back?: { readonly label: string; readonly href?: string; readonly onBack?: () => void };
    /** At a section's root: the section's own navigation (mail's folders), an icon button the host supplies. */
    readonly navigation?: ReactNode;
    /** The section's search, an icon button. */
    readonly search?: { readonly label: string; readonly onOpen: () => void };
    /**
     * While the section's search is open: the bar is Close, then the host's search field in place of the title and the
     * icons, until Close (or the host) ends it.
     */
    readonly searching?: { readonly field: ReactNode; readonly closeLabel: string; readonly onClose: () => void };
    /** The shell's own icons, the same in every section: the bell, then the person's avatar. */
    readonly globals?: ReactNode;
    /** The place's filters, as chips under the bar, exactly one selected. */
    readonly filters?: { readonly label: string; readonly options: readonly FilterOption[]; readonly selected: string; readonly onSelect: (id: string) => void };
    /** The floating primary action, given only when the server declares it; never on an item's own screen. */
    readonly primary?: ScreenPrimary;
    /** With it the content takes the pull: the refresh, and while it runs the refreshing state. */
    readonly onRefresh?: () => Promise<unknown>;
    /** What the pull says while pulled: the time of the last sync. */
    readonly pullText?: ReactNode;
    /**
     * Whether the bar (and the filters under it) is out of view. Not given, the shell decides: out while the content, or
     * any pane in it, scrolls down past the bar's own height; back on any scroll up, at the top, or when focus moves into
     * the bar. Never while searching, pulling or refreshing, whatever is given.
     */
    readonly barHidden?: boolean;
    /** The screen's content: it scrolls on its own; a list in it draws the pull. */
    readonly children: ReactNode;
}

/** How far a scroll must move before the bar answers it, so a resting finger's jitter does not flicker the bar. */
const BAR_SCROLL_STEP = 4;
/** How far down the content must be before the bar may step out: never while the content's top is still in reach. */
const BAR_HIDE_AFTER = 48;
/** How long after the reader's own input (a wheel, a touch, a key, a press on a scrollbar) a scroll counts as theirs. */
const BAR_READER_WINDOW_MS = 800;
/** The keys that scroll a page or a list. */
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

/**
 * The shell's own bar-hidden decision, from the scrolls inside it. Scroll events do not bubble, so one listener in the
 * capture phase on the shell hears the content and every pane inside it that scrolls on its own; each keeps its last
 * position. Only a scroll that follows the reader's own input moves the bar: a host that scrolls a view itself (a
 * conversation opening at its latest message) is not the reader scrolling down.
 */
function useBarHiddenOnScroll(shell: RefObject<HTMLDivElement | null>, enabled: boolean): [boolean, (hidden: boolean) => void] {
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        const root = shell.current;
        if (root === null || !enabled) {
            setHidden(false);
            return undefined;
        }
        const last = new WeakMap<EventTarget, number>();
        let readerAt = Number.NEGATIVE_INFINITY;
        let readerTarget: EventTarget | null = null;
        const reader = (event: Event) => {
            readerAt = performance.now();
            readerTarget = event.target;
        };
        // A key typed into a field is the field's, not a scroll of the view: arrows and Space move the caret there.
        const key = (event: KeyboardEvent) => {
            const target = event.target;
            const editing = target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null);
            if (!editing && SCROLL_KEYS.has(event.key)) reader(event);
        };
        const scrolled = (event: Event) => {
            const el = event.target;
            if (!(el instanceof HTMLElement)) return;
            const now = el.scrollTop;
            const before = last.get(el) ?? 0;
            last.set(el, now);
            if (now <= 0) {
                setHidden(false);
                return;
            }
            if (performance.now() - readerAt > BAR_READER_WINDOW_MS) return;
            // The input moved this element only when it was aimed at it: its target inside it (a wheel or a touch over
            // it, a press on its scrollbar), or a key aimed at the whole page. A tap on a row that opens another view
            // is not the reader scrolling that view.
            const aimed = readerTarget === root || readerTarget === document.body
                || (readerTarget instanceof Node && el.contains(readerTarget));
            if (!aimed) return;
            if (now < before - BAR_SCROLL_STEP) setHidden(false);
            else if (now > before + BAR_SCROLL_STEP && now > BAR_HIDE_AFTER) setHidden(true);
        };
        const inputs: [string, EventListener][] = [['wheel', reader], ['touchmove', reader], ['pointerdown', reader], ['keydown', key as EventListener]];
        for (const [type, listener] of inputs) root.addEventListener(type, listener, { capture: true, passive: true });
        root.addEventListener('scroll', scrolled, { capture: true, passive: true });
        return () => {
            for (const [type, listener] of inputs) root.removeEventListener(type, listener, { capture: true });
            root.removeEventListener('scroll', scrolled, { capture: true });
        };
    }, [shell, enabled]);
    return [hidden, setHidden];
}

/**
 * One screen of a section at phone width (contract component `screen-shell`: root, nested, with-filters,
 * with-primary-action, with-primary-menu, pulling, refreshing, searching, bar-hidden). One bar: the section's navigation or Back
 * with the parent's name, the title, then search and the shell's own icons, or while searching, Close and the field; the filters under it; the content, which
 * scrolls on its own and refreshes by a pull from its top; the primary action floating at the bottom right, its menu
 * opening above it. What fills each slot is the host's, from the server's declared nodes.
 */
export function ScreenShell({ title, back, navigation, search, searching, globals, filters, primary: declared, onRefresh, pullText, barHidden, children }: ScreenShellProps): ReactNode {
    // A primary menu with no entry to show is not drawn at all: no empty menus.
    const primary = declared !== undefined && 'menu' in declared && !declared.menu.some(m => m.offer.offered) ? undefined : declared;
    const shell = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const refresh = onRefresh === undefined ? null : () => {
        if (refreshing) return;
        setRefreshing(true);
        void onRefresh().finally(() => setRefreshing(false));
    };
    const distance = usePull(content, refresh);
    const pull: PullState | null = onRefresh === undefined ? null : { distance, refreshing, text: pullText ?? null };
    const held = searching !== undefined || distance > 0 || refreshing;
    const [scrolledAway, setScrolledAway] = useBarHiddenOnScroll(shell, barHidden === undefined && !held);
    const hidden = !held && (barHidden ?? scrolledAway);
    return (
        <div
            ref={shell}
            className={cx('cms-screen', primary !== undefined && 'cms-screen--with-primary')}
            data-bar-hidden={hidden ? '' : undefined}
            onFocus={(event) => {
                if (hidden && event.target instanceof Element && event.target.closest('.cms-screen__bar, .cms-screen__filters') !== null) {
                    setScrolledAway(false);
                }
            }}
        >
            {searching !== undefined ? (
                <header className="cms-screen__bar cms-screen__bar--searching">
                    <button type="button" className="cms-icon-button cms-screen__icon" aria-label={searching.closeLabel} title={searching.closeLabel} onClick={searching.onClose}>
                        <Icon name="chevron-left" />
                    </button>
                    <div className="cms-screen__search">{searching.field}</div>
                </header>
            ) : (
            <header className="cms-screen__bar">
                <div className="cms-screen__leading">
                    {back !== undefined ? (
                        back.href !== undefined ? (
                            <a className="cms-screen__back" href={back.href} onClick={back.onBack}>
                                <Icon name="chevron-left" />
                                <span className="cms-screen__back-name">{back.label}</span>
                            </a>
                        ) : (
                            <button type="button" className="cms-screen__back" onClick={back.onBack}>
                                <Icon name="chevron-left" />
                                <span className="cms-screen__back-name">{back.label}</span>
                            </button>
                        )
                    ) : navigation}
                </div>
                <h1 className="cms-screen__title" title={title}>{title}</h1>
                <div className="cms-screen__trailing">
                    {search !== undefined ? (
                        <button type="button" className="cms-icon-button cms-screen__icon" aria-label={search.label} title={search.label} onClick={search.onOpen}>
                            <Icon name="search" />
                        </button>
                    ) : null}
                    {globals}
                </div>
            </header>
            )}
            {filters !== undefined ? (
                <div className="cms-screen__filters">
                    <FilterChips label={filters.label} options={filters.options} value={filters.selected} onChange={filters.onSelect} />
                </div>
            ) : null}
            <div ref={content} className="cms-screen__content" data-pulling={distance > 0 ? '' : undefined} data-refreshing={refreshing ? '' : undefined}>
                <PullContext.Provider value={pull}>{children}</PullContext.Provider>
            </div>
            {primary !== undefined ? (
                <button
                    type="button"
                    className="cms-button cms-button--primary cms-screen__primary"
                    aria-label={primary.label}
                    title={primary.label}
                    {...('menu' in primary ? { 'aria-haspopup': 'menu' as const, 'aria-expanded': menuAt !== null } : {})}
                    onClick={(event) => {
                        if ('menu' in primary) {
                            const r = event.currentTarget.getBoundingClientRect();
                            setMenuAt(menuAt === null ? { x: r.left, y: r.top } : null);
                        } else {
                            primary.onPress();
                        }
                    }}
                >
                    <Icon name={primary.icon} size={24} />
                </button>
            ) : null}
            {primary !== undefined && 'menu' in primary ? (
                <ContextMenu at={menuAt} items={primary.menu} onClose={() => setMenuAt(null)} label={primary.label} />
            ) : null}
        </div>
    );
}
