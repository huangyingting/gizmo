import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await context.params;
  const body = await req.json();
  const cardId = body.cardId ? String(body.cardId) : '';
  const promptType = String(body.promptType || 'initial');
  const customQuery = String(body.customQuery || '').trim();

  const card = cardId
    ? await prisma.card.findUnique({ where: { id: cardId } })
    : null;

  const question = card?.question || String(body.question || 'this concept');
  const answer = card?.answer || String(body.answer || 'the key mechanism');
  const baseExplanation =
    card?.explanation ||
    `The core concept is "${answer}", which directly addresses "${question}".`;

  let explanationText = baseExplanation;
  if (promptType === 'simpler') {
    explanationText = `**In simpler terms**: Think of **${answer}** as the direct bridge that solves *"${question}"*. Instead of processing everything one step at a time, it connects the most relevant pieces of information immediately.`;
  } else if (promptType === 'summarize') {
    explanationText = `**Key takeaway**: Whenever you see *"${question}"*, remember **${answer}** — ${baseExplanation}`;
  } else if (promptType === 'different') {
    explanationText = `**What makes it different**: Unlike older sequential or brute-force approaches, **${answer}** operates directly across the representation with higher efficiency and stronger long-range accuracy.`;
  } else if (customQuery) {
    explanationText = `Regarding **"${customQuery}"**: In the context of *"${question}"*, **${answer}** works because ${baseExplanation}`;
  }

  return NextResponse.json({
    ok: true,
    explanation: explanationText,
    suggestions: [
      { id: 'simpler', label: 'Tell me in simpler terms' },
      { id: 'summarize', label: 'Summarize the key point' },
      { id: 'different', label: 'What makes this different from other models?' },
    ],
  });
}
