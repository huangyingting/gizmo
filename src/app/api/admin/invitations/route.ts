import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import {
  AccountAdmissionError,
  createAccountInvitation,
  type UserRole,
} from '@/lib/account-admission';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Administrator privileges required.' },
      { status: 403 }
    );
  }

  const [invitations, auditLogs, users] = await Promise.all([
    prisma.accountInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { name: true, email: true } },
        acceptedByUser: { select: { name: true, email: true, handle: true } },
      },
      take: 100,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { name: true, email: true } },
      },
      take: 100,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        handle: true,
        role: true,
        status: true,
        schoolName: true,
        xp: true,
        gems: true,
        createdAt: true,
      },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    admissionMode: process.env.ACCOUNT_ADMISSION_MODE || 'closed',
    invitations,
    auditLogs,
    users,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Administrator privileges required.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const result = await createAccountInvitation({
      email: String(body.email || ''),
      role: (body.role as UserRole) || 'USER',
      ttlHours: body.ttlHours ? Number(body.ttlHours) : undefined,
      note: body.note ? String(body.note) : undefined,
      createdByUserId: user.id,
    });

    return NextResponse.json(
      {
        ok: true,
        invitation: result.invitation,
        token: result.token,
        inviteUrl: result.inviteUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to create invitation.' },
      { status: 500 }
    );
  }
}
