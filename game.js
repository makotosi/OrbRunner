/**
 * Orb Runner
 * A lightweight one-button action game.
 */

// --- CrazyGames SDK Hooks ---
function crazyGamesStart() {
    console.log("CrazyGames: Gameplay Start");
    // window.CrazyGames.SDK.game.gameplayStart();
}

function crazyGamesEnd() {
    console.log("CrazyGames: Gameplay Stop");
    // window.CrazyGames.SDK.game.gameplayStop();
}

// --- Game Configuration ---
const CONFIG = {
    gravity: 0.25,
    thrust: -5,
    // Base parameters for difficulty scaling
    baseSpeed: 3,
    baseGap: 280,
    baseSpawnInterval: 2000, // ms

    obstacleWidth: 50,
    playerRadius: 15,
    colors: {
        player: '#e94560',
        obstacle: '#0f3460',
        text: '#ffffff'
    }
};

// --- Game State ---
const state = {
    isPlaying: false,
    score: 0, // Now represents survival time in seconds
    frames: 0,
    width: 0,
    height: 0,

    startTime: 0,
    elapsedTime: 0, // seconds
    difficulty: 1.0,

    // Dynamic parameters
    scrollSpeed: CONFIG.baseSpeed,
    currentGap: CONFIG.baseGap,
    spawnInterval: CONFIG.baseSpawnInterval,

    lastSpawnTime: 0,

    player: {
        x: 0,
        y: 0,
        velocity: 0,
        radius: CONFIG.playerRadius
    },
    obstacles: [],
    particles: []
};

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// --- Initialization ---
function init() {
    resize();
    window.addEventListener('resize', resize);

    // Input handling
    window.addEventListener('mousedown', handleInput);
    window.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        handleInput();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault(); // Prevent scrolling and default button actions
            handleInput();
        }
    });

    startBtn.addEventListener('click', () => {
        startBtn.blur();
        startGame();
    });
    restartBtn.addEventListener('click', () => {
        restartBtn.blur();
        startGame();
    });

    // Initial render
    draw();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.width = canvas.width;
    state.height = canvas.height;

    if (!state.isPlaying) {
        state.player.x = state.width * 0.2;
        state.player.y = state.height / 2;
    }
}

function handleInput() {
    if (state.isPlaying) {
        state.player.velocity = CONFIG.thrust;
        createParticles(state.player.x, state.player.y + state.player.radius, 5);
    }
}

// --- Game Loop ---
function startGame() {
    state.isPlaying = true;
    state.score = 0;
    state.frames = 0;
    state.obstacles = [];
    state.particles = [];

    // Reset Timing
    state.startTime = performance.now();
    state.elapsedTime = 0;
    state.lastSpawnTime = performance.now();

    // Reset Difficulty
    updateDifficulty();

    // Reset player
    state.player.x = state.width * 0.2;
    state.player.y = state.height / 2;
    state.player.velocity = 0;

    // UI Updates
    startScreen.classList.add('hidden');
    startScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    hud.classList.remove('hidden');
    scoreDisplay.textContent = '0.0';

    crazyGamesStart();
    spawnObstacle(); // Spawn first immediately
    loop();
}

function endGame() {
    state.isPlaying = false;

    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
    hud.classList.add('hidden');
    finalScoreDisplay.textContent = state.score.toFixed(1) + ' points';

    crazyGamesEnd();
}

function loop() {
    if (!state.isPlaying) return;

    update();
    draw();
    requestAnimationFrame(loop);
}

// --- Update Logic ---
function updateDifficulty() {
    const now = performance.now();
    state.elapsedTime = (now - state.startTime) / 1000;

    // Update Score (Survival Time)
    // Display with 1 decimal place
    state.score = Math.floor(state.elapsedTime * 10) / 10;
    scoreDisplay.textContent = state.score.toFixed(1);

    // Calculate difficulty: 1.0 to 3.0
    // 0s -> 1.0
    // 25s -> 1.5
    // 100s -> 3.0 (Max)
    state.difficulty = Math.min(3.0, 1 + state.elapsedTime * 0.02);

    // Apply difficulty to parameters
    state.scrollSpeed = CONFIG.baseSpeed * state.difficulty;
    state.currentGap = CONFIG.baseGap / state.difficulty;
    state.spawnInterval = CONFIG.baseSpawnInterval / state.difficulty;
}

function update() {
    state.frames++;

    // Player Physics
    state.player.velocity += CONFIG.gravity;
    state.player.y += state.player.velocity;

    // Floor/Ceiling Collision
    if (state.player.y + state.player.radius > state.height || state.player.y - state.player.radius < 0) {
        endGame();
        return;
    }

    // Update Difficulty & Score
    updateDifficulty();

    // Obstacle Spawning (Time Based)
    const now = performance.now();
    if (now - state.lastSpawnTime >= state.spawnInterval) {
        spawnObstacle();
        state.lastSpawnTime = now;
    }

    // Obstacle Movement & Collision
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.x -= state.scrollSpeed;

        if (checkCollision(state.player, obs)) {
            endGame();
            return;
        }

        // Note: Obstacle passing logic removed as score is now time-based

        if (obs.x + CONFIG.obstacleWidth < 0) {
            state.obstacles.splice(i, 1);
        }
    }

    updateParticles();
}

function spawnObstacle() {
    const minHeight = 50;
    const maxTotalHeight = state.height - state.currentGap - minHeight * 2;
    const topHeight = Math.floor(Math.random() * maxTotalHeight) + minHeight;

    state.obstacles.push({
        x: state.width,
        topHeight: topHeight,
        bottomY: topHeight + state.currentGap,
        passed: false
    });
}

function checkCollision(player, obs) {
    // Horizontal overlap
    if (player.x + player.radius > obs.x && player.x - player.radius < obs.x + CONFIG.obstacleWidth) {
        // Vertical overlap (Top pipe OR Bottom pipe)
        if (player.y - player.radius < obs.topHeight || player.y + player.radius > obs.bottomY) {
            return true;
        }
    }
    return false;
}

// --- Particle System ---
function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 + 2, // Downward tendency
            life: 1.0
        });
    }
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

// --- Rendering ---
function draw() {
    // Clear background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, state.width, state.height);

    // Draw Player
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.colors.player;
    ctx.fill();
    ctx.shadowBlur = 15;
    ctx.shadowColor = CONFIG.colors.player;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();

    // Draw Obstacles
    ctx.fillStyle = CONFIG.colors.obstacle;
    state.obstacles.forEach(obs => {
        // Top Pipe
        ctx.fillRect(obs.x, 0, CONFIG.obstacleWidth, obs.topHeight);
        // Bottom Pipe
        ctx.fillRect(obs.x, obs.bottomY, CONFIG.obstacleWidth, state.height - obs.bottomY);
    });

    // Draw Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1.0;
    });
}

// Start the engine
init();
