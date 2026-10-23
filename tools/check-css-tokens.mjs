// check-css-tokens.mjs -- does the kit's stylesheet use only tokens the token file defines?
//
// A var(--cms-name) the token file never defines is not an error anywhere: the browser falls back to the property's
// initial value and the component quietly loses its colour. This lists every --cms-* the stylesheet reads and fails
// on each one the token file does not define. Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheet = process.argv[2] ?? join(root, 'src', 'kit.css');
let css;
let tokens;
try {
    css = readFileSync(sheet, 'utf8');
    tokens = readFileSync(join(root, 'src', 'tokens', 'coolms-tokens.css'), 'utf8');
} catch (e) {
    console.log(`UNEVALUABLE: ${e.message}`);
    process.exit(2);
}
const defined = new Set([...tokens.matchAll(/(--cms-[a-z0-9-]+)\s*:/g)].map(m => m[1]));
const used = new Set([...css.matchAll(/var\(\s*(--cms-[a-z0-9-]+)/g)].map(m => m[1]));
if (defined.size === 0 || used.size === 0) {
    console.log(`UNEVALUABLE: ${defined.size} token(s) defined, ${used.size} read -- nothing to compare`);
    process.exit(2);
}
const missing = [...used].filter(t => !defined.has(t)).sort();
if (missing.length) {
    console.log(`FOUND: ${missing.length} of ${used.size} token(s) the stylesheet reads are not defined: ${missing.join(', ')}`);
    process.exit(1);
}
console.log(`CLEAR: all ${used.size} token(s) the stylesheet reads are defined (${defined.size} in the token file)`);
