# 00 — Playwright Exploration Coverage, Screenshots & Observed Behavior Report

## 1. Executive Summary

Using Playwright (headless Chromium) and the credentials in `/home/azadmin/gizmo/.cred`, we systematically explored both **`https://gizmo.ai`** (marketing & public entry points) and **`https://app.gizmo.ai`** (the full authenticated AI learning platform) across desktop (`1440×900`) and mobile (`390×844`) viewports.

To test the core AI document-to-learning pipeline end-to-end, we downloaded the 5-page arXiv academic paper ***"Attention Is All You Need"*** (`https://arxiv.org/pdf/1706.03762.pdf`, Vaswani et al.) and uploaded it through Gizmo's live file importer. We captured **89 screenshots** in `/home/azadmin/gizmo/screenshots/` and logged over **95 distinct backend REST/RPC endpoints** across `proxy.gizmo.ai`, `ai.gizmo.ai`, and `coeus.gizmo.ai`.

---

## 2. Authentication & Session Mechanics Discovered

1. **Cookie Layer (`.cred`)**:
   - `gizmo_jwt`: RS256-signed JWT on `.gizmo.ai` (`uid: 19957765`, `exp: 1792367871`, `idp: "firebase"`).
   - `gizmo_loggedin=true`: Hint cookie read by `https://gizmo.ai` to redirect logged-in visitors from the marketing site to `https://app.gizmo.ai`.
2. **Client Storage Layer (`app.gizmo.ai`)**:
   - `app.gizmo.ai` is an Expo Router / React Native Web SPA that persists auth state in `localStorage` under the MMKV key `gizmo.secure.store\gizmo.auth.token.production`.
   - On startup, `initializeAuthState()` parses `{ jwt, impersonationJwt, jwtExpiresAt, user, userUpdatedAt }`. When `idp === "better_auth"` in the client token and `impersonationJwt` holds the RS256 `gizmo_jwt`, `ensureValidJWT()` attaches `Authorization: Bearer <gizmo_jwt>` to all `https://proxy.gizmo.ai/*` requests.
   - Authenticated profile resolved via `POST https://proxy.gizmo.ai/api/get_user`:
     - **Name**: `Jack Huang` (`user_id: 19957765`, `user_handle: "OptimisticPlaice99276"`)
     - **Institution**: `Nanyang Polytechnic` (`school_id: 1441438`)
     - **Balances**: `250 Gems/Coins`, `5 Hearts`, `5 Hints`, `15 XP`, `White Belt`

---

## 3. Route Inventory & Exploration Coverage Matrix

| Category | Route / URL Pattern | Auth State | Desktop (`1440×900`) | Mobile (`390×844`) | Screenshot Reference(s) |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Marketing Landing** | `https://gizmo.ai/` | Unauthed | Covered | Covered | `01-marketing-landing-desktop.png`, `02-marketing-landing-mobile.png` |
| **Sign Up** | `https://app.gizmo.ai/sign-up` | Unauthed | Covered | Covered | `03-auth-signup-desktop.png` |
| **Sign In & Error State** | `https://app.gizmo.ai/sign-in` | Unauthed | Covered | Covered | `04-auth-signin-desktop.png`, `08-auth-signin-error-state.png` |
| **Forgot Password** | `https://app.gizmo.ai/forgot-password` | Unauthed | Covered | Covered | `05-auth-forgot-password.png` |
| **404 Not Found** | `https://app.gizmo.ai/non-existent-route-404` | Both | Covered | Covered | `07-not-found-404.png` |
| **Home / AI Study Hub** | `https://app.gizmo.ai/chat` | Authed | Covered | Covered | `09-authed-home-chat.png`, `10-home-see-more-options.png`, `35a-mobile-home-chat.png` |
| **Magic Import / Add Cards** | `https://app.gizmo.ai/add` & `/add?deckId=[id]` | Authed | Covered | Covered | `11-add-page.png`, `21a-add-to-deck-page.png` |
| **AI Tutor Chat (PDF Upload)** | `https://app.gizmo.ai/chat/[chatId]` | Authed | Covered | Covered | `12-pdf-upload-step-1.png` .. `12-pdf-upload-step-6.png`, `13a`, `13b`, `14` |
| **AI Study Note Editor** | `https://app.gizmo.ai/notes/[noteId]` | Authed | Covered | Covered | `15b-pdf-note-generated.png`, `16-pdf-deck-generation-step-2.png`, `20a` |
| **My Decks List** | `https://app.gizmo.ai/decks` | Authed | Covered | Covered | `18-my-decks-list.png` |
| **Deck Detail — Study Path** | `https://app.gizmo.ai/decks/[deckId]/path` | Authed | Covered | Covered | `20b-create-cards-step-2.png`, `22b-deck-populated-path.png`, `35b-mobile-deck-path.png` |
| **Deck Detail — Materials & Cards** | `https://app.gizmo.ai/decks/[deckId]/materials` | Authed | Covered | Covered | `19a-deck-detail-overview.png`, `22a`, `23a-deck-materials-populated.png` |
| **Deck Detail — All Cards** | `https://app.gizmo.ai/decks/[deckId]/all-cards` | Authed | Covered | Covered | `19b-deck-detail-all-cards.png` |
| **Deck Detail — Leaderboard** | `https://app.gizmo.ai/decks/[deckId]/leaderboard` | Authed | Covered | Covered | `19e-deck-detail-leaderboard.png` |
| **Interactive Quiz Session** | `https://app.gizmo.ai/quiz/[userGameId]` | Authed | Covered | Covered | `24b-quiz-interaction-1.png`, `37d-quiz-play-1.png` .. `37d-quiz-play-10.png` |
| **Quiz AI Explain & Hints** | `https://app.gizmo.ai/quiz/[userGameId]` (modals) | Authed | Covered | Covered | `39a-quiz-answer-feedback.png`, `39b-quiz-ai-explain-modal.png`, `39c-quiz-hint-used.png` |
| **Social / Progress / Leagues** | `https://app.gizmo.ai/progress` | Authed | Covered | Covered | `25-social-progress-tab.png`, `35c-mobile-social-progress.png` |
| **Belt Road Progression** | `https://app.gizmo.ai/belt-road` | Authed | Covered | Covered | `26-belt-road.png` |
| **Gizmonster Collection** | `https://app.gizmo.ai/monster-collection` | Authed | Covered | Covered | `27-monster-collection.png` |
| **In-App Shop (Gems & Powerups)** | `https://app.gizmo.ai/shop` | Authed | Covered | Covered | `28-shop.png`, `36a-gem-shop-popover.png` |
| **Public Decks & Category Drill-Down** | `https://app.gizmo.ai/decks/public` | Both | Covered | Covered | `06-public-decks-unauthed.png`, `29a-public-decks-authed.png`, `38-public-decks-biology-category.png` |
| **Study Groups & Create Group** | `https://app.gizmo.ai/conversations`, `/study-groups/create` | Authed | Covered | Covered | `30a-study-groups-conversations.png`, `30b-study-groups-create.png` |
| **Gizmo Live Multiplayer Arena** | `https://app.gizmo.ai/live` | Authed | Covered | Covered | `31-gizmo-live.png` |
| **Profile & Statistics** | `https://app.gizmo.ai/profile`, `/profile/stats`, `/profile/edit` | Authed | Covered | Covered | `32a-profile-overview.png`, `32b-profile-stats.png`, `32d-profile-edit.png`, `35e-mobile-profile.png` |
| **Settings & Security** | `https://app.gizmo.ai/settings/*` | Authed | Covered | Covered | `33a-settings-main.png`, `33b-settings-account-info.png`, `33c-settings-security.png` |
| **Gizmo Pro Subscription** | `https://app.gizmo.ai/subscribe/benefits` | Authed | Covered | Covered | `34-subscribe-pro-benefits.png` |

---

## 4. Detailed Workflow Observations

### 4.1 Academic PDF Upload -> AI Tutor Chat -> Study Notes -> 15-Step Flashcard Deck
1. **Initiation**: From `/chat` ("What shall we Study?"), clicking **`Upload file (PDF, PPT...)`** opens a native file chooser accepting `.pdf,.pptx,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.rtf,.html,.epub`.
2. **Upload & Deduplication**:
   - Uploading `/tmp/gizmo-explore/attention-is-all-you-need.pdf` computes a SHA-256 content hash (`bdfaa68d8984f0dc02beaca527b76f207d99b666d31d1da728ee0728182df697`) and calls `POST /assets/v3/resolve-upload`.
   - Next, `POST /ai-tutor/create-chat` creates chat session `55c3230e0b14bb6819a8cc0c0d5960329fde4410bde119e9a744916992e227fa` with title `"attention is all you need"`.
3. **AI Tutor Synthesis & Activity Cards (`12-pdf-upload-step-6.png`)**:
   - Displays the attached PDF badge on the right and an AI summary on the left: *"📄 The main topic is the Transformer architecture, especially self-attention and how Transformers process sequences. You can study it by turning the paper into flashcards, making a concise set of notes, or working through a guided lesson."*
   - Presents three interactive study mode cards:
     - **Memorize** (*Generate flashcards* -> CTA `Start memorizing`)
     - **Note** (*Generate a note* -> CTA `Generate note`)
     - **Step-by-step lesson** (*attention is all you need* -> CTA `Start lesson`)
4. **AI Study Note Generation (`15b-pdf-note-generated.png`, `20a-note-create-cards-modal.png`)**:
   - Clicking **`Generate note`** creates a deck (`deckId=110614490`, `"attention is all you need"`) and streams a structured Markdown/LaTeX study note (`/notes/01a15114-b0e8-7752-a972-c7e45c330b37`) containing `Overview`, `Key points`, `Motivation and background`, mathematical equations (`Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V`, `MultiHead(Q,K,V)`, `LayerNorm(x + Sublayer(x))`), and a rich-text toolbar (`Text`, `B`, `I`, `U`, `S`, lists, LaTeX math `Σ`, table, image, audio `Record`, and `Generate notes`).
5. **Automatic Flashcard & Subdeck Study Path Generation (`22a`, `22b`, `23a`)**:
   - Clicking **`Create cards`** -> **`Save`** invokes `POST /magic-import/2026-05-01/start` and streams **91 flashcards** organized automatically into **15 logical subdecks** along a Duolingo-style winding **Study Path**:
     1. *Transformer principles and advantages* (6 cards)
     2. *Sequential, convolutional, and self-attention models* (6 cards)
     3. *Encoder structure* (5 cards)
     4. *Decoder structure and causal masking* (6 cards)
     5. *Scaled dot-product attention* (5 cards)
     6. *Multi-head attention* (6 cards)
     7. *Attention patterns and uses* (6 cards)
     8. *Position-wise feed-forward networks* (4 cards)
     9. *Embeddings and positional encodings* (7 cards)
     10. *Comparing layer types* (7 cards)
     11. *Long-range dependencies and attention restrictions* (5 cards)
     12. *Data, hardware, and optimization* (8 cards)
     13. *Dropout, label smoothing, and decoding* (6 cards)
     14. *Machine-translation results and ablations* (8 cards)
     15. *Constituency parsing and broader significance* (6 cards)

### 4.2 Interactive Quiz & Spaced-Repetition Gameplay (`/quiz/[userGameId]`)
- **Mode Selection Popover (`24b-quiz-interaction-1.png`)**: Clicking any node on the Study Path opens a popover with:
  - **`Learn`** (`6 cards` — adaptive mix of multiple-choice, cloze fill-in-the-blank, and active recall)
  - **`Memorize`** (rapid flashcard flip & self-grading)
  - **`Test`** (`🔒 Complete all lessons to unlock`)
- **Quiz HUD (`37d-quiz-play-1.png` .. `37d-quiz-play-10.png`)**:
  - Top bar: Close `×`, Share, Deck breadcrumb, Sound toggle, Edit card pencil, **Hints counter (`💡 5`)**, **Hearts counter (`❤️ 5`)**, **XP counter (`⚡ 15`)**, and segmented progress bar.
  - Question card: Displays topic pill (`Transformer principles and advantages`), `New` badge, question prompt (either direct question or Cloze blank `_`), and 3–4 multiple-choice options.
  - Bottom utility bar: **`💡 Hint`** (crosses out a wrong option and decrements hint count, `39c-quiz-hint-used.png`), **`👁️ Reveal`** (highlights the green correct option and reveals the answer), and **`💬 Explain`** (opens the AI Tutor explanation modal with follow-up prompt chips and chat input, `39b-quiz-ai-explain-modal.png`).

### 4.3 Gamification, Social, Multiplayer & Progression
- **Social / Progress (`/progress`, `25-social-progress-tab.png`)**:
  - Daily Streak calendar (`Su Mo Tu We Th Fr Sa`), **Belt Road** banner (`White Belt - Belting up...`), **Gizmonster Collection** (`1 / 92`), **Study League** (`Complete 1 quiz to join this week's league`), **Leaderboard** (`Friends` | `Nanyang Polytechnic`), and **Activity Feed**.
- **Belt Road (`/belt-road`, `26-belt-road.png`)**:
  - Martial-arts-inspired rank progression (`White Belt` -> `Yellow Belt` -> `Orange Belt` -> `Green Belt` -> `Blue Belt` -> `Purple Belt` -> `Brown Belt` -> `Black Belt`), unlocking milestone chests (`250 Gems`, `Rare Eggs`, `Essence`) as the user completes quizzes.
- **Gizmonster Collection (`/monster-collection`, `27-monster-collection.png`)**:
  - Collectible study companions hatched from Common/Rare/Legendary Eggs and leveled up with Essence (`2 slots available`, `92 total monsters`).
- **Shop (`/shop`, `28-shop.png`)**:
  - Spend Coins/Gems on **Dark Mode** (`75`), **Hints** (`x5=75, x10=125, x25=250`), **Super Hearts** (`x5=1,000`), **Streak Freezes** (`x1=200`), **Streak Repairs** (`x1=300`), **Monster Eggs** (`Common=1,500, Rare=10,000, Legendary=20,000`), **Essence**, and **Monster Slots** (`500`).
- **Gizmo Live (`/live`, `31-gizmo-live.png`)**:
  - Real-time head-to-head or group quiz battle mode (`Play vs a friend`, `Select a deck`, live opponent matchmaking and scoreboard).
- **Study Groups (`/conversations`, `/study-groups/create`, `30a`, `30b`)**:
  - Create or join collaborative study groups with shared decks, group chat, and group leaderboards.
