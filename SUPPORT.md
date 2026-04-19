# Support

Thanks for using Stremio Dual Subtitles! This page lists the fastest way to
get help with different kinds of questions.

## Check the Docs First

A lot of common questions are already answered in:

- [README](README.md) — installation, configuration, usage.
- [FAQ](README.md#faq) — the most frequent questions.
- [Troubleshooting](README.md#troubleshooting) — subtitle not showing,
  garbled text, connection issues, etc.
- [ARCHITECTURE](ARCHITECTURE.md) — how requests flow through the service.

## Where to Ask

| Topic | Where to go |
| ----- | ----------- |
| Questions about installing or using the addon | [GitHub Discussions](https://github.com/ummugulsunn/stremio-dual-subtitles/discussions) |
| Reporting a reproducible bug | [Open an issue](https://github.com/ummugulsunn/stremio-dual-subtitles/issues/new/choose) (use the **Bug report** template) |
| Requesting a new feature | [Open an issue](https://github.com/ummugulsunn/stremio-dual-subtitles/issues/new/choose) (use the **Feature request** template) |
| Adding a new language | See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-language) |
| Reporting a security vulnerability | [Private vulnerability report](https://github.com/ummugulsunn/stremio-dual-subtitles/security/advisories/new) — see [SECURITY.md](SECURITY.md) |

Please **do not** open an issue to ask a question. Issues are reserved for
actionable bugs and feature requests so they stay easy to triage.

## Before You File a Bug

Please take 30 seconds to check:

1. The backend is up: visit
   [`/health`](https://stremio-dual-subtitles.vercel.app/health). It should
   return `{"status":"ok", ...}`.
2. You are on the latest version. Reinstall the addon from the
   [configure page](https://stremio-dual-subtitles.vercel.app/configure)
   if in doubt.
3. Your chosen content has subtitles for **both** languages on
   OpenSubtitles. If only one language is available, no dual track will
   be produced.
4. Your Stremio client is restarted after (re)installing the addon.

Then file the bug with the information requested in the issue template:
Stremio client + version, operating system, primary/secondary languages,
IMDb ID of the content, what you expected, and what actually happened.

## Response Times

This is a community-maintained hobby project. Maintainers aim to respond
within:

- Security reports: within 72 hours — see [SECURITY.md](SECURITY.md).
- Bug reports and feature requests: within a week.
- Discussions and questions: best-effort; the community also helps out.

Please be patient — and thanks again for using the addon!

## Commercial Support

There is no paid support offering. If you need a heavily customized
deployment, fork the repository (MIT licensed) and adapt it to your needs.
