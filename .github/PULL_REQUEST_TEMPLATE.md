<!--
Thanks for your contribution! Please fill in every section of this template.
PRs that leave sections blank may be closed without review.

See CONTRIBUTING.md for the full pull request process:
https://github.com/ummugulsunn/stremio-dual-subtitles/blob/master/CONTRIBUTING.md
-->

## Summary

<!-- One or two sentences explaining what this PR does and why. -->

## Related Issue

<!-- Link the issue this PR closes, e.g. `Closes #123`. If there is no issue, briefly justify the change here. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Documentation only (README / ARCHITECTURE / CHANGELOG / comments)
- [ ] Tooling / CI / dependency update

## How was this tested?

<!--
Describe what you did to verify the change. Include commands you ran,
languages / IMDb IDs you played, and Stremio clients you checked.
At minimum: `npm test` should pass.
-->

- [ ] `npm test` passes locally
- [ ] `npm start` boots and `/configure` loads
- [ ] Manually tested in at least one Stremio client

## Screenshots (if UI change)

<!-- Drag and drop before/after screenshots here, or remove this section. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md).
- [ ] My commits follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `fix:`, `feat:`, `docs:`).
- [ ] I did not add `console.log` to production code; I used `debugServer` from `lib/debug.js` and wrapped user data in `sanitizeForLogging(...)`.
- [ ] I did not introduce hardcoded secrets, tokens, or private URLs. Anything sensitive reads from `process.env.*`.
- [ ] I updated relevant documentation (README / ARCHITECTURE / CHANGELOG) when behavior or configuration changed.
- [ ] I added or updated tests in `test.js` for the change where it made sense.
- [ ] I agree to follow this project's [Code of Conduct](../CODE_OF_CONDUCT.md).
