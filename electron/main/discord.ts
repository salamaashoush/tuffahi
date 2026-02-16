// Discord Rich Presence Integration
// Uses discord-rpc npm package

let client: any = null;
let isConnected = false;

// Discord Application ID - Create your own at https://discord.com/developers/applications
const DISCORD_APP_ID = '0000000000000000000';

export async function discordConnect(): Promise<void> {
  try {
    // Dynamic import to avoid crash if discord-rpc not available
    const { Client } = await import('discord-rpc');
    client = new Client({ transport: 'ipc' });
    await client.login({ clientId: DISCORD_APP_ID });
    isConnected = true;
    console.log('[TUFFAHI] Connected to Discord');
  } catch (error) {
    isConnected = false;
    throw new Error(`Failed to connect to Discord: ${error}`);
  }
}

export async function discordDisconnect(): Promise<void> {
  if (!client || !isConnected) return;

  try {
    await client.destroy();
    isConnected = false;
    client = null;
    console.log('[TUFFAHI] Disconnected from Discord');
  } catch (error) {
    throw new Error(`Failed to disconnect from Discord: ${error}`);
  }
}

export async function discordSetActivity(params: {
  details: string;
  state: string;
  largeImageKey: string;
  largeImageText: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
}): Promise<void> {
  if (!client || !isConnected) {
    throw new Error('Discord not connected');
  }

  const activity: Record<string, any> = {
    details: params.details,
    state: params.state,
    largeImageKey: params.largeImageKey,
    largeImageText: params.largeImageText,
  };

  if (params.smallImageKey) {
    activity.smallImageKey = params.smallImageKey;
    activity.smallImageText = params.smallImageText;
  }

  if (params.startTimestamp) {
    activity.startTimestamp = params.startTimestamp;
    if (params.endTimestamp) {
      activity.endTimestamp = params.endTimestamp;
    }
  }

  await client.setActivity(activity);
}

export async function discordClearActivity(): Promise<void> {
  if (!client || !isConnected) {
    throw new Error('Discord not connected');
  }

  await client.clearActivity();
}
