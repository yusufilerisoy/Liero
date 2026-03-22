// config.js — Game constants, weapon definitions, color palettes

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 1600;

export const GRAVITY = 900;        // pixels/s²
export const PLAYER_SPEED = 260;   // pixels/s
export const PLAYER_JUMP = -450;   // pixels/s
export const PLAYER_RADIUS = 12;
export const PLAYER_MAX_HEALTH = 100;
export const AIM_SPEED = 2.5;      // radians/s
export const STEP_HEIGHT = 8;      // max pixels player can climb

export const ROPE_SPEED = 1400;    // hook launch speed
export const ROPE_MAX_LEN = 500;
export const ROPE_MIN_LEN = 50;
export const ROPE_REEL_SPEED = 300;

export const AMMO_REGEN_TIME = 3;  // seconds per ammo unit

export const TICK_RATE = 1 / 60;

export const VIEWPORT_W = 1280;
export const VIEWPORT_H = 720;
export const VIEWPORT_SCALE = 1;

export const RESPAWN_TIME = 2;     // seconds
export const RESPAWN_BLINK = 1.5;  // seconds of invuln blink after spawn

// Colors
export const COLORS = {
    sky: '#1a0a2e',
    dirt: ['#6b4423', '#5a3a1e', '#7a5030', '#4e3018', '#8b6040'],
    dirtDark: ['#4a2f15', '#3d2610', '#553a1e'],
    rock: ['#555555', '#666666', '#4a4a4a'],
    player1: '#00cc00',
    player2: '#cc0000',
    crosshair: '#ffffff',
    blood: ['#cc0000', '#aa0000', '#880000', '#660000'],
    explosion: ['#ffff00', '#ffaa00', '#ff6600', '#ff3300', '#cc0000'],
    smoke: ['#888888', '#999999', '#aaaaaa', '#777777'],
    fire: ['#ffff00', '#ffcc00', '#ff8800', '#ff4400'],
    hud: '#ffffff',
    hudBg: 'rgba(0,0,0,0.6)',
    menu: '#00ff00',
    menuBg: '#0a0a0a',
    menuHighlight: '#ffff00',
};

// Weapon types: projectile, spread, grenade, hitscan, dirtball, mine, beam, flame
export const WEAPONS = [
    {
        name: 'Bazooka',
        type: 'projectile',
        damage: 35,
        speed: 700,
        radius: 60,
        ammo: 5,
        fireRate: 0.8,
        gravity: 0.3,
        trail: 'smoke',
        color: '#ffaa00',
    },
    {
        name: 'Shotgun',
        type: 'spread',
        damage: 12,
        speed: 1200,
        radius: 15,
        ammo: 7,
        fireRate: 0.6,
        gravity: 0,
        pellets: 5,
        spread: 0.15,
        trail: null,
        color: '#ffff00',
    },
    {
        name: 'Minigun',
        type: 'projectile',
        damage: 8,
        speed: 1400,
        radius: 10,
        ammo: 40,
        fireRate: 0.06,
        gravity: 0,
        trail: null,
        color: '#ffff00',
        spread: 0.08,
    },
    {
        name: 'Grenade',
        type: 'grenade',
        damage: 45,
        speed: 600,
        radius: 70,
        ammo: 3,
        fireRate: 1.0,
        gravity: 1.0,
        bounceCount: 3,
        fuseTime: 2.0,
        trail: null,
        color: '#00aa00',
    },
    {
        name: 'Rifle',
        type: 'hitscan',
        damage: 50,
        radius: 8,
        ammo: 3,
        fireRate: 1.2,
        range: 2000,
        trail: null,
        color: '#ffffff',
    },
    {
        name: 'Flamethrower',
        type: 'flame',
        damage: 3,
        speed: 500,
        radius: 20,
        ammo: 50,
        fireRate: 0.03,
        gravity: -0.3,
        lifetime: 0.4,
        trail: null,
        color: '#ff4400',
        spread: 0.2,
    },
    {
        name: 'Dirtball',
        type: 'dirtball',
        damage: 5,
        speed: 700,
        radius: 45,
        ammo: 8,
        fireRate: 0.5,
        gravity: 0.5,
        trail: null,
        color: '#6b4423',
    },
    {
        name: 'Mine',
        type: 'mine',
        damage: 55,
        speed: 500,
        radius: 65,
        ammo: 2,
        fireRate: 1.5,
        gravity: 1.0,
        proximityRadius: 50,
        armTime: 1.0,
        trail: null,
        color: '#888888',
    },
    {
        name: 'Laser',
        type: 'beam',
        damage: 2,
        radius: 25,
        ammo: 30,
        fireRate: 0.02,
        range: 1500,
        trail: null,
        color: '#ff0000',
    },
];

export const DIFFICULTY = {
    easy: {
        aimError: 20 * Math.PI / 180,   // wide aim spread
        reactionTime: 0.6,               // slow to react (seconds)
        fireChance: 0.3,                 // fires 30% of the time when has LOS
        chaseDistance: 200,              // keeps far distance
        retreatDistance: 60,             // retreats only when very close
        jumpChance: 0.01,               // rarely jumps in combat
        weaponSkill: false,             // doesn't pick optimal weapons
        digFrequency: 0.3,             // rarely digs toward player
        ropeSkill: false,              // doesn't use rope well
        aimSpeed: 0.4,                 // slow aim adjustment
    },
    medium: {
        aimError: 8 * Math.PI / 180,
        reactionTime: 0.25,
        fireChance: 0.7,
        chaseDistance: 150,
        retreatDistance: 80,
        jumpChance: 0.05,
        weaponSkill: true,
        digFrequency: 0.6,
        ropeSkill: true,
        aimSpeed: 0.7,
    },
    hard: {
        aimError: 2 * Math.PI / 180,    // near-perfect aim
        reactionTime: 0.05,              // instant reaction
        fireChance: 1.0,                 // always fires when possible
        chaseDistance: 120,              // aggressive chase
        retreatDistance: 50,
        jumpChance: 0.15,               // jumps frequently to dodge
        weaponSkill: true,              // optimal weapon selection
        digFrequency: 0.9,             // aggressively digs to player
        ropeSkill: true,
        aimSpeed: 1.0,                 // fastest aim tracking
        leadTarget: true,              // predicts player movement
    },
};

export const NET_TICK_RATE = 20; // Hz for network updates
