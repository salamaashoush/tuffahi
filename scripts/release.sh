#!/usr/bin/env bash
# Tuffahi release helper.
#
# Default (recommended): bump version, push tag → GitHub Actions builds and
# publishes installers for Linux/macOS/Windows to the GitHub Release.
#
#   scripts/release.sh patch        # 0.1.0 -> 0.1.1
#   scripts/release.sh minor        # 0.1.0 -> 0.2.0
#   scripts/release.sh major        # 0.1.0 -> 1.0.0
#   scripts/release.sh 1.2.3        # explicit version
#
# Local single-OS release (no CI; builds only THIS machine's installers and
# uploads them to the release — useful for quick tests):
#
#   scripts/release.sh patch --local
#
set -euo pipefail

BUMP="${1:-}"
MODE="${2:-ci}"
BRANCH_MAIN="main"

die() { echo "✖ $*" >&2; exit 1; }
info() { echo "→ $*"; }

[ -n "$BUMP" ] || die "Usage: scripts/release.sh <patch|minor|major|x.y.z> [--local]"

# ── Preflight ──────────────────────────────────────────────────────────────
command -v gh >/dev/null || die "gh CLI not installed"
gh auth status >/dev/null 2>&1 || die "gh not authenticated (run: gh auth login)"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "$BRANCH_MAIN" ] || die "Release from '$BRANCH_MAIN', not '$BRANCH'"

[ -z "$(git status --porcelain)" ] || die "Working tree not clean — commit or stash first"

git fetch --quiet origin "$BRANCH_MAIN"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH_MAIN")" ] \
  || die "Local $BRANCH_MAIN is not in sync with origin — pull/push first"

# ── Version bump (creates commit + vX.Y.Z tag) ─────────────────────────────
info "Bumping version ($BUMP)…"
NEW_VERSION="$(npm version "$BUMP" -m 'chore(release): v%s')"
info "New version: $NEW_VERSION"

# ── Publish ────────────────────────────────────────────────────────────────
if [ "$MODE" = "--local" ]; then
  info "Local build + publish (this OS only)…"
  bun install --frozen-lockfile
  node node_modules/electron/install.js   # Castlabs Electron binary (bun skips postinstall)
  bun run build
  GH_TOKEN="$(gh auth token)" bunx electron-builder --publish always
  git push origin "$BRANCH_MAIN" --follow-tags
  info "Done. Release: https://github.com/salamaashoush/tuffahi/releases/tag/$NEW_VERSION"
else
  info "Pushing tag — GitHub Actions will build & publish all platforms…"
  git push origin "$BRANCH_MAIN" --follow-tags
  info "Watch: https://github.com/salamaashoush/tuffahi/actions"
  info "Release: https://github.com/salamaashoush/tuffahi/releases/tag/$NEW_VERSION"
fi
