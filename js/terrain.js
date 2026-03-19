// terrain.js — Destructible terrain using ImageData buffer

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './config.js';
import { noiseSeed, fbm, clamp } from './utils.js';

export class Terrain {
    constructor() {
        this.width = WORLD_WIDTH;
        this.height = WORLD_HEIGHT;
        // Collision map: 0 = air, 1 = dirt, 2 = rock (border)
        this.data = new Uint8Array(this.width * this.height);
        // Offscreen canvas for rendering
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        this.imageData = this.ctx.createImageData(this.width, this.height);
        this.dirty = true;
    }

    generate(seed) {
        noiseSeed(seed || (Math.random() * 99999) | 0);
        const { width, height, data } = this;
        const pixels = this.imageData.data;

        const dirtColors = COLORS.dirt.map(c => this._hexToRgb(c));
        const dirtDarkColors = COLORS.dirtDark.map(c => this._hexToRgb(c));
        const rockColors = COLORS.rock.map(c => this._hexToRgb(c));
        const skyRgb = this._hexToRgb(COLORS.sky);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pi = idx * 4;

                // Border rock
                if (x < 3 || x >= width - 3 || y < 3 || y >= height - 3) {
                    data[idx] = 2;
                    const rc = rockColors[(x * 7 + y * 13) % rockColors.length];
                    pixels[pi] = rc[0]; pixels[pi + 1] = rc[1]; pixels[pi + 2] = rc[2]; pixels[pi + 3] = 255;
                    continue;
                }

                // Multi-octave noise for cave structure
                const nx = x / width;
                const ny = y / height;
                const n = fbm(nx * 6, ny * 6, 5, 2, 0.55);

                // Create caves where noise is below threshold
                // More open near center vertically
                const centerBias = Math.abs(ny - 0.5) * 0.3;
                const threshold = 0.05 + centerBias;

                if (n < threshold) {
                    // Air (cave)
                    data[idx] = 0;
                    pixels[pi] = skyRgb[0]; pixels[pi + 1] = skyRgb[1]; pixels[pi + 2] = skyRgb[2]; pixels[pi + 3] = 255;
                } else {
                    // Dirt
                    data[idx] = 1;
                    // Color variation based on secondary noise
                    const cn = fbm(nx * 12 + 100, ny * 12 + 100, 3, 2, 0.5);
                    let colors = cn > 0.2 ? dirtDarkColors : dirtColors;
                    const ci = ((x * 3 + y * 7) & 0xff) % colors.length;
                    const dc = colors[ci];
                    // Slight per-pixel variation
                    const v = ((x ^ y) & 7) - 3;
                    pixels[pi] = clamp(dc[0] + v, 0, 255);
                    pixels[pi + 1] = clamp(dc[1] + v, 0, 255);
                    pixels[pi + 2] = clamp(dc[2] + v, 0, 255);
                    pixels[pi + 3] = 255;
                }
            }
        }

        this.ctx.putImageData(this.imageData, 0, 0);
        this.dirty = false;
    }

    isSolid(x, y) {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        return this.data[y * this.width + x] !== 0;
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Destroy terrain in a circle
    destroy(cx, cy, radius) {
        cx = Math.round(cx); cy = Math.round(cy);
        const r2 = radius * radius;
        const skyRgb = this._hexToRgb(COLORS.sky);
        const pixels = this.imageData.data;
        const minX = Math.max(3, cx - radius);
        const maxX = Math.min(this.width - 4, cx + radius);
        const minY = Math.max(3, cy - radius);
        const maxY = Math.min(this.height - 4, cy + radius);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= r2) {
                    const idx = y * this.width + x;
                    if (this.data[idx] === 1) { // Only destroy dirt, not rock
                        this.data[idx] = 0;
                        const pi = idx * 4;
                        pixels[pi] = skyRgb[0]; pixels[pi + 1] = skyRgb[1]; pixels[pi + 2] = skyRgb[2];
                    }
                }
            }
        }
        this.dirty = true;
    }

    // Add terrain (dirtball)
    addDirt(cx, cy, radius) {
        cx = Math.round(cx); cy = Math.round(cy);
        const r2 = radius * radius;
        const dirtColors = COLORS.dirt.map(c => this._hexToRgb(c));
        const pixels = this.imageData.data;
        const minX = Math.max(3, cx - radius);
        const maxX = Math.min(this.width - 4, cx + radius);
        const minY = Math.max(3, cy - radius);
        const maxY = Math.min(this.height - 4, cy + radius);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= r2) {
                    const idx = y * this.width + x;
                    if (this.data[idx] === 0) {
                        this.data[idx] = 1;
                        const pi = idx * 4;
                        const dc = dirtColors[(x * 3 + y * 7) % dirtColors.length];
                        const v = ((x ^ y) & 7) - 3;
                        pixels[pi] = clamp(dc[0] + v, 0, 255);
                        pixels[pi + 1] = clamp(dc[1] + v, 0, 255);
                        pixels[pi + 2] = clamp(dc[2] + v, 0, 255);
                    }
                }
            }
        }
        this.dirty = true;
    }

    // Flush pixel changes to offscreen canvas
    flush() {
        if (this.dirty) {
            this.ctx.putImageData(this.imageData, 0, 0);
            this.dirty = false;
        }
    }

    // Find a random open position (for spawning)
    findOpenSpot(radius = 10) {
        for (let attempt = 0; attempt < 200; attempt++) {
            const x = 20 + Math.random() * (this.width - 40);
            const y = 20 + Math.random() * (this.height - 40);
            let open = true;
            for (let dy = -radius; dy <= radius && open; dy++) {
                for (let dx = -radius; dx <= radius && open; dx++) {
                    if (dx * dx + dy * dy <= radius * radius) {
                        if (this.isSolid(x + dx, y + dy)) open = false;
                    }
                }
            }
            // Must have ground below
            if (open && this.isSolid(x, y + radius + 2)) {
                return { x, y };
            }
        }
        // Fallback: dig a spot
        const x = 100 + Math.random() * (this.width - 200);
        const y = this.height / 2;
        this.destroy(x, y, 15);
        return { x, y };
    }

    _hexToRgb(hex) {
        const v = parseInt(hex.slice(1), 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }
}
