// check-built.mjs -- does the BUILT package load, and export what the kit declares?
//
// The tests and the typecheck read src/. What a consumer installs is dist/, and only this reads it: it imports
// dist/index.js as an application would, and fails on every component kit.contract.json names that the built module
// does not export as a function, and on every declaration file the exports map promises that is not there.
// Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE (no build to read).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'dist', 'index.js');
if (!existsSync(entry)) {
    console.log('UNEVALUABLE: dist/index.js does not exist -- run the build first');
    process.exit(2);
}
let built;
let kit;
let pkg;
try {
    built = await import(pathToFileURL(entry).href);
    kit = JSON.parse(readFileSync(join(root, 'kit.contract.json'), 'utf8'));
    pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
} catch (e) {
    console.log(`UNEVALUABLE: ${e.message}`);
    process.exit(2);
}
const found = [];
for (const [name, { implementedBy }] of Object.entries(kit.components ?? {})) {
    if (typeof built[implementedBy] !== 'function') {
        found.push(`component ${name}: ${implementedBy} is not a function export of dist/index.js`);
    }
}
for (const [path, target] of Object.entries(pkg.exports ?? {})) {
    for (const file of typeof target === 'string' ? [target] : Object.values(target)) {
        if (!existsSync(join(root, file))) {
            found.push(`exports["${path}"]: ${file} does not exist`);
        }
    }
}
if (found.length) {
    console.log(`FOUND: ${found.length} promise(s) the build does not keep`);
    for (const f of found) console.log(`  ${f}`);
    process.exit(1);
}
console.log(`CLEAR: dist/index.js loads and exports all ${Object.keys(kit.components).length} declared component(s); every exports target exists`);
