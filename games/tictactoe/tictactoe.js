/*
 * Tic-Tac-Toe
 *
 * Two modes: two players sharing the board, or one player
 * against the computer. Hard mode is a straight minimax with
 * depth weighting, which cannot be beaten — easy mode just
 * picks a random empty square.
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

    const scoreX = document.getElementById("score-x");
    const scoreO = document.getElementById("score-o");
    const scoreD = document.getElementById("score-d");

    const LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    const HUMAN = "X";
    const AI = "O";
    const DELAY = 320;

    let board;
    let cells;
    let turn;
    let roundOver;
    let busy;

    let mode = "ai";
    let difficulty = "hard";

    const scores = { X: 0, O: 0, D: 0 };


    function buildBoard() {

        boardEl.innerHTML = "";
        cells = [];

        for (let i = 0; i < 9; i++) {

            const cell = document.createElement("button");

            cell.type = "button";
            cell.className = "ttt-cell";
            cell.dataset.index = String(i);
            cell.setAttribute("aria-label", "square " + (i + 1));

            boardEl.appendChild(cell);
            cells.push(cell);
        }
    }


    function newRound() {

        board = new Array(9).fill("");
        turn = HUMAN;
        roundOver = false;
        busy = false;

        overlay.classList.add("hidden");

        paint();
        updateStatus();
    }


    function winner(board) {

        for (const line of LINES) {
            const [a, b, c] = line;

            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { mark: board[a], line };
            }
        }

        return null;
    }


    function place(index, mark) {

        board[index] = mark;
        paint();

        const result = winner(board);

        if (result) {
            finish(result);
            return;
        }

        if (board.every(Boolean)) {
            finish(null);
            return;
        }

        turn = mark === HUMAN ? AI : HUMAN;

        if (mode === "ai" && turn === AI) {
            computerTurn();
        } else {
            updateStatus();
        }
    }


    function finish(result) {

        roundOver = true;

        if (result) {
            scores[result.mark]++;
            result.line.forEach((i) => cells[i].classList.add("win"));

            const label = mode === "ai"
                ? (result.mark === HUMAN ? "You win!" : "Computer wins")
                : `${result.mark} wins`;

            showOverlay(label, "Three in a row.", "Next round");
        } else {
            scores.D++;
            showOverlay("Draw", "Nobody got three. Very diplomatic.", "Next round");
        }

        updateScores();
        updateStatus();
    }


    function computerTurn() {

        busy = true;
        updateStatus();

        setTimeout(() => {

            busy = false;

            const index = difficulty === "easy"
                ? randomMove()
                : bestMove();

            if (index >= 0 && !roundOver) {
                place(index, AI);
            }
        }, DELAY);
    }


    function randomMove() {

        const open = board
            .map((v, i) => (v ? null : i))
            .filter((i) => i !== null);

        if (!open.length) return -1;

        return open[Math.floor(Math.random() * open.length)];
    }


    function bestMove() {

        let best = { score: -Infinity, index: -1 };

        for (let i = 0; i < 9; i++) {

            if (board[i]) continue;

            board[i] = AI;

            const score = minimax(0, false);

            board[i] = "";

            if (score > best.score) {
                best = { score, index: i };
            }
        }

        return best.index;
    }


    function minimax(depth, maximising) {

        const result = winner(board);

        if (result) {
            return result.mark === AI
                ? 10 - depth
                : depth - 10;
        }

        if (board.every(Boolean)) return 0;

        let best = maximising ? -Infinity : Infinity;

        for (let i = 0; i < 9; i++) {

            if (board[i]) continue;

            board[i] = maximising ? AI : HUMAN;

            const score = minimax(depth + 1, !maximising);

            board[i] = "";

            best = maximising
                ? Math.max(best, score)
                : Math.min(best, score);
        }

        return best;
    }


    function paint() {

        board.forEach((value, i) => {

            const cell = cells[i];

            cell.textContent = value;
            cell.className = "ttt-cell";

            if (value) {
                cell.classList.add("taken", value.toLowerCase());
            }
        });
    }


    function updateScores() {

        scoreX.textContent = scores.X;
        scoreO.textContent = scores.O;
        scoreD.textContent = scores.D;
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
            statusEl.textContent = turn === HUMAN ? "You are X — your move" : "Computer's move";
        } else {
            statusEl.textContent = `${turn} to move`;
        }
    }


    function showOverlay(title, text, label) {

        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayBtn.textContent = label;
        overlay.classList.remove("hidden");
    }


    boardEl.addEventListener("click", (e) => {

        const el = e.target.closest(".ttt-cell");

        if (!el || roundOver || busy) return;

        const index = Number(el.dataset.index);

        if (board[index]) return;

        if (mode === "ai" && turn !== HUMAN) return;

        place(index, turn);
    });


    restartBtn.addEventListener("click", newRound);
    overlayBtn.addEventListener("click", newRound);


    modeSel.addEventListener("change", () => {

        mode = modeSel.value;

        diffSel.disabled = mode === "two";

        scores.X = 0;
        scores.O = 0;
        scores.D = 0;

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
