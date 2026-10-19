import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId, cardId } = await context.params;
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || (deck.ownerId !== user.id && user.role !== 'ADMIN')) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.question !== undefined) data.question = String(body.question).trim();
  if (body.answer !== undefined) data.answer = String(body.answer).trim();
  if (body.explanation !== undefined) data.explanation = String(body.explanation).trim();
  if (body.cardType !== undefined) data.cardType = String(body.cardType);
  if (body.clozeText !== undefined) {
    data.clozeText = String(body.clozeText);
  } else if (data.question && data.answer) {
    data.clozeText = `${data.question} — {{${data.answer}}}`;
  }
  if (Array.isArray(body.options)) {
    data.optionsJson = JSON.stringify(body.options);
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data,
  });

  return NextResponse.json({ ok: true, card: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId, cardId } = await context.params;
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || (deck.ownerId !== user.id && user.role !== 'ADMIN')) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.card.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true, deletedId: cardId });
}
