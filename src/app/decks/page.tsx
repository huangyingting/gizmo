'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Plus, Layers, Sparkles, BookOpen, Globe } from 'lucide-react';

type DeckItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  isPublic: boolean;
  _count?: {
    cards: number;
    subdecks: number;
    notes: number;
  };
};

export default function MyDecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Computer Science');
  const [newIsPublic, setNewIsPublic] = useState(false);

  useEffect(() => {
    fetch('/api/decks?scope=mine')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.decks)) {
          setDecks(d.decks);
        }
      })
      .catch(() => {});
  }, []);

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        category: newCategory,
        isPublic: newIsPublic,
      }),
    });
    const data = await res.json();
    if (data.ok && data.deck) {
      setShowNewModal(false);
      router.push(`/decks/${data.deck.id}/path`);
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My decks</h1>
            <p className="text-xs text-slate-500 mt-1">
              Organize your study paths, flashcards, notes, and uploaded PDFs
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/chat"
              className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Magic Import</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New deck</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}/path`}
              className="p-5 rounded-3xl border border-slate-200 hover:border-purple-300 bg-white hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: deck.color || '#3b82f6' }}
                    />
                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                      {deck.title}
                    </h2>
                  </div>
                  {deck.isPublic && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Public
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {deck.description || 'Interactive study path with flashcards and notes.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    {deck._count?.subdecks ?? 0} steps
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    {deck._count?.cards ?? 0} cards
                  </span>
                </div>
                <span className="text-purple-600">Study →</span>
              </div>
            </Link>
          ))}
        </div>

        {showNewModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">
                Create a New Deck
              </h3>
              <form onSubmit={handleCreateDeck} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Deck Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Deep Learning & Transformers"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  >
                    <option>Computer Science</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                    <option>Chemistry</option>
                    <option>History</option>
                    <option>Economics</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsPublic}
                    onChange={(e) => setNewIsPublic(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Make deck discoverable in Public Decks</span>
                </label>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-extrabold"
                  >
                    Create Deck
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
