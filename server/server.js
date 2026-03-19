// server.js — WebSocket LAN multiplayer server + static file serving

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const TICK_RATE = 20; // Hz
const GRAVITY = 900;
const PLAYER_SPEED = 260;

// Static file server
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const ROOT = path.join(__dirname, '..');

const httpServer = http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

let players = [];
let gameState = null;
let terrainSeed = null;

class ServerPlayer {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.health = 100;
        this.dead = false;
        this.aimAngle = 0;
        this.facing = 1;
        this.weaponIndex = 0;
        this.input = {};
        this.lives = 5;
        this.score = 0;
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            health: this.health,
            dead: this.dead,
            aimAngle: this.aimAngle,
            facing: this.facing,
            weaponIndex: this.weaponIndex,
            lives: this.lives,
            score: this.score,
        };
    }
}

wss.on('connection', (ws) => {
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        ws.close();
        return;
    }

    const id = players.length;
    const player = new ServerPlayer(id, ws);
    players.push(player);

    ws.send(JSON.stringify({ type: 'welcome', playerId: id }));
    console.log(`Player ${id} connected`);

    // Start game when 2 players are connected
    if (players.length === 2) {
        startGame();
    }

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'input') {
                player.input = msg.input || {};
            }
        } catch (e) {}
    });

    ws.on('close', () => {
        console.log(`Player ${id} disconnected`);
        players = players.filter(p => p.id !== id);
        if (gameState) {
            gameState = null;
            // Notify remaining player
            for (const p of players) {
                p.ws.send(JSON.stringify({ type: 'gameEnd', reason: 'disconnect' }));
            }
        }
    });
});

function startGame() {
    terrainSeed = Math.floor(Math.random() * 99999);

    // Generate spawn positions (simplified — clients will use same seed)
    const spawns = [
        { x: 600, y: 400 },
        { x: 2600, y: 400 },
    ];

    const msg = JSON.stringify({
        type: 'gameStart',
        seed: terrainSeed,
        lives: 5,
        spawns,
    });

    for (const p of players) {
        p.x = spawns[p.id].x;
        p.y = spawns[p.id].y;
        p.health = 100;
        p.dead = false;
        p.ws.send(msg);
    }

    gameState = { running: true };
    console.log('Game started! Seed:', terrainSeed);
}

// Server tick
setInterval(() => {
    if (!gameState || players.length < 2) return;

    const dt = 1 / TICK_RATE;

    // Update players based on input
    for (const p of players) {
        if (p.dead) continue;
        const input = p.input;

        // Movement
        let moveX = 0;
        if (input.left) moveX = -1;
        else if (input.right) moveX = 1;
        p.vx = moveX * PLAYER_SPEED;
        p.vy += GRAVITY * dt;

        if (input.left) p.facing = -1;
        if (input.right) p.facing = 1;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Basic bounds (HD world: 3200x1600)
        p.x = Math.max(10, Math.min(3190, p.x));
        p.y = Math.max(10, Math.min(1590, p.y));

        // Aim
        if (input.aimUp) p.aimAngle -= 2.5 * dt;
        if (input.aimDown) p.aimAngle += 2.5 * dt;
        p.aimAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, p.aimAngle));

        if (input.changeWeapon) {
            p.weaponIndex = (p.weaponIndex + 1) % 9;
            input.changeWeapon = false;
        }
    }

    // Broadcast state
    const state = {
        type: 'state',
        players: players.map(p => p.toJSON()),
        tick: Date.now(),
    };
    const msg = JSON.stringify(state);
    for (const p of players) {
        if (p.ws.readyState === 1) {
            p.ws.send(msg);
        }
    }
}, 1000 / TICK_RATE);

httpServer.listen(PORT, () => {
    console.log(`Liero Web Server running at http://localhost:${PORT}`);
    console.log('Waiting for players...');
});
