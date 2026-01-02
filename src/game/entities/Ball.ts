import { Lane } from '../utils/Input';

export default class Ball {
  x: number;
  y: number;
  radius: number;
  speed: number;
  lane: Lane;
  appleIndex: number; // which apple sprite to draw
  color = '#fbbf24';

  constructor(x: number, y: number, radius: number, speed: number, lane: Lane, appleIndex: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.lane = lane;
    this.appleIndex = appleIndex;
  }

  update(dt: number) {
    this.y += this.speed * dt;
  }

  // Draw with image if provided; fallback to circle for safety.
  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement) {
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
