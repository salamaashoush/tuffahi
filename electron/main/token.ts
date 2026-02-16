import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

function getConfig() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  const privateKeyContent = process.env.APPLE_PRIVATE_KEY;

  return { teamId, keyId, privateKeyPath, privateKeyContent };
}

function getPrivateKey(): string {
  const { privateKeyContent, privateKeyPath } = getConfig();

  if (privateKeyContent) {
    return privateKeyContent;
  }

  if (privateKeyPath) {
    // Try as-is
    try {
      return readFileSync(privateKeyPath, 'utf-8');
    } catch {
      // Try relative to project root
      const fromRoot = resolve(process.cwd(), privateKeyPath);
      return readFileSync(fromRoot, 'utf-8');
    }
  }

  throw new Error('No private key configured (APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH)');
}

export function isMusicKitConfigured(): boolean {
  const { teamId, keyId, privateKeyPath, privateKeyContent } = getConfig();
  return !!(teamId && keyId && (privateKeyPath || privateKeyContent));
}

export function getDeveloperToken(): string {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  const { teamId, keyId } = getConfig();
  if (!teamId || !keyId) {
    throw new Error('APPLE_TEAM_ID and APPLE_KEY_ID must be set');
  }

  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 180 * 24 * 60 * 60; // 180 days

  const token = jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp,
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    }
  );

  cachedToken = token;
  tokenExpiry = exp * 1000;
  return token;
}

export function refreshDeveloperToken(): string {
  cachedToken = null;
  tokenExpiry = 0;
  return getDeveloperToken();
}
