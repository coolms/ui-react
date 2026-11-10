import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, iconForName } from './Icon';
import { ContextMenu, type MenuItem } from './Collections';
import { STATE_DELAY_MS } from './State';
import { Glyph, cx } from './internal';

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
     * pair). Without one it is pinned: it never goes behind ....
     */
    readonly overflow?: number;
    /** Shown, kept in the focus order, and doing nothing when chosen; `reason` is its tooltip. */
    readonly disabled?: boolean;
    readonly reason?: string;
    /** Its work is under way: a spinner in its icon's place after a moment, and a second press runs nothing. */
    readonly busy?: boolean;
    /** The delete kind: drawn as danger, the only action that is. */
    readonly danger?: boolean;
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

/** The overflowing actions' ids, as units that go together: by priority, lower first, one priority one unit. */
function unitsOf(actions: readonly PaneToolbarAction[]): readonly (readonly string[])[] {
    const by = new Map<number, string[]>();
    for (const a of actions) if (a.overflow !== undefined) by.set(a.overflow, [...(by.get(a.overflow) ?? []), a.id]);
    return [...by.entries()].sort(([x], [y]) => x - y).map(([, ids]) => ids);
}

/**
 * The one row of actions at the top of a pane (contract component `pane-toolbar`: default, labels-partly-hidden,
 * labels-hidden, overflowing, menu-open, with-status, action-disabled, action-busy, phone). It is measured on its own
 * width as its pane resizes:
 * every label shows while all fit; then labels hide one by one in the overflow order (lower first, a priority's actions
 * together), the pinned last, from the end of the row; only once every label is hidden do actions go behind ..., in
 * the same order, the fewest that let the rest and ... fit, never one alone. They come back in the reverse order. One
 * Tab stop; Left and Right, Home and End move inside it.
 */
export function PaneToolbar({ label, actions, onAction, status, moreLabel, leading }: PaneToolbarProps): ReactNode {
    const row = useRef<HTMLDivElement>(null);
    const measure = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<Layout>(FULL);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const [menuFocus, setMenuFocus] = useState<'first' | 'last'>('first');
    const [current, setCurrent] = useState<string | null>(null);
    const [tipOff, setTipOff] = useState<string | null>(null);
    const groups = groupsOf(actions);
    const units = unitsOf(actions);
    const all = groups.flat();
    const key = JSON.stringify([actions.map(a => [a.id, a.label, a.icon, a.group, a.overflow ?? null]), status ?? '', leading !== undefined]);

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
        const needed = (bare: ReadonlySet<string>, hidden: ReadonlySet<string>) => {
            const shownGroups = groups.map(g => g.filter(a => !hidden.has(a.id))).filter(g => g.length > 0);
            const items = shownGroups.flat();
            const parts = items.length + (shownGroups.length - 1) + (hidden.size > 0 ? 1 : 0) + (lead > 0 ? 1 : 0);
            return lead + items.reduce((sum, a) => sum + sizeOf(a.id, !bare.has(a.id)), 0) + separator * Math.max(0, shownGroups.length - 1)
                + (hidden.size > 0 ? more : 0) + gap * Math.max(0, parts - 1);
        };
        // The order labels hide in: the overflow's, then the pinned, the last in the row first.
        const pinnedIds = all.filter(a => !units.some(u => u.includes(a.id))).map(a => a.id);
        const labelOrder = [...units, ...[...pinnedIds].reverse().map(id => [id])];
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
            const bare = new Set(all.map(a => a.id));
            const hidden = new Set<string>();
            for (const unit of units) {
                for (const id of unit) if (all.some(a => a.id === id)) hidden.add(id);
                // ... takes an icon's width itself, so a menu of one saves nothing: never one alone behind it.
                if (hidden.size >= 2 && needed(bare, hidden) <= room) break;
            }
            // Only one action could go: it stays in the row, and the row is narrower than the contract promises for.
            next = { bare, hidden: hidden.size >= 2 ? hidden : new Set() };
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

    const shownGroups = groups.map(g => g.filter(a => !layout.hidden.has(a.id))).filter(g => g.length > 0);
    const shown = shownGroups.flat();
    const behind = units.flat().map(id => all.find(a => a.id === id)).filter((a): a is PaneToolbarAction => a !== undefined && layout.hidden.has(a.id));
    const pinned = new Set(all.filter(a => !units.some(u => u.includes(a.id))).map(a => a.id));
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
            if (!a.disabled && !a.busy) onAction(a.id);
        },
    }));

    return (
        <div
            ref={row}
            role="toolbar"
            aria-label={label}
            className={cx(
                'cms-pane-toolbar',
                all.length > 0 && layout.bare.size >= all.length && 'cms-pane-toolbar--labels-hidden',
                layout.bare.size > 0 && layout.bare.size < all.length && 'cms-pane-toolbar--labels-partly-hidden',
            )}
            onKeyDown={move}
        >
            {leading !== undefined ? <div className="cms-pane-toolbar__leading">{leading}</div> : null}
            {groups.map((group, g) => {
                const visible = group.filter(a => !layout.hidden.has(a.id));
                const earlier = groups.slice(0, g).some(gr => gr.some(a => !layout.hidden.has(a.id)));
                return (
                    <div key={g} className="cms-pane-toolbar__group-wrap">
                        {visible.length > 0 && earlier ? <span className="cms-pane-toolbar__separator" role="separator" aria-orientation="vertical" /> : null}
                        <div className="cms-pane-toolbar__group" hidden={visible.length === 0}>
                            {group.map(a => (
                                <ToolbarAction
                                    key={a.id}
                                    action={a}
                                    labels={!layout.bare.has(a.id)}
                                    overflowed={layout.hidden.has(a.id)}
                                    pinned={pinned.has(a.id)}
                                    tabbable={focusable === a.id}
                                    tipOff={tipOff === a.id}
                                    onChoose={() => onAction(a.id)}
                                    onFocus={() => {
                                        setCurrent(a.id);
                                        setTipOff(null);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
            {behind.length > 0 ? (
                <button
                    type="button"
                    className="cms-icon-button cms-pane-toolbar__more"
                    data-stop="more"
                    aria-label={moreLabel}
                    title={moreLabel}
                    aria-haspopup="menu"
                    aria-expanded={menuAt !== null}
                    tabIndex={focusable === 'more' ? 0 : -1}
                    onFocus={() => setCurrent('more')}
                    onClick={event => {
                        const r = event.currentTarget.getBoundingClientRect();
                        setMenuFocus('first');
                        setMenuAt(menuAt === null ? { x: r.left, y: r.bottom } : null);
                    }}
                    onKeyDown={event => {
                        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            event.stopPropagation();
                            const r = event.currentTarget.getBoundingClientRect();
                            // Down opens it on its first item, Up on its last.
                            setMenuFocus(event.key === 'ArrowUp' ? 'last' : 'first');
                            setMenuAt({ x: r.left, y: r.bottom });
                        }
                    }}
                >
                    <Icon name="more" />
                </button>
            ) : null}
            {status !== undefined ? <span className="cms-pane-toolbar__status" title={status}>{status}</span> : null}
            <ContextMenu at={menuAt} items={menuItems} onClose={() => setMenuAt(null)} label={moreLabel} focus={menuFocus} />
            {/* What each part takes, drawn out of sight: the row is fitted to these widths. */}
            <div ref={measure} className="cms-pane-toolbar__measure" aria-hidden="true">
                {leading !== undefined ? <div data-measure="leading">{leading}</div> : null}
                <span data-measure="separator" className="cms-pane-toolbar__separator" />
                <span data-measure="more" className="cms-icon-button cms-pane-toolbar__more"><Icon name="more" /></span>
                {all.map(a => (
                    <span key={a.id}>
                        <span data-measure="full" data-measure-action={a.id} className="cms-pane-toolbar__action">
                            <ActionIcon name={a.icon} />
                            <span className="cms-pane-toolbar__label">{a.label}</span>
                        </span>
                        {/* An action without an icon keeps its label when the others hide theirs. */}
                        <span data-measure="icon" data-measure-action={a.id} className={cx('cms-pane-toolbar__action', iconForName(a.icon) !== null && 'cms-pane-toolbar__action--icon')}>
                            {iconForName(a.icon) !== null ? <ActionIcon name={a.icon} /> : <span className="cms-pane-toolbar__label">{a.label}</span>}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function ToolbarAction({ action, labels, overflowed, pinned, tabbable, tipOff, onChoose, onFocus }: {
    readonly action: PaneToolbarAction;
    readonly labels: boolean;
    readonly overflowed: boolean;
    readonly pinned: boolean;
    readonly tabbable: boolean;
    readonly tipOff: boolean;
    readonly onChoose: () => void;
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
    const tip = action.disabled && action.reason ? action.reason : showLabel ? null : action.label;
    return (
        <button
            type="button"
            className={cx('cms-pane-toolbar__action', !showLabel && 'cms-pane-toolbar__action--icon', action.danger && 'is-danger')}
            data-action={action.id}
            data-stop={action.id}
            {...(overflowed ? { 'data-overflowed': '' } : {})}
            {...(pinned ? { 'data-pinned': '' } : {})}
            hidden={overflowed}
            aria-label={action.label}
            aria-disabled={action.disabled || undefined}
            aria-busy={action.busy || undefined}
            tabIndex={tabbable ? 0 : -1}
            onFocus={onFocus}
            onClick={() => {
                if (!action.disabled && !action.busy) onChoose();
            }}
        >
            {spinning ? <Glyph name="spinner" /> : <ActionIcon name={action.icon} />}
            {showLabel ? <span className="cms-pane-toolbar__label" aria-hidden="true">{action.label}</span> : null}
            {tip !== null && !tipOff ? <span className="cms-pane-toolbar__tip" role="tooltip">{tip}</span> : null}
        </button>
    );
}

/** A node's icon as the kit draws it; nothing for a name the kit's table lacks. */
function ActionIcon({ name }: { readonly name: string }): ReactNode {
    const icon = iconForName(name);
    return icon === null ? null : <Icon name={icon} size={18} />;
}
