//! Discord Rich Presence Integration
//! Shows currently playing track in Discord

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use parking_lot::Mutex;
use std::sync::Arc;

// Discord Application ID - Create your own at https://discord.com/developers/applications
// This is a placeholder and must be replaced with your own Application ID
const DISCORD_APP_ID: &str = "0000000000000000000";

lazy_static::lazy_static! {
    static ref DISCORD_CLIENT: Arc<Mutex<Option<DiscordIpcClient>>> = Arc::new(Mutex::new(None));
}

/// Connect to Discord
#[tauri::command]
pub async fn discord_connect() -> Result<(), String> {
    let mut client = DiscordIpcClient::new(DISCORD_APP_ID)
        .map_err(|e| format!("Failed to create Discord client: {}", e))?;

    client
        .connect()
        .map_err(|e| format!("Failed to connect to Discord: {}", e))?;

    let mut guard = DISCORD_CLIENT.lock();
    *guard = Some(client);

    Ok(())
}

/// Disconnect from Discord
#[tauri::command]
pub async fn discord_disconnect() -> Result<(), String> {
    let mut guard = DISCORD_CLIENT.lock();
    if let Some(mut client) = guard.take() {
        client
            .close()
            .map_err(|e| format!("Failed to disconnect from Discord: {}", e))?;
    }
    Ok(())
}

/// Set Discord activity (rich presence)
#[tauri::command]
pub async fn discord_set_activity(
    details: String,
    state: String,
    large_image_key: String,
    large_image_text: String,
    small_image_key: Option<String>,
    small_image_text: Option<String>,
    start_timestamp: Option<i64>,
    end_timestamp: Option<i64>,
) -> Result<(), String> {
    let mut guard = DISCORD_CLIENT.lock();
    let client = guard
        .as_mut()
        .ok_or_else(|| "Discord not connected".to_string())?;

    let mut activity_builder = activity::Activity::new()
        .details(&details)
        .state(&state)
        .assets(
            activity::Assets::new()
                .large_image(&large_image_key)
                .large_text(&large_image_text),
        );

    // Add small image if provided
    if let (Some(key), Some(text)) = (&small_image_key, &small_image_text) {
        activity_builder = activity_builder.assets(
            activity::Assets::new()
                .large_image(&large_image_key)
                .large_text(&large_image_text)
                .small_image(key)
                .small_text(text),
        );
    }

    // Add timestamps if provided
    if let Some(start) = start_timestamp {
        let mut timestamps = activity::Timestamps::new().start(start);
        if let Some(end) = end_timestamp {
            timestamps = timestamps.end(end);
        }
        activity_builder = activity_builder.timestamps(timestamps);
    }

    // Note: Buttons removed - add your own if needed

    client
        .set_activity(activity_builder)
        .map_err(|e| format!("Failed to set activity: {}", e))?;

    Ok(())
}

/// Clear Discord activity
#[tauri::command]
pub async fn discord_clear_activity() -> Result<(), String> {
    let mut guard = DISCORD_CLIENT.lock();
    let client = guard
        .as_mut()
        .ok_or_else(|| "Discord not connected".to_string())?;

    client
        .clear_activity()
        .map_err(|e| format!("Failed to clear activity: {}", e))?;

    Ok(())
}
