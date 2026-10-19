import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function POST(
  req: Request,
  context: { params: Promise<{ deckId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId } = await context.params;
  const body = await req.json();

  const question = String(body.question || '').trim();
  const answer = String(body.answer || '').trim();
  if (!question || !answer) {
    return NextResponse.json(
      { ok: false, error: 'Question and answer are required.' },
      { status: 400 }
    );
  }

  let subdeckId = body.subdeckId ? String(body.subdeckId) : null;
  if (!subdeckId) {
    const firstSubdeck = await prisma.subdeck.findFirst({
      where: { deckId },
      orderBy: { orderIndex: 'asc' },
    });
    if (firstSubdeck) {
      subdeckId = firstSubdeck.id;
    } else {
      const createdSub = await prisma.subdeck.create({
        data: {
          deckId,
          title: 'Core Concepts',
          orderIndex: 0,
        },
      });
      subdeckId = createdSub.id;
    }
  }

  const distractors: string[] = Array.isArray(body.options)
    ? body.options.map((o: unknown) => String(o).trim()).filter(Boolean)
    : [];
  const options = distractors.includes(answer)
    ? distractors
    : [answer, ...distractors, 'Alternative baseline concept', 'None of the above'].slice(0, 3);

  const clozeText =
    body.clozeText && String(body.clozeText).includes('{{')
      ? String(body.clozeText)
      : `${question} — {{${answer}}}`;

  const card = await prisma.card.create({
    data: {
      deckId,
      subdeckId,
      question,
      answer,
      clozeText,
      optionsJson: JSON.stringify(options),
      explanation:
        String(body.explanation || '').trim() ||
        `The correct answer is "${answer}". ${question}`,
      cardType: body.cardType === 'CLOZE' ? 'CLOZE' : 'MCQ',
    },
  });

  return NextResponse.json({ ok: true, card }, { status: 201 });
}
