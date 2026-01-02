export type Lane = 0 | 1;

export default class Input {
  private canvas: HTMLCanvasElement;
  private mouseX = 0;
  private wantShoot = false;
  private wantRestart = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bind();
  }

  private bind() {
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        this.wantShoot = true;
      } else if (e.button === 2) {
        this.wantRestart = true;
      }
    });

    // Avoid context menu on right click when using restart
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getLane(): Lane {
    const lane: Lane = this.mouseX < this.canvas.width / 2 ? 0 : 1;
    return lane;
  }

  consumeShoot(): boolean {
    const shoot = this.wantShoot;
    this.wantShoot = false;
    return shoot;
  }

  consumeRestart(): boolean {
    const restart = this.wantRestart;
    this.wantRestart = false;
    return restart;
  }
}
