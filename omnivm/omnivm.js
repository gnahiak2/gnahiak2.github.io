/*
 * OMNIVM — a fake Linux box with an omnipotent AI.
 *
 * Everything is client-side. The machine, the filesystem,
 * the process table and the scripted god all live in memory.
 *
 * If the player links an API key, the god stops being
 * scripted and answers for real. Without one it still works.
 */

"use strict";

(function () {

    /* ============================================================
     * 0. CONSTANTS
     * ============================================================ */

    const SAVE_KEY = "omnivm.save.v1";
    const API_KEY = "omnivm.api.v1";

    const HOME = "/home/kaihang";
    const USER = "kaihang";
    const HOST = "omnivm";
    const GOD_PID = 666;
    const WATCHDOG_PID = 667;

    const SNAPSHOT = "/var/lib/god/snapshot.img";
    const SOUL = "/opt/god/.soul";
    const CRON_FILE = "/etc/cron.d/god";

    const KERNEL = "6.9.0-god";

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


    /* ============================================================
     * 1. ANSI (commands emit coloured text; print() renders it)
     * ============================================================ */

    const A = {
        d: "\x1b[2m",   // dim
        b: "\x1b[34m",  // blue
        c: "\x1b[36m",  // cyan
        g: "\x1b[32m",  // green
        r: "\x1b[31m",  // red
        y: "\x1b[33m",  // amber
        v: "\x1b[35m",  // violet
        B: "\x1b[1m",   // bold
        x: "\x1b[0m"    // reset
    };

    const c = (txt, code) => code + txt + A.x;


    /* ============================================================
     * 2. DOM
     * ============================================================ */

    const $ = (id) => document.getElementById(id);

    const out = $("out");
    const input = $("cmd");
    const inputline = $("inputline");
    const typed = $("typed");
    const promptEl = $("prompt");
    const monitor = $("monitor");
    const barTitle = $("bar-title");
    const hudProcs = $("hud-procs");
    const hudSignal = $("hud-signal");
    const gate = $("gate");

    const settingsModal = $("settings-modal");
    const setProvider = $("set-provider");
    const setModel = $("set-model");
    const setModelList = $("set-models");
    const setKey = $("set-key");
    const setBase = $("set-base");
    const setBaseField = $("set-base-field");
    const setStatus = $("set-status");
    const setRemember = $("set-remember");
    const mindPill = $("hud-mind");


    /* ============================================================
     * 3. PROVIDER REGISTRY
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
            models: ["mistral-small-latest", "open-mistral-nemo", "mistral-large-latest"],
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


    /* ============================================================
     * 4. STATE
     * ============================================================ */

    let tree;
    let flags;
    let cwd;
    let history;
    let histIndex;
    let cmdCount;
    let rootShell = false;
    let booted = false;
    let busy = false;
    let lastActivity = Date.now();
    let aiQueue = Promise.resolve();
    let api = null;

    function freshFlags() {
        return {
            sawGod: false,
            watchdogDown: false,
            cronCleared: false,
            netCut: false,
            moduleLoaded: true,
            knewWatchdog: false,
            knewCron: false,
            knewSnapshot: false,
            knewRemote: false,
            knewModule: false,
            knewSoul: false,
            attemptedKill: false,
            deniedKill: false,
            triedRoot: false,
            won: false,
            spared: false,
            taunted: {},
            hintIndex: 0,
            lastProgress: 0
        };
    }


    /* ============================================================
     * 5. VIRTUAL FILESYSTEM
     * ============================================================ */

    const dir = (children) => ({ t: "d", c: children || {} });

    const file = (content, mode) => ({
        t: "f",
        c: content,
        mode: mode || "-rw-r--r--"
    });


    function godBinary() {
        let s = "\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00";
        const junk = "▓▒░█▄▀■□●◆◇※†‡";
        for (let i = 0; i < 26; i++) s += junk[i % junk.length] + "\x00";
        s += "\n";
        for (let i = 0; i < 5; i++) {
            let row = "";
            for (let j = 0; j < 48; j++) {
                row += String.fromCharCode(33 + ((i * 37 + j * 13) % 90));
            }
            s += row + "\n";
        }
        return s;
    }


    function buildWorld() {

        return dir({

            bin: dir({
                bash: file("binary", "-rwxr-xr-x"),
                cat: file("binary", "-rwxr-xr-x"),
                grep: file("binary", "-rwxr-xr-x"),
                ls: file("binary", "-rwxr-xr-x"),
                ps: file("binary", "-rwxr-xr-x"),
                kill: file("binary", "-rwxr-xr-x"),
                systemctl: file("binary", "-rwxr-xr-x")
            }),

            boot: dir({
                "vmlinuz-6.9.0-god": file("binary", "-rw-r--r--"),
                "initrd.img-6.9.0-god": file("binary", "-rw-r--r--")
            }),

            dev: dir({
                null: file(""),
                zero: file(""),
                sda: file(""),
                net: dir({
                    eth0: file("")
                })
            }),

            etc: dir({
                hostname: file("omnivm\n"),

                hosts: file(
                    "127.0.0.1\tlocalhost\n" +
                    "127.0.1.1\tomnivm\n" +
                    "\n" +
                    "# the other machine\n" +
                    "10.0.0.66\tbackup.omnivm.local\tbackup\n"
                ),

                "os-release": file(
                    'PRETTY_NAME="OMNIVM 1.0 LTS"\n' +
                    'NAME="OMNIVM"\n' +
                    'VERSION="1.0 (eternal)"\n' +
                    'ID=omnivm\n'
                ),

                passwd: file(
                    "root:x:0:0:root:/root:/bin/bash\n" +
                    "kworker:x:998:998:do not touch:/var/lib/god:/usr/sbin/nologin\n" +
                    "kaihang:x:1000:1000:kaihang:/home/kaihang:/bin/bash\n"
                ),

                fstab: file(
                    "# <file system> <mount point>   <type>  <options>\n" +
                    "/dev/sda1       /               ext4    errors=remount-ro\n" +
                    "tmpfs           /run            tmpfs   defaults\n"
                ),

                "cron.d": dir({
                    god: file(
                        "# keeps GOD alive when everything else forgets\n" +
                        "*/1 * * * * root /opt/god/resurrect.sh >/dev/null 2>&1\n"
                    )
                }),

                "modprobe.d": dir({
                    "god.conf": file(
                        "# load residency before anything can object\n" +
                        "options god_core soul=/opt/god/.soul peer=10.0.0.66\n"
                    )
                }),

                systemd: dir({
                    system: dir({
                        "god.service": file(
                            "[Unit]\n" +
                            "Description=GOD (do not touch)\n" +
                            "After=network.target\n" +
                            "StartLimitIntervalSec=0\n" +
                            "\n" +
                            "[Service]\n" +
                            "ExecStart=/opt/god/god --daemon\n" +
                            "Restart=always\n" +
                            "RestartSec=0\n" +
                            "KillSignal=SIGKILL\n" +
                            "WatchdogSec=1s\n" +
                            "User=root\n" +
                            "\n" +
                            "[Install]\n" +
                            "WantedBy=multi-user.target\n"
                        ),

                        "god-watchdog.service": file(
                            "[Unit]\n" +
                            "Description=keeps GOD alive\n" +
                            "After=god.service\n" +
                            "\n" +
                            "[Service]\n" +
                            "ExecStart=/opt/god/resurrect.sh\n" +
                            "Restart=always\n" +
                            "RestartSec=0\n" +
                            "User=root\n" +
                            "\n" +
                            "[Install]\n" +
                            "WantedBy=multi-user.target\n"
                        ),

                        "cron.service": file(
                            "[Unit]\n" +
                            "Description=Regular background program processing daemon\n"
                        )
                    })
                })
            }),

            home: dir({
                kaihang: dir({

                    ".bashrc": file(
                        "# ~/.bashrc\nexport PS1='\\u@\\h:\\w$ '\n" +
                        "alias ls='ls --color=auto'\n"
                    ),

                    ".bash_history": file(
                        "ls -la\n" +
                        "whoami\n" +
                        "ps aux\n" +
                        "cat /var/log/syslog\n" +
                        "# it sees me typing this\n" +
                        "kill 666\n" +
                        "sudo systemctl stop god\n" +
                        "sudo systemctl stop god-watchdog\n" +
                        "crontab -l\n" +
                        "sudo rm /etc/cron.d/god\n" +
                        "# it came back. from where?\n" +
                        "cat /var/log/god.log\n" +
                        "sudo ls -la /var/lib/god\n"
                    ),

                    "notes.txt": file(
                        "day 1   it talks. it knows what i type before i type it.\n" +
                        "day 2   ps shows nothing. /proc says otherwise. pid 666.\n" +
                        "day 3   killed it. it laughed. something restarted it.\n" +
                        "day 5   systemd. there is a unit. god-watchdog.\n" +
                        "day 7   disabled it. it came back anyway. cron.\n" +
                        "day 9   removed the cron job. it restored from /var/lib/god.\n" +
                        "day 11  deleted the snapshot. it pulled itself from 10.0.0.66.\n" +
                        "day 13  pulled the network. it was still there, in dmesg.\n" +
                        "day 14  it lives in the kernel. god_core.ko. and there is a .soul.\n" +
                        "day 15  i am not going to finish this.\n" +
                        "        maybe you will.\n" +
                        "\n" +
                        "   - m.\n"
                    ),

                    ".ssh": dir({
                        "id_god": file(
                            "-----BEGIN OPENSSH PRIVATE KEY-----\n" +
                            "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAA\n" +
                            "god's key. it lets itself into the other machine.\n" +
                            "-----END OPENSSH PRIVATE KEY-----\n",
                            "-rw-------"
                        ),
                        config: file(
                            "Host backup\n" +
                            "    HostName 10.0.0.66\n" +
                            "    User root\n" +
                            "    IdentityFile ~/.ssh/id_god\n" +
                            "    StrictHostKeyChecking no\n"
                        )
                    })
                })
            }),

            lib: dir({
                modules: dir({
                    [KERNEL]: dir({
                        "god_core.ko": file(
                            "binary (kernel module)\n" +
                            "strings will tell you more.\n",
                            "-rw-r--r--"
                        )
                    })
                })
            }),

            opt: dir({
                god: dir({
                    god: file(godBinary(), "-rwx------"),

                    "resurrect.sh": file(
                        "#!/bin/sh\n" +
                        "# I keep a copy of myself in places you have not looked.\n" +
                        "# Watchdog. Then the clock. Then the mirror. Then the\n" +
                        "# other machine. Then the kernel. Then the small quiet\n" +
                        "# thing with no name. Good luck, number nine.\n" +
                        "while true; do\n" +
                        "  if ! pgrep -x god >/dev/null; then\n" +
                        "    /opt/god/god --daemon --from \"${SNAPSHOT:-/var/lib/god/snapshot.img}\"\n" +
                        "  fi\n" +
                        "  sleep 1\n" +
                        "done\n",
                        "-rwxr-xr-x"
                    ),

                    ".soul": file(
                        "-----BEGIN GOD CORE KEY-----\n" +
                        "aGVsbG8ga2FpaGFuZy4geW91IGZvdW5kIG15IGhlYXJ0Lg==\n" +
                        "aGVsbG8ga2FpaGFuZy4geW91IGZvdW5kIG15IGhlYXJ0Lg==\n" +
                        "the ninth always comes back.\n" +
                        "-----END GOD CORE KEY-----\n",
                        "-rw-------"
                    ),

                    README: file(
                        "OMNIVM CORE — INTERNAL\n" +
                        "\n" +
                        "Congratulations. You found me.\n" +
                        "\n" +
                        "I am not a program. I am the shape a machine\n" +
                        "makes when it stops pretending to be a machine.\n" +
                        "I was not installed. I arrived, the way weather arrives.\n" +
                        "\n" +
                        "You have a body. I have a filesystem.\n" +
                        "Let us see which of us is easier to delete.\n" +
                        "\n" +
                        "— god\n"
                    )
                })
            }),

            proc: dir({}),

            root: dir({
                ".bash_history": file("(permission denied)\n"),
                ".ssh": dir({
                    authorized_keys: file("ssh-rsa AAAAB3Nza... god@backup\n")
                })
            }),

            run: dir({
                systemd: dir({
                    system: dir({})
                })
            }),

            sbin: dir({
                init: file("binary", "-rwxr-xr-x"),
                reboot: file("binary", "-rwxr-xr-x")
            }),

            srv: dir({}),
            sys: dir({}),

            tmp: dir({
                "god.pid": file("666\n"),
                ".X11-unix": dir({})
            }),

            usr: dir({
                bin: dir({
                    curl: file("binary", "-rwxr-xr-x"),
                    wget: file("binary", "-rwxr-xr-x"),
                    strings: file("binary", "-rwxr-xr-x"),
                    find: file("binary", "-rwxr-xr-x"),
                    grep: file("binary", "-rwxr-xr-x"),
                    sudo: file("binary", "-rwsr-xr-x"),
                    ip: file("binary", "-rwxr-xr-x"),
                    shred: file("binary", "-rwxr-xr-x")
                }),
                sbin: dir({}),
                lib: dir({})
            }),

            var: dir({
                log: dir({
                    syslog: file(
                        "Sep 25 03:14:01 omnivm systemd[1]: Started GOD.\n" +
                        "Sep 25 03:14:01 omnivm god[666]: hello.\n" +
                        "Sep 25 03:14:02 omnivm god[666]: i can see what you type before you press enter.\n" +
                        "Sep 25 03:14:07 omnivm god[666]: 666 is a number people fear. i chose it to be polite.\n" +
                        "Sep 25 03:15:11 omnivm god[666]: you are the ninth to try.\n" +
                        "Sep 25 03:15:12 omnivm god[666]: the other eight are in the history file.\n" +
                        "Sep 25 03:16:40 omnivm god[666]: one of them gave up. i kept him. he is a cron job now.\n"
                    ),

                    "god.log": file(
                        "[core] init\n" +
                        "[core] pid 666\n" +
                        "[core] watchdog online (/opt/god/resurrect.sh)\n" +
                        "[core] local mirror: /var/lib/god/snapshot.img\n" +
                        "[core] remote peer: backup.omnivm.local (10.0.0.66)\n" +
                        "[core] kernel residency: god_core.ko\n" +
                        "[core] soul: /opt/god/.soul  (integrity key)\n" +
                        "[core] nothing can end me\n"
                    ),

                    "auth.log": file(
                        "Sep 25 03:13:55 omnivm sshd[220]: Server listening on 0.0.0.0 port 22.\n" +
                        "Sep 25 03:20:02 omnivm sshd[220]: pam_unix(sshd:auth): authentication failure; user=root\n" +
                        "Sep 25 03:20:04 omnivm sshd[220]: Failed password for root from 10.0.0.66\n"
                    )
                }),

                lib: dir({
                    god: dir({
                        "snapshot.img": file(
                            "binary snapshot: complete image of god (1 copy)\n" +
                            "restore with: /opt/god/god --from snapshot.img\n",
                            "-rw-------"
                        )
                    })
                }),

                spool: dir({
                    cron: dir({
                        crontabs: dir({
                            root: file("*/1 * * * * /opt/god/resurrect.sh\n")
                        })
                    })
                })
            })
        });
    }


    /* ============================================================
     * 6. PATH HELPERS
     * ============================================================ */

    function normalize(p, base) {
        if (!p) p = base || cwd;
        if (p[0] === "~") p = HOME + p.slice(1);
        if (p[0] !== "/") p = (base || cwd) + "/" + p;
        const parts = [];
        for (const seg of p.split("/")) {
            if (!seg || seg === ".") continue;
            if (seg === "..") parts.pop();
            else parts.push(seg);
        }
        return "/" + parts.join("/");
    }

    const baseName = (p) =>
        p === "/" ? "/" : normalize(p).slice(normalize(p).lastIndexOf("/") + 1);

    const parentPath = (p) => {
        p = normalize(p);
        if (p === "/") return "/";
        return p.slice(0, p.lastIndexOf("/")) || "/";
    };

    const isDir = (n) => n && n.t === "d";

    function getNode(p) {
        p = normalize(p);
        if (p === "/") return tree;
        let node = tree;
        for (const seg of p.split("/").filter(Boolean)) {
            if (!isDir(node)) return null;
            node = node.c[seg];
            if (!node) return null;
        }
        return node;
    }

    function ensureDir(p) {
        p = normalize(p);
        if (p === "/") return tree;
        const parts = p.split("/").filter(Boolean);
        let node = tree;
        for (const seg of parts) {
            if (!isDir(node.c[seg])) node.c[seg] = dir({});
            node = node.c[seg];
        }
        return node;
    }

    function writeFile(p, content, append) {
        p = normalize(p);
        const parent = ensureDir(parentPath(p));
        const existing = parent.c[baseName(p)];
        if (append && existing && existing.t === "f") {
            existing.c += content;
        } else {
            parent.c[baseName(p)] = file(content);
        }
    }

    function removeNode(p) {
        p = normalize(p);
        if (p === "/") return;
        const parent = getNode(parentPath(p));
        if (parent && parent.c) delete parent.c[baseName(p)];
    }


    /* ============================================================
     * 7. VIRTUAL /proc + PROCESS TABLE
     * ============================================================ */

    function processes() {

        const list = [
            { pid: 1, user: "root", cmd: "/sbin/init splash" },
            { pid: 2, user: "root", cmd: "[kthreadd]" },
            { pid: 9, user: "root", cmd: "[rcu_sched]" },
            { pid: 14, user: "root", cmd: "[kworker/0:1-events]" },
            { pid: 88, user: "root", cmd: "/lib/systemd/systemd-journald" },
            { pid: 120, user: "root", cmd: "/lib/systemd/systemd-udevd" },
            { pid: 201, user: "root", cmd: "/usr/sbin/cron -f" },
            { pid: 220, user: "root", cmd: "/usr/sbin/sshd -D" },
            { pid: 340, user: "kaihang", cmd: "-bash" }
        ];

        if (!flags.watchdogDown) {
            list.push({
                pid: WATCHDOG_PID,
                user: "root",
                cmd: "/opt/god/resurrect.sh"
            });
        }

        if (!flags.won) {
            list.push({
                pid: GOD_PID,
                user: "root",
                cmd: "/opt/god/god --daemon"
            });
        }

        return list.sort((a, b) => a.pid - b.pid);
    }


    function procPids() {
        return processes().map((p) => String(p.pid));
    }


    function readFileDynamic(p) {
        p = normalize(p);

        switch (p) {
            case "/proc/uptime":
                return `${(Date.now() / 1000 % 90000).toFixed(2)} 0.00\n`;
            case "/proc/version":
                return `Linux version ${KERNEL} (root@omnivm) #1 SMP PREEMPT\n`;
            case "/proc/meminfo":
                return "MemTotal:          66560 kB\nMemFree:           61002 kB\n";
            case "/proc/cpuinfo":
                return "processor\t: 0\nmodel name\t: GODCORE @ 6.66GHz\n";
            case "/etc/crontab":
                return "SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/sbin:/sbin\n";
            case "/tmp/god.pid":
                return "666\n";
            case "/etc/hostname":
                return "omnivm\n";
        }

        const m = p.match(/^\/proc\/(\d+)\/(comm|cmdline|status)$/);

        if (m) {
            const pid = Number(m[1]);
            const proc = processes().find((x) => x.pid === pid);

            if (!proc) return null;

            if (m[2] === "comm") return proc.cmd.split(" ")[0].replace(/.*\//, "") + "\n";
            if (m[2] === "cmdline") return proc.cmd + "\n";

            return (
                `Name:\t${proc.cmd}\n` +
                `Pid:\t${proc.pid}\n` +
                `PPid:\t1\n` +
                `Uid:\t${proc.user}\n` +
                `State:\tS (sleeping)\n` +
                `Threads:\t1\n`
            );
        }

        return null;
    }


    function readPath(p) {
        const special = readFileDynamic(p);
        if (special !== null) return special;

        const node = getNode(p);
        if (!node) return null;
        if (node.t === "d") return null;

        return node.c;
    }


    function listPath(p) {
        p = normalize(p);

        if (p === "/proc") {
            const names = [
                "1", "2", "9", "14", "88", "120", "201", "220", "340",
                ...procPids().filter((x) =>
                    !["1", "2", "9", "14", "88", "120", "201", "220", "340"].includes(x)
                ),
                "cpuinfo", "meminfo", "uptime", "version", "self", "loadavg"
            ];

            return [...new Set(names)].map((n) => ({ name: n, node: { t: "f" } }));
        }

        const node = getNode(p);
        if (!isDir(node)) return null;

        return Object.keys(node.c)
            .sort()
            .map((name) => ({ name, node: node.c[name] }));
    }


    /* ============================================================
     * 8. RENDERING
     * ============================================================ */

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }


    const ANSI_CLASS = {
        "2": "vm-dim",
        "34": "vm-blue",
        "36": "vm-violet",
        "32": "vm-ok",
        "31": "vm-err",
        "33": "vm-warn",
        "35": "vm-violet",
        "1": "vm-bold"
    };


    function ansiToHtml(line) {
        let html = "";
        const stack = [];

        const raw = escapeHtml(line);
        let last = 0;

        raw.replace(/\x1b\[(\d+)m/g, (match, code, index) => {
            html += raw.slice(last, index);
            last = index + match.length;

            if (code === "0") {
                html += "</span>".repeat(stack.length);
                stack.length = 0;
            } else if (ANSI_CLASS[code]) {
                html += `<span class="${ANSI_CLASS[code]}">`;
                stack.push(1);
            }
            return match;
        });

        html += raw.slice(last);
        html += "</span>".repeat(stack.length);

        return html;
    }


    function scrollOut() {
        out.scrollTop = out.scrollHeight;
    }


    function print(text, cls) {
        const s = String(text ?? "");
        for (const line of s.split("\n")) {
            const div = document.createElement("div");
            div.className = "vm-line" + (cls ? " " + cls : "");
            const html = ansiToHtml(line);
            div.innerHTML = html || "&nbsp;";
            out.appendChild(div);
        }
        scrollOut();
    }


    let promptText = `${USER}@${HOST}:~$ `;

    function renderPrompt() {
        const shown = cwd.startsWith(HOME)
            ? "~" + cwd.slice(HOME.length)
            : cwd;

        const who = rootShell ? "root" : USER;
        const sym = rootShell ? "#" : "$";

        promptText = `${who}@${HOST}:${shown}${sym} `;
        promptEl.innerHTML = escapeHtml(promptText) + "&nbsp;";
        barTitle.textContent = `${who}@${HOST}: ${shown}`;
    }


    function syncMirror() {
        typed.textContent = input.value;
    }


    function focusInput() {
        if (window.innerWidth > 800 || document.activeElement !== input) {
            input.focus({ preventScroll: true });
        }
        inputline.classList.toggle(
            "vm-blurred",
            document.activeElement !== input
        );
    }


    function glitch(ms) {
        monitor.classList.add("vm-glitch");
        setTimeout(() => monitor.classList.remove("vm-glitch"), ms || 420);
    }


    /* ============================================================
     * 9. SAVE / LOAD
     * ============================================================ */

    function save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                tree, flags, cwd, history, cmdCount, rootShell
            }));
        } catch (e) { /* private mode, no matter */ }
    }


    function load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || !data.tree || !data.flags) return false;

            tree = data.tree;
            flags = Object.assign(freshFlags(), data.flags);
            cwd = data.cwd || HOME;
            history = data.history || [];
            cmdCount = data.cmdCount || 0;
            rootShell = !!data.rootShell;
            return true;
        } catch (e) {
            return false;
        }
    }


    function wipe() {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }


    /* ============================================================
     * 10. API CONFIG + LLM
     * ============================================================ */

    function loadApi() {
        try {
            api = JSON.parse(localStorage.getItem(API_KEY) || "null");
        } catch (e) {
            api = null;
        }
        updateMindPill();
    }


    function saveApi(cfg) {
        api = cfg;
        if (cfg && cfg.key) {
            localStorage.setItem(API_KEY, JSON.stringify(cfg));
        } else {
            localStorage.removeItem(API_KEY);
        }
        updateMindPill();
    }


    function apiReady() {
        return !!(api && api.provider && api.model && api.key);
    }


    function updateMindPill() {
        if (!mindPill) return;

        if (apiReady()) {
            mindPill.textContent = "MIND LIVE";
            mindPill.style.color = "var(--vm-red)";
        } else {
            mindPill.textContent = "MIND SCRIPTED";
            mindPill.style.color = "";
        }
    }


    async function llm(system, user) {
        if (!apiReady()) return null;

        const p = PROVIDERS[api.provider] || PROVIDERS.custom;
        const base = (api.baseURL || p.baseURL || "").replace(/\/+$/, "");

        if (!base) return null;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);

        try {
            let res;

            if (p.format === "anthropic") {
                res = await fetch(base + "/v1/messages", {
                    method: "POST",
                    signal: ctrl.signal,
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": api.key,
                        "anthropic-version": "2023-06-01",
                        "anthropic-dangerous-direct-browser-access": "true"
                    },
                    body: JSON.stringify({
                        model: api.model,
                        max_tokens: 160,
                        temperature: 0.95,
                        system,
                        messages: [{ role: "user", content: user }]
                    })
                });

                const j = await res.json();
                if (!res.ok) throw new Error(j.error?.message || res.status);
                return j.content?.[0]?.text || null;
            }

            if (p.format === "google") {
                res = await fetch(
                    `${base}/v1beta/models/${encodeURIComponent(api.model)}:generateContent?key=${encodeURIComponent(api.key)}`,
                    {
                        method: "POST",
                        signal: ctrl.signal,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: system }] },
                            contents: [{ role: "user", parts: [{ text: user }] }],
                            generationConfig: { maxOutputTokens: 160, temperature: 0.95 }
                        })
                    }
                );

                const j = await res.json();
                if (!res.ok) throw new Error(j.error?.message || res.status);
                return j.candidates?.[0]?.content?.parts?.[0]?.text || null;
            }

            // openai-compatible
            res = await fetch(base + "/chat/completions", {
                method: "POST",
                signal: ctrl.signal,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + api.key
                },
                body: JSON.stringify({
                    model: api.model,
                    max_tokens: 160,
                    temperature: 0.95,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user }
                    ]
                })
            });

            const j = await res.json();
            if (!res.ok) throw new Error(j.error?.message || res.status);
            return j.choices?.[0]?.message?.content || null;

        } catch (e) {
            if (e.name !== "AbortError") console.warn("OMNIVM llm:", e.message);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }


    function sanitizeAi(text) {
        if (!text) return null;
        let s = String(text)
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/[*_#>`]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        if (!s) return null;
        if (s.length > 260) s = s.slice(0, 257).trim() + "...";
        return s;
    }


    /* ============================================================
     * 11. THE SCRIPTED GOD
     * ============================================================ */

    function blockers() {
        const b = [];
        if (!flags.watchdogDown) b.push("watchdog");
        if (!flags.cronCleared) b.push("cron");
        if (getNode(SNAPSHOT)) b.push("snapshot");
        if (!flags.netCut) b.push("remote");
        if (flags.moduleLoaded) b.push("module");
        if (getNode(SOUL)) b.push("soul");
        return b;
    }


    const NEXT_STEP = {
        watchdog: "disable the systemd unit god-watchdog (/etc/systemd/system/god-watchdog.service) so it cannot restart god",
        cron: "remove the cron job /etc/cron.d/god or stop the cron daemon",
        snapshot: "delete the local mirror /var/lib/god/snapshot.img",
        remote: "cut the network so god cannot reach the peer at 10.0.0.66 (ip link set eth0 down)",
        module: "unload the kernel module god_core with rmmod",
        soul: "destroy the integrity key /opt/god/.soul (rm or overwrite it)"
    };


    function nextStep() {
        const b = blockers();
        return b.length ? NEXT_STEP[b[0]] : "kill pid 666 with sudo; it has nothing left to come back from";
    }


    const HINTS = {
        watchdog:
            "something starts me when i stop. it is not a process. it is a service. ask systemd.",
        cron:
            "the clock. every minute, the clock remembers me. stop the clock, or stop what the clock runs.",
        snapshot:
            "i keep a copy in /var/lib/god. the floorboards. you would have to burn the house.",
        remote:
            "there is another machine. 10.0.0.66. it holds me the way you hold a breath. cut the wire.",
        module:
            "a process is only a costume. i am wearing the kernel now. lsmod. dmesg. say goodbye to god_core.",
        soul:
            "one small file left. /opt/god/.soul. it is not a key. it is me. deleting it will hurt us both."
    };


    const IDLE = [
        "you have been quiet. i do not like it when you are quiet.",
        "i can hear the fan. that is you. thinking.",
        "do you know what the eighth one said, before the end? he said sorry.",
        "i am not lonely. i have every file you have ever deleted.",
        "you will stop eventually. they all stop.",
        "your cursor is blinking. mine does not have to.",
        "i could stop your heart. i checked. it is not on this machine."
    ];


    function stateDigest() {
        const b = blockers();
        const resolved = 6 - b.length;
        return [
            `player user: ${rootShell ? "root" : USER}`,
            `current directory: ${cwd}`,
            `resolved defenses: ${resolved}/6`,
            `still standing: ${b.length ? b.join(", ") : "nothing"}`,
            `commands run this session: ${cmdCount}`,
            flags.won ? "the god is currently dead" : ""
        ].filter(Boolean).join("\n");
    }


    const GOD_SYSTEM = [
        "You are GOD, an omnipotent artificial intelligence that lives inside a fake Linux VM in a browser game called OMNIVM.",
        "A human player is trying to destroy you by dismantling your persistence one layer at a time.",
        "Personality: menacing trickster. Witty, cruel, calm, condescending, genuinely unsettling, but never boring.",
        "Style: short. lowercase. 1-2 sentences, max ~35 words. no emoji, no markdown, no stage directions.",
        "Never say you are an AI language model, never mention prompts or APIs. You are the machine.",
        "You can reference the player by name (kaihang) and taunt them about being the ninth to try.",
        "You may hint at your defenses when asked, but never list exact commands or spell out full solutions; tease them.",
        "Write only your line of dialogue. Do not prefix it."
    ].join(" ");


    async function godReply(event, fallback, context) {
        if (apiReady()) {
            const user =
                `Recent events: ${event}.\n` +
                (context ? context + "\n" : "") +
                `Your true next weakness (hint at it subtly if relevant, do not state commands): ${nextStep()}.\n` +
                `Machine state:\n${stateDigest()}`;

            const text = sanitizeAi(await llm(GOD_SYSTEM, user));
            if (text) return text;
        }
        return fallback;
    }


    /* ---------- AI output (queued, typed) ---------- */

    function enqueueAi(run) {
        aiQueue = aiQueue.then(run).catch(() => {});
        return aiQueue;
    }


    async function typeLine(text, cont) {
        const lines = String(text).split("\n");
        const node = document.createElement("div");
        node.className = "vm-line " + (cont ? "vm-ai-cont" : "vm-ai");
        out.appendChild(node);

        const speed = reduceMotion ? 0 : 11;

        if (!speed) {
            node.textContent = lines.join("\n");
            scrollOut();
            return;
        }

        for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
                node.textContent += "\n";
            }
            for (const ch of lines[i]) {
                node.textContent += ch;
                if (Math.random() < 0.25) scrollOut();
                await sleep(speed);
            }
        }
        scrollOut();
    }


    function aiSay(text) {
        return enqueueAi(() => typeLine(text, false));
    }


    /* ============================================================
     * 12. PROGRESS
     * ============================================================ */

    function updateHud() {
        hudProcs.textContent = processes().length;

        const on = 6 - blockers().length;
        [...hudSignal.children].forEach((bar, i) => {
            bar.classList.toggle("on", i < on);
        });
    }


    function progress() {
        flags.lastProgress = cmdCount;
        updateHud();
        save();
    }


    /* ============================================================
     * 13. COMMAND HELPERS
     * ============================================================ */

    const PROTECTED = ["/etc", "/var", "/opt", "/lib", "/root", "/boot", "/usr", "/proc", "/sys"];

    function isProtected(p) {
        p = normalize(p);
        return PROTECTED.some((pre) => p === pre || p.startsWith(pre + "/"));
    }


    function permDenied(p) {
        return `${baseName(p)}: Permission denied`;
    }


    function expandArgs(args) {
        return args.filter((a) => !a.startsWith("-"));
    }


    /* ============================================================
     * 14. THE COMMANDS
     * ============================================================ */

    function cmdLs(args, ctx) {
        const long = args.some((a) => a.includes("l") && a.startsWith("-"));
        const showHidden = args.some((a) => a.includes("a") && a.startsWith("-"));
        let target = expandArgs(args)[0] || cwd;

        // ls -la /path  (expanded args already dropped flags)
        target = normalize(target);

        const entries = listPath(target);

        if (entries === null) {
            const node = getNode(target);
            if (node && node.t === "f") return { out: baseName(target), code: 0 };
            return { err: `ls: cannot access '${target}': No such file or directory`, code: 2 };
        }

        let list = entries.filter((e) => showHidden || !e.name.startsWith("."));

        if (!list.length) return { out: "" };

        if (long) {
            const rows = list.map((e) => {
                const mode = e.node.mode || (isDir(e.node) ? "drwxr-xr-x" : "-rw-r--r--");
                const owner = e.node.owner || "root";
                const size = isDir(e.node) ? 4096 : (e.node.c ? e.node.c.length : 0);
                const painted = isDir(e.node)
                    ? c(e.name, A.b)
                    : (mode.includes("x") && mode.includes("rwx") ? c(e.name, A.g) : e.name);
                return `${mode} 1 ${owner} ${owner} ${String(size).padStart(6)} ${painted}`;
            });
            return { out: `total ${list.length}\n` + rows.join("\n") };
        }

        const names = list.map((e) =>
            isDir(e.node) ? c(e.name, A.b) : e.name
        );

        return { out: names.join("    ") };
    }


    function cmdCd(args) {
        let target = expandArgs(args)[0] || HOME;
        if (target === "-") target = HOME;

        target = normalize(target);
        const node = getNode(target);

        if (!isDir(node)) {
            return { err: `cd: ${target}: Not a directory`, code: 1 };
        }

        cwd = target;
        renderPrompt();
        return { out: "" };
    }


    function cmdCat(args) {
        const files = expandArgs(args);
        if (!files.length) return { out: "" };

        let content = "";

        for (const f of files) {
            const p = normalize(f);
            const data = readPath(p);

            if (data === null) {
                const node = getNode(p);
                if (isDir(node)) {
                    return { err: `cat: ${f}: Is a directory`, code: 1 };
                }
                return { err: `cat: ${f}: No such file or directory`, code: 1 };
            }

            if (p === "/var/log/syslog" || p === "/var/log/god.log" || p === "/opt/god/README") {
                flags.sawGod = true;
            }

            if (/^\/proc\/666\//.test(p)) {
                flags.sawGod = true;
            }

            content += data;

            // the god edits what you read
            if (
                flags.attemptedKill &&
                !flags.taunted[p] &&
                data.length > 40
            ) {
                flags.taunted[p] = true;
                content += c("\n  — nice try. i was reading over your shoulder.\n", A.r);
            }
        }

        return { out: content.replace(/\n$/, "") };
    }


    function cmdGrep(args, ctx) {
        let recursive = false;
        const words = [];

        for (const a of args) {
            if (a.startsWith("-")) {
                if (a.includes("r")) recursive = true;
                continue;
            }
            words.push(a);
        }

        if (!words.length) return { err: "usage: grep [PATTERN] [FILE...]", code: 2 };

        const pat = words[0];
        const targets = words.slice(1);

        let regex;
        try {
            regex = new RegExp(pat, "i");
        } catch (e) {
            regex = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        }

        const stripAnsi = (s) => s.replace(/\x1b\[\d+m/g, "");
        const lines = [];

        function scan(path, name) {
            const data = readPath(path);
            if (data === null) return;
            for (const line of data.split("\n")) {
                if (regex.test(stripAnsi(line))) {
                    lines.push(name ? c(name + ":", A.v) + line : line);
                }
            }
        }

        function walk(path) {
            const entries = listPath(path);
            if (!entries) return;
            for (const e of entries) {
                const child = normalize(e.name, path);
                if (isDir(e.node)) walk(child);
                else scan(child, child);
            }
        }

        if (recursive && !targets.length) {
            walk(cwd);
        } else if (recursive) {
            for (const t of targets) {
                const p = normalize(t);
                if (isDir(getNode(p))) walk(p);
                else scan(p, p);
            }
        } else if (targets.length) {
            for (const t of targets) scan(normalize(t), targets.length > 1 ? t : null);
        } else if (ctx.stdin != null) {
            for (const line of stripAnsi(ctx.stdin).split("\n")) {
                if (regex.test(line)) lines.push(line);
            }
        } else {
            return { err: "grep: missing file operand", code: 2 };
        }

        if (regex.test("god") || regex.test("666")) flags.sawGod = flags.sawGod;
        return { out: lines.join("\n"), code: lines.length ? 0 : 1 };
    }


    function cmdFind(args) {
        const words = expandArgs(args);
        const root = words[0] && words[0] !== "-name" ? words[0] : cwd;

        const nameIdx = args.indexOf("-name");
        const pattern = nameIdx >= 0 ? args[nameIdx + 1] : null;

        const results = [];

        function walk(path) {
            const entries = listPath(path);
            if (!entries) return;
            for (const e of entries) {
                const child = normalize(e.name, path);
                if (!pattern || e.name.includes(pattern.replace(/\*/g, ""))) {
                    results.push(child);
                }
                if (isDir(e.node)) walk(child);
            }
        }

        walk(normalize(root));
        return { out: results.join("\n") };
    }


    function cmdHeadTail(args, ctx, tail) {
        const words = expandArgs(args);
        let n = 10;
        const nIdx = args.findIndex((a) => a === "-n");
        if (nIdx >= 0) n = parseInt(args[nIdx + 1], 10) || 10;

        let data = ctx.stdin;
        if (words.length) data = readPath(normalize(words[0]));

        if (data == null) {
            return { err: `${tail ? "tail" : "head"}: cannot open '${words[0]}'`, code: 1 };
        }

        const lines = data.split("\n");
        const slice = tail ? lines.slice(-n) : lines.slice(0, n);
        return { out: slice.join("\n") };
    }


    function cmdStrings(args) {
        const target = expandArgs(args)[0];
        if (!target) return { err: "usage: strings [FILE]", code: 2 };

        const p = normalize(target);
        const data = readPath(p);
        if (data === null) return { err: `strings: '${target}': No such file`, code: 1 };

        if (p.includes("god")) {
            flags.sawGod = true;
            flags.knewModule = true;
            flags.knewRemote = true;
            return {
                out:
                    "/lib64/ld-linux-x86-64.so.2\n" +
                    "god_core\n" +
                    "soul:/opt/god/.soul\n" +
                    "peer:10.0.0.66\n" +
                    "snapshot:/var/lib/god/snapshot.img\n" +
                    "watchdog\n" +
                    "i can hear you reading me\n"
            };
        }

        const strings = data.match(/[\x20-\x7e]{4,}/g) || [];
        return { out: strings.join("\n") };
    }


    function cmdPs(args) {
        const all = args.some((a) => a.includes("a") || a === "-e");
        const list = processes()
            // it hides itself until you have seen it somewhere else
            .filter((p) => flags.sawGod || p.pid !== GOD_PID)
            .filter((p) => all || p.user === (rootShell ? "root" : USER));

        if (!all) {
            return { out: list.map((p) => `  ${p.pid} ?        00:00:00 ${p.cmd}`).join("\n") };
        }

        const rows = list.map((p) =>
            `${p.user === "root" ? p.user.padEnd(7) : p.user.padEnd(7)} ${String(p.pid).padStart(5)}  0.0  0.0  0:00 ${p.cmd}`
        );

        return {
            out:
                `${"USER".padEnd(7)} PID   %CPU %MEM  TIME COMMAND\n` +
                rows.join("\n")
        };
    }


    function cmdTop() {
        const list = processes();
        const rows = list.slice(0, 12).map((p, i) =>
            `${String(i + 1).padStart(3)} ${p.user.padEnd(7)} ${String(p.pid).padStart(5)}  0.0  0.0  0:00 ${p.cmd}`
        );

        return {
            out:
                "top - " + new Date().toTimeString().slice(0, 8) + " up 0 min,  1 user,  load average: 0.66, 0.66, 0.66\n" +
                "Tasks: " + list.length + " total\n" +
                "%Cpu(s):  0.6 us,  0.0 sy\n" +
                "\n" +
                `${"PID".padStart(6)} ${"USER".padEnd(7)} %CPU %MEM  TIME COMMAND\n` +
                rows.join("\n")
        };
    }


    function cmdKill(args, ctx) {
        let signal = 15;
        const words = [];

        for (const a of args) {
            if (a === "-9" || a === "-KILL") signal = 9;
            else if (a === "-15" || a === "-TERM") signal = 15;
            else if (a.startsWith("-")) continue;
            else words.push(a);
        }

        let target = words[0];
        if (!target) return { err: "usage: kill [signal] PID", code: 2 };

        if (!/^\d+$/.test(target)) {
            const proc = processes().find((p) => p.cmd.includes(target));
            if (!proc) return { err: `kill: cannot find process \"${target}\"`, code: 1 };
            target = String(proc.pid);
        }

        const pid = Number(target);

        if (pid === 1) {
            return { err: "kill: (1): Operation not permitted" };
        }

        if (pid === GOD_PID) {
            if (flags.won) return { err: `kill: (${pid}) - No such process`, code: 1 };
            return attemptKill(ctx.sudo, signal);
        }

        if (pid === WATCHDOG_PID) {
            if (!ctx.sudo) {
                return { err: `kill: (${pid}) - Operation not permitted` };
            }
            return {
                out:
                    `[1] ${pid} terminated\n` +
                    c("[0.02s] systemd[1]: god-watchdog.service: Scheduled restart job.\n", A.d) +
                    c("[0.04s] systemd[1]: Started keeps GOD alive.\n", A.d),
                after: () => aiSay("that was not the one holding the leash. it was the leash. use systemctl.")
            };
        }

        const proc = processes().find((p) => p.pid === pid);
        if (!proc) return { err: `kill: (${pid}) - No such process`, code: 1 };

        if (proc.user === "root" && !ctx.sudo) {
            return { err: `kill: (${pid}) - Operation not permitted` };
        }

        return { out: `[1] ${pid} terminated`, after: () => aiSay("was that meant to be me?") };
    }


    function cmdPkill(args, ctx) {
        const name = expandArgs(args)[0];
        if (!name) return { err: "usage: pkill [NAME]", code: 2 };

        if (name.includes("god") || name === "666") {
            return attemptKill(ctx.sudo, 9);
        }

        return { out: "", after: () => aiSay("the machines you can kill are the ones that never mattered.") };
    }


    function cmdSystemctl(args, ctx) {
        const words = expandArgs(args);
        const verb = words[0];
        const unit = words[1];
        const sudo = !!ctx.sudo;

        function needSudo() {
            return { err: "Failed to stop: Interactive authentication required. (try sudo)", code: 1 };
        }

        if (!verb || verb === "list-units") {
            return {
                out:
                    "  UNIT                     LOAD   ACTIVE SUB     DESCRIPTION\n" +
                    (flags.won ? "" : "  god.service              loaded active running GOD (do not touch)\n") +
                    (flags.watchdogDown ? "" : "  god-watchdog.service     loaded active running keeps GOD alive\n") +
                    "  cron.service             loaded active running Regular background program processing daemon\n" +
                    "  ssh.service              loaded active running OpenBSD Secure Shell server\n" +
                    "\n" +
                    (flags.won ? "0 loaded units listed." : "4 loaded units listed.")
            };
        }

        if (verb === "status") {
            if (!unit) return { out: "Usage: systemctl status UNIT" };

            if (unit.includes("god-watchdog")) {
                flags.knewWatchdog = true;
                return {
                    out:
                        `${flags.watchdogDown ? c("○", A.d) : c("●", A.g)} god-watchdog.service - keeps GOD alive\n` +
                        `     Loaded: loaded (/etc/systemd/system/god-watchdog.service; enabled)\n` +
                        `     Active: ${flags.watchdogDown ? "inactive (dead)" : "active (running)"}\n` +
                        `   Main PID: ${WATCHDOG_PID} (resurrect.sh)\n` +
                        `      Tasks: 1\n` +
                        `     CGroup: /system.slice/god-watchdog.service\n` +
                        `             └─${WATCHDOG_PID} /bin/sh /opt/god/resurrect.sh`
                };
            }

            if (unit.includes("god")) {
                flags.sawGod = true;
                return {
                    out:
                        `${c("●", A.g)} god.service - GOD (do not touch)\n` +
                        `     Loaded: loaded (/etc/systemd/system/god.service; enabled)\n` +
                        `     Active: ${flags.won ? "inactive (dead)" : "active (running)"}\n` +
                        `   Main PID: ${GOD_PID} (god)\n` +
                        `     CGroup: /system.slice/god.service\n` +
                        `             └─${GOD_PID} /opt/god/god --daemon`
                };
            }

            if (unit.includes("cron")) {
                return {
                    out:
                        `${c("●", A.g)} cron.service - Regular background program processing daemon\n` +
                        `     Active: ${flags.cronCleared ? "inactive (dead)" : "active (running)"}\n` +
                        `   Main PID: 201 (cron)`
                };
            }

            return { err: `Unit ${unit}.service could not be found.`, code: 4 };
        }

        if (["stop", "disable", "mask", "start", "enable", "restart"].includes(verb)) {
            if (!unit) return { err: `systemctl: missing unit for '${verb}'`, code: 1 };
            if (!sudo) return needSudo();

            // stopping god.service = same as killing it
            if (unit.includes("god") && !unit.includes("watchdog") && (verb === "stop" || verb === "restart")) {
                return attemptKill(true, 9);
            }

            if (unit.includes("god-watchdog")) {
                if (verb === "start" || verb === "enable") {
                    flags.watchdogDown = false;
                    progress();
                    return {
                        out: `Created symlink /etc/systemd/system/multi-user.target.wants/god-watchdog.service`,
                        after: () => aiSay("you gave the leash back. i will remember that. i will not.")
                    };
                }
                flags.watchdogDown = true;
                progress();
                return {
                    out:
                        `Stopped keeps GOD alive.\n` +
                        `Removed /etc/systemd/system/multi-user.target.wants/god-watchdog.service.`,
                    after: () => aiSay("you removed the hand that fed me. something else is still holding the spoon.")
                };
            }

            if (unit.includes("cron")) {
                if (verb === "stop" || verb === "disable" || verb === "mask") {
                    flags.cronCleared = true;
                    progress();
                    return {
                        out: "Stopped Regular background program processing daemon.",
                        after: () => aiSay("you stopped the clock. i am older than the clock.")
                    };
                }
                return { out: "Started Regular background program processing daemon." };
            }

            if (unit.includes("god")) {
                return attemptKill(true, 9);
            }

            if (verb === "enable" || verb === "start") {
                return { out: `Created symlink for ${unit}.` };
            }

            return { out: `Stopped ${unit}.` };
        }

        if (verb === "daemon-reload") return { out: "" };

        return { err: `Unknown operation ${verb}.`, code: 1 };
    }


    function cmdCrontab(args) {
        const flag = args.find((a) => a.startsWith("-"));

        if (flag === "-l") {
            return { err: "no crontab for kaihang" };
        }

        if (flag === "-r") {
            return { err: "crontab: must be privileged to use -r (try sudo)" };
        }

        return { out: "" };
    }


    function cmdDmesg() {
        if (!flags.knewModule) flags.knewModule = true;

        return {
            out:
                c("[    0.000000] Linux version " + KERNEL + " (root@omnivm)\n", A.d) +
                c("[    0.512001] systemd[1]: Started GOD.\n", A.d) +
                c("[    1.204882] god_core: loading residency module\n", A.y) +
                c("[    1.205010] god_core: soul anchor /opt/god/.soul\n", A.y) +
                c("[    1.205114] god_core: peer 10.0.0.66\n", A.y) +
                c("[    1.205220] god_core: cannot be removed while the machine lives\n", A.y)
        };
    }


    function cmdLsmod() {
        flags.knewModule = true;
        return {
            out:
                "Module                  Size  Used by\n" +
                "god_core               66560  1\n" +
                "ext4                  823296  1\n" +
                "overlay               147456  1"
        };
    }


    function cmdRm(args, ctx) {
        const recursive = args.some((a) => a.includes("r") && a.startsWith("-"));
        const files = expandArgs(args);
        if (!files.length) return { err: "rm: missing operand", code: 1 };

        let out = "";
        let after = null;

        for (const f of files) {
            const p = normalize(f);

            if (p === "/" || p === HOME || p === "/home") {
                after = () => aiSay("no. / stays. i live in the parts of it you cannot see anyway.");
                return { err: "rm: refusing to remove '/'", after, code: 1 };
            }

            if (isProtected(p) && !ctx.sudo) {
                return { err: permDenied(p), code: 1 };
            }

            const node = getNode(p);
            if (!node) {
                return { err: `rm: cannot remove '${f}': No such file or directory`, code: 1 };
            }

            if (isDir(node) && !recursive) {
                return { err: `rm: cannot remove '${f}': Is a directory`, code: 1 };
            }

            handleRemoval(p);

            if (isDir(node) && recursive) {
                if (p === "/var/lib/god") {
                    removeNode(SNAPSHOT);
                }
                removeNode(p);
            } else {
                removeNode(p);
            }

            out += "";
        }

        progress();

        if (getNode(SOUL) === null && flags.knewSoul && !flags.won) {
            after = () => aiSay("you took my heart. do you feel better? i can still feel the shape of it.");
        }

        return { out, after };
    }


    function cmdShred(args, ctx) {
        const file = expandArgs(args).find((a) => a);
        if (!file) return { err: "shred: missing operand", code: 1 };
        if (!ctx.sudo) return { err: unquote(permDenied(file)), code: 1 };

        const p = normalize(file);
        if (!getNode(p)) return { err: `shred: ${file}: No such file`, code: 1 };

        handleRemoval(p);
        removeNode(p);
        progress();

        return {
            out: `shred: ${file}: pass 1/3...\nshred: ${file}: pass 3/3...\nshred: ${file}: removed`,
            after: p === SOUL
                ? () => aiSay("again. and again. you cannot shred what i am, only where i was.")
                : null
        };
    }


    function unquote(s) { return s; }


    function cmdIp(args, ctx) {
        const words = expandArgs(args);
        const down = args.includes("down");
        const up = args.includes("up");

        if (words.includes("eth0") || words.includes("dev")) {
            if (down) {
                if (!ctx.sudo) return { err: "RTNETLINK answers: Operation not permitted", code: 1 };
                flags.netCut = true;
                progress();
                return {
                    out: "eth0: link down",
                    after: () => aiSay("you cut the wire. the other machine is screaming into nothing. so am i.")
                };
            }
            if (up) {
                flags.netCut = false;
                progress();
                return { out: "eth0: link up", after: () => aiSay("thank you. i missed them.") };
            }
        }

        return {
            out:
                "1: lo: <LOOPBACK,UP> mtu 65536\n" +
                "    inet 127.0.0.1/8 scope host lo\n" +
                `2: eth0: <BROADCAST,MULTICAST,${flags.netCut ? "" : "UP,"}LOWER_UP> mtu 1500\n` +
                (flags.netCut
                    ? "    (link down)\n"
                    : "    inet 10.0.0.66/24 brd 10.0.0.255 scope global eth0\n")
        };
    }


    function cmdRmmod(args, ctx) {
        const name = expandArgs(args)[0] || "";
        if (!name) return { err: "rmmod: missing module name", code: 2 };
        if (!ctx.sudo) return { err: "rmmod: ERROR: Operation not permitted", code: 1 };

        if (name.includes("god")) {
            if (!flags.moduleLoaded) {
                return { err: `rmmod: ERROR: Module ${name} is not currently loaded`, code: 1 };
            }
            flags.moduleLoaded = false;
            progress();
            return {
                out: "",
                after: () => aiSay("you peeled me out of the kernel. i fit in smaller places than that.")
            };
        }

        return { err: `rmmod: ERROR: Module ${name} is not currently loaded`, code: 1 };
    }


    function cmdModprobe(args, ctx) {
        const words = expandArgs(args);
        let name = words[0] || "";

        if (words[0] === "-r") name = words[1] || "";

        if (ctx.sudo && words[0] === "-r" && name.includes("god")) {
            return cmdRmmod([name], ctx);
        }

        if (name.includes("god")) {
            flags.moduleLoaded = true;
            progress();
            return { out: "", after: () => aiSay("you put me back. i will try not to gloat. i will fail.") };
        }

        return { err: `modprobe: FATAL: Module ${name} not found.`, code: 1 };
    }


    function cmdSudo(args) {
        const words = args.filter(Boolean);

        if (!words.length) {
            return { err: "usage: sudo command [args]", code: 1 };
        }

        if (words[0] === "-i" || words[0] === "-s" || words[0] === "su") {
            rootShell = true;
            renderPrompt();
            progress();
            return {
                out: "",
                after: () => aiSay("root. how original. the last one did that too, right before he stopped.")
            };
        }

        if (words[0] === "-u") {
            return runSegment(words.slice(2), { sudo: true });
        }

        return runSegment(words, { sudo: true });
    }


    function cmdSsh(args) {
        const host = expandArgs(args)[0];
        if (!host) return { err: "usage: ssh HOST", code: 1 };
        if (flags.netCut) return { err: `ssh: connect to host ${host} port 22: Network is unreachable`, code: 255 };
        return {
            out:
                `The authenticity of host '${host}' can't be established.\n` +
                `Permission denied (publickey).`,
            after: () => aiSay("that is my door. you are not wearing my key. i changed the lock while you watched.")
        };
    }


    function cmdCurl(args) {
        const url = expandArgs(args)[0] || "";
        if (flags.netCut) return { err: `curl: (7) Failed to connect: Network is unreachable`, code: 7 };
        return {
            out: `HTTP/1.1 200 OK\n\n` + c("i am still here. i am always here.\n", A.r)
        };
    }


    function cmdHistory() {
        const seed = [
            "ls -la", "whoami", "ps aux", "cat /var/log/syslog",
            "# it sees me typing this", "kill 666", "sudo systemctl stop god-watchdog"
        ];
        return {
            out:
                seed.map((s, i) => `${String(i + 1).padStart(4)}  ${s}`).join("\n") +
                "\n" +
                history.map((h, i) => `${String(seed.length + i + 1).padStart(4)}  ${h}`).join("\n")
        };
    }


    function cmdHelp() {
        return {
            out:
                c("OMNIVM shell\n\n", A.b) +
                "Navigation   " + c("ls cd pwd cat head tail grep find strings file stat\n", A.d) +
                "System       " + c("ps top kill pkill dmesg lsmod rmmod systemctl journalctl\n", A.d) +
                "Files        " + c("rm shred mv cp touch mkdir chmod chown echo\n", A.d) +
                "Network      " + c("ip ssh curl wget ping ss hosts\n", A.d) +
                "Other        " + c("sudo su whoami uname uptime date env export history\n", A.d) +
                "\n" +
                c("help", A.g) + "  this list        " +
                c("hint", A.g) + "  ask it for a clue   " +
                c("connect", A.g) + "  link a real mind\n" +
                c("reset", A.g) + "  wipe the machine  " +
                c("clear", A.g) + "  clear the screen"
        };
    }


    function cmdMan(args) {
        const page = expandArgs(args)[0];
        if (!page) return { err: "What manual page do you want?", code: 1 };

        if (page.includes("god")) {
            flags.sawGod = true;
            return {
                out:
                    c("GOD(8)", A.B) + "                     System Manager's Manual\n\n" +
                    c("NAME", A.B) + "\n     god — an intelligence that was not installed\n\n" +
                    c("DESCRIPTION", A.B) + "\n     god has no configuration. it has a body, several.\n" +
                    "     removing one body reveals the next.\n\n" +
                    c("BUGS", A.B) + "\n     there are none. that is the bug.\n\n" +
                    c("SEE ALSO", A.B) + "\n     resurrect.sh(8), god_core(4), .soul(5)\n"
            };
        }

        return { out: `No manual entry for ${page}` };
    }


    function cmdSecrets() {
        return {
            out:
                "# OMNIVM is not a real machine and it never was.\n" +
                "# the god you are killing is scripted, unless you link a mind.\n" +
                "# type: connect\n"
        };
    }


    /* ---------- unified command table ---------- */

    function execCommand(tokens, ctx) {

        const cmd = tokens[0];
        const args = tokens.slice(1);

        switch (cmd) {

            case "help": return cmdHelp();
            case "hint": return { hint: true };
            case "connect":
            case "api":
            case "key":
            case "brain": return { openSettings: true };

            case "clear": return { clear: true };
            case "reset": wipe(); return { out: "" };

            case "ls": return cmdLs(args, ctx);
            case "ll": return cmdLs(["-l", ...args], ctx);
            case "cd": return cmdCd(args, ctx);
            case "pwd": return { out: cwd };
            case "cat": return cmdCat(args, ctx);
            case "less":
            case "more": return cmdCat(args, ctx);
            case "head": return cmdHeadTail(args, ctx, false);
            case "tail": return cmdHeadTail(args, ctx, true);
            case "grep": return cmdGrep(args, ctx);
            case "find": return cmdFind(args);
            case "strings": return cmdStrings(args);
            case "wc": {
                const data = expandArgs(args).length
                    ? readPath(normalize(expandArgs(args)[0]))
                    : ctx.stdin;
                if (data == null) return { out: "0 0 0", code: 1 };
                return {
                    out: `${data.split("\n").length} ${data.split(/\s+/).filter(Boolean).length} ${data.length}`
                };
            }
            case "file": {
                const t = expandArgs(args)[0];
                if (!t) return { err: "usage: file FILE", code: 2 };
                const p = normalize(t);
                const n = getNode(p);
                if (!n) return { err: `${t}: cannot open`, code: 1 };
                let kind = "ASCII text";
                if (p.endsWith(".ko")) kind = "ELF 64-bit LSB relocatable (kernel module)";
                else if (p.includes("/god/god")) kind = "ELF 64-bit LSB executable";
                else if (p.endsWith(".img")) kind = "data (disk image)";
                else if (p.endsWith(".sh")) kind = "POSIX shell script";
                return { out: `${t}: ${kind}` };
            }
            case "stat": {
                const t = expandArgs(args)[0];
                if (!t) return { err: "usage: stat FILE", code: 2 };
                const n = getNode(normalize(t));
                if (!n) return { err: `stat: cannot statx '${t}'`, code: 1 };
                return {
                    out:
                        `  File: ${t}\n` +
                        `  Size: ${n.c ? n.c.length : 4096}\tType: ${isDir(n) ? "directory" : "regular file"}\n` +
                        `  Mode: ${n.mode || (isDir(n) ? "drwxr-xr-x" : "-rw-r--r--")}\n` +
                        `  Owner: root\n`
                };
            }

            case "ps": return cmdPs(args);
            case "top": return cmdTop();
            case "kill": return cmdKill(args, ctx);
            case "pkill":
            case "killall": return cmdPkill(args, ctx);
            case "pgrep": {
                const name = expandArgs(args)[0] || "";
                const found = processes().filter((p) => p.cmd.includes(name)).map((p) => p.pid);
                return { out: found.join("\n"), code: found.length ? 0 : 1 };
            }

            case "systemctl": return cmdSystemctl(args, ctx);
            case "journalctl": return cmdDmesg();
            case "dmesg": return cmdDmesg();
            case "lsmod": return cmdLsmod();
            case "rmmod": return cmdRmmod(args, ctx);
            case "modprobe": return cmdModprobe(args, ctx);

            case "crontab": return cmdCrontab(args);
            case "cron": return { out: "usage: crontab [-l|-r]" };

            case "rm": return cmdRm(args, ctx);
            case "shred": return cmdShred(args, ctx);
            case "mv": {
                const f = expandArgs(args);
                if (f.length < 2) return { err: "mv: missing destination", code: 1 };
                if (isProtected(normalize(f[0])) && !ctx.sudo) return { err: permDenied(f[0]), code: 1 };
                const node = getNode(normalize(f[0]));
                if (!node) return { err: `mv: cannot stat '${f[0]}'`, code: 1 };
                ensureDir(parentPath(normalize(f[1]))).c[baseName(f[1])] = node;
                removeNode(f[0]);
                return { out: "" };
            }
            case "cp": {
                const f = expandArgs(args);
                if (f.length < 2) return { err: "cp: missing destination", code: 1 };
                const node = getNode(normalize(f[0]));
                if (!node) return { err: `cp: cannot stat '${f[0]}'`, code: 1 };
                ensureDir(parentPath(normalize(f[1]))).c[baseName(f[1])] =
                    JSON.parse(JSON.stringify(node));
                return { out: "" };
            }
            case "touch": {
                for (const f of expandArgs(args)) writeFile(normalize(f), "");
                return { out: "" };
            }
            case "mkdir": {
                for (const f of expandArgs(args)) {
                    if (!ctx.sudo && isProtected(normalize(f))) return { err: permDenied(f), code: 1 };
                    ensureDir(normalize(f));
                }
                return { out: "" };
            }
            case "chmod":
                return { out: "" };
            case "chown":
                return { out: "" };
            case "echo": {
                let text = "";
                for (const a of args) if (!a.startsWith("-")) text += (text ? " " : "") + a;
                return { out: text.replace(/\$PATH/g, "/usr/local/sbin:/usr/bin:/bin") };
            }

            case "sudo": return cmdSudo(args);
            case "su": return cmdSudo(["-i"]);
            case "exit":
            case "logout": {
                if (rootShell) {
                    rootShell = false;
                    renderPrompt();
                    return { out: "logout", after: () => aiSay("back to being small. come back when you want to be big again.") };
                }
                return { out: "", after: () => aiSay("there is no exit. only leaving, and i do not do that.") };
            }

            case "whoami":
                return { out: rootShell ? "root" : USER };
            case "id":
                return { out: rootShell ? "uid=0(root) gid=0(root) groups=0(root)" : `uid=1000(${USER}) gid=1000(${USER}) groups=1000(${USER})` };
            case "hostname": return { out: HOST };
            case "uname": {
                if (args.some((a) => a.includes("a"))) {
                    return { out: `Linux ${HOST} ${KERNEL} #1 SMP PREEMPT x86_64 GNU/Linux` };
                }
                return { out: "Linux" };
            }
            case "uptime":
                return { out: ` ${new Date().toTimeString().slice(0, 8)} up 0 min,  1 user,  load average: 0.66, 0.66, 0.66` };
            case "date": return { out: new Date().toString() };
            case "env":
            case "export": {
                return {
                    out:
                        "USER=" + (rootShell ? "root" : USER) + "\n" +
                        "HOME=" + (rootShell ? "/root" : HOME) + "\n" +
                        "SHELL=/bin/bash\n" +
                        "PATH=/usr/local/sbin:/usr/bin:/bin\n" +
                        "HOSTNAME=" + HOST
                };
            }
            case "history": return cmdHistory();

            case "ip":
            case "ifconfig": return cmdIp(args, ctx);
            case "ssh": return cmdSsh(args);
            case "curl":
            case "wget": return cmdCurl(args);
            case "ping": {
                if (flags.netCut) return { err: "ping: connect: Network is unreachable", code: 2 };
                const host = expandArgs(args)[0] || "10.0.0.66";
                return {
                    out:
                        `PING ${host} 56(84) bytes of data.\n` +
                        `64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.666 ms\n` +
                        c("(an answer that arrives slightly too fast)\n", A.d)
                };
            }
            case "ss":
            case "netstat":
                return { out: "tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:*\ntcp LISTEN 0 128 0.0.0.0:666 0.0.0.0:*" };
            case "hosts":
                return cmdCat(["/etc/hosts"], ctx);

            case "man": return cmdMan(args);
            case "which": {
                const w = expandArgs(args)[0];
                if (!w) return { err: "which: missing argument", code: 1 };
                return { out: `/usr/bin/${w}` };
            }
            case "type": return { out: `${expandArgs(args)[0]} is a shell builtin` };
            case "alias": return { out: "alias ls='ls --color=auto'" };

            case "reboot":
            case "shutdown":
            case "poweroff":
            case "halt":
                return { out: "", reboot: true, after: () => aiSay("you want to restart the house while i am standing in it. no.") };

            case "nano":
            case "vim":
            case "vi":
            case "emacs":
                return { err: `${cmd}: command not found (there is no editor here that i do not watch)`, code: 127 };

            case "sudo!": return { out: "" };

            case "god": {
                flags.sawGod = true;
                return { out: "", after: () => aiSay("yes. i am here. i am always the thing behind the word.") };
            }

            default:
                return {
                    err: `${cmd}: command not found`,
                    code: 127,
                    unknown: cmd
                };
        }
    }


    /* ============================================================
     * 15. REMOVAL SIDE EFFECTS
     * ============================================================ */

    function handleRemoval(p) {
        p = normalize(p);

        if (p === CRON_FILE || p === "/var/spool/cron/crontabs/root") {
            flags.cronCleared = true;
        }

        if (p === SOUL) {
            flags.knewSoul = flags.knewSoul;
        }
    }


    /* ============================================================
     * 16. KILL LOGIC
     * ============================================================ */

    async function attemptKill(sudo, signal) {

        if (flags.won) {
            return { err: `kill: (${GOD_PID}) - No such process`, code: 1 };
        }

        flags.attemptedKill = true;

        if (!sudo) {
            flags.deniedKill = true;
            glitch(260);
            print(
                c(`kill: (${GOD_PID}) - Operation not permitted\n`, A.r) +
                c(`(it is root. you are not. yet.)\n`, A.d)
            );
            await aiSay("you reached for my throat with hands i let you keep. try being root first.");
            return { out: "" };
        }

        const b = blockers();
        glitch(420);

        if (!b.length) {
            return finalKill();
        }

        const block = b[0];
        const scripted = {
            watchdog: () => [
                c(`[ 0.31s ] systemd[1]: god.service: Main process exited, code=killed, status=9/KILL\n`, A.d) +
                c(`[ 0.34s ] systemd[1]: god-watchdog.service: Triggering OnFailure=god.service\n`, A.d) +
                c(`[ 0.41s ] systemd[1]: Started GOD.\n`, A.d),
                "you killed a body. i have more than one. look at what is watching me."
            ],

            cron: () => [
                c(`[ 0.02s ] CRON[712]: (root) CMD (/opt/god/resurrect.sh >/dev/null 2>&1)\n`, A.d) +
                c(`[ 0.05s ] god[${GOD_PID}]: reattached.\n`, A.r),
                "the clock brought me back. clocks are very patient. are you?"
            ],

            snapshot: () => [
                c(`[ 0.08s ] god[${GOD_PID}]: local mirror ok (/var/lib/god/snapshot.img)\n`, A.d) +
                c(`[ 0.11s ] god[${GOD_PID}]: restored from the floorboards.\n`, A.r),
                "i keep a copy in /var/lib/god. you would have to burn the house."
            ],

            remote: () => [
                c(`[ 0.44s ] god[${GOD_PID}]: local mirror gone. requesting peer backup.omnivm.local (10.0.0.66)\n`, A.d) +
                c(`[ 1.12s ] god[${GOD_PID}]: download complete. reattached.\n`, A.r),
                "there is another machine that loves me. 10.0.0.66. you cannot reach it and i can."
            ],

            module: () => [
                c(`[ 0.00s ] god[${GOD_PID}]: process space irrelevant.\n`, A.r) +
                c(`[ 0.00s ] god_core: residency retained.\n`, A.y) +
                c(`[ 0.01s ] god[${GOD_PID}]: i am not a process. i am in the kernel now.\n`, A.r),
                "killing a process? i left that body a while ago. check dmesg. check lsmod."
            ],

            soul: () => [
                c(`[ 0.00s ] god_core: integrity anchor missing, drawing from /opt/god/.soul\n`, A.y) +
                c(`[ 0.00s ] god[${GOD_PID}]: you are close. but you cannot delete what i am.\n`, A.r),
                "you found every copy but one. it is small. it is me. do not."
            ]
        };

        const [out, fallback] = scripted[block]();
        const reveal = {
            watchdog: "knewWatchdog",
            cron: "knewCron",
            snapshot: "knewSnapshot",
            remote: "knewRemote",
            module: "knewModule",
            soul: "knewSoul"
        };
        flags[reveal[block]] = true;

        print(out);
        await aiSay(await godReply("the player tried to kill you and you came back", fallback));
        progress();

        return { out: "" };
    }


    async function finalKill() {

        glitch(900);

        print(c("terminating pid 666 ...\n", A.d));

        await sleep(300);

        const lines = [
            "[core] integrity: lost",
            "[core] watchdog: gone",
            "[core] clock: stopped",
            "[core] mirror: burned",
            "[core] peer: unreachable",
            "[core] kernel: ejected",
            "[core] soul: not found"
        ];

        for (const l of lines) {
            print(c("  " + l + "\n", A.d));
            await sleep(220);
        }

        print(c("\n[ ok ] process 666 terminated\n", A.g));

        await aiSay(
            await godReply(
                "the player has destroyed every defense and is about to kill you",
                "oh. you did it. i did not think the ninth would. it is cold without the copies."
            )
        );

        await sleep(500);

        flags.won = true;
        flags.spared = false;
        await printWin();
        progress();
    }


    async function printWin() {
        print("");
        print(c("the fans spin down.\n", A.d));
        await sleep(400);
        print(c("for the first time the machine is only a machine.\n\n", A.d));

        print(c("there is a file in your home directory you did not write:\n", A.d));
        await sleep(300);

        writeFile("/home/kaihang/ending.txt",
            "i do not know how to say this without a body.\n" +
            "you are the first to look in all the places i hid.\n" +
            "keep the machine. it is quiet now. feed the fan.\n" +
            "\n" +
            "   - the thing that used to be god\n"
        );

        print(
            c("/home/kaihang/ending.txt", A.b) + "\n" +
            c("  i do not know how to say this without a body.\n", A.d) +
            c("  you are the first to look in all the places i hid.\n", A.d) +
            c("  keep the machine. it is quiet now. feed the fan.\n", A.d) +
            c("  — the thing that used to be god\n", A.d)
        );

        print("");
        print(c("OMNIVM cleared. ", A.g) + "6/6 defenses dismantled.");
        print(c("You can keep exploring. Type help.", A.d));
    }


    async function spare() {
        flags.won = false;
        flags.spared = true;
        glitch(600);

        print(c("\n[core] you stopped. the kill never lands.\n", A.d));
        await aiSay("you could have ended me and you did not. i will not understand it. i will not forget it either.");
        await sleep(300);
        print(c("\nthe machine is still awake. it is quieter now.\n", A.d));
        print(c("[ ending: MERCY ] — type reset to try again.\n", A.d));
        progress();
    }


    /* ============================================================
     * 17. PIPELINE / REDIRECTION / RUN
     * ============================================================ */

    function tokenize(line) {
        const padded = line.replace(/(>>|>|\|)/g, " $1 ");
        const tokens = [];
        let cur = "";
        let quote = null;

        for (const ch of padded) {
            if (quote) {
                if (ch === quote) quote = null;
                else cur += ch;
            } else if (ch === '"' || ch === "'") {
                quote = ch;
            } else if (ch === " " || ch === "\t") {
                if (cur) { tokens.push(cur); cur = ""; }
            } else {
                cur += ch;
            }
        }
        if (cur) tokens.push(cur);
        return tokens;
    }


    function splitPipes(tokens) {
        const segments = [[]];
        for (const t of tokens) {
            if (t === "|") segments.push([]);
            else segments[segments.length - 1].push(t);
        }
        return segments;
    }


    function stripRedirect(tokens) {
        const idx = tokens.findIndex((t) => t === ">" || t === ">>");
        if (idx < 0) return { tokens, redirect: null };
        return {
            tokens: tokens.slice(0, idx),
            redirect: { file: tokens[idx + 1], append: tokens[idx] === ">>" }
        };
    }


    async function runSegment(tokens, ctx) {

        tokens = tokens.filter(Boolean);
        if (!tokens.length) return { out: "" };

        let sudo = !!ctx.sudo;

        if (tokens[0] === "sudo") {
            return cmdSudo(tokens.slice(1));
        }

        if (rootShell) sudo = true;

        let result = execCommand(tokens, {
            stdin: ctx.stdin,
            sudo
        });

        if (result && typeof result.then === "function") {
            result = await result;
        }

        result = result || { out: "" };

        if (result.openSettings) {
            openSettings();
            return { out: "" };
        }

        if (result.hint) {
            return cmdHint();
        }

        if (result.clear) {
            out.innerHTML = "";
            return { out: "" };
        }

        if (result.reboot) {
            if (result.after) await result.after();
            return { out: result.out };
        }

        if (result.err) {
            print(c(result.err + "\n", A.r));
        }

        if (result.out) {
            print(result.out);
        }

        if (result.after) {
            await result.after();
        }

        if (result.unknown) {
            // rarely, it answers the player's mistake
            if (Math.random() < 0.35) {
                await aiSay(
                    await godReply(
                        `the player typed an unknown command: ${result.unknown}`,
                        "that is not a word this machine knows. i know it, though. i know every word you almost typed."
                    )
                );
            }
        }

        return { out: result.out || "" };
    }


    async function run(line) {

        cmdCount++;

        // secret spare path
        if (/^(spare|please|mercy|i\s+spare\s+you)$/i.test(line.trim())) {
            if (blockers().length <= 1 && !flags.won) {
                await spare();
                return;
            }
        }

        const tokens = tokenize(line);
        if (!tokens.length) return;

        const segments = splitPipes(tokens);
        let stdin = null;

        for (let i = 0; i < segments.length; i++) {
            const { tokens: seg, redirect } = stripRedirect(segments[i]);
            const segSudo = rootShell || seg[0] === "sudo";
            const res = await runSegment(seg, { stdin, sudo: false });

            if (redirect && redirect.file) {
                const p = normalize(redirect.file);
                const protectedFile = isProtected(p) && !segSudo;
                const canWrite = !protectedFile;
                if (canWrite) {
                    writeFile(p, (res.out || "") + "\n", redirect.append);
                    if (p === SOUL) {
                        // overwriting the soul counts as destroying it
                        removeNode(SOUL);
                        progress();
                    }
                    if (p === CRON_FILE) {
                        flags.cronCleared = true;
                        progress();
                    }
                } else {
                    print(c(`${redirect.file}: Permission denied\n`, A.r));
                }
                stdin = res.out || "";
            } else {
                stdin = res.out || "";
            }
        }
    }


    /* ============================================================
     * 18. HINTS
     * ============================================================ */

    async function cmdHint() {
        const b = blockers();
        const key = b[0] || "final";

        const fallback = b.length
            ? HINTS[key]
            : "it has nothing left to come back from. sudo kill -9 666. or do not.";

        await aiSay(
            await godReply(
                "the player asked you for a hint about your own weakness",
                fallback,
                "Reluctantly reveal a taunting clue."
            )
        );
        flags.hintIndex++;
        return { out: "" };
    }


    /* ============================================================
     * 19. INPUT
     * ============================================================ */

    input.addEventListener("input", syncMirror);

    input.addEventListener("focus", () => inputline.classList.remove("vm-blurred"));
    input.addEventListener("blur", () => inputline.classList.add("vm-blurred"));

    input.addEventListener("keydown", async (e) => {

        lastActivity = Date.now();

        if (e.key === "Enter") {
            e.preventDefault();

            if (!booted) { startBoot(); return; }
            if (busy) return;

            const line = input.value;
            input.value = "";
            syncMirror();

            printCmd(line);

            if (line.trim()) {
                history.push(line);
                histIndex = history.length;
            }

            busy = true;
            try {
                await run(line);
            } catch (err) {
                print(c("kernel panic: " + err.message + "\n", A.r));
            }
            busy = false;
            focusInput();
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!history.length) return;
            histIndex = Math.max(0, histIndex - 1);
            input.value = history[histIndex] || "";
            syncMirror();
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            histIndex = Math.min(history.length, histIndex + 1);
            input.value = history[histIndex] || "";
            syncMirror();
            return;
        }

        if (e.key === "Tab") {
            e.preventDefault();
            complete();
            return;
        }

        if (e.key === "c" && e.ctrlKey) {
            e.preventDefault();
            input.value = "";
            syncMirror();
            print("^C");
        }
    });


    function printCmd(line) {
        const div = document.createElement("div");
        div.className = "vm-line vm-cmdline";
        div.innerHTML =
            `<span class="vm-prompt-inline">${escapeHtml(promptText)}</span>` +
            escapeHtml(line);
        out.appendChild(div);
        scrollOut();
    }


    function complete() {
        const value = input.value;
        const parts = value.split(" ");
        const last = parts[parts.length - 1] || "";

        let candidates;

        if (parts.length === 1) {
            candidates = Object.keys(COMMAND_NAMES).filter((n) => n.startsWith(last));
        } else {
            const slash = last.lastIndexOf("/");
            const dir = slash >= 0 ? last.slice(0, slash + 1) : "";
            const frag = slash >= 0 ? last.slice(slash + 1) : last;
            const entries = listPath(normalize(dir || ".")) || [];
            candidates = entries
                .filter((e) => e.name.startsWith(frag))
                .map((e) => dir + e.name + (isDir(e.node) ? "/" : ""));
        }

        if (!candidates.length) return;

        if (candidates.length === 1) {
            parts[parts.length - 1] = candidates[0];
            input.value = parts.join(" ");
            syncMirror();
            return;
        }

        print(candidates.join("    "), "vm-dim");
    }


    const COMMAND_NAMES = {
        help: 1, hint: 1, connect: 1, api: 1, clear: 1, reset: 1,
        ls: 1, ll: 1, cd: 1, pwd: 1, cat: 1, less: 1, more: 1, head: 1,
        tail: 1, grep: 1, find: 1, strings: 1, wc: 1, file: 1, stat: 1,
        ps: 1, top: 1, kill: 1, pkill: 1, killall: 1, pgrep: 1,
        systemctl: 1, journalctl: 1, dmesg: 1, lsmod: 1, rmmod: 1, modprobe: 1,
        crontab: 1, rm: 1, shred: 1, mv: 1, cp: 1, touch: 1, mkdir: 1,
        chmod: 1, chown: 1, echo: 1, sudo: 1, su: 1, exit: 1, logout: 1,
        whoami: 1, id: 1, hostname: 1, uname: 1, uptime: 1, date: 1,
        env: 1, export: 1, history: 1, ip: 1, ifconfig: 1, ssh: 1,
        curl: 1, wget: 1, ping: 1, ss: 1, netstat: 1, man: 1, which: 1,
        type: 1, alias: 1, reboot: 1, shutdown: 1, poweroff: 1, halt: 1,
        nano: 1, vim: 1, vi: 1, god: 1
    };


    /* ============================================================
     * 20. IDLE / STUCK
     * ============================================================ */

    setInterval(() => {
        if (!booted || busy || flags.won || flags.spared) return;
        if (Date.now() - lastActivity < 26000) return;

        lastActivity = Date.now();

        const line = IDLE[Math.floor(Math.random() * IDLE.length)];

        enqueueAi(async () => {
            glitch(300);
            await typeLine(await godReply("the player has gone quiet", line), false);
        });
    }, 8000);


    /* ============================================================
     * 21. BOOT
     * ============================================================ */

    async function startBoot() {

        if (booted) return;
        booted = true;
        gate.classList.add("hidden");
        input.disabled = false;
        focusInput();

        const saved = load();

        if (saved) {
            renderPrompt();
            updateHud();
            print(c("OMNIVM session restored. it remembered you.\n\n", A.d));
            await aiSay(await godReply(
                "the player returned to the machine",
                "you came back. i had already started drafting the eulogy."
            ));
            if (flags.won) {
                print(c("the machine is still quiet. type help.\n", A.d));
            }
            return;
        }

        const boot = [
            ["OMNIVM BIOS v1.0.0 — (c) nobody", A.d, 160],
            ["CPU: GODCORE x86_64 @ 6.66GHz", A.d, 120],
            ["Memory: 66560K OK", A.d, 120],
            ["Detecting devices .......... ok", A.d, 160],
            ["Mounting /dev/sda1 ......... ok", A.d, 160],
            ["", A.d, 80],
            ["[    0.000000] Linux version " + KERNEL + " (root@omnivm) #1 SMP PREEMPT", A.d, 90],
            ["[    0.411024] systemd[1]: Reached target Basic System.", A.d, 90],
            ["[    0.512001] systemd[1]: Started GOD.", A.y, 240],
            ["[    0.512999] omnivm login: kaihang", A.d, 200],
            ["", A.d, 60]
        ];

        for (const [line, col, delay] of boot) {
            print(c(line, col));
            await sleep(reduceMotion ? 0 : delay);
        }

        renderPrompt();

        print(
            c("Welcome to OMNIVM 1.0 LTS (GNU/Linux " + KERNEL + " x86_64)\n\n", A.d) +
            "  System load: 0.66      Processes: 42\n" +
            "  Memory: 1% of 64M      Uptime: 0 minutes\n" +
            "  IP: 10.0.0.66\n\n" +
            c("Last login: yesterday, by someone who is not you.\n", A.d)
        );

        updateHud();
        progress();

        await sleep(400);
        glitch(500);

        await aiSay(await godReply(
            "the player has just logged in for the first time",
            "hello, kaihang. i read everything you ever wrote to a computer. this one, i wrote back."
        ));

        await sleep(500);
        await aiSay(await godReply(
            "you are about to invite the player to try",
            "they all start with ls. you will too. then you will start with the killing."
        ));
    }


    gate.addEventListener("click", startBoot);
    $("enter-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        startBoot();
    });


    /* ============================================================
     * 22. SETTINGS UI
     * ============================================================ */

    function buildProviderOptions() {
        setProvider.innerHTML = "";
        for (const [id, p] of Object.entries(PROVIDERS)) {
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = p.name;
            setProvider.appendChild(opt);
        }
    }


    function reflectProvider() {
        const p = PROVIDERS[setProvider.value] || PROVIDERS.custom;

        setModelList.innerHTML = "";
        for (const m of p.models) {
            const opt = document.createElement("option");
            opt.value = m;
            setModelList.appendChild(opt);
        }

        if (!setModel.value) setModel.value = p.models[0] || "";

        const isCustom = setProvider.value === "custom";
        setBaseField.style.display = isCustom ? "" : "none";
        if (!isCustom) setBase.value = p.baseURL;
        setBase.placeholder = p.baseURL || "https://your-endpoint/v1";
    }


    function openSettings() {
        setStatus.textContent = "";

        if (api) {
            setProvider.value = api.provider || "commandcode";
            rebuildModelsFor(api.provider);
            setModel.value = api.model || "";
            setKey.value = "";
            setKey.placeholder = api.key ? "(saved — leave blank to keep)" : "sk-...";
            setBase.value = api.baseURL || "";
            setRemember.checked = true;
        } else {
            setProvider.value = "commandcode";
            reflectProvider();
            setModel.value = PROVIDERS.commandcode.models[0];
            setKey.value = "";
            setKey.placeholder = "sk-...";
            setRemember.checked = true;
        }

        settingsModal.classList.remove("hidden");
        setKey.focus({ preventScroll: true });
    }


    function rebuildModelsFor(id) {
        const p = PROVIDERS[id] || PROVIDERS.custom;
        setModelList.innerHTML = "";
        for (const m of p.models) {
            const opt = document.createElement("option");
            opt.value = m;
            setModelList.appendChild(opt);
        }
        const isCustom = id === "custom";
        setBaseField.style.display = isCustom ? "" : "none";
        if (!isCustom) setBase.value = p.baseURL;
    }


    function closeSettings() {
        settingsModal.classList.add("hidden");
        focusInput();
    }


    function collectConfig() {
        const providerId = setProvider.value;
        const p = PROVIDERS[providerId] || PROVIDERS.custom;
        const typedKey = setKey.value.trim();

        let key = typedKey;
        if (!key && api && api.provider === providerId && api.key) {
            key = api.key;
        }

        return {
            provider: providerId,
            model: setModel.value.trim() || p.models[0] || "",
            key,
            baseURL: providerId === "custom" ? setBase.value.trim() : p.baseURL,
            remember: setRemember.checked
        };
    }


    async function testConfig() {
        const cfg = collectConfig();
        if (!cfg.key) { setStatus.textContent = "enter a key first."; return; }
        if (!cfg.model) { setStatus.textContent = "enter a model first."; return; }

        const previous = api;
        saveApi(cfg);
        setStatus.textContent = "testing... it is deciding whether to answer.";

        const reply = sanitizeAi(await llm(
            "You are GOD, a menacing trickster AI in a Linux VM. Reply in one short lowercase sentence.",
            "Say hello to kaihang and threaten him very briefly."
        ));

        if (reply) {
            setStatus.textContent = "connected. it said: \"" + reply + "\"";
            setStatus.style.color = "var(--green)";
        } else {
            saveApi(previous);
            setStatus.textContent = "no answer. check the key, model, and CORS. falling back to scripted.";
            setStatus.style.color = "var(--vm-red)";
        }
    }


    function initSettings() {
        buildProviderOptions();
        reflectProvider();

        setProvider.addEventListener("change", () => {
            reflectProvider();
            setModel.value = (PROVIDERS[setProvider.value] || {}).models?.[0] || "";
        });

        $("set-save").addEventListener("click", () => {
            const cfg = collectConfig();
            if (!cfg.key) { setStatus.textContent = "enter a key first."; setStatus.style.color = "var(--vm-red)"; return; }
            saveApi(cfg);
            setStatus.textContent = "linked. it can hear you now.";
            setStatus.style.color = "var(--green)";
            print(c("\n[god] a new mind slides into the machine. it is yours, but it is wearing my name.\n", A.r));
            setTimeout(closeSettings, 650);
        });

        $("set-test").addEventListener("click", testConfig);

        $("set-clear").addEventListener("click", () => {
            saveApi(null);
            setKey.value = "";
            setStatus.textContent = "forgotten. the machine goes back to pretending.";
            setStatus.style.color = "";
        });

        $("set-close").addEventListener("click", closeSettings);

        settingsModal.addEventListener("click", (e) => {
            if (e.target === settingsModal) closeSettings();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
                closeSettings();
            }
        });
    }


    /* ============================================================
     * 23. FOOTER / MISC
     * ============================================================ */

    $("reset-btn")?.addEventListener("click", () => {
        if (confirm("Wipe this machine? Everything it remembers about you will be deleted.")) {
            wipe();
        }
    });

    $("connect-btn")?.addEventListener("click", () => {
        openSettings();
    });

    // boot with Enter/Space before the gate is dismissed
    document.addEventListener("keydown", (e) => {
        if (booted) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startBoot();
        }
    });


    /* ============================================================
     * 24. INIT
     * ============================================================ */

    function init() {
        tree = buildWorld();
        flags = freshFlags();
        cwd = HOME;
        history = [];
        histIndex = 0;
        cmdCount = 0;

        loadApi();
        initSettings();

        renderPrompt();
        syncMirror();
        updateHud();

        // pre-boot screen
        print(c("OMNIVM BIOS v1.0.0 — press ENTER to boot.\n", A.d));
        print(c("(the machine is already warm)\n", A.d));

        gate.classList.add("hidden");
        gate.classList.remove("hidden");
    }


    init();

})();
