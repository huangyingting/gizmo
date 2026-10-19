'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Settings,
  Share2,
  Flame,
  Zap,
  Award,
  Layers,
  BookOpen,
} from 'lucide-react';

type ProfilePayload = {
  user: {
    id: string;
    name: string;
    handle: string;
    email: string;
    role: string;
    schoolName: string;
    avatarEmoji: string;
    xp: number;
    coins: number;
    streakDays: number;
    beltRank: string;
    quizzesCompleted: number;
    cardsReviewed: number;
    accuracyPct: number;
    _count?: {
      decks: number;
      notes: number;
      quizSessions: number;
      monsters: number;
    };
  };
  decks: {
    id: string;
    title: string;
    category: string;
    color: string;
    _count?: { cards: number; subdecks: number };
  }[];
  friends?: {
    id: string;
    name: string;
    handle: string;
    schoolName: string;
    xp: number;
    streakDays: number;
    avatar: string;
  }[];
};

export default function ProfileTabsPage() {
  const params = useParams<{ tab?: string[] }>();
  const activeTabRaw = params.tab?.[0] || 'decks';
  const activeTab: 'decks' | 'stats' | 'friends' =
    activeTabRaw === 'stats'
      ? 'stats'
      : activeTabRaw === 'friends'
      ? 'friends'
      : 'decks';

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [cheeredHandles, setCheeredHandles] = useState<string[]>([]);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setProfile(d);
      })
      .catch(() => {});
  }, []);

  const user = profile?.user;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Top User Profile Card (matching 33-profile.png & 34-profile-stats.png) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-3xl flex items-center justify-center">
              {user?.avatarEmoji || '🦖'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {user?.name || 'Jack Huang'}
                </h1>
                {user?.role === 'ADMIN' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                @{user?.handle || 'OptimisticPlaice99276'} ·{' '}
                {user?.schoolName || 'Nanyang Polytechnic'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href).catch(() => {});
                }
                setShareToast(true);
                setTimeout(() => setShareToast(false), 2500);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              title="Share profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {shareToast && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-800">
            Profile link copied to clipboard!
          </div>
        )}

        {/* Profile Sub-Tabs: Decks | Stats | Friends */}
        <div className="flex items-center gap-6 border-b border-slate-200 mt-6">
          <Link
            href="/profile"
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'decks'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Decks ({profile?.decks.length ?? 0})
          </Link>
          <Link
            href="/profile/stats"
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'stats'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Stats
          </Link>
          <Link
            href="/profile/friends"
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'friends'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Friends
          </Link>
        </div>

        {activeTab === 'decks' && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(profile?.decks || []).map((d) => (
              <Link
                key={d.id}
                href={`/decks/${d.id}/path`}
                className="p-5 rounded-3xl border border-slate-200 hover:border-purple-300 bg-white transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: d.color || '#3b82f6' }}
                  />
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {d.title}
                    </div>
                    <div className="text-xs text-slate-400">
                      {d._count?.subdecks ?? 0} steps · {d._count?.cards ?? 0}{' '}
                      cards
                    </div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-purple-600">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-orange-50/70 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-600 text-xs font-extrabold">
                <Flame className="w-4 h-4" />
                <span>Current Streak</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {user?.streakDays ?? 3} days
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 text-purple-600 text-xs font-extrabold">
                <Zap className="w-4 h-4" />
                <span>Total XP</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {user?.xp ?? 1480} XP
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-extrabold">
                <Award className="w-4 h-4" />
                <span>Belt Rank</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                {user?.beltRank || 'White Belt'}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500">
                Cards Reviewed
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {user?.cardsReviewed ?? 142}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500">
                Quizzes Completed
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {user?.quizzesCompleted ?? 5}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-500">
                Recall Accuracy
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {user?.accuracyPct ?? 92}%
              </div>
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="mt-6 space-y-3">
            {(profile?.friends && profile.friends.length > 0
              ? profile.friends.map((f) => ({
                  name: f.name,
                  handle: f.handle,
                  school: f.schoolName,
                  xp: f.xp,
                  emoji: f.avatar,
                }))
              : [
                  {
                    name: 'Aisha Tan',
                    handle: 'QuantumScholar88',
                    school: 'Nanyang Polytechnic',
                    xp: 2150,
                    emoji: '🦊',
                  },
                  {
                    name: 'Lucas Lim',
                    handle: 'NeuralVoyager42',
                    school: 'Nanyang Polytechnic',
                    xp: 1890,
                    emoji: '🦉',
                  },
                ]
            ).map((f) => {
              const cheered = cheeredHandles.includes(f.handle);
              return (
                <div
                  key={f.handle}
                  className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{f.emoji}</span>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {f.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        @{f.handle} · {f.school}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-extrabold">
                      ⚡ {f.xp} XP
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        !cheered &&
                        setCheeredHandles((prev) => [...prev, f.handle])
                      }
                      className={`px-3 py-1 rounded-full text-xs font-extrabold transition ${
                        cheered
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800'
                      }`}
                    >
                      {cheered ? '👏 Cheered!' : '👏 Cheer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
