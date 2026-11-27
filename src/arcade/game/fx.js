import { MINI } from './glyphs';
const hexRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = 7;
const L1 = LEVELS + 1;
/** mortar + three brick shades */
const BRICK = [
    [13, 10, 12],
    [27, 22, 24],
    [33, 27, 29],
    [40, 33, 35],
];
const BRICK_F = [0.5, 0.8, 0.9, 1];
const BW = 14;
const BH = 7;
const hash2 = (a, b) => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
};
export class Fx {
    reduced = false;
    bg;
    fg;
    b;
    f;
    w = 0;
    h = 0;
    shade = new Uint8Array(0);
    fall = new Float32Array(0);
    ang = new Float32Array(0);
    thr = new Float32Array(0);
    img = null;
    buf = null;
    table = new Uint32Array(4 * L1);
    col = [255, 154, 85];
    tcol = [255, 154, 85];
    inten = 0.3;
    tinten = 0.3;
    rays = 0;
    trays = 0;
    cx = 0.5;
    cy = 0.4;
    parts = [];
    rings = [];
    bolts = [];
    columns = [];
    swirls = [];
    bands = [];
    flash = 0;
    flashC = '#ffffff';
    rain = null;
    rainC = '#00ff9c';
    stars = false;
    starC = '#ff9ae0';
    raf = 0;
    last = 0;
    t = 0;
    n = 0;
    constructor(bg, fg) {
        this.bg = bg;
        this.fg = fg;
        this.b = bg.getContext('2d');
        this.f = fg.getContext('2d');
    }
    /* ---------- lifecycle ---------- */
    start() {
        cancelAnimationFrame(this.raf);
        this.last = 0;
        this.raf = requestAnimationFrame(this.frame);
    }
    stop() {
        cancelAnimationFrame(this.raf);
    }
    resize(cssW, cssH, scale) {
        const w = Math.max(8, Math.ceil(cssW / scale));
        const h = Math.max(8, Math.ceil(cssH / scale));
        if (w === this.w && h === this.h)
            return;
        this.w = w;
        this.h = h;
        this.bg.width = this.fg.width = w;
        this.bg.height = this.fg.height = h;
        this.img = this.b.createImageData(w, h);
        this.buf = new Uint32Array(this.img.data.buffer);
        this.build();
        if (this.rain)
            this.makeRain();
    }
    setCenter(x, y) {
        if (Math.abs(x - this.cx) < 0.004 && Math.abs(y - this.cy) < 0.004)
            return;
        this.cx = x;
        this.cy = y;
        this.geom();
    }
    /* ---------- wall ---------- */
    build() {
        const { w, h } = this;
        this.shade = new Uint8Array(w * h);
        this.thr = new Float32Array(w * h);
        for (let y = 0; y < h; y++) {
            const row = Math.floor(y / BH);
            const off = (row & 1) * (BW / 2);
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                this.thr[i] = BAYER[(x & 3) + ((y & 3) << 2)] / 16;
                let s = 0;
                if (y % BH !== 0 && (x + off) % BW !== 0) {
                    s = 1 + (hash2(Math.floor((x + off) / BW), row) % 3);
                    const chip = hash2(x * 7 + 3, y * 13 + 5) % 100;
                    if (chip < 5)
                        s = Math.max(1, s - 1);
                    else if (chip > 95)
                        s = Math.min(3, s + 1);
                }
                this.shade[i] = s;
            }
        }
        this.geom();
    }
    geom() {
        const { w, h } = this;
        if (!w || !h)
            return;
        const cx = this.cx * w;
        const cy = this.cy * h;
        const R = Math.max(w, h) * 0.66;
        this.fall = new Float32Array(w * h);
        this.ang = new Float32Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = x - cx;
                const dy = (y - cy) * 1.3;
                const d = Math.sqrt(dx * dx + dy * dy) / R;
                const i = y * w + x;
                this.fall[i] = d >= 1 ? 0 : (1 - d) * (1 - d);
                this.ang[i] = Math.atan2(dy, dx);
            }
        }
    }
    makeTable() {
        const [r, g, b] = this.col;
        for (let s = 0; s < 4; s++) {
            const base = BRICK[s];
            const f = BRICK_F[s];
            for (let l = 0; l <= LEVELS; l++) {
                const k = Math.pow(l / LEVELS, 0.85) * 0.88;
                let R = base[0] + (r * f - base[0]) * k;
                let G = base[1] + (g * f - base[1]) * k;
                let B = base[2] + (b * f - base[2]) * k;
                if (l === LEVELS) {
                    R += (255 - R) * 0.3;
                    G += (255 - G) * 0.3;
                    B += (255 - B) * 0.3;
                }
                this.table[s * L1 + l] = ((255 << 24) | ((B & 255) << 16) | ((G & 255) << 8) | (R & 255)) >>> 0;
            }
        }
    }
    /* ---------- light ---------- */
    setLight(hex, intensity, rays = 0) {
        this.tcol = hexRgb(hex);
        this.tinten = intensity;
        this.trays = this.reduced ? 0 : rays;
    }
    setStars(on, color = '#ff9ae0') {
        this.stars = on && !this.reduced;
        this.starC = color;
    }
    setRain(on, color = '#00ff9c') {
        this.rainC = color;
        if (on && !this.reduced)
            this.makeRain();
        else
            this.rain = null;
    }
    makeRain() {
        this.rain = [];
        for (let x = 1; x < this.w - 3; x += 5) {
            if (hash2(x, 99) % 100 < 58) {
                this.rain.push({ x, y: -Math.random() * this.h, v: 28 + Math.random() * 60 });
            }
        }
    }
    /* ---------- emitters ---------- */
    add(x, y, vx, vy, life, c, s, g) {
        if (this.parts.length > 1100)
            return;
        this.parts.push({ x, y, vx, vy, life, max: life, c, s, g });
    }
    amount(n) {
        return this.reduced ? Math.ceil(n * 0.25) : n;
    }
    /** Small puff when a tile slams down. */
    dust(x, y) {
        const X = x * this.w;
        const Y = y * this.h;
        for (let i = 0; i < this.amount(6); i++) {
            this.add(X + (Math.random() - 0.5) * 10, Y, (Math.random() - 0.5) * 70, -Math.random() * 18, 0.18 + Math.random() * 0.2, '#8f8ba3', 1, 60);
        }
    }
    /** Sparks that leap up from a tile and fall back. */
    spark(x, y, c, n = 8) {
        const X = x * this.w;
        const Y = y * this.h;
        for (let i = 0; i < this.amount(n); i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
            const v = 30 + Math.random() * 75;
            this.add(X + (Math.random() - 0.5) * 8, Y, Math.cos(a) * v, Math.sin(a) * v, 0.3 + Math.random() * 0.5, Math.random() < 0.25 ? '#ffffff' : c, Math.random() < 0.3 ? 2 : 1, 170);
        }
    }
    /** Radial explosion. */
    burst(x, y, colors, n, power) {
        const X = x * this.w;
        const Y = y * this.h;
        for (let i = 0; i < this.amount(n); i++) {
            const a = Math.random() * Math.PI * 2;
            const v = power * (0.25 + Math.random() * 0.75);
            this.add(X, Y, Math.cos(a) * v, Math.sin(a) * v * 0.8, 0.5 + Math.random() * 0.9, colors[i % colors.length], Math.random() < 0.4 ? 2 : 1, 90);
        }
    }
    confetti(colors, n) {
        for (let i = 0; i < this.amount(n); i++) {
            this.add(Math.random() * this.w, -2 - Math.random() * this.h * 0.4, (Math.random() - 0.5) * 30, 25 + Math.random() * 45, 2 + Math.random() * 1.6, colors[i % colors.length], Math.random() < 0.5 ? 2 : 1, 22);
        }
    }
    /** Fountain of gold pixels. */
    coins(x, y, n) {
        const X = x * this.w;
        const Y = y * this.h;
        const cols = ['#ffc83d', '#fff2a1', '#b86a14'];
        for (let i = 0; i < this.amount(n); i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
            const v = 55 + Math.random() * 70;
            this.add(X, Y, Math.cos(a) * v, Math.sin(a) * v, 0.7 + Math.random() * 0.6, cols[i % 3], 2, 190);
        }
    }
    ring(x, y, c, speed = 110, thick = 1) {
        if (this.reduced)
            return;
        this.rings.push({ x: x * this.w, y: y * this.h, r: 3, v: speed, life: 0.75, max: 0.75, c, s: thick });
    }
    flashScreen(c, strength = 0.8) {
        if (this.reduced)
            return;
        this.flashC = c;
        this.flash = strength;
    }
    /* ---------- tier spectacles (rarity above MYTHIC) ---------- */
    /**
     * Nebula lightning: several jagged bolts lash out from one point to random
     * edges, each leaving soft nebula puffs behind. Bolts live ~0.4s and their
     * paths morph smoothly instead of flickering between frames.
     */
    nebulaStrike(x, y, cols, count = 3) {
        if (this.reduced)
            return;
        const X = x * this.w;
        const Y = y * this.h;
        for (let i = 0; i < this.amount(count); i++) {
            const a = Math.random() * Math.PI * 2;
            const len = Math.max(this.w, this.h) * (0.55 + Math.random() * 0.5);
            this.bolts.push({
                x1: X,
                y1: Y,
                x2: X + Math.cos(a) * len,
                y2: Y + Math.sin(a) * len * 0.8,
                life: 0.3 + Math.random() * 0.18,
                max: 0.48,
                seed: Math.random() * 100,
                cols,
                w: Math.random() < 0.35 ? 3 : 2,
            });
        }
        for (let i = 0; i < this.amount(14); i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 8 + Math.random() * 26;
            this.add(X, Y, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 6, 0.7 + Math.random() * 0.5, cols[i % cols.length], Math.random() < 0.3 ? 2 : 1, -4);
        }
    }
    /** Dithered pillar of light dropping from the ceiling. */
    lightColumn(x, wUnits, col, core, life = 0.9, delay = 0) {
        if (this.reduced)
            return;
        this.columns.push({ x: x * this.w, w: wUnits, life, max: life, delay, col, core });
    }
    /** A gravity well: pixels orbit a point and spiral inward before vanishing. */
    swirl(x, y, cols, life = 1.1, spin = 3, radius = 0.42) {
        if (this.reduced)
            return;
        this.swirls.push({
            x: x * this.w,
            y: y * this.h,
            r: Math.max(this.w, this.h) * radius,
            life,
            max: life,
            cols,
            spin,
            n: this.amount(120),
        });
    }
    /** Neon corruption slices sweeping across the stage. */
    tearBands(cols, life = 0.5) {
        if (this.reduced)
            return;
        this.bands.push({ life, max: life, cols });
    }
    /* ---------- drawing ---------- */
    drawBolt(b) {
        const f = this.f;
        const t = 1 - b.life / b.max;
        if (t > 0.62 && (this.n & 1))
            return; // crackle out at the end
        const dx = b.x2 - b.x1;
        const dy = b.y2 - b.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const amp = len * 0.17 * (1 - t * 0.4);
        const segs = 16;
        const fade = t < 0.75 ? 1 : 0.55;
        const pts = [];
        for (let i = 0; i <= segs; i++) {
            const u = i / segs;
            const env = Math.sin(Math.PI * u);
            const wob = Math.sin(u * 7.3 + b.seed + this.t * 9) * 0.68 + Math.sin(u * 13.1 + b.seed * 1.7 + this.t * 15.2) * 0.32;
            const off = wob * amp * env;
            pts.push([b.x1 + dx * u + nx * off, b.y1 + dy * u + ny * off]);
        }
        const passes = [
            [b.cols[0], b.w + 2],
            [b.cols[1] ?? b.cols[0], b.w],
            ['#ffffff', 1],
        ];
        for (const [color, thick] of passes) {
            f.fillStyle = color;
            f.globalAlpha = fade;
            for (let i = 0; i < segs; i++) {
                const [ax, ay] = pts[i];
                const [bx, by] = pts[i + 1];
                const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
                for (let s = 0; s <= steps; s++) {
                    const x = ax + ((bx - ax) * s) / steps;
                    const y = ay + ((by - ay) * s) / steps;
                    f.fillRect((x - thick / 2) | 0, (y - thick / 2) | 0, thick, thick);
                }
            }
        }
        f.globalAlpha = 1;
    }
    drawColumn(c) {
        const f = this.f;
        const t = 1 - c.life / c.max;
        const grow = Math.min(1, t * 1.5 + 0.12);
        const yBot = this.h * grow;
        const half = Math.max(1, c.w >> 1);
        for (let y = 0; y < yBot; y++) {
            const fall = 1 - (y / yBot) * 0.75;
            for (let x = -half; x <= half; x++) {
                const edge = 1 - Math.abs(x) / (half + 1);
                const level = fall * edge * (t < 0.12 ? t / 0.12 : 1);
                const d = BAYER[(((c.x + x) | 0) & 3) + ((y & 3) << 2)] / 16;
                if (level * 1.5 > d) {
                    f.fillStyle = Math.abs(x) <= 1 ? c.core : c.col;
                    f.fillRect(((c.x + x) | 0) - 1, y, 1, 1);
                }
            }
        }
    }
    drawSwirl(s) {
        const f = this.f;
        const t = 1 - s.life / s.max;
        for (let i = 0; i < s.n; i++) {
            const seed = i * 2.399;
            const a = seed + s.spin * this.t * 1.7 + t * 2.4;
            const shrink = 1 - t * (0.45 + ((i * 37) % 100) / 100 * 0.5);
            const rr = s.r * shrink * (0.18 + ((i * 53) % 100) / 100 * 0.82);
            const x = s.x + Math.cos(a) * rr;
            const y = s.y + Math.sin(a) * rr * 0.72;
            f.fillStyle = s.cols[i % s.cols.length];
            const big = i % 5 === 0 ? 2 : 1;
            f.fillRect(x | 0, y | 0, big, big);
        }
    }
    drawBands(g) {
        const f = this.f;
        const step = Math.floor(this.t * 16);
        for (let i = 0; i < 8; i++) {
            const seed = hash2(i * 31 + 7, step);
            const y = seed % this.h;
            const h = 1 + ((seed >> 5) % 4);
            const off = ((seed >> 11) % 46) - 23;
            f.globalAlpha = 0.5;
            f.fillStyle = g.cols[(i + step) % g.cols.length];
            f.fillRect(off, y, this.w, h);
        }
        f.globalAlpha = 1;
    }
    /* ---------- frame ---------- */
    frame = (now) => {
        this.raf = requestAnimationFrame(this.frame);
        if (!this.last)
            this.last = now - 34;
        const dt = now - this.last;
        if (dt < 30)
            return; // ~30fps keeps the pixel animation choppy on purpose
        this.last = now;
        const d = Math.min(0.066, dt / 1000);
        this.t += d;
        this.n++;
        const e = 1 - Math.pow(0.0015, d);
        for (let i = 0; i < 3; i++)
            this.col[i] += (this.tcol[i] - this.col[i]) * e;
        this.inten += (this.tinten - this.inten) * e;
        this.rays += (this.trays - this.rays) * e * 0.6;
        this.drawBack(d);
        this.drawFront(d);
    };
    drawBack(d) {
        const { buf, img, fall, thr, shade, table, ang, w, h } = this;
        if (!buf || !img)
            return;
        this.makeTable();
        const N = w * h;
        const flick = this.reduced ? 0 : Math.sin(this.t * 9) * 0.014 + Math.sin(this.t * 23) * 0.009;
        const I = Math.max(0, this.inten + flick) * LEVELS * 1.25;
        if (this.rays > 0.02) {
            const RI = this.rays * LEVELS * 0.55;
            const rt = this.t * 0.55;
            for (let i = 0; i < N; i++) {
                let l = I * fall[i];
                if (Math.sin(ang[i] * 7 + rt) > 0.35)
                    l += RI * (0.22 + fall[i]);
                let q = (l + thr[i]) | 0;
                if (q > LEVELS)
                    q = LEVELS;
                buf[i] = table[shade[i] * L1 + q];
            }
        }
        else {
            for (let i = 0; i < N; i++) {
                let q = (I * fall[i] + thr[i]) | 0;
                if (q > LEVELS)
                    q = LEVELS;
                buf[i] = table[shade[i] * L1 + q];
            }
        }
        this.b.putImageData(img, 0, 0);
        // Digit rain sits behind the tiles so the number stays readable.
        if (this.rain) {
            const b = this.b;
            for (const c of this.rain) {
                c.y += c.v * d;
                if (c.y - 42 > h) {
                    c.y = -Math.random() * 30;
                    c.v = 28 + Math.random() * 60;
                }
                const head = Math.floor(c.y / 6);
                for (let k = 0; k < 6; k++) {
                    const gy = (head - k) * 6;
                    if (gy < -5 || gy > h)
                        continue;
                    const glyph = MINI[(hash2(c.x, head - k) + (k === 0 ? this.n : 0)) % 10];
                    b.globalAlpha = k === 0 ? 1 : 0.75 - k * 0.12;
                    b.fillStyle = k === 0 ? '#eafff5' : this.rainC;
                    for (let ry = 0; ry < 5; ry++) {
                        const m = glyph[ry];
                        for (let rx = 0; rx < 3; rx++)
                            if (m & (4 >> rx))
                                b.fillRect(c.x + rx, gy + ry, 1, 1);
                    }
                }
            }
            b.globalAlpha = 1;
        }
    }
    drawFront(d) {
        const { f, w, h } = this;
        f.clearRect(0, 0, w, h);
        if (this.stars && Math.random() < 0.7) {
            this.add(Math.random() * w, Math.random() * h, 0, 0, 0.3 + Math.random() * 0.5, Math.random() < 0.5 ? '#ffffff' : this.starC, 1, 0);
        }
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.r += r.v * d;
            r.life -= d;
            if (r.life <= 0) {
                this.rings.splice(i, 1);
                continue;
            }
            if (r.life / r.max < 0.35 && this.n & 1)
                continue;
            f.fillStyle = r.c;
            const steps = Math.max(16, Math.floor(r.r * 5));
            for (let k = 0; k < steps; k++) {
                const a = (k / steps) * 6.2832;
                f.fillRect((r.x + Math.cos(a) * r.r) | 0, (r.y + Math.sin(a) * r.r * 0.8) | 0, r.s, r.s);
            }
        }
        for (let i = this.columns.length - 1; i >= 0; i--) {
            const c = this.columns[i];
            if (c.delay > 0) {
                c.delay -= d;
                continue;
            }
            c.life -= d;
            if (c.life <= 0) {
                this.columns.splice(i, 1);
                continue;
            }
            this.drawColumn(c);
        }
        for (let i = this.swirls.length - 1; i >= 0; i--) {
            const s = this.swirls[i];
            s.life -= d;
            if (s.life <= 0) {
                this.swirls.splice(i, 1);
                continue;
            }
            this.drawSwirl(s);
        }
        for (let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            p.life -= d;
            if (p.life <= 0) {
                this.parts[i] = this.parts[this.parts.length - 1];
                this.parts.pop();
                continue;
            }
            p.vy += p.g * d;
            p.x += p.vx * d;
            p.y += p.vy * d;
            if (p.life / p.max < 0.3 && (this.n + i) & 1)
                continue; // blink out instead of fading
            f.fillStyle = p.c;
            f.fillRect(p.x | 0, p.y | 0, p.s, p.s);
        }
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const b = this.bolts[i];
            b.life -= d;
            if (b.life <= 0) {
                this.bolts.splice(i, 1);
                continue;
            }
            this.drawBolt(b);
        }
        for (let i = this.bands.length - 1; i >= 0; i--) {
            const g = this.bands[i];
            g.life -= d;
            if (g.life <= 0) {
                this.bands.splice(i, 1);
                continue;
            }
            if ((this.n & 1) === 0 || g.life / g.max > 0.5)
                this.drawBands(g);
        }
        if (this.flash > 0.03) {
            f.globalAlpha = (Math.ceil(this.flash * 4) / 4) * 0.75;
            f.fillStyle = this.flashC;
            f.fillRect(0, 0, w, h);
            f.globalAlpha = 1;
            this.flash -= d * 3.4;
        }
    }
}
