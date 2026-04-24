# Cap Level System - Comprehensive Documentation

## Overview

The Cap Level System is a comprehensive gamified progression and revenue-sharing platform designed for the JdadZok social media platform. It incentivizes user engagement and volunteerism through a structured cap level hierarchy that provides increasing benefits and revenue sharing opportunities.

## System Architecture

### Core Components

1. **Cap Level Service** - Manages user progression through cap levels
2. **Ad Revenue Service** - Handles monthly revenue distribution
3. **Volunteer Tracking Service** - Manages volunteer activities and 8-week service completion
4. **User Metrics Service** - Tracks user engagement and calculates activity scores

### Cap Level Hierarchy

| Level                  | Name                 | Ad Revenue Share | Key Benefits                           | Upgrade Requirements                      |
| ---------------------- | -------------------- | ---------------- | -------------------------------------- | ----------------------------------------- |
| 🟢 **GREEN**           | New Member           | 2%               | Basic visibility, marketplace access   | Sign-up + first post                      |
| 🟡 **YELLOW**          | Active Contributor   | 10%              | Enhanced reach, expanded marketplace   | Activity score ≥ 50                       |
| 🔴 **RED**             | Trusted Creator      | 20%              | Volunteer hub access, priority support | Activity score ≥ 100 + admin verification |
| ⚫ **BLACK**           | Esteemed Contributor | 45%              | High visibility, brand partnerships    | 8-week volunteer service completion       |
| 🪶 **OSTRICH_FEATHER** | Global Changemaker   | 60%              | Global recognition, exclusive deals    | Panel nomination after BLACK status       |

## Activity Scoring Algorithm

The system uses a weighted scoring algorithm to calculate user engagement:

```typescript
interface ActivityScore {
  posts: number * 5;        // 5 points per post
  comments: number * 2;     // 2 points per comment
  likes: number * 1;        // 1 point per like given
  shares: number * 3;       // 3 points per share
  followers: number * 0.5;  // 0.5 points per follower
  volunteerHours: number * 10; // 10 points per volunteer hour
}
```

### Promotion Logic

1. **GREEN → YELLOW**: Activity Score ≥ 50 (automatic)
2. **YELLOW → RED**: Activity Score ≥ 100 + Admin verification
3. **RED → BLACK**: 8-week volunteer service completion (200+ hours, 3+ projects)
4. **BLACK → OSTRICH_FEATHER**: Secret panel nomination

## API Endpoints

### Cap Level Management

```http
GET    /cap-level/status/:userId       # Get user's current cap status
GET    /cap-level/requirements/:level  # Get requirements for specific level
POST   /cap-level/calculate/:userId    # Recalculate user's eligible level
PUT    /cap-level/promote/:userId      # Admin: Manual promotion
GET    /cap-level/metrics/:userId      # Get detailed user metrics
GET    /cap-level/stats               # Platform-wide cap level statistics
GET    /cap-level/eligible/:level     # Users eligible for promotion
POST   /cap-level/batch-promote/:level # Process automatic promotions
```

### Revenue Sharing

```http
GET    /revenue/user/:userId/history   # Get user revenue history
GET    /revenue/user/:userId/summary   # Get comprehensive revenue summary
POST   /revenue/calculate-monthly      # Calculate monthly revenue distribution
POST   /revenue/create-share          # Manual revenue share entry (admin)
GET    /revenue/platform/stats        # Platform revenue statistics
GET    /revenue/distribution/:year/:month # Monthly revenue distribution
GET    /revenue/leaderboard           # Revenue leaderboard
GET    /revenue/analytics             # Revenue analytics
GET    /revenue/forecast              # Revenue forecasting
```

### User Metrics

```http
GET    /user-metrics/:userId          # Get user metrics
PUT    /user-metrics/:userId          # Update user metrics
POST   /user-metrics/:userId/recalculate-score # Recalculate activity score
GET    /user-metrics/:userId/analytics # Detailed activity analytics
GET    /user-metrics/:userId/rank     # User activity rank
GET    /user-metrics/leaderboard      # Activity leaderboard
GET    /user-metrics/platform/stats   # Platform activity statistics
POST   /user-metrics/batch-recalculate # Batch recalculation (admin)
GET    /user-metrics/config/weights   # Get scoring weights
PUT    /user-metrics/config/weights   # Update scoring weights (admin)
```

## Services Documentation

### CapLevelService

**Primary Responsibilities:**

- Calculate user eligibility for cap level promotions
- Handle automatic and manual promotions
- Validate level requirements and progression rules
- Generate cap level statistics and reports

**Key Methods:**

```typescript
async calculateCapEligibility(userId: string): Promise<CapEligibilityResult>
async promoteUserCapLevel(userId: string, targetLevel?: CapLevel, bypassVerification?: boolean): Promise<User>
async getUserCapStatus(userId: string): Promise<UserCapStatus>
```

### AdRevenueService

**Primary Responsibilities:**

- Calculate monthly revenue distributions
- Track user earnings and payout history
- Generate revenue analytics and forecasting
- Handle manual revenue adjustments

**Key Methods:**

```typescript
async calculateMonthlyRevenue(calculationDto: MonthlyRevenueCalculationDto): Promise<RevenueCalculationResultDto>
async getUserRevenueSummary(userId: string): Promise<UserRevenueSummaryDto>
async getPlatformRevenueStats(): Promise<PlatformRevenueStatsDto>
```

### VolunteerTrackingService

**Primary Responsibilities:**

- Track volunteer applications and hours
- Manage project completions and verifications
- Handle 8-week service completion requirements
- Generate volunteer statistics and leaderboards

**Key Methods:**

```typescript
async updateVolunteerHours(updateDto: UpdateVolunteerHoursDto): Promise<UserMetrics>
async completeVolunteerProject(completionDto: ProjectCompletionDto): Promise<CompletionResult>
async verifyServiceCompletion(serviceDto: ServiceCompletionDto): Promise<ServiceCompletionRecord>
```

### UserMetricsService

**Primary Responsibilities:**

- Calculate and update activity scores
- Track user engagement metrics
- Generate analytics and rankings
- Handle batch processing for metrics updates

**Key Methods:**

```typescript
async calculateActivityScore(userId: string): Promise<number>
async recalculateAndUpdateActivityScore(userId: string): Promise<UserMetrics>
async getUserActivityRank(userId: string): Promise<number>
```

## Database Models

### Key Prisma Models Used

```prisma
model User {
  id       String   @id @default(uuid())
  capLevel CapLevel @default(NONE)
  // ... other fields
}

model CapRequirements {
  id                   String   @id @default(uuid())
  capLevel            CapLevel @unique
  minActivityScore    Float?
  minVolunteerHours   Int?
  requiresVerification Boolean @default(false)
  requiresNomination  Boolean @default(false)
  adSharePercentage   Float
  // ... benefit fields
}

model UserMetrics {
  id              String @id @default(uuid())
  userId          String @unique
  totalPosts      Int    @default(0)
  totalComments   Int    @default(0)
  totalLikes      Int    @default(0)
  totalShares     Int    @default(0)
  totalFollowers  Int    @default(0)
  volunteerHours  Int    @default(0)
  activityScore   Float  @default(0.0)
  totalEarnings   Float  @default(0.0)
  // ... other metrics
}

model AdRevenueShare {
  id              String   @id @default(uuid())
  userId          String
  month           Int
  year            Int
  amount          Float
  capLevelAtTime  CapLevel
  sharePercentage Float
  // ... timestamps
}
```

## Configuration

### Activity Score Weights

The scoring weights are configurable and can be adjusted via API:

```typescript
const defaultWeights = {
    posts: 5,
    comments: 2,
    likes: 1,
    shares: 3,
    followers: 0.5,
    volunteerHours: 10,
};
```

### Cap Level Requirements

Requirements are stored in the database and can be modified:

```sql
-- Example: Update YELLOW cap requirements
UPDATE cap_requirements
SET min_activity_score = 75, ad_share_percentage = 12.0
WHERE cap_level = 'YELLOW';
```

## Implementation Features

### 🔄 Automated Processing

- **Activity Score Updates**: Real-time calculation when user actions occur
- **Cap Level Promotions**: Automatic promotion for GREEN/YELLOW levels
- **Revenue Distribution**: Monthly automated revenue calculations
- **Metrics Recalculation**: Background jobs for bulk processing

### 🔒 Security & Validation

- **Admin Verification**: Required for RED+ level promotions
- **Transaction Safety**: Database transactions for critical operations
- **Input Validation**: Comprehensive DTO validation with decorators
- **Authorization**: Role-based access control for admin operations

### 📊 Analytics & Reporting

- **Real-time Statistics**: Platform-wide metrics and trends
- **User Rankings**: Activity and revenue leaderboards
- **Forecasting**: Revenue predictions based on historical data
- **Export Functionality**: CSV exports for reporting

### 🎯 Performance Optimization

- **Batch Processing**: Efficient bulk operations for metrics updates
- **Pagination**: All list endpoints support pagination
- **Caching Strategy**: Optimized database queries with proper indexing
- **Background Jobs**: CPU-intensive operations handled asynchronously

## Usage Examples

### Basic Cap Level Check

```typescript
// Check user's current cap status
const capStatus = await capLevelService.getUserCapStatus(userId);
console.log(`User is at ${capStatus.currentLevel} level`);
console.log(`Activity Score: ${capStatus.eligibility.activityScore}`);
```

### Monthly Revenue Calculation

```typescript
// Calculate revenue for January 2025 (dry run)
const calculation = await adRevenueService.calculateMonthlyRevenue({
    month: 1,
    year: 2025,
    totalPlatformRevenue: 100000,
    dryRun: true,
});
console.log(`Would distribute $${calculation.totalDistributed} to ${calculation.totalUsers} users`);
```

### Volunteer Hours Update

```typescript
// Log volunteer hours for a user
await volunteerTrackingService.updateVolunteerHours({
    userId: "user-123",
    hours: 8,
    projectId: "project-456",
    workDescription: "Community cleanup event",
    workDate: "2025-01-15",
});
```

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
    await capLevelService.promoteUserCapLevel(userId, "RED");
} catch (error) {
    if (error instanceof BadRequestException) {
        // Handle validation errors
        console.log("Promotion failed:", error.message);
    }
    // Other error types...
}
```

## Future Enhancements

### Planned Features

1. **Machine Learning**: AI-driven activity score adjustments
2. **Integration APIs**: Third-party volunteer organization connections
3. **Mobile Apps**: Real-time push notifications for promotions
4. **Blockchain**: Transparent revenue distribution tracking
5. **Gamification**: Badges, achievements, and streaks
6. **Social Features**: Cap level-based community features

### Technical Improvements

1. **Redis Caching**: Cache frequently accessed data
2. **Event Sourcing**: Track all cap level changes
3. **Microservices**: Split into dedicated services
4. **GraphQL**: More flexible API queries
5. **Real-time Updates**: WebSocket implementation for live updates

## Development Guidelines

### Code Style

- Follow existing NestJS patterns
- Use TypeScript strict mode
- Comprehensive JSDoc comments
- Proper error handling with logging

### Testing Strategy

- Unit tests for all service methods
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance tests for batch operations

### Deployment Considerations

- Database migrations for schema changes
- Environment-specific configurations
- Monitoring and alerting setup
- Backup and recovery procedures

---

### Ngo verification with third party api idanalyzer

### Prerequisites

- Prisma ORM for DB.
- BullMQ for queue jobs.
- Env var: IDANALYZER_API_KEY (get from IDAnalyzer dashboard -https://www.idanalyzer.com/).
- Missing profile fields → REJECTED with console error.
- Mismatch → REJECTED + detailed reason.
- Compare the extracted username, gender, and dateOfBirth from the IDAnalyzer response with the data from the user's Prisma Profile model.
- Handle API/Network Errors.
- This comprehensive cap level system provides a robust foundation for user engagement, volunteerism incentives, and fair revenue sharing. The modular design ensures maintainability and extensibility for future enhancements.
