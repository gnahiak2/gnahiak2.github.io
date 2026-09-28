/*
 * chat.js — floating AI chat widget.
 *
 * UI only. The provider registry, storage and streaming live in
 * ai.js (window.AI), which is shared with the full-page WebUI.
 */

"use strict";

(function () {

    const AI = window.AI;
    if (!AI) return;

    const LOG_KEY = "kaihang.chat.log.v1";

    const SYSTEM = AI.SITE_SYSTEM;

    let config = null;
    let messages = [];
    let streaming = false;

    const $ = (sel, root) => (root || document).querySelector(sel);


    /* ============================================================
     * STORAGE
     * ============================================================ */

    function loadLog() {
        try {
            const raw = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            return [];
        }
    }

    function persistLog() {
        try {
            localStorage.setItem(LOG_KEY, JSON.stringify(messages.slice(-40)));
        } catch (e) { /* quota */ }
    }

    function ready() {
        return AI.isReady(config);
    }


    /* ============================================================
     * MARKUP
     * ============================================================ */

    const STARTERS = [
        "What does Kaihang work on?",
        "Tell me about OMNIVM",
        "What's his stack?"
    ];

    const root = document.createElement("div");
    root.className = "chat-root";
    root.innerHTML = `
        <button
            class="chat-fab"
            id="chat-fab"
            type="button"
            aria-expanded="false"
            aria-controls="chat-panel"
        >
            <span class="chat-fab-icon" aria-hidden="true">✦</span>
            Ask AI
        </button>

        <section
            class="chat-panel"
            id="chat-panel"
            role="dialog"
            aria-label="AI assistant"
            hidden
        >
            <header class="chat-head">

                <div class="chat-identity">

                    <span class="chat-orb" aria-hidden="true"></span>

                    <div class="chat-titles">
                        <b>ask this site</b>
                        <small id="chat-sub">no mind linked</small>
                    </div>

                </div>

                <div class="chat-head-actions">

                    <button
                        class="chat-icon-btn"
                        id="chat-clear"
                        type="button"
                        title="Clear conversation"
                        aria-label="Clear conversation"
                    >⌫</button>

                    <a
                        class="chat-icon-btn"
                        id="chat-expand"
                        href="webui/"
                        title="Open the full WebUI"
                        aria-label="Open the full WebUI"
                    >⤢</a>

                    <button
                        class="chat-icon-btn"
                        id="chat-config"
                        type="button"
                        title="Settings"
                        aria-label="Settings"
                    >⚙</button>

                    <button
                        class="chat-icon-btn"
                        id="chat-close"
                        type="button"
                        title="Close"
                        aria-label="Close chat"
                    >×</button>

                </div>

            </header>

            <div class="chat-msgs" id="chat-msgs" role="log" aria-live="polite"></div>

            <form class="chat-compose" id="chat-form">

                <textarea
                    class="chat-input"
                    id="chat-input"
                    rows="1"
                    placeholder="Ask about Kaihang, his projects, or anything…"
                    aria-label="Message"
                ></textarea>

                <button
                    class="chat-send"
                    id="chat-send"
                    type="submit"
                    aria-label="Send"
                >↑</button>

            </form>

            <div class="chat-settings" id="chat-settings" hidden>

                <h3>Link a mind</h3>

                <p class="chat-settings-note">
                    Bring your own API key. It is stored only in this
                    browser and sent straight to the provider you pick —
                    never through a server of mine. The same key powers
                    the full WebUI.
                </p>

                <div class="chat-field">
                    <label for="chat-provider">Provider</label>
                    <select id="chat-provider"></select>
                </div>

                <div class="chat-field">
                    <label for="chat-model">Model</label>
                    <input id="chat-model" list="chat-models" type="text" autocomplete="off" spellcheck="false" placeholder="model name">
                    <datalist id="chat-models"></datalist>
                </div>

                <div class="chat-field" id="chat-base-field" hidden>
                    <label for="chat-base">Base URL</label>
                    <input id="chat-base" type="text" autocomplete="off" spellcheck="false" placeholder="https://your-endpoint/v1">
                </div>

                <div class="chat-field">
                    <label for="chat-key">API key</label>
                    <input id="chat-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…">
                </div>

                <label class="chat-check">
                    <input type="checkbox" id="chat-remember" checked>
                    remember in this browser
                </label>

                <div class="chat-settings-actions">
                    <button class="chat-btn primary" id="chat-save" type="button">connect</button>
                    <button class="chat-btn" id="chat-test" type="button">test</button>
                    <button class="chat-btn" id="chat-forget" type="button">forget</button>
                </div>

                <a class="chat-key-link" id="chat-keylink" href="#" target="_blank" rel="noopener noreferrer" hidden>get a key ↗</a>

                <p class="chat-status" id="chat-status"></p>

            </div>

        </section>
    `;
    document.body.appendChild(root);


    /* ============================================================
     * ELEMENT HANDLES
     * ============================================================ */

    const fab = $("#chat-fab");
    const panel = $("#chat-panel");
    const sub = $("#chat-sub");
    const msgsEl = $("#chat-msgs");
    const form = $("#chat-form");
    const inputEl = $("#chat-input");
    const sendBtn = $("#chat-send");
    const settingsEl = $("#chat-settings");

    const providerSel = $("#chat-provider");
    const modelEl = $("#chat-model");
    const modelList = $("#chat-models");
    const baseField = $("#chat-base-field");
    const baseEl = $("#chat-base");
    const keyEl = $("#chat-key");
    const rememberEl = $("#chat-remember");
    const statusEl = $("#chat-status");
    const keyLink = $("#chat-keylink");


    /* ============================================================
     * RENDERING
     * ============================================================ */

    function bubble(role, content, opts) {
        const row = document.createElement("div");
        row.className = "chat-msg " + (role === "user" ? "user" : "assistant");

        const el = document.createElement("div");
        el.className = "chat-bubble" + (role === "error" ? " error" : "");

        if (opts && opts.raw) {
            el.textContent = content;
        } else {
            el.innerHTML = AI.formatText(content);
        }

        row.appendChild(el);
        msgsEl.appendChild(row);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        return el;
    }

    function renderStarters() {
        if (messages.length) return;

        const wrap = document.createElement("div");
        wrap.className = "chat-starters";

        for (const text of STARTERS) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "chat-starter";
            b.textContent = text;
            b.addEventListener("click", () => {
                inputEl.value = text;
                send();
            });
            wrap.appendChild(b);
        }

        msgsEl.appendChild(wrap);
    }

    function clearStarters() {
        const wrap = $(".chat-starters", msgsEl);
        if (wrap) wrap.remove();
    }

    function renderLog() {
        msgsEl.innerHTML = "";
        for (const m of messages) {
            bubble(m.role === "error" ? "error" : m.role, m.content);
        }
        renderStarters();
    }

    function updateSub() {
        sub.textContent = ready()
            ? AI.providerFor(config.provider).name + " · " + config.model
            : "no mind linked — add a key";
    }


    /* ============================================================
     * PANEL
     * ============================================================ */

    function openPanel() {
        panel.hidden = false;
        fab.setAttribute("aria-expanded", "true");
        if (!ready()) {
            openSettings("Add a provider and key to start chatting.");
        } else {
            setTimeout(() => inputEl.focus(), 40);
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function closePanel() {
        if (!settingsEl.hidden) {
            settingsEl.hidden = true;
            return;
        }
        panel.hidden = true;
        fab.setAttribute("aria-expanded", "false");
        fab.focus();
    }

    function openSettings(note) {
        settingsEl.hidden = false;
        if (note) statusEl.textContent = note;
        refreshProviderFields();
    }


    /* ============================================================
     * SETTINGS
     * ============================================================ */

    function buildProviderOptions() {
        providerSel.innerHTML = AI.providerList()
            .map((p) => `<option value="${p.id}">${AI.escapeHTML(p.name)}</option>`)
            .join("");
    }

    function refreshProviderFields() {
        const p = AI.providerFor(providerSel.value);

        modelList.innerHTML = p.models
            .map((m) => `<option value="${AI.escapeHTML(m)}"></option>`)
            .join("");

        if (!modelEl.value) modelEl.value = p.models[0] || "";

        baseField.hidden = providerSel.value !== "custom";

        if (p.keyURL) {
            keyLink.hidden = false;
            keyLink.href = p.keyURL;
        } else {
            keyLink.hidden = true;
        }
    }

    function collectConfig() {
        const id = providerSel.value;
        const p = AI.providerFor(id);

        return {
            provider: id,
            model: modelEl.value.trim() || p.models[0] || "",
            key: keyEl.value.trim() || (config && config.key) || "",
            baseURL: id === "custom" ? baseEl.value.trim() : p.baseURL,
            remember: rememberEl.checked
        };
    }

    function reflectConfig() {
        if (config) {
            providerSel.value = config.provider;
            refreshProviderFields();
            modelEl.value = config.model || modelEl.value;
            baseEl.value = config.baseURL || "";
            keyEl.value = config.key || "";
            rememberEl.checked = config.remember !== false;
        } else {
            refreshProviderFields();
        }
    }

    function saveFromForm() {
        const cfg = collectConfig();

        if (!cfg.key) {
            statusEl.textContent = "enter a key first.";
            statusEl.style.color = "var(--red)";
            return;
        }

        config = cfg;
        AI.saveConfig(cfg);
        updateSub();

        statusEl.textContent = "linked. it can hear you now.";
        statusEl.style.color = "var(--green)";

        setTimeout(() => {
            settingsEl.hidden = true;
            inputEl.focus();
        }, 500);
    }

    function testFromForm() {
        const cfg = collectConfig();

        if (!cfg.key) {
            statusEl.textContent = "enter a key first.";
            statusEl.style.color = "var(--red)";
            return;
        }

        statusEl.textContent = "testing…";
        statusEl.style.color = "var(--muted)";

        AI.stream(
            cfg,
            [{ role: "user", content: "Reply with the single word: ok" }],
            { system: SYSTEM, maxTokens: 12 }
        )
            .then((text) => {
                const got = (text || "").trim().slice(0, 60);
                statusEl.textContent = got
                    ? 'connected. it said: "' + got + '"'
                    : "connected, but it said nothing.";
                statusEl.style.color = "var(--green)";
            })
            .catch((err) => {
                statusEl.textContent = "failed: " + AI.humanError(err);
                statusEl.style.color = "var(--red)";
            });
    }

    function forget() {
        config = null;
        AI.clearConfig();
        keyEl.value = "";
        baseEl.value = "";
        statusEl.textContent = "forgotten. the key is gone from this browser.";
        statusEl.style.color = "var(--muted)";
        updateSub();
    }


    /* ============================================================
     * SEND
     * ============================================================ */

    async function send() {
        if (streaming) return;

        const text = inputEl.value.trim();
        if (!text) return;

        if (!ready()) {
            openSettings("Add a provider and key to start chatting.");
            return;
        }

        clearStarters();

        messages.push({ role: "user", content: text });
        bubble("user", text);
        inputEl.value = "";
        autosize();

        streaming = true;
        sendBtn.disabled = true;

        const el = bubble("assistant", "");
        const caret = document.createElement("span");
        caret.className = "chat-caret";
        el.appendChild(caret);

        try {
            const history = messages.filter(
                (m) => m.role === "user" || m.role === "assistant"
            );

            const full = await AI.stream(config, history, {
                system: SYSTEM,
                onDelta: (partial) => {
                    el.innerHTML = AI.formatText(partial);
                    el.appendChild(caret);
                    msgsEl.scrollTop = msgsEl.scrollHeight;
                }
            });

            const answer = (full || "").trim();
            caret.remove();

            if (answer) {
                el.innerHTML = AI.formatText(answer);
                messages.push({ role: "assistant", content: answer });
                persistLog();
            } else {
                el.innerHTML = "(it said nothing)";
            }

        } catch (err) {
            caret.remove();
            el.classList.add("error");
            el.textContent = AI.humanError(err);
            messages.push({ role: "error", content: AI.humanError(err) });
        } finally {
            streaming = false;
            sendBtn.disabled = false;
            msgsEl.scrollTop = msgsEl.scrollHeight;
            if (window.innerWidth > 800) inputEl.focus();
        }
    }


    /* ============================================================
     * COMPOSER
     * ============================================================ */

    function autosize() {
        inputEl.style.height = "auto";
        inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
    }

    function clearChat() {
        messages = [];
        localStorage.removeItem(LOG_KEY);
        msgsEl.innerHTML = "";
        renderStarters();
        inputEl.focus();
    }


    /* ============================================================
     * WIRING
     * ============================================================ */

    fab.addEventListener("click", openPanel);
    $("#chat-close").addEventListener("click", closePanel);
    $("#chat-clear").addEventListener("click", clearChat);

    $("#chat-config").addEventListener("click", () => {
        reflectConfig();
        openSettings();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        send();
    });

    inputEl.addEventListener("input", autosize);

    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });

    providerSel.addEventListener("change", () => {
        modelEl.value = AI.providerFor(providerSel.value).models[0] || "";
        refreshProviderFields();
    });

    $("#chat-save").addEventListener("click", saveFromForm);
    $("#chat-test").addEventListener("click", testFromForm);
    $("#chat-forget").addEventListener("click", forget);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !panel.hidden) closePanel();
    });

    window.openSiteChat = openPanel;


    /* ============================================================
     * BOOT
     * ============================================================ */

    buildProviderOptions();
    config = AI.loadConfig();
    messages = loadLog();
    reflectConfig();
    updateSub();
    renderLog();

})();
