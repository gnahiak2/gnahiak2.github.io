/*
 * Breakout
 *
 * Fixed 60 Hz stepping, same as Snake, so the ball never
 * tunnels through a brick between frames. The bounce side is
 * chosen by comparing how far the ball has pushed into the
 * brick on each axis.
 */

"use strict";

(function () {

    const canvas = document.getElementById("board");
    const ctx = canvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best");
    const livesEl = document.getElementById("lives");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");

    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const pauseBtn = document.getElementById("pause-btn");

    const W = canvas.width;
    const H = canvas.height;

    const COLS = 10;
    const ROWS = 6;
    const MARGIN = 16;
    const GAP = 6;
    const BRICK_H = 16;
    const BRICK_TOP = 46;

    const BW = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;

    const ROW_COLORS = [
        "#ff5c7a",
        "#ffb454",
        "#b18cff",
        "#58b7ff",
        "#4ade80",
        "#37c6c4"
    ];

    const BEST_KEY = "arcade.breakout.best";

    let paddle;
    let ball;
    let bricks;
    let score;
    let lives;
    let speed;
    let state;
    let acc;
    let last;
    let leftKey = false;
    let rightKey = false;

    let best = Number(localStorage.getItem(BEST_KEY)) || 0;


    function buildBricks() {

        const out = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                out.push({
                    x: MARGIN + c * (BW + GAP),
                    y: BRICK_TOP + r * (BRICK_H + GAP),
                    w: BW,
                    h: BRICK_H,
                    row: r,
                    alive: true
                });
            }
        }

        return out;
    }


    function reset() {

        paddle = {
            w: 92,
            h: 10,
            x: (W - 92) / 2,
            y: H - 28,
            speed: 7
        };

        ball = { x: W / 2, y: paddle.y - 14, r: 6, dx: 0, dy: 0 };

        bricks = buildBricks();
        score = 0;
        lives = 3;
        speed = 3.4;
        state = "ready";
        acc = 0;

        updateStats();
        draw();
    }


    function serve() {

        ball.x = W / 2;
        ball.y = paddle.y - 14;

        const angle = (-55 + Math.random() * 110) * Math.PI / 180;

        ball.dx = Math.sin(angle) * speed;
        ball.dy = -Math.cos(angle) * speed;
    }


    function speedUp() {

        speed = Math.min(6.8, speed + 0.035);

        const m = Math.hypot(ball.dx, ball.dy) || 1;

        ball.dx = ball.dx / m * speed;
        ball.dy = ball.dy / m * speed;
    }


    function step() {

        if (leftKey) paddle.x -= paddle.speed;
        if (rightKey) paddle.x += paddle.speed;

        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x - ball.r < 0) {
            ball.x = ball.r;
            ball.dx = Math.abs(ball.dx);
        }

        if (ball.x + ball.r > W) {
            ball.x = W - ball.r;
            ball.dx = -Math.abs(ball.dx);
        }

        if (ball.y - ball.r < 0) {
            ball.y = ball.r;
            ball.dy = Math.abs(ball.dy);
        }

        hitPaddle();
        hitBrick();

        if (ball.y - ball.r > H) {
            loseBall();
            return;
        }

        if (bricks.every((b) => !b.alive)) {
            win();
        }
    }


    function hitPaddle() {

        if (ball.dy <= 0) return;

        const withinX =
            ball.x >= paddle.x - ball.r &&
            ball.x <= paddle.x + paddle.w + ball.r;

        const withinY =
            ball.y + ball.r >= paddle.y &&
            ball.y - ball.r <= paddle.y + paddle.h;

        if (!withinX || !withinY) return;

        ball.y = paddle.y - ball.r;

        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const angle = Math.max(-1, Math.min(1, hit)) * (Math.PI / 3);

        ball.dx = Math.sin(angle) * speed;
        ball.dy = -Math.abs(Math.cos(angle) * speed);
    }


    function hitBrick() {

        for (const brick of bricks) {

            if (!brick.alive) continue;

            const overlap =
                ball.x + ball.r > brick.x &&
                ball.x - ball.r < brick.x + brick.w &&
                ball.y + ball.r > brick.y &&
                ball.y - ball.r < brick.y + brick.h;

            if (!overlap) continue;

            brick.alive = false;
            score += 10 * (ROWS - brick.row);

            const overlapX = Math.min(
                ball.x + ball.r - brick.x,
                brick.x + brick.w - (ball.x - ball.r)
            );

            const overlapY = Math.min(
                ball.y + ball.r - brick.y,
                brick.y + brick.h - (ball.y - ball.r)
            );

            if (overlapX < overlapY) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }

            speedUp();
            updateStats();
            break;
        }
    }


    function loseBall() {

        lives--;
        updateStats();

        if (lives <= 0) {
            gameOver();
            return;
        }

        state = "ready";
        ball.dx = 0;
        ball.dy = 0;

        showOverlay(
            "Ball lost",
            `${lives} ${lives === 1 ? "ball" : "balls"} left. Press play to serve again.`
        );
    }


    function win() {

        state = "won";

        if (score > best) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
        }

        updateStats();
        draw();

        showOverlay(
            "Cleared!",
            `Every brick gone with ${lives} ${lives === 1 ? "ball" : "balls"} to spare. Score: ${score}.`
        );
    }


    function gameOver() {

        state = "over";

        const record = score > best;

        if (record) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
        }

        updateStats();
        draw();

        showOverlay(
            "Game over",
            record
                ? `New best — ${score} points. The bricks will miss you.`
                : `You scored ${score}. Best so far is ${best}.`
        );
    }


    function updateStats() {

        scoreEl.textContent = score;
        bestEl.textContent = best;
        livesEl.textContent = Math.max(0, lives);
    }


    function draw() {

        ctx.fillStyle = "#04101c";
        ctx.fillRect(0, 0, W, H);

        for (const brick of bricks) {

            if (!brick.alive) continue;

            ctx.fillStyle = ROW_COLORS[brick.row % ROW_COLORS.length];

            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
            ctx.fill();
        }

        ctx.fillStyle = "#58b7ff";

        ctx.beginPath();
        ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 5);
        ctx.fill();

        ctx.fillStyle = "#edf6ff";

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
    }


    function showOverlay(title, text) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlay.classList.remove("hidden");
    }


    function start() {

        if (state === "over" || state === "won") {
            reset();
        }

        if (ball.dy === 0) {
            serve();
        }

        state = "running";
        acc = 0;
        last = performance.now();

        overlay.classList.add("hidden");
        pauseBtn.textContent = "Pause";
    }


    function togglePause() {

        if (state === "running") {
            state = "paused";
            pauseBtn.textContent = "Resume";
            showOverlay("Paused", "The ball is being very patient about this.");
            return;
        }

        if (state === "paused" || state === "ready") {
            start();
        }
    }


    function frame(now) {

        requestAnimationFrame(frame);

        if (state !== "running") {
            last = now;
            return;
        }

        acc += Math.min(100, now - last);
        last = now;

        while (acc >= 1000 / 60) {
            acc -= 1000 / 60;
            step();

            if (state !== "running") break;
        }

        draw();
    }


    function movePaddleTo(clientX) {

        const rect = canvas.getBoundingClientRect();
        const scale = W / rect.width;

        paddle.x = Math.max(
            0,
            Math.min(W - paddle.w, (clientX - rect.left) * scale - paddle.w / 2)
        );
    }


    canvas.addEventListener("mousemove", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.clientX);
    });

    canvas.addEventListener("touchstart", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.touches[0].clientX);
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.touches[0].clientX);
    }, { passive: true });


    document.addEventListener("keydown", (e) => {

        const key = e.key.toLowerCase();

        if (key === "arrowleft" || key === "a") {
            leftKey = true;
            e.preventDefault();
        } else if (key === "arrowright" || key === "d") {
            rightKey = true;
            e.preventDefault();
        } else if (e.key === " ") {
            e.preventDefault();
            togglePause();
        }
    });


    document.addEventListener("keyup", (e) => {

        const key = e.key.toLowerCase();

        if (key === "arrowleft" || key === "a") leftKey = false;
        if (key === "arrowright" || key === "d") rightKey = false;
    });


    startBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", togglePause);

    restartBtn.addEventListener("click", () => {
        reset();
        start();
    });


    reset();
    requestAnimationFrame(frame);

})();
