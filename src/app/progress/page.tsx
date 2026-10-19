'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  UserPlus,
  ShoppingBag,
  Award,
  Sparkles,
  Flame,
  Trophy,
  CheckCircle2,
} from 'lucide-react';

type GamificationState = {
  user: {
    id: string;
    name: string;
    handle: string;
    xp: number;
    coins: number;
    streakDays: number;
    beltRank: string;
    beltProgress: number;
    quizzesCompleted: number;
    weeklyQuestDone: number;
    weeklyQuestGoal: number;
  };
  leaderboard: {
    id: string;
    name: string;
    handle: string;
    xp: number;
    streakDays: number;
    beltRank: string;
    avatarEmoji: string;
  }[];
};

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function SocialProgressPage() {
  const [data, setData] = useState<GamificationState | null>(null);
  const [friendBanner, setFriendBanner] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gamification')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
      })
      .catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Top Gamification Navigation Cards (matching 25-social-progress.png) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() =>
              setFriendBanner(
                'Invite link copied! Share your handle @' +
                  (data?.user.handle || 'OptimisticPlaice99276')
              )
            }
            className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-left transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">
                Add friends
              </div>
              <div className="text-[11px] text-slate-500">Study together</div>
            </div>
          </button>

          <Link
            href="/shop"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-left transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Shop</div>
              <div className="text-[11px] text-slate-500">
                🪙 {data?.user.coins ?? 250} coins
              </div>
            </div>
          </Link>

          <Link
            href="/belt-road"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-left transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">
                Belt Road
              </div>
              <div className="text-[11px] text-slate-500">
                🥋 {data?.user.beltRank || 'White Belt'}
              </div>
            </div>
          </Link>

          <Link
            href="/monster-collection"
            className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-left transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">
                Gizmonsters
              </div>
              <div className="text-[11px] text-slate-500">Collect 82</div>
            </div>
          </Link>
        </div>

        {friendBanner && (
          <div className="mt-4 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold">
            {friendBanner}
          </div>
        )}

        {/* Streak & Weekly Quest Row */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Streak Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Flame className="w-7 h-7 text-orange-500 fill-orange-500" />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {data?.user.streakDays ?? 3} day streak
                  </h2>
                  <p className="text-xs text-slate-500">
                    Complete 1 quiz every day to keep your flame lit!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {WEEK_DAYS.map((day, idx) => {
                const active = idx < (data?.user.streakDays ?? 3);
                return (
                  <div
                    key={day}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50"
                  >
                    <span className="text-[11px] font-bold text-slate-500">
                      {day}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        active
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {active ? '🔥' : '·'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Quest Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                  Weekly Quest
                </span>
                <span className="text-xs font-bold text-slate-500">
                  🎁 Mystery Box Reward
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                Complete {data?.user.weeklyQuestGoal ?? 10} Quizzes
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Finish quizzes in any deck to unlock a Gizmonster mystery chest.
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                <span>Progress</span>
                <span>
                  {data?.user.weeklyQuestDone ?? 2} /{' '}
                  {data?.user.weeklyQuestGoal ?? 10}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white overflow-hidden border border-purple-200">
                <div
                  className="h-full bg-purple-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((data?.user.weeklyQuestDone ?? 2) /
                          Math.max(1, data?.user.weeklyQuestGoal ?? 10)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global / School Leaderboard */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-extrabold text-slate-900">
                Leaderboard
              </h2>
            </div>
            <Link
              href="/decks"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold"
            >
              Study to earn XP
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {(data?.leaderboard || []).map((u, idx) => (
              <div
                key={u.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700/20 text-amber-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-2xl">{u.avatarEmoji || '🦖'}</span>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {u.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      @{u.handle} · {u.beltRank}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-extrabold">
                  <span className="text-orange-500">🔥 {u.streakDays}d</span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                    ⚡ {u.xp} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
