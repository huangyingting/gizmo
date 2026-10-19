# 06 — Prioritized Engineering Task Backlog

| ID | Epic | Task Title | Priority | Est. Points | Status |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **TASK-01** | Discovery | Playwright exploration of `gizmo.ai` & `app.gizmo.ai` + Academic PDF upload (`attention-is-all-you-need.pdf`) + 89 screenshots | P0 | 5 | Done |
| **TASK-02** | Architecture | Author ADR, PRD, Technical Spec, Data Model, Plan, Backlog, Acceptance Criteria & Parity Matrix | P0 | 3 | Done |
| **TASK-03** | Data Layer | Configure Next.js 16 + Prisma 7 dual-adapter (`better-sqlite3` local + `pg` prod) + `schema.prisma` & `schema.postgresql.prisma` | P0 | 5 | Ready |
| **TASK-04** | Security & Auth | Implement Invite-Only Admission (`src/lib/account-admission/*`), SHA-256 token hashing, atomic registration, revocation, rotation & `AuditLog` | P0 | 5 | Ready |
| **TASK-05** | Security & Auth | Implement CLI-only Bootstrap Admin script (`scripts/bootstrap-admin.ts` / `npm run bootstrap:admin`) & seed initial data | P0 | 3 | Ready |
| **TASK-06** | Auth & Admin UI | Build `/sign-in`, `/sign-up` (invite-gated), `/forgot-password`, and `/admin/invitations` Governance Console | P0 | 5 | Ready |
| **TASK-07** | AI & Import | Implement Academic PDF & Multi-Source Magic Import Engine (`/api/magic-import`) generating AI Chat, Study Notes, Subdecks & Cloze/MCQ Cards | P0 | 8 | Ready |
| **TASK-08** | Core Learning | Build AI Study Hub (`/chat`), AI Tutor Chat (`/chat/[chatId]`), and Rich Study Note Editor (`/notes/[noteId]`) | P0 | 8 | Ready |
| **TASK-09** | Core Learning | Build My Decks (`/decks`), 3-Tab Deck Workspace (`/decks/[deckId]` with Duolingo-style `Path`, `Materials`, `Leaderboard`), and Card Editor (`/add`) | P0 | 8 | Ready |
| **TASK-10** | Quiz Engine | Build Interactive Quiz Engine (`/quiz/[sessionId]`) with `Learn`/`Memorize`/`Test` modes, `Hint`, `Reveal`, `Explain` AI Modal, Hearts & XP | P0 | 8 | Ready |
| **TASK-11** | Gamification | Build Social/Progress (`/progress`), Belt Road (`/belt-road`), Gizmonster Collection (`/monster-collection`), and Gem Shop (`/shop`) | P1 | 5 | Ready |
| **TASK-12** | Community & Live | Build Public Decks (`/decks/public`), Study Groups (`/conversations`, `/study-groups/create`), and Gizmo Live Arena (`/live`) | P1 | 5 | Ready |
| **TASK-13** | Profile & Settings | Build Profile (`/profile/*`), Settings (`/settings/*`), and Gizmo Pro Benefits (`/subscribe/benefits`) + Mobile Responsive Navigation | P1 | 3 | Ready |
| **TASK-14** | Verification | Write & execute Vitest unit/integration tests + Playwright E2E test suite verifying all user & admin flows | P0 | 5 | Ready |
