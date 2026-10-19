import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import {
  recordCardAttemptAndUpdateSrs,
  finalizeQuizSessionMasteryAndStreak,
} from '@/lib/spaced-repetition';

export async function GET(
  _req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      deck: true,
      subdeck: true,
      attempts: true,
    },
  });

  if (!quizSession) {
    return NextResponse.json({ ok: false, error: 'Quiz session not found' }, { status: 404 });
  }
  if (quizSession.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const cards = await prisma.card.findMany({
    where: quizSession.subdeckId
      ? { deckId: quizSession.deckId, subdeckId: quizSession.subdeckId }
      : { deckId: quizSession.deckId },
    include: {
      userStates: {
        where: { userId: user.id },
        take: 1,
      },
    },
    orderBy: [{ nextReviewAt: 'asc' }, { createdAt: 'asc' }],
    take: 20,
  });

  return NextResponse.json({
    ok: true,
    session: quizSession,
    cards,
    userBalances: {
      xp: user.xp,
      gems: user.gems,
      hearts: user.hearts,
      hints: user.hints,
      streakDays: user.streakDays,
    },
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
  });

  if (!quizSession) {
    return NextResponse.json({ ok: false, error: 'Quiz session not found' }, { status: 404 });
  }
  if (quizSession.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || '');

  // Action: Use Hint (decrements user hints & logs hint usage)
  if (action === 'use_hint') {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        hints: Math.max(0, user.hints - 1),
      },
    });
    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        hintsUsed: quizSession.hintsUsed + 1,
      },
    });
    return NextResponse.json({
      ok: true,
      hintsRemaining: updatedUser.hints,
      session: updatedSession,
    });
  }

  // Action: Record card attempt (answer / reveal) + SM-2 Spaced Repetition
  if (action === 'attempt') {
    const cardId = String(body.cardId || '');
    const selectedAnswer = String(body.selectedAnswer || '');
    const isCorrect = Boolean(body.isCorrect);
    const usedHint = Boolean(body.usedHint);
    const usedReveal = Boolean(body.usedReveal);
    const xpDelta = isCorrect ? (usedHint ? 7 : 10) : 2;

    await prisma.quizAttempt.create({
      data: {
        sessionId,
        cardId,
        selectedAnswer,
        isCorrect,
        usedHint,
        usedReveal,
      },
    });

    const srsState = cardId
      ? await recordCardAttemptAndUpdateSrs({
          userId: user.id,
          cardId,
          subdeckId: quizSession.subdeckId,
          isCorrect,
          usedHint,
          usedReveal,
          xpEarned: xpDelta,
        })
      : null;

    const newHearts = isCorrect || usedReveal
      ? quizSession.heartsRemaining
      : Math.max(1, quizSession.heartsRemaining - 1);

    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        correctCount: isCorrect ? quizSession.correctCount + 1 : quizSession.correctCount,
        heartsRemaining: newHearts,
        xpEarned: quizSession.xpEarned + xpDelta,
      },
    });

    if (isCorrect) {
      await prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpDelta } },
      });
    }

    return NextResponse.json({ ok: true, session: updatedSession, srsState });
  }

  // Action: Complete quiz session
  if (action === 'complete') {
    const bonusXp = 25;
    const bonusGems = 50;
    const completed = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        xpEarned: quizSession.xpEarned + bonusXp,
        gemsEarned: bonusGems,
      },
    });

    await finalizeQuizSessionMasteryAndStreak({
      userId: user.id,
      subdeckId: quizSession.subdeckId,
      deckId: quizSession.deckId,
      sessionCorrectCount: quizSession.correctCount,
      sessionTotalQuestions: quizSession.totalQuestions,
      bonusXp,
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: bonusXp },
        gems: { increment: bonusGems },
      },
    });

    return NextResponse.json({
      ok: true,
      session: completed,
      user: updatedUser,
    });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
