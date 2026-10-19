'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronLeft, Sparkles, Lock } from 'lucide-react';

type MonsterItem = {
  id: string;
  monsterKey: string;
  name: string;
  rarity: string;
  emoji: string;
  unlockedAt: string;
};

const ALL_82_MONSTERS = Array.from({ length: 82 }, (_, idx) => {
  const emojis = ['🦖', '🐉', '🐙', '🦊', '🦄', '🦉', '🐸', '🦁', '🐧', '🦋'];
  const names = [
    'Sparky Rex',
    'Neuro Wyrm',
    'Tensor Octo',
    'Attention Fox',
    'Cosine Unicorn',
    'Scholar Owl',
    'Gradient Frog',
    'Matrix Lion',
    'Zero-Shot Penguin',
    'Softmax Moth',
  ];
  return {
    key: `monster-${idx + 1}`,
    number: idx + 1,
    name: `${names[idx % names.length]} #${idx + 1}`,
    emoji: emojis[idx % emojis.length],
    rarity: idx % 10 === 0 ? 'LEGENDARY' : idx % 4 === 0 ? 'EPIC' : 'COMMON',
  };
});

export default function MonsterCollectionPage() {
  const [unlockedMonsters, setUnlockedMonsters] = useState<MonsterItem[]>([]);
  const [equippedCode, setEquippedCode] = useState<string>('');
  const [equipToast, setEquipToast] = useState<string>('');

  useEffect(() => {
    fetch('/api/gamification')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.monsters)) {
          setUnlockedMonsters(d.monsters);
        }
        if (d.ok && d.user?.avatarMonsterCode) {
          setEquippedCode(d.user.avatarMonsterCode);
        }
      })
      .catch(() => {});
  }, []);

  async function handleEquip(monsterKey: string, name: string) {
    setEquippedCode(monsterKey);
    setEquipToast(`Equipped ${name} as your active Gizmonster companion!`);
    await fetch('/api/gamification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'equip_monster', monsterCode: monsterKey }),
    });
  }

  const unlockedKeys = new Set(unlockedMonsters.map((m) => m.monsterKey));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Header (matching 27-monster-collection.png) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/progress"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Monster collection
              </h1>
              <p className="text-xs text-slate-500">
                Complete quizzes to earn mystery boxes and collect Gizmonsters!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-800 text-xs font-extrabold">
              Collected {unlockedMonsters.length} / 82
            </span>
            <Link
              href="/shop"
              className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-xs font-extrabold"
            >
              Open Mystery Box
            </Link>
          </div>
        </div>

        {equipToast && (
          <div className="mt-4 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs font-extrabold text-purple-800">
            {equipToast}
          </div>
        )}

        {/* 82 Gizmonster Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
          {ALL_82_MONSTERS.map((m) => {
            const isUnlocked = unlockedKeys.has(m.key) || m.number === 1;
            const matched = unlockedMonsters.find((u) => u.monsterKey === m.key);
            const codeToEquip =
              (matched as { monsterCode?: string } | undefined)?.monsterCode || m.key;
            const isEquipped =
              equippedCode === codeToEquip || equippedCode === m.key;
            return (
              <button
                type="button"
                key={m.key}
                disabled={!isUnlocked}
                onClick={() =>
                  isUnlocked &&
                  handleEquip(codeToEquip, matched?.name || m.name)
                }
                className={`p-4 rounded-3xl border text-center flex flex-col items-center justify-between h-36 transition ${
                  isEquipped
                    ? 'bg-purple-100/70 border-purple-600 ring-2 ring-purple-200 shadow-xs'
                    : isUnlocked
                    ? 'bg-gradient-to-b from-purple-50/70 to-white border-purple-300 hover:border-purple-500 shadow-2xs cursor-pointer'
                    : 'bg-slate-50 border-slate-200/80 opacity-65 cursor-not-allowed'
                }`}
              >
                <span className="text-[10px] font-extrabold text-slate-400 self-start">
                  #{m.number}
                </span>
                <div className="text-3xl my-1">
                  {isUnlocked ? matched?.emoji || m.emoji : '❓'}
                </div>
                <div className="text-xs font-extrabold text-slate-800 truncate w-full">
                  {isUnlocked ? matched?.name || m.name : 'Locked'}
                </div>
                {isUnlocked && (
                  <span className="text-[10px] font-bold text-purple-600">
                    {isEquipped ? '★ Equipped' : 'Click to Equip'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
