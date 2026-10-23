#!/usr/bin/env node
// check-kit.mjs <kit.contract.json> -- does a UI kit (or a client) cover the contract?
//
// The contract is contract/components.json (every component, and the states each must render) and
// contract/server-states.json (every server-decided state, and the reactions every client gives). A kit declares, in
// its kit.contract.json, which of its components implements each entry and which states it renders, and where it
// implements each server state's reactions:
//
//   { "kit": "@coolms/ui-react",
//     "components": { "button": { "implementedBy": "Button", "states": ["default", ...] }, ... },
//     "serverStates": { "capability": { "where": "src/server/capability.ts" }, ... },
//     "notOffered": { "elevation-required": "this kit's clients never elevate" } }
//
// `notOffered` names a component the kit does not provide ON PURPOSE, with the reason; it is not a gap.
// Answers CLEAR (exit 0), FOUND naming each gap (exit 1), or UNEVALUABLE when a file cannot be read (exit 2): a
// kit that could not be read is never reported as one that covers the contract.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path, what) => {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        console.log(`UNEVALUABLE: ${what} could not be read (${path}): ${e.message}`);
        process.exit(2);
    }
};

const kitPath = process.argv[2];
if (!kitPath) {
    console.log('UNEVALUABLE: usage: check-kit.mjs <kit.contract.json>');
    process.exit(2);
}
const components = read(resolve(root, 'contract/components.json'), 'the components contract').components;
const serverStates = read(resolve(root, 'contract/server-states.json'), 'the server-states contract').states;
const kit = read(kitPath, 'the kit\'s declaration');

const gaps = [];
const notOffered = kit.notOffered ?? {};
for (const [name, spec] of Object.entries(components)) {
    if (name in notOffered) {
        continue;
    }
    const mine = kit.components?.[name];
    if (!mine?.implementedBy) {
        gaps.push(`component ${name}: not provided`);
        continue;
    }
    for (const state of spec.states) {
        if (!(mine.states ?? []).includes(state)) {
            gaps.push(`component ${name} (${mine.implementedBy}): state "${state}" not rendered`);
        }
    }
}
for (const state of serverStates) {
    if (!kit.serverStates?.[state.id]?.where) {
        gaps.push(`server state ${state.id} (${state.state}): no reaction declared`);
    }
}
for (const name of Object.keys(kit.components ?? {})) {
    if (!(name in components)) {
        gaps.push(`component ${name}: declared by the kit but not in the contract (add it to the contract, or rename it)`);
    }
}

const total = Object.keys(components).length - Object.keys(notOffered).filter(n => n in components).length + serverStates.length;
if (gaps.length > 0) {
    console.log(`FOUND: ${kit.kit ?? kitPath}: ${gaps.length} gap(s) against the contract (${total} entries)`);
    gaps.forEach(g => console.log(`  ${g}`));
    process.exit(1);
}
console.log(`CLEAR: ${kit.kit ?? kitPath} covers every entry of the contract (${total} entries; ${Object.keys(notOffered).length} not offered, each with its reason)`);
