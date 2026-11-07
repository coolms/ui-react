import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { State, STATE_DELAY_MS } from '../src';

describe('State', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('loading shows nothing until the delay -- neither spinner nor title -- then both; its title is announced from the start', () => {
        render(<State kind="loading" title="Reading the messages" />);
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
        expect(status).toHaveClass('is-waiting');
        // In the live region from the start, visually hidden while waiting.
        expect(status).toHaveTextContent('Reading the messages');

        act(() => void vi.advanceTimersByTime(STATE_DELAY_MS - 1));
        expect(status).toHaveClass('is-waiting');
        act(() => void vi.advanceTimersByTime(1));
        expect(status).not.toHaveClass('is-waiting');
        expect(status.querySelector('.cms-state__spinner')).not.toBeNull();
    });

    it('a read answered before the delay shows no loading state at all', () => {
        const { rerender } = render(<State kind="loading" title="Reading" />);
        act(() => void vi.advanceTimersByTime(STATE_DELAY_MS / 2));
        rerender(<State kind="empty" title="No messages" />);
        const status = screen.getByRole('status');
        expect(status).not.toHaveClass('is-waiting');
        expect(status.querySelector('.cms-state__spinner')).toBeNull();
        expect(status).toHaveTextContent('No messages');
    });

    it('every other kind shows at once, the caller\'s words as given and none of its own', () => {
        render(<State kind="denied" title="Not yours to read" description="Ask the owner to share it." />);
        const status = screen.getByRole('status');
        expect(status).not.toHaveClass('is-waiting');
        expect(status.textContent).toBe('Not yours to read' + 'Ask the owner to share it.');
    });

    it('an error with an action: the label is the caller\'s, and pressing it acts', async () => {
        const onAction = vi.fn();
        render(<State kind="error" title="Could not read the folder" action={{ label: 'Try again', onAction }} />);
        await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onAction).toHaveBeenCalledOnce();
    });

    it('a refusal offers no action: trying again would be refused again', () => {
        render(<State kind="denied" title="Not yours to read" action={{ label: 'Try again', onAction: () => undefined }} />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('placement: page, block or inline, each with the caller\'s title and description', () => {
        for (const placement of ['page', 'block', 'inline'] as const) {
            const { unmount } = render(<State kind="empty" title="Nothing here" description="Why" placement={placement} />);
            const status = screen.getByRole('status');
            expect(status).toHaveClass(`cms-state--${placement}`);
            expect(status.textContent).toBe('Nothing hereWhy');
            unmount();
        }
    });
    it('shows the caller\'s description in every placement, inline too', () => {
        render(<State kind="error" title="Not synced" description="The server did not answer." placement="inline" />);
        expect(screen.getByText('The server did not answer.')).toBeInTheDocument();
    });
});
