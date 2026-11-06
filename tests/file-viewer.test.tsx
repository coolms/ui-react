import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileViewer, type FileViewerSiblings } from '../src';

const actions = [
    { label: 'Download', icon: null, onSelect: vi.fn() },
    { label: 'Open separately', icon: null, onSelect: vi.fn() },
];
const base = { name: 'report.pdf', badge: 'PDF', closeLabel: 'Close', onClose: () => undefined };
const set = (over: Partial<FileViewerSiblings> = {}): FileViewerSiblings => ({
    position: '2 of 3', index: 1, total: 3, previousLabel: 'Previous file', nextLabel: 'Next file', onPrevious: vi.fn(), onNext: vi.fn(), ...over,
});

describe('FileViewer', () => {
    // This test environment lays nothing out, so nothing has a box unless it is given one.
    beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('a dialog named by the file; focus starts on Close, stays inside, and returns to what opened it', async () => {
        render(<button>Open</button>);
        screen.getByRole('button', { name: 'Open' }).focus();
        const view = render(<FileViewer {...base} actions={actions}><p>Content</p></FileViewer>);
        expect(screen.getByRole('dialog', { name: 'report.pdf' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'More' })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
        expect(document.body.style.overflow).toBe('hidden');
        view.unmount();
        expect(document.body.style.overflow).toBe('');
        expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    });

    it('while viewing, Escape and Close leave the viewer', async () => {
        const onClose = vi.fn();
        render(<FileViewer {...base} onClose={onClose}><p>Content</p></FileViewer>);
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('while editing, Escape belongs to the editor; Done returns to viewing; the file actions give way', async () => {
        const onClose = vi.fn();
        const onDone = vi.fn();
        render(<FileViewer {...base} onClose={onClose} actions={actions} edit={{ label: 'Edit', icon: null, onEdit: vi.fn() }} editing={{ status: 'Saved 12:41', doneLabel: 'Done', onDone, onDirtyClose: vi.fn() }}><textarea aria-label="Editor" /></FileViewer>);
        screen.getByLabelText('Editor').focus();
        await userEvent.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Saved 12:41');
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('Close with unsaved changes asks first; with none it closes the whole viewer', async () => {
        const onClose = vi.fn();
        const onDirtyClose = vi.fn();
        const editing = { status: 'Unsaved changes', doneLabel: 'Done', onDone: vi.fn(), onDirtyClose };
        const view = render(<FileViewer {...base} onClose={onClose} editing={{ ...editing, dirty: true }}><p>Editor</p></FileViewer>);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onDirtyClose).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        view.rerender(<FileViewer {...base} onClose={onClose} editing={{ ...editing, dirty: false }}><p>Editor</p></FileViewer>);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('no Edit without the permission: absent, not disabled', () => {
        render(<FileViewer {...base}><p>Content</p></FileViewer>);
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('arrows move between files, not while a field uses them; each end of the list has no way on', async () => {
        const siblings = set();
        render(<FileViewer {...base} siblings={siblings}><input aria-label="Page" /></FileViewer>);
        await userEvent.keyboard('{ArrowRight}');
        expect(siblings.onNext).toHaveBeenCalledTimes(1);
        await userEvent.keyboard('{ArrowLeft}');
        expect(siblings.onPrevious).toHaveBeenCalledTimes(1);
        screen.getByLabelText('Page').focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(siblings.onNext).toHaveBeenCalledTimes(1);
        expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('the first file offers no previous', () => {
        const { onPrevious: _gone, ...first } = set();
        render(<FileViewer {...base} siblings={first}><p>Content</p></FileViewer>);
        expect(screen.queryByRole('button', { name: 'Previous file' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Next file' })).toBeInTheDocument();
    });

    it('a swipe moves between files; a short one, a scroll and a second finger do not', () => {
        const siblings = set();
        render(<FileViewer {...base} siblings={siblings}><p>Content</p></FileViewer>);
        const content = document.querySelector('.cms-viewer__content')!;
        const swipe = (from: number[], to: number[], fingers = 1) => {
            const touch = (at: number[]) => ({ clientX: at[0], clientY: at[1] });
            fireEvent.touchStart(content, { touches: Array.from({ length: fingers }, () => touch(from)) });
            fireEvent.touchEnd(content, { changedTouches: [touch(to)] });
        };
        swipe([200, 100], [100, 110]);
        expect(siblings.onNext).toHaveBeenCalledTimes(1);
        swipe([100, 100], [200, 100]);
        expect(siblings.onPrevious).toHaveBeenCalledTimes(1);
        swipe([200, 100], [170, 100]);
        swipe([200, 100], [100, 300]);
        swipe([200, 100], [100, 100], 2);
        expect(siblings.onNext).toHaveBeenCalledTimes(1);
    });

    it('Tab wraps within what is drawn: a control hidden at this width does not let focus out', () => {
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
            return (this.closest('.cms-viewer__more') !== null ? [] : [{}]) as unknown as DOMRectList;
        });
        render(<FileViewer {...base} actions={actions}><p>Content</p></FileViewer>);
        const last = screen.getAllByRole('button', { name: 'Open separately' })[0]!;
        last.focus();
        const notWrapped = !fireEvent.keyDown(last, { key: 'Tab' });
        expect(notWrapped).toBe(true);
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
        screen.getByRole('button', { name: 'Close' }).focus();
        fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(last);
    });

    it('a change of file is said politely', () => {
        const view = render(<FileViewer {...base} siblings={set()}><p>Content</p></FileViewer>);
        expect(screen.getByText('report.pdf, 2 of 3')).toHaveAttribute('role', 'status');
        view.rerender(<FileViewer {...base} name="next.pdf" siblings={set({ position: '3 of 3' })}><p>Content</p></FileViewer>);
        expect(screen.getByText('next.pdf, 3 of 3')).toHaveAttribute('role', 'status');
    });

    it('a single file says nothing of a set', () => {
        render(<FileViewer {...base}><p>Content</p></FileViewer>);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('an adapter that has taken the gesture keeps its swipe', () => {
        const siblings = set();
        render(<FileViewer {...base} siblings={siblings}><div data-viewer-gestures="" data-testid="picture">Picture</div></FileViewer>);
        const picture = screen.getByTestId('picture');
        fireEvent.touchStart(picture, { touches: [{ clientX: 200, clientY: 100 }] });
        fireEvent.touchEnd(picture, { changedTouches: [{ clientX: 100, clientY: 100 }] });
        expect(siblings.onNext).not.toHaveBeenCalled();
    });

    it('plus, minus and 0 zoom while viewing; not in a field, and not while editing', () => {
        const onZoom = vi.fn();
        const view = render(<FileViewer {...base} onZoom={onZoom}><input aria-label="Page" /></FileViewer>);
        const close = screen.getByRole('button', { name: 'Close' });
        fireEvent.keyDown(close, { key: '+' });
        fireEvent.keyDown(close, { key: '=' });
        fireEvent.keyDown(close, { key: '-' });
        fireEvent.keyDown(close, { key: '0' });
        expect(onZoom.mock.calls.map((call) => call[0])).toEqual(['in', 'in', 'out', 'reset']);
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Page' }), { key: '-' });
        expect(onZoom).toHaveBeenCalledTimes(4);
        view.rerender(<FileViewer {...base} onZoom={onZoom} editing={{ status: 'Saved', doneLabel: 'Done', onDone: vi.fn(), onDirtyClose: vi.fn() }}><p>Editor</p></FileViewer>);
        fireEvent.keyDown(screen.getByRole('button', { name: 'Close' }), { key: '+' });
        expect(onZoom).toHaveBeenCalledTimes(4);
    });

    it('the strip takes its own row above the viewer bar, not a place over the file', () => {
        render(<FileViewer {...base} siblings={set()} strip={<span>Files</span>} bar={<span>Bar</span>}><p>Content</p></FileViewer>);
        const strip = document.querySelector('.cms-viewer__strip')!;
        expect(strip.closest('.cms-viewer__content')).toBeNull();
        expect(strip.nextElementSibling).toBe(document.querySelector('.cms-viewer__bar'));
    });

    it('the menu holds the actions, and Escape closes it before the viewer', async () => {
        const onClose = vi.fn();
        const pick = vi.fn();
        render(<FileViewer {...base} onClose={onClose} actions={[{ label: 'Print', icon: null, onSelect: pick }]}><p>Content</p></FileViewer>);
        await userEvent.click(screen.getByRole('button', { name: 'More' }));
        expect(screen.getAllByRole('button', { name: 'Print' })).toHaveLength(2);
        await userEvent.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getAllByRole('button', { name: 'Print' })).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: 'More' }));
        await userEvent.click(screen.getAllByRole('button', { name: 'Print' })[1]!);
        expect(pick).toHaveBeenCalledTimes(1);
    });
});
