// touch.js — Mobile touch controls
// Global touch handler — no DOM buttons, just coordinate zones

export class TouchControls {
    constructor() {
        this.active = false;
        this.container = null;

        this.moveX = 0;
        this.moveY = 0;
        this.moveTouch = null;
        this.moveOriginX = 0;
        this.moveOriginY = 0;

        this.aimX = 0;
        this.aimY = 0;
        this.aimTouch = null;
        this.aimOriginX = 0;
        this.aimOriginY = 0;

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
        this._createOverlay();
        this._bindGlobalTouch();

        document.getElementById('game').addEventListener('touchstart', () => {
            this._tapped = true;
        }, { passive: true });
    }

    _createOverlay() {
        // Minimal overlay — joystick visuals only, buttons drawn on canvas
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.innerHTML = `
            <div class="joy" id="move-base"><div class="knob" id="move-knob"></div></div>
            <div class="joy" id="aim-base"><div class="knob" id="aim-knob"></div></div>
        `;
        document.body.appendChild(this.container);

        const s = document.createElement('style');
        s.textContent = `
            #touch-controls {
                position:fixed; top:0; left:0; width:100%; height:100%;
                pointer-events:none; z-index:1000; touch-action:none;
                display:none;
            }
            @media(pointer:coarse){ #touch-controls{display:block} #game{cursor:default} }
            .joy {
                position:absolute; width:110px; height:110px; border-radius:50%;
                background:rgba(255,255,255,0.05); border:2px solid rgba(255,255,255,0.1);
                display:none; pointer-events:none; z-index:1000;
            }
            .joy.visible { display:block; }
            .knob {
                position:absolute; width:46px; height:46px; border-radius:50%;
                background:rgba(255,255,255,0.18); border:2px solid rgba(255,255,255,0.3);
                top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none;
            }
        `;
        document.head.appendChild(s);

        this.moveBase = document.getElementById('move-base');
        this.moveKnob = document.getElementById('move-knob');
        this.aimBase = document.getElementById('aim-base');
        this.aimKnob = document.getElementById('aim-knob');
    }

    // Button layout: right edge, vertical. Returns zone name.
    _getZone(x, y) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const btnW = 62;
        const btnH = 40;
        const fireH = 46;
        const gap = 8;

        // Right column: buttons
        if (x > w - btnW - 8) {
            // Exit: very top right
            if (y < 40) return 'exit';
            // Stack: FIRE, WPN, JUMP, ROPE centered vertically
            const totalH = fireH + 3 * btnH + 3 * gap;
            const startY = (h - totalH) / 2;
            const relY = y - startY;
            if (relY >= 0 && relY < fireH) return 'fire';
            if (relY >= fireH + gap && relY < fireH + gap + btnH) return 'weapon';
            if (relY >= fireH + 2*gap + btnH && relY < fireH + 2*gap + 2*btnH) return 'jump';
            if (relY >= fireH + 3*gap + 2*btnH && relY < totalH) return 'rope';
        }
        // Left 40%: movement
        if (x < w * 0.4) return 'move';
        // Rest: aim
        return 'aim';
    }

    _bindGlobalTouch() {
        const maxDist = 50;

        document.addEventListener('touchstart', (e) => {
            if (!this._gameplay) return;
            for (const t of e.changedTouches) {
                const zone = this._getZone(t.clientX, t.clientY);
                if (zone === 'move' && this.moveTouch === null) {
                    this.moveTouch = t.identifier;
                    this.moveOriginX = t.clientX;
                    this.moveOriginY = t.clientY;
                    this.moveBase.style.left = (t.clientX - 55) + 'px';
                    this.moveBase.style.top = (t.clientY - 55) + 'px';
                    this.moveBase.classList.add('visible');
                } else if (zone === 'aim' && this.aimTouch === null) {
                    this.aimTouch = t.identifier;
                    this.aimOriginX = t.clientX;
                    this.aimOriginY = t.clientY;
                    this.aimBase.style.left = (t.clientX - 55) + 'px';
                    this.aimBase.style.top = (t.clientY - 55) + 'px';
                    this.aimBase.classList.add('visible');
                } else if (zone === 'fire') {
                    this.fireDown = true; this._buttonTouches[t.identifier] = 'fire';
                } else if (zone === 'weapon') {
                    this.weaponDown = true; this.weaponPressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'weapon';
                } else if (zone === 'jump') {
                    this.jumpDown = true; this._buttonTouches[t.identifier] = 'jump';
                } else if (zone === 'rope') {
                    this.ropeDown = true; this.ropePressedThisFrame = true;
                    this._buttonTouches[t.identifier] = 'rope';
                } else if (zone === 'exit') {
                    this.exitDown = true; this._buttonTouches[t.identifier] = 'exit';
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    let dx = t.clientX - this.moveOriginX;
                    let dy = t.clientY - this.moveOriginY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > maxDist) { dx = dx/dist*maxDist; dy = dy/dist*maxDist; }
                    this.moveX = dx / maxDist;
                    this.moveY = dy / maxDist;
                    this.moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                } else if (t.identifier === this.aimTouch) {
                    let dx = t.clientX - this.aimOriginX;
                    let dy = t.clientY - this.aimOriginY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > maxDist) { dx = dx/dist*maxDist; dy = dy/dist*maxDist; }
                    this.aimX = dx / maxDist;
                    this.aimY = dy / maxDist;
                    this.aimKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                }
            }
        }, { passive: true });

        const end = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.moveTouch) {
                    this.moveTouch = null; this.moveX = 0; this.moveY = 0;
                    this.moveBase.classList.remove('visible');
                    this.moveKnob.style.transform = 'translate(-50%,-50%)';
                } else if (t.identifier === this.aimTouch) {
                    this.aimTouch = null; this.aimX = 0; this.aimY = 0;
                    this.aimBase.classList.remove('visible');
                    this.aimKnob.style.transform = 'translate(-50%,-50%)';
                } else if (this._buttonTouches[t.identifier]) {
                    const b = this._buttonTouches[t.identifier];
                    delete this._buttonTouches[t.identifier];
                    if (b === 'fire') this.fireDown = false;
                    if (b === 'weapon') this.weaponDown = false;
                    if (b === 'jump') this.jumpDown = false;
                    if (b === 'rope') this.ropeDown = false;
                    if (b === 'exit') this.exitDown = false;
                }
            }
        };
        document.addEventListener('touchend', end, { passive: true });
        document.addEventListener('touchcancel', end, { passive: true });
    }

    getInput(ropeAttached) {
        const dz = 0.25;
        const mx = Math.abs(this.moveX) > dz ? this.moveX : 0;
        const my = Math.abs(this.moveY) > dz ? this.moveY : 0;
        const ax = Math.abs(this.aimX) > dz ? this.aimX : 0;
        const ay = Math.abs(this.aimY) > dz ? this.aimY : 0;
        if (ropeAttached) {
            return { left:ax<-dz, right:ax>dz, up:my<-dz, down:my>dz,
                aimUp:false, aimDown:false, aimUpOnly:false, aimDownOnly:false,
                fire:this.fireDown, changeWeapon:this.weaponPressedThisFrame,
                rope:this.ropeDown, jump:this.jumpDown };
        }
        return { left:mx<-dz, right:mx>dz, up:my<-dz, down:my>dz,
            aimUp:ay<-dz, aimDown:ay>dz, aimUpOnly:ay<-dz, aimDownOnly:ay>dz,
            fire:this.fireDown, changeWeapon:this.weaponPressedThisFrame,
            rope:this.ropeDown, jump:this.jumpDown||my<-dz };
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
        if (!on && this.moveBase) {
            this.moveBase.classList.remove('visible');
            this.aimBase.classList.remove('visible');
        }
    }
}
