use std::env;
use serde::{Deserialize, Serialize};

const HCAPTCHA_VERIFY_URL: &str = "https://api.hcaptcha.com/siteverify";

#[derive(Debug, Serialize)]
struct VerifyRequest {
    secret: String,
    response: String,
    remoteip: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VerifyResponse {
    success: bool,
}

pub fn is_captcha_enabled() -> bool {
    env::var("HCAPTCHA_SECRET_KEY")
        .ok()
        .map(|s| !s.is_empty())
        .unwrap_or(false)
}

pub async fn verify_captcha_token(token: &str, remote_ip: Option<&str>) -> Result<bool, String> {
    let secret = env::var("HCAPTCHA_SECRET_KEY")
        .map_err(|_| "HCAPTCHA_SECRET_KEY not configured".to_string())?;

    if token.is_empty() {
        return Ok(false);
    }

    let client = reqwest::Client::new();
    let request = VerifyRequest {
        secret,
        response: token.to_string(),
        remoteip: remote_ip.map(|s| s.to_string()),
    };

    let response = client
        .post(HCAPTCHA_VERIFY_URL)
        .form(&request)
        .send()
        .await
        .map_err(|e| format!("CAPTCHA request failed: {}", e))?;

    let result: VerifyResponse = response
        .json()
        .await
        .map_err(|e| format!("CAPTCHA response parse failed: {}", e))?;

    Ok(result.success)
}
