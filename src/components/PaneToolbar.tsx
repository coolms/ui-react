import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, iconForName } from './Icon.js';
import { ContextMenu, type MenuItem } from './Collections.js';
import { STATE_DELAY_MS } from './State.js';
import { Glyph, cx } from './internal.js';

/** One entry of a menu button's menu: a child of the action's node, as the host resolved it. */
export interface PaneToolbarEntry {
    readonly id: string;
    readonly label: string;
    /** Its icon by its Bootstrap Icons name; one the kit's table lacks leaves its label alone. */
    readonly icon?: string;
    /** Shown, and doing nothing when chosen; `reason` is said beside it. */
    readonly disabled?: boolean;
    readonly reason?: string;
    readonly danger?: boolean;
}

/**
 * One action of a pane's row, as the server's action node gives it: which actions exist, their order, groups, icons and
 * danger are the server's; the row draws them and says which was chosen.
 */
export interface PaneToolbarAction {
    readonly id: string;
    /** Its icon by its Bootstrap Icons name, as the server names it; one the kit's table lacks leaves its label alone. */
    readonly icon: string;
    /** Its accessible name always, its tooltip once labels hide. */
    readonly label: string;
    /** Actions of one group sit together, groups in the order their first action comes; a separator between two. */
    readonly group: string;
    /**
     * When it goes behind ... as the row narrows: lower first; actions of the same priority go together (a toggle's
     * pair). Without one it is pinned: it goes behind ... only in a row too narrow to hold it with the rest, the last in
     * the row first, so that nothing is cut off. 0: menu only, behind ... at every width and never in the row, unless it
     * is the only action behind ...: then it is a button at the end of the row.
     */
    readonly overflow?: number;
    /**
     * The row's declared primary (a folder's Upload): it keeps its label longest and goes behind ... last, first in its
     * menu. One per row: where more than one says so, the first is.
     */
    readonly primary?: boolean;
    /** Shown, kept in the focus order, and doing nothing when chosen; `reason` is its tooltip. */
    readonly disabled?: boolean;
    readonly reason?: string;
    /** Its work is under way: a spinner in its icon's place after a moment, and a second press runs nothing. */
    readonly busy?: boolean;
    /** The delete kind: drawn as danger, the only action that is. */
    readonly danger?: boolean;
    /**
     * A menu button (New with its chevron): its node's children, in the tree's order, as its menu's entries. The action
     * opens the menu, and choosing an entry says the entry's id. With no entry to show the action is not drawn at all.
     */
    readonly entries?: readonly PaneToolbarEntry[];
}

export interface PaneToolbarProps {
    /** The toolbar's accessible name, in the host's words ("Message actions"). */
    readonly label: string;
    /** The actions in their order; the host passes only those it has a handler for. */
    readonly actions: readonly PaneToolbarAction[];
    /** An action was chosen, in the row or behind ...; never for a disabled or busy one. */
    readonly onAction: (id: string) => void;
    /** The trailing status, formatted by the host ("Synced at 14:32"); truncated with its whole text as its title. */
    readonly status?: string;
    /** The ... button's accessible name and tooltip, from the host's catalogue ("More actions"). */
    readonly moreLabel: string;
    /** Navigation that leads the row where one pane shows at a time (Back): before the first group, never behind .... */
    readonly leading?: ReactNode;
}

/** Which actions show without their labels, and which have gone behind .... */
type Layout = { readonly bare: ReadonlySet<string>; readonly hidden: ReadonlySet<string> };
const FULL: Layout = { bare: new Set(), hidden: new Set() };
const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every(id => b.has(id));

/** The actions in groups, in their order: a group where its first action comes. */
function groupsOf(actions: readonly PaneToolbarAction[]): readonly (readonly PaneToolbarAction[])[] {
    const groups = new Map<string, PaneToolbarAction[]>();
    for (const a of actions) groups.set(a.group, [...(groups.get(a.group) ?? []), a]);
    return [...groups.values()];
}

/**
 * The overflowing actions' ids, as units that go together: by priority, lower first, one priority one unit. Menu-only
 * actions (overflow 0) are no unit: they never stand in the row to go from it.
 */
function unitsOf(actions: readonly PaneToolbarAction[]): readonly (readonly string[])[] {
    const by = new Map<number, string[]>();
    for (const a of actions) if (a.overflow !== undefined && a.overflow !== 0) by.set(a.overflow, [...(by.get(a.overflow) ?? []), a.id]);
    return [...by.entries()].sort(([x], [y]) => x - y).map(([, ids]) => ids);
}

/**
 * The one row of actions at the top of a pane (contract component `pane-toolbar`: default, labels-partly-hidden,
 * labels-hidden, overflowing, menu-open, with-status, action-disabled, action-busy, phone, lone-menu-only). It is
 * measured on its own width as its pane resizes, and gives way in this order:
 * every label shows while all fit; then the labels of the actions that are not the primary hide one by one in the
 * giving-way order (by overflow, lower first, a priority's actions together; then the pinned, from the end of the row
 * back); then the primary's label; only once every label is hidden do actions go behind ..., in the same order, the
 * fewest that let the rest and ... fit, and the primary last. No action is ever cut off, and ... is always reached.
 * They come back in the reverse order. One Tab stop; Left and Right, Home and End move inside it.
 *
 * ... never holds one action: the first move into it takes two, or one beside a menu-only action, and where only one
 * could go, it stays in the row at its icon width. Its menu lists the primary first, then those that gave way, in their
 * order, then the menu-only actions (overflow 0) last. Menu-only actions are behind ... at every width, except a single
 * one with nothing else behind ...: that one is a button at the end of the row, giving way first.
 *
 * An action with `entries` is a menu button: its chevron after it, it opens the kit's context menu with its entries,
 * each disabled with its own reason as the server says, and it gives way as any other action does (behind ..., choosing
 * it opens its entries there). One whose entries are empty is not drawn; one that is itself disabled does not open.
 */
export function PaneToolbar({ label, actions: given, onAction, status, moreLabel, leading }: PaneToolbarProps): ReactNode {
    // A menu button with no entry to show is not drawn: no empty menu is ever opened.
    const actions = given.filter(a => a.entries === undefined || a.entries.length > 0);
    const row = useRef<HTMLDivElement>(null);
    const measure = useRef<HTMLDivElement>(null);
    const moreButton = useRef<HTMLButtonElement>(null);
    const [layout, setLayout] = useState<Layout>(FULL);
    // The open menu: More's, or a menu button's by its action's id, and where it opens.
    const [menu, setMenu] = useState<{ which: string; x: number; y: number } | null>(null);
    const [menuFocus, setMenuFocus] = useState<'first' | 'last'>('first');
    const [current, setCurrent] = useState<string | null>(null);
    const [tipOff, setTipOff] = useState<string | null>(null);
    const groups = groupsOf(actions);
    const all = groups.flat();
    // The row's primary: the first that says so, never a menu-only one.
    const primaryId = all.find(a => a.primary === true && a.overflow !== 0)?.id ?? null;
    const units = unitsOf(actions.filter(a => a.id !== primaryId));
    // Behind ... at every width, and never in the row, unless one is alone (`lone`).
    const menuOnly = all.filter(a => a.overflow === 0);
    const inRow = all.filter(a => a.overflow !== 0);
    // A single menu-only action: a button at the end of the row while nothing else is behind ....
    const lone = menuOnly.length === 1 ? menuOnly[0] ?? null : null;
    const key = JSON.stringify([actions.map(a => [a.id, a.label, a.icon, a.group, a.overflow ?? null, a.primary === true, a.entries !== undefined]), status ?? '', leading !== undefined]);

    // Behind ... for a set the width sent there: the menu-only actions too, a lone one only once another is there.
    const behindOf = (gone: ReadonlySet<string>): ReadonlySet<string> =>
        new Set([...menuOnly.filter(a => a !== lone || gone.size > 0).map(a => a.id), ...gone]);

    const fit = useCallback(() => {
        const box = row.current;
        const ruler = measure.current;
        if (box === null || ruler === null) return;
        const style = getComputedStyle(box);
        const gap = parseFloat(style.columnGap || '0') || 0;
        const room = box.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
        const width = (selector: string) => ruler.querySelector<HTMLElement>(selector)?.getBoundingClientRect().width ?? 0;
        const lead = width('[data-measure="leading"]');
        const separator = width('[data-measure="separator"]');
        const more = width('[data-measure="more"]');
        const sizeOf = (id: string, labels: boolean) => width(`[data-measure="${labels ? 'full' : 'icon'}"][data-measure-action="${CSS.escape(id)}"]`);
        const needed = (bare: ReadonlySet<string>, gone: ReadonlySet<string>) => {
            const hidden = behindOf(gone);
            // A lone menu-only action in the row stands after the last group, outside it.
            const loneIn = lone !== null && !hidden.has(lone.id) ? lone : null;
            const shownGroups = groups.map(g => g.filter(a => !hidden.has(a.id) && a !== loneIn)).filter(g => g.length > 0);
            const items = [...shownGroups.flat(), ...(loneIn !== null ? [loneIn] : [])];
            const parts = items.length + (shownGroups.length - 1) + (hidden.size > 0 ? 1 : 0) + (lead > 0 ? 1 : 0);
            return lead + items.reduce((sum, a) => sum + sizeOf(a.id, !bare.has(a.id)), 0) + separator * Math.max(0, shownGroups.length - 1)
                + (hidden.size > 0 ? more : 0) + gap * Math.max(0, parts - 1);
        };
        // The giving-way order: the overflow's, then the pinned, the last in the row first, then the primary.
        const pinnedIds = inRow.filter(a => a.id !== primaryId && !units.some(u => u.includes(a.id))).map(a => a.id);
        const goOrder = [...units, ...[...pinnedIds].reverse().map(id => [id]), ...(primaryId !== null ? [[primaryId]] : [])];
        // Labels hide in it too, a lone menu-only action's first: it is the lowest of all.
        const labelOrder = [...(lone !== null ? [[lone.id]] : []), ...goOrder];
        let next: Layout | null = null;
        if (needed(new Set(), new Set()) <= room) next = FULL;
        else {
            const bare = new Set<string>();
            for (const unit of labelOrder) {
                for (const id of unit) bare.add(id);
                if (needed(bare, new Set()) <= room) {
                    next = { bare, hidden: new Set() };
                    break;
                }
            }
        }
        if (next === null) {
            const bare = new Set(labelOrder.flat());
            const hidden = new Set<string>();
            // ... never holds one action: the first move takes two, or one beside a menu-only action already there.
            const enough = () => hidden.size + menuOnly.length >= 2;
            for (const unit of goOrder) {
                for (const id of unit) hidden.add(id);
                if (enough() && needed(bare, hidden) <= room) break;
            }
            // Only one could go: it stays in the row, at its icon width.
            if (!enough()) hidden.clear();
            next = { bare, hidden };
        }
        const chosen = next;
        setLayout(was => (same(was.bare, chosen.bare) && same(was.hidden, chosen.hidden) ? was : chosen));
        // The measuring reads the groups as drawn now; `key` names what changes them.
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

    // What is behind ... now: the menu-only actions (a lone one only once another is there), then those the width sent.
    const hiddenNow = behindOf(layout.hidden);
    // A lone menu-only action in the row: at its end, after the last group.
    const loneShown = lone !== null && !hiddenNow.has(lone.id) ? lone : null;
    const outOfGroups = (a: PaneToolbarAction) => hiddenNow.has(a.id) || a === loneShown;
    const shownGroups = groups.map(g => g.filter(a => !outOfGroups(a))).filter(g => g.length > 0);
    const shown = [...shownGroups.flat(), ...(loneShown !== null ? [loneShown] : [])];
    const byId = (id: string) => all.find(a => a.id === id);
    const gaveWay = [...units.flat(), ...inRow.filter(a => a.id !== primaryId && !units.some(u => u.includes(a.id))).map(a => a.id).reverse()];
    // ...'s menu: the primary first, then those that gave way in their order, then the menu-only last.
    const behind = [
        ...(primaryId !== null && layout.hidden.has(primaryId) ? [byId(primaryId)] : []),
        ...gaveWay.filter(id => layout.hidden.has(id)).map(byId),
        ...(hiddenNow.size > 0 ? menuOnly : []),
    ].filter((a): a is PaneToolbarAction => a !== undefined && hiddenNow.has(a.id));
    const pinned = new Set(inRow.filter(a => !units.some(u => u.includes(a.id))).map(a => a.id));
    const stops = [...shown.map(a => a.id), ...(behind.length > 0 ? ['more'] : [])];
    const focusable = current !== null && stops.includes(current) ? current : stops[0] ?? null;

    const move = (event: KeyboardEvent<HTMLDivElement>) => {
        const at = stops.indexOf(focusable ?? '');
        let to: number | null = null;
        if (event.key === 'ArrowRight') to = Math.min(stops.length - 1, at + 1);
        else if (event.key === 'ArrowLeft') to = Math.max(0, at - 1);
        else if (event.key === 'Home') to = 0;
        else if (event.key === 'End') to = stops.length - 1;
        else if (event.key === 'Escape') setTipOff(focusable);
        if (to === null) return;
        event.preventDefault();
        const id = stops[to] ?? null;
        setCurrent(id);
        row.current?.querySelector<HTMLElement>(`[data-stop="${CSS.escape(id ?? '')}"]`)?.focus();
    };
    const menuItems: MenuItem[] = behind.map(a => ({
        id: a.id,
        label: (
            <>
                <ActionIcon name={a.icon} />
                {a.label}
            </>
        ),
        offer: a.disabled ? { offered: true, locked: false, refusal: a.reason ?? '' } : { offered: true, locked: false },
        ...(a.danger ? { danger: true } : {}),
        onSelect: () => {
            if (a.disabled || a.busy) return;
            if (a.entries === undefined) {
                onAction(a.id);
                return;
            }
            // A menu button behind ...: its entries open where ... is.
            const r = moreButton.current?.getBoundingClientRect();
            setMenuFocus('first');
            setMenu({ which: a.id, x: r?.left ?? 0, y: r?.bottom ?? 0 });
        },
    }));
    const opened = menu === null || menu.which === 'more' ? undefined : all.find(a => a.id === menu.which);
    const entryItems: MenuItem[] = (opened?.entries ?? []).map(e => ({
        id: e.id,
        label: (
            <>
                {e.icon !== undefined ? <ActionIcon name={e.icon} /> : null}
                {e.label}
            </>
        ),
        offer: e.disabled ? { offered: true, locked: false, refusal: e.reason ?? '' } : { offered: true, locked: false },
        ...(e.danger ? { danger: true } : {}),
        onSelect: () => {
            if (!e.disabled) onAction(e.id);
        },
    }));
    const openAt = (which: string, target: HTMLElement, focus: 'first' | 'last') => {
        const r = target.getBoundingClientRect();
        setMenuFocus(focus);
        setMenu({ which, x: r.left, y: r.bottom });
    };

    // The actions whose labels take part in the giving way: those in the row, and a lone menu-only one.
    const labelled = inRow.length + (lone !== null ? 1 : 0);
    const drawn = (a: PaneToolbarAction) => (
        <ToolbarAction
            key={a.id}
            action={a}
            labels={!layout.bare.has(a.id)}
            overflowed={hiddenNow.has(a.id)}
            pinned={pinned.has(a.id)}
            tabbable={focusable === a.id}
            tipOff={tipOff === a.id}
            menuOpen={menu?.which === a.id}
            onChoose={(target, focus) => {
                if (a.entries === undefined) onAction(a.id);
                else if (menu?.which === a.id && focus === null) setMenu(null);
                else openAt(a.id, target, focus ?? 'first');
            }}
            onFocus={() => {
                setCurrent(a.id);
                setTipOff(null);
            }}
        />
    );

    return (
        <div
            ref={row}
            role="toolbar"
            aria-label={label}
            className={cx(
                'cms-pane-toolbar',
                labelled > 0 && layout.bare.size >= labelled && 'cms-pane-toolbar--labels-hidden',
                layout.bare.size > 0 && layout.bare.size < labelled && 'cms-pane-toolbar--labels-partly-hidden',
            )}
            onKeyDown={move}
        >
            {leading !== undefined ? <div className="cms-pane-toolbar__leading">{leading}</div> : null}
            {groups.map((group, g) => {
                const visible = group.filter(a => !outOfGroups(a));
                const earlier = groups.slice(0, g).some(gr => gr.some(a => !outOfGroups(a)));
                return (
                    <div key={g} className="cms-pane-toolbar__group-wrap">
                        {visible.length > 0 && earlier ? <span className="cms-pane-toolbar__separator" role="separator" aria-orientation="vertical" /> : null}
                        <div className="cms-pane-toolbar__group" hidden={visible.length === 0}>
                            {group.filter(a => a !== loneShown).map(a => drawn(a))}
                        </div>
                    </div>
                );
            })}
            {loneShown !== null ? <div className="cms-pane-toolbar__group cms-pane-toolbar__lone">{drawn(loneShown)}</div> : null}
            {behind.length > 0 ? (
                <button
                    ref={moreButton}
                    type="button"
                    className="cms-icon-button cms-pane-toolbar__more"
                    data-stop="more"
                    aria-label={moreLabel}
                    title={moreLabel}
                    aria-haspopup="menu"
                    aria-expanded={menu?.which === 'more'}
                    tabIndex={focusable === 'more' ? 0 : -1}
                    onFocus={() => setCurrent('more')}
                    onClick={event => {
                        if (menu?.which === 'more') setMenu(null);
                        else openAt('more', event.currentTarget, 'first');
                    }}
                    onKeyDown={event => {
                        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            event.stopPropagation();
                            // Down opens it on its first item, Up on its last.
                            openAt('more', event.currentTarget, event.key === 'ArrowUp' ? 'last' : 'first');
                        }
                    }}
                >
                    <Icon name="more" />
                </button>
            ) : null}
            {status !== undefined ? <span className="cms-pane-toolbar__status" title={status}>{status}</span> : null}
            <ContextMenu at={menu?.which === 'more' ? menu : null} items={menuItems} onClose={() => setMenu(null)} label={moreLabel} focus={menuFocus} />
            <ContextMenu at={opened !== undefined ? menu : null} items={entryItems} onClose={() => setMenu(null)} label={opened?.label ?? ''} focus={menuFocus} />
            {/* What each part takes, drawn out of sight: the row is fitted to these widths. */}
            <div ref={measure} className="cms-pane-toolbar__measure" aria-hidden="true">
                {leading !== undefined ? <div data-measure="leading">{leading}</div> : null}
                <span data-measure="separator" className="cms-pane-toolbar__separator" />
                <span data-measure="more" className="cms-icon-button cms-pane-toolbar__more"><Icon name="more" /></span>
                {all.map(a => (
                    <span key={a.id}>
                        <span data-measure="full" data-measure-action={a.id} className={cx('cms-pane-toolbar__action', a.entries !== undefined && 'cms-pane-toolbar__action--menu')}>
                            <ActionIcon name={a.icon} />
                            <span className="cms-pane-toolbar__label">{a.label}</span>
                            {a.entries !== undefined ? <Chevron /> : null}
                        </span>
                        {/* An action without an icon keeps its label when the others hide theirs. */}
                        <span data-measure="icon" data-measure-action={a.id} className={cx('cms-pane-toolbar__action', iconForName(a.icon) !== null && 'cms-pane-toolbar__action--bare', a.entries !== undefined && 'cms-pane-toolbar__action--menu')}>
                            {iconForName(a.icon) !== null ? <ActionIcon name={a.icon} /> : <span className="cms-pane-toolbar__label">{a.label}</span>}
                            {a.entries !== undefined ? <Chevron /> : null}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function ToolbarAction({ action, labels, overflowed, pinned, tabbable, tipOff, menuOpen, onChoose, onFocus }: {
    readonly action: PaneToolbarAction;
    readonly labels: boolean;
    readonly overflowed: boolean;
    readonly pinned: boolean;
    readonly tabbable: boolean;
    readonly tipOff: boolean;
    /** Its menu is open (a menu button's). */
    readonly menuOpen: boolean;
    /** Chosen: by a press (`focus` null), or a menu button opened by Down or Up on its first or last entry. */
    readonly onChoose: (target: HTMLElement, focus: 'first' | 'last' | null) => void;
    readonly onFocus: () => void;
}): ReactNode {
    const [spinning, setSpinning] = useState(false);
    useEffect(() => {
        if (!action.busy) {
            setSpinning(false);
            return undefined;
        }
        const later = setTimeout(() => setSpinning(true), STATE_DELAY_MS);
        return () => clearTimeout(later);
    }, [action.busy]);
    // An action whose icon the kit lacks shows its label alone, also when the others hide theirs.
    const iconless = iconForName(action.icon) === null;
    const showLabel = labels || iconless;
    // A disabled action's reason describes it, and shows on hover, on focus and on a press, until focus leaves.
    const reason = action.disabled && action.reason ? action.reason : null;
    const tip = reason ?? (showLabel ? null : action.label);
    const tipId = useId();
    const [pressed, setPressed] = useState(false);
    const isMenu = action.entries !== undefined;
    return (
        <button
            type="button"
            className={cx('cms-pane-toolbar__action', !showLabel && 'cms-pane-toolbar__action--bare', iconless && 'cms-pane-toolbar__action--text', isMenu && 'cms-pane-toolbar__action--menu', action.danger && 'is-danger')}
            data-action={action.id}
            data-stop={action.id}
            {...(overflowed ? { 'data-overflowed': '' } : {})}
            {...(pinned ? { 'data-pinned': '' } : {})}
            hidden={overflowed}
            aria-label={action.label}
            aria-disabled={action.disabled || undefined}
            aria-busy={action.busy || undefined}
            {...(isMenu ? { 'aria-haspopup': 'menu' as const, 'aria-expanded': menuOpen } : {})}
            {...(reason === null ? {} : { 'aria-describedby': tipId })}
            {...(pressed && reason !== null ? { 'data-reason-shown': '' } : {})}
            tabIndex={tabbable ? 0 : -1}
            onFocus={onFocus}
            onBlur={() => setPressed(false)}
            onKeyDown={(event) => {
                if (event.key === 'Escape') setPressed(false);
                // A menu button opens with Down on its first entry, with Up on its last.
                if (isMenu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                    event.preventDefault();
                    if (reason !== null) setPressed(true);
                    else if (!action.disabled && !action.busy) onChoose(event.currentTarget, event.key === 'ArrowUp' ? 'last' : 'first');
                }
            }}
            onClick={(event) => {
                if (reason !== null) setPressed(true);
                else if (!action.disabled && !action.busy) onChoose(event.currentTarget, null);
            }}
        >
            {spinning ? <Glyph name="spinner" /> : <ActionIcon name={action.icon} />}
            {showLabel ? <span className="cms-pane-toolbar__label" aria-hidden="true">{action.label}</span> : null}
            {isMenu ? <Chevron /> : null}
            {reason !== null || (tip !== null && !tipOff) ? <span className="cms-pane-toolbar__tip" role="tooltip" id={tipId}>{tip}</span> : null}
        </button>
    );
}

/** The chevron after a menu button's label, saying that it opens a menu. */
function Chevron(): ReactNode {
    return (
        <span className="cms-pane-toolbar__chevron" aria-hidden="true">
            <Icon name="chevron-down" size={14} />
        </span>
    );
}

/** A node's icon as the kit draws it; nothing for a name the kit's table lacks. */
function ActionIcon({ name }: { readonly name: string }): ReactNode {
    const icon = iconForName(name);
    return icon === null ? null : <Icon name={icon} size={18} />;
}
