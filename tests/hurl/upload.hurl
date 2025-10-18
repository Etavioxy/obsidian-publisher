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


POST http://localhost:8080/api/sites
Authorization: Bearer {{jwt_token}}
[Multipart]
uuid: 00000000-0000-0000-0000-000000000000
site: file,site-0000000000000.tar.gz; application/x-tar

#Content-Type: multipart/form-data; boundary=boundary123
#--boundary123
#Content-Disposition: form-data; name="site"; filename="site-1760726146785.tar.gz"
#Content-Type: application/x-tar
#--boundary123--


