import { NextResponse } from 'next/server';
import {
  acceptInvitationAndRegisterUser,
  AccountAdmissionError,
} from '@/lib/account-admission';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const clientIp = getClientIdentifier(req);
  const rl = checkRateLimit({
    key: `register:${clientIp}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', error: 'Too many registration attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const user = await acceptInvitationAndRegisterUser({
      token: String(body.token || ''),
      email: String(body.email || ''),
      name: String(body.name || ''),
      password: String(body.password || ''),
      schoolName: body.schoolName ? String(body.schoolName) : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          handle: user.handle,
          role: user.role,
        },
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
      { ok: false, code: 'INTERNAL_ERROR', error: 'Registration failed.' },
      { status: 500 }
    );
  }
}
