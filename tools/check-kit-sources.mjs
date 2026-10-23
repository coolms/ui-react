// check-kit-sources.mjs <kit.contract.json> -- is the kit's declaration true of its code?
//
// tools/check-kit.mjs asks whether the declaration covers the contract. A declaration is a claim, though: this asks
// whether every component it names as `implementedBy` is exported from src/index.ts, and whether every server state's
// `where` is a file in this repository that exports something. A declaration that names a component nobody wrote is a
// FOUND, never coverage. Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kitPath = resolve(process.argv[2] ?? 'kit.contract.json');
let kit;
let index;
try {
    kit = JSON.parse(readFileSync(kitPath, 'utf8'));
    index = readFileSync(join(root, 'src', 'index.ts'), 'utf8');
} catch (e) {
    console.log(`UNEVALUABLE: ${e.message}`);
    process.exit(2);
}
const exported = new Set();
for (const m of index.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const name of m[1].split(',')) {
        const n = name.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim();
        if (n) exported.add(n);
    }
}
const found = [];
for (const [name, { implementedBy }] of Object.entries(kit.components ?? {})) {
    if (!exported.has(implementedBy)) {
        found.push(`component ${name}: ${implementedBy} is not exported from src/index.ts`);
    }
}
for (const [id, { where }] of Object.entries(kit.serverStates ?? {})) {
    const path = join(root, where);
    if (!existsSync(path)) {
        found.push(`server state ${id}: ${where} does not exist`);
    } else if (!/\bexport\b/.test(readFileSync(path, 'utf8'))) {
        found.push(`server state ${id}: ${where} exports nothing`);
    }
}
if (found.length) {
    console.log(`FOUND: ${found.length} declaration(s) the code does not bear out`);
    for (const f of found) console.log(`  ${f}`);
    process.exit(1);
}
console.log(`CLEAR: ${Object.keys(kit.components ?? {}).length} component(s) exported and ${Object.keys(kit.serverStates ?? {}).length} server-state file(s) present, as ${kitPath.split('/').pop()} declares`);
