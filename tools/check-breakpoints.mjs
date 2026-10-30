// check-breakpoints.mjs -- are the widths in the kit's media queries the layout's tokens?
//
// A custom property cannot be read in a media query, so src/kit.css writes the breakpoints as numbers. This reads
// --cms-breakpoint-tablet and --cms-breakpoint-desktop from the token file and every width in the stylesheet's media
// queries: a min-width must be a breakpoint, a max-width a breakpoint less 0.02px (the width just below it). Any
// other width is FOUND, and a breakpoint the stylesheet never uses is FOUND too, so the two cannot drift apart.
// Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => {
    try {
        return readFileSync(join(here, file), 'utf8');
    } catch (e) {
        console.log(`UNEVALUABLE: ${file} could not be read: ${String(e.message)}`);
        process.exit(2);
    }
};

const tokens = read('src/tokens/coolms-tokens.css');
const kit = read('src/kit.css');

const breakpoints = {};
for (const name of ['tablet', 'desktop']) {
    const found = new RegExp(`--cms-breakpoint-${name}:\\s*(\\d+)px`).exec(tokens);
    if (!found) {
        console.log(`UNEVALUABLE: --cms-breakpoint-${name} is not in the token file`);
        process.exit(2);
    }
    breakpoints[name] = Number(found[1]);
}

const found = [];
const used = new Set();
for (const m of kit.matchAll(/@media[^{]*?\((min|max)-width:\s*([\d.]+)px\)/g)) {
    const [, kind, raw] = m;
    const width = Number(raw);
    const match = Object.entries(breakpoints).find(([, b]) => (kind === 'min' ? width === b : Math.abs(width - (b - 0.02)) < 1e-9));
    if (match) used.add(match[0]);
    else found.push(`(${kind}-width: ${raw}px) is no breakpoint token (tablet ${String(breakpoints.tablet)}px, desktop ${String(breakpoints.desktop)}px)`);
}
for (const name of Object.keys(breakpoints)) {
    if (!used.has(name)) found.push(`--cms-breakpoint-${name} is used by no media query`);
}

if (found.length > 0) {
    console.log(`FOUND: ${String(found.length)}`);
    for (const f of found) console.log(`  ${f}`);
    process.exit(1);
}
console.log(`CLEAR: every media query width is a breakpoint token (tablet ${String(breakpoints.tablet)}px, desktop ${String(breakpoints.desktop)}px)`);
