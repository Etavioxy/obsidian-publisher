# ============================
# 1. 用户注册
# ============================
POST http://localhost:8080/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "testpass123"
}

#-- response --
#200
#Content-Type: application/json
#
#{
#  "success": true,
#  "message": "User registered successfully"
#}


