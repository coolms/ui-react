import { describe, expect, it } from 'vitest';
import { dashProblem, judge, textsOfTsx } from '../tools/check-ui-text.mjs';

describe('no dash as a separator', () => {
    it('finds an em dash, a "--", a hyphen with a space beside it, and an en dash that is not a range', () => {
        expect(dashProblem('Mail — Inbox')).toBe('an em dash');
        expect(dashProblem('Mail—Inbox')).toBe('an em dash');
        expect(dashProblem('Mail -- Inbox')).toBe('a "--"');
        expect(dashProblem('Mail - Inbox')).toBe('a hyphen with a space beside it');
        expect(dashProblem('- Inbox')).toBe('a hyphen with a space beside it');
        expect(dashProblem('Mail – Inbox')).toBe('an en dash that is not a range');
        expect(dashProblem('{first} – {last}')).toBe('an en dash that is not a range');
    });

    it('passes a range, a hyphen inside a word, and text with no dash', () => {
        for (const text of ['Pages 1–5', 'Mon–Fri', '{start}–{end}', 'Sign-in, e-mail and read-only', 'Saved. It opens later.']) expect(dashProblem(text)).toBeNull();
    });
});

describe('what is read', () => {
    it('JSX text and the static strings of the attributes a person reads', () => {
        const texts = textsOfTsx(`export const A = () => <div title="One — two" aria-label="Close" emptyLabel="None" data-x="a - b" className="x -- y">
            Read   this
            <Field placeholder={'Type -- here'} hint={'not read'} label={\`Plain\`} />
        </div>;`);
        expect(texts).toEqual(['One — two', 'Close', 'None', 'Read this', 'Type -- here', 'Plain']);
    });

    it('the kit\'s default words: each value of an exported ..._LABELS set, a template\'s values read as {}', () => {
        const texts = textsOfTsx(`export const CALL_LABELS = { hangUp: 'Hang up \u2014 now', name: (who: string) => \`Call \${who} -- now\`, max: 3 };
            const OTHER = { a: 'not read -- here' };`);
        expect(texts).toEqual(['Hang up \u2014 now', 'Call {} -- now']);
    });

    it('never code, CSS or comments: an expression, a style, a class name or a comment are not text', () => {
        const texts = textsOfTsx(`// a - b -- c — d
            const gap = 'var(--cms-space-4)';
            export const A = () => <div style={{ margin: 'calc(1px - 2px)' }} title={gap}>{n - 1} {'a -- b'}</div>;`);
        expect(texts).toEqual([]);
    });
});

describe('the list may only shrink', () => {
    const entry = 'src/A.tsx\tOne — two';

    it('a breaking text not on the list is found, naming where', () => {
        expect(judge([entry], [], null)).toEqual([expect.stringContaining('src/A.tsx: One — two: uses a dash as a separator (an em dash)')]);
    });

    it('a listed text that no longer breaks, or is gone, is found as stale', () => {
        expect(judge([], [entry], null)).toEqual([expect.stringContaining('stale entry')]);
    });

    it('with a base, an entry not on the base\'s list is found as added; a base with no list passes', () => {
        expect(judge([entry], [entry], [])).toEqual([expect.stringContaining('added since the base')]);
        expect(judge([entry], [entry], [entry])).toEqual([]);
        expect(judge([entry], [entry], null)).toEqual([]);
    });
});
