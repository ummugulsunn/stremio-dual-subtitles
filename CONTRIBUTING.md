# Contributing to Stremio Dual Subtitles

First off, thank you for considering a contribution! This project exists to help
language learners watch content with two subtitle languages at the same time,
and every bug report, feature idea, translation, or pull request helps.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md)
and our [Security Policy](SECURITY.md).

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Asking Questions](#asking-questions)
- [Local Development](#local-development)
- [Project Layout](#project-layout)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding a New Language](#adding-a-new-language)
- [Release Process](#release-process)

---

## Ways to Contribute

You don't have to write code to help. Useful contributions include:

- Reporting reproducible bugs
- Improving or translating the landing page copy
- Adding tests for edge cases you've hit
- Improving documentation (README, ARCHITECTURE, this file)
- Triaging open issues and reproducing the reporter's problem
- Fixing bugs and shipping small, focused features

## Reporting Bugs

Please use the **Bug report** issue template and include:

1. Stremio client + version (desktop, web, Android, Android TV)
2. Operating system
3. Primary and secondary language you configured
4. IMDb ID of the movie or series episode
5. What you expected to happen
6. What actually happened, with screenshots if possible

Before filing, please verify the backend is up: open
<https://stremio-dual-subtitles.vercel.app/health> — it should return
`{"status":"ok", ...}`. If it doesn't, mention that in the issue.

## Requesting Features

Use the **Feature request** issue template. Describe:

1. The problem you're trying to solve
2. Why the current behavior doesn't solve it
3. Your proposed solution (optional — "I don't know the best fix" is fine)

## Asking Questions

Open a GitHub Discussion rather than an issue. Issues are reserved for
actionable bugs and feature requests.

---

## Local Development

**Prerequisites:**

- Node.js 18.x or newer (20.x recommended)
- npm 9 or newer

**Setup:**

```bash
git clone https://github.com/ummugulsunn/stremio-dual-subtitles.git
cd stremio-dual-subtitles
npm install
cp .env.example .env   # optional, edit values if you want
npm run dev            # auto-restarts on file changes
```

Then open <http://localhost:7000/configure>.

To install your local build into a Stremio desktop client, click
**Install to Stremio** on the configure page or paste this URL in Stremio:

```
http://127.0.0.1:7000/<your-config>/manifest.json
```

### Useful Commands

| Command         | What it does                                  |
|-----------------|-----------------------------------------------|
| `npm start`     | Start the server with Node                    |
| `npm run dev`   | Start with `node --watch` for auto-reload     |
| `npm test`      | Run the unit test suite                       |
| `npm run lint`  | Run ESLint (warnings only, never blocks CI)   |

---

## Project Layout

```
.
├── addon.js              # Stremio Addon SDK handler + subtitle merge pipeline
├── server.js             # Express server, rate limiting, routing, CORS
├── encoding.js           # Subtitle character-set detection and decoding
├── languages.js          # 70+ language codes, aliases, display names
├── landingTemplate.js    # HTML for the /configure landing page
├── lib/
│   ├── debug.js          # debugServer / sanitizeForLogging (never use raw console.log)
│   ├── analytics.js      # Anonymous usage metrics (opt-in only)
│   └── templates.js      # HTML for /stats, /privacy, error pages
├── public/               # Static assets (logo, demo screenshot)
├── test.js               # Node's built-in assert-based test suite
├── .github/              # Issue templates, PR template, CI, dependabot
└── vercel.json           # Vercel deployment config
```

A deeper walk-through lives in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Coding Guidelines

- **Language:** Plain Node.js (CommonJS). No TypeScript today — keep it simple.
- **Indentation:** 2 spaces, no tabs.
- **Quotes:** single quotes for JS strings, double quotes inside JSX/HTML only.
- **Semicolons:** required.
- **Line length:** soft 100 characters.
- **No `console.log` in production code.** Use `debugServer` from
  `./lib/debug.js`. It's a no-op when `DEBUG_MODE !== 'true'`.
- **Sanitize logs.** Wrap anything that could contain user data with
  `sanitizeForLogging(...)`.
- **Never commit secrets.** Everything sensitive goes through
  `process.env.*`; see [`.env.example`](.env.example) for the list.
- **Validate inputs** on any new endpoint before using them in downstream
  calls (URL params, query strings, body fields).
- **Keep serverless timeouts in mind.** Vercel's hobby tier caps functions at
  10 seconds. If you add an upstream call, budget accordingly and use
  `fetchWithRetry` with a sensible `timeout`.

### Error Handling

- User-facing HTML errors go through `generateErrorHTML()` in
  `lib/templates.js`.
- API errors must return JSON with a stable shape: `{ error: "<message>" }`.
- Never leak stack traces to clients. Log them server-side with
  `debugServer.error(...)`.

---

## Testing

We use Node's built-in `assert` module, run directly via `node test.js`. No
framework dependency.

- Add a test for every bug you fix.
- Group related tests with a `console.log('\n--- section ---')` header.
- Prefer black-box tests against the exported `_test` surface in `addon.js`
  over reaching into private internals.

Run everything with:

```bash
npm test
```

CI runs the same command against Node 18 and Node 20. A failing test blocks
merges to `master`.

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). Common
prefixes:

| Prefix     | Use for                                                   |
|------------|-----------------------------------------------------------|
| `feat:`    | A new user-visible feature                                |
| `fix:`     | A bug fix                                                 |
| `docs:`    | Documentation-only changes                                |
| `refactor:`| Code change that neither fixes a bug nor adds a feature   |
| `perf:`    | Performance improvement                                   |
| `test:`    | Adding or fixing tests                                    |
| `chore:`   | Tooling, CI, dependencies                                 |
| `style:`   | Whitespace, formatting, missing semicolons                |

Example:

```
fix: handle VTT cues without numeric IDs in parseSrt

Some OpenSubtitles VTTs omit the numeric cue line before the
timestamp. The parser was swallowing the first line of text as
if it were a cue ID. Detect the case and fall through to text.

Closes #123
```

---

## Pull Request Process

1. Fork the repository and create your branch from `master`.
2. If you're fixing an issue, reference it in the PR description (`Closes #N`).
3. Run `npm test` locally and make sure everything passes.
4. Make sure the landing page still loads: `npm start` → open
   <http://localhost:7000/configure>.
5. Update documentation (README, ARCHITECTURE, CHANGELOG) when behavior or
   configuration changes.
6. Open the PR using the template and fill in every section.
7. The CI workflow must be green before a maintainer reviews.

Maintainers aim to respond within a week. Please be patient; this is a
hobby project.

---

## Adding a New Language

Languages live in `languages.js`. To add one:

1. Add the ISO 639-2 code and display name to `languageMap`.
2. Add any aliases (ISO 639-1, OpenSubtitles-specific codes) to
   `getLanguageAliases` in `encoding.js`.
3. If the language uses CJK scripts (no spaces between words) add it to
   `isCjkLanguage`.
4. If it has a non-UTF-8 subtitle encoding that's common in the wild, add the
   code-page mapping in `normalizeLanguageCode` so detection can prioritize
   it.
5. Add at least one test in `test.js` covering the new entry.
6. Add a preview translation in `landingTemplate.js` so the live preview
   shows something familiar to native speakers.

---

## Release Process

Maintainers only:

1. Make sure `master` is green on CI.
2. Bump `version` in `package.json` and the `ADDON_VERSION` constant in
   `addon.js`.
3. Update `CHANGELOG.md` with the new section.
4. Commit with `chore: release vX.Y.Z`.
5. Tag with `git tag vX.Y.Z && git push --tags`.
6. Vercel auto-deploys from `master`.

---

Thanks again! If you get stuck, open a Discussion and we'll help.
