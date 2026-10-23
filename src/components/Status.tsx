import type { ReactNode } from 'react';
import { Button } from './Button';
import { cx, Glyph } from './internal';

export interface ToastProps {
    readonly kind: 'success' | 'error' | 'info';
    readonly message: ReactNode;
    /** One follow-up the person may want ("Undo", "Open"). */
    readonly action?: { readonly label: ReactNode; readonly onAction: () => void };
    readonly onDismiss?: () => void;
}

/**
 * A short report of what happened (contract component `toast`: success, error, info, with-action). An error is said
 * assertively (role=alert); the others politely (role=status). Placement and timing are the page's (ToastRegion).
 */
export function Toast({ kind, message, action, onDismiss }: ToastProps): ReactNode {
    return (
        <div className={cx('cms-toast', `cms-toast--${kind}`)} role={kind === 'error' ? 'alert' : 'status'}>
            <Glyph name={kind === 'success' ? 'check' : kind === 'error' ? 'warning' : 'info'} />
            <span className="cms-toast__message">{message}</span>
            {action ? <Button className="cms-toast__action" onClick={action.onAction}>{action.label}</Button> : null}
            {onDismiss ? (
                <button type="button" className="cms-icon-button" aria-label="Dismiss" onClick={onDismiss}><Glyph name="close" /></button>
            ) : null}
        </div>
    );
}

/** Where toasts stack: a fixed corner of the page. */
export function ToastRegion({ children }: { readonly children: ReactNode }): ReactNode {
    return <div className="cms-toast-region">{children}</div>;
}

export interface LoadingProps {
    /** What is being read ("Loading messages"): never a bare spinner. */
    readonly what: ReactNode;
    /** inline: beside other content; block: in place of a whole region. */
    readonly layout?: 'inline' | 'block';
}

/** Something is being read, and says what (contract component `loading`: inline, block). */
export function Loading({ what, layout = 'inline' }: LoadingProps): ReactNode {
    return (
        <div className={cx('cms-loading', `cms-loading--${layout}`)} role="status" aria-live="polite">
            <Glyph name="spinner" />
            <span>{what}</span>
        </div>
    );
}

export interface EmptyStateProps {
    readonly title: ReactNode;
    /** Why there is nothing, and what would bring something. */
    readonly hint?: ReactNode;
    readonly action?: ReactNode;
}

/** Nothing to show, and why; optionally what to do (contract component `empty-state`: default, with-action). */
export function EmptyState({ title, hint, action }: EmptyStateProps): ReactNode {
    return (
        <div className="cms-empty">
            <p className="cms-empty__title">{title}</p>
            {hint != null ? <p className="cms-empty__hint">{hint}</p> : null}
            {action != null ? <div className="cms-empty__action">{action}</div> : null}
        </div>
    );
}

export interface ErrorBannerProps {
    /** Why the read failed, in the person's words -- the server's own words when it gave them. */
    readonly message: ReactNode;
    /** Offered only when trying again can help (a timeout, a network failure), never for a refusal. */
    readonly onRetry?: () => void;
}

/** A read failed; says why, offers retry when retrying can help (contract component `error-banner`: default, with-retry). */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps): ReactNode {
    return (
        <div className="cms-error-banner" role="alert">
            <Glyph name="warning" />
            <span className="cms-error-banner__message">{message}</span>
            {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
        </div>
    );
}
