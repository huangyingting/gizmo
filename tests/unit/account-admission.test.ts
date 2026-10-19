import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createOpaqueToken,
  hashOpaqueToken,
  getAdmissionMode,
  bootstrapAdminAccount,
  createAccountInvitation,
  verifyInvitationToken,
  acceptInvitationAndRegisterUser,
  revokeAccountInvitation,
  rotateAccountInvitation,
  AccountAdmissionError,
} from '@/lib/account-admission';
import {
  analyzeMaterialForMagicImport,
  parseStructuredFlashcardPairs,
  extractReadableTextFromPdfBuffer,
} from '@/lib/magic-import';
import { computeNextSm2State } from '@/lib/spaced-repetition';
import { checkRateLimit, clearRateLimitBuckets } from '@/lib/rate-limit';
import zlib from 'node:zlib';

describe('Account Admission & Invite-Only Governance', () => {
  beforeAll(() => {
    process.env.ACCOUNT_ADMISSION_MODE = 'invitation-only';
  });

  it('generates high-entropy invite tokens and deterministic SHA-256 hashes', () => {
    const raw = createOpaqueToken();
    expect(raw.length).toBeGreaterThanOrEqual(32);
    const h1 = hashOpaqueToken(raw);
    const h2 = hashOpaqueToken(`  ${raw}  `);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('defaults to fail-closed invitation-only mode when ACCOUNT_ADMISSION_MODE=invitation-only', () => {
    expect(getAdmissionMode()).toBe('invitation-only');
  });

  it('provisions CLI bootstrap admin and writes BOOTSTRAP_ADMIN_CREATED audit log', async () => {
    const { user: admin } = await bootstrapAdminAccount({
      email: 'admin@gizmo.local',
      password: 'AdminPassword123!',
      name: 'Jack Huang',
    });
    expect(admin.role).toBe('ADMIN');
    expect(admin.status).toBe('ACTIVE');

    const logs = await prisma.auditLog.findMany({
      where: { action: 'BOOTSTRAP_ADMIN_CREATED', targetUserId: admin.id },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('issues, verifies, registers once, and rejects second replay of single-use invitation', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: 'admin@gizmo.local' },
    });

    const uniqueEmail = `student-${Date.now()}@gizmo.local`;
    const { token: rawToken, invitation } = await createAccountInvitation({
      createdByUserId: admin.id,
      email: uniqueEmail,
      role: 'USER',
      ttlHours: 48,
    });

    // Verify before consumption
    const check = await verifyInvitationToken(rawToken);
    expect(check.valid).toBe(true);
    expect(check.invitation?.id).toBe(invitation.id);

    // Reject email mismatch on registration
    await expect(
      acceptInvitationAndRegisterUser({
        token: rawToken,
        email: 'other@gizmo.local',
        password: 'StudentPassword123!',
        name: 'Wrong Email Student',
      })
    ).rejects.toThrowError(AccountAdmissionError);

    // Register student atomically
    const registeredUser = await acceptInvitationAndRegisterUser({
      token: rawToken,
      email: uniqueEmail,
      password: 'StudentPassword123!',
      name: 'Test Student',
      schoolName: 'Nanyang Polytechnic',
    });
    expect(registeredUser.email).toBe(uniqueEmail);
    expect(registeredUser.role).toBe('USER');

    // Attempt replay with the same single-use token -> must fail closed
    await expect(
      acceptInvitationAndRegisterUser({
        token: rawToken,
        email: uniqueEmail,
        password: 'StudentPassword123!',
        name: 'Replay User',
      })
    ).rejects.toThrowError(/already been used/i);
  });

  it('supports invitation revocation and rotation with audit logging', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: 'admin@gizmo.local' },
    });

    const targetEmail = `rotate-${Date.now()}@gizmo.local`;
    const { token: rawToken, invitation } = await createAccountInvitation({
      createdByUserId: admin.id,
      email: targetEmail,
      role: 'USER',
      ttlHours: 24,
    });

    // Rotate invitation
    const rotated = await rotateAccountInvitation({
      invitationId: invitation.id,
      actorUserId: admin.id,
      ttlHours: 48,
    });
    expect(rotated.token).not.toBe(rawToken);

    // Old token must now be invalid (hash replaced)
    const oldCheck = await verifyInvitationToken(rawToken);
    expect(oldCheck.valid).toBe(false);

    // New rotated token is valid until revoked
    const newCheck = await verifyInvitationToken(rotated.token);
    expect(newCheck.valid).toBe(true);

    // Explicitly revoke the invitation
    await revokeAccountInvitation({
      invitationId: rotated.invitation.id,
      actorUserId: admin.id,
    });
    const afterRevoke = await verifyInvitationToken(rotated.token);
    expect(afterRevoke.valid).toBe(false);
    expect(afterRevoke.status).toBe('revoked');
  });
});

describe('Academic PDF Magic Import & 15-Step Study Path Synthesizer', () => {
  it('synthesizes 15 subdecks, Cloze/MCQ flashcards, and Study Note for Attention Is All You Need', () => {
    const synthesized = analyzeMaterialForMagicImport({
      filename: 'attention-is-all-you-need.pdf',
      sourceType: 'PDF',
      rawText:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
    });

    expect(synthesized.subdecks.length).toBe(15);
    expect(synthesized.noteMarkdown).toContain('Scaled Dot-Product & Multi-Head Attention');
    const totalCards = synthesized.subdecks.reduce(
      (acc, s) => acc + s.cards.length,
      0
    );
    expect(totalCards).toBeGreaterThanOrEqual(25);
    expect(synthesized.lessonSteps.length).toBeGreaterThanOrEqual(3);
  });

  it('decompresses FlateDecode PDF streams and parses structured Quizlet/Anki/CSV flashcard pairs', () => {
    const compressedStream = zlib.deflateSync(
      Buffer.from('BT (Self-attention connects all tokens in O(1) operations) Tj ET', 'latin1')
    );
    const pdfMockBuffer = Buffer.concat([
      Buffer.from('%PDF-1.7\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n', 'latin1'),
      compressedStream,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]);
    const extracted = extractReadableTextFromPdfBuffer(pdfMockBuffer, 'lecture-notes.pdf');
    expect(extracted).toContain('Self-attention connects all tokens');

    const pairs = parseStructuredFlashcardPairs(
      'Query Matrix Q :: Projected vector representing current token\nKey Matrix K :: Projected vector matched against queries\nValue Matrix V :: Weighted representation aggregated by attention'
    );
    expect(pairs).toHaveLength(3);

    const ankiAnalysis = analyzeMaterialForMagicImport({
      filename: 'Transformer Matrices',
      sourceType: 'ANKI',
      rawText:
        'Query Matrix Q\tProjected vector representing current token\nKey Matrix K\tProjected vector matched against queries\nValue Matrix V\tWeighted representation aggregated by attention',
    });
    expect(ankiAnalysis.subdecks[0].cards).toHaveLength(3);
    expect(ankiAnalysis.subdecks[0].cards[0].answer).toBe(
      'Projected vector representing current token'
    );
  });
});

describe('SM-2 Spaced Repetition & Sliding-Window Rate Limiter', () => {
  it('computes accurate SM-2 intervals, ease factor, Leitner boxes, and lapse resets', () => {
    const now = new Date('2026-10-19T00:00:00.000Z');
    // 1st correct review without hint -> quality 5, interval 1 day, box 2
    const s1 = computeNextSm2State({}, { isCorrect: true, now });
    expect(s1.quality).toBe(5);
    expect(s1.repetitions).toBe(1);
    expect(s1.intervalDays).toBe(1);
    expect(s1.box).toBe(2);
    expect(s1.easeFactor).toBeGreaterThanOrEqual(2.5);

    // 2nd consecutive correct review -> interval 3 days, box 3
    const s2 = computeNextSm2State(s1, { isCorrect: true, now });
    expect(s2.repetitions).toBe(2);
    expect(s2.intervalDays).toBe(3);
    expect(s2.box).toBe(3);

    // 3rd consecutive correct review -> interval round(3 * EF) >= 8 days, box 4
    const s3 = computeNextSm2State(s2, { isCorrect: true, now });
    expect(s3.repetitions).toBe(3);
    expect(s3.intervalDays).toBeGreaterThanOrEqual(7);
    expect(s3.box).toBe(4);

    // Lapse (incorrect answer) -> resets repetitions to 0, intervalDays to 0 (10m review), increments lapses
    const lapsed = computeNextSm2State(s3, { isCorrect: false, now });
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.box).toBe(3);
  });

  it('enforces sliding-window API rate limits and resets cleanly', () => {
    clearRateLimitBuckets();
    const r1 = checkRateLimit({ key: 'test:ip', limit: 2, windowMs: 60_000 });
    const r2 = checkRateLimit({ key: 'test:ip', limit: 2, windowMs: 60_000 });
    const r3 = checkRateLimit({ key: 'test:ip', limit: 2, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    clearRateLimitBuckets();
  });
});

