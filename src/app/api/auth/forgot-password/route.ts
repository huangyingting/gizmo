import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeAccountEmail } from '@/lib/account-admission';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit({
    key: `forgot-password:${clientId}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many password reset requests. Please wait a minute.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeAccountEmail(String(body.email || ''));
  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'Please provide a valid email address.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === 'ACTIVE') {
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user.id,
        metadata: JSON.stringify({ email, expires: expires.toISOString() }),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      'If an active invited account exists for this email, password reset instructions have been queued.',
  });
}
