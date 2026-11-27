/**
 * Procedural pixel textures. Every tile material is painted pixel-by-pixel on a
 * 16×20 canvas and exposed to CSS as --tex-<name>. Animated materials are
 * sprite sheets of four frames laid out horizontally.
 */
const W = 16;
const H = 20;
const INK = '#050406';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PAL = {
    blank: ['#060508', '#100f15', '#18161e', '#24222d', '#34313f'],
    stone: ['#3c3f52', '#515469', '#666a80', '#7d8198', '#a3a7bb'],
    jade: ['#0f5c3c', '#1c8551', '#2fa866', '#58cf7f', '#a4f5a8'],
    sapphire: ['#16307f', '#2450b0', '#2f6fe0', '#58a0f7', '#a8dcff'],
    amethyst: ['#3b1a80', '#6230b3', '#8a45d8', '#b374f2', '#e2bcff'],
    gold: ['#8a4a0c', '#c7791f', '#f0aa28', '#ffd04a', '#fff4b0'],
    ruby: ['#6e0b2e', '#a01845', '#d92e55', '#f5627f', '#ffb3c0'],
    diamond: ['#1f7f9e', '#49bcd1', '#8eeae8', '#c9fbf7', '#ffffff'],
    cosmic: ['#05031a', '#120b3d', '#241466', '#5a2ea8', '#b98cff'],
    glitch: ['#000000', '#050805', '#0c120e', '#00c97b', '#00ff9c'],
    eclipse: ['#1c0710', '#4a1320', '#7a2418', '#ff9a55', '#ffe0b0'],
    singularity: ['#0a0620', '#2a0a4a', '#5a2ea8', '#e05fff', '#ffffff'],
    omega: ['#7a1d0c', '#c7791f', '#ffd04a', '#fff4b0', '#ffffff'],
};
/** Index matches the tier index: each tier has its own tile material. */
export const MATERIALS = [
    'stone',
    'jade',
    'sapphire',
    'amethyst',
    'gold',
    'ruby',
    'diamond',
    'cosmic',
    'glitch',
    'eclipse',
    'singularity',
    'omega',
];
const FRAMES = { cosmic: 4, glitch: 4, eclipse: 4, singularity: 4, omega: 4 };
function mulberry(seed) {
    let a = seed | 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function body(mat, x, y, r) {
    switch (mat) {
        case 'blank':
            return r() < 0.1 ? 2 : 1;
        case 'stone': {
            const n = r();
            return n < 0.16 ? 1 : n > 0.9 ? 3 : 2;
        }
        case 'jade': {
            const band = (y + Math.round(Math.sin(x * 0.8) * 1.3) + 30) % 6;
            return band === 0 ? 3 : band === 3 && r() < 0.5 ? 1 : r() < 0.05 ? 3 : 2;
        }
        case 'sapphire': {
            const a = (x + y) % 8;
            const b = (x - y + 40) % 10;
            return a < 2 ? 3 : b < 2 ? 1 : 2;
        }
        case 'amethyst': {
            const a = (x * 2 + y) % 9;
            const b = (y - x * 2 + 60) % 11;
            return a < 2 ? 3 : b < 3 ? 1 : r() < 0.04 ? 4 : 2;
        }
        case 'gold': {
            const b = y % 4;
            return b === 0 ? 3 : b === 2 && r() < 0.55 ? 1 : r() < 0.05 ? 4 : 2;
        }
        case 'ruby': {
            const d = x + y * 0.8;
            return d < 9 ? 3 : d > 23 ? 1 : (x + y * 2) % 7 === 0 ? 3 : 2;
        }
        case 'diamond': {
            const a = (x + y) % 6;
            const b = (x - y + 40) % 8;
            return a === 0 ? 4 : b === 0 ? 1 : r() < 0.1 ? 3 : 2;
        }
        case 'cosmic': {
            const t = y / H + (BAYER[(x & 3) + ((y & 3) << 2)] / 16 - 0.5) * 0.45;
            return t < 0.36 ? 1 : t < 0.74 ? 2 : 3;
        }
        case 'eclipse': {
            // A black sun: dark moon in the middle, burning corona along the rim.
            const dx = x - 8;
            const dy = (y - 10) * 1.15;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 6.1 && d < 8.4)
                return r() < 0.42 ? 4 : 3;
            if (d <= 6.1)
                return r() < 0.09 ? 1 : 0;
            return r() < 0.18 ? 1 : 2;
        }
        case 'singularity': {
            // Matter spiralling into a violet core.
            const dx = x - 8;
            const dy = (y - 10) * 1.25;
            const a = Math.atan2(dy, dx);
            const d = Math.sqrt(dx * dx + dy * dy);
            const s = (a / Math.PI + 1) * 3.2 + d * 0.55;
            const band = Math.abs(((s % 2) + 2) % 2 - 1);
            if (d < 2.4)
                return 4;
            return band < 0.18 ? 3 : band < 0.38 ? 2 : r() < 0.12 ? 1 : 0;
        }
        case 'omega': {
            // White-hot plate fractured by red seams.
            const crack = (x * 3 + y * 5) % 11 === 0 || (x * 5 - y * 2 + 40) % 13 === 0;
            if (crack)
                return 1;
            return r() < 0.3 ? 4 : r() < 0.62 ? 3 : 2;
        }
        default:
            return r() < 0.12 ? 1 : 2;
    }
}
function detail(mat, put, r, frame) {
    const sparkle = (x, y) => {
        put(x, y, 4);
        put(x - 1, y, 3);
        put(x + 1, y, 3);
        put(x, y - 1, 3);
        put(x, y + 1, 3);
    };
    if (mat === 'stone') {
        const cracks = [[3, 4], [4, 5], [5, 5], [6, 6], [11, 13], [12, 14], [12, 15], [4, 15], [5, 16]];
        cracks.forEach(([x, y]) => put(x, y, 0));
    }
    if (mat === 'gold' || mat === 'sapphire' || mat === 'ruby' || mat === 'amethyst')
        sparkle(13, 2);
    if (mat === 'diamond') {
        sparkle(13, 2);
        sparkle(2, 17);
    }
    if (mat === 'cosmic') {
        const stars = [[3, 3], [12, 2], [8, 6], [2, 10], [13, 9], [6, 14], [11, 16], [4, 17]];
        stars.forEach(([x, y], i) => {
            const phase = (i + frame) % 4;
            if (phase === 0)
                return;
            put(x, y, phase === 2 ? '#ffffff' : i % 2 ? '#ff9ae0' : '#7ad1ff');
        });
    }
    if (mat === 'glitch') {
        const cols = ['#00ff9c', '#ff00d4', '#00d4ff'];
        for (let k = 0; k < 5; k++) {
            const y = 1 + Math.floor(r() * (H - 2));
            const x = 1 + Math.floor(r() * (W - 5));
            const len = 2 + Math.floor(r() * 8);
            const c = cols[Math.floor(r() * cols.length)];
            for (let i = 0; i < len && x + i < W - 1; i++)
                put(x + i, y, c);
        }
    }
    if (mat === 'eclipse') {
        // Corona embers riding the rim.
        const a = (frame / 4) * Math.PI * 2;
        for (let k = 0; k < 7; k++) {
            const ang = a + k * 0.9;
            const x = Math.round(8 + Math.cos(ang) * 7.2);
            const y = Math.round(10 + (Math.sin(ang) * 7.2) / 1.15);
            if (x > 0 && x < W - 1 && y > 0 && y < H - 1)
                put(x, y, k % 2 ? 4 : 3);
        }
    }
    if (mat === 'singularity') {
        const stars = [[2, 3], [13, 4], [3, 15], [12, 16], [7, 2], [10, 12]];
        stars.forEach(([x, y], i) => {
            if ((i + frame) % 3 === 0)
                return;
            put(x, y, i % 2 ? '#ffd6ff' : '#9be7ff');
        });
    }
    if (mat === 'omega') {
        // Fracture seams glow hotter on some frames.
        for (let k = 0; k < 4; k++) {
            const y = 1 + ((k * 5 + frame * 2) % (H - 2));
            for (let x = 1; x < W - 1; x++) {
                if ((x * 3 + y * 5) % 11 === 0)
                    put(x, y, frame % 2 ? '#ff5a3d' : 4);
            }
        }
        sparkle(13, 2);
    }
}
function paint(g, ox, mat, frame) {
    const pal = PAL[mat];
    const anim = (FRAMES[mat] ?? 1) > 1;
    const r = mulberry(mat.length * 7919 + mat.charCodeAt(0) * 31 + (anim ? frame * 101 : 0));
    const put = (x, y, c) => {
        g.fillStyle = typeof c === 'number' ? pal[c] : c;
        g.fillRect(ox + x, y, 1, 1);
    };
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
            put(x, y, body(mat, x, y, r));
    detail(mat, put, r, frame);
    // Bevel. Blank sockets are sunk in, every material is raised.
    const sunk = mat === 'blank';
    for (let x = 1; x < W - 1; x++) {
        put(x, 0, sunk ? 0 : 4);
        put(x, H - 1, sunk ? 3 : 0);
    }
    for (let y = 1; y < H - 1; y++) {
        put(0, y, sunk ? 0 : 3);
        put(W - 1, y, sunk ? 3 : 0);
    }
    if (!sunk)
        put(1, 1, 4);
    put(0, 0, INK);
    put(W - 1, 0, INK);
    put(0, H - 1, INK);
    put(W - 1, H - 1, INK);
}
function tileSheet(mat) {
    const frames = FRAMES[mat] ?? 1;
    const c = document.createElement('canvas');
    c.width = W * frames;
    c.height = H;
    const g = c.getContext('2d');
    if (!g)
        return '';
    for (let f = 0; f < frames; f++)
        paint(g, f * W, mat, f);
    return c.toDataURL('image/png');
}
function plate() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    if (!g)
        return '';
    const r = mulberry(4242);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const n = r();
            g.fillStyle = n < 0.12 ? '#201e27' : n < 0.2 ? '#292732' : n < 0.23 ? '#2f2c39' : '#24222b';
            g.fillRect(x, y, 1, 1);
        }
    }
    return c.toDataURL('image/png');
}
/**
 * Seamless horizontal pixel-art cap texture for the arcade ROLL push-button.
 * Uses the same Bayer 4×4 dithering as the digit tiles so the surface shading
 * feels cut from the same foundry while keeping the centre band calm for text.
 */
function rollCapTexture(pal) {
    const rw = 32;
    const rh = 16;
    const c = document.createElement('canvas');
    c.width = rw;
    c.height = rh;
    const g = c.getContext('2d');
    if (!g)
        return '';
    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const b = BAYER[(x & 3) + ((y & 3) << 2)] / 16;
            let idx = 1;
            if (y === 0) {
                idx = 3;
            }
            else if (y === 1) {
                idx = b < 0.45 ? 3 : 2;
            }
            else if (y <= 3) {
                // Faint stepped diagonal glint across the upper cap, matching tile facets.
                const sheen = (x + y * 2) % 16;
                idx = sheen < 2 ? 3 : 2;
            }
            else if (y === 4) {
                idx = b < 0.7 ? 2 : 1;
            }
            else if (y === 5) {
                idx = b < 0.3 ? 2 : 1;
            }
            else if (y <= 11) {
                idx = 1;
            }
            else if (y === 12) {
                idx = b < 0.35 ? 0 : 1;
            }
            else if (y === 13) {
                idx = b < 0.72 ? 0 : 1;
            }
            else {
                idx = 0;
            }
            g.fillStyle = pal[idx];
            g.fillRect(x, y, 1, 1);
        }
    }
    return c.toDataURL('image/png');
}
/** Paints every texture once and publishes them as CSS custom properties. */
export function installTextures() {
    if (typeof document === 'undefined')
        return;
    const root = document.documentElement;
    if (root.dataset.tex)
        return;
    root.dataset.tex = '1';
    for (const m of ['blank', ...MATERIALS]) {
        const url = tileSheet(m);
        if (url)
            root.style.setProperty(`--tex-${m}`, `url(${url})`);
    }
    const p = plate();
    if (p)
        root.style.setProperty('--tex-plate', `url(${p})`);
    const rollRed = rollCapTexture(['#9e1226', '#c91d32', '#de2b41', '#f25260']);
    if (rollRed)
        root.style.setProperty('--tex-roll-red', `url(${rollRed})`);
    const rollGold = rollCapTexture(['#d68a14', '#f2ae24', '#ffc93b', '#ffe680']);
    if (rollGold)
        root.style.setProperty('--tex-roll-gold', `url(${rollGold})`);
}
