import { lerp } from '../utils/Math';

export default class Player {
  x: number;
  y: number;
  radius = 18;
  color = '#7dd3fc';
  private smoothing = 0.0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, targetX: number) {
    // Smooth step toward target (approx ~0.12s response)
    const stiffness = 12;
    this.smoothing = 1 - Math.exp(-stiffness * dt);
    this.x = lerp(this.x, targetX, this.smoothing);
  }

  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement) {
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
