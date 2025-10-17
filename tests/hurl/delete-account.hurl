POST http://localhost:8080/auth/login
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


# ============================
# 用户删除
# ============================
DELETE http://localhost:8080/user/account
Authorization: Bearer {{jwt_token}}

HTTP 200
Content-Type: application/json


