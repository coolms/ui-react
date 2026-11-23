#!/usr/bin/env node
// The built package as a consumer's TypeScript reads it: an ESM project ("type": "module") with
// module and moduleResolution "nodenext", the library's own declarations checked (skipLibCheck off),
// importing @coolms/ui-react from a node_modules link to this checkout, with the issue's repro (#53) as the
// consumer. Every declaration must resolve
// (a relative import without its extension does not, under nodenext), and no export may come through
// as `any`, which is what an unresolved declaration turns into.
//
//   node tools/check-types-resolution.mjs        after `npm run build`
//
// Exit: 0 CLEAR; 1 FOUND -- tsc reports an error, or an export is `any`; 2 UNEVALUABLE -- no build,
// or tsc could not be run.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'dist', 'index.d.ts'))) {
    console.log('UNEVALUABLE: no dist/index.d.ts -- run npm run build first');
    process.exit(2);
}
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
if (!existsSync(tsc)) {
    console.log('UNEVALUABLE: no TypeScript in node_modules -- run npm ci first');
    process.exit(2);
}
const work = mkdtempSync(join(root, '.types-resolution-'));
try {
    const link = (name, target) => {
        mkdirSync(dirname(join(work, 'node_modules', name)), { recursive: true });
        symlinkSync(target, join(work, 'node_modules', name), 'dir');
    };
    link('@coolms/ui-react', root);
    for (const name of ['react', 'react-dom', '@types/react', '@types/react-dom']) {
        if (existsSync(join(root, 'node_modules', name))) link(name, join(root, 'node_modules', name));
    }
    writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'types-resolution', private: true, type: 'module' }));
    writeFileSync(join(work, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
            module: 'nodenext', moduleResolution: 'nodenext', jsx: 'react-jsx', strict: true, noEmit: true,
            skipLibCheck: false, types: [],
        },
        files: ['consumer.tsx'],
    }));
    // The issue's own repro (#53): Button is a component, never a symbol, so the expect-error holds only while it is
    // typed; TextField's onChange value must be typed, or strict mode refuses it (TS7006). Then every export, and the
    // names of any that come through as `any`: none may.
    writeFileSync(join(work, 'consumer.tsx'), [
        "import { Button, TextField } from '@coolms/ui-react';",
        "import * as kit from '@coolms/ui-react';",
        '// @ts-expect-error -- a component is not a symbol; this line errs only while Button is typed',
        'export const probe: symbol = Button;',
        'export const field = <TextField label="Name" value="" onChange={(v) => v.trim()} />;',
        // A parameter declared `any` would still let v.trim() through: the value onChange is handed must be typed.
        "type Typed<T> = 0 extends 1 & T ? never : true;",
        "export const onChangeValueIsTyped: Typed<Parameters<NonNullable<import('@coolms/ui-react').TextFieldProps['onChange']>>[0]> = true;",
        'type Kit = typeof kit;',
        'type AnyExport = { [K in keyof Kit]: 0 extends 1 & Kit[K] ? K : never }[keyof Kit];',
        'export const noExportIsAny: [AnyExport] extends [never] ? true : AnyExport = true;',
        'export const someExports: number = Object.keys(kit).length;',
        '',
    ].join('\n'));
    const run = spawnSync(process.execPath, [tsc, '-p', join(work, 'tsconfig.json')], { encoding: 'utf8' });
    if (run.error) {
        console.log(`UNEVALUABLE: tsc could not be run: ${run.error.message}`);
        process.exit(2);
    }
    const out = `${run.stdout}${run.stderr}`.trim();
    if (run.status !== 0) {
        const lines = out.split('\n').map((line) => line.replace(work, '<consumer>').replace(root, '<package>'));
        console.log(`FOUND: the built declarations do not resolve, or do not type the repro, under nodenext (${lines.filter((l) => / error TS/.test(l)).length} error(s)):`);
        for (const line of lines.slice(0, 20)) console.log(`  ${line}`);
        process.exit(1);
    }
    console.log('CLEAR: the built declarations resolve under module and moduleResolution nodenext, and no export is any');
} finally {
    rmSync(work, { recursive: true, force: true });
}
