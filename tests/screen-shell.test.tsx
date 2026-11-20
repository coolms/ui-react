import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar, List, PULL_AT, ScreenShell } from '../src';

describe('ScreenShell', () => {
    it('one bar: at a root the section\'s navigation, the title, then search and the shell\'s own icons, and no Back', () => {
        render(
            <ScreenShell title="Inbox" navigation={<button type="button">Folders</button>} search={{ label: 'Search mail', onOpen: () => undefined }} globals={<button type="button">Notifications</button>}>
                <p>content</p>
            </ScreenShell>,
        );
        const bar = screen.getByRole('banner');
        expect(within(bar).getByRole('heading', { level: 1, name: 'Inbox' })).toHaveAttribute('title', 'Inbox');
        expect(within(bar).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Folders', 'Search mail', 'Notifications']);
        expect(within(bar).queryByRole('link')).toBeNull();
    });

    it('nested: Back names the parent and leads to it, in place of the navigation', async () => {
        const onBack = vi.fn();
        const { unmount } = render(<ScreenShell title="Partner demo" back={{ label: 'Inbox', onBack }} navigation={<button type="button">Folders</button>}><p /></ScreenShell>);
        await userEvent.click(screen.getByRole('button', { name: 'Inbox' }));
        expect(onBack).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: 'Folders' })).toBeNull();
        unmount();
        render(<ScreenShell title="Projects" back={{ label: 'Personal', href: '#drive/personal' }}><p /></ScreenShell>);
        expect(screen.getByRole('link', { name: 'Personal' })).toHaveAttribute('href', '#drive/personal');
    });

    it('searching: the bar is Close and the host\'s field, in place of the title and the icons; Close ends it', async () => {
        const onClose = vi.fn();
        render(
            <ScreenShell title="Inbox" search={{ label: 'Search mail', onOpen: () => undefined }} globals={<button type="button">Notifications</button>}
                searching={{ field: <input aria-label="Search mail" />, closeLabel: 'Close search', onClose }}>
                <p />
            </ScreenShell>,
        );
        const bar = screen.getByRole('banner');
        expect(within(bar).getByRole('textbox', { name: 'Search mail' })).toBeInTheDocument();
        expect(within(bar).queryByRole('heading')).toBeNull();
        expect(within(bar).queryByRole('button', { name: 'Notifications' })).toBeNull();
        await userEvent.click(within(bar).getByRole('button', { name: 'Close search' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('filters: chips under the bar, exactly one selected; a choice says its id', async () => {
        const onSelect = vi.fn();
        render(
            <ScreenShell title="Chat" filters={{ label: 'Show', options: [{ id: 'all', label: 'All' }, { id: 'direct', label: 'Direct' }], selected: 'all', onSelect }}>
                <p />
            </ScreenShell>,
        );
        await userEvent.click(screen.getByRole('radio', { name: 'Direct' }));
        expect(onSelect).toHaveBeenCalledWith('direct');
    });

    it('the primary action floats as one button, and the content leaves room for it', async () => {
        const onPress = vi.fn();
        const { container } = render(<ScreenShell title="Chat" primary={{ label: 'New chat', icon: 'plus', onPress }}><p /></ScreenShell>);
        await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
        expect(onPress).toHaveBeenCalledOnce();
        expect(container.firstElementChild).toHaveClass('cms-screen--with-primary');
    });

    it('a primary menu opens its declared entries, and an entry runs', async () => {
        const upload = vi.fn();
        render(
            <ScreenShell title="Drive" primary={{ label: 'New', icon: 'plus', menu: [
                { id: 'upload', label: 'Upload', offer: { offered: true, locked: false }, onSelect: upload },
                { id: 'new-folder', label: 'New folder', offer: { offered: true, locked: false }, onSelect: () => undefined },
            ] }}>
                <p />
            </ScreenShell>,
        );
        const plus = screen.getByRole('button', { name: 'New' });
        expect(plus).toHaveAttribute('aria-haspopup', 'menu');
        await userEvent.click(plus);
        const menu = screen.getByRole('menu', { name: 'New' });
        expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Upload', 'New folder']);
        await userEvent.click(within(menu).getByRole('menuitem', { name: 'Upload' }));
        expect(upload).toHaveBeenCalledOnce();
    });

    it('a pull from the top past the threshold refreshes; the list inside draws the pull and then the refreshing state', async () => {
        let done: () => void = () => undefined;
        const onRefresh = vi.fn(() => new Promise<void>((resolve) => { done = resolve; }));
        const { container } = render(
            <ScreenShell title="Inbox" onRefresh={onRefresh} pullText="Synced at 09:42">
                <List label="Messages" rows={[{ id: 'm1', primary: 'Anna', secondary: 'Partner demo', meta: '09:42', unread: true, count: 2 }]} />
            </ScreenShell>,
        );
        const content = container.querySelector<HTMLElement>('.cms-screen__content')!;
        const touch = (type: string, y: number) => fireEvent[type as 'touchStart'](content, { touches: [{ clientY: y }] });
        touch('touchStart', 0);
        touch('touchMove', PULL_AT * 2);
        expect(content).toHaveAttribute('data-pulling');
        expect(within(container).getByRole('status')).toHaveTextContent('Synced at 09:42');
        fireEvent.touchEnd(content);
        expect(onRefresh).toHaveBeenCalledOnce();
        expect(content).toHaveAttribute('data-refreshing');
        await act(async () => done());
        expect(content).not.toHaveAttribute('data-refreshing');
        // A short pull refreshes nothing.
        touch('touchStart', 0);
        touch('touchMove', 10);
        fireEvent.touchEnd(content);
        expect(onRefresh).toHaveBeenCalledOnce();
    });
});

describe('List rows', () => {
    it('one anatomy: the title semibold while unread, the meta with its count under it', () => {
        render(<List label="Chats" rows={[
            { id: 'a', primary: 'Anna', secondary: 'See you', meta: '10:05', unread: true, count: 2 },
            { id: 'b', primary: 'Tomasz', secondary: 'Lease', meta: '08:20' },
        ]} />);
        const [anna, tomasz] = screen.getAllByRole('option');
        expect(anna!.querySelector('.cms-list__primary')).toHaveClass('is-unread');
        expect(within(anna!).getByText('2')).toHaveClass('cms-badge');
        expect(tomasz!.querySelector('.cms-list__primary')).not.toHaveClass('is-unread');
        expect(tomasz!.querySelector('.cms-badge')).toBeNull();
    });
});

describe('Avatar states', () => {
    it('connection: on one\'s own avatar the live connection is the dot, said in words as its name and tooltip', () => {
        const { rerender } = render(<Avatar name="Sam Taylor" connection={{ state: 'connected', label: 'Live updates on' }} />);
        const avatar = screen.getByRole('img', { name: 'Sam Taylor, Live updates on' });
        expect(avatar).toHaveAttribute('title', 'Live updates on');
        expect(avatar.querySelector('.cms-avatar__presence')).toHaveClass('is-connected');
        rerender(<Avatar name="Sam Taylor" connection={{ state: 'reconnecting', label: 'Reconnecting' }} />);
        expect(screen.getByRole('img').querySelector('.cms-avatar__presence')).toHaveClass('is-reconnecting');
        rerender(<Avatar name="Sam Taylor" connection={{ state: 'offline', label: 'Live updates off' }} />);
        expect(screen.getByRole('img').querySelector('.cms-avatar__presence')).toHaveClass('is-disconnected');
    });

    it('presence where declared, busy drawn as away; none where not declared', () => {
        const { rerender } = render(<Avatar name="Anna Kowalska" presence="busy" />);
        expect(screen.getByRole('img').querySelector('.cms-avatar__presence')).toHaveClass('is-away');
        rerender(<Avatar name="Anna Kowalska" />);
        expect(screen.getByRole('img').querySelector('.cms-avatar__presence')).toBeNull();
    });

    it('deleted: a neutral person icon, never initials of the stored name', () => {
        render(<Avatar name="Former User" deleted />);
        const avatar = screen.getByRole('img', { name: 'Former User' });
        expect(avatar).toHaveClass('cms-avatar--deleted');
        expect(avatar).not.toHaveTextContent('FU');
        expect(avatar.querySelector('svg')).not.toBeNull();
    });
});
