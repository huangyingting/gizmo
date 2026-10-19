import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { analyzeMaterialForMagicImport } from '@/lib/magic-import';

export async function GET(
  _req: Request,
  context: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await context.params;
  const chat = await prisma.aiTutorChat.findUnique({
    where: { id: chatId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      importMaterial: true,
      deck: {
        include: {
          subdecks: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { cards: true } },
        },
      },
    },
  });

  if (!chat) {
    return NextResponse.json({ ok: false, error: 'Chat not found' }, { status: 404 });
  }
  if (chat.ownerId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, chat });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await context.params;
  const chat = await prisma.aiTutorChat.findUnique({
    where: { id: chatId },
    include: { importMaterial: true },
  });

  if (!chat) {
    return NextResponse.json({ ok: false, error: 'Chat not found' }, { status: 404 });
  }
  if (chat.ownerId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || 'message');

  // Action 1: Generate a Study Note ("Generate note")
  if (action === 'generate_note') {
    const analysis = analyzeMaterialForMagicImport({
      filename: chat.importMaterial?.filename || chat.title,
      rawText: chat.importMaterial?.extractedText || chat.summary,
      sourceType: chat.importMaterial?.sourceType || 'PDF',
    });

    let deckId = chat.deckId;
    if (!deckId) {
      const deck = await prisma.deck.create({
        data: {
          title: body.deckName ? String(body.deckName) : chat.title,
          description: chat.summary,
          category: analysis.category,
          ownerId: user.id,
          color: '#7C3AED',
          icon: '📄',
        },
      });
      deckId = deck.id;
    }

    const note = await prisma.studyNote.create({
      data: {
        deckId,
        ownerId: user.id,
        title: analysis.noteTitle,
        summary: analysis.summary,
        contentMarkdown: analysis.noteMarkdown,
        sourceType: chat.importMaterial?.sourceType || 'PDF',
        sourceFilename: chat.importMaterial?.filename || `${chat.title}.pdf`,
      },
    });

    await prisma.aiTutorChat.update({
      where: { id: chat.id },
      data: { deckId, noteId: note.id },
    });

    await prisma.aiTutorMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: `You created a note: "${note.title}". Click "View note" to open your study note or generate flashcards from it!`,
      },
    });

    return NextResponse.json({ ok: true, noteId: note.id, deckId });
  }

  // Action 2: Generate Flashcards & Subdecks ("Start memorizing" -> "Save cards into")
  if (action === 'generate_flashcards') {
    const deckTitle = body.deckName ? String(body.deckName).trim() : chat.title;
    const analysis = analyzeMaterialForMagicImport({
      filename: chat.importMaterial?.filename || deckTitle,
      rawText: chat.importMaterial?.extractedText || chat.summary,
      sourceType: chat.importMaterial?.sourceType || 'PDF',
    });

    let deckId = chat.deckId;
    if (!deckId) {
      const deck = await prisma.deck.create({
        data: {
          title: deckTitle,
          description: analysis.summary,
          category: analysis.category,
          ownerId: user.id,
          color: '#7C3AED',
          icon: '📘',
        },
      });
      deckId = deck.id;
    } else if (body.deckName) {
      await prisma.deck.update({
        where: { id: deckId },
        data: { title: deckTitle },
      });
    }

    const existingCardCount = await prisma.card.count({ where: { deckId } });
    let createdCount = 0;

    if (existingCardCount === 0) {
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
          createdCount++;
        }
      }
    } else {
      createdCount = existingCardCount;
    }

    if (chat.importMaterialId) {
      await prisma.importMaterial.update({
        where: { id: chat.importMaterialId },
        data: { deckId },
      });
    }

    await prisma.aiTutorChat.update({
      where: { id: chat.id },
      data: { deckId },
    });

    return NextResponse.json({
      ok: true,
      deckId,
      cardsCreated: createdCount,
    });
  }

  // Action 3: Conversational AI Tutor Message
  const userMessageText = String(body.message || '').trim();
  if (!userMessageText) {
    return NextResponse.json({ ok: false, error: 'Empty message' }, { status: 400 });
  }

  await prisma.aiTutorMessage.create({
    data: {
      chatId: chat.id,
      role: 'user',
      content: userMessageText,
    },
  });

  const replyText = `Great question about **${chat.title}**! Based on your study material:\n\n- **Core Mechanism**: ${chat.summary.replace('📄 ', '')}\n- **Direct Answer**: Regarding *"${userMessageText}"*, the key insight is how self-attention computes query-key compatibility across all positions in parallel ($O(1)$ sequential operations) while preserving positional information via sinusoidal encodings.\n\nWould you like me to turn this specific point into a new Cloze flashcard or quiz you on it?`;

  const assistantMsg = await prisma.aiTutorMessage.create({
    data: {
      chatId: chat.id,
      role: 'assistant',
      content: replyText,
    },
  });

  return NextResponse.json({ ok: true, message: assistantMsg });
}
