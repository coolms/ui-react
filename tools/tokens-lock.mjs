// tokens-lock.mjs -- are the files this kit copies from coolms/design-tokens (the token file, the UI contract and its
// checker) the ones design-tokens.lock.json names?
//
// The kit copies these files at a tag (no build-time fetch); the lock names the tag, the commit and each
// file's sha256. A copy edited by hand, or left behind by a bump of the lock, answers FOUND. Exit 0 CLEAR, 1 FOUND,
// 2 UNEVALUABLE (a file could not be read).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let lock;
try {
    lock = JSON.parse(readFileSync(join(root, 'design-tokens.lock.json'), 'utf8'));
} catch (e) {
    console.log(`UNEVALUABLE: design-tokens.lock.json could not be read: ${e.message}`);
    process.exit(2);
}
let found = 0;
for (const [from, { to, sha256 }] of Object.entries(lock.files ?? {})) {
    let actual;
    try {
        actual = createHash('sha256').update(readFileSync(join(root, to))).digest('hex');
    } catch (e) {
        console.log(`UNEVALUABLE: ${to} could not be read: ${e.message}`);
        process.exit(2);
    }
    if (actual !== sha256) {
        console.log(`FOUND: ${to} is not ${lock.repository}@${lock.tag}:${from} (sha256 ${actual.slice(0, 12)}, the lock says ${sha256.slice(0, 12)})`);
        found++;
    }
}
if (found === 0) {
    console.log(`CLEAR: ${Object.keys(lock.files ?? {}).length} pinned file(s) are ${lock.repository}@${lock.tag} (${lock.commit.slice(0, 12)})`);
}
process.exit(found ? 1 : 0);
