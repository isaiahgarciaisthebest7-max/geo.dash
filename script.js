/**
 * GEOMETRY ENGINE PRO - CORE LOGIC
 * Features: Fixed Timestep, AABB Collision, Particle System
 */

const CONFIG = {
    WIDTH: 854,
    HEIGHT: 480,
    GRAVITY: 2400,
    JUMP_FORCE: -720,
    PLAYER_SPEED: 480,
    GROUND_Y: 400,
    STEP: 1/120, // Physics resolution
    PADDING: 6   // Forgiving hitboxes
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const attemptEl = document.getElementById("attemptCount");

class Player {
    constructor() {
        this.size = 40;
        this.reset();
    }

    reset() {
        this.x = 150;
        this.y = CONFIG.GROUND_Y - this.size;
        this.vy = 0;
        this.rotation = 0;
        this.alive = true;
    }

    update(dt) {
        if (!this.alive) return;
        this.vy += CONFIG.GRAVITY * dt;
        this.y += this.vy * dt;

        if (this.y >= CONFIG.GROUND_Y - this.size) {
            this.y = CONFIG.GROUND_Y - this.size;
            this.vy = 0;
            // Snaps rotation to 90deg increments upon landing
            this.rotation = Math.round(this.rotation / 90) * 90;
        } else {
            this.rotation += 450 * dt; // Spin speed
        }
    }

    jump() {
        if (this.y >= CONFIG.GROUND_Y - this.size - 2) {
            this.vy = CONFIG.JUMP_FORCE;
        }
    }

    draw() {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = "#00ffcc";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffcc";
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

const Engine = {
    player: new Player(),
    objects: [],
    particles: [],
    attempt: 1,
    running: false,
    distance: 0,
    lastTime: 0,
    accumulator: 0,

    init() {
        this.setupInput();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    setupInput() {
        const trigger = () => { if(this.running) this.player.jump(); };
        window.addEventListener("keydown", (e) => { if(e.code === "Space") trigger(); });
        canvas.addEventListener("mousedown", trigger);
    },

    loadLevel() {
        this.objects = [];
        this.distance = 0;
        // Generate random sequence of spikes
        for (let i = 1; i < 200; i++) {
            const x = i * 450 + (Math.random() * 200);
            this.objects.push({ x, y: CONFIG.GROUND_Y - 38, w: 38, h: 38 });
        }
    },

    start() {
        this.running = true;
        this.player.reset();
        this.loadLevel();
        menu.classList.add("hidden");
        document.getElementById("ui").classList.remove("hidden");
    },

    die() {
        if (!this.player.alive) return;
        this.player.alive = false;
        this.createExplosion(this.player.x, this.player.y);
        setTimeout(() => {
            this.attempt++;
            attemptEl.innerText = this.attempt;
            this.player.reset();
            this.loadLevel();
            this.player.alive = true;
        }, 700);
    },

    createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 800,
                vy: (Math.random() - 0.5) * 800,
                life: 1.0
            });
        }
    },

    update(dt) {
        if (!this.player.alive) {
            this.updateParticles(dt);
            return;
        }

        this.player.update(dt);
        this.distance += CONFIG.PLAYER_SPEED * dt;

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            const screenX = obj.x - this.distance;

            // Collision Check with Padding for "Fair" Gameplay
            
            if (this.player.x < screenX + obj.w - CONFIG.PADDING &&
                this.player.x + this.player.size > screenX + CONFIG.PADDING &&
                this.player.y < obj.y + obj.h - CONFIG.PADDING &&
                this.player.y + this.player.size > obj.y + CONFIG.PADDING) {
                this.die();
            }
            if (screenX < -100) this.objects.splice(i, 1);
        }
        this.updateParticles(dt);
    },

    updateParticles(dt) {
        this.particles.forEach((p, i) => {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt * 2.5;
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    },

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render Background Grid
        ctx.strokeStyle = "#1a1a1a";
        const gridOffset = -(this.distance % 60);
        for(let x = gridOffset; x < canvas.width; x += 60) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }

        // Render Spikes
        ctx.fillStyle = "#ff3366";
        this.objects.forEach(obj => {
            const x = obj.x - this.distance;
            if (x > -50 && x < canvas.width + 50) {
                ctx.beginPath();
                ctx.moveTo(x, obj.y + obj.h);
                ctx.lineTo(x + obj.w/2, obj.y);
                ctx.lineTo(x + obj.w, obj.y + obj.h);
                ctx.fill();
            }
        });

        this.player.draw();

        // Render Particles
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(0, 255, 204, ${p.life})`;
            ctx.fillRect(p.x - this.distance + 150, p.y, 4, 4);
        });
    },

    loop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        if (this.running) {
            this.accumulator += dt;
            while (this.accumulator >= CONFIG.STEP) {
                this.update(CONFIG.STEP);
                this.accumulator -= CONFIG.STEP;
            }
            this.draw();
        }
        requestAnimationFrame((t) => this.loop(t));
    }
};

startBtn.onclick = () => Engine.start();
Engine.init();
