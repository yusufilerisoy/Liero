// particles.js — Particle system for visual effects (HD scaled)

import { COLORS } from './config.js';
import { randRange } from './utils.js';

export class Particle {
    constructor(x, y, vx, vy, life, color, size, gravity) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.gravity = gravity || 400;
        this.dead = false;
    }
}

export class ParticleSystem {
    constructor(terrain) {
        this.particles = [];
        this.terrain = terrain;
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Terrain collision
            if (this.terrain.isSolid(p.x, p.y)) {
                p.vx *= -0.3;
                p.vy *= -0.3;
                p.x -= p.vx * dt;
                p.y -= p.vy * dt;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, camX, camY) {
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            const s = p.size * (0.5 + 0.5 * alpha);
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, s / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Explosion effect
    explosion(x, y, radius) {
        const count = Math.floor(radius * 2.5);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randRange(100, 450);
            const color = COLORS.explosion[Math.floor(Math.random() * COLORS.explosion.length)];
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                randRange(0.3, 0.8),
                color,
                randRange(5, 14),
                200
            ));
        }
        // Smoke
        for (let i = 0; i < count / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randRange(40, 160);
            const color = COLORS.smoke[Math.floor(Math.random() * COLORS.smoke.length)];
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 60,
                randRange(0.6, 1.5),
                color,
                randRange(8, 18),
                -40
            ));
        }
    }

    // Dirt chunks flying out
    dirtChunks(x, y, radius) {
        const count = Math.floor(radius * 1.5);
        for (let i = 0; i < count; i++) {
            const angle = randRange(-Math.PI, 0); // Upward bias
            const speed = randRange(160, 500);
            const color = COLORS.dirt[Math.floor(Math.random() * COLORS.dirt.length)];
            this.particles.push(new Particle(
                x + randRange(-radius / 2, radius / 2),
                y + randRange(-radius / 2, radius / 2),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                randRange(0.5, 1.2),
                color,
                randRange(5, 12),
                600
            ));
        }
    }

    // Blood splatter
    blood(x, y, amount) {
        const count = Math.floor(amount);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randRange(60, 300);
            const color = COLORS.blood[Math.floor(Math.random() * COLORS.blood.length)];
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                randRange(0.4, 1.0),
                color,
                randRange(3, 8),
                600
            ));
        }
    }

    // Muzzle flash
    muzzleFlash(x, y, angle) {
        for (let i = 0; i < 8; i++) {
            const a = angle + randRange(-0.3, 0.3);
            const speed = randRange(200, 400);
            this.particles.push(new Particle(
                x, y,
                Math.cos(a) * speed,
                Math.sin(a) * speed,
                randRange(0.05, 0.15),
                '#ffff00',
                randRange(5, 10),
                0
            ));
        }
    }

    // Fire particles (for flamethrower)
    fire(x, y, vx, vy) {
        const color = COLORS.fire[Math.floor(Math.random() * COLORS.fire.length)];
        this.particles.push(new Particle(
            x + randRange(-6, 6),
            y + randRange(-6, 6),
            vx + randRange(-60, 60),
            vy + randRange(-60, 60),
            randRange(0.2, 0.5),
            color,
            randRange(8, 16),
            -200
        ));
    }

    // Smoke trail
    smokeTrail(x, y) {
        const color = COLORS.smoke[Math.floor(Math.random() * COLORS.smoke.length)];
        this.particles.push(new Particle(
            x + randRange(-4, 4),
            y + randRange(-4, 4),
            randRange(-20, 20),
            randRange(-40, -10),
            randRange(0.3, 0.7),
            color,
            randRange(5, 10),
            -20
        ));
    }

    // Death effect
    deathEffect(x, y) {
        this.blood(x, y, 40);
        this.explosion(x, y, 20);
    }

    clear() {
        this.particles.length = 0;
    }
}
