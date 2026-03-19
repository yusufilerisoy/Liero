// game.js — Game state machine and orchestrator

import { Terrain } from './terrain.js';
import { Renderer } from './renderer.js';
import { Physics } from './physics.js';
import { Player } from './player.js';
import { ProjectileSystem } from './projectile.js';
import { ParticleSystem } from './particles.js';
import { Rope } from './rope.js';
import { Bot } from './bot.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { NetworkClient } from './network.js';
import { RESPAWN_TIME, WEAPONS, VIEWPORT_SCALE, VIEWPORT_W, PLAYER_RADIUS } from './config.js';

export const GAME_STATE = {
    MENU: 'menu',
    SETTINGS: 'settings',
    LAN_MENU: 'lan_menu',
    PLAYING: 'playing',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
};

export class Game {
    constructor(canvas, input, touch) {
        this.canvas = canvas;
        this.input = input;
        this.touch = touch || null;
        this.renderer = new Renderer(canvas);
        this.terrain = new Terrain();
        this.physics = new Physics(this.terrain);
        this.particles = new ParticleSystem(this.terrain);
        this.projectiles = new ProjectileSystem(this.terrain, this.physics, this.particles);
        this.audio = new Audio();
        this.ui = new UI(this.renderer.ctx);
        this.network = new NetworkClient();

        this.state = GAME_STATE.MENU;
        this.mode = null; // 'single', 'local', 'lan'
        this.players = [];
        this.bots = [];
        this.timeLeft = null;
        this.roundEndTimer = 0;
        this.winner = null;
        this.spriteExplosions = []; // {x, y, radius, life, maxLife}

        // Menu state
        this.menuIndex = 0;
        this.settingsIndex = 0;
        this.lanState = 'idle';

        // Settings
        this.settings = {
            lives: 5,
            timeLimit: 180,
            difficulty: 'medium',
            sound: true,
            botCount: 1,
        };

        // Track previous key states for edge detection
        this._prevKeys = {};

        // Click/touch handler for canvas
        this._menuClicked = -1; // index of clicked menu item
        const handleCanvasClick = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const cx = (clientX - rect.left) * scaleX;
            const cy = (clientY - rect.top) * scaleY;

            if (this.state === GAME_STATE.PLAYING && this.players.length > 0) {
                const idx = this.renderer.getWeaponBarClick(cx, cy);
                if (idx >= 0) {
                    this.players[0].weaponIndex = idx;
                    this.audio.resume();
                    this.audio.menuSelect();
                }
            } else if (this.state === GAME_STATE.MENU) {
                // Menu items: y=320, 60px apart, 4 items, centered width 440
                const menuX = VIEWPORT_W / 2 - 220;
                for (let i = 0; i < 4; i++) {
                    const itemY = 320 + i * 60 - 30;
                    if (cx >= menuX && cx <= menuX + 440 && cy >= itemY && cy <= itemY + 48) {
                        this._menuClicked = i;
                        break;
                    }
                }
            } else if (this.state === GAME_STATE.ROUND_END || this.state === GAME_STATE.GAME_OVER) {
                this._menuClicked = 99; // any tap continues
            }
        };
        this.canvas.addEventListener('click', (e) => handleCanvasClick(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                handleCanvasClick(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    init() {
        this.audio.init();
    }

    _justPressed(code) {
        const down = this.input.isDown(code);
        const was = this._prevKeys[code] || false;
        return down && !was;
    }

    _touchTapped() {
        if (!this.touch || !this.touch.active) return false;
        const v = this.touch._tapped;
        this.touch._tapped = false;
        return v;
    }

    _updatePrevKeys() {
        this._prevKeys = {};
        for (const code of this.input.keys) {
            this._prevKeys[code] = true;
        }
    }

    update(dt) {
        // Show touch controls only during gameplay
        if (this.touch && this.touch.active) {
            this.touch.setGameplay(this.state === GAME_STATE.PLAYING);
        }

        switch (this.state) {
            case GAME_STATE.MENU:
                this._updateMenu(dt);
                break;
            case GAME_STATE.SETTINGS:
                this._updateSettings(dt);
                break;
            case GAME_STATE.LAN_MENU:
                this._updateLANMenu(dt);
                break;
            case GAME_STATE.PLAYING:
                this._updatePlaying(dt);
                break;
            case GAME_STATE.ROUND_END:
                this._updateRoundEnd(dt);
                break;
            case GAME_STATE.GAME_OVER:
                this._updateGameOver(dt);
                break;
        }
        this._updatePrevKeys();
        this.input.clearPressed();
        if (this.touch && this.touch.active) this.touch.clearPressed();
    }

    draw() {
        switch (this.state) {
            case GAME_STATE.MENU:
                this.ui.drawMainMenu(this.menuIndex);
                break;
            case GAME_STATE.SETTINGS:
                this.ui.drawSettings(this.settings, this.settingsIndex);
                break;
            case GAME_STATE.LAN_MENU:
                this.ui.drawLANMenu(this.lanState, 'localhost', 3000);
                break;
            case GAME_STATE.PLAYING:
                this._drawPlaying();
                break;
            case GAME_STATE.ROUND_END:
                this._drawPlaying();
                this.ui.drawRoundEnd(this.winner, this._getScores());
                break;
            case GAME_STATE.GAME_OVER:
                this.ui.drawGameOver(this.winner, this._getScores());
                break;
        }
    }

    // --- Menu ---
    _updateMenu(dt) {
        if (this._justPressed('ArrowUp')) {
            this.menuIndex = (this.menuIndex - 1 + 4) % 4;
            this.audio.menuSelect();
        }
        if (this._justPressed('ArrowDown')) {
            this.menuIndex = (this.menuIndex + 1) % 4;
            this.audio.menuSelect();
        }

        // Direct click/tap on menu item
        if (this._menuClicked >= 0 && this._menuClicked < 4) {
            this.menuIndex = this._menuClicked;
            this._menuClicked = -1;
            this.audio.menuConfirm();
            this.audio.resume();
            this._selectMenuItem();
            return;
        }
        this._menuClicked = -1;

        if (this._justPressed('Enter') || this._justPressed('Space') || this._touchTapped()) {
            this.audio.menuConfirm();
            this.audio.resume();
            this._selectMenuItem();
        }
    }

    _selectMenuItem() {
        switch (this.menuIndex) {
            case 0: this._startGame('single'); break;
            case 1: this._startGame('local'); break;
            case 2: this.state = GAME_STATE.LAN_MENU; break;
            case 3: this.state = GAME_STATE.SETTINGS; this.settingsIndex = 0; break;
        }
    }

    // --- Settings ---
    _updateSettings(dt) {
        const items = ['lives', 'botCount', 'timeLimit', 'difficulty', 'sound', 'back'];

        if (this._justPressed('ArrowUp')) {
            this.settingsIndex = (this.settingsIndex - 1 + items.length) % items.length;
            this.audio.menuSelect();
        }
        if (this._justPressed('ArrowDown')) {
            this.settingsIndex = (this.settingsIndex + 1) % items.length;
            this.audio.menuSelect();
        }

        const item = items[this.settingsIndex];

        if (this._justPressed('ArrowLeft') || this._justPressed('ArrowRight')) {
            const dir = this._justPressed('ArrowRight') ? 1 : -1;
            switch (item) {
                case 'lives':
                    this.settings.lives = Math.max(1, Math.min(20, this.settings.lives + dir));
                    break;
                case 'timeLimit':
                    const opts = [0, 60, 120, 180, 300, 600];
                    const ci = opts.indexOf(this.settings.timeLimit);
                    const ni = Math.max(0, Math.min(opts.length - 1, ci + dir));
                    this.settings.timeLimit = opts[ni];
                    break;
                case 'difficulty':
                    const diffs = ['easy', 'medium', 'hard'];
                    const di = diffs.indexOf(this.settings.difficulty);
                    const ndi = Math.max(0, Math.min(diffs.length - 1, di + dir));
                    this.settings.difficulty = diffs[ndi];
                    break;
                case 'botCount':
                    this.settings.botCount = Math.max(1, Math.min(5, this.settings.botCount + dir));
                    break;
                case 'sound':
                    this.settings.sound = !this.settings.sound;
                    break;
            }
            this.audio.menuSelect();
        }

        if (this._justPressed('Enter') || this._justPressed('Space') || this._touchTapped()) {
            if (item === 'back') {
                this.state = GAME_STATE.MENU;
                this.audio.menuConfirm();
            }
        }
        if (this._justPressed('Escape')) {
            this.state = GAME_STATE.MENU;
        }
    }

    // --- LAN Menu ---
    _updateLANMenu(dt) {
        if (this._justPressed('Escape')) {
            this.network.disconnect();
            this.lanState = 'idle';
            this.state = GAME_STATE.MENU;
            return;
        }

        if (this.lanState === 'idle' && this._justPressed('Enter')) {
            this.lanState = 'connecting';
            this.network.connect('localhost', 3000)
                .then(() => {
                    this.lanState = 'waiting';
                    this.network.onGameStart = (msg) => {
                        this._startLANGame(msg);
                    };
                })
                .catch(() => {
                    this.lanState = 'error';
                    setTimeout(() => { this.lanState = 'idle'; }, 2000);
                });
        }
    }

    // --- Start Game ---
    _startGame(mode) {
        this.mode = mode;
        this.terrain.generate();
        this.particles.clear();
        this.projectiles.clear();
        this.bots = [];

        // Create players
        const p1 = new Player(0, '#00cc00', 'P1');
        p1.lives = this.settings.lives;

        if (mode === 'single') {
            const botColors = ['#cc0000', '#0088ff', '#ff8800', '#cc00cc', '#00cccc'];
            const botNames = ['BOT1', 'BOT2', 'BOT3', 'BOT4', 'BOT5'];
            this.players = [p1];
            for (let i = 0; i < this.settings.botCount; i++) {
                const bot = new Player(i + 1, botColors[i], botNames[i]);
                bot.lives = this.settings.lives;
                this.players.push(bot);
                this.bots.push(new Bot(bot, this.settings.difficulty));
            }
        } else if (mode === 'local') {
            const p2 = new Player(1, '#cc0000', 'P2');
            p2.lives = this.settings.lives;
            this.players = [p1, p2];
        }

        this.projectiles.setPlayers(this.players);

        // Spawn players
        for (const p of this.players) {
            const spot = this.terrain.findOpenSpot();
            p.spawn(spot.x, spot.y);
        }

        this.timeLeft = this.settings.timeLimit > 0 ? this.settings.timeLimit : null;
        this.winner = null;
        this.state = GAME_STATE.PLAYING;
    }

    _startLANGame(msg) {
        this.mode = 'lan';
        this.terrain.generate(msg.seed);
        this.particles.clear();
        this.projectiles.clear();
        this.bots = [];

        const p1 = new Player(0, '#00cc00', 'P1');
        const p2 = new Player(1, '#cc0000', 'P2');
        p1.lives = msg.lives || 5;
        p2.lives = msg.lives || 5;
        this.players = [p1, p2];
        this.projectiles.setPlayers(this.players);

        // Server provides spawn positions
        if (msg.spawns) {
            p1.spawn(msg.spawns[0].x, msg.spawns[0].y);
            p2.spawn(msg.spawns[1].x, msg.spawns[1].y);
        }

        this.state = GAME_STATE.PLAYING;

        // Set up network state updates
        this.network.onStateUpdate = (state) => {
            this._applyNetworkState(state);
        };
        this.network.onTerrainDestroy = (cx, cy, r) => {
            this.terrain.destroy(cx, cy, r);
        };
    }

    // --- Playing ---
    _updatePlaying(dt) {
        if (this._justPressed('Escape')) {
            this.state = GAME_STATE.MENU;
            if (this.mode === 'lan') this.network.disconnect();
            return;
        }

        // Time limit
        if (this.timeLeft !== null) {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this._endRound();
                return;
            }
        }

        // Detect rope toggle — use wasPressed to catch even quick taps
        const touchRopeToggle = this.touch && this.touch.active ? this.touch.wasRopePressed() : false;
        const p1RopeToggle = this.input.wasPressed('KeyF') || touchRopeToggle;
        const p2RopeToggle = this.input.wasPressed('Numpad1') || this.input.wasPressed('NumpadEnter');

        // Update players
        if (this.mode !== 'lan') {
            // Player 1 input — merge keyboard + touch
            const p1Input = this._getP1Input();
            this.players[0].update(p1Input, dt);
            // When rope is attached, rope handles ALL physics (gravity + movement + collision)
            if (!(this.players[0].rope && this.players[0].rope.state === 'attached')) {
                this.physics.updatePlayer(this.players[0], dt);
            }
            this._handleRope(this.players[0], p1Input, dt, p1RopeToggle);
            this._handleFire(this.players[0], p1Input);

            // Player 2 or bot
            if (this.mode === 'local') {
                const p2Input = this.input.getP2();
                this.players[1].update(p2Input, dt);
                if (!(this.players[1].rope && this.players[1].rope.state === 'attached')) {
                    this.physics.updatePlayer(this.players[1], dt);
                }
                this._handleRope(this.players[1], p2Input, dt, p2RopeToggle);
                this._handleFire(this.players[1], p2Input);
            } else if (this.mode === 'single') {
                for (const bot of this.bots) {
                    const botInput = bot.update(dt, this.players, this.terrain, this.physics);
                    const botRopeKey = `_botRopeWas_${bot.player.id}`;
                    const botRopeToggle = botInput.rope && !this[botRopeKey];
                    this[botRopeKey] = botInput.rope;
                    bot.player.update(botInput, dt);
                    if (!(bot.player.rope && bot.player.rope.state === 'attached')) {
                        this.physics.updatePlayer(bot.player, dt);
                    }
                    this._handleRope(bot.player, botInput, dt, botRopeToggle);
                    this._handleFire(bot.player, botInput);
                }
            }
        } else {
            // LAN mode: send input, receive state
            const p1Input = this._getP1Input();
            this.network.sendInput(p1Input);
            // Prediction: update local player
            this.players[this.network.playerId || 0].update(p1Input, dt);
            this.physics.updatePlayer(this.players[this.network.playerId || 0], dt);
        }

        // Player separation — push apart if overlapping
        this._separatePlayers();

        // Update projectiles and particles
        // Hook into explosions for sprite effects
        const origExplode = this.projectiles._explode.bind(this.projectiles);
        this.projectiles._explode = (proj) => {
            origExplode(proj);
            this.spriteExplosions.push({ x: proj.x, y: proj.y, radius: proj.radius, life: 0.4, maxLife: 0.4 });
            if (this.settings.sound) this.audio.explode(proj.radius);
            this.renderer.shake(proj.radius * 0.3);
        };
        this.projectiles.update(dt);
        this.projectiles._explode = origExplode; // restore
        this.particles.update(dt);

        // Update sprite explosions
        for (let i = this.spriteExplosions.length - 1; i >= 0; i--) {
            this.spriteExplosions[i].life -= dt;
            if (this.spriteExplosions[i].life <= 0) {
                this.spriteExplosions.splice(i, 1);
            }
        }

        // Check for respawns
        for (const p of this.players) {
            if (p.needsRespawn()) {
                const spot = this.terrain.findOpenSpot();
                p.spawn(spot.x, spot.y);
            }
            // Death effects
            if (p.dead && p.respawnTimer > RESPAWN_TIME - 0.05) {
                this.particles.deathEffect(p.x, p.y);
                if (this.settings.sound) this.audio.death();
                this.renderer.shake(8);
                // Award score to other player(s)
                for (const other of this.players) {
                    if (other.id !== p.id && !other.dead) {
                        other.score++;
                    }
                }
            }
        }

        // Check round end
        const alive = this.players.filter(p => !p.dead && p.lives > 0);
        const withLives = this.players.filter(p => p.lives > 0);

        if (withLives.length <= 1) {
            this._endRound();
        }

        // Camera — follow P1 only
        this.renderer.updateCamera(this.players, dt, 0);
    }

    _separatePlayers() {
        const minDist = PLAYER_RADIUS * 8; // keep good fighting distance
        for (let i = 0; i < this.players.length; i++) {
            const a = this.players[i];
            if (a.dead) continue;
            for (let j = i + 1; j < this.players.length; j++) {
                const b = this.players[j];
                if (b.dead) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const push = (minDist - dist) * 0.4;
                    a.x -= nx * push;
                    b.x += nx * push;
                }
            }
        }
    }

    _getP1Input() {
        const kb = this.input.getP1();
        if (!this.touch || !this.touch.active) return kb;
        const p1 = this.players[0];
        const ropeAttached = p1 && p1.rope && p1.rope.state === 'attached';
        const tc = this.touch.getInput(ropeAttached);
        return {
            left: kb.left || tc.left,
            right: kb.right || tc.right,
            up: kb.up || tc.up,
            down: kb.down || tc.down,
            aimUp: kb.aimUp || tc.aimUp,
            aimDown: kb.aimDown || tc.aimDown,
            aimUpOnly: kb.aimUpOnly || tc.aimUpOnly,
            aimDownOnly: kb.aimDownOnly || tc.aimDownOnly,
            fire: kb.fire || tc.fire,
            changeWeapon: kb.changeWeapon || tc.changeWeapon,
            rope: kb.rope || tc.rope,
            jump: kb.jump || tc.jump,
        };
    }

    _handleRope(player, input, dt, ropeToggle) {
        if (ropeToggle && !player.dead) {
            if (player.rope) {
                // Release rope — momentum preserved
                player.rope.release();
                player.rope = null;
                return; // Don't launch a new rope in the same press
            } else {
                // Launch rope
                const rope = new Rope(player);
                rope.launch(player.getActualAimAngle());
                player.rope = rope;
                if (this.settings.sound) this.audio.ropeShoot();
            }
        }

        if (player.rope) {
            const prevState = player.rope.state;
            player.rope.update(dt, this.terrain, input);
            if (prevState === 'flying' && player.rope && player.rope.state === 'attached') {
                if (this.settings.sound) this.audio.ropeAttach();
            }
            if (!player.rope || player.rope.state === 'idle') {
                player.rope = null;
            }
        }
    }

    _handleFire(player, input) {
        if (input.fire && player.canFire()) {
            this.projectiles.fire(player);
            if (this.settings.sound) {
                this.audio.shoot(player.weapon.type);
            }
            // Recoil
            const angle = player.getActualAimAngle();
            player.vx -= Math.cos(angle) * 20;
            player.vy -= Math.sin(angle) * 20;
        }
    }

    _applyNetworkState(state) {
        if (!state.players) return;
        for (let i = 0; i < state.players.length; i++) {
            const sp = state.players[i];
            const lp = this.players[i];
            if (!lp || i === this.network.playerId) continue; // Don't override local player
            lp.x = sp.x;
            lp.y = sp.y;
            lp.vx = sp.vx;
            lp.vy = sp.vy;
            lp.health = sp.health;
            lp.dead = sp.dead;
            lp.aimAngle = sp.aimAngle;
            lp.facing = sp.facing;
            lp.weaponIndex = sp.weaponIndex;
        }
    }

    _endRound() {
        const withLives = this.players.filter(p => p.lives > 0);
        if (withLives.length === 1) {
            this.winner = withLives[0];
        } else if (withLives.length === 0) {
            // Both died — highest score wins
            this.winner = this.players.reduce((a, b) => a.score >= b.score ? a : b);
        } else {
            // Time's up — highest score wins
            this.winner = this.players.reduce((a, b) => a.score >= b.score ? a : b);
        }

        // Check if game over (anyone out of lives)
        const anyOut = this.players.some(p => p.lives <= 0);
        if (anyOut) {
            this.state = GAME_STATE.GAME_OVER;
        } else {
            this.state = GAME_STATE.ROUND_END;
            this.roundEndTimer = 3;
        }
    }

    _updateRoundEnd(dt) {
        this.particles.update(dt);
        if (this._justPressed('Enter') || this._justPressed('Space') || this._touchTapped()) {
            this._nextRound();
        }
    }

    _nextRound() {
        this.terrain.generate();
        this.particles.clear();
        this.projectiles.clear();

        for (const p of this.players) {
            const spot = this.terrain.findOpenSpot();
            p.spawn(spot.x, spot.y);
            // Reset ammo
            p.ammo = WEAPONS.map(w => w.ammo);
            p.weaponIndex = 0;
        }

        this.timeLeft = this.settings.timeLimit > 0 ? this.settings.timeLimit : null;
        this.winner = null;
        this.state = GAME_STATE.PLAYING;
    }

    _updateGameOver(dt) {
        if (this._justPressed('Enter') || this._justPressed('Space') || this._touchTapped()) {
            this.state = GAME_STATE.MENU;
            if (this.mode === 'lan') this.network.disconnect();
        }
    }

    _drawPlaying() {
        this.renderer.clear();
        this.renderer.drawTerrain(this.terrain);
        this.projectiles.draw(this.renderer.ctx, this.renderer.camX, this.renderer.camY);
        this.particles.draw(this.renderer.ctx, this.renderer.camX, this.renderer.camY);

        // Draw ropes
        for (const p of this.players) {
            if (p.rope) {
                p.rope.draw(this.renderer.ctx, this.renderer.camX, this.renderer.camY);
            }
        }

        // Sprite explosions
        for (const ex of this.spriteExplosions) {
            const alpha = ex.life / ex.maxLife;
            this.renderer.drawExplosion(ex.x, ex.y, ex.radius, alpha);
        }

        this.renderer.drawPlayers(this.players);
        this.renderer.drawHUD(this.players);
        if (this.timeLeft !== null) {
            this.renderer.drawTimer(this.timeLeft);
        }
        // Weapon bar at bottom
        if (this.players[0]) {
            this.renderer.drawWeaponBar(this.players[0]);
        }
    }

    _getScores() {
        return this.players.map(p => ({
            name: p.name,
            score: p.score,
            lives: p.lives,
            color: p.color,
        }));
    }
}
