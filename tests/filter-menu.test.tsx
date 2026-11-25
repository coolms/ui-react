import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import kitCss from '../src/kit.css?raw';
import { ContextMenu, FilterMenu, ListHead, iconForName, type MenuItem } from '../src';

const OPTIONS = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'files', label: 'Attachments' }];
/** The declarations of the stylesheet's top-level rule for one selector. */
const rule = (selector: string) => new RegExp(`\\n${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`).exec(kitCss)?.[1] ?? '';

function Controlled({ onChange, start = 'all' }: { readonly onChange?: (id: string) => void; readonly start?: string }) {
    const [value, setValue] = useState(start);
    return <FilterMenu label="Show" options={OPTIONS} value={value} defaultValue="all" onChange={(id) => { onChange?.(id); setValue(id); }} />;
}

describe('FilterMenu', () => {
    it('the default choice is the funnel alone; its name and tooltip say what it filters and the choice', () => {
        render(<Controlled />);
        const button = screen.getByRole('button', { name: 'Show: All' });
        expect(button).toHaveAttribute('aria-haspopup', 'menu');
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).toHaveAttribute('title', 'Show: All');
        expect(button).toHaveTextContent('');
        expect(button.querySelectorAll('svg')).toHaveLength(1);
        expect(button).not.toHaveClass('cms-filter-menu--active');
        expect(iconForName('funnel')).toBe('funnel');
    });

    it('any other choice is that choice\'s name, then a chevron, in the accent; never the icon alone', async () => {
        render(<Controlled />);
        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Unread' }));
        const button = screen.getByRole('button', { name: 'Show: Unread' });
        expect(button).toHaveTextContent(/^Unread$/);
        expect(button).toHaveClass('cms-filter-menu--active', 'cms-filter-menu--named');
        expect(button.lastElementChild?.tagName.toLowerCase()).toBe('svg');
        expect(rule('.cms-filter-menu--active')).toMatch(/background: var\(--cms-accent-light\); color: var\(--cms-accent-text\);/);
    });

    it('drawn as an icon only, it keeps the funnel and takes the accent', () => {
        const props = { label: 'Show', options: OPTIONS, defaultValue: 'all', onChange: () => undefined, iconOnly: true };
        const { rerender } = render(<FilterMenu {...props} value="all" />);
        expect(screen.getByRole('button')).not.toHaveClass('cms-filter-menu--active');
        rerender(<FilterMenu {...props} value="unread" />);
        const button = screen.getByRole('button', { name: 'Show: Unread' });
        expect(button).toHaveTextContent('');
        expect(button).toHaveClass('cms-filter-menu--active');
        expect(button).not.toHaveClass('cms-filter-menu--named');
    });

    it('the default choice is the one given, the first when none is', () => {
        const props = { label: 'Show', options: OPTIONS, value: 'all', onChange: () => undefined };
        const { rerender } = render(<FilterMenu {...props} defaultValue="unread" />);
        expect(screen.getByRole('button')).toHaveTextContent('All');
        rerender(<FilterMenu {...props} />);
        expect(screen.getByRole('button')).toHaveTextContent('');
    });

    it('the host\'s words join the label and the choice', () => {
        render(<FilterMenu label="Pokazuj" options={OPTIONS} value="unread" defaultValue="all" onChange={() => undefined} labels={{ name: (label, choice) => `${choice} (${label})` }} />);
        expect(screen.getByRole('button', { name: 'Unread (Pokazuj)' })).toBeInTheDocument();
    });

    it('its menu is a single choice in the declared order, the current one marked and focused', async () => {
        render(<Controlled start="unread" />);
        await userEvent.click(screen.getByRole('button'));
        const menu = screen.getByRole('menu', { name: 'Show' });
        const items = within(menu).getAllByRole('menuitemradio');
        expect(items.map((i) => i.textContent)).toEqual(['All', 'Unread', 'Attachments']);
        expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
        expect(items.map((i) => i.querySelector('.cms-menu__check svg') !== null)).toEqual([false, true, false]);
        expect(within(menu).queryAllByRole('menuitem')).toEqual([]);
        expect(items[1]).toHaveFocus();
        expect(screen.getByRole('button', { hidden: true })).toHaveAttribute('aria-expanded', 'true');
    });

    it('choosing says the id and closes; choosing the current one closes and says nothing', async () => {
        const onChange = vi.fn();
        render(<Controlled onChange={onChange} />);
        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'All' }));
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Attachments' }));
        expect(screen.queryByRole('menu')).toBeNull();
        expect(onChange.mock.calls).toEqual([['files']]);
    });

    it('keys: Enter, Space and Down open it at the current choice, Up at the last; the arrows move and wrap, Escape gives the focus back', async () => {
        const onChange = vi.fn();
        render(<Controlled start="unread" onChange={onChange} />);
        const button = screen.getByRole('button');
        for (const [key, at] of [['{Enter}', 'Unread'], [' ', 'Unread'], ['{ArrowDown}', 'Unread'], ['{ArrowUp}', 'Attachments']] as const) {
            button.focus();
            await userEvent.keyboard(key);
            expect(screen.getByRole('menuitemradio', { name: at }), key).toHaveFocus();
            await userEvent.keyboard('{Escape}');
            expect(screen.queryByRole('menu')).toBeNull();
            expect(button).toHaveFocus();
        }
        await userEvent.keyboard('{ArrowUp}{ArrowDown}');
        expect(screen.getByRole('menuitemradio', { name: 'All' })).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(onChange.mock.calls).toEqual([['all']]);
    });

    it('a second press closes it, with a mouse and on a touch screen', async () => {
        render(<Controlled />);
        const button = screen.getByRole('button');
        for (const pointer of ['mouse', 'touch']) {
            const press = async () => {
                if (pointer === 'mouse') await userEvent.click(button);
                else {
                    // A tap: the browser sends the mouse's events after the touch's.
                    fireEvent.touchStart(button);
                    fireEvent.touchEnd(button);
                    fireEvent.mouseDown(button);
                    fireEvent.mouseUp(button);
                    fireEvent.click(button);
                }
            };
            await press();
            expect(screen.getByRole('menu'), pointer).toBeInTheDocument();
            await press();
            expect(screen.queryByRole('menu'), pointer).toBeNull();
            await press();
            expect(screen.getByRole('menu'), pointer).toBeInTheDocument();
            await userEvent.keyboard('{Escape}');
        }
    });

    it('a press that ended off the button does not keep the next key from opening it', async () => {
        render(<Controlled />);
        const button = screen.getByRole('button');
        await userEvent.click(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(document.body);
        expect(screen.queryByRole('menu')).toBeNull();
        button.focus();
        await userEvent.keyboard('{Enter}');
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('a press outside closes it', async () => {
        render(<Controlled />);
        await userEvent.click(screen.getByRole('button'));
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('with fewer than two choices nothing is drawn, and a menu that was open does not come back by itself', async () => {
        const props = { label: 'Show', value: 'all', defaultValue: 'all', onChange: () => undefined };
        const { container, rerender } = render(<FilterMenu {...props} options={OPTIONS} />);
        await userEvent.click(screen.getByRole('button'));
        rerender(<FilterMenu {...props} options={OPTIONS.slice(0, 1)} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('menu')).toBeNull();
        rerender(<FilterMenu {...props} options={[]} />);
        expect(container).toBeEmptyDOMElement();
        rerender(<FilterMenu {...props} options={OPTIONS.slice(0, 2)} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('a value that names no choice reads as the default one and says so once, even to a host that does not answer', async () => {
        const onChange = vi.fn();
        const props = { label: 'Show', options: OPTIONS, defaultValue: 'all' };
        const draw = (value: string) => <StrictMode><FilterMenu {...props} value={value} onChange={(id) => onChange(id)} /></StrictMode>;
        const { rerender } = render(draw('gone'));
        expect(screen.getByRole('button', { name: 'Show: All' })).not.toHaveClass('cms-filter-menu--active');
        rerender(draw('gone'));
        rerender(draw('gone'));
        expect(onChange.mock.calls).toEqual([['all']]);
        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('menuitemradio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
        await userEvent.keyboard('{Escape}');
        // A choice that is there again, then gone again, is said again.
        rerender(draw('unread'));
        expect(onChange).toHaveBeenCalledTimes(1);
        rerender(draw('gone'));
        expect(onChange.mock.calls).toEqual([['all'], ['all']]);
    });

    it('a choice that stopped being offered is said even when too few are left to draw', () => {
        const onChange = vi.fn();
        const { rerender } = render(<FilterMenu label="Show" options={OPTIONS} value="unread" defaultValue="all" onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
        rerender(<FilterMenu label="Show" options={OPTIONS.slice(0, 1)} value="unread" defaultValue="all" onChange={onChange} />);
        expect(onChange.mock.calls).toEqual([['all']]);
    });

    it('no choices at all are choices not known yet: nothing is drawn or said, and a kept value stands when they come', () => {
        const onChange = vi.fn();
        const draw = (options: typeof OPTIONS) => <FilterMenu label="Show" options={options} value="unread" defaultValue="all" onChange={onChange} />;
        const { container, rerender } = render(draw([]));
        expect(container).toBeEmptyDOMElement();
        rerender(draw(OPTIONS.slice(0, 2)));
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Show: Unread' })).toHaveTextContent(/^Unread$/);
    });

    it('sizes: the md control height square, the control radius, the touch target at touch widths; a named one is cut only past its most width', () => {
        expect(rule('.cms-filter-menu')).toMatch(/flex: none;[^}]*width: var\(--cms-control-height-md\); height: var\(--cms-control-height-md\);[^}]*border: 0; border-radius: var\(--cms-radius-control\); background: transparent; color: var\(--cms-text-muted\);[^}]*white-space: nowrap;/);
        expect(rule('.cms-filter-menu--named')).toMatch(/width: auto; max-width: 176px;/);
        expect(rule('.cms-filter-menu__choice')).toMatch(/min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
        expect(kitCss).toMatch(/\.cms-icon-button, \.cms-filter-menu \{ min-width: var\(--cms-touch-target-min\); min-height: var\(--cms-touch-target-min\); \}/);
    });
});

describe('ContextMenu as a single choice', () => {
    const offer = { offered: true, locked: false } as const;
    const plain: MenuItem[] = [{ id: 'a', label: 'Open', offer, onSelect: () => undefined }, { id: 'b', label: 'Move', offer, onSelect: () => undefined }];
    const choices: MenuItem[] = plain.map((i, n) => ({ ...i, checked: n === 1 }));

    it('plain items are unchanged: menuitem, no aria-checked, no mark, the first focused', () => {
        render(<ContextMenu at={{ x: 0, y: 0 }} items={plain} onClose={() => undefined} />);
        const items = screen.getAllByRole('menuitem');
        expect(items).toHaveLength(2);
        for (const item of items) {
            expect(item).not.toHaveAttribute('aria-checked');
            expect(item.querySelector('.cms-menu__check')).toBeNull();
        }
        expect(items[0]).toHaveFocus();
    });

    it('choices: the current one focused unless another is asked for, and a press on one runs it', async () => {
        const at = { x: 0, y: 0 };
        const onSelect = vi.fn();
        const close = () => undefined;
        const { unmount } = render(<ContextMenu at={at} items={choices.map((i) => ({ ...i, onSelect }))} onClose={close} />);
        expect(screen.getByRole('menuitemradio', { name: 'Move' })).toHaveFocus();
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Open' }));
        expect(onSelect).toHaveBeenCalledOnce();
        unmount();
        render(<ContextMenu at={at} items={choices} onClose={close} focus="first" />);
        expect(screen.getByRole('menuitemradio', { name: 'Open' })).toHaveFocus();
    });
});

describe('ContextMenu with a group', () => {
    const offer = { offered: true, locked: false } as const;
    const none = () => undefined;
    const items: MenuItem[] = [
        { id: 'all', label: 'Add', offer, onSelect: none },
        { id: 'move', label: 'Move', offer, onSelect: none },
        // A choice may have an action's id.
        { id: 'all', label: 'All', offer, checked: false, group: 'Show', onSelect: none },
        { id: 'unread', label: 'Unread', offer, checked: true, group: 'Show', onSelect: none },
    ];
    const at = { x: 0, y: 0 };

    it('its choices are a group named by it, under its name, after a line; the arrows go through all the items', async () => {
        render(<ContextMenu at={at} items={items} onClose={none} focus="first" />);
        const group = screen.getByRole('group', { name: 'Show' });
        expect(within(group).getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual(['All', 'Unread']);
        expect(group.firstElementChild).toHaveTextContent('Show');
        expect(group.previousElementSibling).toBe(screen.getByRole('separator'));
        expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Add', 'Move']);
        expect(screen.getByRole('menuitem', { name: 'Add' })).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}{ArrowDown}');
        expect(screen.getByRole('menuitemradio', { name: 'All' })).toHaveFocus();
        await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
        expect(screen.getByRole('menuitemradio', { name: 'Unread' })).toHaveFocus();
    });

    it('a menu with no group has no line, and one that is a group alone has none before it', () => {
        const { unmount } = render(<ContextMenu at={at} items={items.slice(0, 2)} onClose={none} />);
        expect(screen.queryByRole('separator')).toBeNull();
        expect(screen.queryByRole('group')).toBeNull();
        unmount();
        render(<ContextMenu at={at} items={items.slice(2)} onClose={none} />);
        expect(screen.queryByRole('separator')).toBeNull();
        expect(screen.getByRole('group', { name: 'Show' })).toBeInTheDocument();
    });
});

describe('ListHead', () => {
    it('what leads, the name with its whole text as its title, then the filter at the end', () => {
        const { container } = render(
            <ListHead leading={<input type="checkbox" aria-label="Select all" />} name="Inbox" filter={{ label: 'Show', options: OPTIONS, value: 'unread', defaultValue: 'all', onChange: () => undefined }} />,
        );
        const head = container.querySelector('.cms-list-head')!;
        const name = screen.getByRole('heading', { name: 'Inbox' });
        expect(name).toHaveAttribute('title', 'Inbox');
        expect([...head.children]).toEqual([screen.getByRole('checkbox').parentElement, name, screen.getByRole('button', { name: 'Show: Unread' })]);
    });

    it('the name alone, with no filter, or one with fewer than two choices', () => {
        const { container, rerender } = render(<ListHead name="Conversations" />);
        expect(container.querySelector('.cms-list-head')!.children).toHaveLength(1);
        rerender(<ListHead name="Conversations" filter={{ label: 'Show', options: OPTIONS.slice(0, 1), value: 'all', defaultValue: 'all', onChange: () => undefined }} />);
        expect(container.querySelector('.cms-list-head')!.children).toHaveLength(1);
    });

    it('the header row\'s height on one line: the name is cut with an ellipsis, the filter never', () => {
        expect(rule('.cms-list-head')).toMatch(/display: flex; align-items: center;[^}]*height: var\(--cms-pane-header-height\); min-height: var\(--cms-pane-header-height\);/);
        expect(rule('.cms-list-head')).not.toMatch(/wrap/);
        expect(rule('.cms-list-head__name')).toMatch(/font-size: var\(--cms-font-size-title-sm\); font-weight: var\(--cms-font-weight-semibold\);/);
        expect(rule('.cms-list-head__name')).toMatch(/flex: 1 1 auto; min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis; white-space: nowrap;/);
    });
});
