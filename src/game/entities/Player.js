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
    draw(ctx, image) {
        // Render sprite larger: base diameter (radius*2) × 3 for clear visibility
        const size = this.radius * 6;
        if (image) {
            // Draw rabbit centered on logical position
            ctx.drawImage(image, this.x - size / 2, this.y - size / 2, size, size);
            return;
        }
        // Fallback: intentionally blank to avoid old shapes when image missing
    }
}
//# sourceMappingURL=Player.js.map