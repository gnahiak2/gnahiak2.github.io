/*
 * 2048
 *
 * The board is a flat array of 16 numbers. A move reads each
 * row or column as a line ordered in the direction of travel,
 * slides it towards the front, and writes it back — so all
 * four directions share one implementation.
 */

"use strict";

(function () {

    const boardEl = document.getElementById("board");
    const scoreEl = document.getElementById("score");
    const bestEl = document.getElementById("best");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const overlayBtn = document.getElementById("overlay-btn");
    const restartBtn = document.getElementById("restart-btn");

    const SIZE = 4;
    const CELLS = SIZE * SIZE;
    const BEST_KEY = "arcade.2048.best";

    const DIRECTIONS = ["left", "right", "up", "down"];
    const KEYS = {
        arrowleft: "left",
        arrowright: "right",
        arrowup: "up",
        arrowdown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down"
    };

    let grid;
    let score;
    let won;
    let over;
    let best = Number(localStorage.getItem(BEST_KEY)) || 0;
    let overlayAction = null;

    const cells = [];


    function buildBoard() {

        for (let i = 0; i < CELLS; i++) {
            const cell = document.createElement("div");
            cell.className = "tile";
            boardEl.appendChild(cell);
            cells.push(cell);
        }
    }


    function reset() {

        grid = new Array(CELLS).fill(0);
        score = 0;
        won = false;
        over = false;

        overlay.classList.add("hidden");

        spawn();
        spawn();
        render();
    }


    function spawn() {

        const open = [];

        grid.forEach((v, i) => {
            if (!v) open.push(i);
        });

        if (!open.length) return;

        const i = open[Math.floor(Math.random() * open.length)];

        grid[i] = Math.random() < 0.9 ? 2 : 4;
        cells[i].classList.add("pop");
    }


    function lineIndices(dir, i) {

        const idx = [];

        for (let k = 0; k < SIZE; k++) {
            if (dir === "left") idx.push(i * SIZE + k);
            else if (dir === "right") idx.push(i * SIZE + (SIZE - 1 - k));
            else if (dir === "up") idx.push(k * SIZE + i);
            else idx.push((SIZE - 1 - k) * SIZE + i);
        }

        return idx;
    }


    /*
     * Slide a single line towards the front. Returns the new
     * line plus which of its slots came from a merge, so those
     * tiles can be animated.
     */

    function collapse(values) {

        const nums = values.filter(Boolean);
        const out = [];
        const merged = [];

        let gained = 0;

        for (let i = 0; i < nums.length; i++) {
            if (nums[i] === nums[i + 1]) {
                const value = nums[i] * 2;
                out.push(value);
                merged.push(true);
                gained += value;
                i++;
            } else {
                out.push(nums[i]);
                merged.push(false);
            }
        }

        while (out.length < SIZE) {
            out.push(0);
            merged.push(false);
        }

        return { out, merged, gained };
    }


    function move(dir) {

        if (over) return;

        let moved = false;
        let gained = 0;

        cells.forEach((cell) => cell.classList.remove("pop"));

        for (let i = 0; i < SIZE; i++) {

            const idx = lineIndices(dir, i);
            const values = idx.map((j) => grid[j]);
            const line = collapse(values);

            gained += line.gained;

            line.out.forEach((value, k) => {
                const j = idx[k];

                if (grid[j] !== value) moved = true;

                grid[j] = value;

                if (line.merged[k]) {
                    cells[j].classList.add("pop");
                }
            });
        }

        if (!moved) return;

        score += gained;

        if (score > best) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
        }

        spawn();
        render();

        if (!won && grid.includes(2048)) {
            won = true;
            showOverlay(
                "2048!",
                "You got there. The board politely keeps going — most people do not stop either.",
                "Keep going",
                () => overlay.classList.add("hidden")
            );
            return;
        }

        if (isStuck()) {
            over = true;
            showOverlay("Game over", `No moves left. Final score: ${score}.`, "Play again", reset);
        }
    }


    function isStuck() {

        if (grid.includes(0)) return false;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const v = grid[r * SIZE + c];

                if (c < SIZE - 1 && v === grid[r * SIZE + c + 1]) return false;
                if (r < SIZE - 1 && v === grid[(r + 1) * SIZE + c]) return false;
            }
        }

        return true;
    }


    function render() {

        scoreEl.textContent = score;
        bestEl.textContent = best;

        grid.forEach((value, i) => {
            const cell = cells[i];

            cell.textContent = value || "";

            /*
             * Swap only the value class. Replacing className
             * outright would also drop the pop animation the
             * move just added.
             */

            for (const name of [...cell.classList]) {
                if (name.startsWith("v")) cell.classList.remove(name);
            }

            if (value) {
                cell.classList.add("v" + Math.min(value, 4096));
            }
        });
    }


    function showOverlay(title, text, label, action) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayBtn.textContent = label;

        overlayAction = action || reset;

        overlay.classList.remove("hidden");
    }


    document.addEventListener("keydown", (e) => {

        const dir = KEYS[e.key.toLowerCase()];

        if (!dir) return;

        e.preventDefault();
        move(dir);
    });


    let touchStart = null;

    boardEl.addEventListener("touchstart", (e) => {
        touchStart = e.touches[0];
    }, { passive: true });

    boardEl.addEventListener("touchend", (e) => {

        if (!touchStart) return;

        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.clientX;
        const dy = t.clientY - touchStart.clientY;

        touchStart = null;

        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;

        move(
            Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? "right" : "left")
                : (dy > 0 ? "down" : "up")
        );
    });


    overlayBtn.addEventListener("click", () => overlayAction());
    restartBtn.addEventListener("click", reset);


    buildBoard();
    reset();

})();
