// bot.js — AI that hunts and kills the player, scaled by difficulty

import { WEAPONS, DIFFICULTY, PLAYER_RADIUS } from './config.js';
import { distance, angleBetween, normalizeAngle, randRange } from './utils.js';

const STATE = {
    HUNT: 0,
    ATTACK: 1,
    DIG: 2,
    ROPE: 3,
};

export class Bot {
    constructor(player, difficulty = 'medium') {
        this.player = player;
        this.diff = DIFFICULTY[difficulty] || DIFFICULTY.medium;
        this.state = STATE.HUNT;
        this.target = null;
        this.stateTimer = 0;
        this.stuckTimer = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.moveDir = 0;
        this.wantFire = false;
        this.wantRope = false;
        this.wantChangeWeapon = false;
        this.aimTarget = 0;
        this.reactionTimer = 0; // delay before reacting to target
        this.targetSeen = false;

        this.input = {
            left: false, right: false, up: false, down: false,
            aimUp: false, aimDown: false, aimUpOnly: false, aimDownOnly: false,
            fire: false, changeWeapon: false, rope: false, jump: false,
        };
    }

    update(dt, players, terrain, physics) {
        const p = this.player;
        if (p.dead) {
            this._clearInput();
            return this.input;
        }

        this.stateTimer += dt;
        this.target = this._findTarget(players);
        if (!this.target) { this._clearInput(); return this.input; }

        // Stuck detection
        if (Math.abs(p.x - this.lastX) < 1 && Math.abs(p.y - this.lastY) < 1) {
            this.stuckTimer += dt;
        } else {
            this.stuckTimer = 0;
        }
        this.lastX = p.x;
        this.lastY = p.y;

        const dist = distance(p.x, p.y, this.target.x, this.target.y);
        const hasLOS = this._hasLineOfSight(physics);

        // Reaction time — bot needs time to "see" the target
        if (hasLOS) {
            if (!this.targetSeen) {
                this.reactionTimer += dt;
                if (this.reactionTimer >= this.diff.reactionTime) {
                    this.targetSeen = true;
                }
            }
        } else {
            this.targetSeen = false;
            this.reactionTimer = 0;
        }

        // Aim at target with error based on difficulty
        const baseAngle = angleBetween(p.x, p.y, this.target.x, this.target.y);

        // Hard mode: lead target (predict movement)
        let leadAngle = baseAngle;
        if (this.diff.leadTarget && this.target.vx !== undefined) {
            const bulletSpeed = WEAPONS[p.weaponIndex].speed || 700;
            const travelTime = dist / bulletSpeed;
            const predictX = this.target.x + this.target.vx * travelTime;
            const predictY = this.target.y + this.target.vy * travelTime * 0.5;
            leadAngle = angleBetween(p.x, p.y, predictX, predictY);
        }

        this.aimTarget = leadAngle + randRange(-this.diff.aimError, this.diff.aimError);

        // Fire only if target is "seen" (reaction time passed) and RNG check
        if (this.targetSeen && hasLOS && Math.random() < this.diff.fireChance) {
            this.wantFire = true;
            if (this.diff.weaponSkill) this._selectWeapon(dist);
            this.state = STATE.ATTACK;
        }

        // Stuck? dig or rope
        if (this.stuckTimer > 0.8) {
            const dy = this.target.y - p.y;
            if (dy < -40 && !p.rope && this.diff.ropeSkill) {
                this.state = STATE.ROPE;
            } else if (Math.random() < this.diff.digFrequency) {
                this.state = STATE.DIG;
            } else {
                // Easy bots just wander when stuck
                this.moveDir = Math.random() < 0.5 ? -1 : 1;
                this.state = STATE.HUNT;
            }
            this.stuckTimer = 0;
            this.stateTimer = 0;
        }

        // No LOS and not stuck — hunt
        if (!hasLOS && this.stuckTimer === 0 && this.state === STATE.ATTACK) {
            this.state = STATE.HUNT;
            this.stateTimer = 0;
        }

        switch (this.state) {
            case STATE.HUNT: this._hunt(dt, terrain, physics, dist); break;
            case STATE.ATTACK: this._attack(dt, physics, dist); break;
            case STATE.DIG: this._dig(dt); break;
            case STATE.ROPE: this._rope(dt, terrain); break;
        }

        this._buildInput(dt);
        return this.input;
    }

    _clearInput() {
        const inp = this.input;
        inp.left = inp.right = inp.up = inp.down = false;
        inp.aimUp = inp.aimDown = inp.aimUpOnly = inp.aimDownOnly = false;
        inp.fire = inp.changeWeapon = inp.rope = inp.jump = false;
    }

    _findTarget(players) {
        let best = null, bestDist = Infinity;
        for (const p of players) {
            if (p.id === this.player.id || p.dead) continue;
            const d = distance(this.player.x, this.player.y, p.x, p.y);
            if (d < bestDist) { bestDist = d; best = p; }
        }
        return best;
    }

    _hasLineOfSight(physics) {
        if (!this.target) return false;
        const angle = angleBetween(this.player.x, this.player.y, this.target.x, this.target.y);
        const dist = distance(this.player.x, this.player.y, this.target.x, this.target.y);
        const hit = physics.raycast(this.player.x, this.player.y, angle, dist);
        return !hit || hit.dist >= dist - PLAYER_RADIUS;
    }

    _hunt(dt, terrain, physics, dist) {
        const p = this.player;
        const dx = this.target.x - p.x;
        const dy = this.target.y - p.y;

        // Chase/retreat based on difficulty distance settings
        if (dist < this.diff.retreatDistance) {
            this.moveDir = dx > 0 ? -1 : 1; // retreat
        } else {
            this.moveDir = dx > 0 ? 1 : -1; // chase
        }

        // Jump to climb terrain
        if (p.grounded) {
            this.input.jump = true;
        }

        // Target above? rope (if skilled enough)
        if (dy < -60 && !p.rope && dist > 60 && this.diff.ropeSkill) {
            this.state = STATE.ROPE;
            this.stateTimer = 0;
            return;
        }

        // Fire toward target while hunting (dig through terrain)
        if (Math.random() < this.diff.digFrequency) {
            this.wantFire = true;
            if (this.diff.weaponSkill) this._selectWeapon(dist);
        }
    }

    _attack(dt, physics, dist) {
        const p = this.player;
        const dx = this.target.x - p.x;

        // Keep fighting distance based on difficulty
        if (dist < this.diff.retreatDistance) {
            this.moveDir = dx > 0 ? -1 : 1; // retreat
        } else if (dist > this.diff.chaseDistance) {
            this.moveDir = dx > 0 ? 1 : -1; // chase
        } else {
            // Strafe randomly at optimal range
            if (Math.random() < 0.02) this.moveDir = Math.random() < 0.5 ? -1 : 1;
        }

        this.wantFire = Math.random() < this.diff.fireChance;
        if (this.diff.weaponSkill) this._selectWeapon(dist);

        // Jump/dodge based on difficulty
        if (p.grounded && Math.random() < this.diff.jumpChance) {
            this.input.jump = true;
        }
    }

    _dig(dt) {
        const p = this.player;
        if (!this.target) { this.state = STATE.HUNT; return; }

        this.aimTarget = angleBetween(p.x, p.y, this.target.x, this.target.y);
        this.wantFire = true;
        this.moveDir = this.target.x > p.x ? 1 : -1;

        // Use explosive weapons for digging
        if (this.diff.weaponSkill) {
            const curW = WEAPONS[p.weaponIndex];
            if (curW.type === 'mine' || curW.type === 'beam') {
                this.wantChangeWeapon = true;
            }
        }

        if (p.grounded) this.input.jump = true;

        if (this.stateTimer > 1.5) {
            this.state = STATE.HUNT;
            this.stateTimer = 0;
        }
    }

    _rope(dt, terrain) {
        const p = this.player;
        if (!this.target) { this.state = STATE.HUNT; return; }

        if (this.stateTimer < 0.1 && !p.rope) {
            this.wantRope = true;
            const dy = this.target.y - p.y;
            if (dy < -50) {
                this.aimTarget = angleBetween(p.x, p.y, this.target.x, this.target.y);
            } else {
                this.aimTarget = -Math.PI / 2 + randRange(-0.4, 0.4);
            }
        }

        if (p.rope && p.rope.state === 'attached') {
            this.moveDir = this.target.x > p.x ? 1 : -1;
            this.input.up = true; // reel in
        }

        if (this.stateTimer > 1.2 || (p.grounded && this.stateTimer > 0.2)) {
            if (p.rope) this.wantRope = true;
            this.state = STATE.HUNT;
            this.stateTimer = 0;
        }
    }

    _selectWeapon(dist) {
        const p = this.player;
        let bestIdx = 0;

        if (dist < 60) {
            if (p.ammo[1] > 0) bestIdx = 1;       // shotgun
            else if (p.ammo[5] > 0) bestIdx = 5;   // flamethrower
            else if (p.ammo[2] > 0) bestIdx = 2;   // minigun
        } else if (dist < 150) {
            if (p.ammo[2] > 0) bestIdx = 2;        // minigun
            else if (p.ammo[0] > 0) bestIdx = 0;   // bazooka
            else if (p.ammo[4] > 0) bestIdx = 4;   // rifle
        } else if (dist < 300) {
            if (p.ammo[4] > 0) bestIdx = 4;        // rifle
            else if (p.ammo[0] > 0) bestIdx = 0;   // bazooka
            else if (p.ammo[8] > 0) bestIdx = 8;   // laser
        } else {
            if (p.ammo[0] > 0) bestIdx = 0;        // bazooka
            else if (p.ammo[4] > 0) bestIdx = 4;   // rifle
            else if (p.ammo[3] > 0) bestIdx = 3;   // grenade
        }

        if (p.weaponIndex !== bestIdx && p.ammo[bestIdx] > 0) {
            this.wantChangeWeapon = true;
        }
    }

    _buildInput(dt) {
        const inp = this.input;
        const p = this.player;

        inp.left = this.moveDir < 0;
        inp.right = this.moveDir > 0;

        // Aim speed scaled by difficulty
        const currentAngle = p.getActualAimAngle();
        const diff = normalizeAngle(this.aimTarget - currentAngle);
        const aimThreshold = 0.05 / this.diff.aimSpeed;
        inp.aimUp = diff < -aimThreshold;
        inp.aimDown = diff > aimThreshold;
        inp.aimUpOnly = inp.aimUp;
        inp.aimDownOnly = inp.aimDown;

        inp.fire = this.wantFire;
        inp.changeWeapon = this.wantChangeWeapon;
        inp.rope = this.wantRope;

        this.wantChangeWeapon = false;
        this.wantRope = false;
        this.wantFire = false;
    }
}
