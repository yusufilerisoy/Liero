// touch.js — Mobile touch controls with dual joysticks and action buttons

export class TouchControls {
    constructor() {
        this.active = false;
        this.container = null;

        // Left joystick — movement
        this.moveX = 0; // -1 to 1
        this.moveY = 0; // -1 to 1
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
        this._tapped = false; // for menu navigation
    }

    init() {
        // Only show on touch devices
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
        this.active = true;
        this._createUI();
        this._bindEvents();
        this._bindFullscreen();
        // Tap on canvas for menu navigation
        document.getElementById('game').addEventListener('touchstart', (e) => {
            this._tapped = true;
        }, { passive: true });
    }

    _bindFullscreen() {
        // Request fullscreen on first touch interaction
        const requestFS = () => {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            if (req) {
                req.call(el).catch(() => {});
            }
            // Also try to hide mobile browser UI via scrolling trick
            window.scrollTo(0, 1);
            document.removeEventListener('touchstart', requestFS);
        };
        document.addEventListener('touchstart', requestFS, { once: true, passive: true });
    }

    _createUI() {
        // Container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.innerHTML = `
            <div class="joystick-zone left-zone" id="move-zone">
                <div class="joystick-base" id="move-base">
                    <div class="joystick-knob" id="move-knob"></div>
                </div>
            </div>
            <div class="joystick-zone right-zone" id="aim-zone">
                <div class="joystick-base" id="aim-base">
                    <div class="joystick-knob" id="aim-knob"></div>
                </div>
            </div>
            <div class="touch-buttons" id="touch-buttons">
                <div class="btn-row">
                    <button class="touch-btn fire-btn" id="btn-fire">FIRE</button>
                    <button class="touch-btn jump-btn" id="btn-jump">JUMP</button>
                </div>
                <div class="btn-row">
                    <button class="touch-btn weapon-btn" id="btn-weapon">WPN</button>
                    <button class="touch-btn rope-btn" id="btn-rope">ROPE</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            #touch-controls {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 1000;
                display: none;
            }
            @media (pointer: coarse), (max-width: 1024px) and (orientation: landscape) {
                #touch-controls { display: block; }
                #game { cursor: default; }
            }

            .joystick-zone {
                position: absolute;
                top: 0;
                width: 40%;
                pointer-events: auto;
                touch-action: none;
            }
            /* Left zone: full left 40%, stop above weapon bar */
            .left-zone {
                left: 0;
                bottom: 80px;
            }
            /* Right zone: top-right area, stops before buttons */
            .right-zone {
                right: 0;
                bottom: 200px;
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

            /* Buttons: 2x2 grid, bottom-right, above weapon bar */
            .touch-buttons {
                position: absolute;
                right: 10px;
                bottom: 80px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: auto;
                touch-action: none;
                z-index: 1001;
            }
            .btn-row {
                display: flex;
                gap: 8px;
            }
            .touch-btn {
                width: 72px;
                height: 52px;
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
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .touch-btn:active, .touch-btn.pressed {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
            }
            .fire-btn {
                width: 72px;
                height: 52px;
                font-size: 15px;
                background: rgba(255,60,60,0.25);
                border-color: rgba(255,60,60,0.5);
            }
            .fire-btn:active, .fire-btn.pressed {
                background: rgba(255,60,60,0.6);
            }
            .jump-btn {
                background: rgba(60,255,60,0.15);
                border-color: rgba(60,255,60,0.3);
            }
            .jump-btn:active, .jump-btn.pressed {
                background: rgba(60,255,60,0.4);
            }
            .rope-btn {
                background: rgba(60,180,255,0.15);
                border-color: rgba(60,180,255,0.3);
            }
            .rope-btn:active, .rope-btn.pressed {
                background: rgba(60,180,255,0.4);
            }
            .weapon-btn {
                background: rgba(255,200,60,0.15);
                border-color: rgba(255,200,60,0.3);
            }
            .weapon-btn:active, .weapon-btn.pressed {
                background: rgba(255,200,60,0.4);
            }

            /* Small screens: smaller buttons */
            @media (max-height: 400px) {
                .touch-btn { width: 60px; height: 44px; font-size: 11px; }
                .fire-btn { width: 60px; height: 44px; font-size: 13px; }
                .touch-buttons { bottom: 70px; right: 6px; gap: 5px; }
                .btn-row { gap: 5px; }
                .joystick-base { width: 100px; height: 100px; }
                .joystick-knob { width: 42px; height: 42px; }
            }
        `;
        document.head.appendChild(style);

        this.moveZone = document.getElementById('move-zone');
        this.moveBase = document.getElementById('move-base');
        this.moveKnob = document.getElementById('move-knob');
        this.aimZone = document.getElementById('aim-zone');
        this.aimBase = document.getElementById('aim-base');
        this.aimKnob = document.getElementById('aim-knob');
    }

    _bindEvents() {
        const maxDist = 50;

        // Move joystick
        this.moveZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            this.moveTouch = t.identifier;
            this.moveOriginX = t.clientX;
            this.moveOriginY = t.clientY;
            this.moveBase.style.left = (t.clientX - 60) + 'px';
            this.moveBase.style.top = (t.clientY - 60) + 'px';
            this.moveBase.classList.add('visible');
        }, { passive: false });

        this.moveZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier !== this.moveTouch) continue;
                let dx = t.clientX - this.moveOriginX;
                let dy = t.clientY - this.moveOriginY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                this.moveX = dx / maxDist;
                this.moveY = dy / maxDist;
                this.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            }
        }, { passive: false });

        const moveEnd = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier !== this.moveTouch) continue;
                this.moveTouch = null;
                this.moveX = 0;
                this.moveY = 0;
                this.moveBase.classList.remove('visible');
                this.moveKnob.style.transform = 'translate(-50%, -50%)';
            }
        };
        this.moveZone.addEventListener('touchend', moveEnd, { passive: false });
        this.moveZone.addEventListener('touchcancel', moveEnd, { passive: false });

        // Aim joystick
        this.aimZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            this.aimTouch = t.identifier;
            this.aimOriginX = t.clientX;
            this.aimOriginY = t.clientY;
            const rect = this.aimZone.getBoundingClientRect();
            this.aimBase.style.left = (t.clientX - rect.left - 60) + 'px';
            this.aimBase.style.top = (t.clientY - rect.top - 60) + 'px';
            this.aimBase.classList.add('visible');
        }, { passive: false });

        this.aimZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier !== this.aimTouch) continue;
                let dx = t.clientX - this.aimOriginX;
                let dy = t.clientY - this.aimOriginY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                this.aimX = dx / maxDist;
                this.aimY = dy / maxDist;
                this.aimKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            }
        }, { passive: false });

        const aimEnd = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier !== this.aimTouch) continue;
                this.aimTouch = null;
                this.aimX = 0;
                this.aimY = 0;
                this.aimBase.classList.remove('visible');
                this.aimKnob.style.transform = 'translate(-50%, -50%)';
            }
        };
        this.aimZone.addEventListener('touchend', aimEnd, { passive: false });
        this.aimZone.addEventListener('touchcancel', aimEnd, { passive: false });

        // Buttons — stop propagation so joystick zones don't capture them
        this._bindButton('btn-fire', 'fireDown');
        this._bindButton('btn-jump', 'jumpDown');

        // Rope — toggle
        const ropeBtn = document.getElementById('btn-rope');
        ropeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.ropeDown = true;
            this.ropePressedThisFrame = true;
            ropeBtn.classList.add('pressed');
        }, { passive: false });
        ropeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.ropeDown = false;
            ropeBtn.classList.remove('pressed');
        }, { passive: false });
        ropeBtn.addEventListener('touchcancel', (e) => {
            this.ropeDown = false;
            ropeBtn.classList.remove('pressed');
        });

        // Weapon — toggle
        const wpnBtn = document.getElementById('btn-weapon');
        wpnBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.weaponDown = true;
            this.weaponPressedThisFrame = true;
            wpnBtn.classList.add('pressed');
        }, { passive: false });
        wpnBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.weaponDown = false;
            wpnBtn.classList.remove('pressed');
        }, { passive: false });
        wpnBtn.addEventListener('touchcancel', (e) => {
            this.weaponDown = false;
            wpnBtn.classList.remove('pressed');
        });
    }

    _bindButton(id, prop) {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this[prop] = true;
            btn.classList.add('pressed');
        }, { passive: false });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this[prop] = false;
            btn.classList.remove('pressed');
        }, { passive: false });
        btn.addEventListener('touchcancel', (e) => {
            this[prop] = false;
            btn.classList.remove('pressed');
        });
    }

    // Get input matching the same format as keyboard getP1()
    getInput(ropeAttached) {
        const deadzone = 0.25;
        const mx = Math.abs(this.moveX) > deadzone ? this.moveX : 0;
        const my = Math.abs(this.moveY) > deadzone ? this.moveY : 0;
        const ax = Math.abs(this.aimX) > deadzone ? this.aimX : 0;
        const ay = Math.abs(this.aimY) > deadzone ? this.aimY : 0;

        if (ropeAttached) {
            // Rope mode: left stick = reel up/down, right stick = swing left/right
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
        // ropePressedThisFrame is consumed by wasRopePressed
    }

    setGameplay(on) {
        if (!this.container) return;
        this.container.style.pointerEvents = on ? 'none' : 'none';
        const zones = this.container.querySelectorAll('.joystick-zone, .touch-buttons');
        zones.forEach(z => z.style.pointerEvents = on ? 'auto' : 'none');
        zones.forEach(z => z.style.display = on ? '' : 'none');
    }
}
