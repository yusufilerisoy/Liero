// projectile.js — Projectile entities and explosion logic

import { WEAPONS, GRAVITY, PLAYER_RADIUS } from './config.js';
import { distance, randRange } from './utils.js';

export class Projectile {
    constructor(x, y, vx, vy, weaponIndex, ownerId) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.weaponIndex = weaponIndex;
        this.ownerId = ownerId;
        this.dead = false;
        this.age = 0;

        const w = WEAPONS[weaponIndex];
        this.gravityScale = w.gravity || 0;
        this.damage = w.damage;
        this.radius = w.radius;
        this.color = w.color;
        this.type = w.type;

        // Grenade specifics
        this.bounceCount = w.bounceCount || 0;
        this.fuseTime = w.fuseTime || 0;

        // Mine specifics
        this.proximityRadius = w.proximityRadius || 0;
        this.armTime = w.armTime || 0;
        this.armed = false;

        // Flame specifics
        this.lifetime = w.lifetime || 999;

        // Trail
        this.trail = w.trail;
    }
}

export class ProjectileSystem {
    constructor(terrain, physics, particles) {
        this.projectiles = [];
        this.mines = [];
        this.terrain = terrain;
        this.physics = physics;
        this.particles = particles;
        this.beams = []; // Active beam visuals (for rendering)
    }

    fire(player) {
        if (!player.fire()) return;

        const w = player.weapon;
        const mx = player.getMuzzleX();
        const my = player.getMuzzleY();
        const angle = player.getActualAimAngle();

        this.particles.muzzleFlash(mx, my, angle);

        switch (w.type) {
            case 'projectile':
            case 'grenade':
            case 'dirtball':
            case 'mine': {
                const spread = w.spread || 0;
                const a = angle + randRange(-spread, spread);
                const vx = Math.cos(a) * w.speed;
                const vy = Math.sin(a) * w.speed;
                const proj = new Projectile(mx, my, vx, vy, player.weaponIndex, player.id);
                if (w.type === 'mine') {
                    this.mines.push(proj);
                } else {
                    this.projectiles.push(proj);
                }
                break;
            }
            case 'spread': {
                for (let i = 0; i < w.pellets; i++) {
                    const a = angle + randRange(-w.spread, w.spread);
                    const spd = w.speed * randRange(0.8, 1.2);
                    const vx = Math.cos(a) * spd;
                    const vy = Math.sin(a) * spd;
                    this.projectiles.push(new Projectile(mx, my, vx, vy, player.weaponIndex, player.id));
                }
                break;
            }
            case 'flame': {
                const a = angle + randRange(-w.spread, w.spread);
                const vx = Math.cos(a) * w.speed + player.vx * 0.3;
                const vy = Math.sin(a) * w.speed + player.vy * 0.3;
                this.projectiles.push(new Projectile(mx, my, vx, vy, player.weaponIndex, player.id));
                break;
            }
            case 'hitscan': {
                this._doHitscan(player, mx, my, angle, w);
                break;
            }
            case 'beam': {
                this._doBeam(player, mx, my, angle, w);
                break;
            }
        }
    }

    _doHitscan(player, mx, my, angle, w) {
        const hit = this.physics.raycastWithPlayers(mx, my, angle, w.range, this._players, player.id);
        if (hit.type === 'player') {
            hit.player.takeDamage(w.damage);
            this.particles.blood(hit.x, hit.y, 10);
        }
        if (hit.type === 'terrain') {
            this.terrain.destroy(hit.x, hit.y, w.radius);
            this.particles.dirtChunks(hit.x, hit.y, w.radius);
        }
        // Visual beam
        this.beams.push({ x1: mx, y1: my, x2: hit.x, y2: hit.y, color: w.color, life: 0.1 });
    }

    _doBeam(player, mx, my, angle, w) {
        const hit = this.physics.raycastWithPlayers(mx, my, angle, w.range, this._players, player.id);
        if (hit.type === 'player') {
            hit.player.takeDamage(w.damage);
            this.particles.blood(hit.x, hit.y, 3);
        }
        if (hit.type === 'terrain') {
            this.terrain.destroy(hit.x, hit.y, w.radius);
        }
        this.beams.push({ x1: mx, y1: my, x2: hit.x, y2: hit.y, color: w.color, life: 0.05 });
    }

    setPlayers(players) {
        this._players = players;
    }

    update(dt) {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.age += dt;

            this.physics.updateProjectile(p, dt);

            // Trail
            if (p.trail === 'smoke') {
                this.particles.smokeTrail(p.x, p.y);
            }
            if (p.type === 'flame') {
                this.particles.fire(p.x, p.y, p.vx * 0.1, p.vy * 0.1);
                if (p.age >= p.lifetime) {
                    p.dead = true;
                }
            }

            // Terrain collision
            if (this.terrain.isSolid(p.x, p.y)) {
                if (p.type === 'grenade' && p.bounceCount > 0) {
                    // Bounce
                    p.bounceCount--;
                    p.vx *= -0.5;
                    p.vy *= -0.5;
                    p.x -= p.vx * dt * 2;
                    p.y -= p.vy * dt * 2;
                } else if (p.type === 'dirtball') {
                    this.terrain.addDirt(p.x, p.y, p.radius);
                    p.dead = true;
                } else {
                    this._explode(p);
                    p.dead = true;
                }
            }

            // Grenade fuse
            if (p.type === 'grenade' && p.age >= p.fuseTime) {
                this._explode(p);
                p.dead = true;
            }

            // Player collision (not owner, not flame hitting owner briefly)
            for (const player of this._players) {
                if (player.id === p.ownerId && p.age < 0.1) continue;
                if (this.physics.checkPlayerHit(p.x, p.y, player)) {
                    if (p.type === 'dirtball') {
                        this.terrain.addDirt(p.x, p.y, p.radius);
                    } else {
                        player.takeDamage(p.damage);
                        this.particles.blood(player.x, player.y, p.damage * 0.5);
                        if (p.type !== 'flame') {
                            this._explode(p);
                        }
                    }
                    p.dead = true;
                    break;
                }
            }

            // Out of bounds
            if (!this.terrain.isInBounds(p.x, p.y)) {
                p.dead = true;
            }
        }

        // Remove dead projectiles
        this.projectiles = this.projectiles.filter(p => !p.dead);

        // Update mines
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const m = this.mines[i];
            m.age += dt;
            this.physics.updateProjectile(m, dt);

            // Stop on terrain
            if (this.terrain.isSolid(m.x, m.y)) {
                m.vx = 0;
                m.vy = 0;
                m.y -= 1;
            }

            if (!m.armed && m.age >= m.armTime) {
                m.armed = true;
            }

            if (m.armed) {
                for (const player of this._players) {
                    if (distance(m.x, m.y, player.x, player.y) < m.proximityRadius && !player.dead) {
                        this._explode(m);
                        m.dead = true;
                        break;
                    }
                }
            }

            if (!this.terrain.isInBounds(m.x, m.y)) {
                m.dead = true;
            }
        }
        this.mines = this.mines.filter(m => !m.dead);

        // Update beams
        for (let i = this.beams.length - 1; i >= 0; i--) {
            this.beams[i].life -= dt;
            if (this.beams[i].life <= 0) {
                this.beams.splice(i, 1);
            }
        }
    }

    _explode(proj) {
        this.terrain.destroy(proj.x, proj.y, proj.radius);
        this.particles.explosion(proj.x, proj.y, proj.radius);
        this.particles.dirtChunks(proj.x, proj.y, proj.radius);

        // Splash damage
        for (const player of this._players) {
            const d = distance(proj.x, proj.y, player.x, player.y);
            if (d < proj.radius + PLAYER_RADIUS) {
                const dmgFactor = 1 - d / (proj.radius + PLAYER_RADIUS);
                player.takeDamage(Math.floor(proj.damage * dmgFactor));
                this.particles.blood(player.x, player.y, 8);
                // Knockback
                if (d > 0) {
                    const nx = (player.x - proj.x) / d;
                    const ny = (player.y - proj.y) / d;
                    player.vx += nx * 400 * dmgFactor;
                    player.vy += ny * 400 * dmgFactor;
                }
            }
        }
    }

    draw(ctx, camX, camY) {
        // Draw projectiles
        for (const p of this.projectiles) {
            if (p.type === 'flame') continue; // Rendered by particles
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, Math.max(4, p.radius / 4), 0, Math.PI * 2);
            ctx.fill();
            // Glow effect for projectiles
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, Math.max(6, p.radius / 3), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw mines
        for (const m of this.mines) {
            ctx.fillStyle = m.armed ? '#ff0000' : '#888888';
            ctx.beginPath();
            ctx.arc(m.x - camX, m.y - camY, 8, 0, Math.PI * 2);
            ctx.fill();
            // Mine border
            ctx.strokeStyle = m.armed ? '#ff4444' : '#aaaaaa';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (m.armed) {
                ctx.strokeStyle = 'rgba(255,0,0,0.25)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(m.x - camX, m.y - camY, m.proximityRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.lineWidth = 1;
        }

        // Draw beams
        for (const b of this.beams) {
            // Outer glow
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 6;
            ctx.globalAlpha = Math.min(0.3, b.life * 6);
            ctx.beginPath();
            ctx.moveTo(b.x1 - camX, b.y1 - camY);
            ctx.lineTo(b.x2 - camX, b.y2 - camY);
            ctx.stroke();
            // Inner beam
            ctx.lineWidth = 3;
            ctx.globalAlpha = Math.min(1, b.life * 20);
            ctx.beginPath();
            ctx.moveTo(b.x1 - camX, b.y1 - camY);
            ctx.lineTo(b.x2 - camX, b.y2 - camY);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
        }
    }

    clear() {
        this.projectiles.length = 0;
        this.mines.length = 0;
        this.beams.length = 0;
    }
}
