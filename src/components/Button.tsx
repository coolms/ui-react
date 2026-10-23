import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx, Glyph } from './internal';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** secondary (the default), primary -- one per view -- or danger, for an action that destroys or cannot be undone. */
    readonly variant?: 'secondary' | 'primary' | 'danger';
    /** The action is running: the button keeps its place, says so, and cannot be pressed twice. */
    readonly busy?: boolean;
    /** What the button says while busy; defaults to its own label. */
    readonly busyLabel?: ReactNode;
    /** Allowed once the session is elevated: drawn with a lock; what pressing it does is the caller's. */
    readonly locked?: boolean;
    /** Why it is locked, for its tooltip and a screen reader. */
    readonly lockedReason?: string;
    /** A glyph or icon before the label. */
    readonly icon?: ReactNode;
    readonly children: ReactNode;
}

/**
 * An action (contract component `button`: default, primary, danger, disabled, busy, locked). A busy button is not
 * disabled to assistive technology's eyes alone: `aria-busy` says why it does nothing now. A locked one stays
 * pressable -- the press is how the person asks for elevation -- and names why it is locked.
 */
export function Button({
    variant = 'secondary',
    busy = false,
    busyLabel,
    locked = false,
    lockedReason,
    icon,
    disabled,
    className,
    children,
    type = 'button',
    title,
    ...rest
}: ButtonProps): ReactNode {
    const inert = Boolean(disabled) || busy;
    return (
        <button
            {...rest}
            type={type}
            className={cx('cms-button', `cms-button--${variant}`, busy && 'is-busy', locked && 'is-locked', className)}
            disabled={inert}
            aria-busy={busy || undefined}
            title={locked ? (lockedReason ?? title) : title}
        >
            {busy ? <Glyph name="spinner" /> : locked ? <Glyph name="lock" /> : icon}
            <span className="cms-button__label">{busy && busyLabel !== undefined ? busyLabel : children}</span>
            {locked && lockedReason ? <span className="cms-visually-hidden">, {lockedReason}</span> : null}
        </button>
    );
}
