import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import {
  AccountAdmissionError,
  revokeAccountInvitation,
  rotateAccountInvitation,
  VALID_ROLES,
  writeAuditLog,
  type UserRole,
} from '@/lib/account-admission';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Administrator privileges required.' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'revoke') {
      const updated = await revokeAccountInvitation({
        invitationId: id,
        actorUserId: admin.id,
      });
      return NextResponse.json({ ok: true, invitation: updated });
    }

    if (action === 'rotate') {
      const rotated = await rotateAccountInvitation({
        invitationId: id,
        actorUserId: admin.id,
        ttlHours: body.ttlHours ? Number(body.ttlHours) : undefined,
      });
      return NextResponse.json({
        ok: true,
        invitation: rotated.invitation,
        token: rotated.token,
        inviteUrl: rotated.inviteUrl,
      });
    }

    if (action === 'update_user') {
      const role = body.role as UserRole | undefined;
      const status = body.status as 'ACTIVE' | 'DISABLED' | undefined;
      const data: Record<string, string> = {};
      if (role && VALID_ROLES.includes(role)) data.role = role;
      if (status && ['ACTIVE', 'DISABLED'].includes(status)) data.status = status;

      const updatedUser = await prisma.user.update({
        where: { id },
        data,
      });

      await writeAuditLog({
        action: 'ROLE_UPDATED',
        actorUserId: admin.id,
        targetUserId: updatedUser.id,
        targetEmail: updatedUser.email,
        metadata: data,
      });

      return NextResponse.json({ ok: true, user: updatedUser });
    }

    return NextResponse.json(
      { ok: false, error: 'Unsupported action.' },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to update resource.' },
      { status: 500 }
    );
  }
}
