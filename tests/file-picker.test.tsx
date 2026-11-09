import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilePicker, FilePickerDenied, type FilePickerEntry, type FilePickerLabels, type FilePickerPage } from '../src';

const labels: FilePickerLabels = {
    title: 'Attach from Drive', close: 'Close', cancel: 'Cancel', confirm: (n) => `Attach ${String(n)} files`, space: 'Space', path: 'Folder', up: 'Up',
    files: 'Files', selected: (n) => `${String(n)} selected`, clear: 'Clear', remove: (name) => `Remove ${name}`, total: (n, size) => `${String(n)} files, ${size}`,
    left: (left, limit) => `${left} of ${limit} left after these`, overBudget: 'Too big for this message', loading: 'Reading', empty: 'Nothing here',
    error: 'Could not read the folder', retry: 'Retry', denied: 'You cannot open this folder',
};
const file = (id: string, size = 100): FilePickerEntry => ({ id, name: `${id}.pdf`, kind: 'file', size, mimeType: 'application/pdf' });
const folder = (name: string): FilePickerEntry => ({ id: `d-${name}`, name, kind: 'folder' });
const spaces = [{ id: 'mine', name: 'My Drive' }, { id: 'team', name: 'Team' }];
/** A drive: each folder of each space, by its path. */
function drive(folders: Record<string, FilePickerPage | Error>) {
    return vi.fn(async (space: string, path: string, cursor?: string): Promise<FilePickerPage> => {
        const page = folders[`${space}:${path}${cursor ? `#${cursor}` : ''}`];
        if (page === undefined) return { entries: [] };
        if (page instanceof Error) throw page;
        return page;
    });
}
const sizes = (bytes: number) => `${String(bytes)} B`;
const props = { open: true, spaces, formatSize: sizes, labels, onConfirm: vi.fn(), onCancel: vi.fn() };
const listbox = () => screen.getByRole('listbox', { name: 'Files' });

describe('FilePicker', () => {
    it('a dialog whose focus starts on the list; Enter opens a folder, Space ticks a file, Backspace goes up', async () => {
        const list = drive({ 'mine:': { entries: [folder('Reports'), file('a')] }, 'mine:Reports': { entries: [file('r1')] } });
        render(<FilePicker {...props} list={list} />);
        expect(screen.getByRole('dialog', { name: 'Attach from Drive' })).toBeInTheDocument();
        await screen.findByRole('option', { name: /a\.pdf/ });
        await waitFor(() => expect(listbox()).toHaveFocus());
        expect(listbox()).toHaveAttribute('aria-multiselectable', 'true');
        await userEvent.keyboard('{Enter}');
        await screen.findByRole('option', { name: /r1\.pdf/ });
        expect(within(screen.getByRole('navigation', { name: 'Folder' })).getByRole('button', { name: 'Reports' })).toHaveAttribute('aria-current', 'location');
        await userEvent.keyboard(' ');
        expect(screen.getByRole('option', { name: /r1\.pdf/ })).toHaveAttribute('aria-selected', 'true');
        await userEvent.keyboard('{Backspace}');
        await screen.findByRole('option', { name: /a\.pdf/ });
        expect(list).toHaveBeenCalledWith('mine', 'Reports');
    });

    it('keeps the selection across folders and spaces, counts all of it, and gives back where each was chosen', async () => {
        const onConfirm = vi.fn();
        const list = drive({ 'mine:': { entries: [folder('Reports'), file('a', 300)] }, 'mine:Reports': { entries: [file('r1', 200)] }, 'team:': { entries: [file('t1', 50)] } });
        render(<FilePicker {...props} list={list} onConfirm={onConfirm} />);
        await userEvent.click(await screen.findByRole('option', { name: /a\.pdf/ }));
        await userEvent.click(screen.getByRole('option', { name: /Reports/ }));
        await userEvent.click(await screen.findByRole('option', { name: /r1\.pdf/ }));
        await userEvent.selectOptions(screen.getByRole('combobox'), 'team');
        await userEvent.click(await screen.findByRole('option', { name: /t1\.pdf/ }));
        expect(screen.getByText('3 files, 550 B')).toBeInTheDocument();
        await userEvent.selectOptions(screen.getByRole('combobox'), 'mine');
        expect(await screen.findByRole('option', { name: /a\.pdf/ })).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(screen.getByRole('button', { name: 'Attach 3 files' }));
        expect(onConfirm).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'a', space: 'mine', path: '' }),
            expect.objectContaining({ id: 'r1', space: 'mine', path: 'Reports' }),
            expect.objectContaining({ id: 't1', space: 'team', path: '' }),
        ]);
    });

    it('lists the selection on its chip, where one can be removed or all cleared; Attach is disabled at none', async () => {
        const list = drive({ 'mine:': { entries: [file('a'), file('b')] } });
        render(<FilePicker {...props} list={list} />);
        expect(screen.getByRole('button', { name: 'Attach 0 files' })).toBeDisabled();
        await userEvent.click(await screen.findByRole('option', { name: /a\.pdf/ }));
        await userEvent.click(screen.getByRole('option', { name: /b\.pdf/ }));
        await userEvent.click(screen.getByRole('button', { name: '2 selected' }));
        await userEvent.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
        expect(screen.getByRole('option', { name: /a\.pdf/ })).toHaveAttribute('aria-selected', 'false');
        await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.getByRole('button', { name: 'Attach 0 files' })).toBeDisabled();
    });

    it('counts a budget here: what is left after the selection, and a file that would go over is disabled with that reason', async () => {
        const list = drive({ 'mine:': { entries: [file('small', 300), file('big', 800), file('own', 10)] } });
        const cost = (entry: FilePickerEntry) => Math.ceil((entry.size ?? 0) * 4 / 3);
        render(<FilePicker {...props} list={list} budget={{ usedBytes: 100, limitBytes: 1000, cost }} disabledReason={(e) => (e.id === 'own' ? 'Not readable' : null)} />);
        await screen.findByRole('option', { name: /small\.pdf/ });
        expect(screen.getByText('900 B of 1000 B left after these')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /big\.pdf/ })).toHaveAttribute('aria-disabled', 'true');
        expect(within(screen.getByRole('option', { name: /big\.pdf/ })).getByText('Too big for this message')).toBeInTheDocument();
        expect(within(screen.getByRole('option', { name: /own\.pdf/ })).getByText('Not readable')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('option', { name: /big\.pdf/ }));
        expect(screen.getByRole('option', { name: /big\.pdf/ })).toHaveAttribute('aria-selected', 'false');
        await userEvent.click(screen.getByRole('option', { name: /small\.pdf/ }));
        expect(screen.getByText('500 B of 1000 B left after these')).toBeInTheDocument();
    });

    it('a budget the selection already exceeds says so, and Attach is disabled', async () => {
        const list = drive({ 'mine:': { entries: [file('a', 300)] } });
        const view = render(<FilePicker {...props} list={list} budget={{ usedBytes: 0, limitBytes: 1000 }} />);
        await userEvent.click(await screen.findByRole('option', { name: /a\.pdf/ }));
        view.rerender(<FilePicker {...props} list={list} budget={{ usedBytes: 900, limitBytes: 1000 }} />);
        expect(screen.getByText('Too big for this message')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Attach 1 files' })).toBeDisabled();
    });

    it('a folder the person may not open is denied in place, the dialog staying open; a failure offers Retry; an empty one says so', async () => {
        let fail = true;
        const list = vi.fn(async (_space: string, path: string): Promise<FilePickerPage> => {
            if (path === 'Secret') throw new FilePickerDenied();
            if (path === 'Flaky' && fail) throw new Error('down');
            if (path === '') return { entries: [folder('Secret'), folder('Flaky'), folder('Empty')] };
            return { entries: path === 'Flaky' ? [file('ok')] : [] };
        });
        render(<FilePicker {...props} list={list} />);
        await userEvent.click(await screen.findByRole('option', { name: /Secret/ }));
        expect(await screen.findByText('You cannot open this folder')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Up' }));
        await userEvent.click(await screen.findByRole('option', { name: /Flaky/ }));
        expect(await screen.findByText('Could not read the folder')).toBeInTheDocument();
        fail = false;
        await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(await screen.findByRole('option', { name: /ok\.pdf/ })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Up' }));
        await userEvent.click(await screen.findByRole('option', { name: /Empty/ }));
        expect(await screen.findByText('Nothing here')).toBeInTheDocument();
    });

    it('asks for the next page as the keys reach the end, keeping what is shown', async () => {
        const list = drive({ 'mine:': { entries: [file('p1'), file('p2')], next: 'c2' }, 'mine:#c2': { entries: [file('p3')] } });
        render(<FilePicker {...props} list={list} />);
        await screen.findByRole('option', { name: /p1\.pdf/ });
        listbox().focus();
        await userEvent.keyboard('{End}');
        expect(await screen.findByRole('option', { name: /p3\.pdf/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /p1\.pdf/ })).toBeInTheDocument();
        expect(list).toHaveBeenCalledWith('mine', '', 'c2');
    });

    it('Escape and Cancel cancel', async () => {
        const onCancel = vi.fn();
        render(<FilePicker {...props} list={drive({})} onCancel={onCancel} />);
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await act(async () => undefined);
        await userEvent.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
