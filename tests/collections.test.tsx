import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContextMenu, List, offerFor, type MenuItem } from '../src';

const rows = [{ id: '1', primary: 'Hello', secondary: 'Ada' }, { id: '2', primary: 'Invoice', meta: 'Mon' }];

describe('List', () => {
    it('loading, empty and error each take the place of the rows', () => {
        const { rerender } = render(<List label="Messages" rows={null} loadingText="Loading messages" />);
        expect(screen.getByRole('status')).toHaveTextContent('Loading messages');
        rerender(<List label="Messages" rows={[]} emptyTitle="No messages" />);
        expect(screen.getByText('No messages')).toBeInTheDocument();
        rerender(<List label="Messages" rows={rows} error="The server did not answer." onRetry={() => undefined} />);
        expect(screen.getByRole('alert')).toHaveTextContent('The server did not answer.');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('populated and selected; a press opens; arrows move; Enter opens', async () => {
        const onOpen = vi.fn();
        render(<List label="Messages" rows={rows} selected="2" onOpen={onOpen} />);
        expect(screen.getAllByRole('option')).toHaveLength(2);
        const selected = screen.getByRole('option', { selected: true });
        expect(selected).toHaveTextContent('Invoice');
        await userEvent.click(screen.getByText('Hello'));
        expect(onOpen).toHaveBeenLastCalledWith('1');
        selected.focus();
        await userEvent.keyboard('{ArrowUp}');
        expect(screen.getByRole('option', { name: /Hello/ })).toHaveFocus();
        onOpen.mockClear();
        await userEvent.keyboard('{Enter}');
        expect(onOpen).toHaveBeenCalledWith('1');
    });

    it('right-click asks for the row menu at the point, not the browser one', () => {
        const onRowMenu = vi.fn();
        render(<List label="Messages" rows={rows} onRowMenu={onRowMenu} />);
        const notPrevented = fireEvent.contextMenu(screen.getByText('Invoice'), { clientX: 40, clientY: 50 });
        expect(notPrevented).toBe(false);
        expect(onRowMenu).toHaveBeenCalledWith('2', { x: 40, y: 50 });
    });
});

describe('ContextMenu', () => {
    const items = (onSelect = vi.fn()): MenuItem[] => [
        { id: 'open', label: 'Open', offer: offerFor('allowed', { elevates: false }), onSelect },
        { id: 'share', label: 'Share', offer: offerFor('elevate', { elevates: true }), onSelect },
        { id: 'move', label: 'Move', offer: offerFor('denied', { elevates: false, showRefused: true, refusal: 'The space is read-only' }), onSelect },
        { id: 'purge', label: 'Purge', offer: offerFor('elevate', { elevates: false }), onSelect },
        { id: 'delete', label: 'Delete', danger: true, offer: offerFor('allowed', { elevates: false }), onSelect },
    ];

    it('open: withheld items are not drawn; locked, refused and danger are marked', () => {
        render(<ContextMenu at={{ x: 10, y: 10 }} items={items()} onClose={() => undefined} />);
        const drawn = screen.getAllByRole('menuitem');
        expect(drawn.map(i => i.querySelector('.cms-menu__label')?.textContent)).toEqual(['Open', 'Share', 'Move', 'Delete']);
        expect(drawn[1]).toHaveClass('is-locked');
        expect(drawn[2]).toHaveAttribute('aria-disabled', 'true');
        expect(drawn[2]).toHaveTextContent('The space is read-only');
        expect(drawn[3]).toHaveClass('is-danger');
        expect(drawn[0]).toHaveFocus();
    });

    it('a refused item does nothing; a chosen one closes the menu', async () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();
        render(<ContextMenu at={{ x: 10, y: 10 }} items={items(onSelect)} onClose={onClose} />);
        await userEvent.click(screen.getByText('Move'));
        expect(onSelect).not.toHaveBeenCalled();
        await userEvent.click(screen.getByText('Open'));
        expect(onClose).toHaveBeenCalledOnce();
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('Escape and a press outside close it; nothing offered draws nothing', async () => {
        const onClose = vi.fn();
        const { rerender } = render(<ContextMenu at={{ x: 10, y: 10 }} items={items()} onClose={onClose} />);
        await userEvent.keyboard('{Escape}');
        fireEvent.mouseDown(document.body);
        expect(onClose).toHaveBeenCalledTimes(2);
        rerender(<ContextMenu at={{ x: 10, y: 10 }} items={[items()[3]!]} onClose={onClose} />);
        expect(screen.queryByRole('menu')).toBeNull();
    });
});
