import { describe, expect, it } from 'vitest';
import css from '../src/kit.css?raw';
import tokens from '../src/tokens/coolms-tokens.css?raw';

/** The declarations of the kit's top-level rule for one selector. */
function rule(selector: string): string {
    const at = css.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf('}', at));
}

// The contract's button, text-field and select name their height: --cms-control-height-md, which the tokens make 44px
// on a touch screen. A control's height is never a spacing token, and never set again by the window's width.
describe('control heights', () => {
    it('the button, the text field and the select are the md control height', () => {
        expect(rule('.cms-button')).toMatch(/min-height: var\(--cms-control-height-md\);/);
        // The select and the text area are drawn as .cms-input too.
        expect(rule('.cms-input')).toMatch(/min-height: var\(--cms-control-height-md\);/);
    });

    it('the tokens make md 40px with a mouse and 44px on a coarse pointer', () => {
        expect(tokens).toMatch(/--cms-control-height-md: 40px;/);
        expect(tokens).toMatch(/@media \(pointer: coarse\) \{\s*:root \{\s*--cms-control-height-md: 44px;/);
    });

    it('no width-based rule sets a button\'s height again, and no control height is a spacing token', () => {
        const byWidth = css.match(/@media \(max-width: [\d.]+px\) \{[\s\S]*?\n\}/g) ?? [];
        for (const block of byWidth) expect(block).not.toMatch(/(^|[\s,])\.cms-button[\s,][^{]*\{[^}]*min-height/);
        expect(css).not.toMatch(/(min-)?height: var\(--cms-space-/);
    });
});
