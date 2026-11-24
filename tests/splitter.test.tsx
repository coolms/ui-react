import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import kitCss from '../src/kit.css?raw';
import { SplitPanes, Splitter, type PaneSize } from '../src';

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

const KEY = 'cms-splitter:mail:folders';
beforeEach(() => window.localStorage.clear());
afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
});

/** A host that keeps the width the splitter reports, as a column beside it would follow it. */
function Column({ onChange = () => undefined, storageKey = 'mail:folders' }: { readonly onChange?: (w: number, done: boolean) => void; readonly storageKey?: string }) {
    const [width, setWidth] = useState<number | undefined>(undefined);
    return (
        <div>
            <output data-testid="width">{width ?? 'none'}</output>
            <Splitter
                storageKey={storageKey}
                default={240}
                min={200}
                max={400}
                label="Resize the folder list"
                onChange={(w, done) => {
                    setWidth(w);
                    onChange(w, done);
                }}
            />
        </div>
    );
}
const handle = () => screen.getByRole('separator', { name: 'Resize the folder list' });

describe('Splitter', () => {
    it('is a focusable vertical separator, named, with its width and limits; the default where nothing is remembered', () => {
        render(<Column />);
        const h = handle();
        expect(h).toHaveAttribute('tabindex', '0');
        expect(h).toHaveAttribute('aria-orientation', 'vertical');
        expect(h).toHaveAttribute('aria-valuenow', '240');
        expect(h).toHaveAttribute('aria-valuemin', '200');
        expect(h).toHaveAttribute('aria-valuemax', '400');
        expect(h).toHaveClass('cms-splitter');
        expect(screen.getByTestId('width')).toHaveTextContent('none');
    });

    it('a drag follows the pointer within min and max, and the release remembers the width on the device', () => {
        const onChange = vi.fn();
        render(<Column onChange={onChange} />);
        const h = handle();
        fireEvent.pointerDown(h, { button: 0, clientX: 500, pointerId: 1 });
        expect(h).toHaveClass('is-dragging');
        fireEvent.pointerMove(h, { clientX: 540, pointerId: 1 });
        expect(onChange).toHaveBeenLastCalledWith(280, false);
        expect(h).toHaveAttribute('aria-valuenow', '280');
        expect(window.localStorage.getItem(KEY)).toBeNull();
        fireEvent.pointerMove(h, { clientX: 2000, pointerId: 1 });
        expect(onChange).toHaveBeenLastCalledWith(400, false);
        expect(h).toHaveClass('is-at-max');
        fireEvent.pointerMove(h, { clientX: 0, pointerId: 1 });
        expect(onChange).toHaveBeenLastCalledWith(200, false);
        expect(h).toHaveClass('is-at-min');
        fireEvent.pointerMove(h, { clientX: 520, pointerId: 1 });
        fireEvent.pointerUp(h, { clientX: 520, pointerId: 1 });
        expect(onChange).toHaveBeenLastCalledWith(260, true);
        expect(onChange.mock.calls.filter((c) => c[1] === true)).toHaveLength(1);
        expect(h).not.toHaveClass('is-dragging');
        expect(window.localStorage.getItem(KEY)).toBe('260');
    });

    it('only the primary button drags, and a press that does not move remembers nothing', () => {
        const onChange = vi.fn();
        render(<Column onChange={onChange} />);
        const h = handle();
        fireEvent.pointerDown(h, { button: 2, clientX: 500, pointerId: 1 });
        fireEvent.pointerMove(h, { clientX: 560, pointerId: 1 });
        fireEvent.pointerUp(h, { clientX: 560, pointerId: 1 });
        fireEvent.pointerDown(h, { button: 0, clientX: 500, pointerId: 1 });
        fireEvent.pointerUp(h, { clientX: 500, pointerId: 1 });
        expect(onChange).not.toHaveBeenCalled();
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('opens at the width remembered on the device, within the limits of today, and tells the host', () => {
        window.localStorage.setItem(KEY, '320');
        const onChange = vi.fn();
        const { unmount } = render(<Column onChange={onChange} />);
        expect(handle()).toHaveAttribute('aria-valuenow', '320');
        expect(screen.getByTestId('width')).toHaveTextContent('320');
        expect(onChange).toHaveBeenCalledWith(320, true);
        unmount();
        window.localStorage.setItem(KEY, '900');
        render(<Column />);
        expect(handle()).toHaveAttribute('aria-valuenow', '400');
        expect(screen.getByTestId('width')).toHaveTextContent('400');
    });

    it('keys: Left and Right by step, Shift by 64, Home and End to the limits, Enter and Escape leave it; each is remembered', async () => {
        const onChange = vi.fn();
        render(<Column onChange={onChange} />);
        handle().focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onChange).toHaveBeenLastCalledWith(256, true);
        expect(window.localStorage.getItem(KEY)).toBe('256');
        await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
        expect(onChange).toHaveBeenLastCalledWith(200, true);
        await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
        expect(onChange).toHaveBeenLastCalledWith(264, true);
        await userEvent.keyboard('{End}');
        expect(onChange).toHaveBeenLastCalledWith(400, true);
        expect(window.localStorage.getItem(KEY)).toBe('400');
        await userEvent.keyboard('{Home}');
        expect(onChange).toHaveBeenLastCalledWith(200, true);
        const calls = onChange.mock.calls.length;
        await userEvent.keyboard('{Enter}{Escape}');
        expect(onChange).toHaveBeenCalledTimes(calls);
        expect(handle()).toHaveAttribute('aria-valuenow', '200');
        expect(window.localStorage.getItem(KEY)).toBe('200');
    });

    it('a step of its own moves it that far', async () => {
        const onChange = vi.fn();
        render(<Splitter default={240} min={200} max={400} step={10} label="Resize" onChange={onChange} />);
        screen.getByRole('separator').focus();
        await userEvent.keyboard('{ArrowLeft}');
        expect(onChange).toHaveBeenLastCalledWith(230, true);
    });

    it('a double-click puts it back to its default and forgets the remembered width', async () => {
        window.localStorage.setItem(KEY, '360');
        const onChange = vi.fn();
        render(<Column onChange={onChange} />);
        expect(handle()).toHaveAttribute('aria-valuenow', '360');
        await userEvent.dblClick(handle());
        expect(onChange).toHaveBeenLastCalledWith(240, true);
        expect(handle()).toHaveAttribute('aria-valuenow', '240');
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('the host may keep the width: value is shown, and each move is reported', async () => {
        const onChange = vi.fn();
        render(<Splitter value={300} default={240} min={200} max={400} label="Resize" onChange={onChange} />);
        const h = screen.getByRole('separator');
        expect(h).toHaveAttribute('aria-valuenow', '300');
        h.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onChange).toHaveBeenLastCalledWith(316, true);
        // Nothing is remembered without a key.
        expect(window.localStorage.length).toBe(0);
    });

    it('draws without storage: a refused read or write leaves the default and every move working', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('denied');
        });
        const onChange = vi.fn();
        render(<Column onChange={onChange} />);
        expect(handle()).toHaveAttribute('aria-valuenow', '240');
        handle().focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onChange).toHaveBeenLastCalledWith(256, true);
        await userEvent.dblClick(handle());
        expect(onChange).toHaveBeenLastCalledWith(240, true);
    });

    it('draws nothing at rest; the accent line on hover, while dragged and with focus; a col-resize pointer; 8px to grab', () => {
        const rule = /\.cms-splitter \{([^}]*)\}/.exec(kitCss)?.[1] ?? '';
        expect(rule).toMatch(/width: 8px;/);
        expect(rule).toMatch(/cursor: col-resize;/);
        expect(rule).not.toMatch(/background|border/);
        expect(kitCss).toMatch(/\.cms-splitter:hover, \.cms-splitter\.is-dragging, \.cms-splitter:focus-visible \{ background: [^}]*var\(--cms-accent\)/);
        // Below tablet width one column shows at a time: no splitter.
        expect(kitCss).toMatch(/@media \(max-width: [\d.]+px\) \{[^@]*\.cms-splitter \{ display: none; \}/);
    });
});

describe('SplitPanes with a storage key', () => {
    const folders: PaneSize = { width: 230, min: 200, max: 380, reset: 230, label: 'Resize folders' };
    const list: PaneSize = { width: 340, min: 280, max: 620, reset: 340, label: 'Resize list' };
    const panes = [{ label: 'Folders', content: 'f' }, { label: 'Messages', content: 'm' }, { label: 'Message', content: 'r' }] as const;

    it('draws the kit\'s one splitter between panes: nothing of its own', () => {
        const { container } = render(<SplitPanes panes={panes} sizes={[folders, list]} />);
        const splitters = container.querySelectorAll('.cms-splitter');
        expect(splitters).toHaveLength(2);
        for (const s of splitters) expect(s).toHaveClass('cms-panes__splitter');
    });

    it('opens at the widths remembered on this device, one key per split, and remembers each move', async () => {
        window.localStorage.setItem('cms-splitter:mail:1', '400');
        const onResize = vi.fn();
        const { container } = render(<SplitPanes panes={panes} sizes={[folders, list]} storageKey="mail" onResize={onResize} />);
        const [a, b] = screen.getAllByRole('separator');
        expect(a).toHaveAttribute('aria-valuenow', '230');
        expect(b).toHaveAttribute('aria-valuenow', '400');
        const grid = container.querySelector('.cms-panes') as HTMLElement;
        expect(grid.style.getPropertyValue('--split-pane-1')).toBe('400px');
        a!.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onResize).toHaveBeenLastCalledWith(0, 246, true);
        expect(a).toHaveAttribute('aria-valuenow', '246');
        expect(grid.style.getPropertyValue('--split-pane-0')).toBe('246px');
        expect(window.localStorage.getItem('cms-splitter:mail:0')).toBe('246');
        await userEvent.dblClick(b!);
        expect(b).toHaveAttribute('aria-valuenow', '340');
        expect(window.localStorage.getItem('cms-splitter:mail:1')).toBeNull();
    });

    it('marks the grid while a splitter is dragged, and not once it is let go', () => {
        const { container } = render(<SplitPanes panes={panes} sizes={[folders, list]} storageKey="mail" />);
        const grid = container.querySelector('.cms-panes') as HTMLElement;
        const a = screen.getAllByRole('separator')[0]!;
        fireEvent.pointerDown(a, { button: 0, clientX: 230, pointerId: 1 });
        fireEvent.pointerMove(a, { clientX: 260, pointerId: 1 });
        expect(grid).toHaveClass('is-resizing');
        fireEvent.pointerUp(a, { clientX: 260, pointerId: 1 });
        expect(grid).not.toHaveClass('is-resizing');
        expect(window.localStorage.getItem('cms-splitter:mail:0')).toBe('260');
    });
});
