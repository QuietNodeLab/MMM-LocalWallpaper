# Upstream-derived module

Preserve upstream copyright and MIT attribution. Use synthetic data/assets only.
Do not publish, create remote repositories, submit upstream PRs or deploy
without explicit authorization. Never change a production device. Keep personal
names, source-account references, deployment paths and private histories out of
artifacts. Run npm test with Node 24; browser tests use a disposable MagicMirror
runtime.

## Shared Estrella project workflow and handoff

Follow the [Estrella Project Development Standard](https://github.com/QuietNodeLab/estrella-project-standards/blob/main/PROJECT_STANDARD.md) for read-only discovery, minimal tested changes, rollback planning, verified deployment status, and project records. Preserve all repository-specific rules here; the shared standard supplements rather than overrides stricter safety, privacy, or authorization requirements. If the private standards repository is inaccessible, follow local rules and ask rather than guess.

At the end of each task (including partial or blocked work), output a concise **ESTRELLA PROJECT HANDOFF REPORT** in **one fenced Markdown code block** as the last response content. Include PROJECT, TASK, STATUS, SUMMARY, CHANGES, GIT (branch/commit/PR), TESTING (actual results), DEPLOYMENT (verified vs not deployed), PRESERVED, ISSUES, NEXT STEP, and APPROVAL NEEDED. Make it copyable into another ChatGPT/Codex chat. Never include secrets or imply unverified work succeeded.
