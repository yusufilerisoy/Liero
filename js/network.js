// network.js — WebSocket client for LAN multiplayer

export class NetworkClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.onStateUpdate = null;
        this.onTerrainDestroy = null;
        this.onGameStart = null;
        this.onGameEnd = null;
        this.onError = null;
        this.onConnect = null;
        this.onDisconnect = null;
        this.pendingInputs = [];
        this.serverState = null;
        this.interpolationBuffer = [];
    }

    connect(host = 'localhost', port = 3000) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`ws://${host}:${port}`);
            } catch (e) {
                reject(e);
                return;
            }

            this.ws.onopen = () => {
                this.connected = true;
                if (this.onConnect) this.onConnect();
                resolve();
            };

            this.ws.onclose = () => {
                this.connected = false;
                if (this.onDisconnect) this.onDisconnect();
            };

            this.ws.onerror = (e) => {
                this.connected = false;
                if (this.onError) this.onError(e);
                reject(e);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleMessage(msg);
                } catch (e) {
                    console.error('Network parse error:', e);
                }
            };
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    send(type, data) {
        if (!this.connected || !this.ws) return;
        this.ws.send(JSON.stringify({ type, ...data }));
    }

    sendInput(input) {
        this.send('input', { input, seq: Date.now() });
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'welcome':
                this.playerId = msg.playerId;
                break;
            case 'gameStart':
                if (this.onGameStart) this.onGameStart(msg);
                break;
            case 'state':
                this.serverState = msg;
                this.interpolationBuffer.push({ time: Date.now(), state: msg });
                // Keep buffer small
                if (this.interpolationBuffer.length > 10) {
                    this.interpolationBuffer.shift();
                }
                if (this.onStateUpdate) this.onStateUpdate(msg);
                break;
            case 'terrainDestroy':
                if (this.onTerrainDestroy) this.onTerrainDestroy(msg.cx, msg.cy, msg.radius);
                break;
            case 'terrainAdd':
                if (this.onTerrainAdd) this.onTerrainAdd(msg.cx, msg.cy, msg.radius);
                break;
            case 'gameEnd':
                if (this.onGameEnd) this.onGameEnd(msg);
                break;
        }
    }

    getInterpolatedState(renderTime) {
        const buffer = this.interpolationBuffer;
        if (buffer.length < 2) return this.serverState;

        // Find two states to interpolate between
        for (let i = buffer.length - 1; i > 0; i--) {
            if (buffer[i - 1].time <= renderTime && buffer[i].time >= renderTime) {
                const t = (renderTime - buffer[i - 1].time) / (buffer[i].time - buffer[i - 1].time);
                return this._lerpState(buffer[i - 1].state, buffer[i].state, t);
            }
        }
        return buffer[buffer.length - 1].state;
    }

    _lerpState(a, b, t) {
        // Simple position interpolation for players
        if (!a.players || !b.players) return b;
        const state = { ...b };
        state.players = b.players.map((bp, i) => {
            const ap = a.players[i];
            if (!ap) return bp;
            return {
                ...bp,
                x: ap.x + (bp.x - ap.x) * t,
                y: ap.y + (bp.y - ap.y) * t,
            };
        });
        return state;
    }
}
