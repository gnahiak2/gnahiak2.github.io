#!/usr/bin/env node
/*
 * refresh-github.mjs — rebuilds data/github.json, the snapshot the
 * homepage is drawn from.
 *
 *   node tools/refresh-github.mjs
 *
 * It asks GitHub for the public profile, the public repositories
 * (with their languages and a plain-text cut of each README), the
 * pinned list and the contribution calendar of the last year.
 *
 * Auth: the GITHUB_TOKEN environment variable when set, otherwise the
 * token of a logged-in `gh` CLI. Only public data is written; nothing
 * about private repositories ends up in the file.
 *
 * No packages. Node 18+.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "gnahiak2";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "github.json");
const README_CHARS = 1500;
const README_BLOCKS = 16;

function token() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try {
        return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
    } catch (e) {
        throw new Error("No GITHUB_TOKEN set and `gh auth token` failed. Log in with `gh auth login`.");
    }
}

const TOKEN = token();

async function api(path, accept) {
    const res = await fetch("https://api.github.com" + path, {
        headers: {
            Authorization: "Bearer " + TOKEN,
            Accept: accept || "application/vnd.github+json",
            "User-Agent": "refresh-github"
        }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(path + " returned " + res.status);
    return accept ? res.text() : res.json();
}

async function graphql(query) {
    for (let attempt = 1; ; attempt++) {
        const res = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: { Authorization: "Bearer " + TOKEN, "User-Agent": "refresh-github" },
            body: JSON.stringify({ query })
        });
        if (res.ok) {
            const body = await res.json();
            if (body.errors) throw new Error(JSON.stringify(body.errors));
            return body.data;
        }
        if (attempt === 3) throw new Error("GraphQL returned " + res.status);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
}

/* ---------- README: markdown to a few plain-text blocks ---------- */

function inline(text) {
    return text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")            // images
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")          // links keep their words
        .replace(/<[^>]+>/g, "")                          // html tags
        .replace(/(\*\*|__)(.+?)\1/g, "$2")               // bold
        .replace(/(^|[\s(])[*_]([^*_\s][^*_]*)[*_](?=$|[\s).,!?:;])/g, "$1$2") // italics
        .replace(/`([^`]+)`/g, "$1")                      // inline code
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function readmeBlocks(markdown) {
    const blocks = [];
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    let para = [];
    let code = null;
    let used = 0;

    const push = (t, text) => {
        text = t === "code" ? text.replace(/\s+$/, "") : inline(text);
        if (!text || /^[-=*_\s|:]+$/.test(text)) return;
        if (used + text.length > README_CHARS) text = text.slice(0, Math.max(0, README_CHARS - used)).replace(/\s+\S*$/, "") + "…";
        if (text.length < 2) return;
        blocks.push({ t, text });
        used += text.length;
    };
    const flush = () => { if (para.length) { push("p", para.join(" ")); para = []; } };

    for (const raw of lines) {
        if (blocks.length >= README_BLOCKS || used >= README_CHARS) break;
        const line = raw.trimEnd();

        if (code !== null) {
            if (/^\s*(```|~~~)/.test(line)) { push("code", code.join("\n")); code = null; }
            else if (code.length < 8) code.push(line);
            continue;
        }
        if (/^\s*(```|~~~)/.test(line)) { flush(); code = []; continue; }
        if (!line.trim()) { flush(); continue; }

        const h = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*$/);
        if (h) { flush(); push("h", h[1]); continue; }
        if (/^\s*\|/.test(line)) { flush(); continue; }                 // tables: skipped
        const li = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
        if (li) { flush(); push("li", li[1]); continue; }
        if (/^\s*>/.test(line)) { para.push(line.replace(/^\s*>\s?/, "")); continue; }
        para.push(line.trim());
    }
    flush();
    if (code !== null && code.length) push("code", code.join("\n"));
    return blocks;
}

/* ---------- gather ---------- */

const profile = await api("/users/" + USER);

const repoPages = [];
for (let page = 1; ; page++) {
    const batch = await api(`/users/${USER}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
    repoPages.push(...batch);
    if (batch.length < 100) break;
}

const gql = await graphql(`{
  user(login: "${USER}") {
    pronouns
    pinnedItems(first: 6, types: [REPOSITORY]) { nodes { ... on Repository { name owner { login } url description } } }
    organizations(first: 20) { nodes { login name url } }
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      nodes { name languages(first: 6, orderBy: {field: SIZE, direction: DESC}) { totalSize edges { size node { name color } } } }
    }
    pullRequests(first: 60, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { title state merged url createdAt repository { nameWithOwner isPrivate stargazerCount owner { login } } }
    }
  }
}`);

const u = gql.user;
const langs = new Map(u.repositories.nodes.map((r) => [r.name, r.languages]));

const repos = [];
for (const r of repoPages.filter((x) => !x.private)) {
    const entry = {
        name: r.name,
        description: r.description || "",
        url: r.html_url,
        homepage: r.homepage || "",
        fork: r.fork,
        archived: r.archived,
        language: r.language || "",
        stars: r.stargazers_count,
        forks: r.forks_count,
        license: r.license && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : "",
        topics: r.topics || [],
        createdAt: r.created_at,
        pushedAt: r.pushed_at
    };
    if (!r.fork) {
        const l = langs.get(r.name);
        entry.languages = l && l.totalSize
            ? l.edges.map((e) => [e.node.name, Math.round((e.size / l.totalSize) * 1000) / 10, e.node.color || ""])
            : [];
        const md = await api(`/repos/${USER}/${encodeURIComponent(r.name)}/readme`, "application/vnd.github.raw");
        entry.readme = readmeBlocks(md);
    }
    repos.push(entry);
    process.stdout.write(".");
}
process.stdout.write("\n");

const days = u.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const data = {
    generatedAt: new Date().toISOString(),
    user: {
        login: profile.login,
        name: profile.name || profile.login,
        bio: (profile.bio || "").trim(),
        location: profile.location || "",
        url: profile.html_url,
        since: profile.created_at,
        publicRepos: profile.public_repos,
        followers: profile.followers
    },
    orgs: u.organizations.nodes.map((o) => ({ login: o.login, name: o.name || o.login, url: o.url })),
    pinned: u.pinnedItems.nodes.map((p) => ({ name: p.name, owner: p.owner.login, url: p.url })),
    year: {
        total: u.contributionsCollection.contributionCalendar.totalContributions,
        from: days[0].date,
        to: days[days.length - 1].date,
        days: days.map((d) => d.contributionCount)
    },
    repos,
    pulls: u.pullRequests.nodes
        // upstream pull requests that landed or are still open; closed ones are left out
        .filter((p) => !p.repository.isPrivate && p.repository.owner.login !== USER && (p.merged || p.state === "OPEN"))
        .map((p) => ({
            title: p.title,
            repo: p.repository.nameWithOwner,
            stars: p.repository.stargazerCount,
            state: p.merged ? "merged" : p.state.toLowerCase(),
            url: p.url,
            date: p.createdAt.slice(0, 10)
        }))
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");

const own = repos.filter((r) => !r.fork).length;
console.log(`wrote ${OUT}`);
console.log(`${repos.length} public repos (${own} original, ${repos.length - own} forks), ${data.year.total} contributions from ${data.year.from} to ${data.year.to}`);
