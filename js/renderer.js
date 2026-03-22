// renderer.js — Canvas rendering, camera, HUD (HD 1280x720)

import {
    VIEWPORT_W, VIEWPORT_H, VIEWPORT_SCALE, PLAYER_RADIUS,
    WORLD_WIDTH, WORLD_HEIGHT, COLORS, WEAPONS
} from './config.js';
import { clamp, lerp } from './utils.js';
import { SpriteSheet, SPRITES, WEAPON_SPRITES, EXPLOSION_SPRITES } from './sprites.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = VIEWPORT_W;
        this.canvas.height = VIEWPORT_H;
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Camera
        this.camX = 0;
        this.camY = 0;
        this.targetCamX = 0;
        this.targetCamY = 0;

        // Screen shake
        this.shakeAmount = 0;

        // Sprite sheet
        this.sprites = new SpriteSheet();
        this.spritesLoaded = false;
        this.sprites.load().then(() => { this.spritesLoaded = true; }).catch(() => {});
    }

    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    updateCamera(players, dt, followIndex = 0) {
        const barH = 64; // weapon bar height
        const viewH = VIEWPORT_H - barH; // usable game area
        const target = players[followIndex];
        if (target && !target.dead) {
            this.targetCamX = target.x - VIEWPORT_W / 2;
            this.targetCamY = target.y - viewH / 2;
        } else {
            for (const p of players) {
                if (!p.dead) {
                    this.targetCamX = p.x - VIEWPORT_W / 2;
                    this.targetCamY = p.y - viewH / 2;
                    break;
                }
            }
        }

        this.targetCamX = clamp(this.targetCamX, 0, WORLD_WIDTH - VIEWPORT_W);
        this.targetCamY = clamp(this.targetCamY, 0, WORLD_HEIGHT - viewH);

        this.camX = lerp(this.camX, this.targetCamX, 1 - Math.pow(0.01, dt));
        this.camY = lerp(this.camY, this.targetCamY, 1 - Math.pow(0.01, dt));

        if (this.shakeAmount > 0.1) {
            this.camX += (Math.random() - 0.5) * this.shakeAmount;
            this.camY += (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount *= Math.pow(0.001, dt);
        } else {
            this.shakeAmount = 0;
        }
    }

    clear() {
        this.ctx.fillStyle = COLORS.sky;
        this.ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);
    }

    drawTerrain(terrain) {
        terrain.flush();
        this.ctx.drawImage(
            terrain.canvas,
            this.camX, this.camY, VIEWPORT_W, VIEWPORT_H,
            0, 0, VIEWPORT_W, VIEWPORT_H
        );
    }

    drawPlayers(players) {
        const WORM_SIZE = PLAYER_RADIUS * 5; // 60px at radius 12

        for (const p of players) {
            if (p.dead) continue;
            if (p.invulnerable && Math.floor(p.blinkTimer * 10) % 2 === 0) continue;

            const sx = p.x - this.camX;
            const sy = p.y - this.camY;

            // Worm sprite
            if (this.spritesLoaded) {
                const spriteKey = p.id === 0 ? 'wormRed' : 'wormGreen';
                const region = SPRITES[spriteKey];
                if (p.facing > 0) {
                    this.sprites.drawFlipped(this.ctx, region, sx, sy - 4, WORM_SIZE, WORM_SIZE);
                } else {
                    this.sprites.drawCentered(this.ctx, region, sx, sy - 4, WORM_SIZE, WORM_SIZE);
                }
            } else {
                // Fallback
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, PLAYER_RADIUS, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(sx + p.facing * 5, sy - 3, PLAYER_RADIUS - 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Weapon aim line
            const aimLen = PLAYER_RADIUS + 18;
            const ax = Math.cos(p.aimAngle) * p.facing;
            const ay = Math.sin(p.aimAngle);
            this.ctx.strokeStyle = 'rgba(200,200,200,0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(sx + ax * PLAYER_RADIUS, sy + ay * PLAYER_RADIUS);
            this.ctx.lineTo(sx + ax * aimLen, sy + ay * aimLen);
            this.ctx.stroke();

            // Crosshair — procedural circle with cross
            const chDist = aimLen + 20;
            const chX = sx + ax * chDist;
            const chY = sy + ay * chDist;
            const chR = 10;
            this.ctx.strokeStyle = COLORS.crosshair;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(chX, chY, chR, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(chX - chR - 3, chY); this.ctx.lineTo(chX + chR + 3, chY);
            this.ctx.moveTo(chX, chY - chR - 3); this.ctx.lineTo(chX, chY + chR + 3);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }
    }

    drawHUD(players) {
        const ctx = this.ctx;
        const faceSize = 48;
        const hudW = 340;
        const hudH = 90;

        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const hudX = i === 0 ? 12 : VIEWPORT_W - hudW - 12;
            const hudY = 12;
            const textX = hudX + faceSize + 10;

            // Background panel with rounded feel
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.beginPath();
            ctx.roundRect(hudX, hudY, hudW, hudH, 8);
            ctx.fill();

            // Worm face
            if (this.spritesLoaded) {
                const faceKey = p.id === 0 ? 'wormRed' : 'wormGreen';

                this.sprites.draw(ctx, SPRITES[faceKey], hudX + 4, hudY + 4, faceSize, faceSize);
            }

            // Name
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.name, textX, hudY + 20);

            // Lives — hearts
            if (this.spritesLoaded) {
                for (let l = 0; l < Math.min(p.lives, 5); l++) {
                    this.sprites.draw(ctx, SPRITES.heart, textX + 50 + l * 22, hudY + 6, 20, 20);
                }
                if (p.lives > 5) {
                    ctx.fillStyle = COLORS.hud;
                    ctx.font = '14px sans-serif';
                    ctx.fillText(`+${p.lives - 5}`, textX + 50 + 5 * 22, hudY + 20);
                }
            } else {
                ctx.fillStyle = COLORS.hud;
                ctx.font = '14px sans-serif';
                ctx.fillText(`Lives: ${p.lives}`, textX + 60, hudY + 20);
            }

            // Health bar
            const barW = hudW - faceSize - 24;
            const hpRatio = p.health / 100;
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.roundRect(textX, hudY + 28, barW, 12, 4);
            ctx.fill();
            if (hpRatio > 0) {
                ctx.fillStyle = hpRatio > 0.3 ? '#22cc44' : '#dd2222';
                ctx.beginPath();
                ctx.roundRect(textX, hudY + 28, barW * hpRatio, 12, 4);
                ctx.fill();
            }

            // Weapon + ammo
            if (!p.dead) {
                const w = WEAPONS[p.weaponIndex];

                // Weapon icon
                if (this.spritesLoaded && WEAPON_SPRITES[p.weaponIndex]) {
                    const wr = SPRITES[WEAPON_SPRITES[p.weaponIndex]];
                    if (wr) this.sprites.draw(ctx, wr, textX, hudY + 48, 36, 20);
                }
                ctx.fillStyle = w.color;
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText(w.name, textX + 40, hudY + 63);

                // Ammo bar
                const ammoRatio = p.ammo[p.weaponIndex] / w.ammo;
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.roundRect(textX, hudY + 70, barW, 8, 3);
                ctx.fill();
                if (ammoRatio > 0) {
                    ctx.fillStyle = ammoRatio > 0.3 ? '#ddaa00' : '#ff4400';
                    ctx.beginPath();
                    ctx.roundRect(textX, hudY + 70, barW * ammoRatio, 8, 3);
                    ctx.fill();
                }
            }

            // Score
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Score: ${p.score}`, hudX + hudW - 8, hudY + 63);
            ctx.textAlign = 'left';
        }
    }

    drawTimer(timeLeft) {
        if (timeLeft === null || timeLeft === undefined) return;
        const ctx = this.ctx;
        const min = Math.floor(timeLeft / 60);
        const sec = Math.floor(timeLeft % 60);
        const str = `${min}:${sec.toString().padStart(2, '0')}`;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(VIEWPORT_W / 2 - 40, 10, 80, 32, 8);
        ctx.fill();
        ctx.fillStyle = timeLeft < 30 ? '#ff3333' : '#ffffff';
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(str, VIEWPORT_W / 2, 34);
        ctx.textAlign = 'left';
    }

    drawMinimap(players, terrain) {
        const ctx = this.ctx;
        const mapW = 160;
        const mapH = 80;
        const barH = 64;
        const padding = 8;
        const mx = padding;
        const my = VIEWPORT_H - barH - mapH - padding;
        const scaleX = mapW / WORLD_WIDTH;
        const scaleY = mapH / WORLD_HEIGHT;

        // Cache terrain to offscreen canvas (update every 30 frames)
        if (!this._minimapCanvas) {
            this._minimapCanvas = document.createElement('canvas');
            this._minimapCanvas.width = mapW;
            this._minimapCanvas.height = mapH;
            this._minimapFrame = 0;
        }
        if (this._minimapFrame % 30 === 0) {
            const mc = this._minimapCanvas.getContext('2d');
            mc.clearRect(0, 0, mapW, mapH);
            mc.fillStyle = 'rgba(100,80,60,0.6)';
            const step = 10;
            for (let wy = 0; wy < WORLD_HEIGHT; wy += step) {
                for (let wx = 0; wx < WORLD_WIDTH; wx += step) {
                    if (terrain.isSolid(wx, wy)) {
                        mc.fillRect(wx * scaleX, wy * scaleY,
                            Math.max(1, step * scaleX), Math.max(1, step * scaleY));
                    }
                }
            }
        }
        this._minimapFrame++;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.roundRect(mx, my, mapW, mapH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cached terrain
        ctx.drawImage(this._minimapCanvas, mx, my);

        // Camera viewport
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mx + this.camX * scaleX, my + this.camY * scaleY,
            VIEWPORT_W * scaleX, (VIEWPORT_H - barH) * scaleY
        );

        // Players — dot + pulse
        for (const p of players) {
            if (p.dead) continue;
            const px = mx + p.x * scaleX;
            const py = my + p.y * scaleY;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWeaponBar(player) {
        const ctx = this.ctx;
        const barH = 64;
        const barY = VIEWPORT_H - barH;
        const count = WEAPONS.length;
        const slotW = Math.floor(VIEWPORT_W / count);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, barY, VIEWPORT_W, barH);
        // Top border
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, barY, VIEWPORT_W, 1);

        for (let i = 0; i < count; i++) {
            const w = WEAPONS[i];
            const sx = i * slotW;

            // Selected highlight
            if (i === player.weaponIndex) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(sx + 2, barY + 2, slotW - 4, barH - 4);
                ctx.fillStyle = w.color;
                ctx.fillRect(sx, barY, slotW, 3);
            }

            // Weapon sprite icon
            if (this.spritesLoaded && WEAPON_SPRITES[i]) {
                const region = SPRITES[WEAPON_SPRITES[i]];
                if (region) {
                    const iconW = 48;
                    const iconH = 28;
                    const iconX = sx + (slotW - iconW) / 2;
                    const iconY = barY + 6;
                    if (i !== player.weaponIndex) ctx.globalAlpha = 0.45;
                    this.sprites.draw(ctx, region, iconX, iconY, iconW, iconH);
                    ctx.globalAlpha = 1;
                }
            }

            // Weapon name
            ctx.fillStyle = i === player.weaponIndex ? '#ffffff' : '#666666';
            ctx.font = i === player.weaponIndex ? 'bold 11px sans-serif' : '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(w.name, sx + slotW / 2, barY + 44);

            // Ammo bar
            const ammoRatio = player.ammo[i] / w.ammo;
            const abX = sx + 6;
            const abW = slotW - 12;
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.roundRect(abX, barY + 50, abW, 6, 2);
            ctx.fill();
            if (ammoRatio > 0) {
                ctx.fillStyle = ammoRatio > 0.3 ? '#ddaa00' : '#ff4400';
                ctx.beginPath();
                ctx.roundRect(abX, barY + 50, abW * ammoRatio, 6, 2);
                ctx.fill();
            }
        }
        ctx.textAlign = 'left';
    }

    getWeaponBarClick(canvasX, canvasY) {
        const barH = 64;
        const barY = VIEWPORT_H - barH;
        if (canvasY < barY || canvasY > VIEWPORT_H) return -1;
        const count = WEAPONS.length;
        const slotW = Math.floor(VIEWPORT_W / count);
        const idx = Math.floor(canvasX / slotW);
        return idx >= 0 && idx < count ? idx : -1;
    }

    drawExplosion(x, y, radius, alpha) {
        if (!this.spritesLoaded) return;
        const idx = Math.min(Math.floor(radius / 15), EXPLOSION_SPRITES.length - 1);
        const region = SPRITES[EXPLOSION_SPRITES[idx]];
        if (!region) return;
        const size = radius * 3;
        this.ctx.globalAlpha = alpha || 1;
        this.sprites.drawCentered(this.ctx, region, x - this.camX, y - this.camY, size, size);
        this.ctx.globalAlpha = 1;
    }

    drawHealthPickup(x, y) {
        if (!this.spritesLoaded) return;
        this.sprites.drawCentered(this.ctx, SPRITES.heart, x - this.camX, y - this.camY, 24, 24);
    }

    drawMessage(text, sub) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(VIEWPORT_W / 2 - 200, VIEWPORT_H / 2 - 50, 400, 100, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, VIEWPORT_W / 2, VIEWPORT_H / 2 - 5);
        if (sub) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(sub, VIEWPORT_W / 2, VIEWPORT_H / 2 + 28);
        }
        ctx.textAlign = 'left';
    }
}
