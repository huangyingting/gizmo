import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe('Gizmo AI Study Studio — Full E2E Parity & Invite-Only Governance Suite', () => {
  test('1. Marketing Landing Page, Healthcheck Readiness & Fail-Closed Invite-Only Sign-Up Enforcement', async ({
    page,
    request,
  }) => {
    // Verify production healthcheck endpoint
    const healthRes = await request.get('/api/health');
    expect(healthRes.ok()).toBe(true);
    const healthJson = await healthRes.json();
    expect(healthJson.ok).toBe(true);
    expect(healthJson.status).toBe('healthy');
    expect(healthJson.database.connected).toBe(true);

    // Verify route protection proxy redirects unauthenticated users away from /admin/invitations
    await page.goto('/admin/invitations');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fadmin%2Finvitations/);

    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: /The easiest way to remember everything you learn/i,
      })
    ).toBeVisible();

    // Navigate to /sign-up without a valid invite code and verify fail-closed rejection
    await page.goto('/sign-up');
    await expect(
      page.getByRole('heading', { name: /Create your account/i })
    ).toBeVisible();

    await page
      .getByPlaceholder('Paste single-use invitation code')
      .fill('INVALID-TOKEN-0000');
    await page.getByPlaceholder('Your name').fill('Unauthorized User');
    await page
      .getByPlaceholder('you@university.edu')
      .fill('unauth@gizmo.local');
    await page
      .getByPlaceholder('Create a strong password')
      .fill('Password123!');
    await page
      .getByRole('button', { name: /Accept Invite & Sign Up/i })
      .click();

    await expect(page.getByText(/Invalid invitation code/i)).toBeVisible();
  });

  test('2. Admin Login -> Issue Single-Use Invite -> Register Student -> Reject Replay', async ({
    page,
    context,
  }) => {
    await page.goto('/sign-in');
    await page.getByPlaceholder('Enter your email').fill('admin@gizmo.local');
    await page
      .getByPlaceholder('Enter your password')
      .fill('AdminPassword123!');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/chat/);
    await expect(
      page.getByRole('heading', { name: /What shall we/i })
    ).toBeVisible();

    // Open Admin Invitation Governance Console
    await page.goto('/admin/invitations');
    await expect(
      page.getByRole('heading', {
        name: /Invite-Only Admission & Audit Governance/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: /Registered Accounts & Role Governance/i,
      })
    ).toBeVisible();

    const studentEmail = `e2e-student-${Date.now()}@gizmo.local`;
    await page
      .getByPlaceholder('student@university.edu')
      .fill(studentEmail);
    await page.getByRole('button', { name: /Issue Invitation/i }).click();

    const rawTokenEl = page.getByTestId('raw-invite-token');
    await expect(rawTokenEl).toBeVisible();
    const rawToken = (await rawTokenEl.innerText()).trim();
    expect(rawToken.length).toBeGreaterThanOrEqual(20);

    // Use a separate clean browser page to register the invited student
    await context.clearCookies();
    const studentPage = await context.newPage();

    await studentPage.goto(
      `/sign-up?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(studentEmail)}`
    );
    await expect(
      studentPage.getByText(/Valid invitation for/i)
    ).toBeVisible();

    await studentPage.getByPlaceholder('Your name').fill('E2E Scholar');
    await studentPage
      .getByPlaceholder('Create a strong password')
      .fill('ScholarPass123!');
    await studentPage
      .getByRole('button', { name: /Accept Invite & Sign Up/i })
      .click();

    // Should auto-sign-in and redirect to /chat
    await expect(studentPage).toHaveURL(/\/chat/);

    // Verify replay protection: attempting to use the same single-use code again fails closed
    await context.clearCookies();
    await studentPage.goto(`/sign-up?token=${encodeURIComponent(rawToken)}`);
    await expect(
      studentPage.getByText(/already been redeemed/i)
    ).toBeVisible();
    await studentPage.close();
  });

  test('3. Academic PDF Upload (attention-is-all-you-need.pdf) -> AI Chat -> Study Note -> 15-Step Study Path -> Live Quiz', async ({
    page,
  }) => {
    // Log in as Admin
    await page.goto('/sign-in');
    await page.getByPlaceholder('Enter your email').fill('admin@gizmo.local');
    await page
      .getByPlaceholder('Enter your password')
      .fill('AdminPassword123!');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/chat/);

    // Upload the real academic PDF `public/samples/attention-is-all-you-need.pdf`
    const pdfPath = path.join(
      process.cwd(),
      'public',
      'samples',
      'attention-is-all-you-need.pdf'
    );
    const fileInput = page.getByTestId('pdf-file-input');
    await fileInput.setInputFiles(pdfPath);

    // Should navigate to /chat/[chatId] with the 3 Study Activity Cards
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 30000 });
    await expect(page.getByText('Generate flashcards')).toBeVisible();
    await expect(page.getByText('Generate a note')).toBeVisible();
    await expect(page.getByText('Step-by-step lesson')).toBeVisible();

    // Test Step-by-Step AI Lesson modal
    await page.getByText('Step-by-step lesson').click();
    await page.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.getByText(/Quick Check/i)).toBeVisible();
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.getByRole('button', { name: 'Finish & Create Flashcards' }).click();

    // "Save cards into" modal should appear -> click Save to generate 15-step deck
    await expect(page.getByText('Save cards into')).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();

    // Should land on /decks/[deckId]/path with 15 Duolingo-style stepping stones
    await expect(page).toHaveURL(/\/decks\/.+\/path/, { timeout: 30000 });
    await expect(
      page.getByText('Transformer principles and advantages')
    ).toBeVisible();
    await expect(
      page.getByText('Constituency parsing and broader significance')
    ).toBeVisible();

    // Check Materials tab -> Cards & Cloze highlights
    await page.getByRole('link', { name: 'Materials' }).click();
    await expect(page).toHaveURL(/\/decks\/.+\/materials/);
    await expect(page.getByRole('button', { name: /Cards \(/i })).toBeVisible();

    // Launch interactive Quiz from the Deck Study button in <main>
    await page
      .locator('main')
      .getByRole('button', { name: 'Study' })
      .first()
      .click();
    await expect(page).toHaveURL(/\/quiz\/.+/, { timeout: 30000 });

    // Verify Quiz HUD: Hint, Reveal, Explain AI Tutor modal
    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible();
    await page.getByRole('button', { name: 'Hint' }).click();
    await page.getByRole('button', { name: 'Reveal' }).click();

    // Post-answer bar should show Explain & Continue
    await expect(page.getByRole('button', { name: 'Explain' })).toBeVisible();
    await page.getByRole('button', { name: 'Explain' }).click();
    await expect(
      page.getByRole('button', { name: 'Tell me in simpler terms' })
    ).toBeVisible();
  });

  test('4. Gamification, Social, Public Decks, Study Groups, Gizmo Live, Profile & Mobile Responsive Layout', async ({
    page,
  }) => {
    await page.goto('/sign-in');
    await page.getByPlaceholder('Enter your email').fill('admin@gizmo.local');
    await page
      .getByPlaceholder('Enter your password')
      .fill('AdminPassword123!');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/chat/);

    // Social / Progress
    await page.goto('/progress');
    await expect(page.getByText(/day streak/i)).toBeVisible();
    await expect(page.getByText(/Weekly Quest/i)).toBeVisible();

    // Belt Road: Equip & Claim unlocked belt
    await page.goto('/belt-road');
    await expect(
      page.getByRole('heading', { name: 'Belt Road' })
    ).toBeVisible();
    await expect(page.getByText('Black Belt')).toBeVisible();
    const claimBtn = page.getByRole('button', { name: 'Equip & Claim' }).first();
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.getByText(/Equipped/i).first()).toBeVisible();
    }

    // Monster Collection: Click unlocked monster to equip
    await page.goto('/monster-collection');
    await expect(
      page.getByRole('heading', { name: 'Monster collection' })
    ).toBeVisible();

    // Shop: Purchase Streak Freeze and verify confirmation
    await page.goto('/shop');
    await expect(page.getByText('Streak Freeze')).toBeVisible();
    await page.getByRole('button', { name: /Buy for/i }).first().click();
    await expect(page.getByText(/Purchased Streak Freeze/i)).toBeVisible();

    // Public Decks: Clone a public deck ("Save to My Decks")
    await page.goto('/decks/public');
    await expect(
      page.getByRole('heading', { name: 'Public decks' })
    ).toBeVisible();
    const cloneBtn = page.getByRole('button', { name: 'Save to My Decks' }).first();
    if (await cloneBtn.isVisible()) {
      await cloneBtn.click();
      await expect(page).toHaveURL(/\/decks\/.+\/path/, { timeout: 20000 });
    }

    // Study Groups
    await page.goto('/conversations');
    await expect(
      page.getByRole('heading', { name: 'Study groups' })
    ).toBeVisible();

    // Gizmo Live: Host arena & answer speed round question
    await page.goto('/live');
    await expect(
      page.getByRole('heading', { name: /Gizmo Live/i })
    ).toBeVisible();
    await expect(page.getByText(/Room PIN:/i)).toBeVisible();
    await page.getByRole('button', { name: 'Host New Arena' }).click();
    await expect(page.getByText(/Live Battle Active/i)).toBeVisible();

    // Profile Stats & Friends Cheer
    await page.goto('/profile/stats');
    await expect(page.getByText('Recall Accuracy')).toBeVisible();
    await page.goto('/profile/friends');
    const cheerBtn = page.getByRole('button', { name: /Cheer/i }).first();
    if (await cheerBtn.isVisible()) {
      await cheerBtn.click();
      await expect(page.getByText(/Cheered!/i)).toBeVisible();
    }

    // Mobile Responsive Viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/chat');
    await expect(
      page.getByRole('heading', { name: /What shall we/i })
    ).toBeVisible();
  });
});
