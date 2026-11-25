import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ContextMenu, type MenuItem } from './Collections.js';
import { Icon } from './Icon.js';
import { cx, withDefaults } from './internal.js';

export interface FilterOption {
    readonly id: string;
    readonly label: string;
}

export interface FilterMenuLabels {
    /** The button's accessible name and tooltip: what it filters and the current choice. */
    readonly name: (label: string, choice: string) => string;
}

/** The English words; an app passes its own. */
export const FILTER_MENU_LABELS: FilterMenuLabels = { name: (label, choice) => `${label}: ${choice}` };

/** A list's one filter: its choices and the current one. */
export interface ListFilter {
    /** What it filters, in the accessible name before the current choice ("Show"). */
    readonly label: string;
    /** The choices shown, in the declared order; the host keeps the current one in them while it is current. */
    readonly options: readonly FilterOption[];
    /**
     * The current choice's id. One that names no option reads as the default one, and says so once, by `onChange`; while
     * there are no options at all the choices are not known yet, and nothing is said.
     */
    readonly value: string;
    /** The id of the choice that shows every row; not given, or naming no option, the first. */
    readonly defaultValue?: string;
    /** The chosen choice's id, when it differs from the current one. */
    readonly onChange: (id: string) => void;
    readonly labels?: Partial<FilterMenuLabels>;
}

export interface FilterMenuProps extends ListFilter {
    /** The funnel alone, in the accent on a choice other than the default: for a bar whose title says the choice. */
    readonly iconOnly?: boolean;
}

/** The choice other than the default one, or null: on the default choice, or with no other to choose from. */
export function activeChoice(filter: ListFilter): FilterOption | null {
    const current = currentChoice(filter);
    return current === defaultOf(filter.options, filter.defaultValue) ? null : current ?? null;
}

/** The choice read as the current one; none with no options. */
function currentChoice({ options, value, defaultValue }: ListFilter): FilterOption | undefined {
    return options.find(o => o.id === value) ?? defaultOf(options, defaultValue);
}

/** What the filter filters and its current choice, in the host's words. */
export function filterName(filter: ListFilter): string {
    return withDefaults(FILTER_MENU_LABELS, filter.labels).name(filter.label, currentChoice(filter)?.label ?? '');
}

/** The choices as a menu's items, a single choice; `group` draws them under its name, among other items. */
export function choiceItems(filter: ListFilter, group?: string): readonly MenuItem[] {
    const current = currentChoice(filter);
    return filter.options.map(o => ({
        id: o.id,
        label: o.label,
        offer: { offered: true, locked: false },
        checked: o === current,
        ...(group === undefined ? {} : { group }),
        onSelect: () => {
            if (o !== current) filter.onChange(o.id);
        },
    }));
}

function defaultOf(options: readonly FilterOption[], defaultValue: string | undefined): FilterOption | undefined {
    return options.find(o => o.id === defaultValue) ?? options[0];
}

/** Says the default choice to the host, once for each value that names no option; with no options, nothing yet. */
export function useStaleChoice(filter: ListFilter | undefined): void {
    const said = useRef<string | null>(null);
    const value = filter?.value ?? null;
    const known = filter === undefined || filter.options.some(o => o.id === filter.value);
    const fallback = known ? null : defaultOf(filter.options, filter.defaultValue)?.id ?? null;
    useEffect(() => {
        if (fallback === null) {
            said.current = null;
        } else if (said.current !== value) {
            said.current = value;
            filter?.onChange(fallback);
        }
    }, [fallback, value]);
}

/** The menu button with its menu; nothing with fewer than two choices. Who draws it calls useStaleChoice. */
export function FilterButton({ iconOnly = false, onOpenChange, ...filter }: FilterMenuProps & { readonly onOpenChange?: (open: boolean) => void }): ReactNode {
    return filter.options.length < 2 ? null : <OpenableFilter {...filter} iconOnly={iconOnly} onOpenChange={onOpenChange} />;
}

function OpenableFilter({ iconOnly, onOpenChange, ...filter }: FilterMenuProps & { readonly onOpenChange?: (open: boolean) => void }): ReactNode {
    const [at, setAt] = useState<{ x: number; y: number; focus: 'current' | 'last' } | null>(null);
    const close = useCallback(() => setAt(null), []);
    // A press on the button while its menu is open closes the menu; the click of that press does not open it again.
    const wasOpen = useRef(false);
    const open = at !== null;
    useEffect(() => {
        onOpenChange?.(open);
        return () => onOpenChange?.(false);
    }, [open, onOpenChange]);
    const active = activeChoice(filter);
    const named = active !== null && !iconOnly;
    const name = filterName(filter);
    const openFrom = (target: HTMLElement, focus: 'current' | 'last') => {
        const r = target.getBoundingClientRect();
        setAt({ x: r.left, y: r.bottom + 4, focus });
    };
    return (
        <>
            <button
                type="button"
                className={cx('cms-filter-menu', active !== null && 'cms-filter-menu--active', named && 'cms-filter-menu--named')}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={name}
                title={name}
                onMouseDown={() => { wasOpen.current = open; }}
                onClick={event => {
                    if (open || wasOpen.current) close();
                    else openFrom(event.currentTarget, 'current');
                    wasOpen.current = false;
                }}
                onKeyDown={event => {
                    // A key is a press of its own: one that began with the mouse and ended elsewhere says nothing of it.
                    wasOpen.current = false;
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        openFrom(event.currentTarget, event.key === 'ArrowUp' ? 'last' : 'current');
                    }
                }}
            >
                {named ? <><span className="cms-filter-menu__choice">{active.label}</span><Icon name="chevron-down" size={16} /></> : <Icon name="funnel" />}
            </button>
            <ContextMenu
                at={at}
                items={choiceItems(filter)}
                onClose={close}
                label={filter.label}
                focus={at?.focus}
            />
        </>
    );
}

/**
 * A list's one filter as a menu button (contract component `filter-menu`: default, active, open, focused). On the
 * default choice the funnel alone; on any other that choice's name and a chevron in the accent, so a filtered list
 * always says so. Its menu is a single choice, the current one marked. With fewer than two choices nothing is drawn.
 */
export function FilterMenu(props: FilterMenuProps): ReactNode {
    useStaleChoice(props);
    return <FilterButton {...props} />;
}
