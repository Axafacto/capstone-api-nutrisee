# capstone-api-nutrisee

## Base URL
The base URL for the API is:
```bash
http://localhost/api/v1
```

## Register
- URL
  - ```http://localhost:9000/api/v1/auth/register ```
- Method
  - POST
- Request Body
  - ``` {
    "username": "admin",
    "email": "admin@bangkit.academy",
    "password": "admin123"
} 
- Response
  - ``` 
    "status": "success",
    "message": "User registered successfully",
    "userId": "MCb68gM0LeaANhgPyJs6" ```
    
## Login
- URL
  - ```http://localhost:9000/api/v1/auth/login```
- Method
  - POST
- Request Body
  - ``` 
    "email": "admin@bangkit.academy",
    "password": "admin123"
- Response
  - ``` 
    "status": "success",
    "message": "Login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJNQ2I2OGdNMExlYUFOaGdQeUpzNiIsImVtYWlsIjoienp6QGJhbmdraXQuYWNhZGVteSIsInVzZXJuYW1lIjoienp6IiwiaWF0IjoxNzMyODg3NjU0LCJleHAiOjE3MzI4OTEyNTR9.OIAgyj5pQ11Ci1EwCgEsvj8xSWmPhshBHiqLMVuMWM4"
    }
    ```

## Add data user
- URL
  - ```http://localhost:9000/api/v1/users/data```
- Method
  - POST
- Request Body
  - ```
    "age": 16,
    "gender": "female",
    "height": 170,
    "weight": 55,
    "targetWeight": "maintain weight"
- Response
  - ```
    "status": "success",
    "message": "User data added to subcollection successfully"
    

