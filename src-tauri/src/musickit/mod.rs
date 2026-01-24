//! MusicKit token generation utilities
//!
//! This module handles generating JWT developer tokens for Apple MusicKit.
//! The developer token is required to initialize MusicKit JS in the frontend.

use chrono::{Duration, Utc};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use p256::ecdsa::SigningKey;
use p256::pkcs8::EncodePrivateKey;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TokenError {
    #[error("Private key file not found: {0}")]
    KeyNotFound(String),

    #[error("Failed to read private key: {0}")]
    KeyReadError(String),

    #[error("Invalid private key format: {0}")]
    InvalidKey(String),

    #[error("JWT encoding failed: {0}")]
    EncodingError(String),

    #[error("Configuration missing: {0}")]
    ConfigMissing(String),
}

/// JWT claims for Apple Music Developer Token
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    /// Issuer - Team ID from Apple Developer Portal
    iss: String,
    /// Issued at timestamp
    iat: i64,
    /// Expiration timestamp
    exp: i64,
}

/// Configuration for token generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicKitConfig {
    /// Team ID from Apple Developer Portal
    pub team_id: String,
    /// Key ID from Apple Developer Portal (MusicKit key)
    pub key_id: String,
    /// Path to the private key file (.p8)
    pub private_key_path: Option<PathBuf>,
    /// Private key content (PEM format) - alternative to path
    pub private_key_content: Option<String>,
}

impl MusicKitConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, TokenError> {
        let team_id = std::env::var("APPLE_TEAM_ID")
            .map_err(|_| TokenError::ConfigMissing("APPLE_TEAM_ID".to_string()))?;

        let key_id = std::env::var("APPLE_KEY_ID")
            .map_err(|_| TokenError::ConfigMissing("APPLE_KEY_ID".to_string()))?;

        let private_key_path = std::env::var("APPLE_PRIVATE_KEY_PATH").ok().map(PathBuf::from);
        let private_key_content = std::env::var("APPLE_PRIVATE_KEY").ok();

        if private_key_path.is_none() && private_key_content.is_none() {
            return Err(TokenError::ConfigMissing(
                "APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY".to_string()
            ));
        }

        Ok(Self {
            team_id,
            key_id,
            private_key_path,
            private_key_content,
        })
    }

    /// Get the private key content
    fn get_private_key(&self) -> Result<String, TokenError> {
        if let Some(content) = &self.private_key_content {
            return Ok(content.clone());
        }

        if let Some(path) = &self.private_key_path {
            return fs::read_to_string(path)
                .map_err(|e| TokenError::KeyReadError(e.to_string()));
        }

        Err(TokenError::ConfigMissing("Private key".to_string()))
    }
}

/// Generate a developer token for MusicKit
///
/// The token is a JWT signed with ES256 algorithm using the private key
/// from Apple Developer Portal.
pub fn generate_developer_token(config: &MusicKitConfig) -> Result<String, TokenError> {
    let private_key_pem = config.get_private_key()?;

    // Parse the private key
    let signing_key = parse_private_key(&private_key_pem)?;

    // Create JWT header with Key ID
    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(config.key_id.clone());

    // Create claims
    let now = Utc::now();
    let expiration = now + Duration::days(180); // Max 6 months

    let claims = Claims {
        iss: config.team_id.clone(),
        iat: now.timestamp(),
        exp: expiration.timestamp(),
    };

    // Convert p256 key to jsonwebtoken EncodingKey
    let der = signing_key.to_pkcs8_der()
        .map_err(|e| TokenError::InvalidKey(e.to_string()))?;

    let encoding_key = EncodingKey::from_ec_der(der.as_bytes());

    // Encode the token
    encode(&header, &claims, &encoding_key)
        .map_err(|e| TokenError::EncodingError(e.to_string()))
}

/// Parse a PEM-encoded private key
fn parse_private_key(pem: &str) -> Result<SigningKey, TokenError> {
    use p256::pkcs8::DecodePrivateKey;

    SigningKey::from_pkcs8_pem(pem)
        .map_err(|e| TokenError::InvalidKey(e.to_string()))
}

/// Generate a demo token for development (NOT for production use)
/// This returns a placeholder that will allow the app to load but not play music
pub fn generate_demo_token() -> String {
    // This is a placeholder - in production, you need a real developer token
    // The frontend will show an error when trying to authorize without a valid token
    "DEMO_TOKEN_REPLACE_WITH_REAL_TOKEN".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claims_serialization() {
        let claims = Claims {
            iss: "TEAM123".to_string(),
            iat: 1234567890,
            exp: 1234567890 + 86400,
        };

        let json = serde_json::to_string(&claims).unwrap();
        assert!(json.contains("TEAM123"));
    }
}
