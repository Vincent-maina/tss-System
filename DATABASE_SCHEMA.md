# TSSS Database Schema Documentation

## Overview
This document describes the complete database schema for the Teacher School Swapping System (TSSS).

## Database: MongoDB

MongoDB was chosen for its flexibility, scalability, and excellent support for complex queries needed for the matching algorithm.

## Collections

### 1. Users Collection

**Purpose**: Stores all teacher and admin accounts

**Schema**:
```javascript
{
  _id: ObjectId,
  firstName: String (required, max 50 chars),
  lastName: String (required, max 50 chars),
  email: String (required, unique, lowercase),
  phoneNumber: String (required, unique, format: +254XXXXXXXXX),
  password: String (required, min 8 chars, hashed),
  
  tscNumber: String (required, unique, 6 digits),
  tscVerified: Boolean (default: false),
  
  jobGroup: String (required, enum: B5-D5),
  subjects: [String] (required),
  
  currentStation: {
    county: String (required),
    subCounty: String (required),
    schoolName: String (required),
    schoolType: String (enum: Day/Boarding/Day & Boarding),
    hardshipArea: Boolean (default: false),
    latitude: Number,
    longitude: Number
  },
  
  profilePhoto: String,
  bio: String (max 500 chars),
  
  isActive: Boolean (default: true),
  isBlocked: Boolean (default: false),
  blockReason: String,
  
  role: String (enum: teacher/admin, default: teacher),
  
  otp: {
    code: String,
    expiresAt: Date
  },
  
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `email` (unique)
- `tscNumber` (unique)
- `phoneNumber` (unique)
- `currentStation.county`
- `subjects`
- `jobGroup`

---

### 2. SwapRequests Collection

**Purpose**: Manages teacher swap requests

**Schema**:
```javascript
{
  _id: ObjectId,
  teacher: ObjectId (ref: User, required),
  
  desiredCounties: [String] (required),
  desiredSubCounties: [String],
  
  preferences: {
    maxDistance: Number (default: 300 km),
    schoolType: [String] (enum: Day/Boarding/Day & Boarding),
    hardshipWilling: Boolean (default: false),
    urgency: String (enum: Low/Medium/High/Urgent)
  },
  
  reason: String (max 1000 chars),
  
  status: String (enum: active/matched/pending_approval/approved/rejected/cancelled/expired),
  
  matchedWith: ObjectId (ref: User),
  matchedRequestId: ObjectId (ref: SwapRequest),
  
  mutualAcceptance: {
    thisSideAccepted: Boolean (default: false),
    otherSideAccepted: Boolean (default: false),
    acceptedAt: Date
  },
  
  isVisible: Boolean (default: true),
  views: Number (default: 0),
  expiresAt: Date (default: now + 90 days),
  adminNotes: String,
  
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `teacher`
- `status`
- `desiredCounties`
- `matchedWith`
- `expiresAt`
- Compound: `status + desiredCounties + isVisible`

---

### 3. Matches Collection

**Purpose**: Stores compatibility matches between swap requests

**Schema**:
```javascript
{
  _id: ObjectId,
  
  requestId1: ObjectId (ref: SwapRequest, required),
  requestId2: ObjectId (ref: SwapRequest, required),
  teacher1: ObjectId (ref: User, required),
  teacher2: ObjectId (ref: User, required),
  
  compatibilityScore: Number (0-100, required),
  
  scoreBreakdown: {
    mutualDestination: Number,
    subjectMatch: Number,
    jobGroup: Number,
    schoolType: Number,
    distance: Number
  },
  
  distanceBetweenStations: Number (in km),
  
  status: String (enum: pending/viewed_by_teacher1/viewed_by_teacher2/
                        viewed_by_both/interested_teacher1/interested_teacher2/
                        mutual_interest/accepted/rejected/expired),
  
  teacher1Interest: {
    interested: Boolean,
    interestedAt: Date
  },
  
  teacher2Interest: {
    interested: Boolean,
    interestedAt: Date
  },
  
  notificationsSent: {
    teacher1: Boolean (default: false),
    teacher2: Boolean (default: false)
  },
  
  viewedAt: {
    teacher1: Date,
    teacher2: Date
  },
  
  expiresAt: Date (default: now + 30 days),
  
  adminApproved: Boolean,
  adminNotes: String,
  
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `teacher1 + teacher2`
- `requestId1 + requestId2` (unique)
- `compatibilityScore` (descending)
- `status`
- `teacher1 + status`
- `teacher2 + status`

---

### 4. Messages Collection

**Purpose**: In-app messaging between teachers

**Schema**:
```javascript
{
  _id: ObjectId,
  
  sender: ObjectId (ref: User, required),
  receiver: ObjectId (ref: User, required),
  match: ObjectId (ref: Match),
  
  content: String (required, max 2000 chars),
  messageType: String (enum: text/system/swap_request/swap_accept/swap_reject),
  
  isRead: Boolean (default: false),
  readAt: Date,
  isDelivered: Boolean (default: false),
  deliveredAt: Date,
  
  attachments: [String],
  
  deletedBySender: Boolean (default: false),
  deletedByReceiver: Boolean (default: false),
  
  replyTo: ObjectId (ref: Message),
  
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `sender + receiver`
- `receiver + isRead`
- `match`
- Compound: `sender + receiver + createdAt`

---

### 5. AdminLogs Collection

**Purpose**: Audit trail for administrative actions

**Schema**:
```javascript
{
  _id: ObjectId,
  
  admin: ObjectId (ref: User, required),
  
  action: String (enum: user_block/user_unblock/user_verify/user_delete/
                        swap_approve/swap_reject/match_override/
                        system_settings_update/bulk_notification/
                        report_generation/data_export/fraud_flag/
                        content_moderation),
  
  targetType: String (enum: user/swap_request/match/message/system),
  targetId: ObjectId (required),
  
  details: String (max 1000 chars),
  
  previousData: Mixed,
  newData: Mixed,
  
  ipAddress: String,
  userAgent: String,
  
  status: String (enum: success/failed/pending),
  errorMessage: String,
  
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes**:
- `admin`
- `action`
- `targetType + targetId`
- `createdAt` (descending)

---

## Relationships

### User → SwapRequest
- One-to-Many: A user can have multiple swap requests
- Reference: `swapRequests.teacher` → `users._id`

### SwapRequest → Match
- Many-to-Many: Matches link two swap requests
- References: 
  - `matches.requestId1` → `swapRequests._id`
  - `matches.requestId2` → `swapRequests._id`

### User → Match
- Many-to-Many through SwapRequest
- References:
  - `matches.teacher1` → `users._id`
  - `matches.teacher2` → `users._id`

### User → Message
- Many-to-Many (sender/receiver)
- References:
  - `messages.sender` → `users._id`
  - `messages.receiver` → `users._id`

### Match → Message
- One-to-Many: Messages can reference a match
- Reference: `messages.match` → `matches._id`

---

## Data Validation Rules

### User
- Email must be unique and valid format
- Phone must be Kenyan format (+254 or 0 followed by 9 digits)
- TSC number must be exactly 6 digits
- Password minimum 8 characters
- Job group must be valid TSC grade

### SwapRequest
- Must have at least one desired county
- Max distance must be positive
- Expires automatically after 90 days
- Only one active request per teacher at a time

### Match
- Compatibility score between 0-100
- Cannot have duplicate matches (requestId1 + requestId2 unique)
- Expires after 30 days if no action

### Message
- Content maximum 2000 characters
- Cannot be deleted by both parties (soft delete)

---

## Matching Algorithm Criteria

The compatibility score is calculated using these weights:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Mutual Destination | 40% | Both teachers want each other's counties |
| Subject Match | 25% | Common teaching subjects |
| Job Group | 15% | Same TSC job group |
| School Type | 10% | Matching school type preferences |
| Distance | 10% | Geographic proximity |

**Total**: 100 points

**Thresholds**:
- High Compatibility: ≥ 75
- Medium Compatibility: 60-74
- Low Compatibility: < 60

Only matches with score ≥ 60 are saved to the database.

---

## Cron Jobs

### 1. Matching Algorithm
- **Schedule**: Daily at 2:00 AM
- **Purpose**: Generate new matches from active swap requests
- **Process**: 
  1. Fetch all active swap requests
  2. Calculate compatibility scores for all pairs
  3. Save matches with score ≥ 60
  4. Send notifications for high compatibility (≥ 75)

### 2. Expire Old Requests
- **Schedule**: Daily at 3:00 AM
- **Purpose**: Mark expired swap requests
- **Process**: Update status to 'expired' for requests past expiresAt date

### 3. Expire Old Matches
- **Schedule**: Daily at 3:30 AM
- **Purpose**: Mark expired matches
- **Process**: Update status to 'expired' for matches past expiresAt date

---

## Database Size Estimates

Based on 10,000 active teachers:

| Collection | Est. Documents | Avg Size | Total Size |
|------------|----------------|----------|------------|
| Users | 10,000 | 2 KB | 20 MB |
| SwapRequests | 5,000 | 1 KB | 5 MB |
| Matches | 50,000 | 0.5 KB | 25 MB |
| Messages | 100,000 | 0.3 KB | 30 MB |
| AdminLogs | 10,000 | 1 KB | 10 MB |
| **Total** | **175,000** | - | **~90 MB** |

**Note**: These are conservative estimates. Actual size will vary.

---

## Backup Strategy

1. **MongoDB Atlas Automatic Backups**: Daily snapshots
2. **Retention Period**: 7 days for free tier, 35 days for paid
3. **Point-in-Time Recovery**: Available on paid tiers
4. **Manual Exports**: Weekly exports for critical data

---

## Performance Optimization

1. **Indexing**: All frequently queried fields are indexed
2. **Compound Indexes**: For complex queries (e.g., status + county)
3. **Pagination**: All list endpoints use pagination
4. **Aggregation Pipelines**: For analytics and reporting
5. **Connection Pooling**: Managed by Mongoose
6. **Query Optimization**: Use of `.select()` to limit fields

---

## Security Measures

1. **Passwords**: Hashed with bcrypt (10 rounds)
2. **Sensitive Data**: TSC numbers and personal info encrypted
3. **Access Control**: Role-based (teacher/admin)
4. **Soft Deletes**: No permanent data deletion
5. **Audit Trail**: All admin actions logged
6. **Data Validation**: Mongoose schema validation + express-validator

---

**Last Updated**: March 2026
**Version**: 1.0.0
