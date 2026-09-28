/*
 * Snake
 *
 * A canvas grid you steer around. The game loop is a
 * requestAnimationFrame tick with an accumulator, so the
 * snake speed is expressed in moves per second rather than
 * whatever the display happens to refresh at.
 */

"use strict";

(function () {

    const canvas = document.getElementById("board");
    const ctx = canvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best");
    const lengthEl = document.getElementById("length");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");

    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const pauseBtn = document.getElementById("pause-btn");

    const COLS = 20;
    const ROWS = 20;
    const CELL = canvas.width / COLS;

    const BEST_KEY = "arcade.snake.best";
    const BASE_SPEED = 7;
    const SPEED_STEP = 0.35;
    const MAX_SPEED = 19;

    const HEAD = "#58b7ff";
    const BODY = "22, 131, 255";
    const FOOD = "#ff5c7a";

    const KEYS = {
        arrowup: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 }
    };

    let snake;
    let dir;
    let queued;
    let food;
    let score;
    let speed;
    let state;
    let acc;
    let last;

    let best = Number(localStorage.getItem(BEST_KEY)) || 0;


    function reset() {

        const mid = Math.floor(ROWS / 2);

        snake = [
            { x: 5, y: mid },
            { x: 4, y: mid },
            { x: 3, y: mid }
        ];

        dir = { x: 1, y: 0 };
        queued = null;
        score = 0;
        speed = BASE_SPEED;
        acc = 0;
        state = "ready";

        placeFood();
        updateStats();
        draw();
    }


    function placeFood() {

        const open = [];

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (!snake.some((s) => s.x === x && s.y === y)) {
                    open.push({ x, y });
                }
            }
        }

        food = open.length
            ? open[Math.floor(Math.random() * open.length)]
            : { x: 0, y: 0 };
    }


    function updateStats() {

        scoreEl.textContent = score;
        lengthEl.textContent = snake.length;
        bestEl.textContent = best;
    }


    function roundRect(x, y, w, h, r) {

        ctx.beginPath();

        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
            return;
        }

        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }


    function draw() {

        ctx.fillStyle = "#04101c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "rgba(88, 183, 255, 0.05)";
        ctx.lineWidth = 1;

        for (let i = 1; i < COLS; i++) {
            const p = i * CELL;

            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(canvas.width, p);
            ctx.stroke();
        }

        ctx.fillStyle = FOOD;
        ctx.beginPath();
        ctx.arc(
            food.x * CELL + CELL / 2,
            food.y * CELL + CELL / 2,
            CELL * 0.3,
            0,
            Math.PI * 2
        );
        ctx.fill();

        const pad = 2;

        snake.forEach((s, i) => {
            const fade = 1 - i / (snake.length + 4);

            ctx.fillStyle = i === 0
                ? HEAD
                : `rgba(${BODY}, ${fade.toFixed(3)})`;

            roundRect(
                s.x * CELL + pad,
                s.y * CELL + pad,
                CELL - pad * 2,
                CELL - pad * 2,
                5
            );

            ctx.fill();
        });
    }


    function step() {

        if (queued) {
            dir = queued;
            queued = null;
        }

        const head = {
            x: snake[0].x + dir.x,
            y: snake[0].y + dir.y
        };

        const wall =
            head.x < 0 ||
            head.y < 0 ||
            head.x >= COLS ||
            head.y >= ROWS;

        const self = snake.some(
            (s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y
        );

        if (wall || self) {
            gameOver();
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            speed = Math.min(MAX_SPEED, speed + SPEED_STEP);
            placeFood();
        } else {
            snake.pop();
        }

        updateStats();
    }


    function frame(now) {

        requestAnimationFrame(frame);

        if (state !== "running") {
            last = now;
            return;
        }

        acc += Math.min(100, now - last);
        last = now;

        const interval = 1000 / speed;

        while (acc >= interval) {
            acc -= interval;
            step();

            if (state !== "running") {
                break;
            }
        }

        draw();
    }


    function showOverlay(title, text) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlay.classList.remove("hidden");
    }


    function start() {

        if (state === "over") {
            reset();
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
            showOverlay(
                "Paused",
                "Take your time. The snake is not going anywhere, which is generous of it."
            );
            return;
        }

        if (state === "paused" || state === "ready") {
            start();
        }
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
                ? `New best — ${score} points. It gets faster, you know.`
                : `You scored ${score}. Best so far is ${best}.`
        );
    }


    function turn(next) {

        if (!next) return;
        if (state !== "running" && state !== "ready") return;

        if (next.x === -dir.x && next.y === -dir.y) return;

        queued = next;
    }


    document.addEventListener("keydown", (e) => {

        const key = e.key.toLowerCase();

        if (KEYS[key]) {
            e.preventDefault();

            turn(KEYS[key]);

            if (state === "ready") {
                start();
            }

            return;
        }

        if (e.key === " ") {
            e.preventDefault();
            togglePause();
        }
    });


    let touchStart = null;

    canvas.addEventListener("touchstart", (e) => {
        touchStart = e.touches[0];
    }, { passive: true });

    canvas.addEventListener("touchend", (e) => {

        if (!touchStart) return;

        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.clientX;
        const dy = t.clientY - touchStart.clientY;

        touchStart = null;

        if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;

        turn(
            Math.abs(dx) > Math.abs(dy)
                ? { x: Math.sign(dx), y: 0 }
                : { x: 0, y: Math.sign(dy) }
        );

        if (state === "ready") {
            start();
        }
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
