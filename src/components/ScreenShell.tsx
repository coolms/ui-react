import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { PullContext, usePull, type PullState } from './pull.js';
import { ContextMenu, type MenuItem } from './Collections.js';
import { Icon, type IconName } from './Icon.js';
import { FilterButton, activeChoice, choiceItems, filterName, useStaleChoice, type ListFilter } from './FilterMenu.js';
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
    /**
     * The section's secondary actions, the entries the section header shows under its More, in the tree's order; a
     * refused one stays, with the server's reason. With none shown, no More; never on an item's own screen.
     */
    readonly more?: readonly MenuItem[];
    /** More's accessible name and tooltip, from the host's catalogue. */
    readonly moreLabel?: string;
    /** The shell's own icons, the same in every section: the bell, then the person's avatar. */
    readonly globals?: ReactNode;
    /**
     * The list's filter: an icon in the bar, after the search. On a choice other than the default the icon takes the
     * accent, and the title reads the place's name and the choice's. In a bar too narrow for both it moves into More,
     * while More is drawn for other actions.
     */
    readonly filter?: ListFilter;
    /** The floating primary action, given only when the server declares it; never on an item's own screen. */
    readonly primary?: ScreenPrimary;
    /** With it the content takes the pull: the refresh, and while it runs the refreshing state. */
    readonly onRefresh?: () => Promise<unknown>;
    /** What the pull says while pulled: the time of the last sync. */
    readonly pullText?: ReactNode;
    /**
     * Whether the bar is out of view. Not given, the shell decides: out while the content, or any pane in it, scrolls
     * down past the bar's own height; back on any scroll up, at the top, or when focus moves into the bar. Never while
     * searching, pulling or refreshing, or while the filter's menu or More's is open, whatever is given.
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

/** The title's least width while the list is not filtered. */
const TITLE_LEAST = 48;

/** A bar's widths, none of them the widths its parts have been given: the same bar always has the same ones. */
export interface BarWidths {
    /** The bar's room, its padding left out. */
    readonly bar: number;
    /** The least width of what leads, 0 for nothing. */
    readonly leading: number;
    /** The gap between what leads, the title and the icons. */
    readonly gap: number;
    /** One icon of the bar, and the gap between two. */
    readonly icon: number;
    readonly iconGap: number;
    /** The icons the bar has beside the filter's. */
    readonly search: boolean;
    readonly more: boolean;
    readonly globals: readonly number[];
    /** The choice's name with its middle dot, whole; null while the list is not filtered. */
    readonly choice: number | null;
}

/**
 * Whether the filter goes into More: the bar with the filter in it leaves the title less than its least (the choice's
 * name whole, or 48px while the list is not filtered), and More is drawn for other actions. It reads no width that the
 * answer changes, so one width of the bar has one answer.
 */
export function filterGoesIntoMore({ bar, leading, gap, icon, iconGap, search, more, globals, choice }: BarWidths): boolean {
    if (!more) return false;
    const icons = [...(search ? [icon] : []), icon, icon, ...globals];
    const trailing = icons.reduce((sum, w) => sum + w, 0) + iconGap * (icons.length - 1);
    const room = bar - (leading > 0 ? leading + gap : 0) - gap - trailing;
    // A hundredth of a pixel is the sums' own rounding, not a missing one.
    return room + 0.01 < (choice ?? TITLE_LEAST);
}

/**
 * One screen of a section at phone width (contract component `screen-shell`: root, nested, with-filter, filtered,
 * filter-in-more, with-primary-action, with-primary-menu, with-more, pulling, refreshing, searching, bar-hidden). One bar: the section's
 * navigation or Back with the parent's name, the title (with the filter's choice while it is not the default), then
 * search, the filter, More and the shell's own icons, or while searching, Close and the field; the content, which
 * scrolls on its own and refreshes by a pull from its top; the primary action floating at the bottom right, its menu
 * opening above it. What fills each slot is the host's, from the server's declared nodes.
 */
export function ScreenShell({ title, back, navigation, search, searching, more = [], moreLabel = 'More actions', globals, filter, primary: declared, onRefresh, pullText, barHidden, children }: ScreenShellProps): ReactNode {
    // A primary menu with no entry to show is not drawn at all: no empty menus.
    const primary = declared !== undefined && 'menu' in declared && !declared.menu.some(m => m.offer.offered) ? undefined : declared;
    const shell = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const [moreAt, setMoreAt] = useState<{ x: number; y: number } | null>(null);
    const closeMore = useCallback(() => setMoreAt(null), []);
    // A press on More while its menu is open closes the menu; the click of that press does not open it again.
    const moreWasOpen = useRef(false);
    const bar = useRef<HTMLElement>(null);
    const trailing = useRef<HTMLDivElement>(null);
    const moreButton = useRef<HTMLButtonElement>(null);
    const withMore = more.some(m => m.offer.offered);
    const moreOpen = moreAt !== null && withMore && searching === undefined;
    useStaleChoice(filter);
    const choice = filter === undefined ? null : activeChoice(filter);
    const [filterOpen, setFilterOpen] = useState(false);
    // A choice the person made here; whether the filter's move is its doing; and the last thing focused in the shell.
    const chosen = useRef(false);
    const moves = useRef(false);
    const focused = useRef<Element | null>(null);
    const told = filter === undefined ? undefined : {
        ...filter,
        onChange: (id: string) => {
            chosen.current = true;
            filter.onChange(id);
        },
    };
    const choiceText = choice === null ? '' : ` \u00b7 ${choice.label}`;
    const withFilter = filter !== undefined && filter.options.length >= 2;
    const [narrow, setNarrow] = useState(false);
    const inMore = withFilter && withMore && narrow;
    const shellKey = JSON.stringify([withFilter, withMore, inMore, search !== undefined, searching !== undefined, back !== undefined, choiceText]);
    const fit = useCallback(() => {
        const header = bar.current;
        const icons = trailing.current;
        const sample = moreButton.current;
        if (header === null || icons === null || sample === null || !withFilter) return null;
        const px = (value: string) => parseFloat(value) || 0;
        const style = getComputedStyle(header);
        const width = header.getBoundingClientRect().width;
        // Not laid out: nothing to decide by.
        if (width === 0) return null;
        const lead = header.querySelector<HTMLElement>('.cms-screen__leading');
        const own = (search !== undefined ? 1 : 0) + (inMore ? 0 : 1) + 1;
        return filterGoesIntoMore({
            bar: width - px(style.paddingLeft) - px(style.paddingRight),
            leading: lead === null || lead.childNodes.length === 0 ? 0 : px(getComputedStyle(lead).minWidth),
            gap: px(style.columnGap),
            icon: sample.getBoundingClientRect().width,
            iconGap: px(getComputedStyle(icons).columnGap),
            search: search !== undefined,
            more: true,
            globals: Array.from(icons.children).slice(own).map(e => e.getBoundingClientRect().width),
            choice: header.querySelector('.cms-screen__ruler > span')?.getBoundingClientRect().width ?? null,
        });
        // The measuring reads the bar as drawn now; `shellKey` names what changes it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shellKey]);
    useLayoutEffect(() => {
        const next = fit() ?? narrow;
        // A choice is answered once, by the first bar that shows it.
        if (next !== narrow && chosen.current) moves.current = true;
        chosen.current = false;
        setNarrow(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fit]);
    useEffect(() => {
        if (bar.current === null || typeof ResizeObserver === 'undefined') return undefined;
        const watch = new ResizeObserver(() => {
            const next = fit();
            if (next !== null) setNarrow(next);
        });
        // The bar's width; the icons', the host's own among them; and the choice's name, as its font comes.
        for (const e of [bar.current, trailing.current, bar.current.querySelector('.cms-screen__ruler > span')]) if (e !== null) watch.observe(e);
        return () => watch.disconnect();
    }, [fit]);
    // The filter moved: an open More closes, and the focus goes where the filter is when a choice moved it, or when the
    // move took away what had it.
    const wasInMore = useRef(inMore);
    useLayoutEffect(() => {
        if (wasInMore.current === inMore) return;
        wasInMore.current = inMore;
        setMoreAt(null);
        const active = document.activeElement;
        const lost = active === document.body && focused.current !== null && !focused.current.isConnected;
        if (lost || (moves.current && (active === document.body || bar.current?.contains(active) === true))) {
            (inMore ? moreButton.current : trailing.current?.querySelector<HTMLElement>('.cms-filter-menu'))?.focus();
        }
        moves.current = false;
    }, [inMore]);
    const moreName = inMore && choice !== null && filter !== undefined ? `${moreLabel}, ${filterName(filter)}` : moreLabel;
    const refresh = onRefresh === undefined ? null : () => {
        if (refreshing) return;
        setRefreshing(true);
        void onRefresh().finally(() => setRefreshing(false));
    };
    const distance = usePull(content, refresh);
    const pull: PullState | null = onRefresh === undefined ? null : { distance, refreshing, text: pullText ?? null };
    const held = searching !== undefined || distance > 0 || refreshing || moreOpen || filterOpen;
    const [scrolledAway, setScrolledAway] = useBarHiddenOnScroll(shell, barHidden === undefined && !held);
    const hidden = !held && (barHidden ?? scrolledAway);
    return (
        <div
            ref={shell}
            className={cx('cms-screen', primary !== undefined && 'cms-screen--with-primary')}
            data-bar-hidden={hidden ? '' : undefined}
            onFocus={(event) => {
                focused.current = event.target;
                if (hidden && event.target instanceof Element && event.target.closest('.cms-screen__bar') !== null) {
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
            <header ref={bar} className="cms-screen__bar">
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
                {choice === null ? <h1 className="cms-screen__title" title={title}>{title}</h1> : (
                    <h1 className="cms-screen__title cms-screen__title--filtered" title={title + choiceText}>
                        <span className="cms-screen__title-name">{title}</span>
                        <span className="cms-screen__title-choice">{choiceText}</span>
                    </h1>
                )}
                {choice !== null ? <span className="cms-screen__ruler" aria-hidden="true"><span>{choiceText}</span></span> : null}
                <div ref={trailing} className="cms-screen__trailing">
                    {search !== undefined ? (
                        <button type="button" className="cms-icon-button cms-screen__icon" aria-label={search.label} title={search.label} onClick={search.onOpen}>
                            <Icon name="search" />
                        </button>
                    ) : null}
                    {told !== undefined && !inMore ? <FilterButton {...told} iconOnly onOpenChange={setFilterOpen} /> : null}
                    {withMore ? (
                        <button
                            ref={moreButton}
                            type="button"
                            className={cx('cms-icon-button cms-screen__icon', inMore && choice !== null && 'cms-screen__icon--active')}
                            data-action="more"
                            aria-haspopup="menu"
                            aria-expanded={moreOpen}
                            aria-label={moreName}
                            title={moreName}
                            onMouseDown={() => { moreWasOpen.current = moreOpen; }}
                            onClick={(event) => {
                                const r = event.currentTarget.getBoundingClientRect();
                                setMoreAt(moreWasOpen.current ? null : { x: r.left, y: r.bottom + 4 });
                                moreWasOpen.current = false;
                            }}
                        >
                            <Icon name="more" />
                        </button>
                    ) : null}
                    {globals}
                </div>
            </header>
            )}
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
            <ContextMenu
                at={moreOpen ? moreAt : null}
                items={inMore && told !== undefined ? [...more, ...choiceItems(told, told.label)] : more}
                onClose={closeMore}
                label={moreLabel}
                focus="first"
            />
            {primary !== undefined && 'menu' in primary ? (
                <ContextMenu at={menuAt} items={primary.menu} onClose={() => setMenuAt(null)} label={primary.label} />
            ) : null}
        </div>
    );
}
