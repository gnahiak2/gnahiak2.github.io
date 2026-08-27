const GITHUB_USER = "gnahiak2";
const PROJECT_LIMIT = 12;

const projectsGrid = document.getElementById("projects-grid");

async function loadProjects() {
    try {
        const response = await fetch(
            `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&direction=desc&per_page=${PROJECT_LIMIT}`
        );

        if (!response.ok) {
            throw new Error(`GitHub returned ${response.status}`);
        }

        const repos = await response.json();

        const projects = repos
            .filter(repo => !repo.fork)
            .slice(0, PROJECT_LIMIT);

        if (!projects.length) {
            throw new Error("No public repositories found.");
        }

        projectsGrid.innerHTML = projects
            .map(repo => createProject(repo))
            .join("");

    } catch (error) {
        console.error(error);

        projectsGrid.innerHTML = `
            <div class="loading">
                Couldn't load GitHub projects.
                <a
                    href="https://github.com/${GITHUB_USER}"
                    target="_blank"
                    rel="noopener"
                    style="color: var(--blue-light)"
                >
                    View GitHub →
                </a>
            </div>
        `;
    }
}


function createProject(repo) {
    const description =
        repo.description ||
        "No description yet. Probably doing something interesting.";

    const language =
        repo.language ||
        "Various";

    return `
        <a
            class="project"
            href="${repo.html_url}"
            target="_blank"
            rel="noopener"
        >

            <div class="project-name">
                ${escapeHtml(repo.name)}
            </div>

            <p class="project-description">
                ${escapeHtml(description)}
            </p>

            <div class="project-meta">

                <span class="language">
                    <span class="language-dot"></span>
                    ${escapeHtml(language)}
                </span>

                <span>
                    ★ ${repo.stargazers_count}
                </span>

                <span>
                    ${repo.forks_count} forks
                </span>

            </div>

            <span class="project-arrow">
                ↗
            </span>

        </a>
    `;
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


document.getElementById("year").textContent =
    new Date().getFullYear();

loadProjects();
