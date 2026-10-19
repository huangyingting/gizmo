import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export const MONSTER_CATALOG = [
  { code: 'ember-dragon', name: 'Pyroblit', emoji: '🐉', element: 'Fire', rarity: 'COMMON' },
  { code: 'aqua-axolotl', name: 'Axolume', emoji: '🦎', element: 'Water', rarity: 'COMMON' },
  { code: 'volt-owl', name: 'Strigawatt', emoji: '🦉', element: 'Storm', rarity: 'RARE' },
  { code: 'crystal-kitsune', name: 'Kitsunova', emoji: '🦊', element: 'Crystal', rarity: 'RARE' },
  { code: 'chrono-phoenix', name: 'Aethelwing', emoji: '🦅', element: 'Cosmic', rarity: 'LEGENDARY' },
  { code: 'nebula-leviathan', name: 'Astralith', emoji: '🐋', element: 'Void', rarity: 'LEGENDARY' },
];

export const BELT_RANKS = [
  { rank: 'White Belt', minXp: 0, rewardGems: 100, color: '#E2E8F0', badge: '🥋' },
  { rank: 'Yellow Belt', minXp: 50, rewardGems: 250, color: '#FACC15', badge: '💛' },
  { rank: 'Orange Belt', minXp: 150, rewardGems: 400, color: '#FB923C', badge: '🧡' },
  { rank: 'Green Belt', minXp: 300, rewardGems: 600, color: '#4ADE80', badge: '💚' },
  { rank: 'Blue Belt', minXp: 500, rewardGems: 900, color: '#60A5FA', badge: '💙' },
  { rank: 'Purple Belt', minXp: 800, rewardGems: 1200, color: '#C084FC', badge: '💜' },
  { rank: 'Brown Belt', minXp: 1200, rewardGems: 1800, color: '#A16207', badge: '🤎' },
  { rank: 'Black Belt', minXp: 2000, rewardGems: 3000, color: '#1E293B', badge: '🖤' },
];

const SHOP_ITEM_PRICES: Record<string, { costGems: number; itemName: string }> = {
  streak_freeze: { costGems: 150, itemName: 'Streak Freeze' },
  mystery_box: { costGems: 250, itemName: 'Gizmonster Mystery Box' },
  double_xp: { costGems: 100, itemName: '2x XP Booster (30m)' },
};

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

  const [leaderboardRaw, transactions, recentSessions, dailyActivities, quizzesCompleted] =
    await Promise.all([
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { xp: 'desc' },
        select: {
          id: true,
          name: true,
          handle: true,
          schoolName: true,
          xp: true,
          gems: true,
          streakDays: true,
          beltRank: true,
          avatarMonsterCode: true,
        },
        take: 15,
      }),
      prisma.shopTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.quizSession.findMany({
        where: { userId: user.id },
        include: { deck: { select: { title: true, icon: true } } },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.dailyActivity.findMany({
        where: { userId: user.id },
        orderBy: { dateKey: 'desc' },
        take: 14,
      }),
      prisma.quizSession.count({
        where: { userId: user.id, status: 'COMPLETED' },
      }),
    ]);

  const monsters = (user.monsters || []).map((m, idx) => ({
    ...m,
    monsterKey: m.monsterCode.startsWith('monster-')
      ? m.monsterCode
      : `monster-${idx + 1}`,
  }));

  const leaderboard = leaderboardRaw.map((u) => ({
    ...u,
    avatarEmoji: MONSTER_EMOJI_MAP[u.avatarMonsterCode] || '🦖',
  }));

  const weeklyQuestGoal = Math.max(9, (user.dailyGoalQuizzes || 3) * 3);
  const weeklyQuestDone = Math.min(weeklyQuestGoal, Math.max(3, quizzesCompleted));

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      coins: user.gems,
      avatarEmoji: MONSTER_EMOJI_MAP[user.avatarMonsterCode] || '🐉',
      quizzesCompleted,
      weeklyQuestDone,
      weeklyQuestGoal,
    },
    monsters,
    catalog: MONSTER_CATALOG,
    belts: BELT_RANKS,
    leaderboard,
    transactions,
    recentSessions,
    dailyActivities,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || '');

  // 1. Purchase item in Shop
  if (action === 'shop_buy') {
    const itemCode = String(body.itemCode || '');
    const preset = SHOP_ITEM_PRICES[itemCode];
    const itemName = String(body.itemName || preset?.itemName || itemCode);
    const costGems = Math.max(
      0,
      Number(body.costGems ?? body.cost ?? preset?.costGems ?? 100)
    );

    if (user.gems < costGems) {
      return NextResponse.json(
        { ok: false, error: `Not enough Gems! Need ${costGems}, you have ${user.gems}.` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      gems: user.gems - costGems,
    };

    let unlockedMonster: string | null = null;

    if (itemCode.startsWith('hints-')) {
      const qty = Number(itemCode.split('-')[1] || 5);
      updateData.hints = user.hints + qty;
    } else if (itemCode.startsWith('hearts-')) {
      const qty = Number(itemCode.split('-')[1] || 5);
      updateData.hearts = user.hearts + qty;
    } else if (itemCode === 'streak_freeze' || itemCode.startsWith('freeze-')) {
      const qty = itemCode.startsWith('freeze-')
        ? Number(itemCode.split('-')[1] || 1)
        : 1;
      updateData.streakFreezes = user.streakFreezes + qty;
    } else if (itemCode === 'double_xp') {
      updateData.xp = user.xp + 200;
    } else if (itemCode === 'dark-mode') {
      updateData.darkModeUnlocked = true;
      updateData.darkModeEnabled = true;
    } else if (itemCode === 'mystery_box' || itemCode.startsWith('egg-')) {
      const owned = await prisma.monsterOwnership.findMany({
        where: { userId: user.id },
      });
      const ownedCodes = new Set(owned.map((o) => o.monsterCode));
      let nextMonsterKey = `monster-${owned.length + 1}`;
      for (let i = 1; i <= 82; i++) {
        if (!ownedCodes.has(`monster-${i}`)) {
          nextMonsterKey = `monster-${i}`;
          break;
        }
      }
      const picked =
        MONSTER_CATALOG.find((m) => !ownedCodes.has(m.code)) ||
        MONSTER_CATALOG[owned.length % MONSTER_CATALOG.length];
      const codeToSave = !ownedCodes.has(picked.code) ? picked.code : nextMonsterKey;

      await prisma.monsterOwnership.upsert({
        where: {
          userId_monsterCode: {
            userId: user.id,
            monsterCode: codeToSave,
          },
        },
        create: {
          userId: user.id,
          monsterCode: codeToSave,
          name: `${picked.name}`,
          emoji: picked.emoji,
          element: picked.element,
          rarity: picked.rarity,
          level: 1,
          essenceXp: 25,
        },
        update: {
          level: { increment: 1 },
          essenceXp: { increment: 50 },
        },
      });
      unlockedMonster = `${picked.emoji} ${picked.name}`;
    } else if (itemCode.startsWith('essence-')) {
      await prisma.monsterOwnership.updateMany({
        where: { userId: user.id, isEquipped: true },
        data: { level: { increment: 1 }, essenceXp: { increment: 40 } },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await prisma.shopTransaction.create({
      data: {
        userId: user.id,
        itemCode,
        itemName,
        costGems,
      },
    });

    return NextResponse.json({
      ok: true,
      user: { ...updatedUser, coins: updatedUser.gems },
      unlockedMonster,
    });
  }

  // 2. Claim Belt Road milestone
  if (action === 'claim_belt') {
    const beltName = String(body.beltRank || 'Yellow Belt');
    const beltInfo = BELT_RANKS.find((b) => b.rank === beltName);
    if (!beltInfo) {
      return NextResponse.json({ ok: false, error: 'Unknown belt' }, { status: 400 });
    }

    const claimed: string[] = JSON.parse(user.claimedBeltsJson || '["White Belt"]');
    const isFirstClaim = !claimed.includes(beltName);
    if (isFirstClaim) {
      claimed.push(beltName);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        beltRank: beltName,
        claimedBeltsJson: JSON.stringify(claimed),
        gems: isFirstClaim ? user.gems + beltInfo.rewardGems : user.gems,
      },
    });

    return NextResponse.json({
      ok: true,
      user: { ...updatedUser, coins: updatedUser.gems },
      rewardedGems: isFirstClaim ? beltInfo.rewardGems : 0,
    });
  }

  // 3. Equip Gizmonster companion
  if (action === 'equip_monster') {
    const monsterCode = String(body.monsterCode || '');
    await prisma.monsterOwnership.updateMany({
      where: { userId: user.id },
      data: { isEquipped: false },
    });
    await prisma.monsterOwnership.updateMany({
      where: { userId: user.id, monsterCode },
      data: { isEquipped: true },
    });
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarMonsterCode: monsterCode },
    });
    return NextResponse.json({
      ok: true,
      user: { ...updatedUser, coins: updatedUser.gems },
    });
  }

  return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
}
