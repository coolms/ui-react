import { useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './internal';
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
}

/**
 * The Workspace's frame: a dark rail of sections, each an icon over its name with its count, and a light top bar with
 * the server, the search and the account. The open section is marked for assistive technology as the current page.
 */
export function AppShell({ product, mark, rail, active, onNavigate, server, search, account, children }: AppShellProps): ReactNode {
    return (
        <div className="cms-shell">
            <nav className="cms-shell__rail" aria-label="Sections">
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
}

/**
 * A section's panes: side by side on desktop, the active pane and the one before it on tablet, the active pane alone
 * on phone, with Back to the one before it. The last visible pane takes the rest of the width.
 */
export function SplitPanes({ panes, active, back }: SplitPanesProps): ReactNode {
    const at = Math.min(Math.max(active ?? panes.length - 1, 0), panes.length - 1);
    return (
        <div className={cx('cms-panes', panes.length === 3 ? 'cms-panes--three' : 'cms-panes--two')} data-active={at}>
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
}

/** One message in a mailbox's list: who, what, the start of it, when; unread in bold with its dot. */
export function MailRow({ from, subject, preview, time, unread, hasAttachment, selected, onOpen }: MailRowProps): ReactNode {
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
                    {hasAttachment ? <Icon name="paperclip" size={16} label="Has an attachment" /> : null}
                    <span className="cms-mail-row__time">{time}</span>
                </span>
                <span className="cms-mail-row__line">
                    <span className="cms-mail-row__subject">{subject}</span>
                    {unread ? <span className="cms-mail-row__dot" role="img" aria-label="Unread" /> : null}
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
}

/** One chat message; the corner nearest its sender is the tail. */
export function ChatBubble({ direction, children, time, read }: ChatBubbleProps): ReactNode {
    return (
        <div className={cx('cms-bubble', `cms-bubble--${direction}`)}>
            <div className="cms-bubble__text">{children}</div>
            <div className="cms-bubble__meta">
                {time}
                {direction === 'out' && read ? <> · Read</> : null}
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
}

/** Writing a message: the text, attaching a file, sending. Enter sends a chat message; Shift+Enter starts a new line. */
export function Composer({ label, value, onChange, onSend, onAttach, placeholder, variant = 'chat', sendLabel = 'Send' }: ComposerProps): ReactNode {
    const id = useId();
    const empty = value.trim() === '';
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!empty) onSend();
    };
    const attach = onAttach ? (
        <button type="button" className="cms-icon-button cms-composer__attach" aria-label="Attach a file" onClick={onAttach}>
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
                    if (variant === 'chat' && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!empty) onSend();
                    }
                }}
            />
            {variant === 'reply' ? attach : null}
            {variant === 'chat' ? (
                <button type="submit" className="cms-composer__send-round" aria-label={sendLabel} disabled={empty}>
                    <Icon name="send" />
                </button>
            ) : (
                <button type="submit" className="cms-button cms-button--chrome cms-composer__send" disabled={empty}>
                    {sendLabel} <Icon name="send" size={18} />
                </button>
            )}
        </form>
    );
}
