import { act, fireEvent, render, screen } from '@testing-library/react';
import kitCss from '../src/kit.css?raw';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    AppShell,
    Avatar,
    Badge,
    CallBar,
    CallPanel,
    ChatBubble,
    Composer,
    ConfirmDialog,
    ICON_NAMES,
    Icon,
    iconForName,
    IncomingCall,
    MailRow,
    SearchField,
    SignInForm,
    SignInLayout,
    SplitPanes,
    fitPanes,
    type PaneSize,
    tintOf,
} from '../src';

describe('Icon', () => {
    it('is decorative beside text, and named when it stands alone', () => {
        const { container } = render(<Icon name="mail" />);
        expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
        render(<Icon name="paperclip" label="Has an attachment" />);
        expect(screen.getByRole('img', { name: 'Has an attachment' })).toBeInTheDocument();
    });

    it('draws every name of the set', () => {
        for (const name of ICON_NAMES) {
            const { container, unmount } = render(<Icon name={name} />);
            expect(container.querySelector('svg')?.childNodes.length, name).toBeGreaterThan(0);
            unmount();
        }
        expect(ICON_NAMES).toContain('phone-off');
    });

    it('draws a read envelope apart from an unread one, and a clipboard for copying', () => {
        expect(iconForName('envelope')).toBe('mail');
        expect(iconForName('envelope-open')).toBe('mail-open');
        expect(iconForName('clipboard')).toBe('copy');
    });
});

describe('Badge', () => {
    it('shows the count and says what it counts; nothing for zero; caps at max', () => {
        const { rerender, container } = render(<Badge count={12} label="12 unread" />);
        expect(screen.getByText('12 unread')).toBeInTheDocument();
        expect(container).toHaveTextContent('12');
        rerender(<Badge count={150} label="150 unread" />);
        expect(container).toHaveTextContent('99+');
        rerender(<Badge count={0} label="none" />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('Avatar tint', () => {
    it('is the same for the same name, and one of six', () => {
        expect(tintOf('Anna Kowalska')).toBe(tintOf('  anna kowalska '));
        for (const name of ['A', 'Tomasz Wójcik', 'Olga Lis', 'Pavel Sidorov', 'Марек']) {
            expect(tintOf(name)).toBeGreaterThanOrEqual(1);
            expect(tintOf(name)).toBeLessThanOrEqual(6);
        }
        const { container } = render(<Avatar name="Anna Kowalska" />);
        expect(container.querySelector('.cms-avatar')).toHaveClass(`cms-avatar--tint-${tintOf('Anna Kowalska')}`);
    });
});

describe('AppShell', () => {
    const rail = [
        { id: 'mail', label: 'Mail', icon: 'mail' as const, href: '#mail', badge: { count: 12, label: '12 unread' } },
        { id: 'chat', label: 'Chat', icon: 'chat' as const, href: '#chat' },
    ];

    it('marks the open section as the current page and names its count', () => {
        render(<AppShell product="CoolMS Workspace" mark="C" rail={rail} active="mail">content</AppShell>);
        const nav = screen.getByRole('navigation', { name: 'Sections' });
        expect(nav).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: /Chat/ })).not.toHaveAttribute('aria-current');
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveTextContent('12 unread');
        expect(screen.getByRole('main')).toHaveTextContent('content');
    });

    it('navigates through onNavigate instead of the link, when given', async () => {
        const onNavigate = vi.fn();
        render(<AppShell product="P" mark="C" rail={rail} active="mail" onNavigate={onNavigate}>x</AppShell>);
        await userEvent.click(screen.getByRole('link', { name: /Chat/ }));
        expect(onNavigate).toHaveBeenCalledWith('chat');
    });

    it("names each section on its link as well, for the icons-only rail's tooltip", () => {
        render(<AppShell product="P" mark="C" rail={rail} active="mail">x</AppShell>);
        expect(screen.getByRole('link', { name: /Mail/ })).toHaveAttribute('title', 'Mail');
        expect(screen.getByRole('link', { name: /Chat/ })).toHaveAttribute('title', 'Chat');
    });
});

describe('SearchField', () => {
    it('is a labelled search landmark that submits its text', async () => {
        const onSearch = vi.fn();
        function Controlled() {
            const [v, setV] = useState('');
            return <SearchField label="Search" placeholder="Search mail" value={v} onChange={setV} onSearch={onSearch} />;
        }
        render(<Controlled />);
        expect(screen.getByRole('search')).toBeInTheDocument();
        await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'agenda{Enter}');
        expect(onSearch).toHaveBeenCalledWith('agenda');
    });
});

describe('SplitPanes with splitters', () => {
    // jsdom has no PointerEvent: one built on its MouseEvent carries the button and the position a drag reads.
    if (typeof window.PointerEvent === 'undefined') {
        class TestPointerEvent extends MouseEvent {
            readonly pointerId: number;
            constructor(type: string, init: PointerEventInit = {}) {
                super(type, init);
                this.pointerId = init.pointerId ?? 1;
            }
        }
        (window as unknown as { PointerEvent: typeof TestPointerEvent }).PointerEvent = TestPointerEvent;
    }
    const folders: PaneSize = { width: 230, min: 200, max: 380, reset: 230, label: 'Resize folders' };
    const list: PaneSize = { width: 340, min: 280, max: 620, reset: 340, label: 'Resize list' };
    const panes = [{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }] as const;

    function Sized({ onResize }: { readonly onResize: (i: number, w: number, done: boolean) => void }) {
        const [widths, setWidths] = useState([230, 340]);
        return (
            <SplitPanes
                panes={panes}
                sizes={[{ ...folders, width: widths[0]! }, { ...list, width: widths[1]! }]}
                onResize={(i, w, done) => {
                    setWidths((was) => was.map((x, j) => (j === i ? w : x)));
                    onResize(i, w, done);
                }}
            />
        );
    }

    it('draws one named separator after each sized pane, with its width and limits, and the widths on the grid', () => {
        const { container } = render(<SplitPanes panes={panes} sizes={[folders, list]} />);
        const [a, b] = screen.getAllByRole('separator');
        expect(a).toHaveAccessibleName('Resize folders');
        expect(a).toHaveAttribute('aria-orientation', 'vertical');
        expect(a).toHaveAttribute('aria-valuenow', '230');
        expect(a).toHaveAttribute('aria-valuemin', '200');
        expect(a).toHaveAttribute('aria-valuemax', '380');
        expect(b).toHaveAccessibleName('Resize list');
        expect(b).toHaveAttribute('aria-valuenow', '340');
        const grid = container.querySelector('.cms-panes') as HTMLElement;
        expect(grid).toHaveClass('cms-panes--sized');
        expect(grid.style.getPropertyValue('--split-pane-0')).toBe('230px');
        expect(grid.style.getPropertyValue('--split-pane-end-1')).toBe('570px');
    });

    it('no splitter unless every pane before the last is sized', () => {
        render(<SplitPanes panes={panes} sizes={[folders]} />);
        expect(screen.queryByRole('separator')).toBeNull();
    });

    it('arrows move 16 px, Home and End go to the limits, Enter leaves it, a double-click puts it back; each one is done', async () => {
        const onResize = vi.fn();
        render(<Sized onResize={onResize} />);
        const a = screen.getAllByRole('separator')[0]!;
        a.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onResize).toHaveBeenLastCalledWith(0, 246, true);
        expect(a).toHaveAttribute('aria-valuenow', '246');
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        expect(onResize).toHaveBeenLastCalledWith(0, 214, true);
        await userEvent.keyboard('{End}');
        expect(onResize).toHaveBeenLastCalledWith(0, 380, true);
        await userEvent.keyboard('{ArrowRight}');
        expect(onResize).toHaveBeenLastCalledWith(0, 380, true);
        await userEvent.keyboard('{Home}');
        expect(onResize).toHaveBeenLastCalledWith(0, 200, true);
        const before = onResize.mock.calls.length;
        await userEvent.keyboard('{Enter}');
        expect(onResize).toHaveBeenCalledTimes(before);
        expect(a).toHaveAttribute('aria-valuenow', '200');
        await userEvent.keyboard('{End}');
        await userEvent.dblClick(a);
        expect(onResize).toHaveBeenLastCalledWith(0, 230, true);
    });

    it('a drag reports as it moves, within the limits, and once more when it ends', () => {
        const onResize = vi.fn();
        render(<Sized onResize={onResize} />);
        const b = screen.getAllByRole('separator')[1]!;
        fireEvent.pointerDown(b, { button: 2, clientX: 600, pointerId: 1 });
        fireEvent.pointerMove(b, { clientX: 650, pointerId: 1 });
        fireEvent.pointerUp(b, { clientX: 650, pointerId: 1 });
        expect(onResize).not.toHaveBeenCalled();
        fireEvent.pointerDown(b, { button: 0, clientX: 600, pointerId: 1 });
        fireEvent.pointerMove(b, { clientX: 650, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 390, false);
        fireEvent.pointerMove(b, { clientX: 2000, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 620, false);
        fireEvent.pointerUp(b, { clientX: 2000, pointerId: 1 });
        expect(onResize).toHaveBeenLastCalledWith(1, 620, true);
        expect(onResize.mock.calls.filter((c) => c[2] === true)).toHaveLength(1);
    });

    it('as the room narrows, the pane nearest the last gives way first, then the one before, never under their least', () => {
        expect(fitPanes([folders, list], 1500, 360)).toEqual([230, 340]);
        expect(fitPanes([folders, list], 900, 360)).toEqual([230, 310]);
        expect(fitPanes([folders, list], 800, 360)).toEqual([200, 280]);
        expect(fitPanes([folders, list], 500, 360)).toEqual([200, 280]);
        expect(fitPanes([{ ...folders, width: 999 }, { ...list, width: 10 }], 2000, 360)).toEqual([380, 280]);
    });
});
