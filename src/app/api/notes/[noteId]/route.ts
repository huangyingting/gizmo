import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { analyzeMaterialForMagicImport } from '@/lib/magic-import';

export async function GET(
  _req: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { noteId } = await context.params;
  const note = await prisma.studyNote.findUnique({
    where: { id: noteId },
    include: {
      deck: {
        include: {
          _count: { select: { cards: true, subdecks: true } },
        },
      },
    },
  });

  if (!note) {
    return NextResponse.json({ ok: false, error: 'Note not found' }, { status: 404 });
  }
  if (note.ownerId !== user.id && !note.deck?.isPublic && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, note });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { noteId } = await context.params;
  const note = await prisma.studyNote.findUnique({ where: { id: noteId } });
  if (!note) {
    return NextResponse.json({ ok: false, error: 'Note not found' }, { status: 404 });
  }
  if (note.ownerId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Action: "create_cards" from Note -> populates parent Deck (or creates one) with Subdecks & Cards
  if (body.action === 'create_cards') {
    let deckId = note.deckId;
    if (!deckId) {
      const createdDeck = await prisma.deck.create({
        data: {
          title: body.deckName ? String(body.deckName) : note.title,
          description: note.summary || `Generated from Study Note: ${note.title}`,
          category: 'Computer Science',
          ownerId: user.id,
        },
      });
      deckId = createdDeck.id;
      await prisma.studyNote.update({
        where: { id: note.id },
        data: { deckId },
      });
    }

    const existingCards = await prisma.card.count({ where: { deckId } });
    let createdCards = 0;

    if (existingCards === 0) {
      const analysis = analyzeMaterialForMagicImport({
        filename: note.sourceFilename || note.title,
        rawText: note.contentMarkdown,
        sourceType: note.sourceType,
      });

      for (const sd of analysis.subdecks) {
        const subdeck = await prisma.subdeck.create({
          data: {
            deckId,
            title: sd.title,
            orderIndex: sd.orderIndex,
            masteryScore: 0,
          },
        });
        for (const c of sd.cards) {
          await prisma.card.create({
            data: {
              deckId,
              subdeckId: subdeck.id,
              question: c.question,
              answer: c.answer,
              clozeText: c.clozeText,
              optionsJson: JSON.stringify(c.options),
              explanation: c.explanation,
              cardType: c.cardType,
            },
          });
          createdCards++;
        }
      }
    } else {
      createdCards = existingCards;
    }

    return NextResponse.json({
      ok: true,
      deckId,
      createdCards,
    });
  }

  const updated = await prisma.studyNote.update({
    where: { id: noteId },
    data: {
      title: body.title !== undefined ? String(body.title) : undefined,
      contentMarkdown:
        body.contentMarkdown !== undefined ? String(body.contentMarkdown) : undefined,
    },
  });

  return NextResponse.json({ ok: true, note: updated });
}
