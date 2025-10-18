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


DELETE http://localhost:8080/api/sites/00000000-0000-0000-0000-000000000000
Authorization: Bearer {{jwt_token}}


