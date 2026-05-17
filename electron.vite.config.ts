import { resolve } from 'path';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

// Load .env at config time to generate the developer token at build time.
// Only the signed JWT is embedded — the private key never ships in the binary.
config();

function generateDeveloperToken(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;

  let privateKey = process.env.APPLE_PRIVATE_KEY ?? '';
  if (!privateKey && process.env.APPLE_PRIVATE_KEY_PATH) {
    try {
      privateKey = readFileSync(resolve(__dirname, process.env.APPLE_PRIVATE_KEY_PATH), 'utf-8');
    } catch {
      // Key file not found — token will be empty
    }
  }

  if (!teamId || !keyId || !privateKey) {
    const msg =
      '[build] Missing Apple credentials (APPLE_TEAM_ID / APPLE_KEY_ID / ' +
      'APPLE_PRIVATE_KEY[_PATH]) — the MusicKit developer token would be empty.';
    // Never ship a tokenless build: hard-fail in CI / production builds.
    // Local dev without creds still works (UI loads, playback won't auth).
    if (process.env.CI || process.env.NODE_ENV === 'production') {
      throw new Error(msg + ' Failing the build.');
    }
    console.warn(msg + ' (dev: continuing with empty token)');
    return '';
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 180 * 24 * 60 * 60; // 180 days

  return jwt.sign(
    { iss: teamId, iat: now, exp },
    privateKey,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: keyId },
    },
  );
}

const developerToken = generateDeveloperToken();

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APPLE_DEVELOPER_TOKEN__: JSON.stringify(developerToken),
    },
    build: {
      rollupOptions: {
        external: ['electron'],
        input: {
          index: resolve(__dirname, 'electron/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['electron'],
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [solid(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
  },
});
