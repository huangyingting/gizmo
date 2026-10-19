import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

function serializeLiveRoom(
  match: {
    id: string;
    roomCode: string;
    deckId: string;
    status: string;
    playerScore: number;
    opponentScore: number;
    opponentName: string;
    deck?: {
      title: string;
      icon: string;
      cards?: {
        id: string;
        question: string;
        answer: string;
        optionsJson: string;
      }[];
    } | null;
  },
  userName: string
) {
  const participants = [
    {
      name: `${userName} (You)`,
      avatar: '🐉',
      score: match.playerScore,
    },
    {
      name: match.opponentName || 'Sofia Tan (NYP)',
      avatar: '🦊',
      score: match.opponentScore,
    },
    {
      name: 'Lucas Lim (NYP)',
      avatar: '🦉',
      score: Math.max(100, Math.round(match.opponentScore * 0.85)),
    },
  ];

  return {
    id: match.id,
    roomCode: match.roomCode,
    deckId: match.deckId,
    status: match.status,
    participantsJson: JSON.stringify(participants),
    deck: match.deck || null,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decks = await prisma.deck.findMany({
    where: { OR: [{ ownerId: user.id }, { isPublic: true }] },
    include: {
      cards: { take: 10 },
      _count: { select: { cards: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  let matches = await prisma.liveGameSession.findMany({
    where: { hostUserId: user.id },
    include: {
      deck: {
        select: {
          title: true,
          icon: true,
          cards: {
            select: { id: true, question: true, answer: true, optionsJson: true },
            take: 10,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (matches.length === 0 && decks.length > 0) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const seededMatch = await prisma.liveGameSession.create({
      data: {
        hostUserId: user.id,
        deckId: decks[0].id,
        roomCode: pin,
        opponentName: 'Sofia Tan (NYP Classmate)',
        playerScore: 300,
        opponentScore: 250,
        status: 'ACTIVE',
        winnerName: user.name || 'You',
      },
      include: {
        deck: {
          select: {
            title: true,
            icon: true,
            cards: {
              select: { id: true, question: true, answer: true, optionsJson: true },
              take: 10,
            },
          },
        },
      },
    });
    matches = [seededMatch];
  }

  const rooms = matches.map((m) => serializeLiveRoom(m, user.name || 'Scholar'));

  return NextResponse.json({ ok: true, rooms, decks, matches });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || 'create');

  if (action === 'score') {
    const roomCode = String(body.roomCode || '').trim();
    const points = Math.max(10, Number(body.points || 100));
    const existing = await prisma.liveGameSession.findUnique({
      where: { roomCode },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Live room not found' }, { status: 404 });
    }

    const opponentDelta = points > 50 ? 75 : 125;
    const updated = await prisma.liveGameSession.update({
      where: { id: existing.id },
      data: {
        playerScore: existing.playerScore + points,
        opponentScore: existing.opponentScore + opponentDelta,
      },
      include: {
        deck: {
          select: {
            title: true,
            icon: true,
            cards: {
              select: { id: true, question: true, answer: true, optionsJson: true },
              take: 10,
            },
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: 15 },
        gems: { increment: 10 },
      },
    });

    return NextResponse.json({
      ok: true,
      room: serializeLiveRoom(updated, user.name || 'Scholar'),
    });
  }

  if (action === 'join') {
    const roomCode = String(body.roomCode || '').trim().toUpperCase();
    const existing = await prisma.liveGameSession.findUnique({
      where: { roomCode },
      include: {
        deck: {
          select: {
            title: true,
            icon: true,
            cards: {
              select: { id: true, question: true, answer: true, optionsJson: true },
              take: 10,
            },
          },
        },
      },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        room: serializeLiveRoom(existing, user.name || 'Scholar'),
      });
    }
  }

  // Default / 'create' / 'join' fallback: create a live arena room
  let deckId = body.deckId ? String(body.deckId) : '';
  if (!deckId) {
    const firstDeck = await prisma.deck.findFirst({
      where: { OR: [{ ownerId: user.id }, { isPublic: true }] },
      orderBy: { updatedAt: 'desc' },
    });
    if (!firstDeck) {
      return NextResponse.json({ ok: false, error: 'No deck available for Gizmo Live' }, { status: 400 });
    }
    deckId = firstDeck.id;
  }

  const roomCode =
    body.roomCode && String(body.roomCode).trim()
      ? String(body.roomCode).trim().toUpperCase()
      : String(Math.floor(100000 + Math.random() * 900000));

  const match = await prisma.liveGameSession.create({
    data: {
      hostUserId: user.id,
      deckId,
      roomCode,
      opponentName: String(body.opponentName || 'Sofia Tan (NYP Classmate)'),
      playerScore: Number(body.playerScore || 150),
      opponentScore: Number(body.opponentScore || 125),
      status: 'ACTIVE',
      winnerName: user.name || 'You',
    },
    include: {
      deck: {
        select: {
          title: true,
          icon: true,
          cards: {
            select: { id: true, question: true, answer: true, optionsJson: true },
            take: 10,
          },
        },
      },
    },
  });

  return NextResponse.json(
    {
      ok: true,
      match,
      room: serializeLiveRoom(match, user.name || 'Scholar'),
    },
    { status: 201 }
  );
}
