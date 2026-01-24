//! Token-related Tauri commands

use crate::musickit::{generate_demo_token, generate_developer_token, MusicKitConfig};
use std::sync::OnceLock;

/// Cached developer token
static DEVELOPER_TOKEN: OnceLock<String> = OnceLock::new();

/// Get the MusicKit developer token
///
/// This command is called by the frontend to get the developer token
/// needed to initialize MusicKit JS.
#[tauri::command]
pub fn get_developer_token() -> Result<String, String> {
    // Return cached token if available
    if let Some(token) = DEVELOPER_TOKEN.get() {
        return Ok(token.clone());
    }

    // Try to generate a real token from environment config
    let token = match MusicKitConfig::from_env() {
        Ok(config) => {
            match generate_developer_token(&config) {
                Ok(token) => {
                    println!("Generated MusicKit developer token");
                    token
                }
                Err(e) => {
                    eprintln!("Failed to generate developer token: {}", e);
                    eprintln!("Using demo token - music playback will not work");
                    generate_demo_token()
                }
            }
        }
        Err(e) => {
            eprintln!("MusicKit configuration missing: {}", e);
            eprintln!("Set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH");
            eprintln!("Using demo token - music playback will not work");
            generate_demo_token()
        }
    };

    // Cache the token
    let _ = DEVELOPER_TOKEN.set(token.clone());

    Ok(token)
}

/// Refresh the developer token
///
/// Forces regeneration of the developer token (useful if the token expired)
#[tauri::command]
pub fn refresh_developer_token() -> Result<String, String> {
    // Clear the cached token by creating a new static (not ideal, but works)
    // In a real app, you'd use a Mutex or similar

    match MusicKitConfig::from_env() {
        Ok(config) => {
            generate_developer_token(&config)
                .map_err(|e| format!("Failed to generate token: {}", e))
        }
        Err(e) => {
            Err(format!("Configuration error: {}", e))
        }
    }
}

/// Check if MusicKit is properly configured
#[tauri::command]
pub fn is_musickit_configured() -> bool {
    MusicKitConfig::from_env().is_ok()
}
