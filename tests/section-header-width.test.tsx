import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionHeader, type SectionAction, type SectionHeaderProps } from '../src';

// jsdom lays nothing out: each measured part is given its width, and row 1 its room, as a browser would.
const WIDTH: Record<string, number> = { lead: 0, title: 200, description: 150, meta: 60, full: 100, icon: 36, primary: 110, 'primary-icon': 44, more: 36 };
let room = 1000;
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
        const kind = this.dataset['measure'];
        const width = kind === undefined ? 0 : WIDTH[kind] ?? 0;
        return { width, height: 40, top: 0, left: 0, right: width, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.dataset['row'] === '1' ? room : 0;
        },
    });
});
afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect;
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    room = 1000;
});

const pressed: string[] = [];
const act = (id: string, label: string, extra: Partial<SectionAction> = {}): SectionAction => ({ id, label, icon: 'folder', onPress: () => pressed.push(id), ...extra });
// Two with a priority and one pinned (no number): they give way A, B, then C.
const secondary = (): SectionAction[] => [act('a', 'Add mailbox', { overflow: 1 }), act('b', 'Settings', { overflow: 2 }), act('c', 'Import')];
const header = (props: Partial<SectionHeaderProps> = {}) => {
    pressed.length = 0;
    return render(<SectionHeader title="Mail" moreLabel="More actions" primary={{ label: 'Compose', icon: 'plus', onPress: () => pressed.push('compose') }}
        secondary={secondary()} {...props} />);
};
const toolbar = () => screen.getByRole('toolbar', { name: 'Mail' });
const inRow = () => [...toolbar().querySelectorAll<HTMLElement>('[data-action]')].map(b => b.dataset['action']);
const labelled = () => [...toolbar().querySelectorAll<HTMLElement>('[data-action]')].filter(b => b.querySelector('.cms-section-header__label') !== null || (b.dataset['action'] === 'primary' && b.textContent !== '')).map(b => b.dataset['action']);
const moreItems = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    return within(screen.getByRole('menu', { name: 'More actions' })).getAllByRole('menuitem').map(m => m.textContent);
};
const meta = [
    { id: 'slug', content: <span>mail</span>, text: 'mail', elsewhere: true },
    { id: 'state', content: <span>Draft</span>, text: 'Draft' },
];

describe('SectionHeader, giving way (contract section-header, width)', () => {
    it('with room, the secondary actions are quiet buttons with their labels, in the tree\'s order, before the primary', () => {
        // 200 + 3 x 100 + 110 = 610.
        room = 610;
        header();
        expect(inRow()).toEqual(['a', 'b', 'c', 'primary']);
        expect(labelled()).toEqual(['a', 'b', 'c', 'primary']);
        expect(screen.getByRole('button', { name: 'Import' })).toHaveClass('cms-button--quiet');
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('the description hides first, then the chips the page says elsewhere, then the title is cut to its floor', () => {
        // All of it: 200 + 150 + 2 x 60 + 300 + 110 = 880.
        room = 760;
        const one = header({ description: 'Your mailboxes', meta });
        // The measuring copy is out of sight; the one drawn stays in the page for assistive technology.
        const shownDescription = document.querySelector('.cms-section-header__description:not([data-measure])');
        expect(shownDescription).toHaveTextContent('Your mailboxes');
        expect(shownDescription).toHaveClass('cms-visually-hidden');
        expect(document.querySelector('[data-meta="slug"]')).not.toHaveAttribute('hidden');
        one.unmount();
        // Without the description 730; without the slug 670.
        room = 700;
        const two = header({ description: 'Your mailboxes', meta });
        expect(document.querySelector('[data-meta="slug"]')).toHaveAttribute('hidden');
        expect(document.querySelector('[data-meta="state"]')).not.toHaveAttribute('hidden');
        expect(screen.getByRole('heading')).toHaveStyle({ minWidth: 'max-content' });
        two.unmount();
        // The title at its floor: 670 - 136 = 534; every label still shows.
        room = 600;
        header({ description: 'Your mailboxes', meta });
        expect(screen.getByRole('heading')).toHaveStyle({ minWidth: '64px' });
        expect(labelled()).toEqual(['a', 'b', 'c', 'primary']);
    });

    it('then the secondary actions drop their labels one by one, lowest first, each keeping its name', () => {
        // Title cut: 200 - 136 + ... = 64 + 300 + 110 = 474 with labels; each bare saves 64.
        room = 420;
        header();
        expect(labelled()).toEqual(['b', 'c', 'primary']);
        expect(screen.getByRole('button', { name: 'Add mailbox' })).toHaveAttribute('title', 'Add mailbox');
        expect(document.querySelector('[data-row="1"]')).not.toHaveClass('cms-section-header__row--chips-cut');
    });

    it('then the primary drops its label and keeps its colour', () => {
        // Every secondary bare: 64 + 108 + 110 = 282; the primary bare: 216.
        room = 250;
        header();
        expect(labelled()).toEqual([]);
        const compose = screen.getByRole('button', { name: 'Compose' });
        expect(compose).toHaveClass('cms-button--primary');
        expect(compose).toHaveAttribute('title', 'Compose');
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('then the secondary actions move into More, two at the first move, never one alone', async () => {
        // 216 - 2 x 36 + 36 = 180; one alone (216 - 36 + 36 = 216) is never tried.
        room = 200;
        header();
        expect(inRow()).toEqual(['c', 'primary', 'more']);
        expect(await moreItems()).toEqual(['Add mailbox', 'Settings']);
    });

    it('the primary moves into More last, first in its menu, and choosing it runs it', async () => {
        // Every secondary behind More: 64 + 44 + 36 = 144; the primary too: 100.
        room = 120;
        header();
        expect(inRow()).toEqual(['more']);
        expect(await moreItems()).toEqual(['Compose', 'Add mailbox', 'Settings', 'Import']);
        await userEvent.click(screen.getByRole('menuitem', { name: 'Compose' }));
        expect(pressed).toEqual(['compose']);
    });

    it('only where nothing else may give way are the chips that are the only place of their fact cut, keeping their text', () => {
        room = 50;
        header({ meta });
        const state = document.querySelector<HTMLElement>('[data-meta="state"]')!;
        expect(document.querySelector('[data-row="1"]')).toHaveClass('cms-section-header__row--chips-cut');
        expect(state).not.toHaveAttribute('hidden');
        expect(state).toHaveAttribute('title', 'Draft');
        expect(state).toHaveAccessibleName('Draft');
    });

    it('where only one action could go, it stays in the row, and no More of one is drawn', () => {
        room = 40;
        render(<SectionHeader title="Chat" moreLabel="More actions" secondary={[act('browse', 'Browse channels', { overflow: 1 })]} />);
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Browse channels' })).toBeVisible();
    });

    it('a single menu-only action is a button at the end of the row, and goes into More with the first that gives way', async () => {
        const withMenuOnly = () => [...secondary(), act('delete', 'Delete mailbox', { overflow: 0, danger: true })];
        room = 1000;
        const one = header({ secondary: withMenuOnly() });
        expect(inRow()).toEqual(['a', 'b', 'c', 'primary', 'delete']);
        one.unmount();
        // Everything bare: 64 + 4 x 36 + 44 = 252; at 240 one goes, A, beside the menu-only one: 252 - 36 - 36 + 36 = 216.
        room = 240;
        header({ secondary: withMenuOnly() });
        expect(inRow()).toEqual(['b', 'c', 'primary', 'more']);
        expect(await moreItems()).toEqual(['Add mailbox', 'Delete mailbox']);
    });

    it('two or more menu-only actions are in More at every width, after those that gave way', async () => {
        room = 1000;
        header({ secondary: [...secondary(), act('x', 'Export', { overflow: 0 }), act('y', 'Delete', { overflow: 0 })] });
        expect(inRow()).toEqual(['a', 'b', 'c', 'primary', 'more']);
        expect(await moreItems()).toEqual(['Export', 'Delete']);
    });

    it('a refused secondary stays, disabled, with the server\'s sentence, and does nothing', async () => {
        header({ secondary: [act('a', 'Import', { offer: { offered: true, locked: false, refusal: 'An import is running.' } })] });
        const button = screen.getByRole('button', { name: /Import/ });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAccessibleDescription('An import is running.');
        await userEvent.click(button);
        expect(pressed).toEqual([]);
    });

    it('one not offered is not drawn', () => {
        header({ secondary: [act('a', 'Import', { offer: { offered: false, locked: false } })] });
        expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    });

    it('the actions are one toolbar named by the title: one Tab stop, Left and Right, Home and End', async () => {
        header();
        const tabbable = [...toolbar().querySelectorAll<HTMLElement>('button')].filter(b => b.tabIndex === 0).map(b => b.dataset['action']);
        expect(tabbable).toEqual(['a']);
        screen.getByRole('button', { name: 'Add mailbox' }).focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
        await userEvent.keyboard('{End}');
        expect(screen.getByRole('button', { name: 'Compose' })).toHaveFocus();
        await userEvent.keyboard('{Home}');
        expect(screen.getByRole('button', { name: 'Add mailbox' })).toHaveFocus();
    });

    it('an old menu item (more) is read as a menu-only action', async () => {
        const run = vi.fn();
        header({ secondary: undefined, more: [
            { id: 'add', label: 'Add mailbox', offer: { offered: true, locked: false }, onSelect: run },
            { id: 'imp', label: 'Import', offer: { offered: true, locked: false }, onSelect: vi.fn() },
        ] });
        expect(inRow()).toEqual(['primary', 'more']);
        expect(await moreItems()).toEqual(['Add mailbox', 'Import']);
    });
});
