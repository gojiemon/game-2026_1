// Lightweight sound helper for simple SFX (no external assets).
export default class Sound {
    constructor() {
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bgm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bgmStarted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    // Ensure AudioContext is available and resumed.
    ensureCtx() {
        if (typeof window === 'undefined')
            return undefined;
        if (!this.ctx) {
            try {
                this.ctx = new AudioContext();
            }
            catch {
                return undefined;
            }
        }
        if (this.ctx.state === 'suspended') {
            void this.ctx.resume();
        }
        return this.ctx;
    }
    // Short, bouncy chirp for shooting.
    playShoot() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.08);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    // Lazy-create and start looping BGM; guard against overlapping playback.
    playBGM() {
        if (this.bgmStarted)
            return;
        if (!this.bgm) {
            this.bgm = new Audio('/assets/bgm.mp3');
            this.bgm.loop = true;
            this.bgm.volume = 0.25; // keep volume modest
        }
        // Attempt playback; if it fails (e.g., gesture not allowed), allow retry.
        this.bgmStarted = true;
        this.bgm.play().catch(() => {
            this.bgmStarted = false;
        });
    }
    // Stop BGM immediately and reset for next start.
    stopBGM() {
        if (!this.bgm)
            return;
        this.bgm.pause();
        this.bgm.currentTime = 0;
        this.bgmStarted = false;
    }
}
//# sourceMappingURL=Sound.js.map