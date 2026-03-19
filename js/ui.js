// ui.js — Menu screens (canvas-based) and game HUD — HD 1280x720

import { COLORS, VIEWPORT_W, VIEWPORT_H, WEAPONS, DIFFICULTY } from './config.js';

export class UI {
    constructor(ctx) {
        this.ctx = ctx;
        this.menuIndex = 0;
        this.settingsIndex = 0;
    }

    drawMainMenu(selected) {
        const ctx = this.ctx;
        this.menuIndex = selected;

        // Background
        ctx.fillStyle = COLORS.menuBg;
        ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

        // Decorative top bar
        const grad = ctx.createLinearGradient(0, 0, VIEWPORT_W, 0);
        grad.addColorStop(0, '#001a00');
        grad.addColorStop(0.5, '#003300');
        grad.addColorStop(1, '#001a00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, VIEWPORT_W, 4);

        // Title
        ctx.fillStyle = COLORS.menu;
        ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LIERO WEB', VIEWPORT_W / 2, 180);

        // Title shadow
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.fillText('LIERO WEB', VIEWPORT_W / 2 + 3, 183);

        // Subtitle
        ctx.font = '20px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('A tribute to the classic 1998 game', VIEWPORT_W / 2, 220);

        // Menu items
        const items = [
            'Single Player (vs Bot)',
            'Local 2 Player',
            'LAN Multiplayer',
            'Settings',
        ];

        ctx.font = '28px "Segoe UI", Arial, sans-serif';
        for (let i = 0; i < items.length; i++) {
            const y = 320 + i * 60;
            if (i === selected) {
                // Highlight background
                ctx.fillStyle = 'rgba(255,255,0,0.08)';
                ctx.beginPath();
                ctx.roundRect(VIEWPORT_W / 2 - 220, y - 30, 440, 48, 8);
                ctx.fill();

                ctx.fillStyle = COLORS.menuHighlight;
                ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
                ctx.fillText('> ' + items[i] + ' <', VIEWPORT_W / 2, y);
                ctx.font = '28px "Segoe UI", Arial, sans-serif';
            } else {
                ctx.fillStyle = COLORS.menu;
                ctx.fillText(items[i], VIEWPORT_W / 2, y);
            }
        }

        // Controls hint
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#555555';
        ctx.fillText('Arrow Keys / Enter to select', VIEWPORT_W / 2, VIEWPORT_H - 70);
        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.fillText('P1: WASD + Q/E aim + LCtrl fire + R weapon + F rope', VIEWPORT_W / 2, VIEWPORT_H - 40);
        ctx.textAlign = 'left';
    }

    drawSettings(settings, selected) {
        const ctx = this.ctx;

        ctx.fillStyle = COLORS.menuBg;
        ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

        // Title
        ctx.fillStyle = COLORS.menu;
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', VIEWPORT_W / 2, 100);

        const items = [
            { label: 'Lives', value: settings.lives, min: 1, max: 20 },
            { label: 'Bots', value: settings.botCount },
            { label: 'Time Limit', value: settings.timeLimit === 0 ? 'None' : settings.timeLimit + 's' },
            { label: 'Bot Difficulty', value: settings.difficulty },
            { label: 'Sound', value: settings.sound ? 'ON' : 'OFF' },
            { label: 'Back', value: '' },
        ];

        for (let i = 0; i < items.length; i++) {
            const y = 200 + i * 60;
            const item = items[i];
            if (i === selected) {
                ctx.fillStyle = 'rgba(255,255,0,0.08)';
                ctx.beginPath();
                ctx.roundRect(VIEWPORT_W / 2 - 260, y - 28, 520, 48, 8);
                ctx.fill();

                ctx.fillStyle = COLORS.menuHighlight;
                ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
                ctx.fillText(`> ${item.label}  ${item.value} <`, VIEWPORT_W / 2, y);
            } else {
                ctx.fillStyle = COLORS.menu;
                ctx.font = '24px "Segoe UI", Arial, sans-serif';
                ctx.fillText(`${item.label}  ${item.value}`, VIEWPORT_W / 2, y);
            }
        }

        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#555555';
        ctx.fillText('Left/Right to change, Enter to confirm', VIEWPORT_W / 2, VIEWPORT_H - 50);
        ctx.textAlign = 'left';
    }

    drawLANMenu(state, ip, port) {
        const ctx = this.ctx;

        ctx.fillStyle = COLORS.menuBg;
        ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

        ctx.fillStyle = COLORS.menu;
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LAN MULTIPLAYER', VIEWPORT_W / 2, 100);

        ctx.font = '22px "Segoe UI", Arial, sans-serif';
        if (state === 'connecting') {
            ctx.fillStyle = '#ffff00';
            ctx.fillText('Connecting...', VIEWPORT_W / 2, 240);
        } else if (state === 'waiting') {
            ctx.fillStyle = COLORS.menu;
            ctx.fillText('Connected! Waiting for opponent...', VIEWPORT_W / 2, 240);
            ctx.fillStyle = '#888888';
            ctx.font = '18px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Server: ${ip}:${port}`, VIEWPORT_W / 2, 280);
        } else if (state === 'error') {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('Connection failed!', VIEWPORT_W / 2, 240);
            ctx.fillStyle = '#888888';
            ctx.font = '18px "Segoe UI", Arial, sans-serif';
            ctx.fillText('Start server: node server/server.js', VIEWPORT_W / 2, 280);
        } else {
            ctx.fillStyle = COLORS.menu;
            ctx.fillText('Run: node server/server.js', VIEWPORT_W / 2, 220);
            ctx.font = '18px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Then connect to ws://${ip || 'localhost'}:${port || 3000}`, VIEWPORT_W / 2, 260);
            ctx.fillStyle = COLORS.menuHighlight;
            ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
            ctx.fillText('> Connect <', VIEWPORT_W / 2, 340);
        }

        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#555555';
        ctx.fillText('Esc to go back', VIEWPORT_W / 2, VIEWPORT_H - 50);
        ctx.textAlign = 'left';
    }

    drawRoundEnd(winner, scores) {
        const ctx = this.ctx;

        // Overlay
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(VIEWPORT_W / 2 - 260, VIEWPORT_H / 2 - 120, 520, 240, 16);
        ctx.fill();

        // Border glow
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(VIEWPORT_W / 2 - 260, VIEWPORT_H / 2 - 120, 520, 240, 16);
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.fillStyle = winner ? winner.color : COLORS.hud;
        ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(winner ? `${winner.name} WINS!` : 'DRAW!', VIEWPORT_W / 2, VIEWPORT_H / 2 - 50);

        ctx.font = '22px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = COLORS.hud;
        if (scores) {
            let y = VIEWPORT_H / 2;
            for (const s of scores) {
                ctx.fillText(`${s.name}: ${s.score} kills`, VIEWPORT_W / 2, y);
                y += 36;
            }
        }

        ctx.font = '18px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Press Enter for next round', VIEWPORT_W / 2, VIEWPORT_H / 2 + 95);
        ctx.textAlign = 'left';
    }

    drawGameOver(winner, scores) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

        ctx.fillStyle = COLORS.menuHighlight;
        ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', VIEWPORT_W / 2, 180);

        ctx.fillStyle = winner ? winner.color : COLORS.hud;
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(winner ? `${winner.name} WINS THE MATCH!` : 'IT\'S A DRAW!', VIEWPORT_W / 2, 250);

        ctx.font = '24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = COLORS.hud;
        if (scores) {
            let y = 330;
            for (const s of scores) {
                ctx.fillText(`${s.name}: ${s.score} kills  (${s.lives} lives left)`, VIEWPORT_W / 2, y);
                y += 44;
            }
        }

        ctx.font = '20px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Press Enter to return to menu', VIEWPORT_W / 2, VIEWPORT_H - 80);
        ctx.textAlign = 'left';
    }
}
