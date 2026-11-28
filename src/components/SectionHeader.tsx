import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ContextMenu, type MenuItem } from './Collections.js';
import { Icon, iconForName, type IconName } from './Icon.js';
import { cx } from './internal.js';
import type { Offer } from '../server/capability.js';

/** The section's primary action: one action, or a split button whose menu lists the action's declared entries. */
export type SectionPrimary =
    | { readonly label: string; readonly icon: IconName; readonly onPress: () => void; readonly offer?: Offer }
    | {
          readonly label: string;
          readonly icon: IconName;
          readonly onPress: () => void;
          readonly offer?: Offer;
          readonly menu: readonly MenuItem[];
          /** The split menu button's accessible name. */
          readonly menuLabel: string;
      };

/** One of the section's other declared actions: a button in row 1 while it fits. */
export interface SectionAction {
    readonly id: string;
    /** Its accessible name always, and its tooltip once it shows as its icon. */
    readonly label: string;
    /** Its icon by its Bootstrap Icons name, as the server names it; without one (or one the kit lacks) it keeps its label. */
    readonly icon?: string;
    /**
     * When it gives way: lower first, actions sharing a number together; without one, after every numbered one, from
     * the end of the row back. 0: menu only, in More at every width (a single one alone is a button at the row's end).
     */
    readonly overflow?: number;
    readonly danger?: boolean;
    /** The server's answer (R3); not offered = not drawn; a refusal = shown disabled, with the server's sentence. */
    readonly offer?: Offer;
    readonly onPress: () => void;
}

/** A chip after the title: a slug, a state, a count. */
export interface SectionMeta {
    readonly id: string;
    /** The chip as the host draws it. */
    readonly content: ReactNode;
    /** Its whole text: its tooltip and accessible name once it is cut. */
    readonly text: string;
    /** The page says it elsewhere too: it may hide. Not set, it is the only place its fact appears and never hides. */
    readonly elsewhere?: boolean;
}

export interface SectionHeaderProps {
    /** The section's declared title. */
    readonly title: string;
    /** An icon before the title. */
    readonly icon?: IconName;
    /** One line saying what the section is for, after the title; the first to hide. */
    readonly description?: string;
    /** Chips after the title. */
    readonly meta?: readonly SectionMeta[];
    /** Given only when the section declares one. */
    readonly primary?: SectionPrimary;
    /** The section's other declared actions, in the tree's order: buttons while they fit, then in More. */
    readonly secondary?: readonly SectionAction[];
    /**
     * Deprecated, read as `secondary` for one release: other actions as menu items. They have no icon or priority of
     * their own, so each keeps its label until it moves into More, from the end of the row back.
     */
    readonly more?: readonly MenuItem[];
    /** More's accessible name and tooltip, from the host's catalogue. */
    readonly moreLabel: string;
    /** Row 2: the section's context (a mailbox card, a list's name with its filter, breadcrumbs); with none, no row 2. */
    readonly context?: ReactNode;
    /** The header spans a one-column page. */
    readonly fullWidth?: boolean;
}

/** An action of row 1 after the title, the primary's apart: a declared secondary, or an old menu item. */
interface RowAction {
    readonly id: string;
    readonly label: ReactNode;
    /** Its name as text. */
    readonly name: string;
    readonly icon: IconName | null;
    readonly overflow: number | undefined;
    readonly danger: boolean;
    readonly offer: Offer;
    readonly run: () => void;
}

/** How row 1 has given way, step by step (contract `section-header`, width). */
interface Layout {
    /** Step 1. */
    readonly descriptionHidden: boolean;
    /** Step 2. */
    readonly elsewhereHidden: boolean;
    /** Step 7, once the actions have given way: the title may be cut to its floor, in px (64, or all of it if shorter). */
    readonly titleCut: boolean;
    readonly titleFloor: number;
    /** Step 3. */
    readonly bare: ReadonlySet<string>;
    /** Step 4. */
    readonly primaryBare: boolean;
    /** Step 5. */
    readonly hidden: ReadonlySet<string>;
    /** Step 6. */
    readonly primaryHidden: boolean;
    /** Step 8. */
    readonly chipsCut: boolean;
}
const NONE: ReadonlySet<string> = new Set();
const FULL: Layout = { descriptionHidden: false, elsewhereHidden: false, titleCut: false, titleFloor: 0, bare: NONE, primaryBare: false, hidden: NONE, primaryHidden: false, chipsCut: false };
const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every(id => b.has(id));
const sameLayout = (a: Layout, b: Layout) =>
    a.descriptionHidden === b.descriptionHidden && a.elsewhereHidden === b.elsewhereHidden && a.titleCut === b.titleCut && a.titleFloor === b.titleFloor
    && same(a.bare, b.bare) && a.primaryBare === b.primaryBare && same(a.hidden, b.hidden) && a.primaryHidden === b.primaryHidden
    && a.chipsCut === b.chipsCut;
/** The title is cut down to this, or to all of it where it is shorter. */
const TITLE_FLOOR = 64;
const PRIMARY = 'primary';

/**
 * The head of a section from tablet width up (contract component `section-header`: default, with-primary,
 * with-primary-menu, with-more, with-secondary, secondary-icon, secondary-in-more, lone-menu-only, action-disabled,
 * with-context, with-description, meta-hidden, meta-cut, primary-icon, primary-in-more, full-width).
 *
 * Row 1, on one line at every width: the title, its description and chips, then the secondary actions as quiet
 * buttons, the primary, and More. It is measured on its own width and gives way in this order: the description hides;
 * the chips the page says elsewhere hide; the secondary actions drop their labels one by one (lower overflow first, then
 * those with none from the end back); the primary drops its label, keeping its colour; the secondary actions move into
 * More in the same order; the primary moves into More last; only then is the title cut, down to 64px (the actions give
 * way before the title, never the title before them); and last the chips that are the only place their fact appears
 * are cut, the last first. More never holds one action: the first move
 * takes two, or one beside a menu-only action, and where only one could go it stays, at its icon width. More lists the
 * primary first, then those that gave way, then the menu-only last.
 *
 * Its actions are one toolbar named by the title: one Tab stop; Left and Right, Home and End move inside it. Row 2:
 * the context, only when given. No divider lines. Below tablet width the host draws the screen shell instead.
 */
export function SectionHeader({ title, icon, description, meta = [], primary, secondary, more = [], moreLabel, context, fullWidth = false }: SectionHeaderProps): ReactNode {
    const [menu, setMenu] = useState<{ which: 'primary' | 'more'; x: number; y: number } | null>(null);
    const [layout, setLayout] = useState<Layout>(FULL);
    const [current, setCurrent] = useState<string | null>(null);
    const row = useRef<HTMLDivElement>(null);
    const measure = useRef<HTMLDivElement>(null);
    const moreButton = useRef<HTMLButtonElement>(null);
    const reasonId = useId();
    const idBase = useId();

    // The row's other actions: the declared secondaries, then the old menu items, menu only.
    const actions: RowAction[] = [
        ...(secondary ?? []).map((a): RowAction => ({
            id: a.id, label: a.label, name: a.label, icon: a.icon === undefined ? null : iconForName(a.icon), overflow: a.overflow,
            danger: a.danger === true, offer: a.offer ?? { offered: true, locked: false }, run: a.onPress,
        })),
        ...more.map((m): RowAction => ({
            id: m.id, label: m.label, name: typeof m.label === 'string' ? m.label : m.id, icon: null, overflow: undefined,
            danger: m.danger === true, offer: m.offer, run: m.onSelect,
        })),
    ].filter(a => a.offer.offered);
    const menuOnly = actions.filter(a => a.overflow === 0);
    const inRow = actions.filter(a => a.overflow !== 0);
    const lone = menuOnly.length === 1 ? menuOnly[0] ?? null : null;
    const units = unitsOf(inRow);
    const pinned = inRow.filter(a => a.overflow === undefined).map(a => a.id).reverse();
    // The order the secondaries give way in: by overflow, then the pinned from the end back.
    const goOrder = [...units, ...pinned.map(id => [id])];
    const labelOrder = [...(lone !== null ? [[lone.id]] : []), ...goOrder];

    const primaryShown = primary !== undefined && primary.offer?.offered !== false;
    const refusal = primary?.offer?.refusal;
    const off = primary !== undefined && (primary.offer?.offered === false || refusal !== undefined);
    // The primary's menu entries that are shown: with none, the primary is a plain button with no menu half.
    const entries = primary !== undefined && 'menu' in primary ? primary.menu.filter(m => m.offer.offered) : [];
    const split = primary !== undefined && 'menu' in primary && entries.length > 0 ? primary : null;
    const elsewhere = meta.filter(m => m.elsewhere === true);

    const key = JSON.stringify([
        title, icon ?? null, description ?? null, meta.map(m => [m.id, m.text, m.elsewhere === true]),
        primaryShown ? [primary.label, primary.icon, split !== null] : null,
        actions.map(a => [a.id, a.name, a.icon, a.overflow ?? null]),
    ]);

    const fit = useCallback(() => {
        const box = row.current;
        const ruler = measure.current;
        if (box === null || ruler === null) return;
        const style = getComputedStyle(box);
        const gap = parseFloat(style.columnGap || '0') || 0;
        const room = box.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
        const width = (selector: string) => ruler.querySelector<HTMLElement>(selector)?.getBoundingClientRect().width ?? 0;
        const titleFull = width('[data-measure="title"]');
        const titleFloor = Math.min(titleFull, TITLE_FLOOR);
        const needed = (l: Layout) => {
            const behind = behindOf(l);
            const parts: number[] = [];
            if (icon !== undefined) parts.push(width('[data-measure="lead"]'));
            parts.push(l.titleCut ? titleFloor : titleFull);
            if (description !== undefined && !l.descriptionHidden) parts.push(width('[data-measure="description"]'));
            for (const m of meta) if (!(m.elsewhere === true && l.elsewhereHidden)) parts.push(width(`[data-measure="meta"][data-measure-id="${CSS.escape(m.id)}"]`));
            for (const a of actions) {
                if (behind.has(a.id)) continue;
                const bareNow = l.bare.has(a.id) && a.icon !== null;
                parts.push(width(`[data-measure="${bareNow ? 'icon' : 'full'}"][data-measure-id="${CSS.escape(a.id)}"]`));
            }
            if (primaryShown && !l.primaryHidden) parts.push(width(`[data-measure="${l.primaryBare ? 'primary-icon' : 'primary'}"]`));
            if (behind.size > 0) parts.push(width('[data-measure="more"]'));
            return parts.reduce((s, w) => s + w, 0) + gap * Math.max(0, parts.length - 1);
        };
        let l: Layout = { ...FULL, titleFloor };
        const fits = (next: Layout) => {
            l = next;
            return needed(next) <= room;
        };
        const chosen = ((): Layout => {
            if (fits(l)) return l;
            if (description !== undefined && fits({ ...l, descriptionHidden: true })) return l;
            l = { ...l, descriptionHidden: true };
            if (elsewhere.length > 0 && fits({ ...l, elsewhereHidden: true })) return l;
            l = { ...l, elsewhereHidden: true };
            // The actions give way before the title, never the title before them.
            const bare = new Set<string>();
            for (const unit of labelOrder) {
                for (const id of unit) bare.add(id);
                if (fits({ ...l, bare: new Set(bare) })) return l;
            }
            if (primaryShown && fits({ ...l, primaryBare: true })) return l;
            l = { ...l, primaryBare: primaryShown };
            // More never holds one action: the first move takes two, or one beside a menu-only action already there.
            const hidden = new Set<string>();
            const order = [...goOrder, ...(primaryShown ? [[PRIMARY]] : [])];
            const enough = () => hidden.size + menuOnly.length >= 2;
            const at = (h: ReadonlySet<string>): Layout => ({ ...l, hidden: new Set([...h].filter(id => id !== PRIMARY)), primaryHidden: h.has(PRIMARY) });
            const base = l;
            for (const unit of order) {
                for (const id of unit) hidden.add(id);
                if (enough() && fits(at(hidden))) return l;
                l = base;
            }
            // Only one could go: it stays in the row, at its icon width.
            const given = enough() ? at(hidden) : base;
            // Only once the actions have given way is the title cut, down to its floor; last, the chips said only here.
            if (fits({ ...given, titleCut: true })) return l;
            return { ...given, titleCut: true, chipsCut: true };
        })();
        setLayout(was => (sameLayout(was, chosen) ? was : chosen));
        // The measuring reads the parts as drawn now; `key` names what changes them.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useLayoutEffect(fit, [fit]);
    useEffect(() => {
        const box = row.current;
        if (box === null || typeof ResizeObserver === 'undefined') return undefined;
        const watch = new ResizeObserver(() => fit());
        watch.observe(box);
        return () => watch.disconnect();
    }, [fit]);

    /** What is behind More: the menu-only actions (a lone one only once another is there), and those the width sent. */
    function behindOf(l: Layout): ReadonlySet<string> {
        const sent = l.hidden.size + (l.primaryHidden ? 1 : 0);
        return new Set([...menuOnly.filter(a => a !== lone || sent > 0).map(a => a.id), ...l.hidden, ...(l.primaryHidden ? [PRIMARY] : [])]);
    }
    const behind = behindOf(layout);
    const shownActions = actions.filter(a => !behind.has(a.id) && a !== lone);
    const loneShown = lone !== null && !behind.has(lone.id) ? lone : null;
    const primaryInRow = primaryShown && !layout.primaryHidden;
    const byId = (id: string) => actions.find(a => a.id === id);
    const gaveWay = goOrder.flat().filter(id => layout.hidden.has(id)).map(byId).filter((a): a is RowAction => a !== undefined);

    // More's menu: the primary first (its menu's entries after it), then those that gave way, then the menu-only last.
    const asItem = (a: RowAction): MenuItem => ({ id: a.id, label: a.label, offer: a.offer, ...(a.danger ? { danger: true } : {}), onSelect: a.run });
    const moreItems: MenuItem[] = [
        ...(primaryShown && layout.primaryHidden
            ? [{ id: PRIMARY, label: primary.label, offer: primary.offer ?? { offered: true, locked: false }, onSelect: () => { if (!off) primary.onPress(); } }, ...entries]
            : []),
        ...gaveWay.map(asItem),
        ...(behind.size > 0 ? menuOnly.map(asItem) : []),
    ];
    const moreShown = moreItems.length > 0;

    // One Tab stop: the actions shown, the primary (and its menu half), the lone one, More.
    const stops = [
        ...shownActions.map(a => a.id),
        ...(primaryInRow ? [PRIMARY, ...(split !== null ? ['primary-menu'] : [])] : []),
        ...(loneShown !== null ? [loneShown.id] : []),
        ...(moreShown ? ['more'] : []),
    ];
    const focusable = current !== null && stops.includes(current) ? current : stops[0] ?? null;
    // A focused action that moves into More leaves the focus on More.
    useEffect(() => {
        if (current === null || stops.includes(current) || !moreShown) return;
        if (row.current?.contains(document.activeElement) || document.activeElement === document.body) {
            setCurrent('more');
            moreButton.current?.focus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout]);
    const stopId = (id: string) => `${idBase}-${id}`;
    const move = (event: KeyboardEvent<HTMLDivElement>) => {
        const at = stops.indexOf(focusable ?? '');
        let to: number | null = null;
        if (event.key === 'ArrowRight') to = Math.min(stops.length - 1, at + 1);
        else if (event.key === 'ArrowLeft') to = Math.max(0, at - 1);
        else if (event.key === 'Home') to = 0;
        else if (event.key === 'End') to = stops.length - 1;
        if (to === null) return;
        event.preventDefault();
        const id = stops[to] ?? null;
        setCurrent(id);
        if (id !== null) document.getElementById(stopId(id))?.focus();
    };
    const toggle = (which: 'primary' | 'more', target: HTMLElement) => {
        const r = target.getBoundingClientRect();
        setMenu(menu?.which === which ? null : { which, x: r.left, y: r.bottom + 4 });
    };
    const stop = (id: string) => ({ id: stopId(id), tabIndex: focusable === id ? 0 : -1, onFocus: () => setCurrent(id) });

    const drawAction = (a: RowAction) => {
        const bareNow = layout.bare.has(a.id) && a.icon !== null;
        const reason = a.offer.refusal;
        const reasonFor = `${idBase}-reason-${a.id}`;
        return (
            <button
                key={a.id}
                type="button"
                className={cx('cms-button', 'cms-button--quiet', 'cms-section-header__secondary', bareNow && 'cms-section-header__secondary--bare', a.danger && 'is-danger')}
                data-action={a.id}
                aria-label={bareNow ? a.name : undefined}
                aria-disabled={reason !== undefined ? 'true' : undefined}
                aria-describedby={reason !== undefined ? reasonFor : undefined}
                title={reason !== undefined ? (bareNow ? `${a.name}: ${reason}` : reason) : bareNow ? a.name : undefined}
                {...stop(a.id)}
                onClick={() => {
                    if (reason === undefined) a.run();
                }}
            >
                {a.icon !== null ? <Icon name={a.icon} size={18} /> : null}
                {bareNow ? null : <span className="cms-section-header__label">{a.label}</span>}
                {reason !== undefined ? <span id={reasonFor} className="cms-visually-hidden">{reason}</span> : null}
            </button>
        );
    };

    return (
        <header className={cx('cms-section-header', fullWidth && 'cms-section-header--full')}>
            <div ref={row} className={cx('cms-section-header__row', layout.chipsCut && 'cms-section-header__row--chips-cut')} data-row="1">
                {icon !== undefined ? <Icon name={icon} /> : null}
                <h1
                    className="cms-section-header__title"
                    title={title}
                    style={{ minWidth: layout.titleCut ? `${layout.titleFloor}px` : 'max-content' }}
                >
                    {title}
                </h1>
                {description !== undefined ? (
                    <span className={cx('cms-section-header__description', layout.descriptionHidden && 'cms-visually-hidden')}>{description}</span>
                ) : null}
                {meta.map((m, i) => (
                    <span
                        key={m.id}
                        className="cms-section-header__meta"
                        data-meta={m.id}
                        hidden={m.elsewhere === true && layout.elsewhereHidden}
                        // The last is cut first.
                        style={layout.chipsCut && m.elsewhere !== true ? { flexShrink: i + 1 } : undefined}
                        {...(layout.chipsCut && m.elsewhere !== true ? { title: m.text, 'aria-label': m.text } : {})}
                    >
                        {m.content}
                    </span>
                ))}
                <div className="cms-section-header__actions" role="toolbar" aria-label={title} onKeyDown={move}>
                    {shownActions.map(drawAction)}
                    {primaryInRow ? (
                        <span className={cx('cms-section-header__primary', split !== null && 'cms-section-header__primary--split')}>
                            <button
                                type="button"
                                className={cx('cms-button', 'cms-button--primary', layout.primaryBare && 'cms-section-header__primary--bare')}
                                data-action="primary"
                                aria-label={layout.primaryBare ? primary.label : undefined}
                                aria-disabled={off ? 'true' : undefined}
                                aria-describedby={refusal !== undefined ? reasonId : undefined}
                                title={layout.primaryBare ? (refusal !== undefined ? `${primary.label}: ${refusal}` : primary.label) : refusal}
                                {...stop(PRIMARY)}
                                onClick={() => {
                                    if (!off) primary.onPress();
                                }}
                            >
                                <Icon name={primary.icon} />
                                {layout.primaryBare ? null : <> <span>{primary.label}</span></>}
                            </button>
                            {split !== null ? (
                                <button
                                    type="button"
                                    className="cms-button cms-button--primary cms-section-header__split"
                                    data-action="primary-menu"
                                    aria-haspopup="menu"
                                    aria-expanded={menu?.which === 'primary'}
                                    aria-label={split.menuLabel}
                                    {...stop('primary-menu')}
                                    onClick={e => toggle('primary', e.currentTarget)}
                                >
                                    <Icon name="chevron-down" />
                                </button>
                            ) : null}
                            {refusal !== undefined ? <span id={reasonId} className="cms-visually-hidden">{refusal}</span> : null}
                        </span>
                    ) : null}
                    {loneShown !== null ? drawAction(loneShown) : null}
                    {moreShown ? (
                        <button
                            ref={moreButton}
                            type="button"
                            className="cms-section-header__more"
                            data-action="more"
                            aria-haspopup="menu"
                            aria-expanded={menu?.which === 'more'}
                            aria-label={moreLabel}
                            title={moreLabel}
                            {...stop('more')}
                            onClick={e => toggle('more', e.currentTarget)}
                        >
                            <Icon name="more" />
                        </button>
                    ) : null}
                </div>
                {/* What each part takes, drawn out of sight: the row is fitted to these widths. */}
                <div ref={measure} className="cms-section-header__measure" aria-hidden="true">
                    {icon !== undefined ? <span data-measure="lead"><Icon name={icon} /></span> : null}
                    <span data-measure="title" className="cms-section-header__title">{title}</span>
                    {description !== undefined ? <span data-measure="description" className="cms-section-header__description">{description}</span> : null}
                    {meta.map(m => <span key={m.id} data-measure="meta" data-measure-id={m.id} className="cms-section-header__meta">{m.content}</span>)}
                    {actions.map(a => (
                        <span key={a.id}>
                            <span data-measure="full" data-measure-id={a.id} className="cms-button cms-button--quiet cms-section-header__secondary">
                                {a.icon !== null ? <Icon name={a.icon} size={18} /> : null}
                                <span className="cms-section-header__label">{a.label}</span>
                            </span>
                            <span data-measure="icon" data-measure-id={a.id} className="cms-button cms-button--quiet cms-section-header__secondary cms-section-header__secondary--bare">
                                {a.icon !== null ? <Icon name={a.icon} size={18} /> : null}
                            </span>
                        </span>
                    ))}
                    {primaryShown ? (
                        <>
                            <span data-measure="primary" className="cms-section-header__primary">
                                <span className="cms-button cms-button--primary"><Icon name={primary.icon} /> <span>{primary.label}</span></span>
                                {split !== null ? <span className="cms-button cms-button--primary cms-section-header__split"><Icon name="chevron-down" /></span> : null}
                            </span>
                            <span data-measure="primary-icon" className="cms-section-header__primary">
                                <span className="cms-button cms-button--primary cms-section-header__primary--bare"><Icon name={primary.icon} /></span>
                                {split !== null ? <span className="cms-button cms-button--primary cms-section-header__split"><Icon name="chevron-down" /></span> : null}
                            </span>
                        </>
                    ) : null}
                    <span data-measure="more" className="cms-section-header__more"><Icon name="more" /></span>
                </div>
            </div>
            {context !== undefined && context !== null ? (
                <div className="cms-section-header__context" data-row="2">{context}</div>
            ) : null}
            {split !== null ? (
                <ContextMenu at={menu?.which === 'primary' ? menu : null} items={entries} onClose={() => setMenu(null)} label={split.menuLabel} />
            ) : null}
            <ContextMenu at={menu?.which === 'more' ? menu : null} items={moreItems} onClose={() => setMenu(null)} label={moreLabel} />
        </header>
    );
}

/** The secondaries with a priority, as units that give way together: lower first, one priority one unit. */
function unitsOf(actions: readonly RowAction[]): readonly (readonly string[])[] {
    const by = new Map<number, string[]>();
    for (const a of actions) if (a.overflow !== undefined && a.overflow !== 0) by.set(a.overflow, [...(by.get(a.overflow) ?? []), a.id]);
    return [...by.entries()].sort(([x], [y]) => x - y).map(([, ids]) => ids);
}
