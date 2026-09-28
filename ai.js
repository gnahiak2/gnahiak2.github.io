/*
 * ai.js — shared, dependency-free AI client + provider registry.
 *
 * Used by the floating widget (chat.js) and the full-page
 * Open WebUI-alike (webui/webui.js). Two wire formats cover
 * almost everyone: openai-compatible and anthropic and google.
 *
 * Nothing here touches the DOM except formatText's output
 * string; UIs own all rendering.
 */

"use strict";

window.AI = (function () {

    /* ============================================================
     * PROVIDER REGISTRY
     * ============================================================ */

    const PROVIDERS = {

        commandcode: {
            name: "Command Code",
            format: "openai",
            baseURL: "https://api.commandcode.ai/provider/v1",
            models: [
                "deepseek/deepseek-v4-flash",
                "anthropic/claude-sonnet-4",
                "openai/gpt-4o-mini"
            ],
            keyURL: "https://commandcode.ai"
        },

        openrouter: {
            name: "OpenRouter",
            format: "openai",
            baseURL: "https://openrouter.ai/api/v1",
            models: [
                "openai/gpt-4o-mini",
                "anthropic/claude-3.5-sonnet",
                "google/gemini-2.0-flash-001",
                "meta-llama/llama-3.3-70b-instruct",
                "deepseek/deepseek-chat",
                "mistralai/mistral-small-latest"
            ],
            keyURL: "https://openrouter.ai/keys"
        },

        openai: {
            name: "OpenAI",
            format: "openai",
            baseURL: "https://api.openai.com/v1",
            models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o4-mini"],
            keyURL: "https://platform.openai.com/api-keys"
        },

        anthropic: {
            name: "Anthropic",
            format: "anthropic",
            baseURL: "https://api.anthropic.com",
            models: [
                "claude-3-5-sonnet-latest",
                "claude-3-5-haiku-latest",
                "claude-3-7-sonnet-latest"
            ],
            keyURL: "https://console.anthropic.com/settings/keys"
        },

        google: {
            name: "Google Gemini",
            format: "google",
            baseURL: "https://generativelanguage.googleapis.com",
            models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
            keyURL: "https://aistudio.google.com/app/apikey"
        },

        groq: {
            name: "Groq",
            format: "openai",
            baseURL: "https://api.groq.com/openai/v1",
            models: [
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "mixtral-8x7b-32768"
            ],
            keyURL: "https://console.groq.com/keys"
        },

        deepseek: {
            name: "DeepSeek",
            format: "openai",
            baseURL: "https://api.deepseek.com/v1",
            models: ["deepseek-chat", "deepseek-reasoner"],
            keyURL: "https://platform.deepseek.com/api_keys"
        },

        xai: {
            name: "xAI Grok",
            format: "openai",
            baseURL: "https://api.x.ai/v1",
            models: ["grok-2-latest", "grok-2-mini"],
            keyURL: "https://console.x.ai"
        },

        mistral: {
            name: "Mistral",
            format: "openai",
            baseURL: "https://api.mistral.ai/v1",
            models: [
                "mistral-small-latest",
                "open-mistral-nemo",
                "mistral-large-latest"
            ],
            keyURL: "https://console.mistral.ai/api-keys"
        },

        together: {
            name: "Together AI",
            format: "openai",
            baseURL: "https://api.together.xyz/v1",
            models: [
                "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                "Qwen/Qwen2.5-72B-Instruct-Turbo"
            ],
            keyURL: "https://api.together.ai/settings/api-keys"
        },

        cerebras: {
            name: "Cerebras",
            format: "openai",
            baseURL: "https://api.cerebras.ai/v1",
            models: ["llama3.3-70b", "llama3.1-8b"],
            keyURL: "https://cloud.cerebras.ai"
        },

        perplexity: {
            name: "Perplexity",
            format: "openai",
            baseURL: "https://api.perplexity.ai",
            models: ["sonar", "sonar-pro"],
            keyURL: "https://www.perplexity.ai/settings/api"
        },

        fireworks: {
            name: "Fireworks",
            format: "openai",
            baseURL: "https://api.fireworks.ai/inference/v1",
            models: [
                "accounts/fireworks/models/llama-v3p3-70b-instruct",
                "accounts/fireworks/models/qwen2p5-72b-instruct"
            ],
            keyURL: "https://fireworks.ai/account/api-keys"
        },

        sambanova: {
            name: "SambaNova",
            format: "openai",
            baseURL: "https://api.sambanova.ai/v1",
            models: ["Meta-Llama-3.3-70B-Instruct", "Meta-Llama-3.1-8B-Instruct"],
            keyURL: "https://cloud.sambanova.ai/apis"
        },

        nvidia: {
            name: "NVIDIA NIM",
            format: "openai",
            baseURL: "https://integrate.api.nvidia.com/v1",
            models: [
                "meta/llama-3.3-70b-instruct",
                "mistralai/mistral-nemo-12b-instruct"
            ],
            keyURL: "https://build.nvidia.com"
        },

        hyperbolic: {
            name: "Hyperbolic",
            format: "openai",
            baseURL: "https://api.hyperbolic.xyz/v1",
            models: [
                "meta-llama/Llama-3.3-70B-Instruct",
                "Qwen/Qwen2.5-72B-Instruct"
            ],
            keyURL: "https://app.hyperbolic.xyz/settings"
        },

        github: {
            name: "GitHub Models",
            format: "openai",
            baseURL: "https://models.github.ai/inference",
            models: [
                "openai/gpt-4o-mini",
                "meta/Llama-3.3-70B-Instruct"
            ],
            keyURL: "https://github.com/settings/tokens"
        },

        cohere: {
            name: "Cohere",
            format: "openai",
            baseURL: "https://api.cohere.ai/compatibility/v1",
            models: ["command-r-plus-08-2024", "command-r-08-2024"],
            keyURL: "https://dashboard.cohere.com/api-keys"
        },

        ollama: {
            name: "Ollama (local)",
            format: "openai",
            baseURL: "http://localhost:11434/v1",
            models: ["llama3.1", "qwen2.5", "mistral"],
            keyURL: "https://ollama.com"
        },

        lmstudio: {
            name: "LM Studio (local)",
            format: "openai",
            baseURL: "http://localhost:1234/v1",
            models: ["local-model"],
            keyURL: "https://lmstudio.ai"
        },

        custom: {
            name: "Custom (OpenAI-compatible)",
            format: "openai",
            baseURL: "",
            models: [],
            keyURL: ""
        }

    };


    const CONFIG_KEY = "kaihang.ai.config.v1";
    const HISTORY_LIMIT = 16;

    const SITE_SYSTEM = [
        "You are the assistant embedded in Kaihang's personal website.",
        "Kaihang is a Singaporean developer, hardware tinkerer and Hack Club member who likes Rust, TypeScript, Python, embedded systems (ESP32), Linux servers, networking, Minecraft and self-hosting.",
        "He built OMNIVM, a browser game where an omnipotent AI lives inside a fake Linux box and the player tries to delete it; it is linked from this site.",
        "Be concise, friendly and a little dry. Two or three short sentences unless asked for detail.",
        "Answer questions about Kaihang, his projects and this site from the context above. If you do not know something, say so instead of inventing it.",
        "You may format with short paragraphs and simple lists. Never claim to be a specific model or mention API keys."
    ].join(" ");


    function providerFor(id) {
        return PROVIDERS[id] || PROVIDERS.custom;
    }

    function providerList() {
        return Object.keys(PROVIDERS).map((id) => ({
            id,
            ...PROVIDERS[id]
        }));
    }

    function resolveBase(cfg, p) {
        return String(cfg.baseURL || p.baseURL || "").replace(/\/+$/, "");
    }

    function isReady(cfg) {
        return !!(cfg && cfg.provider && cfg.model && cfg.key);
    }


    /* ============================================================
     * STORAGE
     * ============================================================ */

    function loadConfig() {
        try {
            const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
            if (raw && raw.provider && raw.model && raw.key) return raw;
        } catch (e) { /* ignore */ }
        return null;
    }

    function saveConfig(cfg) {
        if (cfg && cfg.remember !== false) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
        } else {
            localStorage.removeItem(CONFIG_KEY);
        }
    }

    function clearConfig() {
        localStorage.removeItem(CONFIG_KEY);
    }


    /* ============================================================
     * TEXT HELPERS
     * ============================================================ */

    function escapeHTML(value) {
        return String(value == null ? "" : value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /* Escape everything, then re-introduce a safe subset. */
    function formatText(raw) {
        let s = escapeHTML(raw)
            .replace(
                /```[a-z0-9]*\n?([\s\S]*?)```/gi,
                (m, code) =>
                    '<pre class="ai-code"><code>' +
                    code.replace(/\n$/, "") +
                    "</code></pre>"
            )
            .replace(/`([^`\n]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
            .replace(
                /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );

        return s;
    }

    function humanError(err) {
        const msg = err && err.message ? err.message : String(err);
        if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
            return "could not reach the provider — check the key, the base URL, and whether it allows browser (CORS) requests.";
        }
        return msg;
    }


    /* ============================================================
     * REQUEST BUILDING
     * ============================================================ */

    function buildRequest(p, cfg, base, history, system, maxTokens) {

        if (p.format === "anthropic") {
            return {
                url: base + "/v1/messages",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": cfg.key,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: {
                    model: cfg.model,
                    max_tokens: maxTokens,
                    temperature: 0.7,
                    system,
                    stream: true,
                    messages: history.map((m) => ({
                        role: m.role,
                        content: m.content
                    }))
                }
            };
        }

        if (p.format === "google") {
            return {
                url:
                    base +
                    "/v1beta/models/" +
                    encodeURIComponent(cfg.model) +
                    ":streamGenerateContent?alt=sse&key=" +
                    encodeURIComponent(cfg.key),
                headers: { "Content-Type": "application/json" },
                body: {
                    systemInstruction: { parts: [{ text: system }] },
                    contents: history.map((m) => ({
                        role: m.role === "assistant" ? "model" : "user",
                        parts: [{ text: m.content }]
                    })),
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: maxTokens
                    }
                }
            };
        }

        return {
            url: base + "/chat/completions",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + cfg.key
            },
            body: {
                model: cfg.model,
                max_tokens: maxTokens,
                temperature: 0.7,
                stream: true,
                messages: [
                    { role: "system", content: system },
                    ...history.map((m) => ({
                        role: m.role,
                        content: m.content
                    }))
                ]
            }
        };
    }

    function extractDelta(format, json) {
        if (format === "anthropic") {
            if (json.type === "content_block_delta") {
                return json.delta && json.delta.text ? json.delta.text : "";
            }
            if (json.type === "error") {
                throw new Error(
                    (json.error && json.error.message) || "provider error"
                );
            }
            return "";
        }

        if (format === "google") {
            const parts =
                json.candidates &&
                json.candidates[0] &&
                json.candidates[0].content &&
                json.candidates[0].content.parts;
            return parts ? parts.map((x) => x.text || "").join("") : "";
        }

        const choice = json.choices && json.choices[0];
        if (!choice) return "";
        if (choice.delta && typeof choice.delta.content === "string") {
            return choice.delta.content;
        }
        if (choice.message && typeof choice.message.content === "string") {
            return choice.message.content;
        }
        return "";
    }

    async function readSSE(format, res, onDelta) {
        let full = "";

        const handle = (payload) => {
            if (!payload || payload === "[DONE]") return;
            let json;
            try {
                json = JSON.parse(payload);
            } catch (e) {
                return;
            }
            const delta = extractDelta(format, json);
            if (delta) {
                full += delta;
                onDelta(full);
            }
        };

        if (res.body && res.body.getReader) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;

                buffer += decoder.decode(chunk.value, { stream: true });

                let nl;
                while ((nl = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, nl).replace(/\r$/, "");
                    buffer = buffer.slice(nl + 1);
                    if (line.startsWith("data:")) handle(line.slice(5).trim());
                }
            }
        } else {
            const text = await res.text();
            for (const line of text.split("\n")) {
                if (line.startsWith("data:")) handle(line.slice(5).trim());
            }
        }

        return full;
    }

    function parseError(detail, status) {
        try {
            const j = JSON.parse(detail);
            const m = (j.error && (j.error.message || j.error)) || j.message;
            if (m) return String(m);
        } catch (e) { /* not json */ }
        return "provider returned HTTP " + status;
    }


    /* ============================================================
     * STREAM
     * ============================================================ */

    async function stream(cfg, messages, opts) {
        opts = opts || {};

        const p = providerFor(cfg.provider);
        const base = resolveBase(cfg, p);
        if (!base) throw new Error("no base URL for this provider");

        const system = opts.system || SITE_SYSTEM;
        const maxTokens = opts.maxTokens || 1200;
        const history = messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-HISTORY_LIMIT);

        const signals = [];
        let timeoutCtrl = null;
        let timer = null;
        let timedOut = false;

        if (opts.signal) signals.push(opts.signal);

        if (opts.timeout !== 0) {
            timeoutCtrl = new AbortController();
            timer = setTimeout(() => {
                timedOut = true;
                timeoutCtrl.abort();
            }, opts.timeout || 60000);
            signals.push(timeoutCtrl.signal);
        }

        const signal =
            signals.length > 1 && AbortSignal.any
                ? AbortSignal.any(signals)
                : signals[0] || undefined;

        const onDelta = opts.onDelta || (() => {});

        try {
            const { url, headers, body } = buildRequest(
                p, cfg, base, history, system, maxTokens
            );

            const res = await fetch(url, {
                method: "POST",
                signal,
                headers,
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const detail = await res.text().catch(() => "");
                throw new Error(parseError(detail, res.status));
            }

            return await readSSE(p.format, res, onDelta);

        } catch (err) {
            if (err && err.name === "AbortError") {
                if (timedOut) throw new Error("timed out waiting for the provider");
            }
            throw err;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }


    return {
        PROVIDERS,
        CONFIG_KEY,
        SITE_SYSTEM,
        providerFor,
        providerList,
        resolveBase,
        isReady,
        loadConfig,
        saveConfig,
        clearConfig,
        escapeHTML,
        formatText,
        humanError,
        stream
    };

})();
