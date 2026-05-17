#!/usr/bin/env bash
# Tuffahi Linux installer.
#
#   curl -fsSL https://raw.githubusercontent.com/salamaashoush/tuffahi/main/scripts/install.sh | bash
#
# Picks the right artifact from the latest GitHub release for your distro:
#   pacman (Arch)  -> .pacman
#   apt/dpkg (Deb) -> .deb
#   anything else  -> .AppImage into ~/.local/bin + a .desktop entry
set -euo pipefail

REPO="salamaashoush/tuffahi"
API="https://api.github.com/repos/${REPO}/releases/latest"

die() { echo "✖ $*" >&2; exit 1; }
info() { echo "→ $*"; }

command -v curl >/dev/null || die "curl is required"

ARCH="$(uname -m)"
[ "$ARCH" = "x86_64" ] || die "Only x86_64 builds are published (got: $ARCH)"

info "Fetching latest release metadata…"
JSON="$(curl -fsSL "$API")" || die "Could not reach GitHub API"

# Extract the first asset download URL ending in the given extension.
asset_url() {
  echo "$JSON" \
    | grep -oE '"browser_download_url": *"[^"]+"' \
    | sed -E 's/.*"(https[^"]+)"/\1/' \
    | grep -E "\\.$1\$" \
    | head -n1
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if command -v pacman >/dev/null 2>&1; then
  URL="$(asset_url pacman)"; [ -n "$URL" ] || die "No .pacman asset in latest release"
  info "Arch detected — downloading $(basename "$URL")"
  curl -fSL "$URL" -o "$TMP/tuffahi.pacman"
  sudo pacman -U --noconfirm "$TMP/tuffahi.pacman"
  info "Installed. Launch: tuffahi"

elif command -v apt-get >/dev/null 2>&1 || command -v dpkg >/dev/null 2>&1; then
  URL="$(asset_url deb)"; [ -n "$URL" ] || die "No .deb asset in latest release"
  info "Debian/Ubuntu detected — downloading $(basename "$URL")"
  curl -fSL "$URL" -o "$TMP/tuffahi.deb"
  sudo apt-get install -y "$TMP/tuffahi.deb" \
    || { sudo dpkg -i "$TMP/tuffahi.deb"; sudo apt-get -f install -y; }
  info "Installed. Launch: tuffahi"

else
  URL="$(asset_url AppImage)"; [ -n "$URL" ] || die "No .AppImage asset in latest release"
  info "Generic Linux — installing AppImage to ~/.local/bin"
  mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
  DEST="$HOME/.local/bin/tuffahi"
  curl -fSL "$URL" -o "$DEST"
  chmod +x "$DEST"
  cat > "$HOME/.local/share/applications/tuffahi.desktop" <<EOF
[Desktop Entry]
Name=Tuffahi
Exec=$DEST
Type=Application
Categories=Audio;AudioVideo;Music;
Terminal=false
EOF
  info "Installed to $DEST"
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) : ;;
    *) echo "  Note: add ~/.local/bin to PATH, or run $DEST directly." ;;
  esac
fi

info "Done."
