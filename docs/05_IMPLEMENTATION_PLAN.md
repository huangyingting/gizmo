# 05 — Implementation Plan

## Phase 1: Project Scaffolding & Dual-Database Prisma Layer
1. Initialize Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 project structure in `/home/azadmin/gizmo`.
2. Configure **Prisma 7** (`prisma/schema.prisma`, `prisma/schema.postgresql.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`) with `@prisma/adapter-better-sqlite3` for local development (`file:./dev.db`) and `@prisma/adapter-pg` for production PostgreSQL.
3. Run `npx prisma db push` / migrations and create `scripts/seed.ts` to populate rich public decks (Biology, Computer Science, Physics, Mathematics, History, Languages), sample classmates/leaderboards (Nanyang Polytechnic), and initial study groups.

## Phase 2: Invite-Only Authentication, RBAC, Audit Logging & CLI Bootstrap Admin
1. Implement `src/lib/account-admission/` (`mode.ts`, `invitations.ts`, `audit.ts`, `bootstrap.ts`, `password.ts`) enforcing `ACCOUNT_ADMISSION_MODE=invitation-only` (fail-closed).
2. Implement `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin`) to provision or update the bootstrap `ADMIN` account strictly via CLI with zero HTTP bootstrap endpoints.
3. Configure NextAuth (`src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`) with `CredentialsProvider`, JWT session callbacks, and role/status checks.
4. Build API routes:
   - `POST /api/auth/register` (atomic invite verification & consumption)
   - `GET /api/invitations/verify`
   - `GET/POST /api/admin/invitations` & `PATCH /api/admin/invitations/[id]` (create, revoke, rotate, user role/status governance)
5. Build Auth & Admin UI pages:
   - `/sign-in`, `/sign-up` (invite-token aware with clear error states), `/forgot-password`
   - `/admin/invitations` (Admin Governance Console with one-click invite creation, link copying, rotation, revocation, and live Audit Log table)

## Phase 3: AI Study Hub, Academic PDF Magic Import, Study Notes & Deck Workspace
1. Build the **Academic PDF & Multi-Source Magic Import Engine** (`src/lib/magic-import.ts` + `POST /api/magic-import`) supporting `.pdf` binary uploads (including *Attention Is All You Need*), pasted text, YouTube URLs, Lecture recordings, Quizlet, Anki, CSV/Sheets, and web URLs.
2. Implement **AI Study Hub (`/chat`) & AI Tutor Chat (`/chat/[chatId]`)**:
   - "What shall we Study?" hero with Upload PDF/File, Paste Text, YouTube Link, Record Lecture, See More Options (12 modalities), Play Gizmo Live banner, Friends' Decks, School Popular Decks, and Public Deck Search.
   - `/chat/[chatId]` displaying the uploaded PDF attachment, AI summary, interactive 3-card Study Mode selector (**Memorize / Generate flashcards**, **Note / Generate a note**, **Step-by-step lesson**), **`Save cards into`** modal, and interactive AI chat.
3. Implement **Rich Study Note Editor (`/notes/[noteId]`)**:
   - Top bar (`< deck title >`, `Study`, `🪄 Create cards`, Share, Menu), formatting toolbar (`Text`, `B`, `I`, `U`, `S`, Lists, Math `Σ`, Table, `🎙️ Record`, `✨ Generate notes`), structured Markdown/LaTeX rendering, and one-click flashcard generation.
4. Implement **Deck Detail Workspace (`/decks`, `/decks/[deckId]/*`, `/add`)**:
   - Left sidebar deck tree + 3-tab Deck Workspace (`Path`, `Materials`, `Leaderboard`).
   - Interactive Duolingo-style winding **Study Path** with Subdeck steps and popover (`Learn N cards`, `Memorize`, `Test`).
   - Manual & Magic Card Editor (`/add`) with Cloze deletion highlighting (`{{term}}`), multiple-choice distractors, and live preview.

## Phase 4: Interactive Quiz Engine (`/quiz/[sessionId]`)
1. Build the Quiz Session API (`POST /api/quiz`, `GET/PATCH /api/quiz/[sessionId]`, `POST /api/quiz/[sessionId]/explain`).
2. Build the full-screen Quiz Gameplay UI (`/quiz/[sessionId]`):
   - Top HUD (`×`, Share, Deck Title, Sound toggle, Edit card, `💡 Hints`, `❤️ Hearts`, `⚡ XP`, segmented progress bar).
   - Question renderer for Multiple Choice, Cloze Fill-in-the-Blank (`_`), and Flashcard Flip (`Memorize` mode).
   - Bottom utility bar with **`💡 Hint`** (crosses out a wrong distractor & decrements hint count), **`👁️ Reveal`** (highlights correct answer), and **`💬 Explain`** (opens the AI Tutor Explanation Modal with follow-up prompt pills and chat reply input).
   - Completion summary screen awarding XP, Gems, Streak credit, and Belt Road progress.

## Phase 5: Gamification, Social, Public Decks, Study Groups, Gizmo Live, Profile & Settings
1. Implement **Social & Progress (`/progress`)**, **Belt Road (`/belt-road`)**, **Gizmonster Collection (`/monster-collection`)**, and **Shop (`/shop`)** backed by `/api/gamification`.
2. Implement **Public Decks (`/decks/public`)** with subject category filtering, search, unauthenticated preview, and one-click deck cloning.
3. Implement **Study Groups (`/conversations`, `/study-groups/create`)** and **Gizmo Live (`/live`)** real-time speed-quiz arena.
4. Implement **Profile (`/profile`, `/profile/stats`, `/profile/decks`, `/profile/edit`)**, **Settings (`/settings/*`)**, and **Gizmo Pro (`/subscribe/benefits`)**.

## Phase 6: Automated Verification (Vitest + Playwright E2E)
1. Run unit/integration tests (`npm test`) verifying invite-only admission invariants, SHA-256 token hashing, revocation, rotation, CLI bootstrap admin, and PDF Magic Import extraction.
2. Run Playwright E2E tests (`npx playwright test`) verifying desktop & mobile flows, invite-only registration, academic PDF upload -> AI Chat -> Study Note -> 15-Step Flashcard Deck -> Interactive Quiz (Hint, Reveal, AI Explain) -> Shop/Belt Road/Monsters -> Admin Console.
