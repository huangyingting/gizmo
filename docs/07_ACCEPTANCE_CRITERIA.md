# 07 — Acceptance Criteria

## AC-1: Invite-Only Account Admission & CLI Bootstrap Admin
- **Given** `ACCOUNT_ADMISSION_MODE` is unset or not `"invitation-only"`, **When** any registration request is made to `POST /api/auth/register`, **Then** the server fails closed with HTTP `403` (`ADMISSION_CLOSED`).
- **Given** a fresh database, **When** an administrator runs `npm run bootstrap:admin`, **Then** the CLI script creates/updates the `ADMIN` account and writes a `BOOTSTRAP_ADMIN_CREATED` audit log entry, and no HTTP bootstrap endpoint exists anywhere in the application.
- **Given** an unauthenticated visitor without a valid invitation token, **When** they attempt to register on `/sign-up` or `POST /api/auth/register`, **Then** registration is rejected with HTTP `400/403` and no user account is created.
- **Given** an `ADMIN` user on `/admin/invitations`, **When** they create an invitation for `researcher@example.edu` with role `CREATOR`, **Then** only the SHA-256 `tokenHash` is stored in `AccountInvitation`, `activeForEmail` prevents duplicate pending invites for `researcher@example.edu`, and a one-time `/sign-up?token=...` link is returned.
- **Given** a valid pending invitation token, **When** `researcher@example.edu` registers on `/sign-up?token=...`, **Then** the invitation is atomically marked `acceptedAt`, `activeForEmail` is cleared to `null`, the user is created with role `CREATOR`, an `INVITE_ACCEPTED` audit log is written, and any subsequent attempt to reuse the token fails with `400/403`.
- **Given** a pending invitation, **When** an `ADMIN` revokes or rotates it, **Then** the old token is immediately invalidated and an `INVITE_REVOKED` or `INVITE_ROTATED` audit log is recorded.

---

## AC-2: Academic PDF Upload -> AI Tutor Chat -> Study Notes -> Subdeck Study Path
- **Given** an authenticated user on `/chat` or `/add`, **When** they upload an academic PDF file (such as `attention-is-all-you-need.pdf`), **Then** the server extracts the document content, computes its SHA-256 hash, creates an `ImportMaterial` and `AiTutorChat` (`/chat/[chatId]`), and renders the executive summary along with the 3 interactive Study Activity Cards (`Memorize / Generate flashcards`, `Note / Generate a note`, `Step-by-step lesson`).
- **Given** an uploaded PDF chat in `/chat/[chatId]`, **When** the user clicks **`Generate note`**, **Then** a structured `StudyNote` (`/notes/[noteId]`) is created with `Overview`, `Key points`, formulas, and rich-text editing tools, plus a **`🪄 Create cards`** button.
- **Given** a Study Note or PDF Chat, **When** the user clicks **`Start memorizing`** -> **`Save`** (or **`🪄 Create cards`**), **Then** a `Deck` is populated with topical `Subdeck` steps along the Duolingo-style **Study Path** (`/decks/[deckId]/path`) and Cloze/MCQ flashcards (`/decks/[deckId]/materials`).

---

## AC-3: Interactive Quiz Gameplay (Learn, Memorize, Hint, Reveal & AI Explain)
- **Given** a populated Deck on `/decks/[deckId]/path`, **When** the user clicks a Study Path step and selects **`Learn`** (or clicks **`Study deck`**), **Then** an interactive `QuizSession` (`/quiz/[sessionId]`) starts displaying the HUD (`Hints 💡`, `Hearts ❤️`, `XP ⚡`, progress bar), the question prompt (MCQ or Cloze `_`), and bottom actions (`Hint`, `Reveal`, `Explain`).
- **Given** an active quiz question, **When** the user clicks **`💡 Hint`**, **Then** one wrong distractor option is crossed out/disabled and the user's hints counter decrements by 1.
- **Given** an active quiz question, **When** the user clicks **`👁️ Reveal`** or selects an answer choice, **Then** the correct answer is highlighted and **`Continue`** advances to the next question.
- **Given** an active quiz question, **When** the user clicks **`💬 Explain`**, **Then** the AI Explain modal opens with a clear conceptual explanation, 3 follow-up suggestion pills (*"Tell me in simpler terms"*, *"Summarize the key point"*, *"What makes this different from other models?"*), and an interactive reply box.
- **Given** the final question in a quiz session is completed, **Then** the user sees the Quiz Completion screen and their `xp`, `gems`, `streakDays`, and subdeck `masteryScore` are persisted in the database.

---

## AC-4: Gamification, Social, Public Decks, Study Groups, Gizmo Live & Responsive Layout
- **Given** an authenticated user, **When** they visit `/progress`, `/belt-road`, `/monster-collection`, `/shop`, `/decks/public`, `/conversations`, `/live`, `/profile`, and `/settings`, **Then** every screen renders with full interactive functionality (purchasing items in the Shop with Gems, claiming Belt Road milestones, hatching/equipping Gizmonsters, cloning public decks, posting in Study Groups, playing a Gizmo Live match, and editing profile/settings).
- **Given** both Desktop (`1440×900`) and Mobile (`390×844`) viewports, **When** navigating across the application, **Then** the layout adapts cleanly between the Desktop Left Sidebar and the Mobile Bottom Navigation Bar without horizontal overflow.
