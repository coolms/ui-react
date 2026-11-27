// check-ui-text.mjs -- no dash as a separator in the text a person reads here, ratcheted.
//
//     node tools/check-ui-text.mjs [--base <ref>] [--write-baseline]
//
// Read: in every .tsx under src/, the text a person reads: JSX text, a static string given to an attribute a person
// reads (title, label, placeholder, alt, aria-label, and any attribute named ...Label, ...Title, ...Text, ...Hint, ...Help
// or ...Description), and the kit's default words, the string values of each exported ..._LABELS set (a template's
// values read as {}). Code, CSS, comments and other expressions are never read, so `--cms-space-4` or `a - b` cannot
// trip it.
//
// Rule, per text: an em dash anywhere; "--" anywhere; a hyphen with a space on either side; an en dash unless both its
// neighbours are not spaces (a range: 1–5, Mon–Fri). A text says it with two short sentences, a comma or a colon.
//
// Grandfathered: tools/check-ui-text.baseline.json, a sorted JSON array of "path<TAB>text" (path relative to the repo),
// written with --write-baseline. It may only shrink: a breaking text not on it is FOUND; an entry whose text no longer
// breaks or no longer exists is FOUND as stale (remove it); with --base <ref>, an entry not on the base's list is FOUND
// as added. A base with no list yet is where the list begins and passes; a base that cannot be read is UNEVALUABLE.
// Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE. The same rule and list as theme-admin's and theme-workspace's.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LABELS = /^[A-Z][A-Z_]*_LABELS$/;
const BASELINE = 'tools/check-ui-text.baseline.json';
const READ_ATTRIBUTES = new Set(['title', 'label', 'placeholder', 'alt', 'aria-label']);
const READ_SUFFIX = /(Label|Title|Text|Hint|Help|Description)$/;

/** Why a text breaks the rule, or null. */
export function dashProblem(text) {
    if (text.includes('—')) return 'an em dash';
    if (text.includes('--')) return 'a "--"';
    if (/\s-\s|^-\s|\s-$/.test(text)) return 'a hyphen with a space beside it';
    for (const m of text.matchAll(/–/g)) {
        const before = text[m.index - 1];
        const after = text[m.index + 1];
        if (before === undefined || after === undefined || /\s/.test(before) || /\s/.test(after)) return 'an en dash that is not a range';
    }
    return null;
}

/** A string or template's words: a template's values read as {}. */
function words(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => `{}${span.literal.text}`).join('');
    return null;
}

/** The texts a person reads in one .tsx source: JSX text, static strings of the attributes a person reads, and the
 * string values of an exported ..._LABELS set. */
export function textsOfTsx(source, fileName = 'x.tsx') {
    const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const texts = [];
    const visit = (node) => {
        if (ts.isJsxText(node)) {
            const text = node.text.replace(/\s+/g, ' ').trim();
            if (text !== '') texts.push(text);
        } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && LABELS.test(node.name.text) && node.initializer !== undefined) {
            const read = (value) => {
                const text = words(value);
                if (text !== null && text.trim() !== '') texts.push(text);
                else ts.forEachChild(value, read);
            };
            read(node.initializer);
            return;
        } else if (ts.isJsxAttribute(node) && node.initializer !== undefined) {
            const name = node.name.getText(file);
            if (READ_ATTRIBUTES.has(name) || READ_SUFFIX.test(name)) {
                let init = node.initializer;
                if (ts.isJsxExpression(init) && init.expression !== undefined) init = init.expression;
                if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) texts.push(init.text);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return texts;
}

/** Every "path<TAB>text" here that breaks the rule. */
export function breaking(root = web) {
    const found = new Set();
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.tsx') && !/\.test\.tsx$/.test(entry.name)) {
                const rel = path.relative(root, full).split(path.sep).join('/');
                for (const text of textsOfTsx(fs.readFileSync(full, 'utf8'), full)) if (dashProblem(text) !== null) found.add(`${rel}\t${text}`);
            }
        }
    };
    walk(path.join(root, 'src'));
    return [...found].sort();
}

/**
 * The ratchet's findings: what breaks and is not listed, what is listed and no longer breaks (stale), and with a base's
 * list (null: the base has none yet), what is listed and was not on the base's.
 */
export function judge(now, listed, baseList) {
    const findings = [];
    const kept = new Set(listed);
    for (const entry of now) if (!kept.has(entry)) findings.push(`${entry.replace('\t', ': ')}: uses a dash as a separator (${dashProblem(entry.split('\t').slice(1).join('\t'))}): write two sentences, a comma or a colon; an en dash only in a range`);
    const current = new Set(now);
    for (const entry of listed) if (!current.has(entry)) findings.push(`${BASELINE}: stale entry, the text no longer breaks the rule or is gone, remove it: ${entry.replace('\t', ': ')}`);
    if (baseList !== null && baseList !== undefined) {
        const before = new Set(baseList);
        for (const entry of listed) if (!before.has(entry)) findings.push(`${BASELINE}: added since the base, the list may only shrink: ${entry.replace('\t', ': ')}`);
    }
    return findings;
}

function main(argv) {
    const at = argv.indexOf('--base');
    const base = at === -1 ? null : argv[at + 1];
    const now = breaking();
    if (argv.includes('--write-baseline')) {
        fs.writeFileSync(path.join(web, BASELINE), `${JSON.stringify(now, null, 2)}\n`);
        console.log(`ui text: wrote ${BASELINE} with ${String(now.length)} entr${now.length === 1 ? 'y' : 'ies'}`);
        return 0;
    }
    let listed;
    try {
        listed = JSON.parse(fs.readFileSync(path.join(web, BASELINE), 'utf8'));
    } catch (error) {
        console.log(`ui text UNEVALUABLE: ${BASELINE} cannot be read: ${error.message}`);
        return 2;
    }
    let baseList = null;
    if (base !== null) {
        try {
            const exists = execFileSync('git', ['-C', web, 'ls-tree', '--name-only', base, BASELINE], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
            if (exists !== '') baseList = (JSON.parse(execFileSync('git', ['-C', web, 'show', `${base}:${BASELINE}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })));
        } catch (error) {
            console.log(`ui text UNEVALUABLE: the base ${base} cannot be read: ${String(error.message).split('\n')[0]}`);
            return 2;
        }
        if (baseList === null) console.log(`ui text: ${base} has no list yet: the list begins here`);
    }
    const findings = judge(now, listed, baseList);
    for (const finding of findings) console.log(finding);
    const verdict = findings.length === 0 ? 'CLEAR' : 'FOUND';
    console.log(`ui text ${verdict}: ${String(findings.length)} finding(s); ${String(now.length)} grandfathered text(s) break the rule, ${String(listed.length)} on the list`);
    return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
