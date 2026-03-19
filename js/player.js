// player.js — Worm entity: physics state, health, aiming

import {
    PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_RADIUS,
    AIM_SPEED, WEAPONS, AMMO_REGEN_TIME, RESPAWN_TIME, RESPAWN_BLINK
} from './config.js';
import { clamp, normalizeAngle } from './utils.js';

export class Player {
    constructor(id, color, name) {
        this.id = id;
        this.color = color;
        this.name = name || `P${id + 1}`;
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.health = PLAYER_MAX_HEALTH;
        this.aimAngle = 0; // radians, 0 = right
        this.facing = 1;   // 1 = right, -1 = left
        this.grounded = false;
        this.dead = false;
        this.invulnerable = false;
        this.invulnTimer = 0;
        this.respawnTimer = 0;
        this.score = 0;
        this.lives = 5;

        // Weapon state
        this.weaponIndex = 0;
        this.ammo = WEAPONS.map(w => w.ammo);
        this.ammoTimers = WEAPONS.map(() => 0);
        this.fireTimer = 0;
        this.weaponSwitchCooldown = 0;

        // Rope state
        this.rope = null;

        // Animation
        this.walkFrame = 0;
        this.blinkTimer = 0;
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.health = PLAYER_MAX_HEALTH;
        this.dead = false;
        this.invulnerable = true;
        this.invulnTimer = RESPAWN_BLINK;
        this.respawnTimer = 0;
        this.rope = null;
        this.fireTimer = 0;
    }

    get weapon() {
        return WEAPONS[this.weaponIndex];
    }

    update(input, dt) {
        if (this.dead) {
            this.respawnTimer -= dt;
            return;
        }

        // Invulnerability timer
        if (this.invulnerable) {
            this.invulnTimer -= dt;
            this.blinkTimer += dt;
            if (this.invulnTimer <= 0) {
                this.invulnerable = false;
                this.blinkTimer = 0;
            }
        }

        // Movement — skip vx override when rope is attached (rope handles swing)
        let moveX = 0;
        if (input.left) moveX = -1;
        else if (input.right) moveX = 1;

        if (moveX !== 0) {
            this.facing = moveX;
            this.walkFrame += dt * 8;
        }

        if (!this.rope || this.rope.state !== 'attached') {
            this.vx = moveX * PLAYER_SPEED;
        }

        // Jump (only when grounded and not on rope)
        if (input.jump && this.grounded && (!this.rope || this.rope.state !== 'attached')) {
            this.vy = -450;
        }

        // Aiming — when rope attached, only dedicated aim keys (Q/E)
        const aimUp = (this.rope && this.rope.state === 'attached') ? input.aimUpOnly : input.aimUp;
        const aimDown = (this.rope && this.rope.state === 'attached') ? input.aimDownOnly : input.aimDown;
        if (aimUp) {
            this.aimAngle -= AIM_SPEED * dt;
        }
        if (aimDown) {
            this.aimAngle += AIM_SPEED * dt;
        }
        this.aimAngle = clamp(this.aimAngle, -Math.PI / 2, Math.PI / 2);

        // Weapon switching
        if (this.weaponSwitchCooldown > 0) {
            this.weaponSwitchCooldown -= dt;
        }
        if (input.changeWeapon && this.weaponSwitchCooldown <= 0) {
            this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length;
            this.weaponSwitchCooldown = 0.25;
        }

        // Fire cooldown
        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
        }

        // Ammo regeneration
        for (let i = 0; i < WEAPONS.length; i++) {
            if (this.ammo[i] < WEAPONS[i].ammo) {
                this.ammoTimers[i] += dt;
                if (this.ammoTimers[i] >= AMMO_REGEN_TIME) {
                    this.ammo[i]++;
                    this.ammoTimers[i] = 0;
                }
            }
        }
    }

    canFire() {
        return !this.dead && this.fireTimer <= 0 && this.ammo[this.weaponIndex] > 0;
    }

    fire() {
        if (!this.canFire()) return false;
        this.ammo[this.weaponIndex]--;
        this.fireTimer = this.weapon.fireRate;
        this.ammoTimers[this.weaponIndex] = 0;
        return true;
    }

    takeDamage(amount) {
        if (this.dead || this.invulnerable) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.dead = true;
        this.respawnTimer = RESPAWN_TIME;
        this.rope = null;
        this.lives--;
    }

    needsRespawn() {
        return this.dead && this.respawnTimer <= 0 && this.lives > 0;
    }

    getAimX() {
        return Math.cos(this.aimAngle) * this.facing;
    }

    getAimY() {
        return Math.sin(this.aimAngle);
    }

    getMuzzleX() {
        return this.x + this.getAimX() * (PLAYER_RADIUS + 10);
    }

    getMuzzleY() {
        return this.y + this.getAimY() * (PLAYER_RADIUS + 10);
    }

    getActualAimAngle() {
        if (this.facing < 0) {
            return Math.PI - this.aimAngle;
        }
        return this.aimAngle;
    }
}
