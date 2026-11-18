import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx, withDefaults } from './internal';
import { Avatar } from './Structure';

export interface BadgeProps {
    readonly count: number;
    /** What the number counts, for a screen reader ("12 unread"). */
    readonly label: string;
    /** Over this, the badge reads "max+". */
    readonly max?: number;
}

/** A count on the accent: unread messages, chats waiting. Nothing is drawn for zero. */
export function Badge({ count, label, max = 99 }: BadgeProps): ReactNode {
    if (count <= 0) return null;
    return (
        <span className="cms-badge">
            <span aria-hidden="true">{count > max ? `${max}+` : count}</span>
            <span className="cms-visually-hidden">{label}</span>
        </span>
    );
}

export interface RailItem {
    readonly id: string;
    readonly label: string;
    readonly icon: IconName;
    readonly href: string;
    readonly badge?: { readonly count: number; readonly label: string };
}

export interface AppShellProps {
    /** The product's name, beside the brand mark ("CoolMS Workspace"). */
    readonly product: ReactNode;
    /** The brand mark at the top of the rail: one letter, or an image. */
    readonly mark: ReactNode;
    readonly rail: readonly RailItem[];
    readonly active: string;
    /** Called instead of following the link, when given (a client-side router). */
    readonly onNavigate?: (id: string) => void;
    /** The server the page is signed in to, as a control that switches servers. */
    readonly server?: ReactNode;
    /** The global search field. */
    readonly search?: ReactNode;
    /** Notifications and the account, at the right of the top bar. */
    readonly account?: ReactNode;
    readonly children: ReactNode;
    /** The rail's name for assistive technology, in the app's language ("Sections"). */
    readonly railLabel?: string;
}

/**
 * The Workspace's frame: a dark rail of sections, each an icon over its name with its count, and a light top bar with
 * the server, the search and the account. The open section is marked for assistive technology as the current page.
 */
export function AppShell({ product, mark, rail, active, onNavigate, server, search, account, children, railLabel = 'Sections' }: AppShellProps): ReactNode {
    return (
        <div className="cms-shell">
            <nav className="cms-shell__rail" aria-label={railLabel}>
                <span className="cms-shell__mark" aria-hidden="true">{mark}</span>
                <ul className="cms-shell__items">
                    {rail.map(item => {
                        const on = item.id === active;
                        return (
                            <li key={item.id}>
                                <a
                                    href={item.href}
                                    className={cx('cms-shell__item', on && 'is-active')}
                                    aria-current={on ? 'page' : undefined}
                                    title={item.label}
                                    onClick={e => {
                                        if (onNavigate) {
                                            e.preventDefault();
                                            onNavigate(item.id);
                                        }
                                    }}
                                >
                                    <span className="cms-shell__icon">
                                        <Icon name={item.icon} size={22} />
                                        {item.badge ? <Badge count={item.badge.count} label={item.badge.label} /> : null}
                                    </span>
                                    <span className="cms-shell__label">{item.label}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <header className="cms-shell__top">
                <span className="cms-shell__product">{product}</span>
                {server != null ? <div className="cms-shell__server">{server}</div> : null}
                {search != null ? <div className="cms-shell__search">{search}</div> : null}
                {account != null ? <div className="cms-shell__account">{account}</div> : null}
            </header>
            <main className="cms-shell__main">{children}</main>
        </div>
    );
}

export interface SearchFieldProps {
    readonly label: string;
    readonly placeholder?: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onSearch?: (value: string) => void;
}

/** A search field with its icon; the label is for assistive technology, the placeholder shows what can be found. */
export function SearchField({ label, placeholder, value, onChange, onSearch }: SearchFieldProps): ReactNode {
    return (
        <form
            role="search"
            className="cms-search"
            onSubmit={e => {
                e.preventDefault();
                onSearch?.(value);
            }}
        >
            <Icon name="search" size={18} />
            <input
                className="cms-search__input"
                type="search"
                aria-label={label}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </form>
    );
}

export interface FilterOption {
    readonly id: string;
    readonly label: string;
}

export interface FilterChipsProps {
    readonly options: readonly FilterOption[];
    readonly value: string;
    readonly onChange: (id: string) => void;
    /** What the chips filter ("Show"). */
    readonly label: string;
}

/** One of a few filters, as pills; arrow keys move between them, as a radio group does. */
export function FilterChips({ options, value, onChange, label }: FilterChipsProps): ReactNode {
    const refs = useRef<Array<HTMLButtonElement | null>>([]);
    const onKey = (e: KeyboardEvent, i: number) => {
        const last = options.length - 1;
        const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
            : null;
        if (to === null) return;
        e.preventDefault();
        const option = options[to];
        if (option) {
            onChange(option.id);
            refs.current[to]?.focus();
        }
    };
    return (
        <div className="cms-chips" role="radiogroup" aria-label={label}>
            {options.map((o, i) => {
                const on = o.id === value;
                return (
                    <button
                        key={o.id}
                        ref={el => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        className={cx('cms-chip', on && 'is-on')}
                        onClick={() => onChange(o.id)}
                        onKeyDown={e => onKey(e, i)}
                    >
                        {on ? <Icon name="check" size={16} /> : null}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

export interface Pane {
    /** What the pane holds, for assistive technology ("Folders", "Messages", "Message"). */
    readonly label: string;
    readonly content: ReactNode;
}

/** A pane the person may make wider or narrower, in px: where it is, its limits, its default, and its splitter's name. */
export interface PaneSize {
    readonly width: number;
    readonly min: number;
    readonly max: number;
    /** The width a double-click or Enter on its splitter puts it back to. */
    readonly reset: number;
    /** The splitter's name, in the app's language ("Resize folders"). */
    readonly label: string;
}

export interface SplitPanesProps {
    /** Two panes (a list and what is open) or three (navigation, a list, what is open). */
    readonly panes: readonly [Pane, Pane] | readonly [Pane, Pane, Pane];
    /**
     * The pane the person is in, by its index: where the selection has got to (the folders, a list, a message). At
     * phone width only this pane shows; at tablet width it and the one before it. The last pane by default.
     */
    readonly active?: number;
    /**
     * Where Back goes from the active pane: the address of the pane before it, so the browser's own Back agrees. Shown
     * only where that pane is hidden (phone, or tablet with three panes and the last one active).
     */
    readonly back?: { readonly label: string; readonly href: string };
    /**
     * Sizes for the panes before the last, by index: each one given draws a splitter after its pane where every pane
     * shows (the desktop grid). The caller keeps the widths; the last pane takes the rest.
     */
    readonly sizes?: readonly (PaneSize | undefined)[];
    /** The last pane's least width while splitters move and the window narrows (360 by default). */
    readonly lastMin?: number;
    /**
     * A splitter moved pane `index` to `width`: while it is dragged (`done` false), and once more when the drag or the
     * key ends (`done` true), which is when a width is worth keeping.
     */
    readonly onResize?: (index: number, width: number, done: boolean) => void;
}

/** One arrow press moves a splitter this far. */
const SPLITTER_STEP = 16;

/**
 * The widths the panes take in `room` px: each as wanted within its limits; when the last pane would be under its
 * least width, the pane nearest it gives way first, down to its own least, then the one before.
 */
export function fitPanes(wanted: readonly PaneSize[], room: number, lastMin: number): number[] {
    const widths = wanted.map((one) => Math.min(Math.max(one.width, one.min), one.max));
    let over = widths.reduce((sum, w) => sum + w, 0) + lastMin - room;
    for (let i = widths.length - 1; i >= 0 && over > 0; i -= 1) {
        const give = Math.min(over, widths[i]! - wanted[i]!.min);
        widths[i] = widths[i]! - give;
        over -= give;
    }
    return widths;
}

function Splitter({ index, size, shown, others, room, lastMin, onResize }: {
    readonly index: number;
    readonly size: PaneSize;
    readonly shown: number;
    /** The other sized panes' widths, for the most this one may take beside them. */
    readonly others: number;
    readonly room: number;
    readonly lastMin: number;
    readonly onResize: SplitPanesProps['onResize'];
}): ReactNode {
    const most = Math.max(size.min, Math.min(size.max, room > 0 ? room - others - lastMin : size.max));
    const clamp = (w: number) => Math.round(Math.min(Math.max(w, size.min), most));
    const drag = useRef<{ x: number; from: number; last: number } | null>(null);
    const move = (w: number, done: boolean) => onResize?.(index, clamp(w), done);
    return (
        <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={size.label}
            aria-valuenow={shown}
            aria-valuemin={size.min}
            aria-valuemax={most}
            className="cms-panes__splitter"
            style={{ '--split-at': `var(--split-pane-end-${String(index)})` } as CSSProperties}
            onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
                // Only the primary button (or a touch or a pen) drags.
                if (e.button > 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                drag.current = { x: e.clientX, from: shown, last: shown };
                e.currentTarget.closest('.cms-panes')?.classList.add('is-resizing');
            }}
            onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
                const d = drag.current;
                if (d === null || !Number.isFinite(e.clientX)) return;
                d.last = clamp(d.from + e.clientX - d.x);
                move(d.last, false);
            }}
            onPointerUp={(e: PointerEvent<HTMLDivElement>) => {
                const d = drag.current;
                if (d === null) return;
                drag.current = null;
                e.currentTarget.closest('.cms-panes')?.classList.remove('is-resizing');
                move(d.last, true);
            }}
            onPointerCancel={(e: PointerEvent<HTMLDivElement>) => {
                const d = drag.current;
                drag.current = null;
                e.currentTarget.closest('.cms-panes')?.classList.remove('is-resizing');
                if (d !== null) move(d.last, true);
            }}
            onDoubleClick={() => move(size.reset, true)}
            onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                const to = e.key === 'ArrowLeft' ? shown - SPLITTER_STEP
                    : e.key === 'ArrowRight' ? shown + SPLITTER_STEP
                    : e.key === 'Home' ? size.min
                    : e.key === 'End' ? most
                    : e.key === 'Enter' ? size.reset
                    : null;
                if (to === null) return;
                e.preventDefault();
                move(to, true);
            }}
        />
    );
}

/**
 * Two or three panes side by side (contract `split-panes`), showing fewer as the window narrows. With `sizes`, the
 * panes before the last are resizable where all of them show (contract `pane splitter`): each has a splitter, a
 * separator dragged by mouse or touch, moved 16 px by the arrow keys, taken to its limits by Home and End, and put back
 * by a double-click or Enter. The last pane is never narrower than `lastMin`; as the window narrows the pane nearest it
 * gives way first.
 */
export function SplitPanes({ panes, active, back, sizes, lastMin = 360, onResize }: SplitPanesProps): ReactNode {
    const at = Math.min(Math.max(active ?? panes.length - 1, 0), panes.length - 1);
    const grid = useRef<HTMLDivElement>(null);
    const [room, setRoom] = useState(0);
    const sized = (sizes ?? []).slice(0, panes.length - 1);
    const resizable = sized.length === panes.length - 1 && sized.every((one): one is PaneSize => one !== undefined);
    useLayoutEffect(() => {
        const el = grid.current;
        if (el === null || !resizable) return undefined;
        const measure = () => setRoom(el.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const watch = new ResizeObserver(measure);
        watch.observe(el);
        return () => watch.disconnect();
    }, [resizable]);
    const shown = resizable ? fitPanes(sized as PaneSize[], room > 0 ? room : Number.POSITIVE_INFINITY, lastMin) : [];
    const style = resizable
        ? (Object.fromEntries(shown.flatMap((w, i) => [
            [`--split-pane-${String(i)}`, `${String(w)}px`],
            [`--split-pane-end-${String(i)}`, `${String(shown.slice(0, i + 1).reduce((sum, x) => sum + x, 0))}px`],
        ])) as CSSProperties)
        : undefined;
    return (
        <div
            ref={grid}
            className={cx('cms-panes', panes.length === 3 ? 'cms-panes--three' : 'cms-panes--two', resizable && 'cms-panes--sized')}
            data-active={at}
            style={style}
        >
            {panes.map((p, i) => (
                <section key={p.label} className="cms-panes__pane" aria-label={p.label} data-offset={at - i}>
                    {i === at && back ? (
                        <a className="cms-panes__back" href={back.href}>
                            <Icon name="chevron-left" size={18} />
                            {back.label}
                        </a>
                    ) : null}
                    {p.content}
                </section>
            ))}
            {resizable
                ? (sized as PaneSize[]).map((size, i) => (
                    <Splitter
                        key={size.label}
                        index={i}
                        size={size}
                        shown={shown[i]!}
                        others={shown.reduce((sum, w, j) => (j === i ? sum : sum + w), 0)}
                        room={room}
                        lastMin={lastMin}
                        onResize={onResize}
                    />
                ))
                : null}
        </div>
    );
}

export interface MailRowProps {
    readonly from: string;
    readonly subject: string;
    readonly preview: string;
    /** When it arrived, as the reader reads it ("09:42", "Yesterday"). */
    readonly time: string;
    readonly unread?: boolean;
    readonly hasAttachment?: boolean;
    readonly selected?: boolean;
    readonly onOpen: () => void;
    /** Its words for assistive technology, in the app's language; each left out is English. */
    readonly labels?: Partial<MailRowLabels>;
}

export interface MailRowLabels {
    readonly attachment: string;
    readonly unread: string;
}

export const MAIL_ROW_LABELS: MailRowLabels = { attachment: 'Has an attachment', unread: 'Unread' };

/** One message in a mailbox's list: who, what, the start of it, when; unread in bold with its dot. */
export function MailRow({ from, subject, preview, time, unread, hasAttachment, selected, onOpen, labels }: MailRowProps): ReactNode {
    const l = withDefaults(MAIL_ROW_LABELS, labels);
    return (
        <button
            type="button"
            className={cx('cms-mail-row', unread && 'is-unread', selected && 'is-selected')}
            aria-current={selected ? 'true' : undefined}
            onClick={onOpen}
        >
            <Avatar name={from} size={40} />
            <span className="cms-mail-row__body">
                <span className="cms-mail-row__line">
                    <span className="cms-mail-row__from">{from}</span>
                    {hasAttachment ? <Icon name="paperclip" size={16} label={l.attachment} /> : null}
                    <span className="cms-mail-row__time">{time}</span>
                </span>
                <span className="cms-mail-row__line">
                    <span className="cms-mail-row__subject">{subject}</span>
                    {unread ? <span className="cms-mail-row__dot" role="img" aria-label={l.unread} /> : null}
                </span>
                <span className="cms-mail-row__preview">{preview}</span>
            </span>
        </button>
    );
}

export interface ChatBubbleProps {
    /** Received from someone else, or sent by this account. */
    readonly direction: 'in' | 'out';
    readonly children: ReactNode;
    readonly time: string;
    /** For a sent message: whether the other side has read it. */
    readonly read?: boolean;
    /** What a read message says beside its time, in the app's language ("Read"). */
    readonly readLabel?: string;
}

/** One chat message; the corner nearest its sender is the tail. */
export function ChatBubble({ direction, children, time, read, readLabel = 'Read' }: ChatBubbleProps): ReactNode {
    return (
        <div className={cx('cms-bubble', `cms-bubble--${direction}`)}>
            <div className="cms-bubble__text">{children}</div>
            <div className="cms-bubble__meta">
                {time}
                {direction === 'out' && read ? <> · {readLabel}</> : null}
            </div>
        </div>
    );
}

export interface ComposerProps {
    /** What is being written and to whom ("Message Anna", "Quick reply to Anna Kowalska"). */
    readonly label: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onSend: () => void;
    readonly onAttach?: () => void;
    readonly placeholder?: string;
    /** `chat`: one line beside its buttons; `reply`: a titled box under a message. */
    readonly variant?: 'chat' | 'reply';
    readonly sendLabel?: string;
    /** The attach button's name, in the app's language ("Attach a file"). */
    readonly attachLabel?: string;
    /**
     * A quick reply's own controls, at the start of its last row, before Send (an attach menu). A chat composer does not
     * draw them. With `onAttach` as well, a reply draws both: these first, then the attach button.
     */
    readonly leading?: ReactNode;
    /**
     * Whether Send sends: by default, when the text is not empty. Given, it decides instead, as for a reply that may go
     * with files and no text, or may not go over its mailbox's limit.
     */
    readonly canSend?: boolean;
}

/**
 * Writing a message: the text, attaching a file, sending. Enter sends a chat message; Shift+Enter starts a new line.
 * Enter while an input method is composing (Chinese, Japanese, Korean...) belongs to the composition and never sends.
 */
export function Composer({ label, value, onChange, onSend, onAttach, placeholder, variant = 'chat', sendLabel = 'Send', attachLabel = 'Attach a file', leading, canSend }: ComposerProps): ReactNode {
    const id = useId();
    const sendable = canSend ?? value.trim() !== '';
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (sendable) onSend();
    };
    const attach = onAttach ? (
        <button type="button" className="cms-icon-button cms-composer__attach" aria-label={attachLabel} onClick={onAttach}>
            <Icon name="paperclip" />
        </button>
    ) : null;
    return (
        <form className={cx('cms-composer', `cms-composer--${variant}`)} onSubmit={submit}>
            <label htmlFor={id} className={variant === 'reply' ? 'cms-composer__title' : 'cms-visually-hidden'}>{label}</label>
            {variant === 'chat' ? attach : null}
            <textarea
                id={id}
                className="cms-composer__input"
                rows={variant === 'reply' ? 3 : 1}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                    // keyCode 229: the composing key, on browsers that do not set isComposing.
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (variant === 'chat' && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (sendable) onSend();
                    }
                }}
            />
            {variant === 'reply' && leading !== undefined ? <div className="cms-composer__leading">{leading}</div> : null}
            {variant === 'reply' ? attach : null}
            {variant === 'chat' ? (
                <button type="submit" className="cms-composer__send-round" aria-label={sendLabel} disabled={!sendable}>
                    <Icon name="send" />
                </button>
            ) : (
                <button type="submit" className="cms-button cms-button--chrome cms-composer__send" disabled={!sendable}>
                    {sendLabel} <Icon name="send" size={18} />
                </button>
            )}
        </form>
    );
}
