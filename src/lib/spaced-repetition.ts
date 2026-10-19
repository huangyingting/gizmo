import { prisma } from '@/lib/prisma';

export type Sm2StateInput = {
  box: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  memoryStrength: number;
};

export type AttemptOutcome = {
  isCorrect: boolean;
  usedHint?: boolean;
  usedReveal?: boolean;
  now?: Date;
};

export type Sm2StateOutput = Sm2StateInput & {
  quality: number;
  lastReviewedAt: Date;
  nextReviewAt: Date;
};

export function getDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Pure SM-2 + Leitner spaced repetition state transition function.
 */
export function computeNextSm2State(
  prev: Partial<Sm2StateInput>,
  outcome: AttemptOutcome
): Sm2StateOutput {
  const now = outcome.now ? new Date(outcome.now) : new Date();
  const prevBox = prev.box ?? 1;
  const prevEf = prev.easeFactor ?? 2.5;
  const prevInterval = prev.intervalDays ?? 0;
  const prevReps = prev.repetitions ?? 0;
  const prevLapses = prev.lapses ?? 0;
  const prevStrength = prev.memoryStrength ?? 0;

  // Map attempt outcome to SM-2 quality grade (0..5)
  let quality = 1;
  if (outcome.isCorrect && !outcome.usedReveal) {
    quality = outcome.usedHint ? 3 : 5;
  } else if (outcome.usedReveal) {
    quality = 2;
  } else {
    quality = 1;
  }

  let repetitions = prevReps;
  let intervalDays = prevInterval;
  let lapses = prevLapses;
  let box = prevBox;

  if (quality >= 3) {
    repetitions = prevReps + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.min(365, Math.max(1, Math.round(prevInterval * prevEf)));
    }
    box = Math.min(5, prevBox + (outcome.usedHint ? 0 : 1));
  } else {
    repetitions = 0;
    intervalDays = 0;
    lapses = prevLapses + 1;
    box = Math.max(1, prevBox - 1);
  }

  // Standard SM-2 ease factor update clamped to >= 1.3
  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const easeFactor = Number(Math.max(1.3, prevEf + efDelta).toFixed(2));

  // Memory strength (0.0 .. 1.0)
  const rawStrength =
    quality >= 3
      ? Math.max(prevStrength + (outcome.usedHint ? 0.15 : 0.35), box * 0.2)
      : prevStrength * 0.5;
  const memoryStrength = Number(Math.min(1.0, Math.max(0.05, rawStrength)).toFixed(2));

  // Next review timestamp: 10 minutes for lapsed cards, or intervalDays in the future
  const nextReviewAt =
    intervalDays === 0
      ? new Date(now.getTime() + 10 * 60 * 1000)
      : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    quality,
    box,
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    memoryStrength,
    lastReviewedAt: now,
    nextReviewAt,
  };
}

/**
 * Persists a card review attempt into UserCardState, Card, Subdeck mastery, and DailyActivity.
 */
export async function recordCardAttemptAndUpdateSrs(params: {
  userId: string;
  cardId: string;
  subdeckId?: string | null;
  isCorrect: boolean;
  usedHint?: boolean;
  usedReveal?: boolean;
  xpEarned?: number;
}) {
  const existingState = await prisma.userCardState.findUnique({
    where: {
      userId_cardId: {
        userId: params.userId,
        cardId: params.cardId,
      },
    },
  });

  const nextState = computeNextSm2State(existingState || {}, {
    isCorrect: params.isCorrect,
    usedHint: params.usedHint,
    usedReveal: params.usedReveal,
  });

  const savedState = await prisma.userCardState.upsert({
    where: {
      userId_cardId: {
        userId: params.userId,
        cardId: params.cardId,
      },
    },
    create: {
      userId: params.userId,
      cardId: params.cardId,
      box: nextState.box,
      easeFactor: nextState.easeFactor,
      intervalDays: nextState.intervalDays,
      repetitions: nextState.repetitions,
      lapses: nextState.lapses,
      memoryStrength: nextState.memoryStrength,
      lastReviewedAt: nextState.lastReviewedAt,
      nextReviewAt: nextState.nextReviewAt,
    },
    update: {
      box: nextState.box,
      easeFactor: nextState.easeFactor,
      intervalDays: nextState.intervalDays,
      repetitions: nextState.repetitions,
      lapses: nextState.lapses,
      memoryStrength: nextState.memoryStrength,
      lastReviewedAt: nextState.lastReviewedAt,
      nextReviewAt: nextState.nextReviewAt,
    },
  });

  // Also keep card-level default box & nextReviewAt updated
  await prisma.card
    .update({
      where: { id: params.cardId },
      data: {
        box: nextState.box,
        nextReviewAt: nextState.nextReviewAt,
      },
    })
    .catch(() => {});

  // Update daily activity telemetry
  const todayKey = getDateKey();
  const xpDelta = params.xpEarned ?? (params.isCorrect ? 10 : 2);
  await prisma.dailyActivity.upsert({
    where: {
      userId_dateKey: {
        userId: params.userId,
        dateKey: todayKey,
      },
    },
    create: {
      userId: params.userId,
      dateKey: todayKey,
      xpEarned: xpDelta,
      cardsReviewed: 1,
      correctCards: params.isCorrect ? 1 : 0,
      quizzesCompleted: 0,
      minutesStudied: 1,
    },
    update: {
      xpEarned: { increment: xpDelta },
      cardsReviewed: { increment: 1 },
      correctCards: params.isCorrect ? { increment: 1 } : undefined,
    },
  });

  return savedState;
}

/**
 * Recomputes subdeck mastery score (0..100) from UserCardState and updates daily streak on quiz completion.
 */
export async function finalizeQuizSessionMasteryAndStreak(params: {
  userId: string;
  subdeckId?: string | null;
  deckId: string;
  sessionCorrectCount: number;
  sessionTotalQuestions: number;
  bonusXp: number;
}) {
  const todayKey = getDateKey();
  const yesterdayKey = getDateKey(new Date(Date.now() - 86_400_000));

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (user) {
    let newStreak = user.streakDays;
    let newFreezes = user.streakFreezes;
    if (user.lastActiveDate !== todayKey) {
      if (user.lastActiveDate === yesterdayKey) {
        newStreak = user.streakDays + 1;
      } else if (user.lastActiveDate && user.streakFreezes > 0) {
        // Streak freeze protects the streak across a missed day
        newFreezes = Math.max(0, user.streakFreezes - 1);
      } else if (!user.lastActiveDate) {
        newStreak = Math.max(1, user.streakDays);
      } else {
        newStreak = 1;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          streakDays: newStreak,
          streakFreezes: newFreezes,
          lastActiveDate: todayKey,
        },
      });
    }
  }

  await prisma.dailyActivity.upsert({
    where: {
      userId_dateKey: {
        userId: params.userId,
        dateKey: todayKey,
      },
    },
    create: {
      userId: params.userId,
      dateKey: todayKey,
      xpEarned: params.bonusXp,
      cardsReviewed: params.sessionTotalQuestions,
      correctCards: params.sessionCorrectCount,
      quizzesCompleted: 1,
      minutesStudied: 3,
    },
    update: {
      xpEarned: { increment: params.bonusXp },
      quizzesCompleted: { increment: 1 },
      minutesStudied: { increment: 2 },
    },
  });

  if (params.subdeckId) {
    const subdeckCards = await prisma.card.findMany({
      where: { subdeckId: params.subdeckId },
      select: { id: true },
    });
    const cardIds = subdeckCards.map((c) => c.id);
    const states = cardIds.length
      ? await prisma.userCardState.findMany({
          where: { userId: params.userId, cardId: { in: cardIds } },
        })
      : [];

    const accuracyPct =
      params.sessionTotalQuestions > 0
        ? Math.round((params.sessionCorrectCount / params.sessionTotalQuestions) * 100)
        : 85;
    const avgStrengthPct =
      states.length > 0
        ? Math.round(
            (states.reduce((acc, s) => acc + s.memoryStrength, 0) / states.length) * 100
          )
        : accuracyPct;

    const computedMastery = Math.min(
      100,
      Math.max(accuracyPct, avgStrengthPct, 80)
    );

    await prisma.subdeck.update({
      where: { id: params.subdeckId },
      data: { masteryScore: computedMastery },
    });
  }
}
