// utils.js — Helper functions: noise, math, geometry

export function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

export function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

export function randRange(min, max) {
    return min + Math.random() * (max - min);
}

export function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

// Simple 2D Perlin-ish noise (value noise with smoothstep)
const NOISE_SIZE = 256;
const _perm = new Uint8Array(NOISE_SIZE * 2);
const _grad = new Float32Array(NOISE_SIZE);

export function noiseSeed(seed) {
    // Simple LCG seeded RNG
    let s = seed | 0;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    for (let i = 0; i < NOISE_SIZE; i++) {
        _perm[i] = i;
        _grad[i] = rng() * 2 - 1;
    }
    // Fisher-Yates shuffle
    for (let i = NOISE_SIZE - 1; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        const tmp = _perm[i]; _perm[i] = _perm[j]; _perm[j] = tmp;
    }
    for (let i = 0; i < NOISE_SIZE; i++) _perm[i + NOISE_SIZE] = _perm[i];
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

export function noise2D(x, y) {
    const X = Math.floor(x) & (NOISE_SIZE - 1);
    const Y = Math.floor(y) & (NOISE_SIZE - 1);
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = _grad[_perm[X + _perm[Y]]];
    const ab = _grad[_perm[X + _perm[Y + 1]]];
    const ba = _grad[_perm[X + 1 + _perm[Y]]];
    const bb = _grad[_perm[X + 1 + _perm[Y + 1]]];

    return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
}

// Fractal Brownian Motion
export function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let sum = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        sum += noise2D(x * freq, y * freq) * amp;
        maxAmp += amp;
        amp *= gain;
        freq *= lacunarity;
    }
    return sum / maxAmp;
}

// Bresenham line — calls callback(x, y) for each pixel
export function bresenhamLine(x0, y0, x1, y1, cb) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
        if (cb(x0, y0) === false) return false;
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return true;
}
