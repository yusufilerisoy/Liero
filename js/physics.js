// physics.js — Gravity, pixel collision, ground detection

import { GRAVITY, STEP_HEIGHT, PLAYER_RADIUS } from './config.js';
import { clamp } from './utils.js';

export class Physics {
    constructor(terrain) {
        this.terrain = terrain;
    }

    // Apply gravity and movement, return grounded status
    updatePlayer(p, dt) {
        const terrain = this.terrain;

        // Apply gravity
        p.vy += GRAVITY * dt;

        // Horizontal movement
        let newX = p.x + p.vx * dt;
        let newY = p.y + p.vy * dt;

        const r = PLAYER_RADIUS;

        // Horizontal collision with step climbing
        if (p.vx !== 0) {
            const dir = p.vx > 0 ? 1 : -1;
            const checkX = newX + dir * r;
            let blocked = false;

            // Check if horizontal movement is blocked
            for (let dy = -r; dy <= r; dy++) {
                if (terrain.isSolid(checkX, p.y + dy)) {
                    blocked = true;
                    break;
                }
            }

            if (blocked) {
                // Try stepping up (1 to STEP_HEIGHT pixels)
                let stepped = false;
                for (let step = 1; step <= STEP_HEIGHT; step++) {
                    let canStep = true;
                    for (let dy = -r; dy <= r; dy++) {
                        if (terrain.isSolid(checkX, p.y + dy - step)) {
                            canStep = false;
                            break;
                        }
                    }
                    if (canStep) {
                        newY = p.y - step;
                        stepped = true;
                        break;
                    }
                }
                if (!stepped) {
                    newX = p.x; // Can't move horizontally
                }
            }
        }

        // Vertical collision
        p.grounded = false;
        if (p.vy > 0) {
            // Falling — check below
            for (let dx = -r; dx <= r; dx++) {
                if (terrain.isSolid(newX + dx, newY + r)) {
                    newY = Math.floor(newY + r) - r - 0.01;
                    p.vy = 0;
                    p.grounded = true;
                    break;
                }
            }
        } else if (p.vy < 0) {
            // Rising — check above (head collision)
            for (let dx = -r; dx <= r; dx++) {
                if (terrain.isSolid(newX + dx, newY - r)) {
                    newY = Math.ceil(newY - r) + r + 0.01;
                    p.vy = 0;
                    break;
                }
            }
        }

        // Ground check when not moving vertically (standing)
        if (!p.grounded && Math.abs(p.vy) < 1) {
            for (let dx = -r; dx <= r; dx++) {
                if (terrain.isSolid(newX + dx, newY + r + 1)) {
                    p.grounded = true;
                    break;
                }
            }
        }

        p.x = clamp(newX, r + 3, terrain.width - r - 3);
        p.y = clamp(newY, r + 3, terrain.height - r - 3);
    }

    // Gravity only — no terrain collision (used when rope is attached)
    applyGravityOnly(p, dt) {
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.grounded = false;
    }

    // Simple projectile physics (point collision)
    updateProjectile(proj, dt) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.vy += GRAVITY * proj.gravityScale * dt;
    }

    // Check if point is inside terrain
    checkTerrainHit(x, y) {
        return this.terrain.isSolid(x, y);
    }

    // Check if a point hits a player (circle with generous hitbox)
    checkPlayerHit(x, y, player) {
        if (player.dead || player.invulnerable) return false;
        const dx = x - player.x;
        const dy = y - player.y;
        const hitR = PLAYER_RADIUS * 2.5; // generous hitbox for reliable hits
        return (dx * dx + dy * dy) <= hitR * hitR;
    }

    // Swept collision: check if a moving projectile segment hits a player
    checkPlayerHitSwept(x0, y0, x1, y1, player) {
        if (player.dead || player.invulnerable) return false;
        // Closest point on line segment (x0,y0)→(x1,y1) to player center
        const dx = x1 - x0;
        const dy = y1 - y0;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return this.checkPlayerHit(x0, y0, player);
        let t = ((player.x - x0) * dx + (player.y - y0) * dy) / lenSq;
        t = clamp(t, 0, 1);
        const closestX = x0 + t * dx;
        const closestY = y0 + t * dy;
        const cx = closestX - player.x;
        const cy = closestY - player.y;
        const hitR = PLAYER_RADIUS * 2.5;
        return (cx * cx + cy * cy) <= hitR * hitR;
    }

    // Raycast through terrain, returns hit point or null
    raycast(x0, y0, angle, maxDist) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const steps = Math.ceil(maxDist);

        for (let i = 1; i <= steps; i++) {
            const x = x0 + dx * i;
            const y = y0 + dy * i;
            if (this.terrain.isSolid(x, y)) {
                return { x, y, dist: i };
            }
        }
        return null;
    }

    // Raycast that also checks against players
    raycastWithPlayers(x0, y0, angle, maxDist, players, shooterId) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const steps = Math.ceil(maxDist);

        for (let i = 1; i <= steps; i++) {
            const x = x0 + dx * i;
            const y = y0 + dy * i;

            if (this.terrain.isSolid(x, y)) {
                return { x, y, dist: i, type: 'terrain' };
            }

            for (const p of players) {
                if (p.id === shooterId || p.dead || p.invulnerable) continue;
                if (this.checkPlayerHit(x, y, p)) {
                    return { x, y, dist: i, type: 'player', player: p };
                }
            }
        }
        return { x: x0 + dx * maxDist, y: y0 + dy * maxDist, dist: maxDist, type: 'none' };
    }
}
