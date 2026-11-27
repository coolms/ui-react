import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar, EmptyState, ErrorBanner, Loading, PageHeader, TabStrip, Toast, initialsOf, tintOf } from '../src';

describe('Toast', () => {
    it('an error is an alert; success and info are polite', () => {
        render(<><Toast kind="error" message="Not sent" /><Toast kind="success" message="Sent" /><Toast kind="info" message="Syncing" /></>);
        expect(screen.getByRole('alert')).toHaveTextContent('Not sent');
        expect(screen.getAllByRole('status').map(s => s.textContent)).toEqual(['Sent', 'Syncing']);
    });

    it('with-action: one follow-up', async () => {
        const onAction = vi.fn();
        render(<Toast kind="success" message="Archived" action={{ label: 'Undo', onAction }} />);
        await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(onAction).toHaveBeenCalledOnce();
    });
});

describe('Loading, EmptyState, ErrorBanner', () => {
    it('loading says what, inline or block', () => {
        render(<><Loading what="Loading messages" /><Loading what="Loading folders" layout="block" /></>);
        const [inline, block] = screen.getAllByRole('status');
        expect(inline).toHaveTextContent('Loading messages');
        expect(inline).toHaveClass('cms-loading--inline');
        expect(block).toHaveClass('cms-loading--block');
    });

    it('empty-state: why, and what to do', () => {
        render(<EmptyState title="No messages" hint="Messages you receive appear here." action={<button type="button">Compose</button>} />);
        expect(screen.getByText('Messages you receive appear here.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Compose' })).toBeInTheDocument();
    });

    it('error-banner offers retry only when given one', async () => {
        const onRetry = vi.fn();
        const { rerender } = render(<ErrorBanner message="The server did not answer." />);
        expect(screen.queryByRole('button')).toBeNull();
        rerender(<ErrorBanner message="The server did not answer." onRetry={onRetry} />);
        await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalledOnce();
    });
});

describe('PageHeader', () => {
    it('title, scope, actions and a back link', async () => {
        const onBack = vi.fn();
        render(<PageHeader title="Inbox" scope="Work mail" actions={<button type="button">Compose</button>} backLink={{ label: 'Mailboxes', onBack }} />);
        expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
        expect(screen.getByText('Work mail')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('link', { name: 'Mailboxes' }));
        expect(onBack).toHaveBeenCalledOnce();
    });
});

describe('TabStrip', () => {
    const tabs = [{ id: 'a', label: 'All', count: 12 }, { id: 'u', label: 'Unread', count: 3 }, { id: 's', label: 'Starred' }];

    it('active: selected and the only one in the tab order; with-count shows it', () => {
        render(<TabStrip label="Views" tabs={tabs} active="u" onSelect={() => undefined} />);
        const active = screen.getByRole('tab', { selected: true });
        expect(active).toHaveTextContent('Unread3');
        expect(active).toHaveAttribute('tabindex', '0');
        expect(screen.getAllByRole('tab').filter(t => t.getAttribute('tabindex') === '0')).toHaveLength(1);
    });

    it('arrow keys move and wrap', async () => {
        const onSelect = vi.fn();
        render(<TabStrip label="Views" tabs={tabs} active="s" onSelect={onSelect} />);
        screen.getByRole('tab', { selected: true }).focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onSelect).toHaveBeenLastCalledWith('a');
        await userEvent.keyboard('{End}');
        expect(onSelect).toHaveBeenLastCalledWith('s');
    });
});

describe('Avatar', () => {
    it('initials from the first and last word', () => {
        expect(initialsOf('Ada Lovelace')).toBe('AL');
        expect(initialsOf('  ada  ')).toBe('A');
        expect(initialsOf('Jean Paul Sartre')).toBe('JS');
        expect(initialsOf('')).toBe('');
        // A trailing "via <service>" names the sender's go-between, not the sender.
        expect(initialsOf('Valentina Zagnetova via LinkedIn')).toBe('VZ');
        expect(initialsOf("'Anna Kowalska' via Partners")).toBe('AK');
        // Only a lowercase "via" with something after it: a name with "Via" in it, or ending in the word, keeps it.
        expect(initialsOf('Maria Via Rossi')).toBe('MR');
        expect(initialsOf('Via Rossi')).toBe('VR');
        expect(initialsOf('Olga via')).toBe('OV');
    });

    it('with no letter to show, "?": no name, a blank one, or signs only; its tint from the seed when given', () => {
        render(<><Avatar name="" /><Avatar name="   " presence="online" /><Avatar name="--" /><Avatar name="Ada" tintSeed="u-1" /><Avatar name="Bo" tintSeed="u-1" /></>);
        const marks = screen.getAllByRole('img');
        expect(marks.slice(0, 3).map((mark) => mark.textContent)).toEqual(['?', '?', '?']);
        expect(marks[0]).toHaveAccessibleName('?');
        expect(marks[1]).toHaveAccessibleName('?, online');
        const tint = (mark: HTMLElement) => [...mark.classList].find((name) => name.startsWith('cms-avatar--tint-'));
        expect(tint(marks[3]!)).toBe(tint(marks[4]!));
        expect(tint(marks[3]!)).toBe(`cms-avatar--tint-${String(tintOf('u-1'))}`);
    });

    it("a person with no name is named by the host's label: it shows \"?\", and says the label with any state; a deleted account the same", () => {
        render(<><Avatar name="" unnamedLabel="No name" /><Avatar name="  " unnamedLabel="No name" presence="away" /><Avatar name="" unnamedLabel="No name" deleted /><Avatar name="Ada" unnamedLabel="No name" /><Avatar name="" unnamedLabel="  " /></>);
        const marks = screen.getAllByRole('img');
        expect(marks[0]).toHaveAccessibleName('No name');
        expect(marks[0]).toHaveTextContent('?');
        expect(marks[1]).toHaveAccessibleName('No name, away');
        expect(marks[2]).toHaveAccessibleName('No name');
        expect(marks[2]).toHaveClass('cms-avatar--deleted');
        // A name given is said as it is; a blank label is no label.
        expect(marks[3]).toHaveAccessibleName('Ada');
        expect(marks[4]).toHaveAccessibleName('?');
    });

    it('picture, initials, presence', () => {
        render(<><Avatar name="Ada Lovelace" pictureUrl="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /><Avatar name="Bo Ek" presence="away" /></>);
        expect(screen.getByRole('img', { name: 'Ada Lovelace' }).querySelector('img')).not.toBeNull();
        const bo = screen.getByRole('img', { name: 'Bo Ek, away' });
        expect(bo).toHaveTextContent('BE');
        expect(bo.querySelector('.cms-avatar__presence')).toHaveClass('is-away');
    });
});
