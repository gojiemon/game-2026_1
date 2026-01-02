import Ball from './entities/Ball';
import Bullet from './entities/Bullet';
import Player from './entities/Player';
import Input, { Lane } from './utils/Input';
import { clamp } from './utils/Math';
import { loadAssets, LoadedAssets } from './utils/Assets'; // preload images
import Sound from './utils/Sound'; // simple SFX

type Telegraph = {
  lane: Lane;
  triggerTime: number;
};

type StackedBall = {
  lane: Lane;
  appleIndex: number;
};

enum GameState {
  Start = 'start',
  Playing = 'playing',
  GameOver = 'gameover'
}

const LANE_COUNT = 2;
// Keep original layout proportions while allowing resize
const BASE_CANVAS_HEIGHT = 960;
const PLAYER_BOTTOM_OFFSET_RATIO = 200 / BASE_CANVAS_HEIGHT; // player stays ~200px above bottom at base height
const DEFENSE_LINE_RATIO = 0.92; // defense line near bottom; shared by draw/logic
const STACK_LIMIT = 3;
const BALL_RADIUS = 18;
const BULLET_WIDTH = 8;
const BULLET_HEIGHT = 18;
const BULLET_SPEED = 520;
const SHOOT_COOLDOWN = 0.22;
const TELEGRAPH_DELAY = 0.42;

// Difficulty tuning
const INITIAL_SPAWN_INTERVAL = 1.0;
const MIN_SPAWN_INTERVAL = 0.35;
const SPAWN_DROP_PER_SEC = 0.012;
const BASE_FALL_SPEED = 150;
const FALL_SPEED_RAMP_PER_SEC = 5.5;
const BASE_ACTIVE_BALLS = 3;
const MAX_ACTIVE_BALLS = 7;
const ACTIVE_INCREASE_EVERY = 18; // seconds
const ACTIVE_INCREMENT = 1;

export default class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private player: Player;
  private balls: Ball[] = [];
  private bullets: Bullet[] = [];
  private stacked: StackedBall[] = [];
  private telegraphs: Telegraph[] = [];
  private state: GameState = GameState.Start;
  private lastTime = 0;
  private elapsed = 0;
  private score = 0;
  private shootTimer = 0;
  private spawnTimer = 0;
  private startTime = 0;
  private lastLane: Lane = 0;
  private assetsLoaded = false;
  private assets?: LoadedAssets;
  private loadingMessage = 'Loading...';
  private sound = new Sound();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const maybeCtx = this.canvas.getContext('2d');
    if (!maybeCtx) throw new Error('Canvas 2D context unavailable');
    this.ctx = maybeCtx;
    this.input = new Input(this.canvas);
    this.setCanvasSize();
    const initialLaneX = this.laneToX(0);
    this.player = new Player(initialLaneX, this.getPlayerY());
    // Keep canvas and game-space aligned to window size
    window.addEventListener('resize', this.handleResize);
    // Begin asset loading; gate gameplay until complete
    loadAssets()
      .then((assets) => {
        this.assets = assets;
        this.assetsLoaded = true;
      })
      .catch((err) => {
        console.error('Failed to load assets', err);
        this.loadingMessage = 'Failed to load assets';
      });
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private resetGame() {
    this.balls = [];
    this.bullets = [];
    this.stacked = [];
    this.telegraphs = [];
    this.score = 0;
    this.elapsed = 0;
    this.shootTimer = 0;
    this.spawnTimer = 0;
    this.startTime = performance.now();
    this.lastLane = Math.random() < 0.5 ? 0 : 1;
  }

  private loop = (timestamp: number) => {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };

  // Resize canvas to window and scale in-flight entities so nothing disappears off-screen
  private handleResize = () => {
    const prevW = this.canvas.width || 1;
    const prevH = this.canvas.height || 1;
    this.setCanvasSize();
    const scaleX = this.canvas.width / prevW;
    const scaleY = this.canvas.height / prevH;
    this.scaleEntities(scaleX, scaleY);
    // Snap player to current lane with updated height baseline
    this.player.x = this.laneToX(this.input.getLane());
    this.player.y = this.getPlayerY();
  };

  private setCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private scaleEntities(scaleX: number, scaleY: number) {
    for (const ball of this.balls) {
      ball.x *= scaleX;
      ball.y *= scaleY;
    }
    for (const bullet of this.bullets) {
      bullet.x *= scaleX;
      bullet.y *= scaleY;
    }
  }

  private getPlayerY() {
    return this.canvas.height - Math.floor(this.canvas.height * PLAYER_BOTTOM_OFFSET_RATIO);
  }

  private getDefenseLineY() {
    return Math.floor(this.canvas.height * DEFENSE_LINE_RATIO);
  }

  private update(dt: number) {
    // Gate start until assets are ready; show loading notice on click
    if (this.state === GameState.Start) {
      if (this.input.consumeShoot()) {
        if (this.assetsLoaded) {
          this.sound.playBGM(); // start looping BGM on first user click
          this.resetGame();
          this.state = GameState.Playing;
        } else {
          this.loadingMessage = 'Loading...';
        }
      }
      return;
    }

    if (this.state === GameState.GameOver) {
      // Restart now requires right click (consumeRestart)
      if (this.input.consumeRestart()) {
        if (this.assetsLoaded) {
          this.sound.playBGM(); // ensure BGM plays (no-op if already playing)
          this.resetGame();
          this.state = GameState.Playing;
        }
      }
      return;
    }

    // Playing
    this.elapsed = (performance.now() - this.startTime) / 1000;
    this.updateDifficulty(dt);
    this.updatePlayer(dt);
    this.updateTelegraphs();
    this.handleSpawning(dt);
    this.handleShooting(dt);
    this.updateBullets(dt);
    this.updateBalls(dt);
    this.checkCollisions();
    this.cleanup();
    this.checkStackLimit();
  }

  private updateDifficulty(dt: number) {
    // Only timing derived values; stored timers tick in other functions.
    this.shootTimer = Math.max(0, this.shootTimer - dt);
    this.spawnTimer = Math.max(0, this.spawnTimer - dt);
  }

  private updatePlayer(dt: number) {
    const targetX = this.laneToX(this.input.getLane());
    this.player.update(dt, targetX);
  }

  private handleShooting(_dt: number) {
    if (this.input.consumeShoot() && this.shootTimer <= 0) {
      this.spawnBullet();
      this.sound.playShoot(); // hop-like SFX
      this.shootTimer = SHOOT_COOLDOWN;
    }
  }

  private handleSpawning(_dt: number) {
    const currentSpawnInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      INITIAL_SPAWN_INTERVAL - this.elapsed * SPAWN_DROP_PER_SEC
    );

    const activeCap = Math.min(
      MAX_ACTIVE_BALLS,
      BASE_ACTIVE_BALLS + Math.floor(this.elapsed / ACTIVE_INCREASE_EVERY) * ACTIVE_INCREMENT
    );

    if (this.spawnTimer <= 0 && this.balls.length + this.telegraphs.length < activeCap) {
      const lane = this.pickLane();
      this.telegraphs.push({
        lane,
        triggerTime: performance.now() + TELEGRAPH_DELAY * 1000
      });
      this.spawnTimer = currentSpawnInterval;
    }

    // Trigger telegraphs into real balls
    const now = performance.now();
    const pending: Telegraph[] = [];
    for (const t of this.telegraphs) {
      if (now >= t.triggerTime) {
        this.spawnBall(t.lane);
      } else {
        pending.push(t);
      }
    }
    this.telegraphs = pending;
  }

  private updateTelegraphs() {
    // Telegraphs handled in handleSpawning; kept here for clarity/future tweaks.
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.update(dt);
    }
  }

  private updateBalls(dt: number) {
    const defenseLineY = this.getDefenseLineY();
    const fallSpeed = BASE_FALL_SPEED + this.elapsed * FALL_SPEED_RAMP_PER_SEC;
    for (const ball of this.balls) {
      ball.speed = fallSpeed;
      ball.update(dt);
    }

    // Convert to stacked once past defense line
    const survivors: Ball[] = [];
    for (const ball of this.balls) {
      if (ball.y - ball.radius >= defenseLineY) {
        this.stacked.push({ lane: ball.lane, appleIndex: ball.appleIndex });
      } else {
        survivors.push(ball);
      }
    }
    this.balls = survivors;
  }

  private checkCollisions() {
    const remainingBalls: Ball[] = [];
    for (const ball of this.balls) {
      let hit = false;
      for (const bullet of this.bullets) {
        if (this.bulletHitsBall(bullet, ball)) {
          hit = true;
          bullet.y = -100; // mark for removal
          this.score += 1;
          break;
        }
      }
      if (!hit) remainingBalls.push(ball);
    }
    this.balls = remainingBalls;
  }

  private cleanup() {
    this.bullets = this.bullets.filter((b) => b.y + b.height > 0);
  }

  private checkStackLimit() {
    if (this.stacked.length >= STACK_LIMIT && this.state !== GameState.GameOver) {
      this.state = GameState.GameOver;
      this.sound.stopBGM(); // stop BGM immediately on game over
    }
  }

  private spawnBall(lane: Lane) {
    const x = this.laneToX(lane);
    const y = -BALL_RADIUS * 2;
    const ball = new Ball(x, y, BALL_RADIUS, BASE_FALL_SPEED, lane, this.getRandomAppleIndex());
    this.balls.push(ball);
  }

  private spawnBullet() {
    const lane = this.input.getLane();
    const x = this.laneToX(lane);
    const y = this.player.y - this.player.radius;
    const bullet = new Bullet(x, y, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED);
    this.bullets.push(bullet);
  }

  private laneToX(lane: Lane): number {
    const laneWidth = this.canvas.width / LANE_COUNT;
    return laneWidth * lane + laneWidth / 2;
  }

  private pickLane(): Lane {
    if (Math.random() < 0.35) {
      return this.lastLane;
    }
    const lane: Lane = Math.random() < 0.5 ? 0 : 1;
    this.lastLane = lane;
    return lane;
  }

  private bulletHitsBall(bullet: Bullet, ball: Ball): boolean {
    const bx = bullet.x;
    const by = bullet.y - bullet.height / 2;
    const dx = bx - ball.x;
    const dy = by - ball.y;
    const r = ball.radius + 6;
    return dx * dx + dy * dy <= r * r;
  }

  private getRandomAppleIndex() {
    return Math.floor(Math.random() * 3);
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.drawDefenseLine();
    this.drawLaneDivider();
    this.drawStackedBalls();
    this.drawTelegraphs();
    this.drawEntities();
    this.drawHUD();
    this.drawStateOverlays();
  }

  private drawBackground() {
    if (this.assetsLoaded && this.assets?.background) {
      // Stretch to canvas while keeping scroll-free viewport
      this.ctx.drawImage(this.assets.background, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      const grd = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      grd.addColorStop(0, '#0f172a');
      grd.addColorStop(1, '#0b1220');
      this.ctx.fillStyle = grd;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawLaneDivider() {
    this.ctx.strokeStyle = '#1f2937';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([10, 12]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawDefenseLine() {
    const defenseLineY = this.getDefenseLineY();
    this.ctx.strokeStyle = '#f472b6';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, defenseLineY);
    this.ctx.lineTo(this.canvas.width, defenseLineY);
    this.ctx.stroke();
  }

  private drawEntities() {
    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }
    for (const ball of this.balls) {
      const appleImage = this.assets?.apples[ball.appleIndex];
      ball.draw(this.ctx, appleImage);
    }
    this.player.draw(this.ctx, this.assets?.rabbit); // draw player sprite centered
  }

  private drawStackedBalls() {
    const defenseLineY = this.getDefenseLineY();
    const laneWidth = this.canvas.width / LANE_COUNT;
    const padding = 12;
    const y = defenseLineY + BALL_RADIUS + 6;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const laneId = lane as Lane;
      const laneStacks = this.stacked.filter((s) => s.lane === laneId);
      const startX = lane * laneWidth + padding + BALL_RADIUS;
      for (let i = 0; i < laneStacks.length; i++) {
        const x = startX + i * (BALL_RADIUS * 2 + 8);
        const appleImage = this.assets?.apples[laneStacks[i].appleIndex];
        if (appleImage) {
          const size = BALL_RADIUS * 2;
          this.ctx.drawImage(appleImage, x - size / 2, y - size / 2, size, size);
        } else {
          this.ctx.fillStyle = '#f87171';
          this.ctx.beginPath();
          this.ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  private drawTelegraphs() {
    const now = performance.now();
    for (const t of this.telegraphs) {
      const x = this.laneToX(t.lane);
      const remaining = clamp((t.triggerTime - now) / (TELEGRAPH_DELAY * 1000), 0, 1);
      const alpha = 0.35 + 0.3 * remaining;
      this.ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, BALL_RADIUS * 2, BALL_RADIUS * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawHUD() {
    this.ctx.fillStyle = '#e5e7eb';
    this.ctx.font = '20px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 20, 34);

    const timeText = this.state === GameState.Playing
      ? this.elapsed.toFixed(1)
      : this.elapsed.toFixed(1);
    this.ctx.fillText(`Time: ${timeText}s`, 20, 64);

    const stackText = `STACK ${this.stacked.length}/${STACK_LIMIT}`;
    this.ctx.fillText(stackText, 20, 94);
  }

  private drawStateOverlays() {
    if (!this.assetsLoaded) {
      this.drawOverlay('Loading...', 'Assets are loading. Please wait.');
      return;
    }
    if (this.state === GameState.Start) {
      this.drawOverlay('Click to Start', 'Survive. Stack 3 = Game Over.');
    } else if (this.state === GameState.GameOver) {
      this.drawOverlay(
        'Game Over',
        `Time ${this.elapsed.toFixed(1)}s | Score ${this.score} | Click to Restart`
      );
    }
  }

  private drawOverlay(title: string, subtitle: string) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#e5e7eb';
    this.ctx.textAlign = 'center';
    this.ctx.font = '38px "Segoe UI", sans-serif';
    this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 12);
    this.ctx.font = '20px "Segoe UI", sans-serif';
    this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height / 2 + 22);
  }
}
