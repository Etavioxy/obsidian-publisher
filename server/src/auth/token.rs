use crate::{error::AppError, models::Claims};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use uuid::Uuid;

#[derive(Clone)]
pub struct TokenService {
    secret: String,
    expiration_hours: i64,
}

impl TokenService {
    pub fn new(secret: String, expiration_hours: i64) -> Self {
        Self { secret, expiration_hours }
    }

    pub fn generate_token(&self, user_id: Uuid, username: String) -> Result<String, AppError> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(self.expiration_hours))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_string(),
            username,
            exp: expiration as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_ref()),
        )?;

        Ok(token)
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, AppError> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.secret.as_ref()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }
}