// touch.js — Mobile touch controls
// Single global touch handler for reliable multi-touch in PWA mode

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
        this.pauseDown = false;
        this._tapped = false;

        // Track active button touches
        this._buttonTouches = {};

        // Gameplay mode
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
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            if (req) req.call(el).catch(() => {});
            window.scrollTo(0, 1);
        };
        document.addEventListener('touchstart', requestFS, { once: true, passive: true });
    }

    _createUI() {
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        // All visual elements are just indicators — input handled by global handler
        this.container.innerHTML = `
            <div class="joystick-base" id="move-base">
                <div class="joystick-knob" id="move-knob"></div>
            </div>
            <div class="joystick-base" id="aim-base">
                <div class="joystick-knob" id="aim-knob"></div>
            </div>
            <div class="touch-btn-indicators">
                <div class="touch-ind pause-ind" id="ind-pause">||</div>
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
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: rgba(255,255,255,0.08);
                border: 2px solid rgba(255,255,255,0.15);
                display: none;
                pointer-events: none;
                z-index: 1000;
            }
            .joystick-base.visible { display: block; }
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

            .touch-btn-indicators {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                display: none;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
                z-index: 1001;
            }
            .touch-btn-indicators.visible {
                display: flex;
            }
            .touch-ind {
                width: 64px;
                height: 44px;
                border-radius: 12px;
                border: 2px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.7);
                font-size: 12px;
                font-weight: bold;
                font-family: "Segoe UI", Arial, sans-serif;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            }
            .touch-ind.pressed {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
            }
            .fire-ind {
                height: 50px;
                font-size: 14px;
                background: rgba(255,60,60,0.2);
                border-color: rgba(255,60,60,0.4);
            }
            .fire-ind.pressed { background: rgba(255,60,60,0.5); }
            .jump-ind {
                background: rgba(60,255,60,0.12);
                border-color: rgba(60,255,60,0.25);
            }
            .jump-ind.pressed { background: rgba(60,255,60,0.4); }
            .rope-ind {
                background: rgba(60,180,255,0.12);
                border-color: rgba(60,180,255,0.25);
            }
            .rope-ind.pressed { background: rgba(60,180,255,0.4); }
            .weapon-ind {
                background: rgba(255,200,60,0.12);
                border-color: rgba(255,200,60,0.25);
            }
            .weapon-ind.pressed { background: rgba(255,200,60,0.4); }
            .pause-ind {
                width: 40px;
                height: 36px;
                font-size: 16px;
                position: absolute;
                top: 8px;
                right: 10px;
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.2);
            }
            .pause-ind.pressed { background: rgba(255,255,255,0.3); }

            @media (max-height: 400px) {
                .touch-ind { width: 54px; height: 38px; font-size: 10px; }
                .fire-ind { height: 42px; font-size: 12px; }
                .touch-btn-indicators { gap: 5px; right: 6px; }
                .joystick-base { width: 100px; height: 100px; }
                .joystick-knob { width: 42px; height: 42px; }
            }
        `;
        document.head.appendChild(style);

        this.moveBase = document.getElementById('move-base');
        this.moveKnob = document.getElementById('move-knob');
        this.aimBase = document.getElementById('aim-base');
        this.aimKnob = document.getElementById('aim-knob');
        this._indicators = document.querySelector('.touch-btn-indicators');
        this._indMap = {
            fire: document.getElementById('ind-fire'),
            weapon: document.getElementById('ind-weapon'),
            jump: document.getElementById('ind-jump'),
            rope: document.getElementById('ind-rope'),
            pause: document.getElementById('ind-pause'),
        };
    }

    _bindGlobalTouch() {
        const maxDist = 50;

        // Zone detection based on screen coordinates
        const getZone = (x, y, w, h) => {
            // Top-right corner: pause button (80x50 area)
            if (x > w - 60 && y < 50) return 'pause';
            // Right edge (last 76px): action buttons, stacked vertically
            if (x > w - 76) {
                const btnH = 44;
                const fireH = 50;
                const gap = 8;
                // Buttons are centered vertically
                const totalH = fireH + 3 * btnH + 3 * gap;
                const startY = (h - totalH) / 2;
                const relY = y - startY;
                if (relY >= 0 && relY < fireH) return 'fire';
                if (relY >= fireH + gap && relY < fireH + gap + btnH) return 'weapon';
                if (relY >= fireH + 2 * gap + btnH && relY < fireH + 2 * gap + 2 * btnH) return 'jump';
                if (relY >= fireH + 3 * gap + 2 * btnH && relY < totalH) return 'rope';
                return 'aim'; // fallback to aim if between buttons
            }
            // Left 40% = move
            if (x < w * 0.4) return 'move';
            // Remaining area = aim
            return 'aim';
        };

        document.addEventListener('touchstart', (e) => {
            if (!this._gameplay) return;
            const w = window.innerWidth;
            const h = window.innerHeight;

            for (const t of e.changedTouches) {
                const zone = getZone(t.clientX, t.clientY, w, h);

                if (zone === 'move' && this.moveTouch === null) {
                    this.moveTouch = t.identifier;
                    this.moveOriginX = t.clientX;
                    this.moveOriginY = t.clientY;
                    this.moveBase.style.left = (t.clientX - 60) + 'px';
                    this.moveBase.style.top = (t.clientY - 60) + 'px';
                    this.moveBase.classList.add('visible');
                } else if (zone === 'aim' && this.aimTouch === null) {
                    this.aimTouch = t.identifier;
                    this.aimOriginX = t.clientX;
                    this.aimOriginY = t.clientY;
                    this.aimBase.style.left = (t.clientX - 60) + 'px';
                    this.aimBase.style.top = (t.clientY - 60) + 'px';
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
                } else if (zone === 'pause') {
                    this.pauseDown = true;
                    this._buttonTouches[t.identifier] = 'pause';
                    this._indMap.pause.classList.add('pressed');
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    let dx = t.clientX - this.moveOriginX;
                    let dy = t.clientY - this.moveOriginY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                    this.moveX = dx / maxDist;
                    this.moveY = dy / maxDist;
                    this.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                } else if (t.identifier === this.aimTouch) {
                    let dx = t.clientX - this.aimOriginX;
                    let dy = t.clientY - this.aimOriginY;
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
                    if (btn === 'fire') { this.fireDown = false; this._indMap.fire.classList.remove('pressed'); }
                    if (btn === 'weapon') { this.weaponDown = false; this._indMap.weapon.classList.remove('pressed'); }
                    if (btn === 'jump') { this.jumpDown = false; this._indMap.jump.classList.remove('pressed'); }
                    if (btn === 'rope') { this.ropeDown = false; this._indMap.rope.classList.remove('pressed'); }
                    if (btn === 'pause') { this.pauseDown = false; this._indMap.pause.classList.remove('pressed'); }
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
        this.pauseDown = false;
    }

    setGameplay(on) {
        this._gameplay = on;
        if (!this.container) return;
        if (this._indicators) {
            this._indicators.classList.toggle('visible', on);
        }
        if (!on) {
            this.moveBase.classList.remove('visible');
            this.aimBase.classList.remove('visible');
        }
    }
}
