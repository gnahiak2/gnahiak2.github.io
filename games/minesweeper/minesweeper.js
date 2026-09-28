/*
 * Minesweeper
 *
 * The whole board is one flat array of cells. A first click
 * places the mines afterwards, avoiding the clicked cell and
 * its neighbours, so the opening move is always fair.
 */

"use strict";

(function () {

    const boardEl = document.getElementById("board");
    const minesEl = document.getElementById("mines");
    const timeEl = document.getElementById("time");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const overlayBtn = document.getElementById("overlay-btn");

    const restartBtn = document.getElementById("restart-btn");
    const flagBtn = document.getElementById("flag-btn");
    const levelSel = document.getElementById("level");

    const LEVELS = {
        easy: { rows: 9, cols: 9, mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard: { rows: 16, cols: 30, mines: 99 }
    };

    let rows;
    let cols;
    let mines;
    let board;
    let cells;

    let started;
    let over;
    let revealed;
    let flags;
    let seconds;
    let tick;

    let flagMode = false;


    function neighbors(i) {

        const r = Math.floor(i / cols);
        const c = i % cols;
        const out = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {

                if (!dr && !dc) continue;

                const nr = r + dr;
                const nc = c + dc;

                if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;

                out.push(nr * cols + nc);
            }
        }

        return out;
    }


    function reset() {

        const level = LEVELS[levelSel.value];

        rows = level.rows;
        cols = level.cols;
        mines = level.mines;

        board = Array.from({ length: rows * cols }, () => ({
            mine: false,
            adj: 0,
            revealed: false,
            flagged: false
        }));

        started = false;
        over = false;
        revealed = 0;
        flags = 0;
        seconds = 0;

        stopTimer();

        overlay.classList.add("hidden");

        buildBoard();
        paint();
        updateHud();
    }


    function buildBoard() {

        boardEl.innerHTML = "";
        boardEl.style.setProperty("--cols", cols);

        cells = [];

        for (let i = 0; i < rows * cols; i++) {

            const cell = document.createElement("button");

            cell.type = "button";
            cell.className = "ms-cell";
            cell.dataset.index = String(i);
            cell.setAttribute("aria-label", "cell " + (i + 1));

            boardEl.appendChild(cell);
            cells.push(cell);
        }
    }


    function placeMines(safeIndex) {

        const safe = new Set([safeIndex, ...neighbors(safeIndex)]);
        const pool = [];

        for (let i = 0; i < board.length; i++) {
            if (!safe.has(i)) pool.push(i);
        }

        for (let n = 0; n < mines && pool.length; n++) {
            const pick = Math.floor(Math.random() * pool.length);
            board[pool[pick]].mine = true;
            pool.splice(pick, 1);
        }

        board.forEach((cell, i) => {
            if (cell.mine) return;
            cell.adj = neighbors(i).filter((n) => board[n].mine).length;
        });
    }


    function reveal(index) {

        const cell = board[index];

        if (cell.revealed || cell.flagged || over) return;

        if (cell.mine) {
            lose(index);
            return;
        }

        floodFrom(index);
        paint();
        checkWin();
    }


    function floodFrom(start) {

        const stack = [start];

        while (stack.length) {

            const i = stack.pop();
            const cell = board[i];

            if (cell.revealed || cell.flagged || cell.mine) continue;

            cell.revealed = true;
            revealed++;

            if (cell.adj === 0) {
                for (const n of neighbors(i)) {
                    if (!board[n].revealed) stack.push(n);
                }
            }
        }
    }


    function toggleFlag(index) {

        const cell = board[index];

        if (over || cell.revealed) return;

        cell.flagged = !cell.flagged;
        flags += cell.flagged ? 1 : -1;

        paint();
        updateHud();
    }


    function lose(index) {

        over = true;
        stopTimer();

        board.forEach((cell) => {
            if (cell.mine) cell.revealed = true;
        });

        paint();

        cells[index].classList.add("boom");

        updateHud();

        showOverlay(
            "Boom.",
            `That one was a mine. You had cleared ${revealed} safe cells in ${seconds}s.`,
            "Try again"
        );
    }


    function checkWin() {

        if (over) return;
        if (revealed !== board.length - mines) return;

        over = true;
        stopTimer();

        board.forEach((cell) => {
            if (cell.mine) cell.flagged = true;
        });

        flags = mines;

        paint();
        updateHud();

        showOverlay(
            "Cleared!",
            `No guesses needed, or very lucky ones. ${revealed} cells in ${seconds}s.`,
            "Play again"
        );
    }


    function paint() {

        board.forEach((cell, i) => {

            const el = cells[i];

            el.className = "ms-cell";
            el.textContent = "";

            if (cell.revealed) {
                el.classList.add("open");

                if (cell.mine) {
                    el.textContent = "💣";
                } else if (cell.adj) {
                    el.classList.add("n" + cell.adj);
                    el.textContent = String(cell.adj);
                }
            } else if (cell.flagged) {
                el.classList.add("flagged");
                el.textContent = "🚩";
            }
        });
    }


    function updateHud() {

        minesEl.textContent = Math.max(0, mines - flags);
        timeEl.textContent = seconds;
    }


    function startTimer() {

        seconds = 0;
        updateHud();

        tick = setInterval(() => {
            seconds++;
            updateHud();
        }, 1000);
    }


    function stopTimer() {

        if (tick) {
            clearInterval(tick);
            tick = null;
        }
    }


    function showOverlay(title, text, label) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayBtn.textContent = label;
        overlay.classList.remove("hidden");
    }


    function setFlagMode(on) {

        flagMode = on;

        flagBtn.textContent = "Flag mode: " + (on ? "on" : "off");
        flagBtn.classList.toggle("primary", on);
        flagBtn.setAttribute("aria-pressed", String(on));

        boardEl.classList.toggle("flagging", on);
    }


    boardEl.addEventListener("click", (e) => {

        const el = e.target.closest(".ms-cell");
        if (!el || over) return;

        const index = Number(el.dataset.index);

        if (flagMode) {
            toggleFlag(index);
            return;
        }

        if (!started) {
            placeMines(index);
            started = true;
            startTimer();
        }

        reveal(index);
    });


    boardEl.addEventListener("contextmenu", (e) => {

        const el = e.target.closest(".ms-cell");
        if (!el) return;

        e.preventDefault();

        if (!over) toggleFlag(Number(el.dataset.index));
    });


    flagBtn.addEventListener("click", () => setFlagMode(!flagMode));

    restartBtn.addEventListener("click", reset);

    overlayBtn.addEventListener("click", reset);

    levelSel.addEventListener("change", reset);


    reset();

})();
