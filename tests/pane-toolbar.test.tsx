import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import kitCss from '../src/kit.css?raw';
import { PaneToolbar, type PaneToolbarAction, type PaneToolbarEntry } from '../src';

// jsdom lays nothing out: each measured part is given its width, and the row its room, as a browser would.
const WIDTH = { full: 100, icon: 36, separator: 9, more: 36 };
let room = 1000;
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
        const kind = this.dataset['measure'] as keyof typeof WIDTH | undefined;
        // An action without an icon keeps its label when the others hide theirs: as wide as with it.
        const labelOnly = kind === 'icon' && this.querySelector('.cms-pane-toolbar__label') !== null;
        const width = kind === undefined ? 0 : labelOnly ? WIDTH.full : WIDTH[kind] ?? 0;
        return { width, height: 36, top: 0, left: 0, right: width, bottom: 36, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.getAttribute('role') === 'toolbar' ? room : 0;
        },
    });
});
afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect;
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    room = 1000;
});

// The message actions as the server's nodes give them: groups, and an overflow priority for those that may go.
/** An override; an undefined value takes that field away (an action with no overflow priority is pinned). */
type Over = Record<string, { [K in keyof PaneToolbarAction]?: PaneToolbarAction[K] | undefined }>;
function actions(over: Over = {}): PaneToolbarAction[] {
    const a = (id: string, label: string, group: string, overflow?: number): PaneToolbarAction => {
        const merged: Record<string, unknown> = { id, icon: 'folder', label, group, ...(overflow === undefined ? {} : { overflow }), ...over[id] };
        for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
        return merged as unknown as PaneToolbarAction;
    };
    return [
        a('reply', 'Reply', 'answer'), a('forward', 'Forward', 'answer'),
        a('archive', 'Archive', 'remove'), a('delete', 'Delete', 'remove'),
        a('unread', 'Mark unread', 'mark', 3), a('star', 'Star', 'mark', 1), a('move', 'Move', 'mark', 2),
    ];
}
let chosen: string[] = [];
const view = (over: Over = {}, status?: string) => {
    chosen = [];
    return render(<PaneToolbar label="Message actions" actions={actions(over)} onAction={(id) => chosen.push(id)} moreLabel="More actions" {...(status === undefined ? {} : { status })} />);
};
const bar = () => screen.getByRole('toolbar', { name: 'Message actions' });
const shown = () => within(bar()).getAllByRole('button').filter((b) => !b.hidden && b.closest('[aria-hidden="true"]') === null);

describe('PaneToolbar', () => {
    it('draws the groups in their order, each action named by its label, separators between groups, pinned ones marked', () => {
        view();
        expect(shown().map((b) => b.getAttribute('aria-label'))).toEqual(['Reply', 'Forward', 'Archive', 'Delete', 'Mark unread', 'Star', 'Move']);
        expect(within(bar()).getAllByRole('separator')).toHaveLength(2);
        expect(bar().className).not.toContain('labels-hidden');
        const pinned = shown().filter((b) => b.hasAttribute('data-pinned')).map((b) => b.dataset['action']);
        expect(pinned).toEqual(['reply', 'forward', 'archive', 'delete']);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('when the labels no longer fit, they hide one by one in the overflow order, then the pinned from the end; each action keeps its name', () => {
        // All labelled: 7 x 100 + 2 separators = 718. Each label hidden saves 64: four must go to fit in 500.
        room = 500;
        view();
        const labelled = () => shown().filter((b) => b.querySelector('.cms-pane-toolbar__label') !== null).map((b) => b.dataset['action']);
        expect(labelled()).toEqual(['reply', 'forward', 'archive']);
        expect(shown()).toHaveLength(7);
        expect(bar().className).toContain('cms-pane-toolbar--labels-partly-hidden');
        expect(bar().className).not.toContain('cms-pane-toolbar--labels-hidden');
        expect(within(screen.getByRole('button', { name: 'Star' })).getByRole('tooltip')).toHaveTextContent('Star');
        expect(within(screen.getByRole('button', { name: 'Reply' })).queryByRole('tooltip')).toBeNull();
    });

    it('only once every label is hidden does anything go behind More', () => {
        // All bare: 7 x 36 + 18 = 270; at 300 every label hides and all seven stay in the row.
        room = 300;
        view();
        expect(bar().className).toContain('cms-pane-toolbar--labels-hidden');
        expect(bar().className).not.toContain('labels-partly-hidden');
        expect(shown().every((b) => b.querySelector('.cms-pane-toolbar__label') === null)).toBe(true);
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('when the icons no longer fit, the overflow goes behind More in its order, never one alone, and the pinned stay', async () => {
        room = 250;
        view();
        expect(shown().filter((b) => b.dataset['action'] !== undefined).map((b) => b.dataset['action'])).toEqual(['reply', 'forward', 'archive', 'delete', 'unread']);
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(2);
        await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
        const menu = screen.getByRole('menu', { name: 'More actions' });
        expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Star', 'Move']);
        expect(screen.getByRole('button', { name: 'More actions' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('one action alone never goes behind More, even where it alone would make room', () => {
        // With More narrower than an action, Star alone behind it would fit at 260 (all icons need 270); still, Move
        // goes with it.
        WIDTH.more = 20;
        room = 260;
        try {
            view();
            expect([...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action'])).toEqual(['star', 'move']);
        } finally {
            WIDTH.more = 36;
        }
    });

    describe('a menu-only action (overflow 0)', () => {
        const withOriginal = (): PaneToolbarAction[] => [
            ...actions(), { id: 'original', icon: 'file-earmark-code', label: 'Show original', group: 'view', overflow: 0 }];
        const draw = (list: PaneToolbarAction[]) => {
            chosen = [];
            return render(<PaneToolbar label="Message actions" actions={list} onAction={(id) => chosen.push(id)} moreLabel="More actions" />);
        };
        const behind = () => [...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action']).sort();
        const menu = async () => {
            await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
            return within(screen.getByRole('menu', { name: 'More actions' })).getAllByRole('menuitem');
        };

        it('alone, it is a button at the end of the row while nothing else is behind More, its label going first', async () => {
            // The row with it, all labelled: 8 x 100 + 2 separators = 818 (its group holds nothing else: no separator).
            room = 1000;
            const first = draw(withOriginal());
            expect(shown().map((b) => b.dataset['action'])).toEqual(['reply', 'forward', 'archive', 'delete', 'unread', 'star', 'move', 'original']);
            expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
            await userEvent.click(screen.getByRole('button', { name: 'Show original' }));
            expect(chosen).toEqual(['original']);
            first.unmount();
            // At 790 one label hides: its own, the lowest of all.
            room = 790;
            const second = draw(withOriginal());
            const labelled = shown().filter((b) => b.querySelector('.cms-pane-toolbar__label') !== null).map((b) => b.dataset['action']);
            expect(labelled).toEqual(['reply', 'forward', 'archive', 'delete', 'unread', 'star', 'move']);
            second.unmount();
            // At 300 the icons do not fit (8 x 36 + 18 = 306): Star goes, and Show original goes with it, last in More.
            room = 300;
            draw(withOriginal());
            expect(behind()).toEqual(['original', 'star']);
            expect((await menu()).map((m) => m.textContent)).toEqual(['Star', 'Show original']);
        });

        it('alone beside one action, it is a button too, and not a Tab stop of its own', () => {
            draw([{ id: 'reply', icon: 'reply', label: 'Reply', group: 'answer' }, { id: 'original', icon: 'file-earmark-code', label: 'Show original', group: 'view', overflow: 0 }]);
            expect(shown().map((b) => b.getAttribute('aria-label'))).toEqual(['Reply', 'Show original']);
            expect(shown().filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('aria-label'))).toEqual(['Reply']);
            expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
            // A group with nothing left in the row draws no separator.
            expect(within(bar()).queryAllByRole('separator')).toHaveLength(0);
        });

        it('two or more are behind More at every width, last in its menu', async () => {
            const two = (): PaneToolbarAction[] => [...withOriginal(), { id: 'source', icon: 'download', label: 'Download source', group: 'view', overflow: 0 }];
            for (const width of [1000, 300]) {
                room = width;
                const { unmount } = draw(two());
                expect(shown().map((b) => b.dataset['action'])).not.toContain('original');
                expect(behind()).toEqual(expect.arrayContaining(['original', 'source']));
                const items = (await menu()).map((m) => m.textContent);
                expect(items.slice(-2)).toEqual(['Show original', 'Download source']);
                unmount();
            }
        });

        it('with one behind More already, one action may go alone beside it', async () => {
            // The two menu-only and More: 7 x 36 + 18 + 36 = 306 with everything bare; at 280 Star alone goes.
            room = 280;
            draw([...withOriginal(), { id: 'source', icon: 'download', label: 'Download source', group: 'view', overflow: 0 }]);
            expect(behind()).toEqual(['original', 'source', 'star']);
            expect((await menu()).map((m) => m.textContent)).toEqual(['Star', 'Show original', 'Download source']);
        });
    });

    it('More opens its menu on the first item with Down, and on the last with Up', async () => {
        room = 250;
        view();
        screen.getByRole('button', { name: 'More actions' }).focus();
        await userEvent.keyboard('{ArrowUp}');
        expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Move' })).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        screen.getByRole('button', { name: 'More actions' }).focus();
        await userEvent.keyboard('{ArrowDown}');
        expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Star' })).toHaveFocus();
    });

    it('a choice, in the row or in the More menu, says its id, and the menu closes', async () => {
        room = 250;
        view();
        await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
        await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
        await userEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Move' }));
        expect(chosen).toEqual(['reply', 'move']);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('actions of one overflow priority go together, as a toggle\'s pair', () => {
        room = 250;
        view({ unread: { overflow: 1 } });
        expect([...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action'])).toEqual(['unread', 'star']);
    });

    it('is one Tab stop: the arrows, Home and End move inside it, without wrapping', async () => {
        view();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: 'Reply' })).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('button', { name: 'Forward' })).toHaveFocus();
        await userEvent.keyboard('{End}');
        expect(screen.getByRole('button', { name: 'Move' })).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('button', { name: 'Move' })).toHaveFocus();
        await userEvent.keyboard('{Home}{ArrowLeft}');
        expect(screen.getByRole('button', { name: 'Reply' })).toHaveFocus();
        expect(shown().filter((b) => b.tabIndex === 0)).toHaveLength(1);
    });

    it('a disabled action stays in the focus order, says why, and does nothing', async () => {
        view({ archive: { disabled: true, reason: 'This mailbox has no archive' } });
        const archive = screen.getByRole('button', { name: 'Archive' });
        expect(archive).toHaveAttribute('aria-disabled', 'true');
        expect(within(archive).getByRole('tooltip')).toHaveTextContent('This mailbox has no archive');
        await userEvent.click(archive);
        expect(chosen).toEqual([]);
    });

    it('a disabled action\'s reason describes it, and a press shows it until focus leaves', async () => {
        view({ archive: { disabled: true, reason: 'This mailbox has no archive' } });
        const archive = screen.getByRole('button', { name: 'Archive' });
        expect(archive).toHaveAccessibleDescription('This mailbox has no archive');
        expect(archive).not.toHaveAttribute('data-reason-shown');
        await userEvent.click(archive);
        expect(archive).toHaveAttribute('data-reason-shown');
        await userEvent.keyboard('{Escape}');
        expect(archive).not.toHaveAttribute('data-reason-shown');
        await userEvent.click(archive);
        await userEvent.tab();
        expect(archive).not.toHaveAttribute('data-reason-shown');
        expect(chosen).toEqual([]);
    });

    it('an action that is not disabled has no description', () => {
        view({});
        expect(screen.getByRole('button', { name: 'Archive' })).not.toHaveAttribute('aria-describedby');
    });

    it('a busy action says so, shows its spinner only after a moment, and a second press runs nothing', async () => {
        vi.useFakeTimers();
        view({ delete: { busy: true } });
        const del = screen.getByRole('button', { name: 'Delete' });
        expect(del).toHaveAttribute('aria-busy', 'true');
        expect(del.querySelector('.cms-glyph')).toBeNull();
        act(() => void vi.advanceTimersByTime(1000));
        expect(del.querySelector('.cms-glyph')).not.toBeNull();
        del.click();
        expect(chosen).toEqual([]);
        vi.useRealTimers();
    });

    it('a whole group gone behind More leaves no separator after the last group shown', () => {
        room = 200;
        view({ unread: { overflow: 1 }, move: { overflow: 1 } });
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(3);
        expect(within(bar()).getAllByRole('separator')).toHaveLength(1);
    });

    it('an icon the kit has no name for leaves the label alone, also when the others hide theirs', () => {
        room = 300;
        view({ forward: { icon: 'no-such-icon' } });
        const forward = screen.getByRole('button', { name: 'Forward' });
        expect(forward.querySelector('svg')).toBeNull();
        expect(forward.querySelector('.cms-pane-toolbar__label')).toHaveTextContent('Forward');
        expect(screen.getByRole('button', { name: 'Reply' }).querySelector('.cms-pane-toolbar__label')).toBeNull();
        // The contract's names: a hidden label marks the action bare, an action drawn without an icon is text.
        expect(screen.getByRole('button', { name: 'Reply' }).className).toContain('cms-pane-toolbar__action--bare');
        expect(forward.className).toContain('cms-pane-toolbar__action--text');
        expect(forward.className).not.toContain('cms-pane-toolbar__action--bare');
    });

    it('a single action that may go stays in the row where the row holds it: never one alone behind More', () => {
        // All bare: 270. Star alone behind More saves nothing (36 for 36), and the row holds all seven at 270.
        room = 270;
        view({ unread: { overflow: undefined }, move: { overflow: undefined } });
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Star' })).toBeVisible();
    });

    it('a row too narrow for its pinned actions sends them behind More from the end: none is cut off, More is reached', async () => {
        // All bare: 270, and only Star may go. At 200, Star and then the pinned from the end go: Move, Mark unread.
        room = 200;
        view({ unread: { overflow: undefined }, move: { overflow: undefined } });
        expect([...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action'])).toEqual(['unread', 'star', 'move']);
        await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
        const menu = screen.getByRole('menu', { name: 'More actions' });
        // In the giving-way order: Star, then the pinned from the end of the row back.
        expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Star', 'Move', 'Mark unread']);
    });

    it('a pinned action that keeps its label, wider than the row allows, does not push More out of the row', () => {
        // Show message, pinned, has an icon the kit lacks, so it keeps its 100 when the others are bare. With the whole
        // overflow behind More the row still needs 4 x 36 + 100 + 18 + 36 = 298; at 280 Show message goes too.
        room = 280;
        chosen = [];
        render(<PaneToolbar label="Message actions" moreLabel="More actions" onAction={(id) => chosen.push(id)}
            actions={[...actions(), { id: 'message', icon: 'no-such-icon', label: 'Show message', group: 'view' }]} />);
        expect(screen.getByRole('button', { name: 'More actions' })).toBeVisible();
        expect(bar().querySelector<HTMLElement>('[data-action="message"]')?.hidden).toBe(true);
    });

    it('one action never goes behind More alone, even where that alone would save room: the next goes with it', () => {
        // Star keeps its label (no icon): with every other label hidden the actions need 270 - 36 + 100 = 334. Alone behind More it would save 64, and 270
        // would fit; More never holds one, so Move, the next in the order (the pinned from the end), goes with it.
        room = 300;
        view({ star: { icon: 'no-such-icon' }, unread: { overflow: undefined }, move: { overflow: undefined } });
        expect([...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action'])).toEqual(['star', 'move']);
        expect(screen.getByRole('button', { name: 'More actions' })).toBeVisible();
    });

    it('where only one action could go, it stays in the row at its icon width, and no More is drawn', () => {
        // Reply alone in the row, wider than the row: it may not go behind More alone, so it stays, as its icon.
        room = 20;
        chosen = [];
        render(<PaneToolbar label="Message actions" moreLabel="More actions" onAction={(id) => chosen.push(id)}
            actions={[{ id: 'reply', icon: 'reply', label: 'Reply', group: 'answer' }]} />);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(0);
        expect(bar().className).toContain('cms-pane-toolbar--labels-hidden');
    });

    describe('the primary', () => {
        const withPrimary = () => view({ delete: { primary: true } });
        const labelled = () => shown().filter((b) => b.querySelector('.cms-pane-toolbar__label') !== null).map((b) => b.dataset['action']);
        const menuItems = async () => {
            await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
            return within(screen.getByRole('menu', { name: 'More actions' })).getAllByRole('menuitem').map((m) => m.textContent);
        };

        it('keeps its label longest', () => {
            // 718 all labelled; at 340 six labels hide: every one but the primary's, wherever it stands.
            room = 340;
            withPrimary();
            expect(labelled()).toEqual(['delete']);
        });

        it('goes behind More last, and is first in its menu', async () => {
            // All bare 270; at 200 three go (270 - 3 x 36 + 36 = 198), in the order Star, Move, Mark unread.
            room = 200;
            const first = withPrimary();
            expect(await menuItems()).toEqual(['Star', 'Move', 'Mark unread']);
            first.unmount();
            // At 60 only More fits: everything goes, the primary first in the menu.
            room = 60;
            withPrimary();
            expect(await menuItems()).toEqual(['Delete', 'Star', 'Move', 'Mark unread', 'Archive', 'Forward', 'Reply']);
        });
    });

    it('each action is found by its data-action alone: the measuring copies carry another name', () => {
        view();
        expect(document.querySelectorAll('[data-action="reply"]')).toHaveLength(1);
    });

    it('only the delete kind is drawn as danger', () => {
        view({ delete: { danger: true } });
        expect(shown().filter((b) => b.classList.contains('is-danger')).map((b) => b.dataset['action'])).toEqual(['delete']);
    });

    it('the status sits at the end, its whole text kept as its title', () => {
        view({}, 'Synced at 14:32');
        const status = bar().querySelector('.cms-pane-toolbar__status');
        expect(status).toHaveTextContent('Synced at 14:32');
        expect(status).toHaveAttribute('title', 'Synced at 14:32');
    });

    describe('a menu button (an action with entries)', () => {
        const entries: PaneToolbarEntry[] = [
            { id: 'new-folder', label: 'Folder', icon: 'folder' },
            { id: 'new-document', label: 'Document', disabled: true, reason: 'Documents cannot be made here.' },
            { id: 'new-link', label: 'Link', danger: true },
        ];
        const menuOf = (name: string) => within(screen.getByRole('menu', { name })).getAllByRole('menuitem');

        it('opens the context menu with its entries in their order; choosing one says the entry\'s id', async () => {
            view({ move: { label: 'New', entries } });
            const button = screen.getByRole('button', { name: 'New' });
            expect(button).toHaveAttribute('aria-haspopup', 'menu');
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveClass('cms-pane-toolbar__action--menu');
            // The chevron after it.
            expect(button.lastElementChild).toHaveClass('cms-pane-toolbar__chevron');
            await userEvent.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');
            expect(menuOf('New').map((m) => m.textContent)).toEqual(['Folder', expect.stringContaining('Document'), 'Link']);
            await userEvent.click(within(screen.getByRole('menu', { name: 'New' })).getByRole('menuitem', { name: /Link/ }));
            expect(chosen).toEqual(['new-link']);
            expect(screen.queryByRole('menu')).toBeNull();
        });

        it('each entry has its own state: a disabled one is shown with its reason and does nothing; danger is danger', async () => {
            view({ move: { label: 'New', entries } });
            await userEvent.click(screen.getByRole('button', { name: 'New' }));
            const [, document, link] = menuOf('New');
            expect(document).toHaveAttribute('aria-disabled', 'true');
            expect(document).toHaveAccessibleDescription('Documents cannot be made here.');
            expect(link).toHaveClass('is-danger');
            await userEvent.click(document!);
            expect(chosen).toEqual([]);
            expect(screen.getByRole('menu', { name: 'New' })).toBeInTheDocument();
        });

        it('opens with Down on its first entry and with Up on its last; Escape gives focus back to it', async () => {
            view({ move: { label: 'New', entries } });
            const button = screen.getByRole('button', { name: 'New' });
            button.focus();
            await userEvent.keyboard('{ArrowDown}');
            expect(within(screen.getByRole('menu', { name: 'New' })).getByRole('menuitem', { name: 'Folder' })).toHaveFocus();
            await userEvent.keyboard('{Escape}');
            expect(button).toHaveFocus();
            await userEvent.keyboard('{ArrowUp}');
            expect(within(screen.getByRole('menu', { name: 'New' })).getByRole('menuitem', { name: 'Link' })).toHaveFocus();
        });

        it('with no entry to show it is not drawn at all, nor listed behind More', async () => {
            // Six actions, bare: 6 x 36 + 18 = 234; at 200 two go behind More.
            room = 200;
            view({ move: { label: 'New', entries: [] } });
            expect(document.querySelector('[data-action="move"]')).toBeNull();
            expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
            await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
            expect(menuOf('More actions').map((m) => m.textContent)).toEqual(['Star', 'Mark unread']);
        });

        it('disabled itself, it stays disabled with its reason and does not open', async () => {
            view({ move: { label: 'New', entries, disabled: true, reason: 'This folder is read-only.' } });
            const button = screen.getByRole('button', { name: 'New' });
            expect(button).toHaveAttribute('aria-disabled', 'true');
            expect(button).toHaveAccessibleDescription('This folder is read-only.');
            await userEvent.click(button);
            button.focus();
            await userEvent.keyboard('{ArrowDown}');
            expect(screen.queryByRole('menu')).toBeNull();
            expect(chosen).toEqual([]);
        });

        it('gives way as any other action: its label hides (the chevron stays), then it goes behind More and opens there', async () => {
            room = 300;
            const { unmount } = view({ move: { label: 'New', entries } });
            const bare = screen.getByRole('button', { name: 'New' });
            expect(bare).toHaveClass('cms-pane-toolbar__action--bare');
            expect(bare.querySelector('.cms-pane-toolbar__label')).toBeNull();
            expect(bare.querySelector('.cms-pane-toolbar__chevron')).not.toBeNull();
            unmount();
            room = 250;
            view({ move: { label: 'New', entries } });
            expect([...bar().querySelectorAll<HTMLElement>('[data-overflowed]')].map((b) => b.dataset['action'])).toEqual(['star', 'move']);
            await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
            await userEvent.click(within(screen.getByRole('menu', { name: 'More actions' })).getByRole('menuitem', { name: 'New' }));
            expect(chosen).toEqual([]);
            expect(menuOf('New').map((m) => m.textContent)).toEqual(['Folder', expect.stringContaining('Document'), 'Link']);
            await userEvent.click(within(screen.getByRole('menu', { name: 'New' })).getByRole('menuitem', { name: 'Folder' }));
            expect(chosen).toEqual(['new-folder']);
        });

        it('is measured with its chevron, in both its widths', () => {
            view({ move: { label: 'New', entries } });
            for (const kind of ['full', 'icon']) {
                const copy = document.querySelector(`[data-measure="${kind}"][data-measure-action="move"]`);
                expect(copy?.querySelector('.cms-pane-toolbar__chevron')).not.toBeNull();
            }
        });
    });

    it('its buttons are quiet: icon then label, no border and no fill at rest, the button hover, danger in the danger colour', () => {
        const rule = (selector: string) => {
            const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`(?:^|\\n)[ ]*${escaped} \\{([^}]*)\\}`).exec(kitCss)?.[1] ?? '';
        };
        const rest = rule('.cms-pane-toolbar__action');
        expect(rest).toMatch(/border: 1px solid transparent;/);
        expect(rest).toMatch(/background: none;/);
        expect(rest).toMatch(/border-radius: var\(--cms-radius-control\);/);
        expect(rule(".cms-pane-toolbar__action:hover:not([aria-disabled='true'])")).toMatch(/background: var\(--cms-btn-hover-bg\);/);
        expect(rule('.cms-pane-toolbar__action:focus-visible')).toMatch(/outline: 2px solid var\(--cms-focus-ring\);/);
        expect(rule('.cms-pane-toolbar__action.is-danger')).toMatch(/color: var\(--cms-danger-text\);/);
        expect(rule('.cms-pane-toolbar__more:hover')).toMatch(/background: var\(--cms-btn-hover-bg\);/);
    });
});
