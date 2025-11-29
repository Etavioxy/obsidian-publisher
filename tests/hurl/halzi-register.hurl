# ============================
# 1. 用户注册
# ============================
POST https://test-ob.halzi.one/auth/register
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


