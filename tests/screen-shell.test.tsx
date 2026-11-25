import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import kitCss from '../src/kit.css?raw';
import { Avatar, List, PULL_AT, ScreenShell, type ListFilter } from '../src';

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

    describe('filter', () => {
        const filter = (value: string, onChange: (id: string) => void = () => undefined): ListFilter => ({
            label: 'Show', options: [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }], value, defaultValue: 'all', onChange,
        });
        const more = [{ id: 'settings', label: 'Mail settings', offer: { offered: true, locked: false }, onSelect: () => undefined }];

        it('an icon in the bar, after the search and before More and the shell\'s own icons; no row of its own; a choice says its id', async () => {
            const onChange = vi.fn();
            const { container } = render(
                <ScreenShell title="Inbox" search={{ label: 'Search mail', onOpen: () => undefined }} more={more} filter={filter('all', onChange)} globals={<button type="button">Notifications</button>}>
                    <p />
                </ScreenShell>,
            );
            const trailing = container.querySelector<HTMLElement>('.cms-screen__trailing')!;
            expect(within(trailing).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Search mail', 'Show: All', 'More actions', 'Notifications']);
            expect([...container.querySelector('.cms-screen')!.children].map((c) => c.className)).toEqual(['cms-screen__bar', 'cms-screen__content']);
            await userEvent.click(screen.getByRole('button', { name: 'Show: All' }));
            await userEvent.click(screen.getByRole('menuitemradio', { name: 'Unread' }));
            expect(onChange.mock.calls).toEqual([['unread']]);
        });

        it('the default choice leaves the icon and the title plain', () => {
            render(<ScreenShell title="Inbox" filter={filter('all')}><p /></ScreenShell>);
            expect(screen.getByRole('button', { name: 'Show: All' })).not.toHaveClass('cms-filter-menu--active');
            const title = screen.getByRole('heading', { level: 1 });
            expect(title).toHaveTextContent(/^Inbox$/);
            expect(title).toHaveAttribute('title', 'Inbox');
        });

        it('filtered: the icon alone in the accent, and the title reads the name, then the choice', () => {
            render(<ScreenShell title="Inbox" filter={filter('unread')}><p /></ScreenShell>);
            const button = screen.getByRole('button', { name: 'Show: Unread' });
            expect(button).toHaveClass('cms-filter-menu--active');
            expect(button).toHaveTextContent('');
            const title = screen.getByRole('heading', { level: 1 });
            expect(title.textContent).toBe('Inbox \u00b7 Unread');
            expect(title).toHaveAttribute('title', 'Inbox \u00b7 Unread');
            expect([...title.children].map((s) => [s.className, s.textContent])).toEqual([['cms-screen__title-name', 'Inbox'], ['cms-screen__title-choice', ' \u00b7 Unread']]);
        });

        it('filtered: the name gives way first, all of it, before the choice does; Back\'s name gives way before both', () => {
            const rule = (selector: string) => new RegExp(`\\n${selector.replace('.', '\\.')} \\{([^}]*)\\}`).exec(kitCss)?.[1] ?? '';
            expect(rule('.cms-screen__title--filtered')).toMatch(/display: flex;/);
            expect(rule('.cms-screen__title-name')).toMatch(/flex: 0 1000000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
            expect(rule('.cms-screen__title-choice')).toMatch(/flex: 0 1 auto;[^}]*white-space: pre;/);
            expect(rule('.cms-screen__leading')).toMatch(/flex: 0 1000000 auto;/);
            expect(rule('.cms-screen__title')).toMatch(/flex: 1 1 auto; min-width: 0;/);
        });

        it('fewer than two choices: no icon, and the title says the name alone', () => {
            render(<ScreenShell title="Inbox" filter={{ ...filter('unread'), options: [{ id: 'unread', label: 'Unread' }] }}><p /></ScreenShell>);
            expect(screen.queryByRole('button')).toBeNull();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Inbox$/);
        });

        it('no choices at all are choices not known yet: no icon, the plain title, nothing said; the kept one stands when they come', () => {
            const onChange = vi.fn();
            const { rerender } = render(<ScreenShell title="Inbox" filter={{ ...filter('unread', onChange), options: [] }}><p /></ScreenShell>);
            expect(screen.queryByRole('button')).toBeNull();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Inbox$/);
            rerender(<ScreenShell title="Inbox" filter={filter('unread', onChange)}><p /></ScreenShell>);
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inbox \u00b7 Unread');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('a value that names no choice reads as the default and is said once, the search open or not', () => {
            const onChange = vi.fn();
            const searching = { field: <input aria-label="Search" />, closeLabel: 'Close', onClose: () => undefined };
            const { rerender } = render(<ScreenShell title="Inbox" filter={filter('gone', onChange)} searching={searching}><p /></ScreenShell>);
            expect(onChange.mock.calls).toEqual([['all']]);
            rerender(<ScreenShell title="Inbox" filter={filter('gone', onChange)}><p /></ScreenShell>);
            expect(onChange.mock.calls).toEqual([['all']]);
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Inbox$/);
        });

        it('the bar does not step out of view while its menu is open, whatever the host says; closed, it does', async () => {
            const drawn = (hidden: boolean) => <ScreenShell title="Inbox" barHidden={hidden} filter={filter('all')}><p /></ScreenShell>;
            const { container, rerender } = render(drawn(false));
            const shell = container.querySelector('.cms-screen')!;
            await userEvent.click(screen.getByRole('button', { name: 'Show: All' }));
            rerender(drawn(true));
            expect(screen.getByRole('menu')).toBeInTheDocument();
            expect(shell).not.toHaveAttribute('data-bar-hidden');
            await userEvent.keyboard('{Escape}');
            expect(shell).toHaveAttribute('data-bar-hidden');
        });

        it('it gives way with the bar\'s other icons to the search, its menu with it, and the bar may step out after', async () => {
            const searching = { field: <input aria-label="Search" />, closeLabel: 'Close', onClose: () => undefined };
            const { container, rerender } = render(<ScreenShell title="Inbox" filter={filter('all')}><p /></ScreenShell>);
            await userEvent.click(screen.getByRole('button', { name: 'Show: All' }));
            rerender(<ScreenShell title="Inbox" filter={filter('all')} searching={searching}><p /></ScreenShell>);
            expect(screen.queryByRole('menu')).toBeNull();
            expect(screen.queryByRole('button', { name: 'Show: All' })).toBeNull();
            rerender(<ScreenShell title="Inbox" filter={filter('all')} barHidden><p /></ScreenShell>);
            expect(screen.queryByRole('menu')).toBeNull();
            expect(container.querySelector('.cms-screen')).toHaveAttribute('data-bar-hidden');
        });
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

    it('the bar gives Back\'s name up before the title', () => {
        const rule = (selector: string) => new RegExp(`\\n${selector.replace('.', '\\.')} \\{([^}]*)\\}`).exec(kitCss)?.[1] ?? '';
        expect(rule('.cms-screen__leading')).toMatch(/flex: 0 1000000 auto;/);
        expect(rule('.cms-screen__leading')).toMatch(/min-width: var\(--cms-touch-target-min\);/);
        expect(rule('.cms-screen__title')).toMatch(/flex: 1 1 auto; min-width: 0;/);
        // With no room for a readable piece the name wraps under Back's one row and is not drawn.
        expect(rule('.cms-screen__back')).toMatch(/flex-wrap: wrap; align-content: flex-start;[^}]*overflow: hidden; overflow: clip;/);
        expect(rule('.cms-screen__back-name')).toMatch(/flex: 1 1 24px; min-width: 24px; max-width: max-content;/);
    });

    const settings = { id: 'settings', label: 'Mail settings', offer: { offered: true, locked: false }, onSelect: () => undefined };

    it('More holds the secondary actions in their order, after search and before the shell\'s own icons, and an entry runs', async () => {
        const add = vi.fn();
        const { container } = render(
            <ScreenShell title="Mail" search={{ label: 'Search mail', onOpen: () => undefined }} globals={<button type="button">Notifications</button>}
                moreLabel="More mail actions" more={[
                    { id: 'add', label: 'Add mailbox', offer: { offered: true, locked: false }, onSelect: add },
                    settings,
                    { id: 'hidden', label: 'Hidden', offer: { offered: false, locked: false }, onSelect: () => undefined },
                ]}>
                <p />
            </ScreenShell>,
        );
        const trailing = container.querySelector<HTMLElement>('.cms-screen__trailing')!;
        expect(within(trailing).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Search mail', 'More mail actions', 'Notifications']);
        const more = screen.getByRole('button', { name: 'More mail actions' });
        expect(more).toHaveAttribute('aria-haspopup', 'menu');
        expect(more).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(more);
        expect(more).toHaveAttribute('aria-expanded', 'true');
        const menu = screen.getByRole('menu', { name: 'More mail actions' });
        expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Add mailbox', 'Mail settings']);
        await userEvent.click(within(menu).getByRole('menuitem', { name: 'Add mailbox' }));
        expect(add).toHaveBeenCalledOnce();
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('no More without secondary actions, or with none of them shown: no empty menu', () => {
        const { rerender } = render(<ScreenShell title="Drive"><p /></ScreenShell>);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        rerender(<ScreenShell title="Drive" more={[]}><p /></ScreenShell>);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        rerender(<ScreenShell title="Drive" more={[{ ...settings, offer: { offered: false, locked: false } }]}><p /></ScreenShell>);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        rerender(<ScreenShell title="Mail" more={[settings]}><p /></ScreenShell>);
        expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
    });

    it('an action refused now stays in More with the server\'s sentence and does nothing', async () => {
        const run = vi.fn();
        render(<ScreenShell title="Mail" more={[{ ...settings, offer: { offered: true, locked: false, refusal: 'Sign in to this mailbox again.' }, onSelect: run }]}><p /></ScreenShell>);
        await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
        const item = screen.getByRole('menuitem');
        expect(item).toHaveAttribute('aria-disabled', 'true');
        expect(item).toHaveTextContent('Sign in to this mailbox again.');
        await userEvent.click(item);
        expect(run).not.toHaveBeenCalled();
    });

    it('a second press on More closes its menu, Escape closes it with the focus back on More, and More gives way to the search', async () => {
        const { rerender } = render(<ScreenShell title="Mail" more={[settings]}><p /></ScreenShell>);
        const more = screen.getByRole('button', { name: 'More actions' });
        await userEvent.click(more);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        await userEvent.click(more);
        expect(screen.queryByRole('menu')).toBeNull();
        await userEvent.click(more);
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(more).toHaveFocus();
        await userEvent.click(more);
        rerender(<ScreenShell title="Mail" more={[settings]} searching={{ field: <input aria-label="Search" />, closeLabel: 'Close', onClose: () => undefined }}><p /></ScreenShell>);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('a primary menu with no entry shown is not drawn, and the screen has no primary', () => {
        const { container } = render(
            <ScreenShell title="Drive" primary={{ label: 'New', icon: 'plus', menu: [
                { id: 'upload', label: 'Upload', offer: { offered: false, locked: false }, onSelect: () => undefined },
            ] }}>
                <p />
            </ScreenShell>,
        );
        expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
        expect(container.firstElementChild).not.toHaveClass('cms-screen--with-primary');
    });

    it('an empty primary menu is not drawn either', () => {
        render(<ScreenShell title="Drive" primary={{ label: 'New', icon: 'plus', menu: [] }}><p /></ScreenShell>);
        expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
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

    it('a list that scrolls in its own box, scrolled down, is not pulled: a drag there is its scroll; back at its top it is', async () => {
        const onRefresh = vi.fn(async () => undefined);
        const { container } = render(
            <ScreenShell title="Inbox" onRefresh={onRefresh}>
                <div className="inner" style={{ overflowY: 'auto', height: 100 }}><p className="row">Anna</p></div>
            </ScreenShell>,
        );
        const inner = container.querySelector<HTMLElement>('.inner')!;
        const row = container.querySelector<HTMLElement>('.row')!;
        const drag = () => {
            fireEvent.touchStart(row, { touches: [{ clientY: 0 }] });
            fireEvent.touchMove(row, { touches: [{ clientY: PULL_AT * 2 }] });
            fireEvent.touchEnd(row);
        };
        inner.scrollTop = 120;
        drag();
        expect(onRefresh).not.toHaveBeenCalled();
        inner.scrollTop = 0;
        drag();
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    describe('bar-hidden', () => {
        // The reader's scroll: a wheel, then the scroll it causes.
        const scrollTo = (el: HTMLElement, top: number) => {
            fireEvent.wheel(el);
            el.scrollTop = top;
            fireEvent.scroll(el);
        };
        const shellOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.cms-screen')!;

        it('the bar steps out while the content scrolls down, and back on any scroll up and at the top', () => {
            const { container } = render(<ScreenShell title="Inbox"><p>content</p></ScreenShell>);
            const content = container.querySelector<HTMLElement>('.cms-screen__content')!;
            scrollTo(content, 30);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            scrollTo(content, 200);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
            scrollTo(content, 190);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            scrollTo(content, 400);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
            scrollTo(content, 0);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
        });

        it('a scroll the host makes itself (a view opening at its end) keeps the bar; the reader\'s next scroll moves it', () => {
            const { container } = render(<ScreenShell title="Anna"><div className="thread" style={{ overflowY: 'auto', height: 100 }} /></ScreenShell>);
            const thread = container.querySelector<HTMLElement>('.thread')!;
            thread.scrollTop = 900;
            fireEvent.scroll(thread);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            scrollTo(thread, 1000);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
        });

        it('a scroll key typed into a field is not the reader scrolling the view', () => {
            const { container } = render(<ScreenShell title="Inbox"><textarea aria-label="Reply" className="reply" style={{ height: 40 }} /></ScreenShell>);
            const reply = container.querySelector<HTMLTextAreaElement>('.reply')!;
            fireEvent.keyDown(reply, { key: 'ArrowDown' });
            reply.scrollTop = 300;
            fireEvent.scroll(reply);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            // The same key outside a field is the reader's.
            fireEvent.keyDown(shellOf(container), { key: 'ArrowDown' });
            reply.scrollTop = 600;
            fireEvent.scroll(reply);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
        });

        it('a tap that opens a view is not the reader scrolling that view', () => {
            const { container } = render(
                <ScreenShell title="Chat"><div className="list"><button type="button" className="row">Ada</button></div><div className="thread" style={{ overflowY: 'auto', height: 100 }} /></ScreenShell>,
            );
            fireEvent.pointerDown(container.querySelector<HTMLElement>('.row')!);
            const thread = container.querySelector<HTMLElement>('.thread')!;
            thread.scrollTop = 900;
            fireEvent.scroll(thread);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            // A wheel over the thread is the reader's.
            scrollTo(thread, 1000);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
        });

        it('a pane that scrolls on its own inside the content moves the bar too', () => {
            const { container } = render(<ScreenShell title="Inbox"><div className="pane" style={{ overflowY: 'auto', height: 100 }} /></ScreenShell>);
            const pane = container.querySelector<HTMLElement>('.pane')!;
            scrollTo(pane, 300);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
        });

        it('focus moving into the bar brings it back', () => {
            const { container } = render(<ScreenShell title="Inbox" globals={<button type="button">Notifications</button>}><p /></ScreenShell>);
            scrollTo(container.querySelector<HTMLElement>('.cms-screen__content')!, 300);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
            act(() => screen.getByRole('button', { name: 'Notifications' }).focus());
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
        });

        it('never while searching, whatever the scroll or the host says', () => {
            const { container } = render(
                <ScreenShell title="Inbox" barHidden searching={{ field: <input aria-label="Search mail" />, closeLabel: 'Close search', onClose: () => undefined }}>
                    <p />
                </ScreenShell>,
            );
            scrollTo(container.querySelector<HTMLElement>('.cms-screen__content')!, 300);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
        });

        it('given by the host, the host decides and the scroll does not', () => {
            const { container, rerender } = render(<ScreenShell title="Inbox" barHidden={false}><p /></ScreenShell>);
            scrollTo(container.querySelector<HTMLElement>('.cms-screen__content')!, 300);
            expect(shellOf(container)).not.toHaveAttribute('data-bar-hidden');
            rerender(<ScreenShell title="Inbox" barHidden><p /></ScreenShell>);
            expect(shellOf(container)).toHaveAttribute('data-bar-hidden');
        });
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
