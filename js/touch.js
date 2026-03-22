// touch.js — Mobile touch controls
// Uses a single global touch handler for reliable multi-touch in PWA mode

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
        this._tapped = false;

        // Track active button touches
        this._buttonTouches = {}; // touchId -> buttonName

        // Portrait rotation state
        this._isPortrait = false;
        this._screenW = window.innerWidth;
        this._screenH = window.innerHeight;
    }

    init() {
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
        this.active = true;
        this._createUI();
        this._bindGlobalTouch();
        this._bindFullscreen();
        this._watchOrientation();

        document.getElementById('game').addEventListener('touchstart', () => {
            this._tapped = true;
        }, { passive: true });
    }

    _bindFullscreen() {
        const requestFS = () => {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            if (req) req.call(el).catch(() => {});
            window.scrollTo(0, 1);
        };
        document.addEventListener('touchstart', requestFS, { once: true, passive: true });
    }

    _watchOrientation() {
        const check = () => {
            this._screenW = window.innerWidth;
            this._screenH = window.innerHeight;
            this._isPortrait = this._screenH > this._screenW;
        };
        check();
        window.addEventListener('resize', check);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', check);
        }
    }

    // Transform touch coordinates when in portrait (CSS rotated) mode
    _transformTouch(clientX, clientY) {
        if (!this._isPortrait) {
            return { x: clientX, y: clientY, w: this._screenW, h: this._screenH };
        }
        // In portrait mode, CSS rotates 90deg clockwise
        // Screen is portrait (w < h), but game is displayed landscape
        // Touch coord transform: (x, y) -> (y, screenH - x)
        return {
            x: clientY,
            y: this._screenH - clientX,
            w: this._screenH, // landscape width = portrait height
            h: this._screenW, // landscape height = portrait width
        };
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
            <div class="touch-buttons" id="touch-buttons">
                <button class="touch-btn fire-btn" id="btn-fire">FIRE</button>
                <button class="touch-btn weapon-btn" id="btn-weapon">WPN</button>
                <button class="touch-btn jump-btn" id="btn-jump">JUMP</button>
                <button class="touch-btn rope-btn" id="btn-rope">ROPE</button>
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
            @media (pointer: coarse), (max-width: 1024px) and (orientation: landscape) {
                #touch-controls { display: block; }
                #game { cursor: default; }
            }
            @media (pointer: coarse) and (orientation: portrait) {
                #touch-controls { display: block; }
            }

            .joystick-base {
                position: absolute;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: rgba(255,255,255,0.08);
                border: 2px solid rgba(255,255,255,0.15);
                display: none;
                pointer-events: none;
                z-index: 1000;
            }
            .joystick-base.visible {
                display: block;
            }
            .joystick-knob {
                position: absolute;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: rgba(255,255,255,0.25);
                border: 2px solid rgba(255,255,255,0.4);
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }

            /* Buttons: vertical column, far right, centered vertically */
            .touch-buttons {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                touch-action: none;
                z-index: 1001;
            }
            .touch-btn {
                width: 68px;
                height: 48px;
                border-radius: 14px;
                border: 2px solid rgba(255,255,255,0.25);
                background: rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.8);
                font-size: 13px;
                font-weight: bold;
                font-family: "Segoe UI", Arial, sans-serif;
                letter-spacing: 1px;
                touch-action: none;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .touch-btn.pressed {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
            }
            .fire-btn {
                height: 56px;
                font-size: 15px;
                background: rgba(255,60,60,0.25);
                border-color: rgba(255,60,60,0.5);
            }
            .fire-btn.pressed {
                background: rgba(255,60,60,0.6);
            }
            .jump-btn {
                background: rgba(60,255,60,0.15);
                border-color: rgba(60,255,60,0.3);
            }
            .jump-btn.pressed {
                background: rgba(60,255,60,0.4);
            }
            .rope-btn {
                background: rgba(60,180,255,0.15);
                border-color: rgba(60,180,255,0.3);
            }
            .rope-btn.pressed {
                background: rgba(60,180,255,0.4);
            }
            .weapon-btn {
                background: rgba(255,200,60,0.15);
                border-color: rgba(255,200,60,0.3);
            }
            .weapon-btn.pressed {
                background: rgba(255,200,60,0.4);
            }

            @media (max-height: 400px) {
                .touch-btn { width: 56px; height: 40px; font-size: 11px; }
                .fire-btn { height: 46px; font-size: 12px; }
                .touch-buttons { gap: 6px; right: 4px; }
                .joystick-base { width: 100px; height: 100px; }
                .joystick-knob { width: 42px; height: 42px; }
            }
        `;
        document.head.appendChild(style);

        this.moveBase = document.getElementById('move-base');
        this.moveKnob = document.getElementById('move-knob');
        this.aimBase = document.getElementById('aim-base');
        this.aimKnob = document.getElementById('aim-knob');

        this._buttons = {
            fire: document.getElementById('btn-fire'),
            weapon: document.getElementById('btn-weapon'),
            jump: document.getElementById('btn-jump'),
            rope: document.getElementById('btn-rope'),
        };
    }

    // Single global touch handler — solves multi-touch issues in PWA
    _bindGlobalTouch() {
        const maxDist = 50;

        const getZone = (x, y, w, h) => {
            // Right edge (last 80px) = buttons area
            if (x > w - 80) {
                // Determine which button based on Y
                const btnZoneH = h;
                const btnCount = 4;
                const btnH = 56;
                const gap = 10;
                const totalH = btnCount * btnH + (btnCount - 1) * gap;
                const startY = (btnZoneH - totalH) / 2;
                const relY = y - startY;
                if (relY >= 0 && relY < btnH) return 'fire';
                if (relY >= btnH + gap && relY < 2 * btnH + gap) return 'weapon';
                if (relY >= 2 * (btnH + gap) && relY < 3 * btnH + 2 * gap) return 'jump';
                if (relY >= 3 * (btnH + gap) && relY < 4 * btnH + 3 * gap) return 'rope';
                return 'buttons'; // in button column but between buttons
            }
            // Left 40% = move joystick
            if (x < w * 0.4) return 'move';
            // Rest = aim joystick
            return 'aim';
        };

        // Use document-level touch events for maximum reliability
        document.addEventListener('touchstart', (e) => {
            for (const t of e.changedTouches) {
                const pos = this._transformTouch(t.clientX, t.clientY);
                const zone = getZone(pos.x, pos.y, pos.w, pos.h);

                if (zone === 'move' && this.moveTouch === null) {
                    this.moveTouch = t.identifier;
                    this.moveOriginX = t.clientX;
                    this.moveOriginY = t.clientY;
                    // Position joystick visual at touch point
                    this._positionJoystick(this.moveBase, pos.x, pos.y);
                    this.moveBase.classList.add('visible');
                } else if (zone === 'aim' && this.aimTouch === null) {
                    this.aimTouch = t.identifier;
                    this.aimOriginX = t.clientX;
                    this.aimOriginY = t.clientY;
                    this._positionJoystick(this.aimBase, pos.x, pos.y);
                    this.aimBase.classList.add('visible');
                } else if (zone === 'fire') {
                    this.fireDown = true;
                    this._buttonTouches[t.identifier] = 'fire';
                    this._buttons.fire.classList.add('pressed');
                } else if (zone === 'weapon') {
                    this.weaponDown = true;
                    this.weaponPressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'weapon';
                    this._buttons.weapon.classList.add('pressed');
                } else if (zone === 'jump') {
                    this.jumpDown = true;
                    this._buttonTouches[t.identifier] = 'jump';
                    this._buttons.jump.classList.add('pressed');
                } else if (zone === 'rope') {
                    this.ropeDown = true;
                    this.ropePressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'rope';
                    this._buttons.rope.classList.add('pressed');
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    let dx = t.clientX - this.moveOriginX;
                    let dy = t.clientY - this.moveOriginY;
                    // Transform delta for portrait
                    if (this._isPortrait) {
                        const tmp = dx;
                        dx = dy;
                        dy = -tmp;
                    }
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                    this.moveX = dx / maxDist;
                    this.moveY = dy / maxDist;
                    this.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                } else if (t.identifier === this.aimTouch) {
                    let dx = t.clientX - this.aimOriginX;
                    let dy = t.clientY - this.aimOriginY;
                    if (this._isPortrait) {
                        const tmp = dx;
                        dx = dy;
                        dy = -tmp;
                    }
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
                    this.moveX = 0;
                    this.moveY = 0;
                    this.moveBase.classList.remove('visible');
                    this.moveKnob.style.transform = 'translate(-50%, -50%)';
                } else if (t.identifier === this.aimTouch) {
                    this.aimTouch = null;
                    this.aimX = 0;
                    this.aimY = 0;
                    this.aimBase.classList.remove('visible');
                    this.aimKnob.style.transform = 'translate(-50%, -50%)';
                } else if (this._buttonTouches[t.identifier]) {
                    const btn = this._buttonTouches[t.identifier];
                    delete this._buttonTouches[t.identifier];
                    if (btn === 'fire') { this.fireDown = false; this._buttons.fire.classList.remove('pressed'); }
                    if (btn === 'weapon') { this.weaponDown = false; this._buttons.weapon.classList.remove('pressed'); }
                    if (btn === 'jump') { this.jumpDown = false; this._buttons.jump.classList.remove('pressed'); }
                    if (btn === 'rope') { this.ropeDown = false; this._buttons.rope.classList.remove('pressed'); }
                }
            }
        };
        document.addEventListener('touchend', handleEnd, { passive: true });
        document.addEventListener('touchcancel', handleEnd, { passive: true });
    }

    _positionJoystick(base, x, y) {
        if (this._isPortrait) {
            // In portrait CSS-rotated mode, position in rotated coordinate space
            base.style.left = (x - 60) + 'px';
            base.style.top = (y - 60) + 'px';
        } else {
            base.style.left = (x - 60) + 'px';
            base.style.top = (y - 60) + 'px';
        }
    }

    getInput(ropeAttached) {
        const deadzone = 0.25;
        const mx = Math.abs(this.moveX) > deadzone ? this.moveX : 0;
        const my = Math.abs(this.moveY) > deadzone ? this.moveY : 0;
        const ax = Math.abs(this.aimX) > deadzone ? this.aimX : 0;
        const ay = Math.abs(this.aimY) > deadzone ? this.aimY : 0;

        if (ropeAttached) {
            return {
                left: ax < -deadzone,
                right: ax > deadzone,
                up: my < -deadzone,
                down: my > deadzone,
                aimUp: false,
                aimDown: false,
                aimUpOnly: false,
                aimDownOnly: false,
                fire: this.fireDown,
                changeWeapon: this.weaponPressedThisFrame,
                rope: this.ropeDown,
                jump: this.jumpDown,
            };
        }

        return {
            left: mx < -deadzone,
            right: mx > deadzone,
            up: my < -deadzone,
            down: my > deadzone,
            aimUp: ay < -deadzone,
            aimDown: ay > deadzone,
            aimUpOnly: ay < -deadzone,
            aimDownOnly: ay > deadzone,
            fire: this.fireDown,
            changeWeapon: this.weaponPressedThisFrame,
            rope: this.ropeDown,
            jump: this.jumpDown || my < -deadzone,
        };
    }

    wasRopePressed() {
        const v = this.ropePressedThisFrame;
        this.ropePressedThisFrame = false;
        return v;
    }

    wasWeaponPressed() {
        const v = this.weaponPressedThisFrame;
        this.weaponPressedThisFrame = false;
        return v;
    }

    clearPressed() {
        this.weaponPressedThisFrame = false;
    }

    setGameplay(on) {
        if (!this.container) return;
        // Container is always pointer-events:none, global handler manages touches
        const btns = this.container.querySelector('.touch-buttons');
        const bases = this.container.querySelectorAll('.joystick-base');
        if (btns) btns.style.display = on ? '' : 'none';
        // Hide joystick bases when not playing (they show on touch)
        if (!on) {
            bases.forEach(b => b.classList.remove('visible'));
        }
    }
}
