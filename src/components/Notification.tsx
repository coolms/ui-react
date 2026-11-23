import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon.js';
import { cx } from './internal.js';

/**
 * A notification's action, as the server declares it, already resolved by the host: `row`, the whole row takes the
 * person there; `button`, a button after the text does. `onAction` is absent when the host does not know where it leads:
 * then nothing is drawn for it and pressing the row only reads the notification.
 */
export interface NotificationAction {
    readonly label: string;
    readonly presentation: 'row' | 'button';
    readonly onAction?: () => void;
}

export interface NotificationProps {
    /** The server's title, plain text. */
    readonly title: string;
    /** The server's body, plain text; collapsed to one line until expanded. */
    readonly body?: string | null;
    /** When, as the host words it. */
    readonly time?: string | null;
    readonly unread: boolean;
    /** What the visually hidden word for an unread notification is, in the host's language. */
    readonly unreadLabel: string;
    /** The chevron's name while collapsed and while expanded, in the host's language. */
    readonly expandLabel: string;
    readonly collapseLabel: string;
    readonly action?: NotificationAction | null;
    /** The notification is read: the row pressed, its body expanded, or its button pressed. Called once while unread. */
    readonly onRead: () => void;
    /** A leading visual: an icon or an avatar. */
    readonly leading?: ReactNode;
}

/**
 * One notification in the person's notification list (contract component `notification`: unread, read, collapsed,
 * expanded, with-action, row-action). Pressing the row (a click, a tap or Enter) reads it, and takes the person
 * somewhere only when its action is a row action the host can follow; a button action goes only from its button, a real
 * button after the text, which reads it too. Expanding the body with the chevron reads it as well. The server's title
 * and body are drawn as given, as text.
 */
export function Notification({ title, body = null, time = null, unread, unreadLabel, expandLabel, collapseLabel, action = null, onRead, leading }: NotificationProps): ReactNode {
    const [expanded, setExpanded] = useState(false);
    const bodyId = useId();
    const read = () => {
        if (unread) onRead();
    };
    const followsRow = action?.presentation === 'row' && action.onAction !== undefined;
    const button = action?.presentation === 'button' && action.onAction !== undefined ? action : null;
    const press = () => {
        read();
        if (followsRow) action.onAction?.();
    };
    return (
        <article className={cx('cms-notification', unread && 'is-unread', expanded && 'is-expanded', followsRow && 'is-row-action')} data-state={unread ? 'unread' : 'read'}>
            <div
                className="cms-notification__row"
                role="button"
                tabIndex={0}
                aria-describedby={body === null ? undefined : bodyId}
                onClick={press}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    press();
                }}
            >
                {leading != null ? <span className="cms-notification__leading">{leading}</span> : null}
                <span className="cms-notification__text">
                    <span className="cms-notification__head">
                        <span className="cms-notification__title">
                            {unread ? <span className="cms-visually-hidden">{unreadLabel} </span> : null}
                            {title}
                        </span>
                        {time !== null ? <span className="cms-notification__time">{time}</span> : null}
                    </span>
                    {body !== null && body !== '' ? <span className="cms-notification__body" id={bodyId}>{body}</span> : null}
                </span>
                {unread ? <span className="cms-notification__dot" aria-hidden="true" /> : null}
            </div>
            {body !== null && body !== '' ? (
                <button
                    type="button"
                    className="cms-notification__chevron"
                    aria-expanded={expanded}
                    aria-controls={bodyId}
                    aria-label={expanded ? collapseLabel : expandLabel}
                    title={expanded ? collapseLabel : expandLabel}
                    onClick={() => {
                        if (!expanded) read();
                        setExpanded((open) => !open);
                    }}
                >
                    <Icon name="chevron-down" size={18} />
                </button>
            ) : null}
            {button !== null ? (
                <button
                    type="button"
                    className="cms-button cms-notification__action"
                    onClick={() => {
                        read();
                        button.onAction?.();
                    }}
                >
                    {button.label}
                </button>
            ) : null}
        </article>
    );
}
