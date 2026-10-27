#!/usr/bin/env node
// check-css.mjs <file> -- is a token stylesheet CSS a browser keeps, block for block?
//
// A browser drops a rule whose selector it cannot read, silently, with every custom property in it: a `//` line --
// a comment in SCSS, not in CSS -- in front of `:root` cost a whole page its light theme. This reads the file the
// way the generator writes it and refuses anything else: comments only as /* ... */; rules only `:root` and
// `:root[data-theme='dark']`; inside them only `--cms-*: value;` declarations; at least one declaration in `:root`.
// Node built-ins only.
//
// Exit 0 CLEAR, 1 FOUND (with the line of the first fault), 2 UNEVALUABLE (the file could not be read).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SELECTORS = new Set([':root', ":root[data-theme='dark']"]);
const DECLARATION = /^--cms-[a-z0-9-]+\s*:\s*[^;{}]+$/;

/** The faults of a token stylesheet, each with its line; none for a sheet a browser keeps whole. */
export function faults(text) {
    const found = [];
    const lineOf = (index) => text.slice(0, index).split('\n').length;
    // Comments become spaces of the same length, so every index still points at its line.
    let source = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
    if (/\/\*/.test(source)) {
        found.push(`line ${lineOf(source.indexOf('/*'))}: a comment that never closes`);
        return found;
    }
    const rule = /\s*([^{}]*?)\s*\{([^{}]*)\}/y;
    let at = 0;
    let rootDeclarations = 0;
    while (at < source.length) {
        if (/^\s*$/.test(source.slice(at))) {
            break;
        }
        rule.lastIndex = at;
        const m = rule.exec(source);
        if (m === null) {
            found.push(`line ${lineOf(at + (source.slice(at).search(/\S/)))}: text outside a rule a browser keeps`);
            break;
        }
        const selector = m[1].replace(/\s+/g, ' ');
        if (!SELECTORS.has(selector)) {
            found.push(`line ${lineOf(m.index + m[0].indexOf(m[1]))}: selector "${selector.slice(0, 60)}" is not :root or :root[data-theme='dark']; a browser drops the whole block`);
        }
        const declarations = m[2].split(';').map((d) => d.trim()).filter((d) => d !== '');
        for (const declaration of declarations) {
            if (!DECLARATION.test(declaration)) {
                found.push(`line ${lineOf(m.index + m[0].indexOf(declaration))}: "${declaration.slice(0, 60)}" is not a --cms-* declaration`);
            }
        }
        if (selector === ':root') {
            rootDeclarations += declarations.length;
        }
        at = rule.lastIndex;
    }
    if (found.length === 0 && rootDeclarations === 0) {
        found.push('no --cms-* declaration in :root: the light theme would have no tokens');
    }
    return found;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const file = process.argv[2];
    let text;
    try {
        text = readFileSync(file, 'utf8');
    } catch (error) {
        console.log(`UNEVALUABLE -- ${file ?? '(no file given)'} could not be read: ${error.message}`);
        process.exit(2);
    }
    const found = faults(text);
    if (found.length) {
        console.log(`FOUND -- ${file}: ${found.length} fault(s)\n  ` + found.join('\n  '));
        process.exit(1);
    }
    console.log(`CLEAR -- ${file}: every block is kept by a browser`);
    process.exit(0);
}
