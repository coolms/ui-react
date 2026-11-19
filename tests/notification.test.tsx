import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Notification, type NotificationProps } from '../src';

const words = { unreadLabel: 'Unread', expandLabel: 'Show more', collapseLabel: 'Show less' };
const draw = (over: Partial<NotificationProps> = {}) => {
    const onRead = vi.fn();
    const view = render(<Notification title="Missed call" body="Anna called you." time="09:42" unread onRead={onRead} {...words} {...over} />);
    return { onRead, view, row: () => screen.getByRole('button', { name: /Missed call/ }) };
};

describe('Notification', () => {
    it('unread and read: the dot and the hidden word only while unread; the title and body as given, as text', () => {
        const { view } = draw({ title: '<b>Missed call</b>' });
        const card = view.container.querySelector('article')!;
        expect(card).toHaveAttribute('data-state', 'unread');
        expect(card.querySelector('.cms-notification__dot')).not.toBeNull();
        expect(screen.getByText('Unread', { exact: false })).toHaveClass('cms-visually-hidden');
        expect(card.querySelector('b')).toBeNull();
        view.rerender(<Notification title="Missed call" body="Anna called you." unread={false} onRead={() => undefined} {...words} />);
        expect(card).toHaveAttribute('data-state', 'read');
        expect(card.querySelector('.cms-notification__dot')).toBeNull();
        expect(screen.queryByText('Unread', { exact: false })).toBeNull();
    });

    it('row-action: pressing the row reads it and follows its action; Enter does the same', async () => {
        const go = vi.fn();
        const { onRead, row, view } = draw({ action: { label: 'Open conversation', presentation: 'row', onAction: go } });
        await userEvent.click(row());
        expect(onRead).toHaveBeenCalledTimes(1);
        expect(go).toHaveBeenCalledTimes(1);
        expect(view.container.querySelector('article')).toHaveClass('is-row-action');
        row().focus();
        await userEvent.keyboard('{Enter}');
        expect(go).toHaveBeenCalledTimes(2);
        // No button is drawn for a row action.
        expect(screen.queryByRole('button', { name: 'Open conversation' })).toBeNull();
    });

    it('with-action: a button action goes only from its button, after the text; the row only reads it', async () => {
        const go = vi.fn();
        const { onRead, row, view } = draw({ action: { label: 'Join call', presentation: 'button', onAction: go } });
        await userEvent.click(row());
        expect(onRead).toHaveBeenCalledTimes(1);
        expect(go).not.toHaveBeenCalled();
        const join = screen.getByRole('button', { name: 'Join call' });
        expect(row().compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        view.rerender(<Notification title="Missed call" body="Anna called you." unread onRead={onRead} {...words} action={{ label: 'Join call', presentation: 'button', onAction: go }} />);
        await userEvent.click(join);
        expect(go).toHaveBeenCalledTimes(1);
        expect(onRead).toHaveBeenCalledTimes(2);
    });

    it('an action whose destination the host does not know draws nothing, and the row still reads it', async () => {
        const { onRead, row } = draw({ action: { label: 'Open', presentation: 'button' } });
        expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
        await userEvent.click(row());
        expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('collapsed and expanded: the chevron opens the body, says which, and reads it', async () => {
        const { onRead, view } = draw();
        const card = view.container.querySelector('article')!;
        const chevron = within(card as HTMLElement).getByRole('button', { name: 'Show more' });
        expect(chevron).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(chevron);
        expect(card).toHaveClass('is-expanded');
        expect(within(card as HTMLElement).getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
        expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('a read notification is not read again', async () => {
        const { onRead, row } = draw({ unread: false });
        await userEvent.click(row());
        expect(onRead).not.toHaveBeenCalled();
    });
});
