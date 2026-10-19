import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { analyzeMaterialWithOptionalLlm } from '@/lib/magic-import';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let filename = 'attention-is-all-you-need.pdf';
    let sourceType = 'PDF';
    let rawText = '';
    let pdfBuffer: Buffer | undefined;
    let targetDeckId: string | null = null;
    let createDeckImmediately = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      sourceType = String(formData.get('sourceType') || 'PDF');
      targetDeckId = formData.get('deckId') ? String(formData.get('deckId')) : null;
      createDeckImmediately = formData.get('createDeckImmediately') === 'true';

      if (file) {
        filename = file.name || 'uploaded-document.pdf';
        const arrayBuf = await file.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuf);
        if (!filename.toLowerCase().endsWith('.pdf')) {
          rawText = pdfBuffer.toString('utf8');
          pdfBuffer = undefined;
        }
      } else {
        rawText = String(formData.get('text') || '');
      }
    } else {
      const body = await req.json();
      filename = String(body.filename || body.title || 'Study Material');
      sourceType = String(body.sourceType || 'PASTE');
      rawText = String(body.text || body.url || '');
      targetDeckId = body.deckId ? String(body.deckId) : null;
      createDeckImmediately = Boolean(body.createDeckImmediately);
    }

    // If sourceType is URL and rawText starts with http:// or https://, attempt to fetch and strip HTML tags
    if (
      (sourceType === 'URL' || rawText.startsWith('https://') || rawText.startsWith('http://')) &&
      /^https?:\/\/\S+$/i.test(rawText.trim())
    ) {
      const targetUrl = rawText.trim();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const pageRes = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch?.[1] && filename === 'Study Material') {
            filename = titleMatch[1].trim();
          }
          rawText = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 12000);
        }
      } catch {
        // Keep URL string as fallback text if remote host blocks fetch
      }
    }

    const analysis = await analyzeMaterialWithOptionalLlm({
      filename,
      rawText,
      sourceType,
      pdfBuffer,
    });

    // Optionally attach to existing deck or create a deck when requested
    let deckId = targetDeckId;
    if (!deckId && createDeckImmediately) {
      const newDeck = await prisma.deck.create({
        data: {
          title: analysis.title,
          description: analysis.summary,
          category: analysis.category,
          ownerId: user.id,
          color: '#7C3AED',
          icon: sourceType === 'PDF' ? '📄' : '✨',
        },
      });
      deckId = newDeck.id;
    }

    const importMaterial = await prisma.importMaterial.create({
      data: {
        deckId,
        ownerId: user.id,
        filename,
        mimeType: sourceType === 'PDF' ? 'application/pdf' : 'text/plain',
        sourceType,
        fileHashSha256: analysis.fileHashSha256,
        extractedText: analysis.extractedText,
      },
    });

    // If we have a deckId and createDeckImmediately is true, populate subdecks & cards + note right away
    let noteId: string | null = null;
    let totalCardsCreated = 0;

    if (deckId && createDeckImmediately) {
      const note = await prisma.studyNote.create({
        data: {
          deckId,
          ownerId: user.id,
          title: analysis.noteTitle,
          summary: analysis.summary,
          contentMarkdown: analysis.noteMarkdown,
          sourceType,
          sourceFilename: filename,
        },
      });
      noteId = note.id;

      for (const sd of analysis.subdecks) {
        const createdSub = await prisma.subdeck.create({
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
              subdeckId: createdSub.id,
              question: c.question,
              answer: c.answer,
              clozeText: c.clozeText,
              optionsJson: JSON.stringify(c.options),
              explanation: c.explanation,
              cardType: c.cardType,
            },
          });
          totalCardsCreated++;
        }
      }
    }

    // Always create the AI Tutor Chat session (matching upstream /chat/[chatId] behavior)
    const chat = await prisma.aiTutorChat.create({
      data: {
        ownerId: user.id,
        deckId,
        importMaterialId: importMaterial.id,
        noteId,
        title: analysis.title,
        summary: analysis.summary,
        lessonStepsJson: JSON.stringify(analysis.lessonSteps),
      },
    });

    await prisma.aiTutorMessage.createMany({
      data: [
        {
          chatId: chat.id,
          role: 'user',
          content: `Uploaded ${sourceType}: ${filename}`,
          attachmentName: filename,
          attachmentType: sourceType,
        },
        {
          chatId: chat.id,
          role: 'assistant',
          content: analysis.summary,
          suggestedActionsJson: JSON.stringify([
            {
              id: 'memorize',
              title: 'Memorize',
              subtitle: 'Generate flashcards',
              cta: 'Start memorizing',
            },
            {
              id: 'note',
              title: 'Note',
              subtitle: 'Generate a note',
              cta: 'Generate note',
            },
            {
              id: 'lesson',
              title: 'Step-by-step lesson',
              subtitle: analysis.title,
              cta: 'Start lesson',
            },
          ]),
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      chatId: chat.id,
      deckId,
      noteId,
      importMaterialId: importMaterial.id,
      fileHashSha256: analysis.fileHashSha256,
      title: analysis.title,
      summary: analysis.summary,
      totalCardsCreated,
    });
  } catch (err) {
    console.error('[magic-import] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process Magic Import.' },
      { status: 500 }
    );
  }
}
