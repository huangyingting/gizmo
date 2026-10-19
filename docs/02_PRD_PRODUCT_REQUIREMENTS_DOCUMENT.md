# 02 — Product Requirements Document (PRD)

## 1. Product Vision & Overview

**Gizmo AI Studio** is an AI-powered, gamified active-recall learning platform that transforms any academic paper (PDF), lecture slide deck, note, YouTube transcript, or flashcard set into structured **Study Notes**, a Duolingo-style **Subdeck Study Path**, interactive **Cloze & Multiple-Choice Quizzes** with on-demand AI explanations, and collaborative **Study Groups** & **Gizmo Live** quiz battles—secured by enterprise-grade **Invite-Only Account Admission** and Role-Based Access Control (RBAC).

---

## 2. Target Personas

1. **Academic Learner (Role: `USER`)**
   - Uploads research papers (PDFs), lecture notes, or slides into the AI Study Hub (`/chat` or `/add`).
   - Generates structured study notes, flashcards, and step-by-step lessons.
   - Practices on the winding Study Path (`/decks/[id]/path`), uses Hints and AI Explanations during quizzes (`/quiz/[id]`), maintains daily streaks, climbs the Belt Road, hatches Gizmonsters, and competes in Study Groups and Gizmo Live.
2. **Deck & Course Creator (Role: `CREATOR` / `USER`)**
   - Authors rich flashcards with Cloze deletions (click-and-drag / bracket highlighting), mathematical formulas, multiple-choice distractors, subdecks, and public decks shared in the Community Library (`/decks/public`).
3. **Platform Administrator (Role: `ADMIN`)**
   - Provisioned exclusively via the CLI bootstrap script (`npm run bootstrap:admin`).
   - Issues, rotates, and revokes single-use, expiring **Account Invitations** (`/admin/invitations`), assigns user roles, manages account statuses (`ACTIVE`, `DISABLED`), and audits security events in the **Audit Log** viewer.

---

## 3. Core Product Modules & Functional Requirements

### Module A: Marketing Landing & Public Deck Discovery (`/`, `/decks/public`)
- **FR-A1**: Responsive marketing landing page featuring hero showcase, school/university social proof, interactive feature demonstrations (Magic Import, AI Tutor, Study Path, Gamified Quizzes), and clear Sign In / Invite Registration CTAs.
- **FR-A2**: Public Deck Directory (`/decks/public`) searchable by keyword, subject category (*Sciences*: Biology, Chemistry, Physics, Math, Computer Science; *Humanities*: History, Business, Economics, Psychology, Philosophy; *Languages*: French, Spanish, Japanese, etc.), and education level, accessible to both unauthenticated visitors (preview mode) and authenticated users (one-click clone/study).

### Module B: Invite-Only Authentication, RBAC & Admin Governance (`/sign-in`, `/sign-up`, `/admin/invitations`)
- **FR-B1**: Fail-closed `invitation-only` account admission (`ACCOUNT_ADMISSION_MODE=invitation-only`). Public registration without a valid, unexpired, unconsumed invitation token is rejected with `403 INVITATION_REQUIRED`.
- **FR-B2**: Single-use, expiring invitation tokens with SHA-256 hashing at rest, normalized email binding, role assignment (`USER`, `CREATOR`, `MODERATOR`, `ADMIN`), revocation, and token rotation.
- **FR-B3**: CLI-only bootstrap administrator creation (`npm run bootstrap:admin`) with zero HTTP bootstrap endpoints.
- **FR-B4**: Comprehensive Admin Governance Console (`/admin/invitations`) to issue new invitations, copy registration links (`/sign-up?token=...`), rotate/revoke pending invites, inspect user statuses, and review the immutable `AuditLog`.

### Module C: AI Study Hub, Academic PDF Upload & AI Tutor Chat (`/chat`, `/chat/[chatId]`)
- **FR-C1**: "What shall we Study?" hub supporting 12 import modalities:
  1. **Upload file** (Academic PDF, PPT, Word, TXT, MD, CSV)
  2. **Paste text / notes**
  3. **YouTube link**
  4. **Record lecture** (browser audio/transcript capture)
  5. **Quizlet import**
  6. **Anki import**
  7. **Google Sheets / CSV**
  8. **Website link**
  9. **Photograph notes**
  10. **Upload audio recording**
  11. **Select existing deck**
  12. **Freeform AI prompt** (*"I want to study..."*)
- **FR-C2**: Uploading an academic PDF (e.g., *Attention Is All You Need*) extracts its sections, formulas, and concepts, creates a persistent AI Tutor Chat (`/chat/[chatId]`), displays an executive summary, and presents 3 interactive Study Activity Cards:
  - **Memorize** (*Generate flashcards* -> saves into a new or existing deck with automatic Subdeck Study Path segmentation)
  - **Note** (*Generate a note* -> creates a rich Study Note in `/notes/[noteId]`)
  - **Step-by-step lesson** (*Start lesson* -> interactive Socratic walkthrough with inline checkpoints)
- **FR-C3**: Multi-turn conversational AI Tutor within `/chat/[chatId]` capable of answering follow-up questions grounded in the uploaded PDF or study material.

### Module D: Rich Study Note Editor (`/notes/[noteId]`)
- **FR-D1**: Full rich-text / Markdown + formula study note workspace featuring:
  - Breadcrumb back to parent Deck (`< deck title >`)
  - Primary CTAs: **`Study`** and **`🪄 Create cards`** (one-click conversion of note sections into flashcards & subdecks)
  - Formatting toolbar: Heading/Text selector, Bold, Italic, Underline, Strikethrough, Bullet/Numbered lists, Formula/Math block, Table, Callout, Audio Record transcript, and **`✨ Generate notes`** AI expansion.

### Module E: Deck Workspace, Subdeck Study Path & Card Editor (`/decks`, `/decks/[deckId]/*`, `/add`)
- **FR-E1**: Three-tab Deck Workspace (`/decks/[deckId]`):
  - **`Path` tab**: Split view with Subdeck list & mastery progress on the left and a winding Duolingo-style interactive **Study Path** roadmap on the right. Clicking any node opens a popover with **`Learn (N cards)`**, **`Memorize`**, and **`Test`**.
  - **`Materials` tab**: Quick-action tiles (`Add import`, `Add notes`, `Add a lesson`, `Add a subdeck`, `Add cards`), list of attached `Notes`, `Lessons`, `Imports` (with `PDF` badge), and full list of `Cards (N)` with inline Cloze/answer pill previews.
  - **`Leaderboard` tab**: Deck-specific XP & accuracy rankings + `Gizmo Live: Play your friends at this deck` launcher.
- **FR-E2**: Manual & Magic Card Editor (`/add` & `/add?deckId=[id]`):
  - Question & Answer editors with **Cloze Deletion highlighting** (wrap selected words or `{{term}}` into interactive fill-in-the-blank pills), custom Multiple-Choice distractors, tags, and instant **Magic Import** side-by-side.

### Module F: Interactive Quiz Engine (`/quiz/[sessionId]`)
- **FR-F1**: Full-screen focused Quiz HUD with progress bar, **Hints (`💡`)**, **Hearts (`❤️`)**, **XP (`⚡`)**, sound toggle, and card edit shortcut.
- **FR-F2**: Supports Multiple-Choice Questions, Cloze Fill-in-the-Blank pills, True/False, and Flashcard Flip/Self-Grade (`Memorize` mode).
- **FR-F3**: Interactive **`💡 Hint`** button (eliminates one wrong distractor and decrements user hints), **`👁️ Reveal`** button (reveals the correct answer immediately), and **`💬 Explain`** button (opens the AI Tutor Explanation Modal with 1-click prompt chips *"Tell me in simpler terms"*, *"Summarize the key point"*, *"What makes this different from other models?"* and custom reply input).
- **FR-F4**: End-of-quiz summary screen awarding XP, Gems, Streak credit, Belt Road progress, and mastery percentage.

### Module G: Social Progress, Belt Road, Gizmonsters, Shop, Study Groups & Gizmo Live
- **FR-G1**: **Social & Progress (`/progress`)**: Weekly streak tracker, Belt Road progress card, Gizmonster showcase, Weekly League standings, Friends & School leaderboards, and learning activity feed.
- **FR-G2**: **Belt Road (`/belt-road`)**: 8-belt martial arts progression (`White`, `Yellow`, `Orange`, `Green`, `Blue`, `Purple`, `Brown`, `Black`) with claimable milestone rewards.
- **FR-G3**: **Gizmonster Collection (`/monster-collection`)**: 92-species monster compendium where users hatch Common/Rare/Legendary Eggs, equip active study companions, and level them up with Essence.
- **FR-G4**: **Shop (`/shop`)**: Spend earned Gems/Coins on Dark Mode, Hints packs, Super Hearts, Streak Freezes, Streak Repairs, Monster Eggs, Essence, and Monster Slots.
- **FR-G5**: **Study Groups (`/conversations`, `/study-groups/create`)**: Create/join study groups with invite links, shared decks, group chat messages, and group XP leaderboards.
- **FR-G6**: **Gizmo Live (`/live`)**: Real-time speed-quiz arena against AI or group opponents on any chosen deck.
- **FR-G7**: **Profile & Settings (`/profile/*`, `/settings/*`, `/subscribe/benefits`)**: User profile header, Gizmonster avatar, school badge, study statistics charts, profile editing, password/security settings, and Gizmo Pro benefits comparison.
