// sprites.js — Sprite sheet loader and verified region mapper
// Sprite sheet: assets/sprites.png (1024x1536)
// All coordinates verified via pixel-level crop inspection

export class SpriteSheet {
    constructor() {
        this.image = null;
        this.loaded = false;
    }

    load() {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.onload = () => {
                this.loaded = true;
                resolve();
            };
            this.image.onerror = reject;
            this.image.src = 'assets/sprites.png';
        });
    }

    draw(ctx, region, dx, dy, dw, dh) {
        if (!this.loaded) return;
        ctx.drawImage(
            this.image,
            region.x, region.y, region.w, region.h,
            dx, dy, dw || region.w, dh || region.h
        );
    }

    drawCentered(ctx, region, cx, cy, w, h) {
        if (!this.loaded) return;
        const dw = w || region.w;
        const dh = h || region.h;
        ctx.drawImage(
            this.image,
            region.x, region.y, region.w, region.h,
            cx - dw / 2, cy - dh / 2, dw, dh
        );
    }

    drawFlipped(ctx, region, cx, cy, w, h) {
        if (!this.loaded) return;
        const dw = w || region.w;
        const dh = h || region.h;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(
            this.image,
            region.x, region.y, region.w, region.h,
            -dw / 2, -dh / 2, dw, dh
        );
        ctx.restore();
    }
}

// ── Verified sprite regions ──────────────────────────────────────────

export const SPRITES = {
    // ── Characters (Row 0, y≈28-236) ──
    wormRed:   { x: 71,  y: 76,  w: 193, h: 158 },
    wormGreen: { x: 790, y: 50,  w: 162, h: 175 },

    // ── Terrain tiles (Row 1, y≈238-350) ──
    terrain_grass1: { x: 44,  y: 238, w: 96,  h: 112 },
    terrain_grass2: { x: 145, y: 238, w: 115, h: 112 },
    terrain_dirt:   { x: 265, y: 240, w: 80,  h: 108 },
    terrain_rocks:  { x: 352, y: 241, w: 113, h: 105 },
    terrain_dark:   { x: 476, y: 241, w: 113, h: 105 },
    terrain_brown:  { x: 597, y: 243, w: 112, h: 102 },
    terrain_gold:   { x: 720, y: 243, w: 114, h: 102 },
    terrain_stone:  { x: 849, y: 246, w: 119, h: 104 },

    // ── Objects (Row 2, y≈354-457) ──
    skull:       { x: 61,  y: 359, w: 129, h: 91 },
    bones:       { x: 195, y: 370, w: 154, h: 80 },
    barrel_gold: { x: 360, y: 365, w: 70,  h: 84 },
    barrel_wood: { x: 443, y: 362, w: 68,  h: 88 },
    barrel_dark: { x: 530, y: 356, w: 68,  h: 98 },
    jar_red:     { x: 609, y: 358, w: 56,  h: 93 },
    crate:       { x: 672, y: 358, w: 97,  h: 93 },
    lava:        { x: 779, y: 354, w: 196, h: 103 },

    // ── Weapons Row 1 — large guns (y≈469-540) ──
    weapon_bazooka:  { x: 60,  y: 469, w: 164, h: 71 },
    weapon_shotgun:  { x: 241, y: 470, w: 145, h: 70 },
    weapon_minigun:  { x: 404, y: 469, w: 183, h: 71 },
    weapon_rifle:    { x: 600, y: 469, w: 160, h: 71 },
    weapon_cannon:   { x: 777, y: 469, w: 198, h: 71 },

    // ── Weapons Row 1b — small guns (y≈535-580) ──
    weapon_small1: { x: 59,  y: 535, w: 159, h: 45 },
    weapon_small2: { x: 239, y: 535, w: 159, h: 45 },
    weapon_small3: { x: 416, y: 535, w: 239, h: 45 },
    weapon_small4: { x: 671, y: 535, w: 147, h: 45 },
    weapon_small5: { x: 837, y: 537, w: 141, h: 43 },

    // ── Weapons Row 2 — flamethrower, laser, etc (y≈580-645) ──
    weapon_flamethrower: { x: 59,  y: 580, w: 159, h: 65 },
    weapon_laser:        { x: 235, y: 580, w: 163, h: 65 },
    weapon_heavy1:       { x: 406, y: 580, w: 252, h: 65 },
    weapon_heavy2:       { x: 672, y: 580, w: 305, h: 65 },

    // ── Grenades / Explosives (y≈640-700) ──
    grenade_green: { x: 109, y: 640, w: 78,  h: 60 },
    grenade_alt:   { x: 207, y: 640, w: 68,  h: 60 },
    mine:          { x: 291, y: 640, w: 76,  h: 60 },
    dynamite_combo:{ x: 381, y: 640, w: 191, h: 60 },
    pistol:        { x: 593, y: 640, w: 87,  h: 60 },
    fuse:          { x: 702, y: 640, w: 254, h: 60 },

    // ── Items (y≈745-815) ──
    item_potion:    { x: 57,  y: 745, w: 81,  h: 70 },
    item_metal:     { x: 152, y: 745, w: 98,  h: 70 },
    item_dynamite:  { x: 260, y: 745, w: 140, h: 70 },
    item_barrel:    { x: 417, y: 745, w: 73,  h: 70 },
    item_sphere:    { x: 504, y: 745, w: 119, h: 70 },
    item_hourglass: { x: 645, y: 745, w: 83,  h: 70 },
    item_ammo:      { x: 752, y: 745, w: 75,  h: 70 },
    item_crate:     { x: 849, y: 758, w: 123, h: 122 },

    // ── Medkit, heart, crates, explosions (y≈885-1040) ──
    medkit:     { x: 64,  y: 885, w: 113, h: 75 },
    heart:      { x: 193, y: 885, w: 77,  h: 75 },
    crate_green:{ x: 289, y: 885, w: 74,  h: 75 },
    crate_stack:{ x: 380, y: 885, w: 75,  h: 75 },
    crate_napalm:{ x: 475, y: 885, w: 77,  h: 75 },

    explosion1: { x: 565, y: 885, w: 122, h: 75 },
    explosion2: { x: 698, y: 885, w: 134, h: 75 },
    explosion3: { x: 843, y: 885, w: 128, h: 75 },

    // ── Big explosions (y≈960-1040) ──
    bloodsplat:    { x: 61,  y: 960, w: 156, h: 80 },
    explosion_big1:{ x: 229, y: 960, w: 123, h: 80 },
    explosion_big2:{ x: 357, y: 960, w: 135, h: 80 },
    explosion_big3:{ x: 496, y: 960, w: 124, h: 80 },
    explosion_big4:{ x: 620, y: 960, w: 130, h: 80 },
    explosion_big5:{ x: 750, y: 960, w: 223, h: 80 },

    // ── UI / Worm faces (y≈1045-1145) ──
    // These are effects, worm expressions, smoke clouds

    // ── Crosshair (y≈1260-1380, right side) ──
    crosshair: { x: 855, y: 1265, w: 105, h: 105 },

    // ── Worm animations (y≈1400-1486) ──
    worm_walk1: { x: 554, y: 1400, w: 90,  h: 76 },
    worm_walk2: { x: 644, y: 1400, w: 92,  h: 76 },
    worm_stand: { x: 744, y: 1400, w: 100, h: 82 },
    worm_aim:   { x: 844, y: 1400, w: 120, h: 82 },
};

// Map weapon indices to sprite keys for the weapon bar
export const WEAPON_SPRITES = [
    'weapon_bazooka',      // 0: Bazooka
    'weapon_shotgun',      // 1: Shotgun
    'weapon_minigun',      // 2: Minigun
    'grenade_green',       // 3: Grenade
    'weapon_rifle',        // 4: Rifle
    'weapon_flamethrower', // 5: Flamethrower
    'weapon_cannon',       // 6: Dirtball (cannon sprite)
    'mine',                // 7: Mine
    'weapon_laser',        // 8: Laser
];

// Explosion sprite sequence (small to large)
export const EXPLOSION_SPRITES = [
    'explosion1', 'explosion2', 'explosion3',
    'explosion_big1', 'explosion_big2', 'explosion_big3',
    'explosion_big4', 'explosion_big5',
];
