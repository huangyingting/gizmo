import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const groups = await prisma.studyGroup.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, handle: true, xp: true, beltRank: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, handle: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, groups });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || 'create_group');

  if (action === 'join') {
    const inviteCode = String(body.inviteCode || '').trim().toUpperCase();
    if (!inviteCode) {
      return NextResponse.json({ ok: false, error: 'Invite code required' }, { status: 400 });
    }
    const group = await prisma.studyGroup.findUnique({
      where: { inviteCode },
    });
    if (!group) {
      return NextResponse.json(
        { ok: false, error: `No study group found with invite code "${inviteCode}".` },
        { status: 404 }
      );
    }

    await prisma.studyGroupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      create: {
        groupId: group.id,
        userId: user.id,
        role: 'MEMBER',
      },
      update: {},
    });

    return NextResponse.json({ ok: true, group });
  }

  if (action === 'send_message') {
    const groupId = String(body.groupId || '');
    const content = String(body.content || '').trim();
    if (!groupId || !content) {
      return NextResponse.json({ ok: false, error: 'Message content required' }, { status: 400 });
    }
    const msg = await prisma.studyGroupMessage.create({
      data: {
        groupId,
        userId: user.id,
        content,
        sharedDeckId: body.sharedDeckId ? String(body.sharedDeckId) : null,
      },
      include: {
        user: { select: { id: true, name: true, handle: true } },
      },
    });
    return NextResponse.json({ ok: true, message: msg }, { status: 201 });
  }

  const name = String(body.name || 'New Study Group').trim();
  const description = String(body.description || 'Collaborative flashcard & quiz group').trim();
  const emoji = String(body.emoji || '🎓');
  const inviteCode = `GIZMO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const group = await prisma.studyGroup.create({
    data: {
      name,
      description,
      schoolName: user.schoolName,
      inviteCode,
      emoji,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
      messages: {
        create: {
          userId: user.id,
          content: `Welcome to ${name}! Share your decks and challenge each other in Gizmo Live.`,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, group }, { status: 201 });
}
