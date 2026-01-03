import { lerp } from '../utils/Math';
export default class Player {
    constructor(x, y) {
        Object.defineProperty(this, "x", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "y", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "radius", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 18
        });
        Object.defineProperty(this, "color", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: '#7dd3fc'
        });
        Object.defineProperty(this, "smoothing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.0
        });
        this.x = x;
        this.y = y;
    }
    update(dt, targetX) {
        // Smooth step toward target (approx ~0.12s response)
        const stiffness = 12;
        this.smoothing = 1 - Math.exp(-stiffness * dt);
        this.x = lerp(this.x, targetX, this.smoothing);
    }
    draw(ctx, image, offsetY = 0, scale = 1) {
        // Base visual size; scale can enlarge during jump
        const baseSize = this.radius * 6;
        const size = baseSize * scale;
        const drawX = this.x - size / 2;
        const drawY = this.y + offsetY - size / 2; // apply jump offset to visual position
        if (image) {
            // Draw rabbit centered on logical position
            ctx.drawImage(image, drawX, drawY, size, size);
            return;
        }
        // Fallback: intentionally blank to avoid old shapes when image missing
    }
}
//# sourceMappingURL=Player.js.map