# Security Policy

Thank you for helping keep Stremio Dual Subtitles and its users safe.
This document explains which versions receive security updates, how to
report a vulnerability, and what we do with that report.

## Supported Versions

Only the latest `master` branch and the most recent published release
receive security patches. Older versions are not maintained.

| Version | Supported          |
| ------- | ------------------ |
| `master`  | Yes              |
| Latest `v1.x`  | Yes         |
| Older `v1.x`   | No          |
| `< 1.0.0` | No               |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

1. Use GitHub's [private vulnerability reporting](https://github.com/ummugulsunn/stremio-dual-subtitles/security/advisories/new)
   on this repository.
2. Or, if that's not available, email the maintainer via the contact
   method listed on the GitHub profile page.
3. Include as much of the following as you can:
   - A clear description of the issue and its impact.
   - Steps to reproduce (ideally a minimal payload, URL, or script).
   - The commit hash or deployed URL you tested against.
   - Whether you believe the vulnerability is already being exploited.

You will get an acknowledgement within **72 hours** and a substantive
response within **7 days**. We aim to ship a fix within **30 days** for
critical issues. You will be credited in the release notes unless you
ask us not to be.

## Scope

The following are in scope:

- The code in this repository (`addon.js`, `server.js`, `lib/*`,
  `encoding.js`, `languages.js`, `landingTemplate.js`).
- The `/api/*`, `/subs/*`, `/subtitles/*`, `/stats`, and `/health`
  endpoints on the official deployment
  (`stremio-dual-subtitles.vercel.app`).
- Any official deployment that is linked from this repository's README.

The following are **out of scope**:

- Vulnerabilities in third-party services we only consume
  (OpenSubtitles, Stremio clients, Vercel platform). Report those to
  their vendors.
- Denial-of-service reports that rely solely on unusually high traffic.
  The service is rate-limited; please do not run volumetric tests.
- Self-hosted instances running outdated code. Update first, then
  report.
- Social engineering or physical access attacks.

## Hardening Guidelines for Self-Hosters

If you run your own instance, please:

- Keep Node.js on a supported LTS (18.x or 20.x+).
- Run `npm audit` regularly and update dependencies.
- Set `ANALYTICS_SECRET` to a strong random value; without it, the
  `/stats` dashboard is public.
- Run behind HTTPS (a reverse proxy like Caddy, nginx, or Cloudflare
  tunnel makes this painless).
- Never set `DEBUG_MODE=true` in a publicly reachable deployment. Debug
  logs are sanitized but may still leak request metadata.
- Never commit `.env` — it's in `.gitignore` for a reason.
- Do not expose the service directly to the internet from a development
  machine without a firewall.

## Dependency Policy

- We pin direct dependencies in `package.json` and track the exact
  resolved tree in `package-lock.json`.
- Dependabot opens weekly PRs for npm and GitHub Actions updates.
- Security advisories flagged by `npm audit` at `high` or `critical`
  severity are patched out-of-band (not on the regular release cadence).

## Secret Handling

- All secrets are read from `process.env.*`. See
  [`.env.example`](.env.example) for the complete list of supported
  variables.
- `lib/debug.js` automatically redacts `authorization`, `token`,
  `cookie`, `api_key`, and similar keys via `sanitizeForLogging(...)`.
  Use it everywhere you log request or response data.
- `chore` commits should never introduce hardcoded tokens, URLs with
  embedded credentials, or API keys. The CI workflow greps for common
  secret patterns and will fail the build if it finds any.

Thank you again for disclosing responsibly.
