/*
 * webui.js — full-page chat client, Open WebUI style.
 *
 * Shares the provider registry, storage key and streaming
 * client in ../ai.js (window.AI) with the floating widget.
 * Conversations live in localStorage, one array per browser.
 */

"use strict";

(function () {

    const AI = window.AI;
    if (!AI) return;

    const CHATS_KEY = "kaihang.webui.chats.v1";
    const ACTIVE_KEY = "kaihang.webui.active.v1";

    const $ = (sel, root) => (root || document).querySelector(sel);

    let config = AI.loadConfig();
    let chats = loadChats();
    let activeId = localStorage.getItem(ACTIVE_KEY);
    let streaming = false;
    let controller = null;

    if (!chats.length) chats.push(makeChat());
    if (!chats.some((c) => c.id === activeId)) activeId = chats[0].id;


    /* ============================================================
     * DOM
     * ============================================================ */

    const shell = $("#webui");
    const chatsEl = $("#chats");
    const thread = $("#thread");
    const composer = $("#composer");
    const promptEl = $("#prompt");
    const sendBtn = $("#send-btn");
    const modelBtn = $("#model-btn");
    const modelName = $("#model-name");
    const modelProvider = $("#model-provider");
    const modelMenu = $("#model-menu");
    const connectDot = $("#connect-dot");
    const connectText = $("#connect-text");

    const modal = $("#modal");
    const providerSel = $("#set-provider");
    const modelEl = $("#set-model");
    const modelList = $("#set-models");
    const baseField = $("#set-base-field");
    const baseEl = $("#set-base");
    const keyEl = $("#set-key");
    const systemEl = $("#set-system");
    const rememberEl = $("#set-remember");
    const statusEl = $("#set-status");
    const keyLink = $("#set-keylink");


    /* ============================================================
     * CONVERSATIONS
     * ============================================================ */

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function makeChat() {
        return { id: uid(), title: "New chat", messages: [] };
    }

    function loadChats() {
        try {
            const raw = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            return [];
        }
    }

    function saveChats() {
        try {
            localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 60)));
            localStorage.setItem(ACTIVE_KEY, activeId || "");
        } catch (e) { /* quota */ }
    }

    function activeChat() {
        return chats.find((c) => c.id === activeId) || null;
    }

    function newChat() {
        const c = makeChat();
        chats.unshift(c);
        activeId = c.id;
        saveChats();
        renderChats();
        renderThread();
        if (window.innerWidth > 820) promptEl.focus();
    }

    function deleteChat(id) {
        chats = chats.filter((c) => c.id !== id);
        if (!chats.length) chats.push(makeChat());
        if (activeId === id) activeId = chats[0].id;
        saveChats();
        renderChats();
        renderThread();
    }

    function setActive(id) {
        activeId = id;
        saveChats();
        renderChats();
        renderThread();
        shell.classList.remove("side-open");
        showBackdrop(false);
    }

    function renderChats() {
        chatsEl.innerHTML = "";

        for (const c of chats) {
            const row = document.createElement("div");
            row.className = "webui-chat" + (c.id === activeId ? " active" : "");

            const title = document.createElement("span");
            title.className = "webui-chat-title";
            title.textContent = c.title || "New chat";

            const del = document.createElement("button");
            del.type = "button";
            del.className = "webui-chat-del";
            del.textContent = "×";
            del.title = "Delete";
            del.setAttribute("aria-label", "Delete conversation");
            del.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteChat(c.id);
            });

            row.addEventListener("click", () => setActive(c.id));

            row.appendChild(title);
            row.appendChild(del);
            chatsEl.appendChild(row);
        }
    }


    /* ============================================================
     * THREAD
     * ============================================================ */

    const SUGGESTIONS = [
        { title: "What does Kaihang work on?", text: "What does Kaihang work on?" },
        { title: "Explain OMNIVM", text: "Explain OMNIVM like I'm new." },
        { title: "Write some Rust", text: "Write a tiny Rust program that blinks an LED." },
        { title: "Summarise this site", text: "Summarise what this site is about." }
    ];

    function renderWelcome() {
        thread.innerHTML = "";

        const wrap = document.createElement("div");
        wrap.className = "webui-welcome";

        const orb = document.createElement("div");
        orb.className = "webui-welcome-orb";

        const h = document.createElement("h1");
        h.textContent = "How can I help?";

        const p = document.createElement("p");
        p.textContent = AI.isReady(config)
            ? "Ask anything. You are talking to " + config.model + "."
            : "Connect a provider to start. Your key never leaves this browser.";

        const grid = document.createElement("div");
        grid.className = "webui-suggestions";

        for (const s of SUGGESTIONS) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "webui-suggestion";
            b.innerHTML = `<b>${AI.escapeHTML(s.title)}</b>${AI.escapeHTML(s.text)}`;
            b.addEventListener("click", () => {
                promptEl.value = s.text;
                autosize();
                send();
            });
            grid.appendChild(b);
        }

        wrap.appendChild(orb);
        wrap.appendChild(h);
        wrap.appendChild(p);
        wrap.appendChild(grid);
        thread.appendChild(wrap);
    }

    function renderThread() {
        const chat = activeChat();

        if (!chat || !chat.messages.length) {
            renderWelcome();
            return;
        }

        thread.innerHTML = "";
        for (const m of chat.messages) {
            appendMessage(m.role, m.content, { save: false });
        }
        scrollBottom();
    }

    function appendMessage(role, content, opts) {
        opts = opts || {};

        const row = document.createElement("div");
        row.className = "msg " + (role === "user" ? "user" : "assistant");
        if (role === "error") row.classList.add("error");

        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";
        avatar.textContent = role === "user" ? "K" : "AI";

        const body = document.createElement("div");
        body.className = "msg-body";

        const label = document.createElement("div");
        label.className = "msg-role";
        label.textContent =
            role === "user" ? "You" : role === "error" ? "Error" : "Assistant";

        const contentEl = document.createElement("div");
        contentEl.className = "msg-content";
        contentEl.innerHTML = AI.formatText(content);

        body.appendChild(label);
        body.appendChild(contentEl);
        row.appendChild(avatar);
        row.appendChild(body);
        thread.appendChild(row);
        scrollBottom();

        if (role !== "error" && !opts.streaming) {
            body.appendChild(toolsFor(role, content, row));
        }

        return { row, contentEl, body };
    }

    function toolsFor(role, content) {
        const tools = document.createElement("div");
        tools.className = "msg-tools";

        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "msg-tool";
        copy.textContent = "copy";
        copy.addEventListener("click", () => {
            navigator.clipboard.writeText(content).then(
                () => { copy.textContent = "copied"; },
                () => { copy.textContent = "nope"; }
            );
            setTimeout(() => { copy.textContent = "copy"; }, 1200);
        });
        tools.appendChild(copy);

        if (role === "assistant") {
            const regen = document.createElement("button");
            regen.type = "button";
            regen.className = "msg-tool";
            regen.textContent = "regenerate";
            regen.addEventListener("click", regenerate);
            tools.appendChild(regen);
        }

        return tools;
    }

    function scrollBottom() {
        thread.scrollTop = thread.scrollHeight;
    }

    function titleFrom(text) {
        const t = text.replace(/\s+/g, " ").trim();
        return t.length > 42 ? t.slice(0, 39).trim() + "…" : t;
    }


    /* ============================================================
     * SEND
     * ============================================================ */

    async function send() {
        if (streaming) return;

        const text = promptEl.value.trim();
        if (!text) return;

        if (!AI.isReady(config)) {
            openSettings({ note: "Connect a provider before sending." });
            return;
        }

        const chat = activeChat();
        if (!chat) return;

        if (!chat.messages.length) {
            chat.title = titleFrom(text);
            renderChats();
        }

        chat.messages.push({ role: "user", content: text });
        appendMessage("user", text);
        promptEl.value = "";
        autosize();
        saveChats();

        await runAssistant(chat);
    }

    async function runAssistant(chat) {
        streaming = true;
        setStreaming(true);

        const { contentEl, body } = appendMessage("assistant", "", {
            streaming: true
        });

        const caret = document.createElement("span");
        caret.className = "msg-caret";
        contentEl.appendChild(caret);

        controller = new AbortController();

        try {
            const history = chat.messages.filter(
                (m) => m.role === "user" || m.role === "assistant"
            );

            const full = await AI.stream(config, history, {
                system: config.system || AI.SITE_SYSTEM,
                signal: controller.signal,
                onDelta: (partial) => {
                    contentEl.innerHTML = AI.formatText(partial);
                    contentEl.appendChild(caret);
                    scrollBottom();
                }
            });

            const answer = (full || "").trim();
            caret.remove();

            if (answer) {
                contentEl.innerHTML = AI.formatText(answer);
                chat.messages.push({ role: "assistant", content: answer });
                body.appendChild(toolsFor("assistant", answer));
                saveChats();
            } else {
                contentEl.textContent = "(it said nothing)";
            }

        } catch (err) {
            caret.remove();

            if (err && err.name === "AbortError") {
                contentEl.textContent = "(stopped)";
            } else {
                const msg = AI.humanError(err);
                contentEl.textContent = msg;
                contentEl.parentElement.parentElement.classList.add("error");
                chat.messages.push({ role: "error", content: msg });
                saveChats();
            }

        } finally {
            streaming = false;
            controller = null;
            setStreaming(false);
            scrollBottom();
            if (window.innerWidth > 820) promptEl.focus();
        }
    }

    function regenerate() {
        if (streaming) return;

        const chat = activeChat();
        if (!chat || !chat.messages.length) return;

        // Drop trailing assistant/error turns, keep the last user turn.
        while (
            chat.messages.length &&
            chat.messages[chat.messages.length - 1].role !== "user"
        ) {
            chat.messages.pop();
        }

        if (!chat.messages.length) return;

        saveChats();
        renderThread();
        runAssistant(chat);
    }

    function stop() {
        if (controller) controller.abort();
    }

    function setStreaming(on) {
        sendBtn.disabled = false;
        sendBtn.classList.toggle("stop", on);
        sendBtn.textContent = on ? "■" : "↑";
        sendBtn.setAttribute("aria-label", on ? "Stop" : "Send");
    }


    /* ============================================================
     * COMPOSER
     * ============================================================ */

    function autosize() {
        promptEl.style.height = "auto";
        promptEl.style.height = Math.min(promptEl.scrollHeight, 200) + "px";
    }

    composer.addEventListener("submit", (e) => {
        e.preventDefault();
        if (streaming) {
            stop();
        } else {
            send();
        }
    });

    promptEl.addEventListener("input", autosize);

    promptEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!streaming) send();
        }
    });


    /* ============================================================
     * MODEL LABEL + MENU
     * ============================================================ */

    function updateModelLabel() {
        if (AI.isReady(config)) {
            modelName.textContent = config.model;
            modelProvider.textContent = AI.providerFor(config.provider).name;
            modelProvider.hidden = false;
            connectDot.classList.add("live");
            connectText.textContent =
                AI.providerFor(config.provider).name + " · " + config.model;
        } else {
            modelName.textContent = "no model";
            modelProvider.hidden = true;
            connectDot.classList.remove("live");
            connectText.textContent = "no model linked";
        }
    }

    function renderModelMenu() {
        modelMenu.innerHTML = "";

        for (const p of AI.providerList()) {
            if (!p.models.length) continue;

            const group = document.createElement("div");
            group.className = "webui-model-group";
            group.textContent = p.name;
            modelMenu.appendChild(group);

            for (const m of p.models) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "webui-model-item";
                item.setAttribute("role", "option");

                if (config && config.provider === p.id && config.model === m) {
                    item.classList.add("active");
                    item.setAttribute("aria-selected", "true");
                }

                item.textContent = m;
                item.addEventListener("click", () => {
                    chooseModel(p.id, m);
                });
                modelMenu.appendChild(item);
            }
        }
    }

    function chooseModel(providerId, model) {
        closeModelMenu();

        if (config && config.provider === providerId) {
            config.model = model;
            AI.saveConfig(config);
            updateModelLabel();
            return;
        }

        openSettings({
            provider: providerId,
            model,
            note: "Add a key for " + AI.providerFor(providerId).name + " to use this model."
        });
    }

    function openModelMenu() {
        renderModelMenu();
        modelMenu.hidden = false;
        modelBtn.setAttribute("aria-expanded", "true");
    }

    function closeModelMenu() {
        modelMenu.hidden = true;
        modelBtn.setAttribute("aria-expanded", "false");
    }

    modelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        modelMenu.hidden ? openModelMenu() : closeModelMenu();
    });

    document.addEventListener("click", (e) => {
        if (!modelMenu.hidden && !modelMenu.contains(e.target) && e.target !== modelBtn) {
            closeModelMenu();
        }
    });


    /* ============================================================
     * SETTINGS MODAL
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

    function openSettings(opts) {
        opts = opts || {};

        if (opts.provider) {
            providerSel.value = opts.provider;
            refreshProviderFields();
            if (opts.model) modelEl.value = opts.model;
        } else if (config) {
            providerSel.value = config.provider;
            refreshProviderFields();
            modelEl.value = config.model || modelEl.value;
            baseEl.value = config.baseURL || "";
            keyEl.value = config.key || "";
            systemEl.value = config.system || "";
            rememberEl.checked = config.remember !== false;
        } else {
            refreshProviderFields();
        }

        statusEl.textContent = opts.note || "";
        statusEl.style.color = "var(--muted)";
        modal.hidden = false;
        setTimeout(() => keyEl.focus(), 40);
    }

    function closeSettings() {
        modal.hidden = true;
    }

    function collectConfig() {
        const id = providerSel.value;
        const p = AI.providerFor(id);

        return {
            provider: id,
            model: modelEl.value.trim() || p.models[0] || "",
            key: keyEl.value.trim() || (config && config.key) || "",
            baseURL: id === "custom" ? baseEl.value.trim() : p.baseURL,
            system: systemEl.value.trim(),
            remember: rememberEl.checked
        };
    }

    function saveFromForm() {
        const cfg = collectConfig();

        if (!cfg.key) {
            statusEl.textContent = "enter a key first.";
            statusEl.style.color = "var(--hackclub-red)";
            return;
        }

        config = cfg;
        AI.saveConfig(cfg);
        updateModelLabel();
        renderThread();

        statusEl.textContent = "connected.";
        statusEl.style.color = "var(--green)";
        setTimeout(closeSettings, 450);
    }

    function testFromForm() {
        const cfg = collectConfig();

        if (!cfg.key) {
            statusEl.textContent = "enter a key first.";
            statusEl.style.color = "var(--hackclub-red)";
            return;
        }

        statusEl.textContent = "testing…";
        statusEl.style.color = "var(--muted)";

        AI.stream(
            cfg,
            [{ role: "user", content: "Reply with the single word: ok" }],
            { system: cfg.system || AI.SITE_SYSTEM, maxTokens: 12 }
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
                statusEl.style.color = "var(--hackclub-red)";
            });
    }

    function forget() {
        config = null;
        AI.clearConfig();
        keyEl.value = "";
        baseEl.value = "";
        systemEl.value = "";
        statusEl.textContent = "forgotten. the key is gone from this browser.";
        statusEl.style.color = "var(--muted)";
        updateModelLabel();
        renderThread();
    }

    providerSel.addEventListener("change", () => {
        modelEl.value = AI.providerFor(providerSel.value).models[0] || "";
        refreshProviderFields();
    });

    $("#set-save").addEventListener("click", saveFromForm);
    $("#set-test").addEventListener("click", testFromForm);
    $("#set-forget").addEventListener("click", forget);
    $("#modal-close").addEventListener("click", closeSettings);
    $("#settings-btn").addEventListener("click", () => openSettings());
    $("#connect-btn").addEventListener("click", () => openSettings());

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeSettings();
    });


    /* ============================================================
     * SIDEBAR + SHORTCUTS
     * ============================================================ */

    function showBackdrop(on) {
        let bd = $(".webui-backdrop");
        if (!bd) {
            bd = document.createElement("div");
            bd.className = "webui-backdrop";
            bd.hidden = true;
            bd.addEventListener("click", () => {
                shell.classList.remove("side-open");
                showBackdrop(false);
            });
            shell.appendChild(bd);
        }
        bd.hidden = !on;
    }

    $("#new-chat").addEventListener("click", newChat);
    $("#clear-btn").addEventListener("click", () => {
        const c = activeChat();
        if (c) deleteChat(c.id);
    });

    $("#toggle-side").addEventListener("click", () => {
        const open = !shell.classList.contains("side-open");
        shell.classList.toggle("side-open", open);
        showBackdrop(open);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!modal.hidden) closeSettings();
            else if (!modelMenu.hidden) closeModelMenu();
            else if (shell.classList.contains("side-open")) {
                shell.classList.remove("side-open");
                showBackdrop(false);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            newChat();
        }
    });


    /* ============================================================
     * BOOT
     * ============================================================ */

    buildProviderOptions();
    refreshProviderFields();
    updateModelLabel();
    renderChats();
    renderThread();
    saveChats();

    window.WebUI = { newChat, openSettings };

})();
