import Ball from './entities/Ball';
import Bullet from './entities/Bullet';
import Player from './entities/Player';
import Input from './utils/Input';
import { clamp } from './utils/Math';
import { loadAssets } from './utils/Assets'; // preload images
import Sound from './utils/Sound'; // simple SFX
var GameState;
(function (GameState) {
    GameState["Start"] = "start";
    GameState["Playing"] = "playing";
    GameState["GameOver"] = "gameover";
})(GameState || (GameState = {}));
const LANE_COUNT = 2;
// Keep original layout proportions while allowing resize
const BASE_CANVAS_HEIGHT = 960;
const PLAYER_BOTTOM_OFFSET_RATIO = 200 / BASE_CANVAS_HEIGHT; // player stays ~200px above bottom at base height
const DEFENSE_LINE_RATIO = 0.92; // defense line near bottom; shared by draw/logic
const STACK_LIMIT = 3;
const BALL_RADIUS = 18;
const BULLET_WIDTH = 8;
const BULLET_HEIGHT = 18;
const BULLET_SPEED = 520; // retained for compatibility; not used in jump hitbox
const SHOOT_COOLDOWN = 0.22;
const TELEGRAPH_DELAY = 0.42;
// Jump settings (movement + scale)
const JUMP_DURATION = 0.3; // seconds
const JUMP_HEIGHT = 48; // px offset upward at peak
const JUMP_SCALE = 1.2; // visual scale during jump
// Harvest UI constants
const HARVEST_PER_CRATE = 10;
const CRATE_SCALE = 0.12; // smaller crates (drawW = naturalWidth * CRATE_SCALE)
const CRATE_STACK_SPACING_MULT = 0.62; // spacing = drawH * 0.62 (slight overlap)
const CRATE_UI_MARGIN_X = 20; // px margin from right
const CRATE_UI_MARGIN_Y = 20; // px margin from bottom
const MAX_CRATES_TO_DRAW = 8; // cap on visual stack for UI
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
    constructor(canvas) {
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "input", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "balls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "bullets", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "stacked", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "telegraphs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: GameState.Start
        });
        Object.defineProperty(this, "lastTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "score", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "harvestCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        }); // apples collected by jump
        Object.defineProperty(this, "shootTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "spawnTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "startTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "lastLane", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "currentLane", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        }); // track current lane for sprite facing
        Object.defineProperty(this, "jumpTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        }); // remaining jump time; >0 means jumping
        Object.defineProperty(this, "assetsLoaded", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "assets", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "loadingMessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Loading...'
        });
        Object.defineProperty(this, "sound", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Sound()
        });
        Object.defineProperty(this, "crateLogged", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        }); // log crate size debug once
        Object.defineProperty(this, "loop", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (timestamp) => {
                const dt = (timestamp - this.lastTime) / 1000;
                this.lastTime = timestamp;
                this.update(dt);
                this.draw();
                requestAnimationFrame(this.loop);
            }
        });
        // Resize canvas to window and scale in-flight entities so nothing disappears off-screen
        Object.defineProperty(this, "handleResize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                const prevW = this.canvas.width || 1;
                const prevH = this.canvas.height || 1;
                this.setCanvasSize();
                const scaleX = this.canvas.width / prevW;
                const scaleY = this.canvas.height / prevH;
                this.scaleEntities(scaleX, scaleY);
                // Snap player to current lane with updated height baseline
                this.player.x = this.laneToX(this.input.getLane());
                this.player.y = this.getPlayerY();
            }
        });
        this.canvas = canvas;
        const maybeCtx = this.canvas.getContext('2d');
        if (!maybeCtx)
            throw new Error('Canvas 2D context unavailable');
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
    resetGame() {
        this.balls = [];
        this.bullets = [];
        this.stacked = [];
        this.telegraphs = [];
        this.score = 0;
        this.harvestCount = 0;
        this.elapsed = 0;
        this.shootTimer = 0;
        this.spawnTimer = 0;
        this.startTime = performance.now();
        this.lastLane = Math.random() < 0.5 ? 0 : 1;
    }
    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    scaleEntities(scaleX, scaleY) {
        for (const ball of this.balls) {
            ball.x *= scaleX;
            ball.y *= scaleY;
        }
        for (const bullet of this.bullets) {
            bullet.x *= scaleX;
            bullet.y *= scaleY;
        }
    }
    getPlayerY() {
        return this.canvas.height - Math.floor(this.canvas.height * PLAYER_BOTTOM_OFFSET_RATIO);
    }
    getDefenseLineY() {
        return Math.floor(this.canvas.height * DEFENSE_LINE_RATIO);
    }
    update(dt) {
        // Gate start until assets are ready; show loading notice on click
        if (this.state === GameState.Start) {
            if (this.input.consumeShoot()) {
                if (this.assetsLoaded) {
                    this.sound.playBGM(); // start looping BGM on first user click
                    this.resetGame();
                    this.state = GameState.Playing;
                }
                else {
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
    updateDifficulty(dt) {
        // Only timing derived values; stored timers tick in other functions.
        this.shootTimer = Math.max(0, this.shootTimer - dt);
        this.spawnTimer = Math.max(0, this.spawnTimer - dt);
    }
    updatePlayer(dt) {
        const lane = this.input.getLane();
        this.currentLane = lane; // remember for sprite selection
        const targetX = this.laneToX(lane);
        this.player.update(dt, targetX);
    }
    handleShooting(_dt) {
        if (this.input.consumeShoot() && this.shootTimer <= 0 && this.jumpTimer <= 0) {
            // Jump instead of firing: start jump window and reuse hit detection
            this.jumpTimer = JUMP_DURATION;
            this.sound.playShoot(); // hop-like SFX
            this.shootTimer = SHOOT_COOLDOWN;
        }
    }
    handleSpawning(_dt) {
        const currentSpawnInterval = Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - this.elapsed * SPAWN_DROP_PER_SEC);
        const activeCap = Math.min(MAX_ACTIVE_BALLS, BASE_ACTIVE_BALLS + Math.floor(this.elapsed / ACTIVE_INCREASE_EVERY) * ACTIVE_INCREMENT);
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
        const pending = [];
        for (const t of this.telegraphs) {
            if (now >= t.triggerTime) {
                this.spawnBall(t.lane);
            }
            else {
                pending.push(t);
            }
        }
        this.telegraphs = pending;
    }
    updateTelegraphs() {
        // Telegraphs handled in handleSpawning; kept here for clarity/future tweaks.
    }
    updateBullets(dt) {
        // Bullets are no longer rendered/moved; jump uses instantaneous hitbox
        this.jumpTimer = Math.max(0, this.jumpTimer - dt);
    }
    updateBalls(dt) {
        const defenseLineY = this.getDefenseLineY();
        const fallSpeed = BASE_FALL_SPEED + this.elapsed * FALL_SPEED_RAMP_PER_SEC;
        for (const ball of this.balls) {
            ball.speed = fallSpeed;
            ball.update(dt);
        }
        // Convert to stacked once past defense line
        const survivors = [];
        for (const ball of this.balls) {
            if (ball.y - ball.radius >= defenseLineY) {
                this.stacked.push({ lane: ball.lane, appleIndex: ball.appleIndex });
            }
            else {
                survivors.push(ball);
            }
        }
        this.balls = survivors;
    }
    checkCollisions() {
        const remainingBalls = [];
        // Prepare jump hitbox if jumping (reuses bullet collision size/logic)
        const jumpActive = this.jumpTimer > 0;
        const jumpProgress = jumpActive ? 1 - this.jumpTimer / JUMP_DURATION : 0;
        // Apply vertical offset following -sin(pi * t) curve
        const jumpOffsetY = jumpActive ? -Math.sin(Math.PI * jumpProgress) * JUMP_HEIGHT : 0;
        const jumpProbe = jumpActive
            ? {
                x: this.player.x,
                y: this.player.y + jumpOffsetY - this.player.radius, // use offset position for hit
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT
            }
            : null;
        for (const ball of this.balls) {
            let hit = false;
            if (jumpProbe && this.bulletHitsBall(jumpProbe, ball)) {
                hit = true;
                this.score += 1;
                this.harvestCount += 1; // count harvest when apple is collected
            }
            if (!hit)
                remainingBalls.push(ball);
        }
        this.balls = remainingBalls;
    }
    cleanup() {
        // No bullets to clean; keep existing logic minimal
    }
    checkStackLimit() {
        if (this.stacked.length >= STACK_LIMIT && this.state !== GameState.GameOver) {
            this.state = GameState.GameOver;
            this.sound.stopBGM(); // stop BGM immediately on game over
        }
    }
    spawnBall(lane) {
        const x = this.laneToX(lane);
        const y = -BALL_RADIUS * 2;
        const ball = new Ball(x, y, BALL_RADIUS, BASE_FALL_SPEED, lane, this.getRandomAppleIndex());
        this.balls.push(ball);
    }
    spawnBullet() {
        const lane = this.input.getLane();
        const x = this.laneToX(lane);
        const y = this.player.y - this.player.radius;
        const bullet = new Bullet(x, y, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED);
        this.bullets.push(bullet);
    }
    laneToX(lane) {
        const laneWidth = this.canvas.width / LANE_COUNT;
        return laneWidth * lane + laneWidth / 2;
    }
    pickLane() {
        if (Math.random() < 0.35) {
            return this.lastLane;
        }
        const lane = Math.random() < 0.5 ? 0 : 1;
        this.lastLane = lane;
        return lane;
    }
    bulletHitsBall(bullet, ball) {
        const bx = bullet.x;
        const by = bullet.y - bullet.height / 2;
        const dx = bx - ball.x;
        const dy = by - ball.y;
        const r = ball.radius + 6;
        return dx * dx + dy * dy <= r * r;
    }
    getRandomAppleIndex() {
        return Math.floor(Math.random() * 3);
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.drawDefenseLine();
        this.drawLaneDivider();
        this.drawStackedBalls();
        this.drawTelegraphs();
        this.drawEntities();
        this.drawHUD();
        this.drawHarvestUI(); // draw crate stack and bird reward
        this.drawStateOverlays();
    }
    drawBackground() {
        if (this.assetsLoaded && this.assets?.background) {
            // Stretch to canvas while keeping scroll-free viewport
            this.ctx.drawImage(this.assets.background, 0, 0, this.canvas.width, this.canvas.height);
        }
        else {
            const grd = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            grd.addColorStop(0, '#0f172a');
            grd.addColorStop(1, '#0b1220');
            this.ctx.fillStyle = grd;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    drawLaneDivider() {
        this.ctx.strokeStyle = '#1f2937';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 12]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    drawDefenseLine() {
        const defenseLineY = this.getDefenseLineY();
        this.ctx.strokeStyle = '#f472b6';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, defenseLineY);
        this.ctx.lineTo(this.canvas.width, defenseLineY);
        this.ctx.stroke();
    }
    drawEntities() {
        for (const ball of this.balls) {
            const appleImage = this.assets?.apples[ball.appleIndex];
            ball.draw(this.ctx, appleImage);
        }
        // Choose sprite based on lane + jump state
        const jumpActive = this.jumpTimer > 0;
        const jumpProgress = jumpActive ? 1 - this.jumpTimer / JUMP_DURATION : 0;
        const jumpOffsetY = jumpActive ? -Math.sin(Math.PI * jumpProgress) * JUMP_HEIGHT : 0; // apply easing offset
        const scale = jumpActive ? JUMP_SCALE : 1; // scale up on jump
        const rabbitImage = (() => {
            if (this.currentLane === 0) {
                return jumpActive ? this.assets?.rabbitJumpLeft : this.assets?.rabbitLeft;
            }
            return jumpActive ? this.assets?.rabbitJumpRight : this.assets?.rabbitRight;
        })();
        // draw player sprite centered, with jump offset + scale
        this.player.draw(this.ctx, rabbitImage, jumpOffsetY, scale);
    }
    drawStackedBalls() {
        const defenseLineY = this.getDefenseLineY();
        const laneWidth = this.canvas.width / LANE_COUNT;
        const padding = 12;
        const y = defenseLineY + BALL_RADIUS + 6;
        for (let lane = 0; lane < LANE_COUNT; lane++) {
            const laneId = lane;
            const laneStacks = this.stacked.filter((s) => s.lane === laneId);
            const startX = lane * laneWidth + padding + BALL_RADIUS;
            for (let i = 0; i < laneStacks.length; i++) {
                const x = startX + i * (BALL_RADIUS * 2 + 8);
                const appleImage = this.assets?.apples[laneStacks[i].appleIndex];
                if (appleImage) {
                    const size = BALL_RADIUS * 2;
                    this.ctx.drawImage(appleImage, x - size / 2, y - size / 2, size, size);
                }
                else {
                    this.ctx.fillStyle = '#f87171';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
    drawTelegraphs() {
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
    drawHUD() {
        this.ctx.fillStyle = '#e5e7eb';
        this.ctx.font = '20px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Harvest: ${this.harvestCount}`, 20, 34); // show harvest prominently
        this.ctx.fillText(`Score: ${this.score}`, 20, 60);
        const timeText = this.state === GameState.Playing
            ? this.elapsed.toFixed(1)
            : this.elapsed.toFixed(1);
        this.ctx.fillText(`Time: ${timeText}s`, 20, 86);
        const stackText = `STACK ${this.stacked.length}/${STACK_LIMIT}`;
        this.ctx.fillText(stackText, 20, 112);
    }
    drawStateOverlays() {
        if (!this.assetsLoaded) {
            this.drawOverlay('Loading...', 'Assets are loading. Please wait.');
            return;
        }
        if (this.state === GameState.Start) {
            this.drawOverlay('Click to Start', 'Survive. Stack 3 = Game Over.');
        }
        else if (this.state === GameState.GameOver) {
            this.drawOverlay('Game Over', `Time ${this.elapsed.toFixed(1)}s | Score ${this.score} | Click to Restart`);
        }
    }
    drawOverlay(title, subtitle) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#e5e7eb';
        this.ctx.textAlign = 'center';
        this.ctx.font = '38px "Segoe UI", sans-serif';
        this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 12);
        this.ctx.font = '20px "Segoe UI", sans-serif';
        this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height / 2 + 22);
    }
    // Draw crate stack UI and reward bird; positioned at bottom-right
    drawHarvestUI() {
        // Always render debug text to confirm call path
        const debugText = `UI DEBUG: crates=${Math.floor(this.harvestCount / HARVEST_PER_CRATE)} remainder=${this.harvestCount % HARVEST_PER_CRATE}`;
        this.ctx.fillStyle = '#e5e7eb';
        this.ctx.font = '14px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(debugText, 20, this.canvas.height - 20);
        // If assets missing, draw a placeholder box to confirm positioning
        if (!this.assetsLoaded || !this.assets) {
            const pw = 100 * CRATE_SCALE; // placeholder width scaled
            const ph = pw * 0.8;
            const x = this.canvas.width - CRATE_UI_MARGIN_X - pw;
            const y = this.canvas.height - CRATE_UI_MARGIN_Y - ph;
            this.ctx.strokeStyle = 'rgba(255,0,0,0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, pw, ph);
            return;
        }
        const crates = Math.floor(this.harvestCount / HARVEST_PER_CRATE);
        const remainder = this.harvestCount % HARVEST_PER_CRATE;
        const state0 = this.assets.crateState0;
        const state1 = this.assets.crateState1;
        const state2 = this.assets.crateState2;
        const state3 = this.assets.crateState3;
        // Use natural size * scale to avoid inverse/compounded scaling
        const crateWidth = state0.naturalWidth * CRATE_SCALE;
        const crateHeight = state0.naturalHeight * CRATE_SCALE;
        const spacing = Math.round(crateHeight * CRATE_STACK_SPACING_MULT); // spacing from drawH to create overlap
        const bottomY = this.canvas.height - CRATE_UI_MARGIN_Y - crateHeight; // base Y for stacking
        // Debug log crate sizing once to verify scaling direction
        if (!this.crateLogged) {
            console.log('Crate scale debug', {
                CRATE_SCALE,
                naturalW: state0.naturalWidth,
                naturalH: state0.naturalHeight,
                drawW: crateWidth,
                drawH: crateHeight
            });
            this.crateLogged = true;
        }
        // Draw completed crates: always as filled (state3) and never revert to empty
        const cratesToDraw = Math.min(crates, MAX_CRATES_TO_DRAW);
        for (let i = 0; i < cratesToDraw; i++) {
            const idxFromBottom = i;
            const x = this.canvas.width - CRATE_UI_MARGIN_X - crateWidth;
            const y = bottomY - idxFromBottom * spacing; // stack upward with overlap
            this.ctx.drawImage(state3, x, y, crateWidth, crateHeight); // filled crate image
        }
        // Draw in-progress crate with state image if any remainder
        if (remainder > 0) {
            const idxFromBottom = cratesToDraw; // sit on top of completed stack
            const x = this.canvas.width - CRATE_UI_MARGIN_X - crateWidth;
            const y = bottomY - idxFromBottom * spacing; // stack upward with overlap
            // Select crate state based on remainder thresholds
            const stateImg = remainder >= 6
                ? state3 // 6-9 (fullish)
                : remainder >= 3
                    ? state2 // 3-5 (medium)
                    : state1; // 1-2 (small)
            this.ctx.drawImage(stateImg, x, y, crateWidth, crateHeight);
        }
        else if (crates === 0) {
            // Initial UI: show one empty crate only when no harvest at all
            const x = this.canvas.width - CRATE_UI_MARGIN_X - crateWidth;
            const y = bottomY;
            this.ctx.drawImage(state0, x, y, crateWidth, crateHeight);
        }
        // Bird reward once 5 crates completed (or more); use top crate position
        if (crates >= 5) {
            const bird = this.assets.rewardBird;
            const birdWidth = crateWidth * 0.6;
            const birdHeight = birdWidth * (bird.height / bird.width);
            const topIndex = Math.min(cratesToDraw - 1, MAX_CRATES_TO_DRAW - 1);
            const baseY = bottomY - topIndex * spacing;
            const x = this.canvas.width - CRATE_UI_MARGIN_X - crateWidth - birdWidth * 0.1;
            const y = baseY - birdHeight * 0.8;
            this.ctx.drawImage(bird, x, y, birdWidth, birdHeight);
        }
    }
}
//# sourceMappingURL=Game.js.map