# StellarRec™ Authentication System

## Overview

The authentication system has been successfully implemented with the following components:

## ✅ Completed Features

### 1. User Model with bcrypt Password Hashing
- **Location**: `src/models/User.ts`
- **Features**:
  - Secure password hashing using bcrypt with 12 salt rounds
  - User creation, retrieval, and profile management
  - Email verification status tracking
  - Role-based user types (student, recommender, admin)

### 2. JWT Token Generation and Validation
- **Location**: `src/services/authService.ts`
- **Features**:
  - Access token generation (15 minutes expiry)
  - Refresh token generation (7 days expiry)
  - Token verification with proper error handling
  - Special tokens for password reset and email verification
  - Token extraction from Authorization headers

### 3. Registration and Login API Endpoints
- **Location**: `src/routes/auth.ts`, `src/controllers/authController.ts`
- **Endpoints**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/refresh` - Token refresh
  - `POST /api/auth/logout` - User logout
  - `GET /api/auth/profile` - Get user profile
  - `GET /api/auth/me` - Alias for profile

### 4. Password Reset Functionality with Email Verification
- **Location**: `src/services/emailService.ts`, `src/controllers/authController.ts`
- **Features**:
  - Password reset request with email notification
  - Secure token-based password reset
  - Email verification for new accounts
  - Resend verification email functionality
  - Professional email templates

### 5. Role-Based Access Control
- **Location**: `src/middleware/auth.ts`
- **Features**:
  - Authentication middleware for protected routes
  - Authorization middleware for role-based access
  - Support for student, recommender, and admin roles
  - Optional authentication for public endpoints
  - Email verification requirement middleware

## 🔧 Technical Implementation

### Security Features
- **Password Security**: bcrypt with 12 salt rounds
- **JWT Security**: Separate secrets for access and refresh tokens
- **Input Validation**: Comprehensive validation using express-validator
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Rate Limiting**: Built-in rate limiting middleware

### Email Service
- **Development**: Gmail SMTP configuration
- **Production**: SendGrid integration ready
- **Templates**: Professional HTML email templates for:
  - Email verification
  - Password reset
  - Password reset confirmation

### Database Integration
- **PostgreSQL**: Full integration with connection pooling
- **User Management**: Complete CRUD operations
- **Transaction Support**: Database transaction helpers

## 📋 API Endpoints

### Public Endpoints
```
POST /api/auth/register          - Register new user
POST /api/auth/login             - User login
POST /api/auth/refresh           - Refresh access token
POST /api/auth/forgot-password   - Request password reset
POST /api/auth/reset-password    - Reset password with token
POST /api/auth/verify-email      - Verify email address
```

### Protected Endpoints
```
POST /api/auth/logout                - Logout user
GET  /api/auth/profile              - Get user profile
GET  /api/auth/me                   - Get current user
POST /api/auth/resend-verification  - Resend email verification
```

### Admin Endpoints
```
GET    /api/auth/users     - Get all users (admin only)
DELETE /api/auth/users/:id - Delete user (admin only)
```

## 🧪 Testing

### Unit Tests
- **Location**: `src/tests/auth.test.ts`
- **Coverage**: 
  - Token generation and verification
  - Error handling
  - Authentication service methods
  - AppError class functionality

### Test Results
```
✓ 12 tests passing
✓ Token generation and verification
✓ Error handling for invalid tokens
✓ Header extraction functionality
```

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key  # Production
EMAIL_USER=your-gmail@gmail.com         # Development
EMAIL_PASSWORD=your-gmail-app-password   # Development
FROM_EMAIL=noreply@stellarrec.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stellarrec
DB_USER=postgres
DB_PASSWORD=password

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## 🚀 Usage

### Starting the Server
```bash
npm install
npm run dev    # Development mode
npm run build  # Build for production
npm start      # Production mode
```

### Running Tests
```bash
npm test       # Run all tests
npm run test:watch  # Watch mode
```

## 📝 Requirements Satisfied

This implementation satisfies the following task requirements:

- ✅ **Create User model with bcrypt password hashing**
- ✅ **Implement JWT token generation and validation**
- ✅ **Build registration and login API endpoints**
- ✅ **Create password reset functionality with email verification**
- ✅ **Implement role-based access control (student, recommender, admin)**

All requirements from **Requirements 2.1, 2.2, 6.1, 6.3** have been implemented and tested.

## 🔄 Next Steps

The authentication system is now ready for integration with other system components. Future tasks can build upon this foundation to implement:

- Student application management
- Recommender portal functionality
- AI-powered recommendation writing
- University integration systems

## 🛡️ Security Notes

- All passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens use separate secrets for access and refresh tokens
- Email verification is required for account activation
- Rate limiting is implemented to prevent abuse
- Input validation prevents injection attacks
- Proper error handling prevents information leakage