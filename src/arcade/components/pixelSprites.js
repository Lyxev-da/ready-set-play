/**
 * Hand-built 20×20 pixel-art sprites for the arcade.
 *
 * Icons are rasterised from pixel-aligned shapes onto a tiny grid, outlined
 * with one pixel of ink so they read on any plate, then compressed into
 * horizontal same-colour runs (one SVG rect each).
 *
 * Upgrade icons additionally come in five EVOLUTION variants. The base art is
 * drawn once, then remapped onto the ramp of the evolution tier — GOLDEN,
 * RAINBOW, PRISMATIC and TRANSCENDENT — so a maxed family visibly changes
 * colour as it evolves instead of only changing its name.
 */

export const SPRITE_SIZE = 20;

const INK = '#090711';
const SHADOW = '#1a1026';

const C = {
    gold0: '#4a2a06',
    gold1: '#8a4a0c',
    gold2: '#c7791f',
    gold3: '#f0aa28',
    gold4: '#ffd04a',
    gold5: '#fff4b0',

    red0: '#5c0f24',
    red1: '#a01845',
    red2: '#d92e55',
    red3: '#f5627f',
    red4: '#ffb3c0',

    orange1: '#c74e1f',
    orange2: '#ff7a3d',

    green0: '#0f3d2a',
    green1: '#1c8551',
    green2: '#2fa866',
    green3: '#58cf7f',
    green4: '#a4f5a8',

    blue0: '#16307f',
    blue1: '#2450b0',
    blue2: '#2f6fe0',
    blue3: '#58a0f7',

    cyan0: '#1f7f9e',
    cyan1: '#49bcd1',
    cyan2: '#8eeae8',

    violet0: '#2a0a4a',
    violet1: '#5a2ea8',
    violet2: '#8a45d8',
    violet3: '#b98cff',
    violet4: '#e2bcff',

    pink: '#ff5fd2',

    steel0: '#24222d',
    steel1: '#3c3f52',
    steel2: '#515469',
    steel3: '#7d8198',
    steel4: '#a3a7bb',
    steel5: '#d0d3df',

    bone0: '#8b8378',
    bone1: '#c9c0ae',
    bone2: '#f4ecd8',
    bone3: '#fffdf0',

    wood0: '#4a2a12',
    wood1: '#7a4a1f',
    wood2: '#b86a14',
    wood3: '#e0a04a',
};

const WHITE = '#ffffff';

/* ---------- evolution ramps ---------- */

const GOLD_RAMP = ['#5b2a06', '#8a4a0c', '#c7791f', '#f0aa28', '#ffd04a', '#fff4b0'];
const TRANS_RAMP = ['#0f2f38', '#1f7f9e', '#49bcd1', '#8eeae8', '#d9f6ff', '#ffffff'];
const RAINBOW_RAMP = ['#ff5fd2', '#b98cff', '#58a0f7', '#49bcd1', '#2fa866', '#ffd04a', '#ff7a3d'];
const PRISM_RAMP = ['#8eeae8', '#c9b6ff', '#ff9ae0', '#ffffff', '#a8dcff', '#e2bcff'];

export const EVOLVE_VARIANTS = ['', 'Gold', 'Rainbow', 'Prismatic', 'Transcendent'];

function lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// Reserve the brightest stop on each ramp for pure specular highlights so light
// base materials (like the ivory die or parchment bounty) still read vividly coloured.
const pickBody = (ramp, l) => {
    const top = ramp.length - 2;
    return ramp[Math.max(0, Math.min(top, Math.round(l * top)))];
};

function tintColor(c, x, y, variant) {
    if (c === INK || c === SHADOW) return c;
    const l = lum(c);
    switch (variant) {
        case 'Gold':
            return c === WHITE ? '#fff4b0' : pickBody(GOLD_RAMP, l);
        case 'Rainbow': {
            if (c === WHITE) return WHITE;
            const t = (x + y) / (2 * (SPRITE_SIZE - 1));
            return RAINBOW_RAMP[Math.min(RAINBOW_RAMP.length - 1, Math.floor(t * RAINBOW_RAMP.length))];
        }
        case 'Prismatic': {
            if (c === WHITE) return WHITE;
            const t = (((x * 2 + y) % SPRITE_SIZE) / SPRITE_SIZE) * PRISM_RAMP.length;
            return PRISM_RAMP[Math.floor(t) % PRISM_RAMP.length];
        }
        case 'Transcendent':
            return c === WHITE ? WHITE : pickBody(TRANS_RAMP, l);
        default:
            return c;
    }
}

/* ---------- pixel canvas ---------- */

function makeCanvas() {
    const grid = Array.from({ length: SPRITE_SIZE }, () => Array(SPRITE_SIZE).fill(null));

    const set = (x, y, color) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < SPRITE_SIZE && y >= 0 && y < SPRITE_SIZE) grid[y][x] = color;
    };

    const clear = (x, y) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < SPRITE_SIZE && y >= 0 && y < SPRITE_SIZE) grid[y][x] = null;
    };

    const rect = (x, y, w, h, color) => {
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, color);
    };

    const line = (x0, y0, x1, y1, color) => {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            set(x0, y0, color);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    };

    const disc = (cx, cy, r, color) => {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                const dx = x + 0.5 - cx;
                const dy = y + 0.5 - cy;
                if (dx * dx + dy * dy <= r * r + 0.15) set(x, y, color);
            }
        }
    };

    const poly = (points, color) => {
        const ys = points.map((p) => p[1]);
        const minY = Math.max(0, Math.floor(Math.min(...ys)));
        const maxY = Math.min(SPRITE_SIZE - 1, Math.ceil(Math.max(...ys)));
        for (let y = minY; y <= maxY; y++) {
            const py = y + 0.5;
            const xs = [];
            for (let i = 0; i < points.length; i++) {
                const [x1, y1] = points[i];
                const [x2, y2] = points[(i + 1) % points.length];
                if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) {
                    xs.push(x1 + ((py - y1) * (x2 - x1)) / (y2 - y1));
                }
            }
            xs.sort((a, b) => a - b);
            for (let i = 0; i + 1 < xs.length; i += 2) {
                const startX = Math.ceil(xs[i] - 0.5);
                const endX = Math.floor(xs[i + 1] - 0.5);
                for (let x = startX; x <= endX; x++) set(x, y, color);
            }
        }
    };

    return { grid, set, clear, rect, line, disc, poly };
}

function outline(grid, cardinal = false) {
    const out = grid.map((row) => row.slice());
    const dirs = cardinal
        ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    for (let y = 0; y < SPRITE_SIZE; y++) {
        for (let x = 0; x < SPRITE_SIZE; x++) {
            if (grid[y][x]) continue;
            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < SPRITE_SIZE && ny >= 0 && ny < SPRITE_SIZE && grid[ny][nx]) {
                    out[y][x] = INK;
                    break;
                }
            }
        }
    }
    return out;
}

function paintBitmap(p, rows, map) {
    for (let y = 0; y < rows.length && y < SPRITE_SIZE; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length && x < SPRITE_SIZE; x++) {
            const color = map[row[x]];
            if (color) p.set(x, y, color);
        }
    }
}

function toRuns(grid) {
    const runs = [];
    for (let y = 0; y < SPRITE_SIZE; y++) {
        let x = 0;
        while (x < SPRITE_SIZE) {
            const color = grid[y][x];
            if (!color) { x++; continue; }
            let end = x + 1;
            while (end < SPRITE_SIZE && grid[y][end] === color) end++;
            runs.push({ x, y, w: end - x, c: color });
            x = end;
        }
    }
    return runs;
}

/**
 * Four-point star glints, painted after outlining so they stay crisp. Each
 * glint only lands on empty cells, so it can never punch a hole in the art.
 */
function addSparkles(grid) {
    const spots = [[3, 2], [17, 3], [16, 16], [2, 16], [18, 9], [1, 11]];
    const free = (x, y) => y >= 0 && y < SPRITE_SIZE && x >= 0 && x < SPRITE_SIZE && grid[y][x] === null;
    let placed = 0;
    for (const [sx, sy] of spots) {
        if (placed >= 3) break;
        if (!free(sx, sy)) continue;
        grid[sy][sx] = WHITE;
        if (free(sx, sy - 1)) grid[sy - 1][sx] = C.cyan2;
        if (free(sx, sy + 1)) grid[sy + 1][sx] = C.cyan2;
        if (free(sx - 1, sy)) grid[sy][sx - 1] = C.cyan2;
        if (free(sx + 1, sy)) grid[sy][sx + 1] = C.cyan2;
        placed++;
    }
}

function sprite(draw, variant) {
    const canvas = makeCanvas();
    draw(canvas);
    let grid = canvas.grid;
    if (variant) {
        grid = grid.map((row, y) => row.map((c, x) => (c ? tintColor(c, x, y, variant) : null)));
    }
    grid = outline(grid, Boolean(draw.cardinal));
    if (variant === 'Prismatic' || variant === 'Transcendent') addSparkles(grid);
    return toRuns(grid);
}

/* ---------- the icons ---------- */

/** Classic hand-plotted four-leaf clover with four heart leaves and a curved stem. */
const CLOVER_MAP = {
    '4': C.green4,
    '3': C.green3,
    '2': C.green2,
    '1': C.green1,
    '0': C.green0,
};

const CLOVER_ROWS = [
    '....................',
    '.......33.33........',
    '......3443332.......',
    '......3432221.......',
    '.......32221........',
    '...33...221...33....',
    '..3443..121..3332...',
    '..343221120122221...',
    '...3222223122221....',
    '..332221110122211...',
    '..2221..1211.2111...',
    '...11...221.2.11....',
    '.......32221.2......',
    '......3432221.21....',
    '......3322211.12....',
    '.......22.11...21...',
    '................21..',
    '.................1..',
    '....................',
    '....................',
];

function drawClover(p) {
    paintBitmap(p, CLOVER_ROWS, CLOVER_MAP);
}
drawClover.cardinal = true;

/** Classic hand-plotted rounded square die showing a crisp five with a subtle 3D bottom lip. */
const DIE_MAP = {
    W: WHITE,
    B: C.bone2,
    C: C.bone1,
    S: C.steel4,
    D: C.steel2,
    I: INK,
    K: SHADOW,
};

const DIE_ROWS = [
    '....................',
    '....................',
    '...WWWWWWWWWWWWWW...',
    '..WWBBBBBBBBBBBBBC..',
    '..WBBIKBBBBBBIKBBC..',
    '..WBBKKBBBBBBKKBBC..',
    '..WBBBBBBBBBBBBBBC..',
    '..WBBBBBBBBBBBBBBC..',
    '..WBBBBBBIKBBBBBBC..',
    '..WBBBBBBKKBBBBBBC..',
    '..WBBBBBBBBBBBBBBC..',
    '..WBBBBBBBBBBBBBBC..',
    '..WBBIKBBBBBBIKBBC..',
    '..WBBKKBBBBBBKKBBC..',
    '..WBBBBBBBBBBBBBBC..',
    '..CCBBBBBBBBBBBBCC..',
    '..CSSSSSSSSSSSSSSD..',
    '...DDDDDDDDDDDDDD...',
    '....................',
    '....................',
];

function drawDie(p) {
    paintBitmap(p, DIE_ROWS, DIE_MAP);
}
drawDie.cardinal = true;

function drawSlot(p) {
    p.rect(2, 2, 16, 16, C.steel1);
    p.rect(3, 3, 14, 14, C.steel3);
    p.rect(5, 5, 10, 10, INK);
    p.line(3, 3, 16, 3, C.steel5);
    p.line(3, 3, 3, 16, C.steel4);
    p.line(16, 4, 16, 16, C.steel1);

    p.set(4, 4, C.gold3);
    p.set(15, 4, C.gold3);
    p.set(4, 15, C.gold3);
    p.set(15, 15, C.gold3);

    p.rect(6, 6, 8, 2, C.cyan2);
    p.line(13, 8, 9, 14, C.cyan2);
    p.line(12, 8, 8, 14, C.cyan1);
    p.set(6, 6, C.cyan2);

    p.rect(18, 6, 1, 6, C.red2);
    p.set(18, 5, C.red3);
}

function drawNudge(p) {
    p.rect(2, 7, 10, 10, C.blue1);
    p.rect(3, 8, 8, 8, C.blue2);
    p.rect(4, 9, 6, 6, INK);
    p.rect(6, 10, 2, 4, C.cyan2);
    p.set(5, 10, C.cyan2);
    p.set(6, 14, C.cyan2);

    p.rect(14, 5, 3, 9, C.gold3);
    p.poly([[11, 6], [19, 6], [15, 1]], C.gold4);
    p.line(15, 2, 12, 6, C.gold5);
    p.rect(14, 5, 1, 9, C.gold5);
}

function drawCrown(p) {
    p.poly([[3, 13], [2, 5], [6, 9], [10, 3], [14, 9], [18, 5], [17, 13]], C.gold3);
    p.rect(3, 13, 14, 4, C.gold2);
    p.line(3, 13, 16, 13, C.gold4);
    p.line(2, 5, 6, 9, C.gold5);
    p.line(10, 3, 14, 9, C.gold5);
    p.rect(3, 16, 14, 1, C.gold1);

    p.rect(9, 6, 2, 2, C.red2);
    p.rect(5, 10, 2, 2, C.cyan2);
    p.rect(13, 10, 2, 2, C.cyan2);
    p.rect(6, 14, 2, 2, C.red2);
    p.rect(12, 14, 2, 2, C.red2);
}

function drawFlame(p) {
    p.poly([[10, 1], [13, 6], [16, 4], [17, 10], [15, 16], [10, 18], [5, 16], [3, 10], [6, 5], [7, 8]], C.red2);
    p.poly([[10, 5], [12, 9], [14, 8], [14, 12], [12, 16], [9, 17], [6, 14], [6, 10], [8, 8]], C.orange2);
    p.poly([[10, 9], [12, 12], [11, 15], [9, 16], [8, 13], [9, 11]], C.gold4);
    p.rect(9, 12, 2, 2, C.gold5);
    p.set(10, 3, C.red4);
}

function drawBounty(p) {
    p.rect(4, 2, 12, 15, C.bone2);
    p.rect(3, 2, 14, 3, C.bone1);
    p.rect(3, 15, 14, 3, C.bone1);
    p.line(4, 4, 15, 4, WHITE);
    p.line(4, 15, 15, 15, C.bone0);

    p.rect(6, 6, 8, 1, C.steel2);
    p.rect(6, 8, 8, 1, C.steel2);
    p.rect(6, 10, 6, 1, C.steel2);

    p.poly([[10, 11], [13, 13], [13, 16], [10, 18], [7, 16], [7, 13]], C.gold3);
    p.rect(9, 13, 2, 2, C.red2);
    p.set(10, 12, C.gold5);
}

function drawNest(p) {
    p.poly([[10, 2], [13, 5], [14, 9], [12, 12], [8, 12], [6, 9], [7, 5]], C.bone2);
    p.line(8, 4, 10, 3, WHITE);
    p.line(12, 6, 13, 9, C.bone1);

    p.poly([[2, 11], [18, 11], [16, 17], [4, 17]], C.wood1);
    p.line(3, 12, 17, 12, C.wood2);
    p.line(4, 14, 16, 14, C.wood0);
    p.line(5, 16, 15, 16, C.wood2);
    p.line(4, 12, 6, 16, C.wood3);
    p.line(15, 12, 13, 16, C.wood3);
}

function drawBolt(p) {
    p.poly([[11, 1], [4, 11], [9, 11], [7, 19], [16, 8], [11, 8]], C.cyan1);
    p.poly([[11, 3], [6, 10], [10, 10], [8, 16], [14, 9], [10, 9]], C.cyan2);
    p.line(11, 2, 7, 9, C.cyan2);
    p.set(9, 11, C.cyan2);
}

function drawBattery(p) {
    p.rect(2, 5, 14, 12, C.steel2);
    p.rect(3, 6, 12, 10, C.steel4);
    p.rect(16, 8, 2, 6, C.steel3);
    p.rect(4, 7, 10, 8, INK);

    p.rect(5, 8, 2, 6, C.green3);
    p.rect(8, 8, 2, 6, C.green3);
    p.rect(11, 8, 2, 6, C.green3);
    p.line(5, 8, 6, 8, C.green4);
    p.line(8, 8, 9, 8, C.green4);
    p.line(11, 8, 12, 8, C.green4);

    p.poly([[10, 6], [7, 11], [9, 11], [8, 14], [12, 9], [10, 9]], C.gold4);
}

function drawFF(p) {
    p.poly([[2, 4], [9, 10], [2, 16]], C.cyan1);
    p.poly([[9, 4], [16, 10], [9, 16]], C.cyan2);
    p.line(3, 5, 8, 10, C.cyan2);
    p.line(10, 5, 15, 10, C.cyan2);
    p.rect(17, 7, 1, 6, C.blue3);
    p.rect(18, 8, 1, 4, C.blue2);
}

function drawGift(p) {
    p.rect(3, 9, 14, 9, C.red2);
    p.rect(2, 7, 16, 3, C.red3);
    p.rect(9, 7, 2, 11, C.gold3);
    p.line(3, 9, 16, 9, C.red4);
    p.line(3, 17, 16, 17, C.red1);

    p.poly([[9, 7], [5, 3], [3, 5], [5, 7]], C.red3);
    p.poly([[11, 7], [15, 3], [17, 5], [15, 7]], C.red3);
    p.set(5, 4, C.red4);
    p.set(15, 4, C.red4);
    p.rect(9, 6, 2, 2, C.gold4);
}

function drawSpeaker(p) {
    p.poly([[3, 8], [7, 8], [12, 4], [12, 16], [7, 12], [3, 12]], C.steel4);
    p.line(12, 4, 12, 16, C.steel5);
    p.rect(4, 9, 2, 2, C.steel2);
}

function drawSoundOn(p) {
    drawSpeaker(p);
    p.line(14, 7, 16, 9, C.cyan2);
    p.line(16, 9, 14, 11, C.cyan2);
    p.line(16, 5, 18, 9, C.cyan1);
    p.line(18, 9, 16, 13, C.cyan1);
}

function drawSoundOff(p) {
    drawSpeaker(p);
    p.line(14, 7, 18, 11, C.red2);
    p.line(18, 7, 14, 11, C.red2);
    p.line(15, 7, 18, 10, C.red3);
}

function drawLock(p) {
    p.rect(6, 2, 8, 2, C.steel4);
    p.rect(5, 3, 2, 6, C.steel4);
    p.rect(13, 3, 2, 6, C.steel4);
    p.line(6, 2, 13, 2, C.steel5);

    p.rect(4, 8, 12, 10, C.gold3);
    p.rect(5, 9, 10, 8, C.gold4);
    p.line(5, 9, 14, 9, C.gold5);
    p.rect(9, 11, 2, 3, INK);
    p.set(9, 14, INK);
}

function drawCheck(p) {
    p.poly([[3, 10], [7, 14], [17, 4], [19, 6], [7, 18], [1, 12]], C.green2);
    p.poly([[4, 10], [7, 13], [17, 5], [18, 6], [7, 16], [2, 12]], C.green3);
    p.line(7, 14, 17, 4, C.green4);
}

function drawUp(p) {
    p.poly([[10, 2], [17, 9], [13, 9], [13, 18], [7, 18], [7, 9], [3, 9]], C.gold3);
    p.poly([[10, 4], [14, 8], [11, 8], [11, 17], [9, 17], [9, 8], [6, 8]], C.gold4);
    p.line(10, 3, 4, 9, C.gold5);
}

function drawBook(p) {
    p.poly([[2, 4], [9, 6], [9, 17], [2, 15]], C.blue2);
    p.poly([[18, 4], [11, 6], [11, 17], [18, 15]], C.blue3);
    p.rect(9, 6, 2, 11, C.blue0);

    p.line(3, 6, 8, 7, C.bone2);
    p.line(3, 9, 8, 10, C.bone2);
    p.line(3, 12, 8, 13, C.bone2);
    p.line(12, 7, 17, 6, C.bone2);
    p.line(12, 10, 17, 9, C.bone2);
    p.line(12, 13, 17, 12, C.bone2);

    p.rect(13, 4, 2, 5, C.red2);
    p.set(13, 9, C.red3);
}

function drawStar(p) {
    p.poly([[10, 1], [12, 7], [18, 7], [13, 11], [15, 17], [10, 13], [5, 17], [7, 11], [2, 7], [8, 7]], C.gold3);
    p.poly([[10, 4], [11, 8], [15, 8], [12, 11], [13, 15], [10, 12], [7, 15], [8, 11], [5, 8], [9, 8]], C.gold4);
    p.line(10, 2, 8, 7, C.gold5);
    p.set(10, 8, C.gold5);
}

function drawTrophy(p) {
    p.poly([[5, 3], [15, 3], [14, 10], [10, 13], [6, 10]], C.gold3);
    p.line(5, 3, 15, 3, C.gold5);
    p.line(6, 4, 6, 9, C.gold4);
    p.rect(3, 4, 2, 4, C.gold2);
    p.rect(15, 4, 2, 4, C.gold2);
    p.line(3, 8, 6, 9, C.gold2);
    p.line(17, 8, 14, 9, C.gold2);
    p.rect(9, 13, 2, 3, C.gold2);
    p.rect(6, 16, 8, 2, C.gold3);
    p.rect(9, 6, 2, 2, C.gold5);
}

function drawClose(p) {
    p.line(4, 4, 16, 16, C.red2);
    p.line(16, 4, 4, 16, C.red2);
    p.line(5, 4, 16, 15, C.red3);
    p.line(15, 4, 4, 15, C.red3);
    p.line(4, 5, 15, 16, C.red1);
    p.line(16, 5, 5, 16, C.red1);
}

function drawUser(p) {
    p.poly([[7, 2], [13, 2], [15, 5], [15, 8], [13, 10], [7, 10], [5, 8], [5, 5]], C.steel4);
    p.line(7, 2, 13, 2, C.steel5);
    p.rect(8, 5, 2, 2, C.steel2);
    p.rect(11, 5, 2, 2, C.steel2);
    p.poly([[3, 18], [5, 13], [15, 13], [17, 18]], C.blue2);
    p.line(5, 13, 15, 13, C.blue3);
    p.rect(9, 13, 2, 5, C.blue1);
}

function drawSkull(p) {
    p.poly([[5, 2], [15, 2], [18, 6], [17, 12], [14, 14], [14, 17], [6, 17], [6, 14], [3, 12], [2, 6]], C.bone2);
    p.line(5, 2, 15, 2, WHITE);
    p.rect(5, 6, 4, 4, INK);
    p.rect(11, 6, 4, 4, INK);
    p.set(6, 7, C.red2);
    p.set(12, 7, C.red2);
    p.rect(9, 10, 2, 2, INK);
    p.line(7, 14, 7, 17, C.bone0);
    p.line(10, 14, 10, 17, C.bone0);
    p.line(13, 14, 13, 17, C.bone0);
}

function drawCoin(p) {
    p.poly([[6, 1], [13, 1], [18, 6], [18, 13], [13, 18], [6, 18], [1, 13], [1, 6]], C.gold2);
    p.poly([[7, 2], [12, 2], [16, 6], [16, 12], [12, 16], [7, 16], [3, 12], [3, 6]], C.gold3);
    p.poly([[8, 4], [11, 4], [14, 7], [14, 11], [11, 14], [8, 14], [5, 11], [5, 7]], C.gold4);

    p.line(13, 17, 17, 13, C.gold1);
    p.line(14, 16, 16, 14, C.gold0);
    p.line(6, 2, 12, 2, C.gold5);
    p.line(3, 6, 3, 11, C.gold5);
    p.set(4, 4, C.gold5);
    p.set(5, 3, C.gold5);

    p.poly([[8, 5], [11, 5], [13, 7], [13, 11], [11, 13], [8, 13], [6, 11], [6, 7]], C.gold3);

    p.rect(7, 6, 6, 2, C.gold1);
    p.line(12, 8, 8, 12, C.gold1);
    p.line(11, 8, 7, 12, C.gold1);
    p.rect(7, 12, 6, 2, C.gold1);
    p.rect(7, 6, 6, 1, C.gold2);
    p.rect(7, 12, 6, 1, C.gold2);

    p.set(17, 2, C.gold5);
    p.set(18, 3, C.gold5);
    p.set(16, 3, C.gold5);
    p.set(17, 4, C.gold5);
}

/* ---------- registry ---------- */

const BASE = {
    coin: drawCoin,
    clover: drawClover,
    die: drawDie,
    slot: drawSlot,
    nudge: drawNudge,
    crown: drawCrown,
    flame: drawFlame,
    bounty: drawBounty,
    nest: drawNest,
    bolt: drawBolt,
    battery: drawBattery,
    ff: drawFF,
    gift: drawGift,
    soundOn: drawSoundOn,
    soundOff: drawSoundOff,
    lock: drawLock,
    check: drawCheck,
    up: drawUp,
    book: drawBook,
    star: drawStar,
    trophy: drawTrophy,
    close: drawClose,
    user: drawUser,
    skull: drawSkull,
};

/** Only upgrade art gets evolution recolours; UI icons keep their own colours. */
const EVOLVABLE = ['clover', 'die', 'slot', 'nudge', 'crown', 'flame', 'bounty', 'nest', 'bolt', 'battery', 'ff'];

const cache = new Map();
const known = new Set(Object.keys(BASE));

for (const id of EVOLVABLE) {
    for (const suffix of EVOLVE_VARIANTS) {
        if (suffix) known.add(id + suffix);
    }
}

export function getSprite(name) {
    if (!known.has(name)) return getSprite('star');
    if (cache.has(name)) return cache.get(name);

    const match = /^(.*?)(Gold|Rainbow|Prismatic|Transcendent)$/.exec(name);
    const variant = match ? match[2] : '';
    const base = match ? match[1] : name;

    const runs = sprite(BASE[base] ?? drawStar, variant);
    cache.set(name, runs);
    return runs;
}

export function hasSprite(name) {
    return known.has(name);
}
