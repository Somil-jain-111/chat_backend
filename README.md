# Chat Backend API

Production-minded one-to-one chat backend built with NestJS, TypeScript, PostgreSQL, TypeORM, and Firebase Firestore.

The project demonstrates clean backend architecture, concurrency-safe chat creation, bounded message retrieval, idempotent read receipts, monotonic last-seen tracking, strict validation, and safe failure handling across PostgreSQL and Firestore.

## Highlights

- Controller → Service → Repository → Entity/Model architecture
- PostgreSQL-backed users and chat membership
- Firestore-backed messages, read receipts, and last-seen state
- Concurrency-safe duplicate-chat prevention using canonical participant ordering and a database constraint
- Deterministic chronological message ordering
- Idempotent read receipts that retain the original timestamp
- Firestore transactions preventing last-seen state from moving backwards
- Strict TypeScript, validated DTOs, centralized sanitization, and typed business exceptions
- Helmet, explicit CORS configuration, bounded request bodies, and no-cache headers
- PostgreSQL migrations, development seed data, Docker configuration, and Postman collection
- Focused unit tests for critical chat business rules

## Technology

- Node.js 20+
- NestJS with Express
- TypeScript
- PostgreSQL and TypeORM
- Firebase Admin SDK and Firestore
- Jest and Supertest

## Architecture

```text
src/
├── common/                  # Error handling, middleware, health endpoint
├── config/                  # Firebase and environment configuration
├── default/                 # Shared project configuration and database modules
├── migrations/              # PostgreSQL schema migrations
└── modules/
    ├── chat/                # Chat API, rules, SQL and Firestore repositories
    └── user/                # User entity, repository, service and chat listing API
```

Controllers only map HTTP requests and responses. Services contain business rules. Repositories own PostgreSQL or Firestore access. PostgreSQL and Firestore are intentionally treated as separate consistency boundaries rather than pretending they share one ACID transaction.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/chat/create` | Create or return a one-to-one chat |
| `POST` | `/chat/:chatId/message/send` | Send a message |
| `GET` | `/chat/:chatId/messages?limit=50` | Retrieve recent messages chronologically |
| `POST` | `/chat/:chatId/message/:messageId/read` | Mark a message as read |
| `POST` | `/chat/:chatId/lastseen` | Update a participant's last-seen message |
| `GET` | `/user/:userId/chats` | List a user's chats from PostgreSQL |
| `GET` | `/health` | Application health check |

The Postman collection is available at [`postman/Chat-Backend.postman_collection.json`](postman/Chat-Backend.postman_collection.json).

## Local setup

### 1. Install dependencies

```sh
npm install
cp .env.example .env.development
```

Update the PostgreSQL values in `.env.development` for your machine. Never commit this file.

### 2. Start PostgreSQL

Use the included Docker Compose service or an existing local PostgreSQL installation:

```sh
docker compose up -d postgres
npm run migration:run
npm run seed
```

### 3. Start the Firestore Emulator

The Firestore Emulator requires Java 21:

```sh
brew install openjdk@21
export PATH="$(brew --prefix openjdk@21)/bin:$PATH"
npm run firestore:emulator
```

Local emulator use does not require Google Cloud credentials.

### 4. Start the API

```sh
npm run start:dev
```

The default API URL is `http://localhost:4000`.

## Verification

```sh
npm run build
npm test -- --runInBand
npm run lint
npm run migration:show
```

## Important security assumption

The assignment contract supplies `senderId` and `userId` in request bodies. A production deployment must add JWT or session authentication and derive user identity from verified credentials. The message-list endpoint also needs an authenticated requester before membership authorization can be enforced.

Firebase service-account credentials must be supplied through a secret manager or Application Default Credentials in production and must never be committed.

## Scope

This implementation focuses on the required one-to-one chat workflow. Group chats, message editing/deletion, media uploads, and presence broadcasting are intentionally excluded.
# chat_backend
