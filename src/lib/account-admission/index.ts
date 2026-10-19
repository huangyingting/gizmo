import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export type UserRole = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
export const VALID_ROLES: UserRole[] = ['USER', 'CREATOR', 'MODERATOR', 'ADMIN'];

export class AccountAdmissionError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeAccountEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  const norm = normalizeAccountEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm);
}

export function getAdmissionMode(): 'invitation-only' | 'closed' {
  const mode = (process.env.ACCOUNT_ADMISSION_MODE || '').trim().toLowerCase();
  if (mode === 'invitation-only') {
    return 'invitation-only';
  }
  return 'closed';
}

export function assertInvitationOnlyMode(): void {
  if (getAdmissionMode() !== 'invitation-only') {
    throw new AccountAdmissionError(
      403,
      'ADMISSION_CLOSED',
      'Account registration is closed. ACCOUNT_ADMISSION_MODE must be set to "invitation-only".'
    );
  }
}

export function createOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function generateUserHandle(nameOrEmail: string): string {
  const base = (nameOrEmail.split('@')[0] || 'Scholar')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 14);
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `${base || 'Scholar'}${suffix}`;
}

export async function writeAuditLog(params: {
  action: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      action: params.action,
      actorUserId: params.actorUserId ?? null,
      targetUserId: params.targetUserId ?? null,
      targetEmail: params.targetEmail ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadataJson: JSON.stringify(params.metadata ?? {}),
    },
  });
}

export async function createAccountInvitation(input: {
  email: string;
  role?: UserRole;
  createdByUserId?: string | null;
  ttlHours?: number;
  note?: string;
}) {
  const normalizedEmail = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(normalizedEmail)) {
    throw new AccountAdmissionError(400, 'INVALID_EMAIL', 'Please enter a valid email address.');
  }

  const role: UserRole =
    input.role && VALID_ROLES.includes(input.role) ? input.role : 'USER';
  const ttlHours =
    input.ttlHours && input.ttlHours > 0
      ? input.ttlHours
      : Number(process.env.INVITATION_TTL_HOURS || '168');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  const rawToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  return prisma.$transaction(async (tx) => {
    // Clear activeForEmail on any already-expired pending invitations for this email
    await tx.accountInvitation.updateMany({
      where: {
        activeForEmail: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { lte: now },
      },
      data: {
        activeForEmail: null,
      },
    });

    const existingUser = await tx.user.findUnique({
      where: { normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new AccountAdmissionError(
        409,
        'USER_ALREADY_EXISTS',
        'An account with this email address already exists.'
      );
    }

    const activeInvite = await tx.accountInvitation.findUnique({
      where: { activeForEmail: normalizedEmail },
      select: { id: true },
    });
    if (activeInvite) {
      throw new AccountAdmissionError(
        409,
        'INVITATION_ALREADY_ACTIVE',
        'An active pending invitation already exists for this email address.'
      );
    }

    const invitation = await tx.accountInvitation.create({
      data: {
        email: input.email.trim(),
        normalizedEmail,
        activeForEmail: normalizedEmail,
        role,
        tokenHash,
        expiresAt,
        createdByUserId: input.createdByUserId ?? null,
        note: input.note?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'INVITE_CREATED',
        actorUserId: input.createdByUserId ?? null,
        targetEmail: normalizedEmail,
        metadataJson: JSON.stringify({
          invitationId: invitation.id,
          role,
          expiresAt: expiresAt.toISOString(),
        }),
      },
    });

    return {
      invitation,
      token: rawToken,
      inviteUrl: `/sign-up?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`,
    };
  });
}

export async function verifyInvitationToken(rawToken: string) {
  if (!rawToken || !rawToken.trim()) {
    return { valid: false, status: 'invalid' as const, reason: 'Missing invitation token.' };
  }
  const tokenHash = hashOpaqueToken(rawToken);
  const invitation = await prisma.accountInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return { valid: false, status: 'invalid' as const, reason: 'Invitation token was not found.' };
  }
  if (invitation.revokedAt) {
    return {
      valid: false,
      status: 'revoked' as const,
      reason: 'This invitation has been revoked by an administrator.',
      email: invitation.normalizedEmail,
    };
  }
  if (invitation.acceptedAt) {
    return {
      valid: false,
      status: 'accepted' as const,
      reason: 'This single-use invitation has already been redeemed.',
      email: invitation.normalizedEmail,
    };
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    return {
      valid: false,
      status: 'expired' as const,
      reason: 'This invitation has expired.',
      email: invitation.normalizedEmail,
    };
  }

  return {
    valid: true,
    status: 'pending' as const,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      normalizedEmail: invitation.normalizedEmail,
      maskedEmail: maskEmail(invitation.normalizedEmail),
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  };
}

export async function acceptInvitationAndRegisterUser(input: {
  token: string;
  email: string;
  name: string;
  password: string;
  schoolName?: string;
}) {
  assertInvitationOnlyMode();

  const normalizedEmail = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(normalizedEmail)) {
    throw new AccountAdmissionError(400, 'INVALID_EMAIL', 'Please enter a valid email address.');
  }
  if (!input.password || input.password.length < 8) {
    throw new AccountAdmissionError(
      400,
      'WEAK_PASSWORD',
      'Password must be at least 8 characters long.'
    );
  }
  if (!input.token || !input.token.trim()) {
    throw new AccountAdmissionError(
      403,
      'INVITATION_REQUIRED',
      'A valid single-use invitation code is required to register.'
    );
  }

  const tokenHash = hashOpaqueToken(input.token);
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.accountInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new AccountAdmissionError(403, 'INVALID_INVITATION', 'Invalid invitation code.');
    }
    if (invitation.revokedAt) {
      throw new AccountAdmissionError(
        403,
        'INVITATION_REVOKED',
        'This invitation has been revoked.'
      );
    }
    if (invitation.acceptedAt) {
      throw new AccountAdmissionError(
        409,
        'INVITATION_ALREADY_USED',
        'This single-use invitation has already been used.'
      );
    }
    if (invitation.expiresAt.getTime() <= now.getTime()) {
      throw new AccountAdmissionError(403, 'INVITATION_EXPIRED', 'This invitation has expired.');
    }
    if (invitation.normalizedEmail !== normalizedEmail) {
      throw new AccountAdmissionError(
        403,
        'EMAIL_MISMATCH',
        'The email address does not match the recipient of this invitation.'
      );
    }

    const existingUser = await tx.user.findUnique({
      where: { normalizedEmail },
    });
    if (existingUser) {
      throw new AccountAdmissionError(
        409,
        'USER_ALREADY_EXISTS',
        'An account with this email already exists.'
      );
    }

    // Atomic conditional update to prevent race-condition double redemption
    const consumed = await tx.accountInvitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        acceptedAt: now,
        activeForEmail: null,
      },
    });

    if (consumed.count !== 1) {
      throw new AccountAdmissionError(
        409,
        'INVITATION_RACE_CONFLICT',
        'Invitation could not be redeemed because its state changed concurrently.'
      );
    }

    const displayName = input.name?.trim() || normalizedEmail.split('@')[0] || 'Scholar';
    const handle = generateUserHandle(displayName);

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
        name: displayName,
        handle,
        schoolName: input.schoolName?.trim() || 'Nanyang Polytechnic',
        passwordHash,
        role: invitation.role,
        status: 'ACTIVE',
        emailVerified: now,
        gems: 250,
        hearts: 5,
        hints: 5,
        xp: 15,
        streakDays: 1,
        beltRank: 'White Belt',
      },
    });

    await tx.passwordCredential.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });

    await tx.accountInvitation.update({
      where: { id: invitation.id },
      data: { acceptedByUserId: user.id },
    });

    // Grant starter Gizmonster companion
    await tx.monsterOwnership.create({
      data: {
        userId: user.id,
        monsterCode: 'ember-dragon',
        name: 'Pyroblit',
        emoji: '🐉',
        element: 'Fire',
        rarity: 'COMMON',
        level: 1,
        essenceXp: 10,
        isEquipped: true,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'INVITE_ACCEPTED',
        actorUserId: user.id,
        targetUserId: user.id,
        targetEmail: normalizedEmail,
        metadataJson: JSON.stringify({
          invitationId: invitation.id,
          assignedRole: invitation.role,
        }),
      },
    });

    return user;
  });
}

export async function revokeAccountInvitation(input: {
  invitationId: string;
  actorUserId?: string | null;
}) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.accountInvitation.findUnique({
      where: { id: input.invitationId },
    });
    if (!invitation) {
      throw new AccountAdmissionError(404, 'NOT_FOUND', 'Invitation not found.');
    }
    if (invitation.acceptedAt) {
      throw new AccountAdmissionError(
        409,
        'ALREADY_ACCEPTED',
        'Cannot revoke an invitation that has already been accepted.'
      );
    }

    const updated = await tx.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        revokedAt: now,
        activeForEmail: null,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'INVITE_REVOKED',
        actorUserId: input.actorUserId ?? null,
        targetEmail: invitation.normalizedEmail,
        metadataJson: JSON.stringify({ invitationId: invitation.id }),
      },
    });

    return updated;
  });
}

export async function rotateAccountInvitation(input: {
  invitationId: string;
  actorUserId?: string | null;
  ttlHours?: number;
}) {
  const now = new Date();
  const ttlHours =
    input.ttlHours && input.ttlHours > 0
      ? input.ttlHours
      : Number(process.env.INVITATION_TTL_HOURS || '168');
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  const rawToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.accountInvitation.findUnique({
      where: { id: input.invitationId },
    });
    if (!invitation) {
      throw new AccountAdmissionError(404, 'NOT_FOUND', 'Invitation not found.');
    }
    if (invitation.acceptedAt || invitation.revokedAt) {
      throw new AccountAdmissionError(
        409,
        'INVALID_STATE',
        'Only pending invitations can be rotated.'
      );
    }

    const updated = await tx.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash,
        expiresAt,
        activeForEmail: invitation.normalizedEmail,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'INVITE_ROTATED',
        actorUserId: input.actorUserId ?? null,
        targetEmail: invitation.normalizedEmail,
        metadataJson: JSON.stringify({
          invitationId: invitation.id,
          newExpiresAt: expiresAt.toISOString(),
        }),
      },
    });

    return {
      invitation: updated,
      token: rawToken,
      inviteUrl: `/sign-up?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(invitation.normalizedEmail)}`,
    };
  });
}

/**
 * CLI-only bootstrap administrator provisioning.
 * Security Invariant: Never exposed over any HTTP route.
 */
export async function bootstrapAdminAccount(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const normalizedEmail = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(normalizedEmail)) {
    throw new AccountAdmissionError(400, 'INVALID_EMAIL', 'Invalid bootstrap admin email.');
  }
  if (!input.password || input.password.length < 8) {
    throw new AccountAdmissionError(
      400,
      'WEAK_PASSWORD',
      'Bootstrap admin password must be at least 8 characters.'
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const displayName = input.name?.trim() || 'Jack Huang';

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { normalizedEmail },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: existing.emailVerified ?? now,
          },
        })
      : await tx.user.create({
          data: {
            email: normalizedEmail,
            normalizedEmail,
            name: displayName,
            handle: 'OptimisticPlaice99276',
            schoolName: 'Nanyang Polytechnic',
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: now,
            gems: 250,
            hearts: 5,
            hints: 5,
            xp: 15,
            streakDays: 1,
            beltRank: 'White Belt',
          },
        });

    await tx.passwordCredential.upsert({
      where: { userId: user.id },
      create: { userId: user.id, passwordHash },
      update: { passwordHash },
    });

    await tx.monsterOwnership.upsert({
      where: {
        userId_monsterCode: {
          userId: user.id,
          monsterCode: 'ember-dragon',
        },
      },
      create: {
        userId: user.id,
        monsterCode: 'ember-dragon',
        name: 'Pyroblit',
        emoji: '🐉',
        element: 'Fire',
        rarity: 'COMMON',
        level: 1,
        essenceXp: 10,
        isEquipped: true,
      },
      update: {},
    });

    await tx.auditLog.create({
      data: {
        action: 'BOOTSTRAP_ADMIN_CREATED',
        actorUserId: user.id,
        targetUserId: user.id,
        targetEmail: normalizedEmail,
        metadataJson: JSON.stringify({
          created: !existing,
          role: 'ADMIN',
          method: 'CLI_BOOTSTRAP',
        }),
      },
    });

    return { user, created: !existing };
  });
}
