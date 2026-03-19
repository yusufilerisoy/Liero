// rope.js — Ninja rope with verlet simulation (HD scaled)

import { ROPE_SPEED, ROPE_MAX_LEN, ROPE_MIN_LEN, ROPE_REEL_SPEED, PLAYER_RADIUS, GRAVITY } from './config.js';
import { distance, clamp } from './utils.js';

// Check if a circle overlaps any solid terrain — 16 points around edge + center
function circleHitsTerrain(terrain, cx, cy, r) {
    if (terrain.isSolid(cx, cy)) return true;
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        if (terrain.isSolid(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) return true;
    }
    // Also check at half radius
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        if (terrain.isSolid(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5)) return true;
    }
    return false;
}

export class Rope {
    constructor(player) {
        this.player = player;
        this.state = 'idle'; // idle, flying, attached
        this.hookX = 0;
        this.hookY = 0;
        this.hookVx = 0;
        this.hookVy = 0;
        this.length = 0;
        this.targetLength = 0;
    }

    launch(angle) {
        if (this.state !== 'idle') {
            this.release();
            return;
        }
        this.state = 'flying';
        this.hookX = this.player.x;
        this.hookY = this.player.y;
        this.hookVx = Math.cos(angle) * ROPE_SPEED;
        this.hookVy = Math.sin(angle) * ROPE_SPEED;
    }

    release() {
        this.state = 'idle';
        this.player.rope = null;
    }

    update(dt, terrain, input) {
        if (this.state === 'idle') return;

        if (this.state === 'flying') {
            // Move hook
            this.hookX += this.hookVx * dt;
            this.hookY += this.hookVy * dt;
            this.hookVy += 400 * dt; // Gravity on hook (scaled for HD)

            // Check terrain hit
            if (terrain.isSolid(this.hookX, this.hookY)) {
                this.state = 'attached';
                this.length = distance(this.player.x, this.player.y, this.hookX, this.hookY);
                this.targetLength = this.length;
                return;
            }

            // Too far → cancel
            if (distance(this.player.x, this.player.y, this.hookX, this.hookY) > ROPE_MAX_LEN) {
                this.release();
                return;
            }

            // Out of bounds → cancel
            if (!terrain.isInBounds(this.hookX, this.hookY)) {
                this.release();
                return;
            }
        }

        if (this.state === 'attached') {
            // Save state before rope physics for terrain rollback
            const savedX = this.player.x;
            const savedY = this.player.y;
            const savedVx = this.player.vx;
            const savedVy = this.player.vy;
            const savedLength = this.targetLength;

            // Reel in/out — only W/S (up/down), not Q/E (aim)
            if (input.up) {
                this.targetLength -= ROPE_REEL_SPEED * dt;
            }
            if (input.down) {
                this.targetLength += ROPE_REEL_SPEED * dt;
            }
            this.targetLength = clamp(this.targetLength, ROPE_MIN_LEN, ROPE_MAX_LEN);

            // Apply reduced gravity (35% of normal — rope absorbs the rest)
            this.player.vy += GRAVITY * 0.35 * dt;

            // Swing force — A/D apply horizontal force directly
            const swingForce = 1200;
            if (input.left) {
                this.player.vx -= swingForce * dt;
            }
            if (input.right) {
                this.player.vx += swingForce * dt;
            }

            // Move player by velocity
            this.player.x += this.player.vx * dt;
            this.player.y += this.player.vy * dt;

            const dx = this.player.x - this.hookX;
            const dy = this.player.y - this.hookY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                // RIGID distance constraint
                const diff = dist - this.targetLength;
                this.player.x -= nx * diff;
                this.player.y -= ny * diff;

                // Remove radial velocity — only tangential survives
                const radialVel = this.player.vx * nx + this.player.vy * ny;
                this.player.vx -= nx * radialVel;
                this.player.vy -= ny * radialVel;

                // Terrain collision — slide along surface instead of full stop
                if (circleHitsTerrain(terrain, this.player.x, this.player.y, PLAYER_RADIUS * 0.8)) {
                    // Try keeping just X movement
                    const tryX = this.player.x;
                    const tryY = this.player.y;

                    // Try horizontal only
                    this.player.x = tryX;
                    this.player.y = savedY;
                    if (circleHitsTerrain(terrain, this.player.x, this.player.y, PLAYER_RADIUS * 0.8)) {
                        // Try vertical only
                        this.player.x = savedX;
                        this.player.y = tryY;
                        if (circleHitsTerrain(terrain, this.player.x, this.player.y, PLAYER_RADIUS * 0.8)) {
                            // Both blocked — revert but keep some momentum
                            this.player.x = savedX;
                            this.player.y = savedY;
                            this.player.vx *= -0.3;
                            this.player.vy *= -0.3;
                        } else {
                            // Vertical OK, kill horizontal
                            this.player.vx *= 0.2;
                        }
                    } else {
                        // Horizontal OK, kill vertical
                        this.player.vy *= 0.2;
                    }
                }
            }

            // Check if hook detached (terrain destroyed under it)
            if (!terrain.isSolid(this.hookX, this.hookY)) {
                this.release();
            }
        }
    }

    draw(ctx, camX, camY) {
        if (this.state === 'idle') return;

        const px = this.player.x - camX;
        const py = this.player.y - camY;
        const hx = this.hookX - camX;
        const hy = this.hookY - camY;

        // Rope shadow/glow
        ctx.strokeStyle = 'rgba(170,170,170,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Rope line
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Hook
        if (this.state === 'attached') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            // Flying hook
            ctx.fillStyle = '#dddddd';
            ctx.beginPath();
            ctx.arc(hx, hy, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.lineWidth = 1;
    }
}
