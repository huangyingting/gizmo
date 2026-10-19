'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Search, Copy, Check, BookOpen, Layers } from 'lucide-react';

type PublicDeck = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  owner?: { name: string; handle: string; schoolName: string };
  _count?: { cards: number; subdecks: number };
};

const CATEGORIES = [
  { name: 'All', emoji: '🌐', color: 'bg-slate-100 text-slate-800' },
  { name: 'Computer Science', emoji: '💻', color: 'bg-blue-100 text-blue-800' },
  { name: 'Biology', emoji: '🧬', color: 'bg-emerald-100 text-emerald-800' },
  { name: 'Mathematics', emoji: '📐', color: 'bg-purple-100 text-purple-800' },
  { name: 'Chemistry', emoji: '🧪', color: 'bg-amber-100 text-amber-800' },
  { name: 'Physics', emoji: '⚛️', color: 'bg-indigo-100 text-indigo-800' },
  { name: 'History', emoji: '🏛️', color: 'bg-rose-100 text-rose-800' },
  { name: 'Economics', emoji: '📈', color: 'bg-teal-100 text-teal-800' },
];

export default function PublicDecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/decks?scope=public')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.decks)) {
          setDecks(d.decks);
        }
      })
      .catch(() => {});
  }, []);

  async function handleCloneDeck(deckId: string) {
    setCloningId(deckId);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone' }),
      });
      const data = await res.json();
      if (data.ok && data.deckId) {
        router.push(`/decks/${data.deckId}/path`);
      }
    } finally {
      setCloningId(null);
    }
  }

  const filtered = decks.filter((d) => {
    const matchesCat =
      selectedCategory === 'All' ||
      d.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Header & Search (matching 29-public-decks.png & 30-public-decks-category.png) */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Public decks</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse verified academic decks, AP/IB exam prep, and research paper study paths
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search public decks, topics, or courses..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Category Tiles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap flex items-center gap-2 transition ${
                selectedCategory === cat.name
                  ? 'bg-purple-600 text-white shadow-xs'
                  : `${cat.color} hover:opacity-90`
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Public Decks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((deck) => (
            <div
              key={deck.id}
              className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-purple-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/decks/${deck.id}/path`}
                    className="flex items-center gap-2.5 hover:text-purple-700"
                  >
                    <span className="text-2xl">{deck.icon || '📘'}</span>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {deck.title}
                    </h2>
                  </Link>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                    {deck.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {deck.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    {deck._count?.subdecks ?? 1} steps
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    {deck._count?.cards ?? 0} cards
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={cloningId === deck.id}
                    onClick={() => handleCloneDeck(deck.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{cloningId === deck.id ? 'Cloning...' : 'Save to My Decks'}</span>
                  </button>
                  <Link
                    href={`/decks/${deck.id}/path`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
                  >
                    Study
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
