// input.js — Keyboard handler with multi-key tracking

export class Input {
    constructor() {
        this.keys = new Set();
        this.pressedThisFrame = new Set(); // Captures ALL keydown events between frames
        this._onDown = (e) => {
            this.keys.add(e.code);
            this.pressedThisFrame.add(e.code);
            // Prevent default for game keys
            if (this._isGameKey(e.code)) e.preventDefault();
        };
        this._onUp = (e) => {
            this.keys.delete(e.code);
        };
        this._onBlur = () => {
            this.keys.clear();
            this.pressedThisFrame.clear();
        };
    }

    start() {
        window.addEventListener('keydown', this._onDown);
        window.addEventListener('keyup', this._onUp);
        window.addEventListener('blur', this._onBlur);
    }

    stop() {
        window.removeEventListener('keydown', this._onDown);
        window.removeEventListener('keyup', this._onUp);
        window.removeEventListener('blur', this._onBlur);
    }

    isDown(code) {
        return this.keys.has(code);
    }

    // Returns -1, 0, or 1 for axis input
    axis(negCode, posCode) {
        return (this.isDown(posCode) ? 1 : 0) - (this.isDown(negCode) ? 1 : 0);
    }

    _isGameKey(code) {
        return code.startsWith('Arrow') || code.startsWith('Numpad') ||
            code === 'ControlRight' || code === 'ShiftRight' ||
            code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
            code === 'KeyQ' || code === 'KeyE' || code === 'KeyR' || code === 'KeyF' ||
            code === 'Space' || code === 'Enter' || code === 'Escape' ||
            code === 'ControlLeft' || code === 'ShiftLeft';
    }

    // Player 1 controls (Arrow keys + Space)
    getP1() {
        return {
            left: this.isDown('ArrowLeft'),
            right: this.isDown('ArrowRight'),
            up: this.isDown('ArrowUp'),
            down: this.isDown('ArrowDown'),
            aimUp: this.isDown('KeyQ') || this.isDown('ArrowUp'),
            aimDown: this.isDown('KeyE') || this.isDown('ArrowDown'),
            aimUpOnly: this.isDown('KeyQ'),
            aimDownOnly: this.isDown('KeyE'),
            fire: this.isDown('Space'),
            changeWeapon: this.isDown('KeyR'),
            rope: this.isDown('KeyF'),
            jump: this.isDown('ArrowUp'),
        };
    }

    // Player 2 controls (Arrow keys + numpad)
    getP2() {
        return {
            left: this.isDown('ArrowLeft'),
            right: this.isDown('ArrowRight'),
            up: this.isDown('ArrowUp'),
            down: this.isDown('ArrowDown'),
            aimUp: this.isDown('ArrowUp'),
            aimDown: this.isDown('ArrowDown'),
            aimUpOnly: this.isDown('ArrowUp'),
            aimDownOnly: this.isDown('ArrowDown'),
            fire: this.isDown('ControlRight') || this.isDown('Numpad0'),
            changeWeapon: this.isDown('ShiftRight') || this.isDown('NumpadDecimal'),
            rope: this.isDown('Numpad1') || this.isDown('NumpadEnter'),
            jump: this.isDown('ArrowUp'),
        };
    }

    // Check if a key was pressed since last frame (even if already released)
    wasPressed(code) {
        return this.pressedThisFrame.has(code);
    }

    // Call at the end of each game frame to clear pressed buffer
    clearPressed() {
        this.pressedThisFrame.clear();
    }

    // Any key pressed (for menus)
    anyKey() {
        return this.keys.size > 0;
    }

    justPressed(code) {
        return this.keys.has(code);
    }

    consumeKey(code) {
        const had = this.keys.has(code);
        this.keys.delete(code);
        return had;
    }
}
