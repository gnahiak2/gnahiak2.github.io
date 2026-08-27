"use strict";


/*
 * Kaihang personal website
 *
 * GitHub repositories are loaded directly from
 * the public GitHub API.
 */


const USERNAME = "gnahiak2";

const REPO_LIMIT = 12;

const API_URL =
    `https://api.github.com/users/${USERNAME}/repos` +
    `?sort=updated` +
    `&direction=desc` +
    `&per_page=${REPO_LIMIT}` +
    `&type=owner`;


const projectsGrid =
    document.getElementById("projects-grid");

const year =
    document.getElementById("year");


/*
 * Escape GitHub-provided strings before inserting
 * them into HTML.
 */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/*
 * Generate one project card.
 */

function createProjectHTML(repo) {

    const name =
        escapeHTML(repo.name);

    const description =
        escapeHTML(
            repo.description ||
            "No description yet. Probably doing something interesting."
        );

    const language =
        escapeHTML(
            repo.language ||
            "Various"
        );

    const stars =
        Number(repo.stargazers_count) || 0;

    const forks =
        Number(repo.forks_count) || 0;

    return `
        <a
            class="project"
            href="${repo.html_url}"
            target="_blank"
            rel="noopener noreferrer"
        >

            <div class="project-name">
                ${name}
            </div>

            <p class="project-description">
                ${description}
            </p>

            <div class="project-meta">

                <span class="language">

                    <span
                        class="language-dot"
                        aria-hidden="true"
                    ></span>

                    ${language}

                </span>

                <span>
                    ★ ${stars}
                </span>

                <span>
                    ${forks} forks
                </span>

            </div>

            <span
                class="project-arrow"
                aria-hidden="true"
            >
                ↗
            </span>

        </a>
    `;
}


/*
 * Display an error without leaving the loading
 * state on screen forever.
 */

function showProjectError() {

    projectsGrid.innerHTML = `
        <div class="loading">

            <span>
                Couldn't load projects.
            </span>

            <a
                href="https://github.com/${USERNAME}"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--blue-light)"
            >
                View GitHub →
            </a>

        </div>
    `;

}


/*
 * Fetch repositories from GitHub.
 */

async function loadProjects() {

    try {

        const response =
            await fetch(API_URL, {
                headers: {
                    Accept:
                        "application/vnd.github+json"
                }
            });


        if (!response.ok) {

            throw new Error(
                `GitHub API returned ${response.status}`
            );

        }


        const repos =
            await response.json();


        /*
         * Only show original repositories.
         * Forks aren't useful as portfolio projects.
         */

        const projects =
            repos
                .filter(repo => !repo.fork)
                .slice(0, REPO_LIMIT);


        if (!projects.length) {

            throw new Error(
                "No public repositories found."
            );

        }


        /*
         * Generate all cards first, then perform
         * one DOM update.
         */

        projectsGrid.innerHTML =
            projects
                .map(createProjectHTML)
                .join("");


    } catch (error) {

        console.error(
            "Failed to load GitHub projects:",
            error
        );

        showProjectError();

    }

}


/*
 * Initialise the page.
 */

function init() {

    year.textContent =
        new Date().getFullYear();

    loadProjects();

}


init();
