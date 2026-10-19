# Gizmo AI Study Studio (`gizmo`)

An original, full-featured AI-powered adaptive learning, flashcard, study note, and gamified quiz platform inspired by systematic Playwright exploration of `https://gizmo.ai` and `https://app.gizmo.ai`, built with **Next.js 16 (App Router, Turbopack)**, **Auth.js / NextAuth v4**, **Prisma 7** (dual **SQLite** local dev & **PostgreSQL** production), **Tailwind CSS**, and **Invite-Only Account Admission & Audit Governance** (referencing `../Arcade`).

---

## 📚 Product & Engineering Documentation Suite (`docs/`)

All exploration findings, architectural decisions, specifications, and verification matrices are located in [`./docs/`](./docs/):

1. [`docs/00_EXPLORATION_COVERAGE_AND_BEHAVIOR.md`](./docs/00_EXPLORATION_COVERAGE_AND_BEHAVIOR.md) — Systematic Playwright exploration report covering `gizmo.ai` and `app.gizmo.ai`, 89 captured screenshots in `./screenshots/`, 95+ logged upstream API calls, and the real academic PDF upload flow (*Attention Is All You Need*).
2. [`docs/01_ADR_ARCHITECTURE_DECISION_RECORDS.md`](./docs/01_ADR_ARCHITECTURE_DECISION_RECORDS.md) — 7 ADRs covering Next.js 16 + NextAuth JWT, Dual SQLite/PostgreSQL Prisma 7 adapters, Fail-Closed Invite-Only Admission & CLI-Only Bootstrap Admin, Academic PDF Magic Import Pipeline, Spaced-Repetition Study Path & Quiz Engine, Gamification Economy, and Responsive Navigation Shell.
3. [`docs/02_PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md`](./docs/02_PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md) — Product vision, personas, user stories, functional & non-functional requirements.
4. [`docs/03_TECHNICAL_SPECIFICATION.md`](./docs/03_TECHNICAL_SPECIFICATION.md) — Route architecture, API contracts, security invariants, and state machines.
5. [`docs/04_ARCHITECTURE_AND_DATA_MODEL.md`](./docs/04_ARCHITECTURE_AND_DATA_MODEL.md) — System architecture diagrams and complete 18-model Prisma schema specification.
6. [`docs/05_IMPLEMENTATION_PLAN.md`](./docs/05_IMPLEMENTATION_PLAN.md) — Phased implementation, migration, and deployment roadmap.
7. [`docs/06_TASK_BACKLOG.md`](./docs/06_TASK_BACKLOG.md) — Prioritized engineering task backlog across Epics A–H.
8. [`docs/07_ACCEPTANCE_CRITERIA.md`](./docs/07_ACCEPTANCE_CRITERIA.md) — Given/When/Then acceptance criteria across all functional and security requirements.
9. [`docs/08_FEATURE_PARITY_MATRIX.md`](./docs/08_FEATURE_PARITY_MATRIX.md) — Feature-by-feature parity matrix mapping upstream `gizmo.ai` / `app.gizmo.ai` + `../Arcade` invite governance to local routes and tests.

---

## ✨ Key Capabilities

- **Invite-Only Account Admission & Security Governance**:
  - Fail-closed `ACCOUNT_ADMISSION_MODE=invitation-only` registration policy.
  - Cryptographically random single-use, expiring invitation tokens stored as **SHA-256 hashes** (`tokenHash`).
  - Role assignment (`USER`, `CREATOR`, `MODERATOR`, `ADMIN`), invitation revocation, token rotation, and immutable `AuditLog` tracking.
  - **CLI-Only Bootstrap Admin**: Administrator bootstrap is exclusively performed via `npm run bootstrap:admin` (`scripts/bootstrap-admin.ts`) and is never exposed over any HTTP endpoint.
- **AI Study Hub & Academic PDF Magic Import (`/chat`, `/chat/[chatId]`, `/add`)**:
  - Upload real academic PDFs (including `public/samples/attention-is-all-you-need.pdf`) or import from 12 modalities (PDF, Paste, YouTube, PowerPoint, Lecture Recording, Quizlet, Anki, Sheets, Word, Photo, Audio, Website Link).
  - Computes SHA-256 file hash, extracts text, and opens an interactive AI Tutor session with 3 Study Activity Cards:
    1. **Memorize (`Generate flashcards`)** — Synthesizes a 15-step Duolingo-style Subdeck Study Path with Cloze fill-in-the-blank and Multiple-Choice cards.
    2. **Note (`Generate a note`)** — Synthesizes a structured Markdown + LaTeX Study Note (`/notes/[noteId]`).
    3. **Step-by-step lesson** — Interactive Socratic walkthrough with embedded Quick Check questions.
- **3-Tab Deck Workspace (`/decks/[deckId]/path`, `/materials`, `/leaderboard`)**:
  - **Path**: Zig-zag stepping stones for each subdeck with a `Learn` 🦉 / `Memorize` 🐘 / `Test` 📜 mode popover.
  - **Materials**: `Cards (N)` view with green Cloze term pill highlights + `Notes` & `Imports` cards.
  - **Leaderboard**: Weekly reset timer and top learners ranking.
- **Adaptive Quiz & AI Explain Tutor (`/quiz/[sessionId]`)**:
  - Top HUD (`Hints 💡`, `Hearts ❤️`, `XP ⚡`, progress bar).
  - `Hint` button crosses out a wrong distractor option; `Reveal` shows the answer.
  - Post-answer `Explain` button opens the AI Tutor slide-up modal with 3 follow-up suggestion pills and custom follow-up chat.
- **Gamification, Social, Public Decks, Study Groups & Gizmo Live**:
  - `/progress` (Streak calendar, Weekly Quest, Leaderboard), `/belt-road` (White Belt to Black Belt progression), `/monster-collection` (82 Gizmonsters), `/shop` (Streak Freeze, Mystery Box, XP Boost, Gizmo Pro), `/decks/public`, `/conversations`, `/study-groups/create`, `/live`, `/profile`, `/settings`, `/subscribe/benefits`, and `/admin/invitations`.

---

## 🚀 Getting Started (Local SQLite Development)

```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to local SQLite database (./prisma/dev.db)
npm run db:push

# 3. Provision Bootstrap Admin via CLI-only script
BOOTSTRAP_ADMIN_EMAIL="admin@gizmo.local" \
BOOTSTRAP_ADMIN_PASSWORD="AdminPassword123!" \
BOOTSTRAP_ADMIN_NAME="Jack Huang" \
npm run bootstrap:admin

# 4. Seed sample Attention Is All You Need deck, study note, public decks, and study groups
npm run db:seed

# 5. Start development server
npm run dev
```

### Default CLI-Provisioned Admin Account (Local Dev)
- **Email**: `admin@gizmo.local`
- **Password**: `AdminPassword123!`

---

## 🐘 Production Deployment (PostgreSQL & Docker)

For PostgreSQL production deployments, use `prisma/schema.postgresql.prisma` or `docker-compose.yml`:

```bash
docker compose up --build -d
```

---

## 🧪 Running Tests

```bash
# Run Vitest unit & integration tests (Invite-only admission, SHA-256 hashing, revocation, rotation, PDF synthesis)
npm test

# Build production bundle & run Playwright E2E test suite
npm run build
npm run test:e2e
```
