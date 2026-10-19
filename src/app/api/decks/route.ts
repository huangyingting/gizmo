import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') || 'mine';
  const category = searchParams.get('category') || '';
  const q = (searchParams.get('q') || '').trim();

  if (scope === 'public') {
    const where: Record<string, unknown> = { isPublic: true };
    if (category && category !== 'All') {
      where.category = category;
    }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
      ];
    }

    const publicDecks = await prisma.deck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { name: true, handle: true, schoolName: true } },
        subdecks: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { cards: true, subdecks: true } },
      },
      take: 50,
    });

    return NextResponse.json({ ok: true, decks: publicDecks });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const myDecks = await prisma.deck.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      subdecks: { orderBy: { orderIndex: 'asc' } },
      _count: { select: { cards: true, studyNotes: true, importMaterials: true } },
    },
  });

  return NextResponse.json({ ok: true, decks: myDecks });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Support cloning a public deck into the user's library
  if (body.cloneFromDeckId) {
    const source = await prisma.deck.findUnique({
      where: { id: String(body.cloneFromDeckId) },
      include: {
        subdecks: {
          orderBy: { orderIndex: 'asc' },
          include: { cards: true },
        },
        cards: true,
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

    return NextResponse.json({ ok: true, deck: cloned }, { status: 201 });
  }

  const title = String(body.title || 'Untitled Deck').trim();
  const deck = await prisma.deck.create({
    data: {
      title,
      description: String(body.description || ''),
      category: String(body.category || 'Computer Science'),
      level: String(body.level || 'University'),
      color: String(body.color || '#7C3AED'),
      icon: String(body.icon || '📘'),
      isPublic: Boolean(body.isPublic),
      ownerId: user.id,
    },
  });

  // Create default starter subdeck
  await prisma.subdeck.create({
    data: {
      deckId: deck.id,
      title: `${title} — Step 1`,
      orderIndex: 0,
      masteryScore: 0,
    },
  });

  return NextResponse.json({ ok: true, deck }, { status: 201 });
}
