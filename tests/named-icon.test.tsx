import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import icons from '../contract/icons.json';
import { BOOTSTRAP_ICONS, ICON_NAMES, NamedIcon, iconForName } from '../src';

describe('the server\'s icon names', () => {
    afterEach(() => vi.restoreAllMocks());

    it('the folder menu\'s and the image bar\'s names each have the kit\'s icon', () => {
        expect(iconForName('pencil')).toBe('pencil');
        expect(iconForName('trash3')).toBe('trash');
        expect(iconForName('folder-plus')).toBe('folder-plus');
        expect(iconForName('folder-x')).toBe('folder-x');
        expect(iconForName('folder-symlink')).toBe('folder');
        expect(iconForName('envelope-open')).toBe('mail-open');
        expect(iconForName('image')).toBe('image');
        expect(iconForName('person-check')).toBe('user-check');
        expect(iconForName('person-x')).toBe('user-x');
        // The empty panes': an empty folder, no conversation open.
        expect(iconForName('folder2-open')).toBe('folder');
        expect(iconForName('chat-dots')).toBe('chat');
    });

    it('every name the contract lists for the Workspace has the kit\'s icon', () => {
        const listed = Object.entries((icons as { readonly icons: Readonly<Record<string, { readonly interfaces: readonly string[] }>> }).icons)
            .filter(([, entry]) => entry.interfaces.includes('workspace'))
            .map(([name]) => name);
        expect(listed.length).toBeGreaterThan(0);
        expect(listed.filter((name) => iconForName(name) === null)).toEqual([]);
    });

    it('every name in the table is one the kit draws', () => {
        for (const icon of Object.values(BOOTSTRAP_ICONS)) expect(ICON_NAMES).toContain(icon);
    });

    it('a known name draws its icon at the row\'s size', () => {
        const { container } = render(<NamedIcon name="folder-plus" />);
        const svg = container.querySelector('svg.cms-icon')!;
        expect(svg).toHaveAttribute('width', '18');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('an unknown name keeps the icon\'s space, so labels line up, and says so once outside production', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { container } = render(<><NamedIcon name="unheard-of" size={20} /><NamedIcon name="unheard-of" /></>);
        const blanks = container.querySelectorAll<HTMLElement>('.cms-icon--blank');
        expect(blanks).toHaveLength(2);
        expect(blanks[0]!.style.width).toBe('20px');
        expect(blanks[0]!.style.height).toBe('20px');
        expect(blanks[0]).toHaveAttribute('aria-hidden', 'true');
        expect(container.querySelector('svg')).toBeNull();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('"unheard-of"');
    });

    it('a host with no process at all draws the blank and does not throw or warn', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.stubGlobal('process', undefined);
        try {
            const { container } = render(<NamedIcon name="unheard-of-without-process" />);
            expect(container.querySelector('.cms-icon--blank')).not.toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
        expect(warn).not.toHaveBeenCalled();
    });

    it('no name draws nothing', () => {
        const { container } = render(<NamedIcon name="" />);
        expect(container.firstChild).toBeNull();
    });
});
