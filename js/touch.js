// touch.js — Mobile touch controls
// Single global touch handler with portrait rotation support

export class TouchControls {
    constructor() {
        this.active = false;
        this.container = null;

        // Left joystick — movement
        this.moveX = 0;
        this.moveY = 0;
        this.moveTouch = null;
        this.moveOriginX = 0;
        this.moveOriginY = 0;

        // Right joystick — aim
        this.aimX = 0;
        this.aimY = 0;
        this.aimTouch = null;
        this.aimOriginX = 0;
        this.aimOriginY = 0;

        // Buttons
        this.fireDown = false;
        this.ropeDown = false;
        this.ropePressedThisFrame = false;
        this.weaponDown = false;
        this.weaponPressedThisFrame = false;
        this.jumpDown = false;
        this.exitDown = false;
        this._tapped = false;

        this._buttonTouches = {};
        this._gameplay = false;
    }

    init() {
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
        this.active = true;
        this._createUI();
        this._bindGlobalTouch();
        this._bindFullscreen();

        document.getElementById('game').addEventListener('touchstart', () => {
            this._tapped = true;
        }, { passive: true });
    }

    _bindFullscreen() {
        const requestFS = () => {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) req.call(el).catch(() => {});
            window.scrollTo(0, 1);
        };
        document.addEventListener('touchstart', requestFS, { once: true, passive: true });
    }

    // Transform screen touch coords to game coords (handles portrait rotation)
    _toGameCoords(clientX, clientY) {
        const isPortrait = window.innerHeight > window.innerWidth;
        if (!isPortrait) {
            return { x: clientX, y: clientY, w: window.innerWidth, h: window.innerHeight };
        }
        // Portrait: CSS rotates 90deg clockwise
        // Screen (x,y) → Game (y, screenH - x)
        return {
            x: clientY,
            y: window.innerHeight - clientX,
            w: window.innerHeight,
            h: window.innerWidth,
        };
    }

    // Transform screen delta to game delta (for joystick movement)
    _toGameDelta(dx, dy) {
        const isPortrait = window.innerHeight > window.innerWidth;
        if (!isPortrait) return { dx, dy };
        return { dx: dy, dy: -dx };
    }

    _createUI() {
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.innerHTML = `
            <div class="joystick-base" id="move-base">
                <div class="joystick-knob" id="move-knob"></div>
            </div>
            <div class="joystick-base" id="aim-base">
                <div class="joystick-knob" id="aim-knob"></div>
            </div>
            <div class="touch-btn-indicators" id="touch-btns">
                <div class="touch-ind exit-ind" id="ind-exit">EXIT</div>
                <div class="touch-ind fire-ind" id="ind-fire">FIRE</div>
                <div class="touch-ind weapon-ind" id="ind-weapon">WPN</div>
                <div class="touch-ind jump-ind" id="ind-jump">JUMP</div>
                <div class="touch-ind rope-ind" id="ind-rope">ROPE</div>
            </div>
        `;
        document.body.appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            #touch-controls {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 1000;
                display: none;
                touch-action: none;
            }
            @media (pointer: coarse) {
                #touch-controls { display: block; }
                #game { cursor: default; }
            }

            .joystick-base {
                position: absolute;
                width: 120px; height: 120px;
                border-radius: 50%;
                background: rgba(255,255,255,0.06);
                border: 2px solid rgba(255,255,255,0.12);
                display: none;
                pointer-events: none;
                z-index: 1000;
            }
            .joystick-base.visible { display: block; }
            .joystick-knob {
                position: absolute;
                width: 50px; height: 50px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.35);
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }

            .touch-btn-indicators {
                position: absolute;
                right: 14px;
                top: 50%;
                transform: translateY(-50%);
                display: none;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                z-index: 1001;
            }
            .touch-btn-indicators.visible { display: flex; }
            .touch-ind {
                width: 58px; height: 42px;
                border-radius: 10px;
                border: 1.5px solid rgba(255,255,255,0.15);
                background: rgba(0,0,0,0.25);
                color: rgba(255,255,255,0.5);
                font-size: 11px; font-weight: bold;
                font-family: "Segoe UI", Arial, sans-serif;
                letter-spacing: 1px;
                display: flex; align-items: center; justify-content: center;
                pointer-events: none;
            }
            .touch-ind.pressed {
                background: rgba(255,255,255,0.2);
                border-color: rgba(255,255,255,0.4);
                color: rgba(255,255,255,0.9);
            }
            .fire-ind {
                height: 48px; font-size: 13px;
                background: rgba(255,40,40,0.2); border-color: rgba(255,40,40,0.35);
                color: rgba(255,120,120,0.7);
            }
            .fire-ind.pressed { background: rgba(255,40,40,0.45); color: #fff; }
            .jump-ind {
                background: rgba(40,200,40,0.12); border-color: rgba(40,200,40,0.2);
                color: rgba(120,255,120,0.5);
            }
            .jump-ind.pressed { background: rgba(40,200,40,0.35); color: #fff; }
            .rope-ind {
                background: rgba(40,140,255,0.12); border-color: rgba(40,140,255,0.2);
                color: rgba(120,180,255,0.5);
            }
            .rope-ind.pressed { background: rgba(40,140,255,0.35); color: #fff; }
            .weapon-ind {
                background: rgba(255,180,40,0.12); border-color: rgba(255,180,40,0.2);
                color: rgba(255,220,120,0.5);
            }
            .weapon-ind.pressed { background: rgba(255,180,40,0.35); color: #fff; }
            .exit-ind {
                width: 48px; height: 32px; font-size: 10px;
                background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12);
                color: rgba(255,255,255,0.35);
                margin-bottom: 6px;
            }
            .exit-ind.pressed { background: rgba(255,80,80,0.3); color: #fff; }

            @media (max-height: 400px) {
                .touch-ind { width: 50px; height: 36px; font-size: 10px; }
                .fire-ind { height: 40px; font-size: 11px; }
                .touch-btn-indicators { gap: 6px; right: 8px; }
                .exit-ind { width: 42px; height: 28px; font-size: 9px; }
            }
        `;
        document.head.appendChild(style);

        this.moveBase = document.getElementById('move-base');
        this.moveKnob = document.getElementById('move-knob');
        this.aimBase = document.getElementById('aim-base');
        this.aimKnob = document.getElementById('aim-knob');
        this._indicators = document.getElementById('touch-btns');
        this._indMap = {
            fire: document.getElementById('ind-fire'),
            weapon: document.getElementById('ind-weapon'),
            jump: document.getElementById('ind-jump'),
            rope: document.getElementById('ind-rope'),
            exit: document.getElementById('ind-exit'),
        };
    }

    _bindGlobalTouch() {
        const maxDist = 50;

        const getZone = (gx, gy, gw, gh) => {
            // Top-right: exit button
            if (gx > gw - 62 && gy < 46) return 'exit';
            // Right edge: action buttons
            if (gx > gw - 70) {
                const btnH = 42;
                const fireH = 48;
                const gap = 10;
                const exitH = 32 + 6 + gap; // exit btn + margin + gap
                const totalH = exitH + fireH + 3 * btnH + 3 * gap;
                const startY = (gh - totalH) / 2 + exitH;
                const relY = gy - startY;
                if (relY >= 0 && relY < fireH) return 'fire';
                if (relY >= fireH + gap && relY < fireH + gap + btnH) return 'weapon';
                if (relY >= fireH + 2 * gap + btnH && relY < fireH + 2 * gap + 2 * btnH) return 'jump';
                if (relY >= fireH + 3 * gap + 2 * btnH && relY < fireH + 3 * gap + 2 * btnH + btnH) return 'rope';
                return 'aim';
            }
            if (gx < gw * 0.4) return 'move';
            return 'aim';
        };

        document.addEventListener('touchstart', (e) => {
            if (!this._gameplay) return;

            for (const t of e.changedTouches) {
                const g = this._toGameCoords(t.clientX, t.clientY);
                const zone = getZone(g.x, g.y, g.w, g.h);

                if (zone === 'move' && this.moveTouch === null) {
                    this.moveTouch = t.identifier;
                    this.moveOriginX = t.clientX;
                    this.moveOriginY = t.clientY;
                    // Position joystick visual in game coords
                    this.moveBase.style.left = (g.x - 60) + 'px';
                    this.moveBase.style.top = (g.y - 60) + 'px';
                    this.moveBase.classList.add('visible');
                } else if (zone === 'aim' && this.aimTouch === null) {
                    this.aimTouch = t.identifier;
                    this.aimOriginX = t.clientX;
                    this.aimOriginY = t.clientY;
                    this.aimBase.style.left = (g.x - 60) + 'px';
                    this.aimBase.style.top = (g.y - 60) + 'px';
                    this.aimBase.classList.add('visible');
                } else if (zone === 'fire') {
                    this.fireDown = true;
                    this._buttonTouches[t.identifier] = 'fire';
                    this._indMap.fire.classList.add('pressed');
                } else if (zone === 'weapon') {
                    this.weaponDown = true;
                    this.weaponPressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'weapon';
                    this._indMap.weapon.classList.add('pressed');
                } else if (zone === 'jump') {
                    this.jumpDown = true;
                    this._buttonTouches[t.identifier] = 'jump';
                    this._indMap.jump.classList.add('pressed');
                } else if (zone === 'rope') {
                    this.ropeDown = true;
                    this.ropePressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'rope';
                    this._indMap.rope.classList.add('pressed');
                } else if (zone === 'exit') {
                    this.exitDown = true;
                    this._buttonTouches[t.identifier] = 'exit';
                    this._indMap.exit.classList.add('pressed');
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    let sdx = t.clientX - this.moveOriginX;
                    let sdy = t.clientY - this.moveOriginY;
                    const gd = this._toGameDelta(sdx, sdy);
                    let dx = gd.dx, dy = gd.dy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                    this.moveX = dx / maxDist;
                    this.moveY = dy / maxDist;
                    this.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                } else if (t.identifier === this.aimTouch) {
                    let sdx = t.clientX - this.aimOriginX;
                    let sdy = t.clientY - this.aimOriginY;
                    const gd = this._toGameDelta(sdx, sdy);
                    let dx = gd.dx, dy = gd.dy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                    this.aimX = dx / maxDist;
                    this.aimY = dy / maxDist;
                    this.aimKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                }
            }
        }, { passive: true });

        const handleEnd = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    this.moveTouch = null;
                    this.moveX = 0; this.moveY = 0;
                    this.moveBase.classList.remove('visible');
                    this.moveKnob.style.transform = 'translate(-50%, -50%)';
                } else if (t.identifier === this.aimTouch) {
                    this.aimTouch = null;
                    this.aimX = 0; this.aimY = 0;
                    this.aimBase.classList.remove('visible');
                    this.aimKnob.style.transform = 'translate(-50%, -50%)';
                } else if (this._buttonTouches[t.identifier]) {
                    const btn = this._buttonTouches[t.identifier];
                    delete this._buttonTouches[t.identifier];
                    if (btn === 'fire') { this.fireDown = false; this._indMap.fire.classList.remove('pressed'); }
                    if (btn === 'weapon') { this.weaponDown = false; this._indMap.weapon.classList.remove('pressed'); }
                    if (btn === 'jump') { this.jumpDown = false; this._indMap.jump.classList.remove('pressed'); }
                    if (btn === 'rope') { this.ropeDown = false; this._indMap.rope.classList.remove('pressed'); }
                    if (btn === 'exit') { this.exitDown = false; this._indMap.exit.classList.remove('pressed'); }
                }
            }
        };
        document.addEventListener('touchend', handleEnd, { passive: true });
        document.addEventListener('touchcancel', handleEnd, { passive: true });
    }

    getInput(ropeAttached) {
        const deadzone = 0.25;
        const mx = Math.abs(this.moveX) > deadzone ? this.moveX : 0;
        const my = Math.abs(this.moveY) > deadzone ? this.moveY : 0;
        const ax = Math.abs(this.aimX) > deadzone ? this.aimX : 0;
        const ay = Math.abs(this.aimY) > deadzone ? this.aimY : 0;

        if (ropeAttached) {
            return {
                left: ax < -deadzone, right: ax > deadzone,
                up: my < -deadzone, down: my > deadzone,
                aimUp: false, aimDown: false, aimUpOnly: false, aimDownOnly: false,
                fire: this.fireDown, changeWeapon: this.weaponPressedThisFrame,
                rope: this.ropeDown, jump: this.jumpDown,
            };
        }
        return {
            left: mx < -deadzone, right: mx > deadzone,
            up: my < -deadzone, down: my > deadzone,
            aimUp: ay < -deadzone, aimDown: ay > deadzone,
            aimUpOnly: ay < -deadzone, aimDownOnly: ay > deadzone,
            fire: this.fireDown, changeWeapon: this.weaponPressedThisFrame,
            rope: this.ropeDown, jump: this.jumpDown || my < -deadzone,
        };
    }

    wasRopePressed() {
        const v = this.ropePressedThisFrame;
        this.ropePressedThisFrame = false;
        return v;
    }

    clearPressed() {
        this.weaponPressedThisFrame = false;
        this.exitDown = false;
    }

    setGameplay(on) {
        this._gameplay = on;
        if (!this.container) return;
        if (this._indicators) this._indicators.classList.toggle('visible', on);
        if (!on) {
            this.moveBase.classList.remove('visible');
            this.aimBase.classList.remove('visible');
        }
    }
}
