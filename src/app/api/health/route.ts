import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdmissionMode } from '@/lib/account-admission';

export async function GET() {
  const start = performance.now();
  try {
    const [userCount, deckCount] = await Promise.all([
      prisma.user.count(),
      prisma.deck.count(),
    ]);
    const dbLatencyMs = Number((performance.now() - start).toFixed(2));

    return NextResponse.json({
      ok: true,
      status: 'healthy',
      version: '1.0.0',
      admissionMode: getAdmissionMode(),
      database: {
        connected: true,
        latencyMs: dbLatencyMs,
        users: userCount,
        decks: deckCount,
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 'degraded',
        error: err instanceof Error ? err.message : 'Database connectivity check failed',
      },
      { status: 503 }
    );
  }
}
