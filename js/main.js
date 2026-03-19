// main.js — Entry point, game loop with fixed timestep

import { Game } from './game.js';
import { Input } from './input.js';
import { TouchControls } from './touch.js';
import { TICK_RATE } from './config.js';

const canvas = document.getElementById('game');
const input = new Input();
const touch = new TouchControls();
const game = new Game(canvas, input, touch);

input.start();
touch.init();
game.init();
window._game = game; // expose for debugging

let lastTime = performance.now();
let accumulator = 0;

function loop(now) {
    const frameTime = Math.min((now - lastTime) / 1000, 0.1); // Cap to 100ms
    lastTime = now;
    accumulator += frameTime;

    // Fixed timestep updates
    while (accumulator >= TICK_RATE) {
        game.update(TICK_RATE);
        accumulator -= TICK_RATE;
    }

    game.draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
