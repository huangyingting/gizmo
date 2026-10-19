import { NextResponse } from 'next/server';
import { verifyInvitationToken } from '@/lib/account-admission';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || '';
  const result = await verifyInvitationToken(token);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
