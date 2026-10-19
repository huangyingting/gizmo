# 01 — Architecture Decision Records (ADR)

## ADR-001: Next.js App Router Full-Stack Monolith
- **Status**: Accepted
- **Context**: Upstream `gizmo.ai` and `app.gizmo.ai` split their marketing site, Expo React Native Web SPA, and `proxy.gizmo.ai` backend across multiple subdomains. For our self-contained, deployable implementation in `/home/azadmin/gizmo`, we need a unified, maintainable, SEO-friendly, and responsive full-stack web application that supports both public marketing/preview views and authenticated interactive workspaces.
- **Decision**: Build a unified **Next.js (App Router, TypeScript)** application in `/home/azadmin/gizmo` serving both UI routes (`/`, `/sign-in`, `/sign-up`, `/chat`, `/decks/*`, `/notes/*`, `/quiz/*`, `/add`, `/progress`, `/belt-road`, `/monster-collection`, `/shop`, `/live`, `/study-groups`, `/profile`, `/settings`, `/admin/invitations`) and RESTful JSON API route handlers (`/api/*`).
- **Consequences**: Zero CORS friction, shared TypeScript types and Zod schemas between client and server, server-side session enforcement, and single-command local development and production deployment.

---

## ADR-002: Dual-Database Prisma 7 Architecture (SQLite Local Dev + PostgreSQL Production)
- **Status**: Accepted
- **Context**: The application must run out-of-the-box in local development and automated CI/E2E testing using **SQLite** while supporting **PostgreSQL** in production with clean schema migrations and driver adapters (matching `../Arcade`).
- **Decision**:
  - Use **Prisma 7** (`@prisma/client`, `prisma.config.ts`) with runtime driver selection in `src/lib/prisma.ts`:
    - When `DATABASE_URL` starts with `file:` (default `file:./dev.db`), instantiate `PrismaBetterSqlite3` (`@prisma/adapter-better-sqlite3`).
    - When `DATABASE_URL` starts with `postgres://` or `postgresql://`, instantiate `PrismaPg` (`@prisma/adapter-pg` + `pg`).
  - Maintain `prisma/schema.prisma` for local SQLite migrations and `prisma/schema.postgresql.prisma` (plus deployment scripts) for PostgreSQL production deployments.
- **Consequences**: Instant zero-dependency local dev and Playwright testing via SQLite, with production-grade PostgreSQL compatibility.

---

## ADR-003: Auth.js / NextAuth v4 JWT Session Strategy with Invite-Only Account Admission
- **Status**: Accepted
- **Context**: We must secure all authenticated routes and APIs using **NextAuth (`next-auth`)**, implement strict **invite-only registration** (`ACCOUNT_ADMISSION_MODE=invitation-only`, fail-closed if unset or misconfigured), support single-use/expiring invitation codes with role assignment (`USER`, `CREATOR`, `MODERATOR`, `ADMIN`), revocation, token rotation, audit logging, and provide a **CLI-only bootstrap admin script** (`npm run bootstrap:admin`) with **no HTTP bootstrap endpoint** (referencing `../Arcade/docs/NEXTAUTH_INVITE_ONLY_SPEC.md`).
- **Decision**:
  - Use `next-auth` (`CredentialsProvider` + JWT session strategy) with custom `session` and `jwt` callbacks that hydrate `user.id`, `user.role`, `user.status`, `user.handle`, `user.gems`, `user.xp`, `user.hearts`, and `user.streak`.
  - Store only **SHA-256 hashes (`tokenHash`)** of invitation tokens in `AccountInvitation`; never store raw invitation codes in the database.
  - Enforce atomic single-active-invite-per-email via `activeForEmail @unique` and interactive Prisma transactions (`prisma.$transaction`) during registration, revocation, and rotation.
  - Record every security-sensitive lifecycle transition (`USER_SIGN_IN`, `USER_SIGN_IN_FAILED`, `INVITE_CREATED`, `INVITE_ACCEPTED`, `INVITE_REVOKED`, `INVITE_ROTATED`, `BOOTSTRAP_ADMIN_CREATED`, `ROLE_UPDATED`) in the `AuditLog` table.
  - Implement `scripts/bootstrap-admin.ts` invoked via `npm run bootstrap:admin` to create or promote the initial `ADMIN` account purely via CLI.
- **Consequences**: Cryptographically sound, race-condition-free invite-only onboarding with full auditability and zero exposed bootstrap attack surface.

---

## ADR-004: Multi-Modal "Magic Import" & Academic PDF Processing Engine
- **Status**: Accepted
- **Context**: A signature capability of Gizmo is uploading an academic PDF (such as *"Attention Is All You Need"*), lecture slides, raw notes, YouTube URLs, or Anki/Quizlet sets, and immediately transforming them into:
  1. An interactive **AI Tutor Chat** (`/chat/[id]`) with summary & suggested study activities
  2. A structured **Study Note** (`/notes/[id]`) with Markdown/LaTeX key points
  3. A **Duolingo-style Study Path** (`/decks/[id]/path`) segmented into topical **Subdecks** with **Cloze & Multiple-Choice Flashcards**
  4. A **Step-by-Step Interactive Lesson**
- **Decision**:
  - Implement a real server-side **PDF & Document Extraction Pipeline** (`POST /api/magic-import`) that parses uploaded `.pdf` (using `pdf-parse` / buffer text extraction + structural heading/section heuristics), `.txt`, `.md`, `.csv`, pasted text, or URLs.
  - Compute SHA-256 content hashes for uploaded files, extract topical sections, definitions, formulas, and key claims, and automatically synthesize:
    - An **AI Tutor Chat** with executive summary and the 3 interactive activity cards (`Memorize / Generate flashcards`, `Note / Generate a note`, `Step-by-step lesson`).
    - Structured **Study Notes** with Overview, Key Points, Equations/Formulas, and Section Breakdowns.
    - **Subdecks & Cards** (supporting Cloze deletion `{{c1::term}}`, Multiple Choice distractors, and Q&A pairs) organized into a sequential Study Path.
  - If an external LLM API key (`OPENAI_API_KEY`) is configured, optionally enhance generation via LLM; otherwise, use our deterministic, domain-aware **Academic NLP & Concept Extraction Engine** so that uploading any PDF or text works 100% offline/locally in tests and dev with rich, accurate cards and notes.
- **Consequences**: Uploading any academic PDF (including `attention-is-all-you-need.pdf`) works deterministically, fast, and reliably in all environments without external API fragility.

---

## ADR-005: Adaptive Quiz Engine with Hearts, Hints, Cloze, Reveal & AI Explain
- **Status**: Accepted
- **Context**: In `app.gizmo.ai/quiz/[userGameId]`, studying a deck or subdeck is not a static card viewer—it is an interactive, gamified session with three modes (`Learn`, `Memorize`, `Test`), a live HUD (`Hints 💡`, `Hearts ❤️`, `XP ⚡`, segmented progress bar), dynamic distractor elimination (`Hint`), answer `Reveal`, and an on-demand **`Explain` modal** where Gizmo AI explains the concept and answers follow-up questions.
- **Decision**:
  - Persist `QuizSession` and per-card `QuizAttempt` records in Prisma, tracking mode (`LEARN`, `MEMORIZE`, `TEST`), accuracy, hearts remaining, hints used, XP earned, and spaced-repetition mastery (`box`, `nextReviewAt`, `masteryScore`).
  - Provide an interactive **`Explain` API & Modal** (`/api/quiz/[sessionId]/explain`) that generates contextual explanations ("Tell me in simpler terms", "Summarize the key point", "What makes this different from other models?", plus freeform chat replies) for any card.
- **Consequences**: Full functional and visual parity with Gizmo's signature quiz loop.

---

## ADR-006: Gamification Loop — Belt Road, Gizmonsters, Streaks, Leagues & Shop
- **Status**: Accepted
- **Context**: Gizmo drives retention through five interconnected gamification systems observed in `/progress`, `/belt-road`, `/monster-collection`, and `/shop`:
  1. **Daily Streaks & Calendar** (with Streak Freezes and Streak Repairs)
  2. **Belt Road** (`White Belt` through `Black Belt` milestone rewards)
  3. **Gizmonster Collection** (hatching Common/Rare/Legendary Eggs and leveling monsters with Essence)
  4. **Weekly Leagues & School/Friends Leaderboards**
  5. **Gem/Coin Shop** (purchasing Dark Mode, Hints, Super Hearts, Streak Freezes, Eggs, Essence, and Monster Slots)
- **Decision**: Model user progression (`xp`, `gems`, `hearts`, `hints`, `streakDays`, `beltRank`, `darkModeUnlocked`), `MonsterOwnership`, and `ShopTransaction` directly in Prisma and expose atomic transactional endpoints (`/api/shop/purchase`, `/api/belt-road/claim`, `/api/monsters/equip`) so every action persists across sessions.
- **Consequences**: Every gamified screen is genuinely interactive and backed by persistent database state.
