import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Dialogs';
import { Icon } from './Icon';
import { State } from './State';
import { Glyph, cx } from './internal';

/** A space the person may read, such as their Drive or a shared space. */
export interface FilePickerSpace {
    readonly id: string;
    readonly name: string;
}

/** One entry of a folder, as the host lists it: a folder opens, a file can be chosen. */
export interface FilePickerEntry {
    readonly id: string;
    readonly name: string;
    readonly kind: 'folder' | 'file';
    readonly size?: number | null;
    readonly mimeType?: string | null;
}

/** One page of a folder; `next` when more follow. */
export interface FilePickerPage {
    readonly entries: readonly FilePickerEntry[];
    readonly next?: string | null;
}

/** A chosen file, with the space and folder it was chosen in, so the host needs no second lookup. */
export interface FilePickerChoice extends FilePickerEntry {
    readonly space: string;
    readonly path: string;
}

/** What the host has spent of a limit before this choice; `cost` is what a file adds against it, its size by default. */
export interface FilePickerBudget {
    readonly usedBytes: number;
    readonly limitBytes: number;
    readonly cost?: (entry: FilePickerEntry) => number;
}

/** A folder the person may not open: thrown by `list`, it is shown as denied in place. Anything else is an error. */
export class FilePickerDenied extends Error {
    constructor(message = 'denied') {
        super(message);
        this.name = 'FilePickerDenied';
    }
}

/** The picker's words, in the host's language. */
export interface FilePickerLabels {
    readonly title: string;
    readonly close: string;
    readonly cancel: string;
    /** The confirm action, carrying the count: "Attach 3 files". */
    readonly confirm: (count: number) => string;
    readonly space: string;
    readonly path: string;
    readonly up: string;
    readonly files: string;
    /** "3 selected", on the chip that lists the selection. */
    readonly selected: (count: number) => string;
    readonly clear: string;
    readonly remove: (name: string) => string;
    /** The whole selection: "3 files, 2.1 MB". */
    readonly total: (count: number, size: string) => string;
    /** With a budget: "1.2 MB of 25 MB left after these". */
    readonly left: (left: string, limit: string) => string;
    /** Why a file is not offered, or the selection cannot be sent: it would go over the limit. */
    readonly overBudget: string;
    readonly loading: string;
    readonly empty: string;
    readonly error: string;
    readonly retry: string;
    readonly denied: string;
}

export interface FilePickerProps {
    readonly open: boolean;
    /** The spaces the person may read, in the host's order; the first is shown first. With one, no switch is drawn. */
    readonly spaces: readonly FilePickerSpace[];
    /** One page of a folder of a space, in the host's order. Throws FilePickerDenied for a folder the person may not open. */
    readonly list: (space: string, path: string, cursor?: string) => Promise<FilePickerPage>;
    /** The host's own reason a file cannot be chosen (not readable, a type it will not send), or nothing. */
    readonly disabledReason?: (entry: FilePickerEntry) => string | null | undefined;
    readonly budget?: FilePickerBudget;
    /** A size as the host says it, in the person's language. */
    readonly formatSize: (bytes: number) => string;
    readonly labels: FilePickerLabels;
    readonly onConfirm: (chosen: readonly FilePickerChoice[]) => void;
    readonly onCancel: () => void;
}

type Listing =
    | { readonly status: 'loading' }
    | { readonly status: 'error' }
    | { readonly status: 'denied' }
    | { readonly status: 'ready'; readonly entries: readonly FilePickerEntry[]; readonly next: string | null; readonly paging: boolean };

const keyOf = (space: string, id: string) => `${space}\n${id}`;
const childPath = (path: string, name: string) => (path === '' ? name : `${path}/${name}`);
/** How near the end of the list a page further is asked for. */
const PAGE_AHEAD_PX = 48;

/**
 * Choosing files a person already has, in their spaces (contract component `file-picker`). The kit knows no API: the
 * host lists folders page by page and receives the chosen entries. The selection holds across folders and spaces; a
 * budget, when given, is counted here, so every host disables the same files. Enter opens a folder, Space ticks a file,
 * Backspace goes up, Escape cancels.
 */
export function FilePicker(props: FilePickerProps): ReactNode {
    const { open, spaces, list, disabledReason, budget, formatSize, labels, onConfirm, onCancel } = props;
    const [space, setSpace] = useState(spaces[0]?.id ?? '');
    const [path, setPath] = useState('');
    const [listing, setListing] = useState<Listing>({ status: 'loading' });
    const [reads, setReads] = useState(0);
    const [chosen, setChosen] = useState<ReadonlyMap<string, FilePickerChoice>>(new Map());
    const [active, setActive] = useState(0);
    const [showChosen, setShowChosen] = useState(false);
    const listbox = useRef<HTMLDivElement>(null);
    const ids = useId();

    // Each opening starts afresh: the first space, its top, nothing chosen.
    useEffect(() => {
        if (!open) return;
        setSpace(spaces[0]?.id ?? '');
        setPath('');
        setChosen(new Map());
        setShowChosen(false);
        // Only the opening resets; a host listing its spaces again does not.
    }, [open]);

    // The folder shown, its first page; a later folder's answer wins over an earlier one still on its way.
    useEffect(() => {
        if (!open || space === '') return undefined;
        let current = true;
        setListing({ status: 'loading' });
        setActive(0);
        list(space, path).then(
            (page) => current && setListing({ status: 'ready', entries: page.entries, next: page.next ?? null, paging: false }),
            (error: unknown) => current && setListing({ status: error instanceof FilePickerDenied ? 'denied' : 'error' }),
        );
        return () => {
            current = false;
        };
    }, [open, space, path, list, reads]);

    const more = useCallback(() => {
        if (listing.status !== 'ready' || listing.next === null || listing.paging) return;
        const cursor = listing.next;
        const held = listing.entries;
        setListing({ ...listing, paging: true });
        list(space, path, cursor).then(
            (page) => setListing({ status: 'ready', entries: [...held, ...page.entries], next: page.next ?? null, paging: false }),
            () => setListing({ status: 'ready', entries: held, next: cursor, paging: false }),
        );
    }, [listing, list, space, path]);

    const cost = useCallback((entry: FilePickerEntry) => budget?.cost?.(entry) ?? entry.size ?? 0, [budget]);
    const selection = useMemo(() => [...chosen.values()], [chosen]);
    const totalSize = selection.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
    const left = budget === undefined ? null : budget.limitBytes - budget.usedBytes - selection.reduce((sum, entry) => sum + cost(entry), 0);
    const over = left !== null && left < 0;

    /** Why this file cannot be ticked now, or null: the host's reason first, then the budget's. */
    const reasonFor = (entry: FilePickerEntry): string | null => {
        if (entry.kind !== 'file') return null;
        const own = disabledReason?.(entry);
        if (own) return own;
        if (left !== null && !chosen.has(keyOf(space, entry.id)) && cost(entry) > left) return labels.overBudget;
        return null;
    };

    const toggle = (entry: FilePickerEntry) => {
        const key = keyOf(space, entry.id);
        if (!chosen.has(key) && reasonFor(entry) !== null) return;
        setChosen((before) => {
            const next = new Map(before);
            if (next.has(key)) next.delete(key);
            else next.set(key, { ...entry, space, path });
            return next;
        });
    };
    const openFolder = (entry: FilePickerEntry) => setPath(childPath(path, entry.name));
    const up = () => setPath(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
    const unchoose = (key: string) =>
        setChosen((before) => {
            const next = new Map(before);
            next.delete(key);
            return next;
        });

    const entries = listing.status === 'ready' ? listing.entries : [];
    const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const entry = entries[active];
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const last = entries.length - 1;
            const to = event.key === 'Home' ? 0 : event.key === 'End' ? last : Math.min(last, Math.max(0, active + (event.key === 'ArrowDown' ? 1 : -1)));
            setActive(to);
            if (to >= last - 1) more();
        } else if (event.key === 'Enter' && entry?.kind === 'folder') {
            event.preventDefault();
            openFolder(entry);
        } else if (event.key === ' ' && entry?.kind === 'file') {
            event.preventDefault();
            toggle(entry);
        } else if (event.key === 'Backspace' && path !== '') {
            event.preventDefault();
            up();
        }
    };

    const crumbs = path === '' ? [] : path.split('/');
    const spaceName = spaces.find((s) => s.id === space)?.name ?? '';
    const optionId = (at: number) => `${ids}-entry-${String(at)}`;

    return (
        <Modal
            open={open}
            title={labels.title}
            onClose={onCancel}
            closeLabel={labels.close}
            initialFocus={listbox}
            className="cms-file-picker"
            footer={
                <div className="cms-file-picker__foot">
                    <div className="cms-file-picker__summary" aria-live="polite">
                        {selection.length > 0 ? <span>{labels.total(selection.length, formatSize(totalSize))}</span> : null}
                        {budget !== undefined && left !== null ? (
                            <span className={cx(over && 'is-over')}>{over ? labels.overBudget : labels.left(formatSize(Math.max(0, left)), formatSize(budget.limitBytes))}</span>
                        ) : null}
                    </div>
                    <div className="cms-file-picker__actions">
                        <Button variant="secondary" onClick={onCancel}>{labels.cancel}</Button>
                        <Button variant="primary" disabled={selection.length === 0 || over} onClick={() => onConfirm(selection)}>
                            {labels.confirm(selection.length)}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="cms-file-picker__top">
                {spaces.length > 1 ? (
                    <label className="cms-file-picker__space">
                        <span className="cms-visually-hidden">{labels.space}</span>
                        <select className="cms-input cms-select" value={space} onChange={(e) => { setSpace(e.target.value); setPath(''); }}>
                            {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </label>
                ) : null}
                <nav className="cms-file-picker__path" aria-label={labels.path}>
                    <button type="button" className="cms-icon-button" aria-label={labels.up} disabled={path === ''} onClick={up}>
                        <Icon name="chevron-left" />
                    </button>
                    <ol>
                        <li><button type="button" className="cms-file-picker__crumb" aria-current={path === '' ? 'location' : undefined} onClick={() => setPath('')}>{spaceName}</button></li>
                        {crumbs.map((name, at) => {
                            const to = crumbs.slice(0, at + 1).join('/');
                            return <li key={to}><button type="button" className="cms-file-picker__crumb" aria-current={to === path ? 'location' : undefined} onClick={() => setPath(to)}>{name}</button></li>;
                        })}
                    </ol>
                </nav>
                {selection.length > 0 ? (
                    <button type="button" className="cms-file-picker__chip" aria-expanded={showChosen} onClick={() => setShowChosen((shown) => !shown)}>
                        {labels.selected(selection.length)}
                    </button>
                ) : null}
            </div>
            {showChosen && selection.length > 0 ? (
                <div className="cms-file-picker__chosen">
                    <ul>
                        {[...chosen.entries()].map(([key, entry]) => (
                            <li key={key}>
                                <span className="cms-file-picker__name">{entry.name}</span>
                                <button type="button" className="cms-icon-button" aria-label={labels.remove(entry.name)} onClick={() => unchoose(key)}>
                                    <Glyph name="close" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <Button variant="secondary" onClick={() => { setChosen(new Map()); setShowChosen(false); }}>{labels.clear}</Button>
                </div>
            ) : null}
            <div className="cms-file-picker__list" onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - PAGE_AHEAD_PX) more();
            }}>
                {listing.status === 'loading' ? <State kind="loading" title={labels.loading} placement="block" /> : null}
                {listing.status === 'error' ? <State kind="error" title={labels.error} placement="block" action={{ label: labels.retry, onAction: () => setReads((n) => n + 1) }} /> : null}
                {listing.status === 'denied' ? <State kind="denied" title={labels.denied} placement="block" /> : null}
                {listing.status === 'ready' && entries.length === 0 ? <State kind="empty" title={labels.empty} placement="block" /> : null}
                <div
                    ref={listbox}
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label={labels.files}
                    aria-activedescendant={entries.length > 0 ? optionId(active) : undefined}
                    tabIndex={0}
                    className="cms-file-picker__entries"
                    hidden={listing.status !== 'ready' || entries.length === 0}
                    onKeyDown={onKey}
                >
                    {entries.map((entry, at) => {
                        const ticked = entry.kind === 'file' && chosen.has(keyOf(space, entry.id));
                        const reason = reasonFor(entry);
                        return (
                            <div
                                key={entry.id}
                                id={optionId(at)}
                                role="option"
                                aria-selected={entry.kind === 'file' ? ticked : undefined}
                                aria-disabled={reason !== null || undefined}
                                className={cx('cms-file-picker__entry', at === active && 'is-active', ticked && 'is-ticked', reason !== null && 'is-disabled')}
                                onClick={() => {
                                    setActive(at);
                                    if (entry.kind === 'folder') openFolder(entry);
                                    else toggle(entry);
                                }}
                            >
                                <span className="cms-file-picker__tick" aria-hidden="true">{ticked ? <Icon name="check" /> : null}</span>
                                <Icon name={entry.kind === 'folder' ? 'folder' : 'file'} />
                                <span className="cms-file-picker__text">
                                    <span className="cms-file-picker__name">{entry.name}</span>
                                    {reason !== null ? <span className="cms-file-picker__reason">{reason}</span> : null}
                                </span>
                                {entry.kind === 'file' && entry.size != null ? <span className="cms-file-picker__size">{formatSize(entry.size)}</span> : null}
                            </div>
                        );
                    })}
                    {listing.status === 'ready' && listing.paging ? <div className="cms-file-picker__paging"><State kind="loading" title={labels.loading} placement="inline" /></div> : null}
                </div>
            </div>
        </Modal>
    );
}
