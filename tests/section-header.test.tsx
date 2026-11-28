import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SectionHeader, type MenuItem } from '../src';

const offered = { offered: true, locked: false };
const item = (id: string, label: string, extra: Partial<MenuItem> = {}): MenuItem => ({ id, label, offer: offered, onSelect: vi.fn(), ...extra });

describe('SectionHeader', () => {
    it('row 1 holds the title, then the primary with its icon and label, then More; no row 2 without a context', () => {
        const compose = vi.fn();
        const { container } = render(
            <SectionHeader title="Mail" icon="mail" moreLabel="More actions" primary={{ label: 'Compose', icon: 'plus', onPress: compose }}
                more={[item('add-mailbox', 'Add mailbox')]} />,
        );
        const row = container.querySelector('[data-row="1"]') as HTMLElement;
        expect(within(row).getByRole('heading', { level: 1 })).toHaveTextContent('Mail');
        const primary = within(row).getByRole('button', { name: 'Compose' });
        expect(primary).toHaveClass('cms-button--primary');
        // A single other action is never a More of one: it is a button at the end of the row.
        expect([...row.querySelectorAll('[data-action]')].map(e => e.getAttribute('data-action'))).toEqual(['primary', 'add-mailbox']);
        expect(container.querySelector('[data-row="2"]')).toBeNull();
        primary.click();
        expect(compose).toHaveBeenCalledTimes(1);
    });

    it('More lists the other actions; a refused one stays, with the server\'s reason, and choosing one runs it', async () => {
        const add = item('add-mailbox', 'Add mailbox');
        render(
            <SectionHeader title="Mail" moreLabel="More actions" primary={{ label: 'Compose', icon: 'plus', onPress: vi.fn() }}
                more={[add, item('import', 'Import', { offer: { offered: true, locked: false, refusal: 'An import is running.' } })]} />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
        const menu = screen.getByRole('menu');
        expect(within(menu).getAllByRole('menuitem').map(m => m.textContent)).toEqual(['Add mailbox', expect.stringContaining('Import')]);
        expect(within(menu).getByText('An import is running.')).toBeInTheDocument();
        await userEvent.click(within(menu).getByRole('menuitem', { name: /Add mailbox/ }));
        expect(add.onSelect).toHaveBeenCalledTimes(1);
    });

    it('a refused primary stays in place, says its reason, and does nothing', async () => {
        const compose = vi.fn();
        render(<SectionHeader title="Mail" moreLabel="More actions"
            primary={{ label: 'Compose', icon: 'plus', onPress: compose, offer: { offered: true, locked: false, refusal: 'The mailbox needs a new sign-in.' } }} />);
        const primary = screen.getByRole('button', { name: 'Compose' });
        expect(primary).toHaveAttribute('aria-disabled', 'true');
        expect(primary).toHaveAccessibleDescription('The mailbox needs a new sign-in.');
        await userEvent.click(primary);
        expect(compose).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('a primary with entries is a split button whose menu lists them; the context is row 2; no divider line', async () => {
        const { container } = render(
            <SectionHeader title="Files" moreLabel="More actions" fullWidth context={<span>My Drive / Reports</span>}
                primary={{ label: 'Upload', icon: 'plus', onPress: vi.fn(), menu: [item('new-folder', 'New folder')], menuLabel: 'More ways to add' }} />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'More ways to add' }));
        expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: /New folder/ })).toBeInTheDocument();
        expect(container.querySelector('[data-row="2"]')).toHaveTextContent('My Drive / Reports');
        expect(container.querySelector('.cms-section-header')).toHaveClass('cms-section-header--full');
        for (const el of container.querySelectorAll('.cms-section-header, [data-row]')) {
            expect(getComputedStyle(el).borderBottomStyle === '' || getComputedStyle(el).borderBottomStyle === 'none').toBe(true);
        }
    });

    it('a primary whose menu has no entry to show is a plain button, with no menu half: no empty menu', async () => {
        const upload = vi.fn();
        const withMenu = (menu: readonly MenuItem[]) => (
            <SectionHeader title="Files" moreLabel="More actions"
                primary={{ label: 'Upload', icon: 'plus', onPress: upload, menu, menuLabel: 'More ways to add' }} />
        );
        const hiddenOnly = [item('new-folder', 'New folder', { offer: { offered: false, locked: false } })];
        for (const menu of [[], hiddenOnly]) {
            const { container, unmount } = render(withMenu(menu));
            expect(screen.queryByRole('button', { name: 'More ways to add' })).toBeNull();
            expect(container.querySelector('[aria-haspopup="menu"]')).toBeNull();
            expect(container.querySelector('.cms-section-header__primary')).not.toHaveClass('cms-section-header__primary--split');
            await userEvent.click(screen.getByRole('button', { name: 'Upload' }));
            expect(screen.queryByRole('menu')).toBeNull();
            unmount();
        }
        expect(upload).toHaveBeenCalledTimes(2);
    });

    it('a menu with a disabled entry still opens: the entry is shown, disabled with its reason, and the split stays', async () => {
        const { container } = render(
            <SectionHeader title="Files" moreLabel="More actions"
                primary={{ label: 'Upload', icon: 'plus', onPress: vi.fn(), menuLabel: 'More ways to add',
                    menu: [item('hidden', 'Hidden', { offer: { offered: false, locked: false } }),
                        item('new-folder', 'New folder', { offer: { offered: true, locked: false, refusal: 'This folder is read-only.' } })] }} />,
        );
        expect(container.querySelector('.cms-section-header__primary')).toHaveClass('cms-section-header__primary--split');
        await userEvent.click(screen.getByRole('button', { name: 'More ways to add' }));
        const entries = within(screen.getByRole('menu')).getAllByRole('menuitem');
        expect(entries).toHaveLength(1);
        expect(entries[0]).toHaveAttribute('aria-disabled', 'true');
        expect(entries[0]).toHaveAccessibleDescription('This folder is read-only.');
    });
});
