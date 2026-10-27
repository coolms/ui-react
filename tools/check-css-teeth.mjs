// check-css-teeth.mjs -- does the token stylesheet check still fail what it must?
//
// tools/check-css.mjs (copied from coolms/design-tokens, pinned by the lock) passes the kit's token file. A check that
// passes everything passes that too, so this runs it on tests/fixtures/broken-tokens.css, a `//` header in front of
// :root, which must exit 1, and on a file that does not exist, which must exit 2. Exit 0 CLEAR, 1 FOUND.
import { spawnSync } from 'node:child_process';

const cases = [
    ['tests/fixtures/broken-tokens.css', 1, 'a // header'],
    ['tests/fixtures/no-such-file.css', 2, 'no file'],
];
const found = [];
for (const [file, expected, what] of cases) {
    const run = spawnSync(process.execPath, ['tools/check-css.mjs', file], { encoding: 'utf8' });
    if (run.status !== expected) {
        found.push(`${what}: expected exit ${expected}, got ${run.status}`);
    }
}
if (found.length) {
    console.log('FOUND -- the token stylesheet check lost its teeth: ' + found.join('; '));
    process.exit(1);
}
console.log('CLEAR -- the token stylesheet check fails a // header (1) and a missing file (2)');
