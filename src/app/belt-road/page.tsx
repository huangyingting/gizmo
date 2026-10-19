'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Award, ChevronLeft, Gift, CheckCircle2, Lock } from 'lucide-react';

type BeltTier = {
  rank: string;
  minXp: number;
  rewardGems: number;
  color: string;
  badge: string;
};

export default function BeltRoadPage() {
  const [belts, setBelts] = useState<BeltTier[]>([]);
  const [userXp, setUserXp] = useState(1480);
  const [currentBelt, setCurrentBelt] = useState('White Belt');
  const [claimingBelt, setClaimingBelt] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState('');

  useEffect(() => {
    fetch('/api/gamification')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setBelts(d.belts || []);
          setUserXp(d.user?.xp ?? 1480);
          setCurrentBelt(d.user?.beltRank || 'White Belt');
        }
      })
      .catch(() => {});
  }, []);

  async function handleClaimBelt(beltRank: string) {
    setClaimingBelt(beltRank);
    setClaimMessage('');
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_belt', beltRank }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setCurrentBelt(data.user.beltRank);
        setClaimMessage(
          data.rewardedGems > 0
            ? `Equipped ${beltRank} and claimed +${data.rewardedGems} Gems!`
            : `Equipped ${beltRank}!`
        );
      }
    } finally {
      setClaimingBelt(null);
    }
  }

  const nextBelt =
    belts.find((b) => b.minXp > userXp) ||
    belts[belts.length - 1];
  const remaining = Math.max(
    1,
    Math.ceil(((nextBelt?.minXp ?? 100) - userXp) / 25)
  );

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Top Bar (matching 26-belt-road.png) */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/progress"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Belt Road
              </h1>
              <p className="text-xs text-slate-500">
                Current rank: <strong>{currentBelt}</strong> ({userXp} XP)
              </p>
            </div>
          </div>

          <Link
            href="/decks"
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold"
          >
            Complete a Quiz
          </Link>
        </div>

        {/* Next Milestone Banner */}
        <div className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Next Milestone
            </div>
            <div className="text-xl font-extrabold mt-1">
              {remaining} Quizzes until {nextBelt?.rank || 'Yellow Belt'}
            </div>
            <div className="text-xs text-purple-100 mt-1">
              Reward: {nextBelt?.rewardGems ?? 250} Gems + Mystery Box
            </div>
          </div>
          <div className="text-4xl">🥋</div>
        </div>

        {claimMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-800">
            {claimMessage}
          </div>
        )}

        {/* Vertical Belt Road Track */}
        <div className="mt-8 space-y-4">
          {belts.map((belt, idx) => {
            const unlocked = userXp >= belt.minXp;
            const isEquipped = currentBelt === belt.rank;
            return (
              <div
                key={belt.rank}
                className={`p-5 rounded-3xl border-2 flex items-center justify-between transition ${
                  isEquipped
                    ? 'border-purple-600 bg-purple-50/40'
                    : unlocked
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl border border-slate-300 flex items-center justify-center font-extrabold text-sm shadow-2xs"
                    style={{
                      backgroundColor: belt.color,
                      color:
                        belt.rank === 'Black Belt' ||
                        belt.rank === 'Purple Belt' ||
                        belt.rank === 'Blue Belt' ||
                        belt.rank === 'Brown Belt'
                          ? '#ffffff'
                          : '#0f172a',
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {belt.rank}
                      </h3>
                      {isEquipped && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold uppercase">
                          Equipped
                        </span>
                      )}
                      {unlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requires {belt.minXp} XP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unlocked && !isEquipped && (
                    <button
                      type="button"
                      disabled={claimingBelt === belt.rank}
                      onClick={() => handleClaimBelt(belt.rank)}
                      className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
                    >
                      {claimingBelt === belt.rank ? 'Claiming...' : 'Equip & Claim'}
                    </button>
                  )}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>+{belt.rewardGems} Gems</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
