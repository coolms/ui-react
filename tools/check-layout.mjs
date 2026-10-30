// check-layout.mjs -- does every demo screen fit its width?
//
// Serves the built demo (demo/dist) on a free local port and opens each screen of demo/workspace.html in headless
// Chrome at each width of the layout: 1440 (desktop), 1024 and 768 (tablet), 390 (phone), in light and dark. The
// page's own probe (`?probe=layout`) reports what passes the viewport's edge, what scrolls sideways, and, below the
// desktop width, every control smaller than the 44px touch target. Any of those is FOUND.
//
// A browser window has a smallest width (about 500px for Chrome on Windows), narrower than a phone. So each screen is
// opened in a frame of exactly its width, inside a harness page this check serves; the screen's media queries read
// the frame's width, and its probe writes the answer into the harness, the page the browser dumps.
//
// With --shots=<dir>, each reading also saves a screenshot of the frame, cropped to its width and height, as
// <dir>/<screen>-<light|dark>-<width>.png: the screens a reviewer looks at are the screens this check measured.
// --screens=mail,chat/0 and --widths=390,768 narrow a run while a layout is being fixed; the gate runs them all.
//
// The browser: $CHROME, else the first of google-chrome, google-chrome-stable, chromium, chromium-browser on the PATH,
// else Chrome on Windows from WSL. No browser, or no answer from it, is UNEVALUABLE -- never a pass.
// Exit 0 CLEAR, 1 FOUND, 2 UNEVALUABLE. Run `npm run demo:build` first.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'demo', 'dist');
const WINDOWS_CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';

/** The demo's screens, each at a place its address names. */
export const SCREENS = ['mail/folders', 'mail', 'mail/0', 'chat', 'chat/0', 'calls', 'signin'];
/** The widths of the layout: desktop, two tablet widths, phone. */
export const WIDTHS = [1440, 1024, 768, 390];
const HEIGHT = { 1440: 900, 1024: 768, 768: 1024, 390: 844 };
/** The narrowest window the harness asks for: wider than any browser's smallest window. */
const WINDOW_MIN = 520;

function unevaluable(why) {
    console.log(`UNEVALUABLE: ${why}`);
    process.exit(2);
}

function browser() {
    if (process.env.CHROME) return process.env.CHROME;
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
        const found = spawnSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' });
        if (found.status === 0 && found.stdout.trim() !== '') return found.stdout.trim();
    }
    return existsSync(WINDOWS_CHROME) ? WINDOWS_CHROME : null;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

/** The harness: the screen in a frame of exactly its width and height, at the window's top left. */
function harness(src, width, height) {
    const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#808080}</style></head>'
        + `<body><iframe src="${attr(src)}" width="${String(width)}" height="${String(height)}" style="display:block;border:0"></iframe></body></html>`;
}

function serve() {
    const server = createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://x');
        if (url.pathname === '/__harness') {
            const width = Number(url.searchParams.get('w'));
            const height = Number(url.searchParams.get('h'));
            res.writeHead(200, { 'Content-Type': 'text/html' }).end(harness(url.searchParams.get('src') ?? '', width, height));
            return;
        }
        const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
        const file = join(root, path === '/' ? 'workspace.html' : path);
        if (!file.startsWith(root) || !existsSync(file)) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** A path the browser can write to and read from: a Windows path for Chrome on Windows. */
function forBrowser(chrome, path) {
    if (chrome !== WINDOWS_CHROME) return path;
    return spawnSync('wslpath', ['-w', path], { encoding: 'utf8' }).stdout.trim();
}

/** The browser's arguments for one screen: the harness at a window wide enough, a profile of its own. */
function browserArgs(chrome, profile, port, screen, width, dark, probe) {
    const height = HEIGHT[width];
    const src = `/workspace.html?${probe ? 'probe=layout' : ''}${dark ? '&theme=dark' : ''}#${screen}`;
    const url = `http://localhost:${String(port)}/__harness?w=${String(width)}&h=${String(height)}&src=${encodeURIComponent(src)}`;
    return {
        url,
        args: [
            '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
            `--user-data-dir=${forBrowser(chrome, profile)}`,
            `--window-size=${String(Math.max(width, WINDOW_MIN))},${String(height)}`, '--virtual-time-budget=6000',
        ],
    };
}

/**
 * Runs the browser without blocking: the demo is served from this same process, so a synchronous run would leave the
 * page's requests unanswered until the browser gave up.
 */
function run(chrome, args) {
    return new Promise(done => {
        // No standard input: a browser started through WSL's interop waits on an open one.
        const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        const timer = setTimeout(() => child.kill(), 90_000);
        child.stdout.on('data', d => {
            out += String(d);
        });
        child.on('close', () => {
            clearTimeout(timer);
            done(out);
        });
    });
}

/** The probe's answer for one screen at one width and theme, or null when the page gave none. */
async function probe(chrome, profile, port, screen, width, dark) {
    const { url, args } = browserArgs(chrome, profile, port, screen, width, dark, true);
    const out = await run(chrome, [...args, '--dump-dom', url]);
    const found = /<pre id="layout-probe">([^<]*)<\/pre>/.exec(out);
    if (!found) return null;
    return JSON.parse(found[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

/** A PNG's pixels as rows of RGB or RGBA bytes, unfiltered: what Chrome's screenshots are. */
function readPng(buf) {
    let pos = 8;
    let width = 0;
    let height = 0;
    let channels = 3;
    const idat = [];
    while (pos < buf.length) {
        const length = buf.readUInt32BE(pos);
        const kind = buf.toString('latin1', pos + 4, pos + 8);
        const body = buf.subarray(pos + 8, pos + 8 + length);
        if (kind === 'IHDR') {
            width = body.readUInt32BE(0);
            height = body.readUInt32BE(4);
            if (body[8] !== 8 || (body[9] !== 2 && body[9] !== 6)) throw new Error('only 8-bit RGB or RGBA PNGs are read');
            channels = body[9] === 6 ? 4 : 3;
        } else if (kind === 'IDAT') idat.push(body);
        pos += 12 + length;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const rows = [];
    let prev = Buffer.alloc(stride);
    for (let y = 0, p = 0; y < height; y++, p += 1 + stride) {
        const type = raw[p];
        const line = Buffer.from(raw.subarray(p + 1, p + 1 + stride));
        for (let i = 0; i < stride; i++) {
            const a = i >= channels ? line[i - channels] : 0;
            const b = prev[i];
            const c = i >= channels ? prev[i - channels] : 0;
            if (type === 1) line[i] = (line[i] + a) & 255;
            else if (type === 2) line[i] = (line[i] + b) & 255;
            else if (type === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
            else if (type === 4) {
                const pa = Math.abs(b - c);
                const pb = Math.abs(a - c);
                const pc = Math.abs(a + b - 2 * c);
                line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
            }
        }
        rows.push(line);
        prev = line;
    }
    return { width, height, channels, rows };
}

/** A PNG of the top-left `width` x `height` pixels of `png`. */
function cropPng(png, width, height) {
    const rows = png.rows.slice(0, height).map(r => Buffer.concat([Buffer.from([0]), r.subarray(0, width * png.channels)]));
    const chunk = (kind, body) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(body.length);
        const crcInput = Buffer.concat([Buffer.from(kind, 'latin1'), body]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(crcInput));
        return Buffer.concat([len, crcInput, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(Math.min(height, png.rows.length), 4);
    ihdr[8] = 8;
    ihdr[9] = png.channels === 4 ? 6 : 2;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buf) {
    let c = 0xffffffff;
    for (const byte of buf) c = CRC[(c ^ byte) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/** Saves the screen's screenshot, cropped to its frame, as <dir>/<screen>-<theme>-<width>.png. */
async function shoot(chrome, profile, port, screen, width, dark, dir) {
    const { url, args } = browserArgs(chrome, profile, port, screen, width, dark, false);
    const full = join(dir, '.full.png');
    await run(chrome, [...args, `--screenshot=${forBrowser(chrome, full)}`, url]);
    if (!existsSync(full)) return false;
    const png = readPng(readFileSync(full));
    writeFileSync(join(dir, `${screen.replace('/', '-')}-${dark ? 'dark' : 'light'}-${String(width)}.png`), cropPng(png, width, HEIGHT[width]));
    rmSync(full);
    return true;
}

async function main() {
    if (!existsSync(join(root, 'workspace.html'))) unevaluable('no built demo: run `npm run demo:build` first');
    const chrome = browser();
    if (chrome === null) unevaluable('no Chrome found: set CHROME, or install google-chrome or chromium');
    const option = (name) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
    const screens = option('screens')?.split(',') ?? SCREENS;
    const widths = option('widths')?.split(',').map(Number) ?? WIDTHS;
    for (const w of widths) if (!(w in HEIGHT)) unevaluable(`no layout width ${String(w)}: the widths are ${WIDTHS.join(', ')}`);
    const shotsArg = process.argv.find(a => a.startsWith('--shots='));
    const shots = shotsArg ? resolve(shotsArg.slice('--shots='.length)) : null;
    if (shots !== null) mkdirSync(shots, { recursive: true });
    // Chrome on Windows needs its profile where Windows can lock files: beside the shots, or in the build.
    const profile = mkdtempSync(join(chrome === WINDOWS_CHROME ? (shots ?? root) : tmpdir(), '.layout-profile-'));
    const server = await serve();
    const port = server.address().port;
    const problems = [];
    let read = 0;
    try {
        for (const dark of [false, true]) {
            for (const width of widths) {
                for (const screen of screens) {
                    // One retry: a browser started through WSL's interop now and then fails to start at all.
                    const answer = (await probe(chrome, profile, port, screen, width, dark)) ?? (await probe(chrome, profile, port, screen, width, dark));
                    const where = `#${screen} at ${String(width)}px${dark ? ', dark' : ''}`;
                    if (answer === null) unevaluable(`no probe answer for ${where}`);
                    read += 1;
                    if (answer.scrollWidth > width) problems.push(`${where}: the page is ${String(answer.scrollWidth)}px wide`);
                    for (const o of answer.overflow) problems.push(`${where}: past the edge: ${o}`);
                    for (const s of answer.scrolls) problems.push(`${where}: scrolls sideways: ${s}`);
                    for (const s of answer.small) problems.push(`${where}: under 44px: ${s}`);
                    if (shots !== null && !(await shoot(chrome, profile, port, screen, width, dark, shots)) && !(await shoot(chrome, profile, port, screen, width, dark, shots))) unevaluable(`no screenshot for ${where}`);
                }
            }
        }
    } finally {
        server.close();
        rmSync(profile, { recursive: true, force: true });
    }
    if (problems.length > 0) {
        console.log(`FOUND: ${String(problems.length)} layout problem(s) in ${String(read)} screen reading(s)`);
        for (const p of problems) console.log(`  ${p}`);
        process.exit(1);
    }
    console.log(`CLEAR: ${String(read)} screen reading(s) (${String(screens.length)} screens, ${widths.join('/')}px, light and dark): nothing passes the edge or scrolls sideways, and every control at touch widths is at least 44px`);
}

await main();
