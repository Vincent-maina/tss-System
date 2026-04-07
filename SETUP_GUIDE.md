# TSSS - Complete Setup Guide (Windows)

This guide will walk you through setting up the Teacher School Swapping System on Windows from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Backend Setup](#backend-setup)
4. [Testing the Backend](#testing-the-backend)
5. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Code Editor** - VS Code recommended ([Download](https://code.visualstudio.com/))
- **Git** (Optional) - [Download](https://git-scm.com/)

### Accounts Needed
1. **MongoDB Atlas** (Free tier) - [Sign Up](https://www.mongodb.com/cloud/atlas/register)
2. **GitHub** (Optional, for version control) - [Sign Up](https://github.com/join)
3. **Gmail** (Optional, for email notifications)

### Verify Installations

1. **Open Command Prompt:**
   - Press `Windows Key`
   - Type `cmd`
   - Press `Enter`

2. **Run these commands:**

```cmd
node --version
```
Should show: `v18.x.x` or higher

```cmd
npm --version
```
Should show: `9.x.x` or higher

```cmd
git --version
```
Should show: `git version 2.x.x` (if installed)

---

## MongoDB Atlas Setup

### Step 1: Create an Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with email or Google account
3. Verify your email

### Step 2: Create a Cluster
1. Click "Build a Database"
2. Choose **FREE** tier (M0 Sandbox)
3. Select cloud provider: **AWS** or **Google Cloud**
4. Choose region closest to Kenya (e.g., **Mumbai** or **Frankfurt**)
5. Name your cluster: `tsss-cluster`
6. Click "Create Cluster" (takes 3-5 minutes)

### Step 3: Create Database User
1. Go to **Database Access** in left sidebar
2. Click "Add New Database User"
3. Choose **Password** authentication
4. Username: `tsss_admin`
5. Auto-generate secure password (SAVE THIS!)
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### Step 4: Configure Network Access
1. Go to **Network Access** in left sidebar
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - ⚠️ For production, add specific IPs only
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to **Database** in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string:
   ```
   mongodb+srv://tsss_admin:<password>@tsss-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your database user password
7. Add database name before `?`: 
   ```
   mongodb+srv://tsss_admin:YOUR_PASSWORD@tsss-cluster.xxxxx.mongodb.net/tsss?retryWrites=true&w=majority
   ```

---

## Backend Setup

### Step 1: Extract the Project Files

1. **Download** the `tsss-project.tar.gz` file
2. **Right-click** on the downloaded file
3. **Extract using:**
   - **7-Zip**: Right-click → 7-Zip → Extract Here
   - **WinRAR**: Right-click → Extract Here
   - **Windows 11**: Right-click → Extract All → Choose location → Extract

4. **Move the extracted folder** to your Desktop or Documents for easy access

### Step 2: Navigate to Backend Directory

1. **Open Command Prompt:**
   - Press `Windows Key`
   - Type `cmd`
   - Press `Enter`

2. **Navigate to the backend folder:**

If you extracted to Desktop:
```cmd
cd Desktop\tsss-project\backend
```

If you extracted to Documents:
```cmd
cd Documents\tsss-project\backend
```

If you extracted elsewhere (replace with your path):
```cmd
cd C:\Users\YourUsername\Downloads\tsss-project\backend
```

3. **Verify you're in the right place:**
```cmd
dir
```

You should see: `package.json`, `.env.example`, `src`, etc.

### Step 3: Install Dependencies

```cmd
npm install
```

This will install all required packages (~2-5 minutes). You'll see a progress bar and packages being downloaded.

**Expected output:**
```
added 150 packages, and audited 151 packages in 2m
found 0 vulnerabilities
```

### Step 4: Configure Environment Variables

1. **Copy the example environment file:**
   ```cmd
   copy .env.example .env
   ```

2. **Open `.env` in Notepad or VS Code:**

Using Notepad:
```cmd
notepad .env
```

Or using VS Code (if installed):
```cmd
code .env
```

3. **Update the following variables:**

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration - PASTE YOUR CONNECTION STRING HERE
MONGODB_URI=mongodb+srv://tsss_admin:YOUR_PASSWORD@tsss-cluster.xxxxx.mongodb.net/tsss?retryWrites=true&w=majority

# JWT Configuration - Generate strong secrets
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRE=1h
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_characters
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Optional for now - can configure later)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@tsss.co.ke

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Matching Algorithm
MATCHING_CRON_SCHEDULE=0 2 * * *
MATCHING_THRESHOLD=60
HIGH_COMPATIBILITY_THRESHOLD=75

# Security
BCRYPT_ROUNDS=10
OTP_EXPIRY_MINUTES=10

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### Step 5: Generate JWT Secrets

You need secure random strings for JWT authentication.

1. **Open a NEW Command Prompt window** (keep the other one open)

2. **Generate the first secret:**
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

You'll see output like:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

3. **Copy this string** and paste it in `.env` for `JWT_SECRET`

4. **Run the command AGAIN** to generate a different secret:
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Copy this second string** and paste it in `.env` for `JWT_REFRESH_SECRET`

### Step 6: Save the .env File

After updating all values, your `.env` should look like this:

---

## Testing the Backend

### Step 1: Start the Server

In your Command Prompt (make sure you're in the `backend` folder):

```cmd
npm run dev
```

You should see:
```
[timestamp] [info]: MongoDB Connected: tsss-cluster.xxxxx.mongodb.net
[timestamp] [info]: Server running in development mode on port 5000
```

✅ **Success! Your server is running!**

### Step 2: Test the API

**Option 1: Using Your Web Browser (Recommended for Windows)**

1. Open Chrome, Edge, or Firefox
2. Go to: `http://localhost:5000`
3. You should see:
```json
{
  "message": "Teacher School Swapping System API",
  "version": "v1",
  "status": "active",
  "timestamp": "2026-03-05T..."
}
```

**Option 2: Using Command Prompt (If curl is installed)**

Open a NEW Command Prompt window (keep the server running in the first one):

```cmd
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "uptime": 12.345,
  "timestamp": "2026-03-05T..."
}
```

**Note:** If `curl` doesn't work, just use your browser (Option 1).

### Step 3: Verify Database Connection

1. Go to MongoDB Atlas Dashboard (https://cloud.mongodb.com)
2. Click on your cluster
3. Click **"Browse Collections"**
4. You should see the `tsss` database
5. Collections will be created automatically when data is added

---

## Project Structure Created

```
tsss-project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          ✅ Database connection
│   │   ├── models/
│   │   │   ├── User.js              ✅ User schema
│   │   │   ├── SwapRequest.js       ✅ Swap request schema
│   │   │   ├── Match.js             ✅ Match schema
│   │   │   ├── Message.js           ✅ Message schema
│   │   │   └── AdminLog.js          ✅ Admin log schema
│   │   ├── controllers/             📁 Empty (Phase 2)
│   │   ├── routes/                  📁 Empty (Phase 2)
│   │   ├── middleware/              📁 Empty (Phase 2)
│   │   ├── services/                📁 Empty (Phase 2)
│   │   ├── utils/
│   │   │   └── logger.js            ✅ Winston logger
│   │   └── server.js                ✅ Main app file
│   ├── .env                         ✅ Environment config
│   ├── .env.example                 ✅ Template
│   ├── .gitignore                   ✅ Git ignore
│   ├── package.json                 ✅ Dependencies
│   └── README.md                    ✅ Documentation
├── frontend/                        📁 Empty (Phase 3)
└── docs/
    └── DATABASE_SCHEMA.md           ✅ Schema docs
```

---

## Common Issues & Solutions

### Issue 1: MongoDB Connection Error
**Error**: `MongoNetworkError: failed to connect to server`

**Solutions**:
1. Check internet connection
2. Verify IP whitelist in MongoDB Atlas
3. Check connection string format
4. Ensure password doesn't contain special characters (URL encode if needed)

### Issue 2: Port Already in Use
**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=5001
```

### Issue 3: Module Not Found
**Error**: `Error: Cannot find module 'express'`

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Permission Denied
**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix npm permissions (Mac/Linux)
sudo chown -R $USER ~/.npm
sudo chown -R $USER /usr/local/lib/node_modules

# Or use nvm instead of system Node.js
```

---

## Verification Checklist

Before moving to Phase 2, ensure:

- [ ] Node.js and npm installed and working
- [ ] MongoDB Atlas cluster created and running
- [ ] Database user created with correct permissions
- [ ] IP address whitelisted in network access
- [ ] Connection string copied and working
- [ ] Backend dependencies installed (`node_modules/` exists)
- [ ] `.env` file configured with all required variables
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health endpoint returns successful response
- [ ] MongoDB Atlas shows `tsss` database

---

## Next Steps

✅ **Phase 1 Complete!** You have:
- Created the project structure
- Set up MongoDB database
- Created all data models
- Configured the server
- Verified database connection

🚀 **Ready for Phase 2**: Backend API Development
- Authentication routes (register, login, verify)
- User management endpoints
- Swap request CRUD operations
- Matching algorithm implementation
- Messaging system

---

## Useful Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests (when added)
npm test

# Check for errors
npm run lint

# View logs
tail -f logs/combined.log
```

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Getting Help

If you encounter issues:

1. Check error logs in `logs/error.log`
2. Verify all environment variables are set
3. Ensure MongoDB cluster is running
4. Check MongoDB Atlas metrics
5. Review this guide step-by-step

---

**Congratulations! Phase 1 is complete. Your backend foundation is ready!**

Next: We'll build the authentication system and API endpoints.

---

*Last Updated: March 2026*
*Project: Teacher School Swapping System*
*Student: Vincent Kangethe Maina (EB3/61518/22)*
*Supervisor: Emily Gakii*
