/*
 * Connect Four
 *
 * The board is a flat array, row-major, origin top-left; a disc
 * lands in the lowest empty slot of its column. Hard mode is a
 * depth-limited minimax with alpha-beta pruning, scored on the
 * windows of four that a position threatens.
 */

"use strict";

(function () {

    const boardEl = document.getElementById("board");
    const statusEl = document.getElementById("status");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const overlayBtn = document.getElementById("overlay-btn");

    const restartBtn = document.getElementById("restart-btn");
    const modeSel = document.getElementById("mode");
    const diffSel = document.getElementById("difficulty");

    const youEl = document.getElementById("score-you");
    const cpuEl = document.getElementById("score-cpu");
    const drawEl = document.getElementById("score-d");

    const ROWS = 6;
    const COLS = 7;
    const PLAYER = 1;
    const AI = 2;
    const DEPTH = 4;

    const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];
    const WINDOW_SCORES = { 1: 1, 2: 12, 3: 90 };

    const WINDOWS = buildWindows();

    let board;
    let cells;
    let turn;
    let roundOver;
    let busy;

    let mode = "ai";
    let difficulty = "hard";

    const scores = { you: 0, cpu: 0, draw: 0 };


    function buildWindows() {

        const out = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {

                if (c + 3 < COLS) {
                    out.push([r * COLS + c, r * COLS + c + 1, r * COLS + c + 2, r * COLS + c + 3]);
                }

                if (r + 3 < ROWS) {
                    out.push([r * COLS + c, (r + 1) * COLS + c, (r + 2) * COLS + c, (r + 3) * COLS + c]);
                }

                if (r + 3 < ROWS && c + 3 < COLS) {
                    out.push([r * COLS + c, (r + 1) * COLS + c + 1, (r + 2) * COLS + c + 2, (r + 3) * COLS + c + 3]);
                }

                if (r + 3 < ROWS && c - 3 >= 0) {
                    out.push([r * COLS + c, (r + 1) * COLS + c - 1, (r + 2) * COLS + c - 2, (r + 3) * COLS + c - 3]);
                }
            }
        }

        return out;
    }


    function buildBoard() {

        boardEl.innerHTML = "";
        cells = [];

        for (let i = 0; i < ROWS * COLS; i++) {

            const cell = document.createElement("button");

            cell.type = "button";
            cell.className = "c4-cell";
            cell.dataset.index = String(i);
            cell.setAttribute("aria-label", "column " + ((i % COLS) + 1));

            boardEl.appendChild(cell);
            cells.push(cell);
        }
    }


    function newRound() {

        board = new Array(ROWS * COLS).fill(0);
        turn = PLAYER;
        roundOver = false;
        busy = false;

        overlay.classList.add("hidden");

        paint();
        updateStatus();
    }


    function landingRow(state, col) {

        for (let r = ROWS - 1; r >= 0; r--) {
            if (!state[r * COLS + col]) return r;
        }

        return -1;
    }


    function winningCells(state) {

        for (const window of WINDOWS) {
            const [a, b, c, d] = window;

            if (state[a] && state[a] === state[b] && state[a] === state[c] && state[a] === state[d]) {
                return { mark: state[a], line: window };
            }
        }

        return null;
    }


    function drop(col, mark) {

        const row = landingRow(board, col);
        if (row < 0) return false;

        board[row * COLS + col] = mark;

        paint();

        const result = winningCells(board);

        if (result) {
            finish(result);
            return true;
        }

        if (board.every(Boolean)) {
            finish(null);
            return true;
        }

        turn = mark === PLAYER ? AI : PLAYER;

        if (mode === "ai" && turn === AI) {
            computerTurn();
        } else {
            updateStatus();
        }

        return true;
    }


    function finish(result) {

        roundOver = true;

        if (result) {
            result.line.forEach((i) => cells[i].classList.add("win"));

            if (result.mark === PLAYER) scores.you++;
            else scores.cpu++;

            const title = mode === "ai"
                ? (result.mark === PLAYER ? "You win!" : "Computer wins")
                : (result.mark === PLAYER ? "Blue wins" : "Red wins");

            showOverlay(title, "Four in a row.", "Next round");
        } else {
            scores.draw++;
            showOverlay("Draw", "The board filled up with nobody connecting four.", "Next round");
        }

        updateScores();
        updateStatus();
    }


    function computerTurn() {

        busy = true;
        updateStatus();

        setTimeout(() => {

            busy = false;

            const col = difficulty === "easy"
                ? randomColumn()
                : bestColumn();

            if (col >= 0 && !roundOver) {
                drop(col, AI);
            }
        }, 340);
    }


    function randomColumn() {

        const open = [];

        for (let c = 0; c < COLS; c++) {
            if (landingRow(board, c) >= 0) open.push(c);
        }

        if (!open.length) return -1;

        return open[Math.floor(Math.random() * open.length)];
    }


    function bestColumn() {

        let best = { score: -Infinity, col: -1 };

        for (const col of COLUMN_ORDER) {

            const row = landingRow(board, col);
            if (row < 0) continue;

            const i = row * COLS + col;
            board[i] = AI;

            const score = minimax(DEPTH - 1, false, -Infinity, Infinity);

            board[i] = 0;

            if (score > best.score) {
                best = { score, col };
            }
        }

        return best.col;
    }


    function minimax(depth, maximising, alpha, beta) {

        const result = winningCells(board);

        if (result) {
            return result.mark === AI
                ? 100000 + depth
                : -100000 - depth;
        }

        if (depth === 0) return evaluate();

        if (maximising) {

            let best = -Infinity;

            for (const col of COLUMN_ORDER) {

                const row = landingRow(board, col);
                if (row < 0) continue;

                const i = row * COLS + col;
                board[i] = AI;

                best = Math.max(best, minimax(depth - 1, false, alpha, beta));

                board[i] = 0;

                alpha = Math.max(alpha, best);
                if (beta <= alpha) break;
            }

            return best;
        }

        let best = Infinity;

        for (const col of COLUMN_ORDER) {

            const row = landingRow(board, col);
            if (row < 0) continue;

            const i = row * COLS + col;
            board[i] = PLAYER;

            best = Math.min(best, minimax(depth - 1, true, alpha, beta));

            board[i] = 0;

            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }

        return best;
    }


    function evaluate() {

        let score = 0;

        for (const window of WINDOWS) {

            let ai = 0;
            let player = 0;

            for (const i of window) {
                if (board[i] === AI) ai++;
                else if (board[i] === PLAYER) player++;
            }

            if (ai && player) continue;

            if (ai) score += WINDOW_SCORES[ai];
            else if (player) score -= WINDOW_SCORES[player];
        }

        return score;
    }


    function paint() {

        board.forEach((value, i) => {

            const cell = cells[i];

            cell.className = "c4-cell";
            cell.classList.add(value === PLAYER ? "r" : value === AI ? "y" : "empty");
        });
    }


    function clearPreview() {
        cells.forEach((cell) => cell.classList.remove("preview"));
    }


    function updateScores() {

        youEl.textContent = scores.you;
        cpuEl.textContent = scores.cpu;
        drawEl.textContent = scores.draw;
    }


    function updateStatus() {

        if (roundOver) {
            statusEl.textContent = "Round over";
            return;
        }

        if (busy) {
            statusEl.textContent = "Computer is thinking...";
            return;
        }

        if (mode === "ai") {
            statusEl.textContent = turn === PLAYER ? "You are blue — your move" : "Computer's move";
        } else {
            statusEl.textContent = turn === PLAYER ? "Blue to move" : "Red to move";
        }
    }


    function showOverlay(title, text, label) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayBtn.textContent = label;
        overlay.classList.remove("hidden");
    }


    boardEl.addEventListener("mouseover", (e) => {

        const el = e.target.closest(".c4-cell");
        if (!el || roundOver || busy) return;

        const col = Number(el.dataset.index) % COLS;
        const row = landingRow(board, col);

        clearPreview();

        if (row >= 0) {
            cells[row * COLS + col].classList.add("preview");
        }
    });


    boardEl.addEventListener("mouseleave", clearPreview);


    boardEl.addEventListener("click", (e) => {

        const el = e.target.closest(".c4-cell");
        if (!el || roundOver || busy) return;

        const col = Number(el.dataset.index) % COLS;

        if (landingRow(board, col) < 0) return;

        if (mode === "ai" && turn !== PLAYER) return;

        clearPreview();
        drop(col, turn);
    });


    restartBtn.addEventListener("click", newRound);
    overlayBtn.addEventListener("click", newRound);


    modeSel.addEventListener("change", () => {

        mode = modeSel.value;
        diffSel.disabled = mode === "two";

        scores.you = 0;
        scores.cpu = 0;
        scores.draw = 0;

        updateScores();
        newRound();
    });


    diffSel.addEventListener("change", () => {
        difficulty = diffSel.value;
        newRound();
    });


    buildBoard();
    newRound();

})();
