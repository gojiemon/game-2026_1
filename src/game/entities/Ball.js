export default class Ball {
    constructor(x, y, radius, speed, lane, appleIndex) {
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
            value: void 0
        });
        Object.defineProperty(this, "speed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lane", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "appleIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // which apple sprite to draw
        Object.defineProperty(this, "color", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: '#fbbf24'
        });
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
        this.lane = lane;
        this.appleIndex = appleIndex;
    }
    update(dt) {
        this.y += this.speed * dt;
    }
    // Draw with image if provided; fallback to circle for safety.
    draw(ctx, image) {
        if (image) {
            const size = this.radius * 2;
            ctx.drawImage(image, this.x - size / 2, this.y - size / 2, size, size);
            return;
        }
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
//# sourceMappingURL=Ball.js.map