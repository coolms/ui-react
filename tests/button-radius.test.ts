import { describe, expect, it } from 'vitest';
import css from '../src/kit.css?raw';

/** Every class the kit puts on a <button> and styles in kit.css: each is a button in the contract's sense. */
const BUTTONS = [
    'cms-button',
    'cms-icon-button',
    'cms-section-header__more',
    'cms-screen__back',
    'cms-notification__chevron',
    'cms-server-switch',
    'cms-composer__send-round',
    'cms-call-button',
    'cms-call-bar__icon',
    'cms-signin-form__show',
    'cms-viewer__icon',
    'cms-viewer__button',
    'cms-viewer__side',
    'cms-file-picker__crumb',
    'cms-file-picker__chip',
    'cms-pane-toolbar__action',
    'cms-filter-menu',
];
/** Buttons that only ever carry .cms-button beside them: their corners come from it unless they set their own. */
const ON_A_BUTTON = ['cms-section-header__split', 'cms-screen__primary', 'cms-composer__send', 'cms-signin-form__submit', 'cms-notification__action'];
const CONTROL = 'var(--cms-radius-control)';

/** The stylesheet's rules, comments left out: each selector of a rule with its declarations. */
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head, body]) => ({
    selectors: (head ?? '').split(',').map((s) => s.trim()),
    radii: [...(body ?? '').matchAll(/(border(?:-[a-z]+)*-radius)\s*:\s*([^;]+);/g)].map(([, prop, value]) => ({ prop: prop!, value: value!.trim() })),
}));
/** The compound a selector styles: its last one, after any combinator. */
const subject = (selector: string) => selector.split(/\s*[>+~]\s*|\s+/).pop() ?? '';
const names = (compound: string, cls: string) => new RegExp(`\\.${cls}(?![\\w-])`).test(compound);

describe('one radius for every button', () => {
    it('each button the kit styles has its own rule with the control radius', () => {
        for (const cls of BUTTONS) {
            const own = rules.filter((r) => r.selectors.includes(`.${cls}`) && r.radii.some((d) => d.prop === 'border-radius'));
            expect(own.length, cls).toBeGreaterThan(0);
            for (const r of own) expect(r.radii.find((d) => d.prop === 'border-radius')?.value, cls).toBe(CONTROL);
        }
    });

    it('no rule gives a button another radius: only the split primary joins its menu half on square corners', () => {
        const found: string[] = [];
        for (const r of rules) {
            for (const selector of r.selectors) {
                const compound = subject(selector);
                if (![...BUTTONS, ...ON_A_BUTTON].some((cls) => names(compound, cls))) continue;
                for (const d of r.radii) {
                    const corner = d.prop !== 'border-radius';
                    // The split primary's inner corners, where its two halves meet.
                    const joined = corner && d.value === '0' && /cms-section-header__(primary--split > \.cms-button:first-child|split)$/.test(selector);
                    // The screen shell's floating primary: the contract draws it as a circle.
                    const floating = selector === '.cms-screen__primary' && d.prop === 'border-radius' && d.value === '50%';
                    if (d.value !== CONTROL && !joined && !floating) found.push(`${selector} { ${d.prop}: ${d.value} }`);
                }
            }
        }
        expect(found).toEqual([]);
    });

    it('the split primary keeps square inner corners on both halves', () => {
        expect(css).toMatch(/\.cms-section-header__primary--split > \.cms-button:first-child \{ border-start-end-radius: 0; border-end-end-radius: 0; \}/);
        expect(css).toMatch(/\.cms-section-header__split \{ border-start-start-radius: 0; border-end-start-radius: 0;/);
    });

    it('the call disc stays a circle: it is no button of its own', () => {
        expect(css).toMatch(/\.cms-call-button__disc \{[^}]*border-radius: 50%;/);
    });
});
