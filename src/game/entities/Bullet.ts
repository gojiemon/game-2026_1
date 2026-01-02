export default class Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color = '#38bdf8';

  constructor(x: number, y: number, width: number, height: number, speed: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
  }

  update(dt: number) {
    this.y -= this.speed * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
  }
}
