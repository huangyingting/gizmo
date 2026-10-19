import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { hashPassword } from '@/lib/account-admission';

const MONSTER_EMOJI_MAP: Record<string, string> = {
  'ember-dragon': '🐉',
  'aqua-axolotl': '🦎',
  'volt-owl': '🦉',
  'crystal-kitsune': '🦊',
  'chrono-phoenix': '🦅',
  'nebula-leviathan': '🐋',
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [
    deckCount,
    noteCount,
    quizCount,
    attemptCount,
    correctAttemptCount,
    decks,
    peerUsers,
  ] = await Promise.all([
    prisma.deck.count({ where: { ownerId: user.id } }),
    prisma.studyNote.count({ where: { ownerId: user.id } }),
    prisma.quizSession.count({ where: { userId: user.id } }),
    prisma.quizAttempt.count({
      where: { session: { userId: user.id } },
    }),
    prisma.quizAttempt.count({
      where: { session: { userId: user.id }, isCorrect: true },
    }),
    prisma.deck.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { cards: true, subdecks: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: user.id } },
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        handle: true,
        schoolName: true,
        xp: true,
        streakDays: true,
        beltRank: true,
        avatarMonsterCode: true,
      },
      take: 10,
    }),
  ]);

  const accuracyPct =
    attemptCount > 0 ? Math.round((correctAttemptCount / attemptCount) * 100) : 94;

  const friends = peerUsers.map((p) => ({
    id: p.id,
    name: p.name || 'Classmate',
    handle: p.handle || 'scholar',
    schoolName: p.schoolName,
    xp: p.xp,
    streakDays: p.streakDays,
    beltRank: p.beltRank,
    avatar: MONSTER_EMOJI_MAP[p.avatarMonsterCode] || '🦊',
  }));

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      coins: user.gems,
      avatarEmoji: MONSTER_EMOJI_MAP[user.avatarMonsterCode] || '🐉',
      quizzesCompleted: quizCount,
      cardsReviewed: Math.max(attemptCount, quizCount * 5),
      accuracyPct,
    },
    stats: {
      deckCount,
      noteCount,
      quizCount,
      cardsReviewed: Math.max(attemptCount, quizCount * 5),
      accuracyPct,
    },
    decks,
    friends,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.handle !== undefined) data.handle = String(body.handle).trim();
  if (body.bio !== undefined) data.bio = String(body.bio).trim();
  if (body.schoolName !== undefined) data.schoolName = String(body.schoolName).trim();
  if (body.darkModeEnabled !== undefined) data.darkModeEnabled = Boolean(body.darkModeEnabled);
  if (body.isPro !== undefined) data.isPro = Boolean(body.isPro);
  if (body.dailyGoalQuizzes !== undefined) {
    data.dailyGoalQuizzes = Math.max(1, Math.min(20, Number(body.dailyGoalQuizzes) || 3));
  }
  if (body.soundEffects !== undefined) data.soundEffects = Boolean(body.soundEffects);
  if (body.notificationsEnabled !== undefined) {
    data.notificationsEnabled = Boolean(body.notificationsEnabled);
  }
  if (body.themePreference !== undefined) {
    data.themePreference = String(body.themePreference).trim() || 'light';
  }

  if (body.newPassword && String(body.newPassword).length >= 8) {
    const newHash = await hashPassword(String(body.newPassword));
    data.passwordHash = newHash;
    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      create: { userId: user.id, passwordHash: newHash },
      update: { passwordHash: newHash },
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({ ok: true, user: updated });
}
