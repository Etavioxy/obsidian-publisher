# ============================
# 2. 用户登录（获取 JWT Token）
# ============================
POST https://test-ob.halzi.one/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "testpass123"
}

HTTP 200
Content-Type: application/json
# Capture the JWT token from response
[Captures]
jwt_token: jsonpath "$.token"

# Expected response

GET https://test-ob.halzi.one/auth/me
Authorization: Bearer {{jwt_token}}

# Expected response
HTTP 200
Content-Type: application/json

