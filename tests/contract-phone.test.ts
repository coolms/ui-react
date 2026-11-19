import { describe, expect, it } from 'vitest';
import css from '../src/kit.css?raw';

/** The rules of one media query of the kit's stylesheet, by its exact condition, every block that has it. */
function under(condition: string): string {
    const blocks: string[] = [];
    let at = css.indexOf(`@media ${condition} {`);
    while (at >= 0) {
        let depth = 0;
        let end = at;
        for (; end < css.length; end += 1) {
            if (css[end] === '{') depth += 1;
            if (css[end] === '}' && --depth === 0) break;
        }
        blocks.push(css.slice(at, end + 1));
        at = css.indexOf(`@media ${condition} {`, end);
    }
    return blocks.join('\n');
}

// The contract's `phone` state of the file viewer, the file picker and the pane toolbar: what each draws below the
// tablet width (600px), and the touch-sized targets.
describe('phone', () => {
    const phone = under('(max-width: 599.98px)');
    const touch = under('(max-width: 1199.98px)');

    it('file-viewer: the top bar keeps its icons and a More menu, dots instead of the side arrows and the rails', () => {
        expect(phone).toMatch(/\.cms-viewer__position, \.cms-viewer__actions, \.cms-viewer__wide, \.cms-viewer__thumbnails, \.cms-viewer__side, \.cms-viewer__strip \{ display: none; \}/);
        expect(phone).toMatch(/\.cms-viewer__more \{ display: inline-flex; \}/);
        expect(phone).toMatch(/\.cms-viewer__dots \{ display: flex; \}/);
        expect(phone).toMatch(/\.cms-viewer__icon \{ width: var\(--cms-touch-target-min\); height: var\(--cms-touch-target-min\); \}/);
    });

    it('file-picker: the whole screen, touch-sized entries, the actions across the foot', () => {
        expect(phone).toMatch(/\.cms-modal\.cms-file-picker \{ width: 100%; height: 100%;/);
        expect(phone).toMatch(/\.cms-file-picker__entry, [^{]*\{ min-height: var\(--cms-touch-target-min\); \}/);
        expect(phone).toMatch(/\.cms-file-picker__actions \{ width: 100%; \}/);
    });

    it('pane-toolbar: every action at least a touch target, in the same row', () => {
        expect(touch).toMatch(/\.cms-pane-toolbar__action \{ min-height: var\(--cms-touch-target-min/);
        expect(touch).toMatch(/\.cms-pane-toolbar__action--bare, \.cms-pane-toolbar__more \{ min-width: var\(--cms-touch-target-min/);
    });
});
