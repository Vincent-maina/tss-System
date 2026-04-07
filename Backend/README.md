# Teacher School Swapping System - Backend

## Overview
This is the backend API for the Teacher School Swapping System (TSSS), a web-based platform that connects Kenyan teachers seeking mutual school transfers.

## Technology Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Logging**: Winston
- **File Upload**: Multer
- **Real-time**: Socket.io (for messaging)
- **PDF Generation**: PDFKit
- **Validation**: Joi, express-validator
- **Task Scheduling**: node-cron

## Project Structure
```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   └── database.js   # MongoDB connection
│   ├── models/           # Mongoose models
│   │   ├── User.js
│   │   ├── SwapRequest.js
│   │   ├── Match.js
│   │   ├── Message.js
│   │   └── AdminLog.js
│   ├── controllers/      # Route controllers
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   │   └── logger.js
│   └── server.js         # Main application file
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tsss-project/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong secret key for JWT
   - `EMAIL_*`: Email service credentials
   - Other required variables

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Models

### User Model
Stores teacher information including:
- Personal details (name, email, phone)
- TSC information (TSC number, job group)
- Current station details
- Authentication credentials
- Profile data

### SwapRequest Model
Manages swap requests with:
- Desired counties and preferences
- Status tracking
- Match references
- Expiry management

### Match Model
Handles compatibility matching:
- Compatibility scores (0-100)
- Score breakdown by criteria
- Status tracking
- Interest management

### Message Model
In-app messaging system:
- Chat between teachers
- Read/delivery status
- Soft delete support
- Conversation threading

### AdminLog Model
Audit trail for admin actions:
- Action tracking
- Before/after data
- IP and user agent logging

## API Endpoints (To be implemented in Phase 2)

### Authentication
- `POST /api/v1/auth/register` - Register new teacher
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update profile
- `PUT /api/v1/users/password` - Change password
- `POST /api/v1/users/upload-photo` - Upload profile photo

### Swap Requests
- `POST /api/v1/swap-requests` - Create swap request
- `GET /api/v1/swap-requests` - Get all swap requests
- `GET /api/v1/swap-requests/:id` - Get specific request
- `PUT /api/v1/swap-requests/:id` - Update request
- `DELETE /api/v1/swap-requests/:id` - Delete request

### Matches
- `GET /api/v1/matches` - Get matches for current user
- `GET /api/v1/matches/:id` - Get specific match
- `POST /api/v1/matches/:id/interest` - Express interest
- `POST /api/v1/matches/:id/reject` - Reject match

### Messages
- `GET /api/v1/messages/conversations` - Get all conversations
- `GET /api/v1/messages/:userId` - Get conversation with user
- `POST /api/v1/messages` - Send message
- `PUT /api/v1/messages/:id/read` - Mark as read

### Admin
- `GET /api/v1/admin/users` - Get all users
- `PUT /api/v1/admin/users/:id/block` - Block user
- `GET /api/v1/admin/analytics` - Get system analytics
- `GET /api/v1/admin/logs` - Get admin logs

## Matching Algorithm

The system uses a weighted compatibility scoring algorithm:

```javascript
Compatibility Score = 
  (40%) Mutual Destination Match +
  (25%) Subject Combination Match +
  (15%) Job Group Match +
  (10%) School Type Preference +
  (10%) Geographic Proximity
```

**Thresholds:**
- High Compatibility: ≥ 75 points
- Medium Compatibility: 60-74 points
- Low Compatibility: < 60 points

## Security Features

1. **Authentication**: JWT-based with refresh tokens
2. **Password Hashing**: bcrypt with 10 salt rounds
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Data Validation**: Input sanitization and validation
5. **CORS**: Configured for specific origins
6. **Helmet**: Security headers
7. **HTTPS**: Enforced in production
8. **OTP Verification**: For account verification

## Running the Application

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

### Running Tests
```bash
npm test
```

## Environment Variables

See `.env.example` for all required environment variables.

Critical variables:
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `EMAIL_*`: Email service configuration
- `FRONTEND_URL`: Frontend URL for CORS

## Logging

The application uses Winston for logging:
- **Development**: Console output with colors
- **Production**: File logging (combined.log, error.log)
- **Log Levels**: error, warn, info, debug

Logs are stored in the `logs/` directory.

## Deployment

### Recommended Platform: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure environment variables
4. Set build command: `npm install`
5. Set start command: `npm start`

### MongoDB Atlas Setup

1. Create a cluster on MongoDB Atlas
2. Whitelist your deployment IP
3. Create a database user
4. Get connection string
5. Add to `MONGODB_URI` environment variable

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## Contributing

This is an academic project by Vincent Kangethe Maina for Chuka University.

## License

ISC

## Support

For issues or questions, contact:
- Email: [Your email]
- Supervisor: Emily Gakii

## Next Steps (Phase 2)

1. Implement authentication routes and controllers
2. Create user management endpoints
3. Build swap request CRUD operations
4. Implement matching algorithm service
5. Add messaging functionality
6. Create admin panel endpoints
7. Add comprehensive testing
8. Deploy to production

---
**Version**: 1.0.0
**Last Updated**: March 2026
**Author**: Vincent Kangethe Maina (EB3/61518/22)
