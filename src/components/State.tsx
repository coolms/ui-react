import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { cx, Glyph } from './internal';

/**
 * What a page, a card or a line of text shows instead of its content. `elevation-required` is not offered here: the
 * clients this kit serves never elevate (kit.contract.json, notOffered).
 */
export type StateKind = 'loading' | 'empty' | 'error' | 'denied';

/** page: centred in the content area; block: centred in its card; inline: small, beside text. */
export type StatePlacement = 'page' | 'block' | 'inline';

export interface StateProps {
    readonly kind: StateKind;
    /** What the state is, in the caller's words. */
    readonly title: string;
    /** Why, or what to do, in the caller's words. */
    readonly description?: string;
    /** One thing to do about it: Retry for an error, say. Its label is the caller's word too. A refusal offers none. */
    readonly action?: { readonly label: string; readonly onAction: () => void };
    readonly placement?: StatePlacement;
}

/** How long a loading state shows nothing, so a read answered sooner does not flash: the `state-delay` token. */
export const STATE_DELAY_MS = 300;

/** The token's value as the page has it, or its own when the page has none. */
function stateDelay(): number {
    if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return STATE_DELAY_MS;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--cms-state-delay').trim();
    const ms = raw.endsWith('ms') ? Number.parseFloat(raw) : raw.endsWith('s') ? Number.parseFloat(raw) * 1000 : Number.NaN;
    return Number.isFinite(ms) && ms >= 0 ? ms : STATE_DELAY_MS;
}

/** The spinner: an arc turning on its track, drawn from the tokens; with reduced motion it pulses instead. */
function Spinner(): ReactNode {
    return (
        <svg className="cms-state__spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle className="cms-state__track" cx="12" cy="12" r="10" fill="none" />
            <circle className="cms-state__arc" cx="12" cy="12" r="10" fill="none" pathLength="100" strokeDasharray="28 72" />
        </svg>
    );
}

/**
 * One component for every state instead of content (contract component `state`: loading, empty, error, denied, page,
 * block, inline, with-action, delayed). It shows the caller's title and description as given and adds no words of
 * its own beyond its action's label. Every kind is a polite status; loading shows nothing at all -- neither spinner
 * nor title -- until the state delay has passed, then both together, while its title is in the live region from the
 * start, visually hidden.
 */
export function State({ kind, title, description, action, placement = 'block' }: StateProps): ReactNode {
    const [shown, setShown] = useState(kind !== 'loading');
    useEffect(() => {
        if (kind !== 'loading') {
            setShown(true);
            return undefined;
        }
        setShown(false);
        const timer = window.setTimeout(() => setShown(true), stateDelay());
        return () => window.clearTimeout(timer);
    }, [kind]);

    return (
        <div
            className={cx('cms-state', `cms-state--${kind}`, `cms-state--${placement}`, !shown && 'is-waiting')}
            role="status"
            aria-live="polite"
            data-kind={kind}
        >
            {kind === 'loading' ? <Spinner /> : null}
            {kind === 'error' || kind === 'denied' ? <Glyph name={kind === 'error' ? 'warning' : 'lock'} /> : null}
            <span className="cms-state__text">
                <span className="cms-state__title">{title}</span>
                {description !== undefined ? <span className="cms-state__description">{description}</span> : null}
            </span>
            {action !== undefined && kind !== 'denied' ? <Button className="cms-state__action" onClick={action.onAction}>{action.label}</Button> : null}
        </div>
    );
}
