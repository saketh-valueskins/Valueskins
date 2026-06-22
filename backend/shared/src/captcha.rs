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
    #[allow(dead_code)]
    challenge_ts: Option<String>,
    #[allow(dead_code)]
    hostname: Option<String>,
    #[allow(dead_code)]
    credit: Option<bool>,
    #[allow(dead_code)]
    error_codes: Option<Vec<String>>,
}

pub struct CaptchaService;

impl CaptchaService {
    fn secret_key() -> String {
        env::var("HCAPTCHA_SECRET_KEY").unwrap_or_default()
    }

    pub fn is_enabled() -> bool {
        !Self::secret_key().is_empty()
    }

    pub async fn verify(token: &str, remote_ip: Option<&str>) -> Result<bool, String> {
        let secret = Self::secret_key();
        if secret.is_empty() {
            return Err("CAPTCHA not configured".to_string());
        }

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
            .map_err(|e| format!("CAPTCHA verification request failed: {}", e))?;

        let result: VerifyResponse = response
            .json()
            .await
            .map_err(|e| format!("CAPTCHA verification response parse failed: {}", e))?;

        Ok(result.success)
    }
}
