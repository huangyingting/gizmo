'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronLeft, Crown, CheckCircle2 } from 'lucide-react';

export default function ShopPage() {
  const [coins, setCoins] = useState(250);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gamification')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.user) {
          setCoins(d.user.coins);
        }
      })
      .catch(() => {});
  }, []);

  async function handleBuyItem(itemKey: string, cost: number, label: string) {
    setPurchasing(itemKey);
    setMessage(null);
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shop_buy',
          itemCode: itemKey,
          itemName: label,
          costGems: cost,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCoins(data.user.gems ?? data.user.coins ?? 200);
        setMessage(
          itemKey === 'egg-rare'
            ? `🎉 Purchased ${label} and unlocked a new Gizmonster!`
            : `✅ Purchased ${label}!`
        );
      } else {
        setMessage(data.error || 'Not enough gems.');
      }
    } finally {
      setPurchasing(null);
    }
  }

  const shopItems = [
    {
      key: 'streak_freeze',
      name: 'Streak Freeze',
      description: 'Protects your daily study streak for 1 missed day.',
      cost: 100,
      emoji: '🧊',
      color: 'bg-sky-50 border-sky-200',
    },
    {
      key: 'mystery_box',
      name: 'Gizmonster Mystery Box',
      description: 'Unlocks 1 random collectible Gizmonster for your collection.',
      cost: 75,
      emoji: '🎁',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      key: 'double_xp',
      name: '2x XP Boost Potion',
      description: 'Grants +200 bonus XP immediately toward the weekly leaderboard.',
      cost: 50,
      emoji: '🧪',
      color: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Top Bar (matching 28-shop.png) */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/progress"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900">Shop</h1>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-extrabold">
            🪙 {coins} Coins
          </div>
        </div>

        {message && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Gizmo Pro Banner */}
        <div className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">Gizmo Pro — Unlimited AI & Hearts</h2>
              <p className="text-xs text-purple-100 mt-0.5">
                Unlimited PDF uploads, unlimited AI Explain tutor, and infinite quiz hearts.
              </p>
            </div>
          </div>
          <Link
            href="/subscribe/benefits"
            className="px-5 py-2.5 rounded-xl bg-white text-purple-800 text-xs font-extrabold shadow-xs"
          >
            View Benefits
          </Link>
        </div>

        {/* Power-Ups & Mystery Boxes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {shopItems.map((item) => (
            <div
              key={item.key}
              className={`p-6 rounded-3xl border flex flex-col justify-between ${item.color}`}
            >
              <div>
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <button
                type="button"
                disabled={purchasing === item.key}
                onClick={() => handleBuyItem(item.key, item.cost, item.name)}
                className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
              >
                {purchasing === item.key ? 'Purchasing...' : `Buy for 🪙 ${item.cost}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
