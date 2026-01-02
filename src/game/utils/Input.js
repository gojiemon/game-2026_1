export default class Input {
    constructor(canvas) {
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mouseX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "wantShoot", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "wantRestart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.canvas = canvas;
        this.bind();
    }
    bind() {
        this.canvas.addEventListener('pointermove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });
        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.button === 0) {
                this.wantShoot = true;
            }
            else if (e.button === 2) {
                this.wantRestart = true;
            }
        });
        // Avoid context menu on right click when using restart
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    getLane() {
        const lane = this.mouseX < this.canvas.width / 2 ? 0 : 1;
        return lane;
    }
    consumeShoot() {
        const shoot = this.wantShoot;
        this.wantShoot = false;
        return shoot;
    }
    consumeRestart() {
        const restart = this.wantRestart;
        this.wantRestart = false;
        return restart;
    }
}
//# sourceMappingURL=Input.js.map