# Architecture

This document describes how Stremio Dual Subtitles is put together so that
contributors can find their way around and make changes with confidence. If
you only want to use the addon, the [README](README.md) is the right place
to start. If you want to submit a change, pair this file with
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## High-Level Overview

Stremio Dual Subtitles is a small, self-contained
[Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) service
written in plain Node.js (CommonJS). It fetches subtitles from
OpenSubtitles for two languages, merges them line-by-line based on timing,
and returns a single SRT file that Stremio plays as one subtitle track.

```
+---------------------+        +-------------------------------+
|  Stremio client     |  --->  |  Vercel / self-hosted Node    |
|  (desktop/TV/web)   |  <---  |  Express + Addon SDK handler  |
+---------------------+        +-------------------------------+
                                        |       ^
                                        v       |
                                 +-------------------+
                                 |  OpenSubtitles    |
                                 |  public endpoints |
                                 +-------------------+
```

No database is required. No account is required. All configuration lives in
the URL path (see [URL Configuration](#url-configuration)).

---

## Runtime Components

| File                  | Responsibility                                                                 |
| --------------------- | ------------------------------------------------------------------------------ |
| `server.js`           | Express bootstrap, routing, rate limiting, static assets, SEO endpoints.       |
| `addon.js`            | Stremio Addon SDK handler, OpenSubtitles fetch, SRT parsing + merging.          |
| `encoding.js`         | Character-set detection (`chardet`) and conversion to UTF-8 (`iconv-lite`).    |
| `languages.js`        | 70+ language map, display names, code normalization.                           |
| `landingTemplate.js`  | HTML for `/configure` (the landing page and live preview).                     |
| `lib/debug.js`        | `debugServer` logger with `sanitizeForLogging` for safe request logging.       |
| `lib/analytics.js`    | Opt-in, anonymous usage counters behind `ANALYTICS_SECRET`.                    |
| `lib/templates.js`    | HTML for `/stats`, `/privacy`, 404/429/500 pages, and generic error pages.     |
| `public/`             | Static assets (logo, demo screenshot).                                         |
| `vercel.json`         | Vercel routing config (single serverless function fronting everything).        |

---

## Request Lifecycle

### 1. Configure (one-time, per user)

```
Browser  ->  GET /configure
              |
              v
          landingTemplate.js renders
              |
              v
          User picks primary + secondary language
              |
              v
          "Install to Stremio" builds the configured manifest URL
              |
              v
          stremio://127.0.0.1:7000/<config>/manifest.json
```

The configured URL encodes both languages in the path segment. No cookies,
no local storage, no accounts.

### 2. Subtitle Discovery (per play)

```
Stremio player
   |
   | GET /:config/subtitles/:type/:imdbId(.json)
   v
server.js
   |
   | validates :config and params, applies rate limit
   v
addon.js: subtitlesHandler
   |
   | asks OpenSubtitles for subtitles in each configured language
   v
returns an array of subtitle entries, each pointing at a dynamic /subs/... URL
```

### 3. Subtitle Delivery (per track selection)

```
Stremio player
   |
   | GET /subs/:type/:imdbId/:season/:episode/:mainLang/:transLang/:mainSubId/:transSubId.srt
   v
server.js -> addon.js: generateDualSrt
   |
   | fetch primary + secondary SRT/VTT from OpenSubtitles
   v
encoding.js detects charset and decodes to UTF-8
   |
   v
parseSrt / parseVtt produces cue arrays
   |
   v
merge step pairs cues whose timestamps overlap (within tolerance)
   |
   v
renderSrt emits a single SRT with primary as the top line (bold) and
secondary prefixed with a marker + italic/muted styling when supported
   |
   v
response sent with Cache-Control for intermediary caches
```

### 4. Merging Algorithm

Cues from the two source tracks are paired like this:

1. Walk the primary cues in time order.
2. For each primary cue `P`, find all secondary cues `S` whose window
   overlaps `P` (with a small tolerance for sub-second drift).
3. Emit one output cue spanning `P.start..P.end`, with:
   - Line 1: `P.text` wrapped in `<b>`.
   - Line 2: a visible marker (`›`) plus the overlapping `S.text`,
     wrapped in `<i>` and a muted `<font color>` that players which render
     SRT-with-HTML pick up.
4. Secondary cues that never overlap a primary are emitted on their own as
   secondary-only cues, so meaningful translations are never dropped.

Edge cases handled:

- Non-numeric or missing cue IDs in VTT.
- Mixed BOMs (UTF-8, UTF-16 LE, UTF-16 BE).
- Legacy single-byte code pages (see `encoding.js`).
- Cues with zero or negative duration (skipped).
- Players that do not render HTML in SRT (styling degrades to plain text).

---

## URL Configuration

Configuration is carried in the URL path so that no state is needed on the
server:

```
/<PrimaryName [primaryCode]|SecondaryName [secondaryCode]>/manifest.json
```

Example:

```
/English%20%5Beng%5D%7CTurkish%20%5Btur%5D/manifest.json
```

The handler decodes this path segment into a `{ mainLang, transLang }` pair.
All inputs are validated against `languages.js` before they are forwarded to
any upstream service.

---

## Security Boundaries

- **No secrets in source.** Every secret reads from `process.env.*`. See
  [`.env.example`](.env.example) for the full list.
- **Input validation.** Language codes, IMDb IDs, season/episode numbers,
  and subtitle IDs are validated before being used to construct an
  upstream URL.
- **Sanitized logging.** `lib/debug.js::sanitizeForLogging` redacts
  `authorization`, `token`, `cookie`, `api_key`, etc. Never pass raw
  request or response bodies to `console.log`; use `debugServer.log(...)`.
- **Rate limiting.** `server.js` applies a per-IP token bucket (default
  60 req/min, `RATE_LIMIT_MAX`) and returns HTTP 429 when exceeded.
- **CORS.** The addon endpoints are intentionally permissive (so Stremio
  clients can reach them from any origin), but admin pages (`/stats`) are
  gated behind `ANALYTICS_SECRET`.
- **No stack traces to clients.** API errors return a stable JSON shape
  (`{ "error": "..." }`). HTML errors use `generateErrorHTML()` from
  `lib/templates.js`. Stacks are logged server-side only.

See [SECURITY.md](SECURITY.md) for the full disclosure policy.

---

## Deployment

### Vercel (production)

- A single Vercel serverless function serves every route via `vercel.json`.
- Function timeout is capped at 10 s on the hobby tier, so every upstream
  call uses `fetchWithRetry` with an explicit `timeout`.
- In-memory caches inside the function do not survive cold starts. Treat
  them as best-effort only.
- The `master` branch auto-deploys. Preview deployments are created for
  every PR.

### Self-hosted (Node)

- Run `npm start` or `node server.js` on Node 18.x or newer (20.x LTS
  recommended).
- Put it behind a reverse proxy (Caddy, nginx, Cloudflare Tunnel) to add
  HTTPS and an additional rate-limit layer.
- Set `EXTERNAL_URL` so the addon can advertise a reachable URL for
  network devices (TVs, phones).

---

## Testing

- `npm test` runs `test.js` with Node's built-in `assert` module. No
  framework dependency.
- CI (`.github/workflows/ci.yml`) runs the same suite against Node 18.x
  and 20.x on every push and pull request.
- Prefer black-box tests against the exported `_test` surface in
  `addon.js`. Internal helpers may change without notice.

---

## Extending the Addon

Common extension points:

- **Add a language.** Edit `languages.js`, then add aliases, CJK detection,
  and a preview string as described in [CONTRIBUTING.md][contrib].
- **Support a new subtitle format.** Add a parser alongside `parseSrt` /
  `parseVtt` in `addon.js`, then wire it into `generateDualSrt`.
- **Change merge behavior.** The merge step lives in `addon.js`. Add
  tests in `test.js` covering the new behavior before touching it.
- **Add a client-facing page.** Put HTML in `lib/templates.js` and route
  it from `server.js`. Keep inline styles only; do not introduce a build
  step.

[contrib]: CONTRIBUTING.md#adding-a-new-language
