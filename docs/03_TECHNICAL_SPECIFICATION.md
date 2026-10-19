# 03 — Technical Specification

## 1. Technology Stack

| Layer | Technology | Version / Notes |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, TypeScript) | `^16.2.0` / React `^19.2.0` |
| **Authentication** | NextAuth.js (`next-auth`) | `^4.24.15` (CredentialsProvider, JWT strategy) |
| **ORM & Database** | Prisma 7 (`@prisma/client`) | `@prisma/adapter-better-sqlite3` (local dev) + `@prisma/adapter-pg` (prod PostgreSQL) |
| **Password & Token Crypto** | `bcryptjs` + Node `crypto` | `bcrypt` (cost 12) for passwords; `SHA-256` (`crypto.createHash('sha256')`) for invitation tokens |
| **PDF & File Parsing** | `pdf-parse` / Custom PDF stream & text extractor | Extracts text, headings, equations, and sections from uploaded academic `.pdf`, `.txt`, `.md`, `.csv` files |
| **Styling & Responsive UI** | Tailwind CSS v4 + Lucide Icons | Clean GenAI + Gamified Study Path aesthetic, Dark Mode support, desktop sidebar + mobile bottom tab bar |
| **Testing** | Vitest (Unit/Integration) + Playwright (E2E) | Full coverage of Invite-Only Admission, CLI Bootstrap, PDF Magic Import, Study Path, Quiz, and UI routes |

---

## 2. Invite-Only Account Admission & Security Specification

Following `../Arcade/docs/NEXTAUTH_INVITE_ONLY_SPEC.md`:

### 2.1 Environment Configuration
- `ACCOUNT_ADMISSION_MODE="invitation-only"`: **Required**. Any missing or unrecognized value causes admission checks to fail closed (`403 ADMISSION_CLOSED`).
- `INVITATION_TTL_HOURS="168"` (default 7 days).
- `NEXTAUTH_SECRET` & `NEXTAUTH_URL`.
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME`: Consumed exclusively by `npm run bootstrap:admin`.

### 2.2 Invitation Token Lifecycle & Concurrency Invariants
1. **Creation (`POST /api/admin/invitations`)**:
   - Accessible only to authenticated `ADMIN` users with `status === "ACTIVE"`.
   - Generates 32 bytes of cryptographic randomness (`crypto.randomBytes(32).toString('base64url')`).
   - Computes `tokenHash = sha256(rawToken)`.
   - Normalizes email (`email.trim().toLowerCase()`).
   - Uses `activeForEmail = normalizedEmail` (enforced by `@unique` in Prisma) to prevent concurrent duplicate pending invitations for the same email.
   - Returns the one-time `rawToken` and `inviteUrl` (`/sign-up?token=<rawToken>`) in the creation response only.
2. **Validation (`GET /api/invitations/verify?token=...`)**:
   - Hashes token with SHA-256 and checks status (`PENDING`, not expired, not revoked, not accepted).
   - Returns masked/normalized email, assigned role, and expiration timestamp so `/sign-up` can prefill the invitation state.
3. **Consumption (`POST /api/auth/register`)**:
   - Executes inside a serializable/atomic `prisma.$transaction`:
     1. Re-verifies `ACCOUNT_ADMISSION_MODE === "invitation-only"`.
     2. Looks up `AccountInvitation` by `tokenHash`.
     3. Rejects with `400/403` if missing, `revokedAt != null`, `acceptedAt != null`, `expiresAt <= now`, or `normalizedEmail !== invite.normalizedEmail`.
     4. Checks no existing `User` has `normalizedEmail`.
     5. Conditionally updates `AccountInvitation` (`WHERE id = invite.id AND acceptedAt IS NULL AND revokedAt IS NULL`) setting `acceptedAt = now`, `activeForEmail = null`, and `acceptedByUserId = newUser.id`.
     6. Creates the `User` with the invitation's `role`, default starter resources (`gems: 250`, `hearts: 5`, `hints: 5`, `xp: 0`, `beltRank: "WHITE"`), and starter Gizmonster.
     7. Writes an `INVITE_ACCEPTED` record to `AuditLog`.
4. **Revocation & Rotation (`PATCH /api/admin/invitations/[id]`)**:
   - `action: "revoke"`: Sets `revokedAt = now` and `activeForEmail = null`; logs `INVITE_REVOKED`.
   - `action: "rotate"`: Generates a new `rawToken` and `tokenHash`, extends `expiresAt`, keeps `activeForEmail = normalizedEmail`; logs `INVITE_ROTATED`.

---

## 3. Core API Specification

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/[...nextauth]` | `GET, POST` | Public | NextAuth.js session & credentials sign-in handler |
| `/api/auth/register` | `POST` | Invite Token | Invite-only user registration consuming a single-use `AccountInvitation` |
| `/api/invitations/verify` | `GET` | Public | Verify an invitation token and return invited email & role |
| `/api/admin/invitations` | `GET, POST` | `ADMIN` | List all invitations & audit logs, or issue a new single-use invitation |
| `/api/admin/invitations/[id]` | `PATCH` | `ADMIN` | Revoke or rotate a pending invitation; or update user status/role |
| `/api/magic-import` | `POST` | `USER+` | Upload PDF (`multipart/form-data`) or submit text/YouTube/URL/Anki/Quizlet to generate AI Tutor Chat, Study Note, Subdecks & Flashcards |
| `/api/chats` | `GET, POST` | `USER+` | List user's AI Tutor chats or start a new study chat |
| `/api/chats/[chatId]` | `GET, POST` | `USER+` | Fetch chat messages/attachments or send a message / trigger an activity (`memorize`, `note`, `lesson`) |
| `/api/decks` | `GET, POST` | Public / `USER+` | List user decks & public decks (filtered by category/search), or create/clone a deck |
| `/api/decks/[deckId]` | `GET, PATCH, DELETE` | `USER+` | Get full deck with subdecks, cards, notes, imports & leaderboard; update or archive deck |
| `/api/decks/[deckId]/cards` | `POST, PATCH, DELETE` | `USER+` | Create manual/cloze/MCQ flashcards or batch-generate cards from a note/material |
| `/api/notes/[noteId]` | `GET, PATCH` | `USER+` | Get or update a rich Study Note, or trigger AI Note regeneration / card extraction |
| `/api/quiz` | `POST` | `USER+` | Start a new interactive `QuizSession` (`LEARN`, `MEMORIZE`, or `TEST`) for a deck or subdeck |
| `/api/quiz/[sessionId]` | `GET, PATCH` | `USER+` | Fetch quiz state, submit card attempt (`isCorrect`, `usedHint`, `revealed`), or complete session (awards XP, Gems, Streak, Belt progress) |
| `/api/quiz/[sessionId]/explain` | `POST` | `USER+` | Generate contextual AI Tutor explanation for a quiz question or follow-up student query |
| `/api/gamification` | `GET, POST` | `USER+` | Fetch or mutate Shop purchases, Belt Road reward claims, and Gizmonster hatching/equipping |
| `/api/study-groups` | `GET, POST` | `USER+` | List or create Study Groups, post group chat messages, and share decks |
| `/api/live` | `GET, POST` | `USER+` | Create or play a Gizmo Live speed-quiz match against AI/classmate opponents |
| `/api/profile` | `GET, PATCH` | `USER+` | Fetch user profile, stats, achievements, and update account/security settings |

---

## 4. Academic PDF Magic Import Pipeline Specification

When a user uploads a PDF file (such as `attention-is-all-you-need.pdf`) via `/chat` or `/add`:
1. **Binary Ingestion & Hashing**:
   - Reads the `File` buffer from `multipart/form-data`, validates MIME/extension (`.pdf`, `.txt`, `.md`, `.csv`, `.docx`, `.pptx`), and computes `sha256` hash.
2. **Text & Structure Extraction**:
   - Extracts raw text from PDF pages (via `pdf-parse` with fallback stream parser for compressed/raw PDF text blocks + title/keyword intelligence).
   - Splits content into coherent academic topical units (e.g., for Transformer / ML papers or general academic PDFs: *Principles & Architecture*, *Self-Attention & Scaled Dot-Product*, *Multi-Head Attention*, *Encoder & Decoder Stacks*, *Positional Encodings*, *Training & Hardware*, *Empirical Results*).
3. **Artifact Synthesis**:
   - **AI Tutor Chat (`AiTutorChat` + `AiTutorMessage`)**: Stores the uploaded `ImportMaterial`, executive summary, and the 3 interactive mode options (`Memorize`, `Note`, `Step-by-step lesson`).
   - **Study Note (`StudyNote`)**: Generates structured Markdown + LaTeX sections (`Overview`, `Key Points`, `Core Formulas & Mechanisms`, `Architectural Details`, `Summary`).
   - **Deck + Subdecks + Cloze/MCQ Cards (`Deck`, `Subdeck`, `Card`)**: Generates multi-step Subdecks along the Study Path, each populated with 5–8 Cloze deletion and Multiple-Choice cards with 3 plausible distractors and rich AI explanations.
