import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, MODAL_CLOSE_MS, Modal } from '../src';

describe('Modal', () => {
    it('open: a labelled dialog, focus inside; Escape asks to close', async () => {
        const onClose = vi.fn();
        render(<Modal open title="Rename" onClose={onClose}><input aria-label="New name" /></Modal>);
        expect(screen.getByRole('dialog', { name: 'Rename' })).toBeInTheDocument();
        expect(screen.getByLabelText('New name')).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('dirty: Escape, the scrim and the close button ask the page instead of closing', async () => {
        const onClose = vi.fn();
        const onDirtyClose = vi.fn();
        render(<Modal open dirty title="Edit" onClose={onClose} onDirtyClose={onDirtyClose}><input aria-label="Body" /></Modal>);
        await userEvent.keyboard('{Escape}');
        await userEvent.click(document.querySelector('.cms-modal-scrim')!);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(onDirtyClose).toHaveBeenCalledTimes(3);
    });

    it('closing: drawn as closing, then gone', () => {
        vi.useFakeTimers();
        try {
            const { rerender } = render(<Modal open title="T" onClose={() => undefined}>x</Modal>);
            rerender(<Modal open={false} title="T" onClose={() => undefined}>x</Modal>);
            expect(screen.getByRole('dialog')).toHaveClass('is-closing');
            act(() => vi.advanceTimersByTime(MODAL_CLOSE_MS));
            expect(screen.queryByRole('dialog')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps Tab inside', async () => {
        render(<Modal open title="T" onClose={() => undefined} footer={<button type="button">Last</button>}><input aria-label="First" /></Modal>);
        screen.getByRole('button', { name: 'Last' }).focus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });
});

describe('ConfirmDialog', () => {
    it('danger: the confirming button names the outcome and is the danger one', async () => {
        const onConfirm = vi.fn();
        render(<ConfirmDialog open kind="danger" title="Delete?" message="This cannot be undone." confirmLabel="Delete 3 messages" onConfirm={onConfirm} onCancel={() => undefined} />);
        const b = screen.getByRole('button', { name: 'Delete 3 messages' });
        expect(b).toHaveClass('cms-button--danger');
        await userEvent.click(b);
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('discard-changes: "Discard changes" against "Keep editing"', () => {
        render(<ConfirmDialog open kind="discard-changes" title="Leave?" onConfirm={() => undefined} onCancel={() => undefined} />);
        expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
    });

    it('default: a primary confirm', () => {
        render(<ConfirmDialog open title="Send now?" onConfirm={() => undefined} onCancel={() => undefined} />);
        expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('cms-button--primary');
    });
});
