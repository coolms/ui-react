import { describe, expect, it } from 'vitest';
import raw from '../src/kit.css?raw';

/** The kit's stylesheet without its comments. */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

/** The rules outside every @media block, and the rules inside the fine-pointer hover query. */
function split(): { top: string; hover: string } {
    const marker = '@media (hover: hover) and (pointer: fine) {';
    let top = '';
    let hover = '';
    let i = 0;
    while (i < css.length) {
        const at = css.indexOf('@media', i);
        if (at < 0) { top += css.slice(i); break; }
        top += css.slice(i, at);
        let depth = 0;
        let j = css.indexOf('{', at);
        for (; j < css.length; j++) {
            if (css[j] === '{') depth++;
            if (css[j] === '}' && --depth === 0) break;
        }
        if (css.startsWith(marker, at)) hover += css.slice(at, j + 1);
        i = j + 1;
    }
    return { top, hover };
}

describe('list rows on a touch screen', () => {
    const { top, hover } = split();
    const rows = ['.cms-list__row', '.cms-mail-row', '.cms-notification__row', '.cms-icon-button', '.cms-screen__back', '.cms-chip', '.cms-pane-toolbar__action'];

    it('no row hovers outside the fine-pointer hover query', () => {
        for (const row of rows) expect(top, row).not.toMatch(new RegExp(`${row.replace('.', '\\.')}[^{]*:hover`));
    });

    it('the hover query tints each row and shows the mail row checkbox', () => {
        for (const row of rows.slice(0, 6)) expect(hover, row).toContain(`${row}:hover {`);
        expect(hover).toContain('.cms-pane-toolbar__action:hover > .cms-pane-toolbar__tip { display: block; }');
        expect(hover).toMatch(/\.cms-mail-row:hover \.cms-mail-row__check \{ opacity: 1; \}/);
    });

    it('the checkbox shows on keyboard focus, never on focus from a tap', () => {
        expect(css).not.toMatch(/\.cms-mail-row[^{]*:focus-within/);
        expect(top).toMatch(/\.cms-mail-row:is\([^)]*:has\(:focus-visible\)\)\s*\.cms-mail-row__check \{ opacity: 1; \}/);
    });

    it('outside hover, the checkbox shows only while selecting or checked', () => {
        const shown = [...top.matchAll(/([^{}]*)\.cms-mail-row__check \{ opacity: 1; \}/g)].map((m) => (m[1] ?? '').trim());
        expect(shown).toEqual(['.cms-mail-row:is(.is-selecting, .is-checked, :has(:focus-visible))']);
    });
});
