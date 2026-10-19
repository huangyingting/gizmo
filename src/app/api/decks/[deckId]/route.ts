import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const MONSTER_EMOJI_MAP: Record<string, string> = {
  'ember-dragon': '🐉',
  'aqua-axolotl': '🦎',
  'volt-owl': '🦉',
  'crystal-kitsune': '🦊',
  'chrono-phoenix': '🦅',
  'nebula-leviathan': '🐋',
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await context.params;
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      owner: { select: { id: true, name: true, handle: true, schoolName: true } },
      subdecks: {
        orderBy: { orderIndex: 'asc' },
        include: {
          cards: { orderBy: { createdAt: 'asc' } },
        },
      },
      cards: { orderBy: { createdAt: 'asc' } },
      studyNotes: { orderBy: { updatedAt: 'desc' } },
      importMaterials: { orderBy: { createdAt: 'desc' } },
      aiTutorChats: { orderBy: { updatedAt: 'desc' }, take: 5 },
    },
  });

  if (!deck) {
    return NextResponse.json({ ok: false, error: 'Deck not found' }, { status: 404 });
  }

  const leaderboardUsers = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
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
  });

  const leaderboard = leaderboardUsers.map((u) => ({
    ...u,
    avatarEmoji: MONSTER_EMOJI_MAP[u.avatarMonsterCode] || '🦖',
  }));

  return NextResponse.json({ ok: true, deck, leaderboard });
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ deckId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId } = await context.params;
  const source = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      subdecks: {
        orderBy: { orderIndex: 'asc' },
        include: { cards: true },
      },
      studyNotes: true,
    },
  });

  if (!source) {
    return NextResponse.json({ ok: false, error: 'Source deck not found' }, { status: 404 });
  }

  const cloned = await prisma.deck.create({
    data: {
      title: source.title,
      description: source.description,
      category: source.category,
      level: source.level,
      color: source.color,
      icon: source.icon,
      isPublic: false,
      ownerId: user.id,
      clonedFromId: source.id,
    },
  });

  for (const sd of source.subdecks) {
    const newSub = await prisma.subdeck.create({
      data: {
        deckId: cloned.id,
        title: sd.title,
        orderIndex: sd.orderIndex,
        masteryScore: 0,
      },
    });
    for (const c of sd.cards) {
      await prisma.card.create({
        data: {
          deckId: cloned.id,
          subdeckId: newSub.id,
          question: c.question,
          answer: c.answer,
          clozeText: c.clozeText,
          optionsJson: c.optionsJson,
          explanation: c.explanation,
          cardType: c.cardType,
        },
      });
    }
  }

  for (const note of source.studyNotes) {
    await prisma.studyNote.create({
      data: {
        deckId: cloned.id,
        ownerId: user.id,
        title: note.title,
        summary: note.summary,
        contentMarkdown: note.contentMarkdown,
        sourceType: note.sourceType,
        sourceFilename: note.sourceFilename,
      },
    });
  }

  return NextResponse.json(
    { ok: true, deckId: cloned.id, deck: cloned },
    { status: 201 }
  );
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ deckId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId } = await context.params;
  const existing = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Deck not found' }, { status: 404 });
  }
  if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (body.addSubdeckTitle) {
    const count = await prisma.subdeck.count({ where: { deckId } });
    const subdeck = await prisma.subdeck.create({
      data: {
        deckId,
        title: String(body.addSubdeckTitle).trim(),
        orderIndex: count,
      },
    });
    return NextResponse.json({ ok: true, subdeck });
  }

  const updated = await prisma.deck.update({
    where: { id: deckId },
    data: {
      title: body.title ? String(body.title) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      isPublic: body.isPublic !== undefined ? Boolean(body.isPublic) : undefined,
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : undefined,
      color: body.color ? String(body.color) : undefined,
    },
  });

  return NextResponse.json({ ok: true, deck: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ deckId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deckId } = await context.params;
  const existing = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Deck not found' }, { status: 404 });
  }
  if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.deck.delete({ where: { id: deckId } });
  return NextResponse.json({ ok: true, deletedId: deckId });
}
