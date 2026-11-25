import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import kitCss from '../src/kit.css?raw';
import { ScreenShell, type MenuItem } from '../src';
import { filterGoesIntoMore, type BarWidths } from '../src/components/ScreenShell';

const WIDTHS = Array.from({ length: 221 }, (_, i) => 300 + i);
/** The fullest bar on a phone: the folders, the search, the filter, More, the bell and the avatar. */
const FULLEST: Omit<BarWidths, 'bar'> = { leading: 44, gap: 8, icon: 44, iconGap: 4, search: true, more: true, globals: [44, 32], choice: 78.2 };
/** What the fullest bar takes beside the title: its padding left out of `bar`. */
const REST = 44 + 8 + 8 + 4 * 44 + 32 + 4 * 4;

describe('the decision', () => {
    it('filtered: into More once the choice\'s name is not whole; its own width is enough to stay', () => {
        const at = (bar: number, choice: number) => filterGoesIntoMore({ ...FULLEST, bar, choice });
        expect(at(REST + 78.2, 78.2)).toBe(false);
        expect(at(REST + 78.1, 78.2)).toBe(true);
        expect(at(REST + 125, 126)).toBe(true);
        expect(at(REST + 126, 126)).toBe(false);
        // A phone of 390, the bar's padding of 16 out: Unread fits beside it, Attachments does not.
        expect(at(374, 78.2)).toBe(false);
        expect(at(374, 126)).toBe(true);
        expect(at(344, 78.2)).toBe(true);
    });

    it('not filtered: into More once the title has less than 48px', () => {
        expect(filterGoesIntoMore({ ...FULLEST, bar: REST + 48, choice: null })).toBe(false);
        expect(filterGoesIntoMore({ ...FULLEST, bar: REST + 47, choice: null })).toBe(true);
    });

    it('each icon the bar has, and what leads, counts with its gap', () => {
        const at = (over: Partial<BarWidths>, less: number) => [filterGoesIntoMore({ ...FULLEST, ...over, bar: REST - less + 78.2 }), filterGoesIntoMore({ ...FULLEST, ...over, bar: REST - less + 77 })];
        expect(at({}, 0)).toEqual([false, true]);
        expect(at({ search: false }, 48)).toEqual([false, true]);
        expect(at({ globals: [32] }, 48)).toEqual([false, true]);
        expect(at({ leading: 0 }, 52)).toEqual([false, true]);
    });

    it('a bar without More keeps the filter at every width', () => {
        for (const bar of WIDTHS) expect(filterGoesIntoMore({ ...FULLEST, more: false, bar, choice: 300 }), String(bar)).toBe(false);
    });

    it('from 300 to 520 it changes once, from More to the bar', () => {
        for (const choice of [null, 78.2, 126]) {
            const answers = WIDTHS.map((w) => filterGoesIntoMore({ ...FULLEST, bar: w - 16, choice }));
            expect(answers.filter((a, i) => i > 0 && a !== answers[i - 1]), String(choice)).toHaveLength(1);
            expect([answers[0], answers[answers.length - 1]]).toEqual([true, false]);
        }
    });
});

// jsdom lays nothing out: the bar's parts are given their widths, and a ResizeObserver that the test fires.
let barWidth = 390;
let textWidth = (text: string) => text.length * 9;
let observers: { fire: () => void; targets: Element[] }[] = [];
const realRect = HTMLElement.prototype.getBoundingClientRect;
const style = document.createElement('style');
style.textContent = '.cms-screen__bar { padding-left: 8px; padding-right: 8px; column-gap: 8px; } .cms-screen__trailing { column-gap: 4px; } .cms-screen__leading { min-width: 44px; }';

beforeEach(() => {
    barWidth = 390;
    textWidth = (text) => text.length * 9;
    observers = [];
    document.head.append(style);
    HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
        const width = this.classList.contains('cms-screen__bar') ? barWidth
            : this.matches('.cms-screen__icon, .cms-filter-menu') ? 44
            : this.matches('.avatar') ? 32
            : this.matches('.cms-screen__ruler > span') ? textWidth(this.textContent ?? '')
            : 0;
        return { width, height: 44, top: 0, left: 0, right: width, bottom: 44, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    vi.stubGlobal('ResizeObserver', class {
        private readonly me: { fire: () => void; targets: Element[] };
        constructor(callback: () => void) {
            this.me = { fire: callback, targets: [] };
            observers.push(this.me);
        }
        observe(e: Element) { this.me.targets.push(e); }
        disconnect() { observers = observers.filter((o) => o !== this.me); }
    });
});
afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect;
    style.remove();
    vi.unstubAllGlobals();
});

const settings: MenuItem = { id: 'settings', label: 'Mail settings', offer: { offered: true, locked: false }, onSelect: () => undefined };
const OPTIONS = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'files', label: 'Attachments' }];
interface Setup { readonly start?: string; readonly more?: readonly MenuItem[]; readonly options?: typeof OPTIONS; readonly onChange?: (id: string) => void; readonly searching?: boolean }
function Shell({ start = 'all', more = [settings], options = OPTIONS, onChange, searching = false }: Setup) {
    const [value, setValue] = useState(start);
    return (
        <ScreenShell title="Inbox" navigation={<button type="button">Folders</button>} search={{ label: 'Search mail', onOpen: () => undefined }} more={more}
            {...(searching ? { searching: { field: <input aria-label="Search" />, closeLabel: 'Close', onClose: () => undefined } } : {})}
            filter={{ label: 'Show', options, value, defaultValue: 'all', onChange: (id) => { onChange?.(id); setValue(id); } }}
            globals={<><button type="button" className="cms-screen__icon">Notifications</button><span className="avatar">SA</span></>}>
            <p />
        </ScreenShell>
    );
}
const resize = (width: number) => {
    barWidth = width;
    act(() => { for (const o of [...observers]) o.fire(); });
};
const icons = () => Array.from(document.querySelectorAll('.cms-screen__trailing > *')).map((b) => b.getAttribute('aria-label') ?? b.textContent);
// Attachments and its dot are 14 characters, 126px: at 390 the bar leaves 90. Unread is 9, 81px. All is the default.
const inMore = () => document.querySelector('.cms-filter-menu') === null;

describe('the filter in More', () => {
    it('at the first draw already, where the choice\'s name is not whole; the title gives way and no other icon drops', () => {
        render(<Shell start="files" />);
        expect(icons()).toEqual(['Search mail', 'More actions, Show: Attachments', 'Notifications', 'SA']);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox · Attachments');
        expect(screen.getByRole('button', { name: 'Folders' })).toBeInTheDocument();
    });

    it('in the bar where the choice\'s name is whole, More as it was', () => {
        render(<Shell start="unread" />);
        expect(icons()).toEqual(['Search mail', 'Show: Unread', 'More actions', 'Notifications', 'SA']);
        expect(screen.getByRole('button', { name: 'More actions' })).not.toHaveClass('cms-screen__icon--active');
    });

    it('a single choice under its label after the other actions, the current one marked; More focuses its first item', async () => {
        const onChange = vi.fn();
        render(<Shell start="files" onChange={onChange} />);
        await userEvent.click(screen.getByRole('button', { name: 'More actions, Show: Attachments' }));
        const menu = screen.getByRole('menu', { name: 'More actions' });
        expect([...menu.children].map((c) => c.getAttribute('role'))).toEqual(['menuitem', 'separator', 'group']);
        const items = within(within(menu).getByRole('group', { name: 'Show' })).getAllByRole('menuitemradio');
        expect(items.map((i) => [i.textContent, i.getAttribute('aria-checked')])).toEqual([['All', 'false'], ['Unread', 'false'], ['Attachments', 'true']]);
        expect(screen.getByRole('menuitem', { name: 'Mail settings' })).toHaveFocus();
        await userEvent.click(items[2]!);
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: 'More actions, Show: Attachments' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Unread' }));
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onChange.mock.calls).toEqual([['unread']]);
    });

    it('More takes the accent and says the choice only while the filter in it is not the default', () => {
        barWidth = 320;
        const { unmount } = render(<Shell start="all" />);
        expect(inMore()).toBe(true);
        expect(screen.getByRole('button', { name: 'More actions' })).not.toHaveClass('cms-screen__icon--active');
        unmount();
        render(<Shell start="unread" />);
        const more = screen.getByRole('button', { name: 'More actions, Show: Unread' });
        expect(more).toHaveClass('cms-screen__icon--active');
        expect(more).toHaveAttribute('title', 'More actions, Show: Unread');
        expect(kitCss).toMatch(/\.cms-icon-button\.cms-screen__icon\.cms-screen__icon--active \{ background: var\(--cms-accent-light\); color: var\(--cms-accent-text\); \}/);
    });

    it('without other actions the filter stays in the bar at every width, and there is no More', () => {
        for (const more of [[], [{ ...settings, offer: { offered: false, locked: false } }]]) {
            const { unmount } = render(<Shell start="files" more={more} />);
            for (const w of WIDTHS) {
                resize(w);
                expect(icons(), String(w)).toEqual(['Search mail', 'Show: Attachments', 'Notifications', 'SA']);
            }
            unmount();
        }
    });

    it('the other actions gone, it is back in the bar with the same width; with them again, in More', () => {
        const { rerender } = render(<Shell start="files" />);
        expect(inMore()).toBe(true);
        rerender(<Shell start="files" more={[]} />);
        expect(icons()).toEqual(['Search mail', 'Show: Attachments', 'Notifications', 'SA']);
        rerender(<Shell start="files" />);
        expect(icons()).toEqual(['Search mail', 'More actions, Show: Attachments', 'Notifications', 'SA']);
    });

    it('from 300 to 520 and back no icon drops, the filter is in one place, and a width has one answer either way', () => {
        render(<Shell start="files" />);
        const sweep = (widths: readonly number[]) => widths.map((w) => {
            resize(w);
            const first = inMore();
            resize(w);
            expect(inMore(), String(w)).toBe(first);
            expect(icons(), String(w)).toEqual(first
                ? ['Search mail', 'More actions, Show: Attachments', 'Notifications', 'SA']
                : ['Search mail', 'Show: Attachments', 'More actions', 'Notifications', 'SA']);
            expect(screen.getByRole('button', { name: 'Folders' })).toBeInTheDocument();
            return first;
        });
        const up = sweep(WIDTHS);
        const down = sweep([...WIDTHS].reverse()).reverse();
        expect(down).toEqual(up);
        // 284 beside the title, 16 of padding, 126 of the choice's name.
        expect(WIDTHS[up.indexOf(false)]).toBe(426);
        expect(up.lastIndexOf(true)).toBe(up.indexOf(false) - 1);
    });

    it('it is measured again when the choice\'s font comes, and watches the bar, the icons and the choice\'s name', () => {
        render(<Shell start="unread" />);
        expect(inMore()).toBe(false);
        expect(observers.flatMap((o) => o.targets).map((t) => t.parentElement?.className === 'cms-screen__ruler' ? 'ruler' : t.className)).toEqual(['cms-screen__bar', 'cms-screen__trailing', 'ruler']);
        textWidth = (text) => text.length * 12;
        resize(390);
        expect(inMore()).toBe(true);
    });

    it('with fewer than two choices, or none known yet, nothing of it is drawn anywhere', async () => {
        barWidth = 240;
        for (const options of [[], OPTIONS.slice(0, 1)]) {
            const { unmount } = render(<Shell start="all" options={options} />);
            expect(icons()).toEqual(['Search mail', 'More actions', 'Notifications', 'SA']);
            await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
            expect(screen.queryByRole('group')).toBeNull();
            expect(screen.queryAllByRole('menuitemradio')).toEqual([]);
            unmount();
        }
    });

    it('a choice that moves it into More gives the focus to More', async () => {
        render(<Shell start="all" />);
        await userEvent.click(screen.getByRole('button', { name: 'Show: All' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Attachments' }));
        expect(inMore()).toBe(true);
        expect(screen.getByRole('button', { name: 'More actions, Show: Attachments' })).toHaveFocus();
    });

    it('a choice that moves it back to the bar gives the focus to the filter\'s button', async () => {
        render(<Shell start="files" />);
        await userEvent.click(screen.getByRole('button', { name: 'More actions, Show: Attachments' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'All' }));
        expect(screen.getByRole('button', { name: 'Show: All' })).toHaveFocus();
    });

    it('a choice that does not move it leaves the focus where the menu was opened', async () => {
        barWidth = 320;
        render(<Shell start="files" />);
        await userEvent.click(screen.getByRole('button', { name: 'More actions, Show: Attachments' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Unread' }));
        expect(screen.getByRole('button', { name: 'More actions, Show: Unread' })).toHaveFocus();
    });

    it('a width that moves it takes no focus, but the one it took away: that goes where the filter is', () => {
        render(<Shell start="unread" />);
        act(() => screen.getByRole('button', { name: 'Folders' }).focus());
        resize(340);
        expect(inMore()).toBe(true);
        expect(screen.getByRole('button', { name: 'Folders' })).toHaveFocus();
        resize(390);
        act(() => screen.getByRole('button', { name: 'Show: Unread' }).focus());
        resize(340);
        expect(screen.getByRole('button', { name: 'More actions, Show: Unread' })).toHaveFocus();
        resize(390);
        expect(screen.getByRole('button', { name: 'More actions' })).toHaveFocus();
    });

    it('a move closes the menu that held it, and neither opens by itself after', async () => {
        render(<Shell start="files" />);
        await userEvent.click(screen.getByRole('button', { name: 'More actions, Show: Attachments' }));
        resize(500);
        expect(screen.queryByRole('menu')).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Show: Attachments' }));
        resize(390);
        expect(screen.queryByRole('menu')).toBeNull();
        resize(500);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('the search opened and closed, it is where it was', () => {
        const { rerender } = render(<Shell start="files" />);
        rerender(<Shell start="files" searching />);
        expect(screen.queryByRole('button', { name: /More actions/ })).toBeNull();
        rerender(<Shell start="files" />);
        expect(icons()).toEqual(['Search mail', 'More actions, Show: Attachments', 'Notifications', 'SA']);
        resize(500);
        expect(inMore()).toBe(false);
    });

    it('the title: the place\'s name gives way first, then the choice\'s, in a bar with More or without', () => {
        const rule = (selector: string) => new RegExp(`\\n${selector.replace('.', '\\.')} \\{([^}]*)\\}`).exec(kitCss)?.[1] ?? '';
        expect(rule('.cms-screen__title-name')).toMatch(/flex: 0 1000000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
        expect(rule('.cms-screen__title-choice')).toMatch(/flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
        barWidth = 300;
        for (const more of [[], [settings]]) {
            const { unmount } = render(<Shell start="files" more={more} />);
            expect([...screen.getByRole('heading', { level: 1 }).children].map((s) => s.className)).toEqual(['cms-screen__title-name', 'cms-screen__title-choice']);
            expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('title', 'Inbox · Attachments');
            unmount();
        }
    });
});
