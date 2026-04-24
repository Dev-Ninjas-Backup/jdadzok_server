# NestJS Video & Audio Call System

A production-ready video and audio calling system built with NestJS, Prisma, PostgreSQL, and WebRTC.

## 🚀 Features

- ✅ **Real-time Video & Audio Calls** - WebRTC-based peer-to-peer communication
- ✅ **Multi-participant Support** - Group calls with multiple users
- ✅ **Media Controls** - Toggle video/audio on/off during calls
- ✅ **Room Management** - Automatic room cleanup and state management
- ✅ **Database Persistence** - Call history and participant tracking
- ✅ **Cache Layer** - Fast in-memory state with node-cache
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **JWT Authentication** - Secure user authentication
- ✅ **WebSocket Gateway** - Real-time bidirectional communication

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/your_database?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# Frontend (CORS)
FRONTEND_URL="http://localhost:3000"

# Cache (optional)
CACHE_TTL=0
CACHE_MAX=1000
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name add_calling_system

# (Optional) Seed database
npx prisma db seed
```

### 4. Start the Server

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Server will start on `http://localhost:3001`

## 📡 API Endpoints

### REST API

#### Create a Call

```http
POST /calls
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "hostUserId": "user-id",
  "status": "CALLING",
  "createdAt": "2025-11-05T10:00:00Z"
}
```

#### Get Call Details

```http
GET /calls/:id
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "hostUserId": "user-id",
  "status": "ACTIVE",
  "host": {
    "id": "user-id",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://..."
    }
  },
  "participants": [...]
}
```

#### Get Call Room Status

```http
GET /calls/:id/room
Authorization: Bearer <token>

Response:
{
  "callId": "uuid",
  "active": true,
  "participantCount": 3,
  "participants": [
    {
      "socketId": "socket-id",
      "userName": "John Doe",
      "hasVideo": true,
      "hasAudio": true,
      "joinedAt": "2025-11-05T10:00:00Z"
    }
  ]
}
```

#### Get Call History

```http
GET /calls/user/:userId/history
Authorization: Bearer <token>

Response: [
  {
    "id": "uuid",
    "status": "ENDED",
    "startedAt": "2025-11-05T10:00:00Z",
    "endedAt": "2025-11-05T10:30:00Z",
    "participants": [...]
  }
]
```

#### End Call

```http
DELETE /calls/:id
Authorization: Bearer <token>

Response: 204 No Content
```

### WebSocket Events

Connect to: `ws://localhost:3001/call`

#### Client → Server Events

**Join Call**

```typescript
socket.emit("joinCall", {
    callId: "uuid",
    userName: "John Doe",
    hasVideo: true,
    hasAudio: true,
});
```

**Leave Call**

```typescript
socket.emit("leaveCall", {
    callId: "uuid",
});
```

**Toggle Video**

```typescript
socket.emit("startVideo", { callId: "uuid" });
socket.emit("stopVideo", { callId: "uuid" });
```

**Toggle Audio**

```typescript
socket.emit("startAudio", { callId: "uuid" });
socket.emit("stopAudio", { callId: "uuid" });
```

**WebRTC Signaling**

```typescript
// Send offer
socket.emit("offer", {
    targetSocketId: "target-socket-id",
    signal: rtcSessionDescription,
});

// Send answer
socket.emit("answer", {
    targetSocketId: "target-socket-id",
    signal: rtcSessionDescription,
});

// Send ICE candidate
socket.emit("iceCandidate", {
    targetSocketId: "target-socket-id",
    candidate: iceCandidate,
});
```

#### Server → Client Events

**Existing Participants** (on join)

```typescript
socket.on("existingParticipants", ({ participants }) => {
    // Array of current participants
});
```

**Participant Joined**

```typescript
socket.on("participantJoined", ({ socketId, userName, hasVideo, hasAudio }) => {
    // New participant info
});
```

**Participant Left**

```typescript
socket.on("participantLeft", ({ socketId }) => {
    // Clean up peer connection
});
```

**Media State Changes**

```typescript
socket.on("participantVideoStarted", ({ socketId }) => {});
socket.on("participantVideoStopped", ({ socketId }) => {});
socket.on("participantAudioStarted", ({ socketId }) => {});
socket.on("participantAudioStopped", ({ socketId }) => {});
```

**WebRTC Signaling**

```typescript
socket.on("offer", ({ offer, senderId }) => {
    // Handle incoming offer
});

socket.on("answer", ({ answer, senderId }) => {
    // Handle incoming answer
});

socket.on("iceCandidate", ({ candidate, senderId }) => {
    // Handle incoming ICE candidate
});
```

## 🎯 Frontend Integration

### Installation

```bash
npm install socket.io-client
```

### Basic Usage

```typescript
import { CallService } from "./services/CallService";

// Initialize
const callService = new CallService("http://localhost:3001", "user-123");

// Connect
await callService.connect();

// Get user media
const localStream = await callService.getUserMedia(true, true);

// Display local video
localVideoElement.srcObject = localStream;

// Join call
callService.joinCall("call-id", "John Doe", true, true);

// Listen for remote streams
window.addEventListener("remoteStreamAdded", (event) => {
    const { socketId, stream } = event.detail;
    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    document.getElementById("remote-videos").appendChild(videoElement);
});

// Toggle media
callService.toggleVideo("call-id", false); // Disable video
callService.toggleAudio("call-id", true); // Enable audio

// Leave call
callService.leaveCall("call-id");

// Disconnect
callService.disconnect();
```

## 🏗️ Project Structure

```
src/
├── call/
│   ├── call.gateway.ts       # WebSocket gateway
│   ├── call.service.ts       # Business logic
│   ├── call.controller.ts    # REST API endpoints
│   ├── call.module.ts        # Module configuration
│   ├── dto/
│   │   └── call.dto.ts       # Data transfer objects
│   └── types/
│       └── call.types.ts     # TypeScript types
├── prisma/
│   ├── prisma.service.ts     # Prisma service
│   └── prisma.module.ts      # Prisma module
├── auth/
│   ├── guards/
│   │   └── jwt-auth.guard.ts # JWT authentication
│   └── auth.module.ts
├── app.module.ts              # Main app module
└── main.ts                    # Application entry
```

## 🔧 Configuration

### Cache Settings

Configure cache in `call.module.ts`:

```typescript
CacheModule.register({
    ttl: 0, // No expiration
    max: 1000, // Max items
});
```

### WebRTC ICE Servers

Configure in `CallService.ts` (client-side):

```typescript
private readonly ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN servers for production
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

## 🐛 Debugging

Enable debug logs:

```typescript
// In call.gateway.ts
private readonly logger = new Logger(CallGateway.name);
this.logger.debug('Your debug message');
```

View logs:

```bash
npm run start:dev -- --debug
```

## 📊 Database Schema

### Calling Table

- `id`: UUID primary key
- `hostUserId`: Foreign key to users
- `status`: CALLING | ACTIVE | ENDED | CANCELLED | MISSED | DECLINED
- `title`: Optional call title
- `isPrivate`: Boolean flag
- `startedAt`: Call start timestamp
- `endedAt`: Call end timestamp

### CallParticipant Table

- `id`: UUID primary key
- `callId`: Foreign key to calling
- `socketId`: WebSocket connection ID
- `userName`: Participant display name
- `hasVideo`: Video state
- `hasAudio`: Audio state
- `joinedAt`: Join timestamp
- `leftAt`: Leave timestamp (nullable)

## 🔒 Security Considerations

1. **Authentication**: All REST endpoints require JWT authentication
2. **CORS**: Configure allowed origins in production
3. **Rate Limiting**: Implement rate limiting for WebSocket events
4. **Input Validation**: All DTOs use class-validator
5. **SQL Injection**: Prisma provides protection against SQL injection
6. **XSS**: Sanitize user inputs on the frontend

## 🚀 Production Deployment

1. **Environment Variables**: Set production values
2. **Database**: Use connection pooling
3. **TURN Servers**: Add TURN servers for NAT traversal
4. **SSL/TLS**: Use HTTPS and WSS protocols
5. **Monitoring**: Add logging and error tracking
6. **Scaling**: Use Redis for cache in multi-instance deployments

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a PR.

## 📧 Support

For issues or questions, please open a GitHub issue.
