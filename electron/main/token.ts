// The developer token is generated at build time from .env credentials.
// Only the signed JWT is embedded — the private key never ships in the binary.
declare const __APPLE_DEVELOPER_TOKEN__: string;

const DEVELOPER_TOKEN = __APPLE_DEVELOPER_TOKEN__;

export function isMusicKitConfigured(): boolean {
  return !!DEVELOPER_TOKEN;
}

export function getDeveloperToken(): string {
  if (!DEVELOPER_TOKEN) {
    throw new Error('Developer token not configured — rebuild with Apple credentials in .env');
  }
  return DEVELOPER_TOKEN;
}

export function refreshDeveloperToken(): string {
  // Token is baked in at build time — rebuild the app to get a new one
  return getDeveloperToken();
}
