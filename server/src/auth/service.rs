use crate::{
    auth::token::TokenService,
    error::AppError,
    models::{LoginRequest, LoginResponse, RegisterRequest, User, UserResponse},
    storage::UserStorage,
};

pub struct AuthService {
    pub user_storage: UserStorage,
    token_service: TokenService,
    allow_plaintext: bool,
}

impl AuthService {
    pub fn new(
        user_storage: UserStorage,
        token_service: TokenService,
        allow_plaintext: bool,
    ) -> Self {
        Self {
            user_storage,
            token_service,
            allow_plaintext,
        }
    }

    pub async fn register(&self, req: RegisterRequest) -> Result<UserResponse, AppError> {
        // 检查用户是否已存在
        if self.user_storage.get_by_username(&req.username)?.is_some() {
            return Err(AppError::UserAlreadyExists);
        }

        // 创建用户
        let password = if self.allow_plaintext {
            req.password
        } else {
            // 生产环境应该使用 bcrypt
            bcrypt::hash(req.password, bcrypt::DEFAULT_COST)
                .map_err(|e| AppError::Internal(e.to_string()))?
        };

        let user = User::new(req.username, password);
        let user_response = UserResponse::from(user.clone());
        
        self.user_storage.create(user)?;
        
        Ok(user_response)
    }

    pub async fn login(&self, req: LoginRequest) -> Result<LoginResponse, AppError> {
        let user = self
            .user_storage
            .get_by_username(&req.username)?
            .ok_or(AppError::AuthenticationFailed)?;

        // 验证密码
        let password_valid = if self.allow_plaintext {
            user.password == req.password
        } else {
            bcrypt::verify(req.password, &user.password)
                .map_err(|e| AppError::Internal(e.to_string()))?
        };

        if !password_valid {
            return Err(AppError::AuthenticationFailed);
        }

        let token = self.token_service.generate_token(user.id, user.username.clone())?;
        let user_response = UserResponse::from(user);

        Ok(LoginResponse {
            token,
            user: user_response,
        })
    }
}