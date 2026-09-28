/*
 * Pong
 *
 * The computer only really tries when the ball is heading its
 * way, and drifts back to the middle otherwise. That keeps it
 * beatable without making it look asleep.
 */

"use strict";

(function () {

    const canvas = document.getElementById("board");
    const ctx = canvas.getContext("2d");

    const youEl = document.getElementById("score-you");
    const cpuEl = document.getElementById("score-cpu");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");

    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const pauseBtn = document.getElementById("pause-btn");

    const W = canvas.width;
    const H = canvas.height;

    const PADDLE_W = 10;
    const PADDLE_H = 64;
    const MARGIN = 16;
    const WIN_SCORE = 7;
    const MAX_SPEED = 8;

    let player;
    let cpu;
    let ball;
    let youScore;
    let cpuScore;
    let speed;
    let state;
    let acc;
    let last;
    let upKey = false;
    let downKey = false;


    function reset() {

        player = { x: MARGIN, y: (H - PADDLE_H) / 2, speed: 6 };
        cpu = { x: W - MARGIN - PADDLE_W, y: (H - PADDLE_H) / 2, speed: 4.4 };

        ball = { x: W / 2, y: H / 2, r: 7, dx: 0, dy: 0 };

        youScore = 0;
        cpuScore = 0;
        speed = 4.2;
        state = "ready";
        acc = 0;

        updateScore();
        draw();
    }


    function serve(direction) {

        ball.x = W / 2;
        ball.y = H / 2;

        const angle = (Math.random() * 0.5 - 0.25) * Math.PI;

        ball.dx = Math.cos(angle) * speed * direction;
        ball.dy = Math.sin(angle) * speed;
    }


    function step() {

        if (upKey) player.y -= player.speed;
        if (downKey) player.y += player.speed;

        player.y = Math.max(0, Math.min(H - PADDLE_H, player.y));

        moveCpu();

        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.y - ball.r < 0) {
            ball.y = ball.r;
            ball.dy = Math.abs(ball.dy);
        }

        if (ball.y + ball.r > H) {
            ball.y = H - ball.r;
            ball.dy = -Math.abs(ball.dy);
        }

        hitPaddle(player, 1);
        hitPaddle(cpu, -1);

        if (ball.x + ball.r < 0) {
            score(true);
        } else if (ball.x - ball.r > W) {
            score(false);
        }
    }


    function moveCpu() {

        const target = ball.dx > 0
            ? ball.y - PADDLE_H / 2
            : H / 2 - PADDLE_H / 2;

        const diff = target - cpu.y;

        cpu.y += Math.max(-cpu.speed, Math.min(cpu.speed, diff));
        cpu.y = Math.max(0, Math.min(H - PADDLE_H, cpu.y));
    }


    function hitPaddle(paddle, direction) {

        const movingToward = direction > 0 ? ball.dx < 0 : ball.dx > 0;
        if (!movingToward) return;

        const withinX =
            ball.x + ball.r > paddle.x &&
            ball.x - ball.r < paddle.x + PADDLE_W;

        const withinY =
            ball.y + ball.r > paddle.y &&
            ball.y - ball.r < paddle.y + PADDLE_H;

        if (!withinX || !withinY) return;

        ball.x = direction > 0
            ? paddle.x + PADDLE_W + ball.r
            : paddle.x - ball.r;

        const hit = (ball.y - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2);
        const angle = Math.max(-1, Math.min(1, hit)) * (Math.PI / 3.2);

        speed = Math.min(MAX_SPEED, speed + 0.12);

        ball.dx = Math.cos(angle) * speed * direction;
        ball.dy = Math.sin(angle) * speed;
    }


    function score(youScored) {

        if (youScored) youScore++;
        else cpuScore++;

        updateScore();

        if (youScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
            finish(youScore >= WIN_SCORE);
            return;
        }

        state = "ready";
        ball.dx = 0;
        ball.dy = 0;
        speed = 4.2;

        showOverlay(
            youScored ? "Point!" : "Point for the machine",
            youScore >= cpuScore
                ? `${youScore} – ${cpuScore}. Press play to serve.`
                : `${cpuScore} – ${youScore} to the machine. Press play to serve.`
        );
    }


    function finish(youWon) {

        state = "over";

        draw();

        showOverlay(
            youWon ? "You win!" : "Machine wins",
            `${youScore} – ${cpuScore}. The machine has already forgotten this happened.`
        );
    }


    function updateScore() {

        youEl.textContent = youScore;
        cpuEl.textContent = cpuScore;
    }


    function draw() {

        ctx.fillStyle = "#04101c";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(88, 183, 255, 0.14)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);

        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.fillStyle = "#58b7ff";
        ctx.beginPath();
        ctx.roundRect(player.x, player.y, PADDLE_W, PADDLE_H, 5);
        ctx.fill();

        ctx.fillStyle = "#ff5c7a";
        ctx.beginPath();
        ctx.roundRect(cpu.x, cpu.y, PADDLE_W, PADDLE_H, 5);
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

        if (state === "over") reset();

        if (ball.dx === 0) {
            serve(youScore >= cpuScore ? 1 : -1);
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
            showOverlay("Paused", "Nothing moves until you say so.");
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


    function movePaddleTo(clientY) {

        const rect = canvas.getBoundingClientRect();
        const scale = H / rect.height;

        player.y = Math.max(
            0,
            Math.min(H - PADDLE_H, (clientY - rect.top) * scale - PADDLE_H / 2)
        );
    }


    canvas.addEventListener("mousemove", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.clientY);
    });

    canvas.addEventListener("touchstart", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.touches[0].clientY);
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
        if (state === "running" || state === "ready") movePaddleTo(e.touches[0].clientY);
    }, { passive: true });


    document.addEventListener("keydown", (e) => {

        const key = e.key.toLowerCase();

        if (key === "arrowup" || key === "w") {
            upKey = true;
            e.preventDefault();
        } else if (key === "arrowdown" || key === "s") {
            downKey = true;
            e.preventDefault();
        } else if (e.key === " ") {
            e.preventDefault();
            togglePause();
        }
    });


    document.addEventListener("keyup", (e) => {

        const key = e.key.toLowerCase();

        if (key === "arrowup" || key === "w") upKey = false;
        if (key === "arrowdown" || key === "s") downKey = false;
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
