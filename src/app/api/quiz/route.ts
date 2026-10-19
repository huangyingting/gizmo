import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const deckId = String(body.deckId || '');
  const subdeckId = body.subdeckId ? String(body.subdeckId) : null;
  const mode = String(body.mode || 'LEARN'); // LEARN | MEMORIZE | TEST

  const cards = await prisma.card.findMany({
    where: subdeckId ? { deckId, subdeckId } : { deckId },
    orderBy: { createdAt: 'asc' },
    take: 15,
  });

  const session = await prisma.quizSession.create({
    data: {
      userId: user.id,
      deckId,
      subdeckId,
      mode,
      status: 'IN_PROGRESS',
      totalQuestions: Math.max(cards.length, 1),
      heartsRemaining: user.hearts,
      hintsUsed: 0,
    },
  });

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
