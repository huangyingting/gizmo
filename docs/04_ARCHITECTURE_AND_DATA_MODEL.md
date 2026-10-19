# 04 — Architecture & Data Model

## 1. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                        Browser Client (Desktop & Mobile UI)                       |
|  +-----------------+  +--------------------+  +----------------+  +------------+  |
|  | AI Study Hub &  |  | Deck Study Path,   |  | Gamification:  |  | Admin      |  |
|  | PDF MagicImport |  | Notes & Live Quiz  |  | BeltRoad, Shop |  | Invites &  |  |
|  | (/chat, /add)   |  | (/decks, /quiz)    |  | Monsters, Live |  | Audit Logs |  |
|  +--------+--------+  +---------+----------+  +--------+-------+  +-----+------+  |
+-----------|---------------------|----------------------|----------------|---------+
            |                     |                      |                |
            v                     v                      v                v
+-----------------------------------------------------------------------------------+
|                     Next.js App Router & API Route Layer (/api/*)                 |
|  +-----------------------------------------------------------------------------+  |
|  | NextAuth JWT Session Middleware & RBAC Guard (USER / CREATOR / ADMIN)       |  |
|  +-----------------------------------------------------------------------------+  |
|  | Account Admission   | Academic PDF &     | Adaptive Quiz &  | Social, Shop  |  |
|  | & Invite Service    | Magic Import       | Spaced Repetition| Belt Road &   |  |
|  | (SHA-256, Atomic    | Engine (PDF Parser | Engine (Hearts,  | Gizmo Live    |  |
|  | Transactions, Audit)| Notes, Subdecks)   | Hints, Explain)  | Service       |  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     Prisma 7 Data Access Layer (src/lib/prisma.ts)                |
|        +--------------------------------+--------------------------------+        |
|        | Local Development / CI / E2E   | Production Environment         |        |
|        | @prisma/adapter-better-sqlite3 | @prisma/adapter-pg (PostgreSQL)|        |
|        | (file:./dev.db)                | (postgresql://...)             |        |
+--------+--------------------------------+--------------------------------+--------+
```

---

## 2. Entity-Relationship Data Model

### 2.1 Identity, Invite-Only Admission & Audit Domain
- **`User`**:
  - `id` (CUID PK), `email`, `normalizedEmail` (Unique), `name`, `handle` (Unique), `passwordHash`, `role` (`USER` | `CREATOR` | `MODERATOR` | `ADMIN`), `status` (`ACTIVE` | `DISABLED`)
  - **Profile & School**: `schoolName` (e.g., `"Nanyang Polytechnic"`), `avatarMonsterId`, `bio`
  - **Gamification Balances**: `xp` (Int), `gems` (Int, default 250), `hearts` (Int, default 5), `hints` (Int, default 5), `streakDays` (Int, default 1), `streakFreezes` (Int, default 0), `beltRank` (`WHITE` | `YELLOW` | `ORANGE` | `GREEN` | `BLUE` | `PURPLE` | `BROWN` | `BLACK`), `darkModeUnlocked` (Boolean), `isPro` (Boolean)
- **`AccountInvitation`**:
  - `id` (CUID PK), `email`, `normalizedEmail`, `activeForEmail` (Unique nullable lock for single pending invite per email), `role`, `tokenHash` (Unique SHA-256 hex), `expiresAt`, `acceptedAt`, `revokedAt`, `createdByUserId`, `acceptedByUserId`
- **`AuditLog`**:
  - `id` (CUID PK), `action` (`INVITE_CREATED`, `INVITE_ACCEPTED`, `INVITE_REVOKED`, `INVITE_ROTATED`, `BOOTSTRAP_ADMIN_CREATED`, `USER_SIGN_IN`, `USER_SIGN_IN_FAILED`, `ROLE_UPDATED`), `actorUserId`, `targetEmail`, `metadataJson`, `ipAddress`, `createdAt`

### 2.2 Learning Content, PDF Imports, Notes & Study Path Domain
- **`Deck`**:
  - `id` (CUID PK), `title`, `description`, `slug`, `category` (`Biology`, `Computer Science`, `Mathematics`, `Physics`, `Chemistry`, `History`, `Economics`, `Languages`, etc.), `color` (hex/theme), `isPublic` (Boolean), `isArchived` (Boolean), `ownerId` (FK -> `User`), `clonedFromId`
- **`Subdeck`** (Steps on the Duolingo-style Study Path):
  - `id` (CUID PK), `deckId` (FK -> `Deck`), `title`, `orderIndex` (Int), `masteryScore` (Float 0..100)
- **`Card`**:
  - `id` (CUID PK), `deckId` (FK -> `Deck`), `subdeckId` (FK -> `Subdeck`, nullable), `question`, `answer`, `clozeText` (with `{{term}}` markers), `optionsJson` (JSON array of MCQ choices), `explanation` (AI tutor explanation text), `cardType` (`CLOZE` | `MCQ` | `QA`), `box` (Leitner box 1..5), `nextReviewAt`
- **`StudyNote`**:
  - `id` (CUID PK), `deckId` (FK -> `Deck`, nullable), `ownerId` (FK -> `User`), `title`, `contentMarkdown` (Structured Markdown + LaTeX equations), `summary`, `sourceType` (`PDF`, `TEXT`, `YOUTUBE`, `LECTURE`, `MANUAL`)
- **`ImportMaterial`**:
  - `id` (CUID PK), `deckId` (FK -> `Deck`, nullable), `ownerId` (FK -> `User`), `filename`, `mimeType`, `sourceType` (`PDF`, `PASTE`, `YOUTUBE`, `LECTURE`, `QUIZLET`, `ANKI`, `WORD`, `PPT`, `SHEETS`, `URL`), `fileHashSha256`, `extractedText`, `createdAt`
- **`AiTutorChat`** & **`AiTutorMessage`**:
  - `AiTutorChat`: `id`, `ownerId`, `deckId`, `importMaterialId`, `title`, `summary`, `lessonStepsJson`
  - `AiTutorMessage`: `id`, `chatId`, `role` (`user` | `assistant`), `content`, `suggestedActionsJson`, `createdAt`

### 2.3 Quiz Gameplay, Social, Gamification & Multiplayer Domain
- **`QuizSession`** & **`QuizAttempt`**:
  - `QuizSession`: `id`, `userId`, `deckId`, `subdeckId`, `mode` (`LEARN` | `MEMORIZE` | `TEST`), `status` (`IN_PROGRESS` | `COMPLETED`), `totalQuestions`, `correctCount`, `xpEarned`, `gemsEarned`, `heartsRemaining`, `hintsUsed`, `startedAt`, `completedAt`
  - `QuizAttempt`: `id`, `sessionId`, `cardId`, `selectedAnswer`, `isCorrect`, `usedHint`, `usedReveal`, `timeSpentMs`
- **`MonsterOwnership`** & **`ShopTransaction`**:
  - `MonsterOwnership`: `id`, `userId`, `monsterCode`, `name`, `rarity` (`COMMON` | `RARE` | `LEGENDARY`), `level`, `essenceXp`, `isEquipped`
  - `ShopTransaction`: `id`, `userId`, `itemCode`, `itemName`, `costGems`, `quantity`, `createdAt`
- **`StudyGroup`**, **`StudyGroupMember`**, **`StudyGroupMessage`**:
  - Collaborative study rooms with invite codes, shared deck references, and real-time chat/leaderboard.
- **`LiveGameSession`**:
  - `id`, `hostUserId`, `deckId`, `roomCode`, `status`, `playerScore`, `opponentName`, `opponentScore`, `winnerName`, `createdAt`
