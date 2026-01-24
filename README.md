# Apple Music Client

A cross-platform Apple Music client built with **Tauri v2**, **SolidJS**, and **MusicKit JS**.

## Features

- Browse Apple Music catalog (Top Charts, Featured Playlists)
- Search for songs, albums, and artists
- Access your Apple Music library (songs, albums, playlists)
- Full playback controls with progress bar and volume
- Synced lyrics display
- System tray integration with quick controls
- Keyboard shortcuts for media control
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/v2/start/prerequisites/)

### Platform-specific requirements

#### Linux
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev
```

#### macOS
Xcode Command Line Tools required.

#### Windows
WebView2 runtime (usually pre-installed on Windows 10/11).

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd apple-music-client
```

2. Install dependencies:
```bash
npm install
```

3. Configure MusicKit credentials:

Copy `.env.example` to `.env` and fill in your Apple Developer credentials:
```bash
cp .env.example .env
```

You need:
- **Team ID**: Found in Apple Developer Portal under Membership
- **Key ID**: Generated when creating a MusicKit key
- **Private Key (.p8)**: Downloaded when creating the MusicKit key

See [Apple's MusicKit documentation](https://developer.apple.com/documentation/applemusicapi/getting_keys_and_creating_tokens) for details.

## Development

Run the app in development mode:
```bash
npm run tauri dev
```

This starts both the Vite dev server and the Tauri application with hot-reload enabled.

## Building

Build the application for your current platform:
```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
apple-music-client/
├── src/                      # Frontend (SolidJS)
│   ├── components/           # UI Components
│   │   ├── Player/          # Playback controls
│   │   ├── Library/         # User library views
│   │   ├── Browse/          # Search & discovery
│   │   ├── Lyrics/          # Synced lyrics
│   │   └── Sidebar/         # Navigation
│   ├── stores/              # State management
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # MusicKit utilities
│   └── styles/              # Global CSS
├── src-tauri/               # Backend (Rust/Tauri)
│   ├── src/
│   │   ├── commands/        # Tauri commands
│   │   └── musickit/        # JWT token generation
│   └── capabilities/        # Permissions
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `Ctrl/Cmd + →` | Next track |
| `Ctrl/Cmd + ←` | Previous track |
| `Ctrl/Cmd + ↑` | Volume up |
| `Ctrl/Cmd + ↓` | Volume down |
| `Ctrl/Cmd + M` | Mute/Unmute |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Shell                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   WebView (SolidJS)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │  │
│  │  │   Player    │  │   Library   │  │    Search    │   │  │
│  │  │  Controls   │  │    View     │  │    Browse    │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │  │
│  │                         │                              │  │
│  │              ┌──────────┴──────────┐                   │  │
│  │              │    MusicKit JS      │                   │  │
│  │              │  (Audio Playback)   │                   │  │
│  │              └─────────────────────┘                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────┴─────────────────────────────┐  │
│  │                    Rust Backend                        │  │
│  │  • Developer Token Generation (JWT/ES256)              │  │
│  │  • Secure key storage                                  │  │
│  │  • System tray & media keys                            │  │
│  │  • Window management                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT
