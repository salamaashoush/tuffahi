# Releasing Tuffahi

## TL;DR

```bash
bun run release patch     # or: minor | major | 1.2.3
```

## Linux one-line install (end users)

```bash
curl -fsSL https://raw.githubusercontent.com/salamaashoush/tuffahi/main/scripts/install.sh | bash
```

Auto-picks `.pacman` (Arch), `.deb` (Debian/Ubuntu), else `.AppImage`
from the latest release. Linux artifacts: AppImage, deb, **pacman**.

Bumps the version, commits, tags `vX.Y.Z`, pushes. The **Release** GitHub
Actions workflow then builds installers on Linux and Windows and
publishes them to the GitHub Release for that tag.

## Flow (tag-driven CI: Linux + Windows)

1. `scripts/release.sh` preflight: clean tree, on `main`, in sync with
   `origin`, `gh` authenticated.
2. `npm version` → version bump commit + `vX.Y.Z` tag.
3. Tag push triggers `.github/workflows/release.yml`.
4. Matrix runners (`ubuntu`/`windows`) each:
   - `bun install --frozen-lockfile`
   - `node node_modules/electron/install.js` — fetches the Castlabs
     (Widevine) Electron binary. Required because Bun skips lifecycle
     scripts.
   - `bun run build` (renderer/main/preload; bakes the MusicKit token)
   - `bunx electron-builder --publish always` → uploads native installers
     to the tag's GitHub Release.

Artifacts: Linux `AppImage` + `.deb` + `.pacman`, Windows NSIS `.exe`.
Names: `Tuffahi-<version>-<os>-<arch>.<ext>`.

macOS is intentionally not built — Apple ships a native Apple Music app.

## Local single-OS release (testing)

```bash
bun run release patch --local
```

Builds only the current machine's installers and uploads them to the
release. Use CI for real cross-platform releases.

## Required GitHub repo secrets

| Secret | Purpose |
|---|---|
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Bake MusicKit developer token at build time (`.p8` contents in `APPLE_PRIVATE_KEY`). Without these, builds ship with no token and playback won't authorize. |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | Windows code signing (optional). |

`GITHUB_TOKEN` is provided automatically. Signing secrets are optional —
electron-builder skips signing if absent (unsigned builds still produced,
but OSes will warn users).

## Best practices applied

- **Tag-driven** releases — the tag is the single source of truth; no
  manual artifact juggling.
- **Native runner per OS** — Windows NSIS/signing can't be done from Linux.
- `electronDist` pinned to the bundled Castlabs build — installers ship the
  Widevine-enabled Electron, never a re-downloaded upstream one.
- `npmRebuild: false` — all deps are pure JS; avoids native-module rebuild
  flakiness under Bun.
- `publish: github` writes `latest*.yml`, so wiring `electron-updater`
  later requires no repackaging.

## Auto-update (future)

`publish.provider: github` already emits the `latest-*.yml` manifests.
To enable in-app updates: add `electron-updater`, call
`autoUpdater.checkForUpdatesAndNotify()` in the main process. No release
config changes needed.
