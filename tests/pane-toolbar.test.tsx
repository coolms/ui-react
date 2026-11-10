import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaneToolbar, type PaneToolbarAction } from '../src';

// jsdom lays nothing out: each measured part is given its width, and the row its room, as a browser would.
const WIDTH = { full: 100, icon: 36, separator: 9, more: 36 };
let room = 1000;
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
        const kind = this.dataset['measure'] as keyof typeof WIDTH | undefined;
        const width = kind === undefined ? 0 : WIDTH[kind] ?? 0;
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

        it('is never in the row, at any width: always behind More, first', async () => {
            // The row without it, all labelled, and More: 7 x 100 + 2 separators + 36 = 754.
            for (const width of [1000, 754, 753, 300, 250, 120]) {
                room = width;
                const { unmount } = draw(withOriginal());
                expect(shown().map((b) => b.dataset['action'])).not.toContain('original');
                expect(behind()).toContain('original');
                expect((await menu())[0]).toHaveTextContent('Show original');
                unmount();
            }
            room = 754;
            draw(withOriginal());
            // Its label takes no part in the giving way: at 754 every label of the row still shows.
            expect(bar().className).not.toContain('labels-partly-hidden');
            expect(behind()).toEqual(['original']);
            const items = await menu();
            expect(items.map((m) => m.textContent)).toEqual(['Show original']);
            expect(items[0]!.querySelector('svg')).not.toBeNull();
            await userEvent.click(items[0]!);
            expect(chosen).toEqual(['original']);
        });

        it('draws More for it even alone, and is not a Tab stop of its own', () => {
            draw([{ id: 'reply', icon: 'reply', label: 'Reply', group: 'answer' }, { id: 'original', icon: 'file-earmark-code', label: 'Show original', group: 'view', overflow: 0 }]);
            expect(shown().map((b) => b.getAttribute('aria-label'))).toEqual(['Reply', 'More actions']);
            expect(shown().filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('aria-label'))).toEqual(['Reply']);
            // A group with nothing left in the row draws no separator.
            expect(within(bar()).queryAllByRole('separator')).toHaveLength(0);
        });

        it('leaves "never one alone" to the actions that could stay: it does not make one into two', async () => {
            // The row's icons and More, Star alone behind it: 6 x 36 + 2 separators + 36 = 270. Star could go alone,
            // but never does; with Show original behind, Star and Move still go together.
            room = 270;
            draw(withOriginal());
            expect(behind()).toEqual(['move', 'original', 'star']);
            expect(bar().className).toContain('cms-pane-toolbar--labels-hidden');
            expect((await menu()).map((m) => m.textContent)).toEqual(['Show original', 'Star', 'Move']);
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

    it('a single action that may go stays in the row: never one alone behind More', () => {
        room = 200;
        view({ unread: { overflow: undefined }, move: { overflow: undefined } });
        expect(bar().querySelectorAll('[data-overflowed]')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Star' })).toBeVisible();
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
});
