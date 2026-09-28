/*
 * Memory
 *
 * Two levels, both built from the same deck. The board locks
 * itself while a mismatched pair is face up, which stops a fast
 * clicker from flipping a third card into the mix.
 */

"use strict";

(function () {

    const boardEl = document.getElementById("board");
    const movesEl = document.getElementById("moves");
    const timeEl = document.getElementById("time");
    const bestEl = document.getElementById("best");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const overlayBtn = document.getElementById("overlay-btn");

    const restartBtn = document.getElementById("restart-btn");
    const levelSel = document.getElementById("level");

    const LEVELS = {
        easy: { cols: 4, pairs: 8 },
        hard: { cols: 6, pairs: 12 }
    };

    const FACES = [
        "🍕", "🚀", "🐙", "🎲", "🌵", "⚡",
        "🍩", "🎧", "🐳", "🌙", "🔥", "🍄",
        "👾", "🧊", "🎯", "🪐", "🦊", "🍉"
    ];

    const FLIP_BACK = 750;

    let cols;
    let pairs;
    let deck;
    let cards;
    let open;
    let matchedPairs;
    let moves;
    let seconds;
    let tick;

    let running;
    let lock;
    let roundOver;


    function bestKey() {
        return "arcade.memory.best." + levelSel.value;
    }


    function readBest() {

        const value = Number(localStorage.getItem(bestKey()));

        return value > 0 ? value : null;
    }


    function newGame() {

        const level = LEVELS[levelSel.value];

        cols = level.cols;
        pairs = level.pairs;

        deck = shuffle([...FACES.slice(0, pairs), ...FACES.slice(0, pairs)]);

        open = [];
        matchedPairs = 0;
        moves = 0;
        seconds = 0;

        running = false;
        lock = false;
        roundOver = false;

        stopTimer();

        overlay.classList.add("hidden");

        buildBoard();
        paintStats();
        updateBest();
    }


    function shuffle(list) {

        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }

        return list;
    }


    function buildBoard() {

        boardEl.innerHTML = "";
        boardEl.style.setProperty("--cols", cols);

        cards = [];

        deck.forEach((face, i) => {

            const card = document.createElement("button");

            card.type = "button";
            card.className = "mem-card";
            card.dataset.index = String(i);
            card.setAttribute("aria-label", "card " + (i + 1));

            card.innerHTML =
                '<span class="mem-inner">' +
                    '<span class="mem-face front">?</span>' +
                    '<span class="mem-face back">' + face + "</span>" +
                "</span>";

            boardEl.appendChild(card);
            cards.push(card);
        });
    }


    function flip(index) {

        if (roundOver || lock) return;

        const card = cards[index];

        if (card.classList.contains("flipped") || card.classList.contains("matched")) {
            return;
        }

        if (!running) {
            running = true;
            startTimer();
        }

        card.classList.add("flipped");
        open.push(index);

        if (open.length < 2) return;

        moves++;
        paintStats();

        const [a, b] = open;

        if (deck[a] === deck[b]) {
            cards[a].classList.add("matched");
            cards[b].classList.add("matched");

            open = [];
            matchedPairs++;

            if (matchedPairs === pairs) {
                win();
            }

            return;
        }

        lock = true;

        setTimeout(() => {
            cards[a].classList.remove("flipped");
            cards[b].classList.remove("flipped");

            open = [];
            lock = false;
        }, FLIP_BACK);
    }


    function win() {

        roundOver = true;
        stopTimer();

        const best = readBest();

        if (best === null || moves < best) {
            localStorage.setItem(bestKey(), String(moves));
        }

        updateBest();

        showOverlay(
            "All matched!",
            `Cleared in ${moves} moves and ${seconds}s.`,
            "Play again"
        );
    }


    function paintStats() {

        movesEl.textContent = moves;
        timeEl.textContent = seconds;
    }


    function updateBest() {

        const best = readBest();

        bestEl.textContent = best === null ? "–" : best;
    }


    function startTimer() {

        seconds = 0;
        paintStats();

        tick = setInterval(() => {
            seconds++;
            timeEl.textContent = seconds;
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


    boardEl.addEventListener("click", (e) => {

        const el = e.target.closest(".mem-card");
        if (!el) return;

        flip(Number(el.dataset.index));
    });


    restartBtn.addEventListener("click", newGame);
    overlayBtn.addEventListener("click", newGame);
    levelSel.addEventListener("change", newGame);


    newGame();

})();
