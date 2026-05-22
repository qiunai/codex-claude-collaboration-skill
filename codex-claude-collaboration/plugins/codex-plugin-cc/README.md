# Codex Plugin CC Thread Resume Patch

This directory carries the companion plugin update required by
`codex-claude-collaboration`.

The upstream Codex plugin already contains the lower-level app-server
`thread/resume` path. The missing piece is the Claude broker command surface:
`codex-companion task --resume-thread <thread-id>`.

The patch in this directory adds that command option so Claude can route a
follow-up implementation or rework request to the exact Codex thread that
belongs to the active collaboration. This prevents `--resume-last` from
selecting another active Claude/Codex task when several sessions are running.

Upstream PR:

<https://github.com/openai/codex-plugin-cc/pull/344>

## Files

- `resume-thread-runtime.patch`: runtime patch for an installed
  `codex-plugin-cc` plugin root. It updates `scripts/codex-companion.mjs` and
  `CHANGELOG.md`.
- `../../scripts/install-codex-plugin-cc-resume-thread.mjs`: helper that finds
  installed Claude Code Codex plugin roots, applies the runtime patch, and
  verifies that the command advertises `--resume-thread <thread-id>`.

## Manual Patch

From an installed plugin root that contains `scripts/codex-companion.mjs`:

```bash
git apply /path/to/codex-claude-collaboration/plugins/codex-plugin-cc/resume-thread-runtime.patch
node --check scripts/codex-companion.mjs
node /path/to/codex-claude-collaboration/scripts/verify-codex-companion.mjs \
  --command "$(pwd)/scripts/codex-companion.mjs"
```
