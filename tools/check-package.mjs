// check-package.mjs -- is the package as it would be published typed and laid out right for its consumers?
//
// Packs the built package (no scripts: the build is already there) and reads the tarball with two outside checkers:
// Are The Types Wrong (`attw`), which resolves every export under each TypeScript module resolution and reports one
// that is untyped, wrongly typed or typed as the other module format; and `publint`, which reads package.json's
// entry points and files against what the tarball holds. The kit is published as ES modules only, so attw runs with
// its esm-only profile: resolution as CommonJS (node10, and node16 from a CommonJS file) is not offered, by design.
// Exit 0 CLEAR, 1 FOUND (either checker), 2 UNEVALUABLE (no build, or the pack failed).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'dist', 'index.js'))) {
    console.log('UNEVALUABLE: dist/index.js does not exist -- run the build first');
    process.exit(2);
}
// Each checker's own entry, by its file: neither package exports that path to a resolver.
const bin = (name, path) => {
    const file = join(root, 'node_modules', name, path);
    if (!existsSync(file)) {
        console.log(`UNEVALUABLE: ${name} is not installed (no ${path})`);
        process.exit(2);
    }
    return file;
};
const attw = bin('@arethetypeswrong/cli', 'dist/index.js');
const publint = bin('publint', 'src/cli.js');
const out = mkdtempSync(join(tmpdir(), 'ui-react-pack-'));
try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const pack = spawnSync(npm, ['pack', '--ignore-scripts', '--pack-destination', out], { cwd: root, encoding: 'utf8' });
    const tarball = readdirSync(out).find((f) => f.endsWith('.tgz'));
    if (pack.status !== 0 || tarball === undefined) {
        console.log(`UNEVALUABLE: npm pack failed\n${pack.stderr}`);
        process.exit(2);
    }
    // The stylesheet exports are CSS, which attw does not resolve as modules: they are left out, not failed.
    const typed = spawnSync(process.execPath, [attw, join(out, tarball), '--profile', 'esm-only', '--exclude-entrypoints', './kit.css', './tokens.css', './fonts.css', '--format', 'table-flipped'], { cwd: root, encoding: 'utf8' });
    console.log(`${typed.stdout}${typed.stderr}`.trim());
    // publint reads a package's folder: the tarball unpacked, exactly the files a consumer gets.
    const unpacked = spawnSync('tar', ['-xzf', join(out, tarball), '-C', out], { encoding: 'utf8' });
    if (unpacked.status !== 0) {
        console.log(`UNEVALUABLE: the tarball could not be unpacked\n${unpacked.stderr}`);
        process.exit(2);
    }
    const laid = spawnSync(process.execPath, [publint, 'run', join(out, 'package'), '--strict'], { cwd: root, encoding: 'utf8' });
    console.log(`${laid.stdout}${laid.stderr}`.trim());
    const found = [typed.status !== 0 && 'attw', laid.status !== 0 && 'publint'].filter(Boolean);
    console.log(found.length === 0 ? 'CLEAR: attw (esm-only) and publint (strict) find nothing' : `FOUND: ${found.join(' and ')} reported problems above`);
    process.exit(found.length === 0 ? 0 : 1);
} finally {
    rmSync(out, { recursive: true, force: true });
}
