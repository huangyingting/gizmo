'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Gamepad2,
  Plus,
  Share2,
  MoreHorizontal,
  Sparkles,
  FileText,
  Trophy,
  Clock,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

type SubdeckNode = {
  id: string;
  title: string;
  orderIndex: number;
  masteryScore: number;
  cards?: CardItem[];
  _count?: { cards: number };
};

type CardItem = {
  id: string;
  subdeckId: string | null;
  question: string;
  answer: string;
  clozeText: string;
  cardType: string;
  optionsJson: string;
};

type NoteItem = {
  id: string;
  title: string;
  summary: string;
  sourceFilename?: string | null;
};

type ImportItem = {
  id: string;
  filename: string;
  sourceType: string;
  fileHashSha256: string;
};

type LeaderboardRow = {
  id: string;
  name: string;
  handle: string;
  xp: number;
  streakDays: number;
  avatarEmoji: string;
};

type DeckFull = {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  isPublic?: boolean;
  subdecks: SubdeckNode[];
  cards: CardItem[];
  studyNotes?: NoteItem[];
  notes?: NoteItem[];
  importMaterials?: ImportItem[];
  imports?: ImportItem[];
  aiTutorChats?: { id: string; title: string }[];
  chats?: { id: string; title: string }[];
};

export default function DeckDetailTabsPage() {
  const params = useParams<{ deckId: string; tab?: string[] }>();
  const router = useRouter();
  const deckId = params.deckId;
  const activeTabRaw = params.tab?.[0] || 'path';
  const activeTab: 'path' | 'materials' | 'leaderboard' =
    activeTabRaw === 'materials'
      ? 'materials'
      : activeTabRaw === 'leaderboard'
      ? 'leaderboard'
      : 'path';

  const [deck, setDeck] = useState<DeckFull | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [selectedSubdeck, setSelectedSubdeck] = useState<SubdeckNode | null>(null);
  const [selectedStudyMode, setSelectedStudyMode] = useState<'LEARN' | 'MEMORIZE' | 'TEST'>(
    'MEMORIZE'
  );
  const [materialsSubTab, setMaterialsSubTab] = useState<'cards' | 'notes'>('cards');
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [newSubdeckTitle, setNewSubdeckTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  function reloadDeck() {
    fetch(`/api/decks/${deckId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.deck) {
          setDeck(d.deck);
          setLeaderboard(d.leaderboard || []);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    reloadDeck();
  }, [deckId]);

  async function handleTogglePublic() {
    if (!deck) return;
    const res = await fetch(`/api/decks/${deck.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !deck.isPublic }),
    });
    const data = await res.json();
    if (data.ok) {
      reloadDeck();
    }
  }

  async function handleAddSubdeckStep(e: React.FormEvent) {
    e.preventDefault();
    if (!deck || !newSubdeckTitle.trim()) return;
    const res = await fetch(`/api/decks/${deck.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addSubdeckTitle: newSubdeckTitle.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      setNewSubdeckTitle('');
      reloadDeck();
    }
  }

  async function handleDeleteDeck() {
    if (!deck) return;
    const res = await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      router.push('/decks');
    }
  }

  async function handleSaveEditedCard(cardId: string) {
    if (!deck || !editQuestion.trim() || !editAnswer.trim()) return;
    const res = await fetch(`/api/decks/${deck.id}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setEditingCardId(null);
      reloadDeck();
    }
  }

  async function handleDeleteCard(cardId: string) {
    if (!deck) return;
    const res = await fetch(`/api/decks/${deck.id}/cards/${cardId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.ok) {
      reloadDeck();
    }
  }

  async function launchQuizSession(subdeckId?: string | null, mode: string = 'MEMORIZE') {
    if (!deck) return;
    setStartingQuiz(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: deck.id,
          subdeckId: subdeckId || null,
          mode,
        }),
      });
      const data = await res.json();
      const targetSession = data.session || data.quizSession;
      if (data.ok && targetSession) {
        router.push(`/quiz/${targetSession.id}`);
      }
    } finally {
      setStartingQuiz(false);
    }
  }

  function renderHighlightedClozeCard(card: CardItem) {
    // Highlight the answer term in an emerald pill (matching 19a-deck-materials-cards.png)
    const q = card.question;
    if (q.includes('_')) {
      const parts = q.split('_');
      return (
        <p className="text-sm text-slate-800 leading-relaxed">
          {parts[0]}
          <span className="inline-block px-2 py-0.5 mx-1 rounded-md bg-emerald-200/80 text-emerald-950 font-bold">
            {card.answer}
          </span>
          {parts.slice(1).join('_')}
        </p>
      );
    }
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-slate-800">{card.question}</p>
        <p className="text-xs">
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-950 font-bold">
            {card.answer}
          </span>
        </p>
      </div>
    );
  }

  if (!deck) {
    return (
      <AppShell>
        <div className="p-12 text-center text-sm text-slate-500">
          Loading deck study path...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-5 pb-24">
        {/* Top Deck Title & Primary Actions (matching 18a-deck-created-110614490.png) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-md shrink-0"
              style={{ backgroundColor: deck.color || '#3b82f6' }}
            />
            <h1 className="text-2xl font-extrabold text-slate-900">
              {deck.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={startingQuiz}
              onClick={() => launchQuizSession(null, 'MEMORIZE')}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>{startingQuiz ? 'Starting...' : 'Study'}</span>
            </button>
            <Link
              href={`/add?deckId=${deck.id}`}
              className="px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-extrabold flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Link>
            <Link
              href={`/live?deckId=${deck.id}`}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              ⚔️ Gizmo Live
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowSharePanel((v) => !v);
                setShowManagePanel(false);
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              title="Share deck"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManagePanel((v) => !v);
                setShowSharePanel(false);
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share & Public Visibility Drawer */}
        {showSharePanel && (
          <div className="mt-4 p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-purple-900">
                Visibility: {deck.isPublic ? '🌍 Public Community Deck' : '🔒 Private Deck'}
              </span>
              <button
                type="button"
                onClick={handleTogglePublic}
                className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 font-bold text-purple-700 hover:bg-purple-100"
              >
                {deck.isPublic ? 'Make Private' : 'Publish to Public Decks'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold"
            >
              {shareCopied ? 'Copied Link!' : 'Copy Share Link'}
            </button>
          </div>
        )}

        {/* Deck Management Drawer (Add Subdeck Step / Delete Deck) */}
        {showManagePanel && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <form onSubmit={handleAddSubdeckStep} className="flex items-center gap-2">
              <input
                type="text"
                value={newSubdeckTitle}
                onChange={(e) => setNewSubdeckTitle(e.target.value)}
                placeholder="New subdeck step title..."
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold"
              >
                + Add Step
              </button>
            </form>
            <button
              type="button"
              onClick={handleDeleteDeck}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold"
            >
              Delete Deck
            </button>
          </div>
        )}

        {/* 3 Navigation Tabs: Path | Materials | Leaderboard */}
        <div className="flex items-center gap-6 border-b border-slate-200 mt-6">
          <Link
            href={`/decks/${deck.id}/path`}
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'path'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Path
          </Link>
          <Link
            href={`/decks/${deck.id}/materials`}
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'materials'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Materials
          </Link>
          <Link
            href={`/decks/${deck.id}/leaderboard`}
            className={`pb-3 text-sm font-extrabold border-b-2 transition ${
              activeTab === 'leaderboard'
                ? 'border-purple-600 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Leaderboard
          </Link>
        </div>

        {/* TAB 1: PATH — Duolingo-Style Stepping Stones & Subdeck Popover (matching 18a & 19b) */}
        {activeTab === 'path' && (
          <div className="mt-10 flex flex-col items-center space-y-8 relative">
            {deck.subdecks.length === 0 ? (
              <div className="p-10 rounded-3xl bg-slate-50 border border-slate-200 text-center max-w-md">
                <p className="text-sm font-bold text-slate-800">
                  This deck doesn&apos;t have study steps yet.
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Add flashcards or use AI Magic Import to generate a structured study path.
                </p>
                <Link
                  href={`/add?deckId=${deck.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-extrabold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add cards</span>
                </Link>
              </div>
            ) : (
              deck.subdecks.map((sub, idx) => {
                // Zig-zag horizontal offset like Duolingo/Gizmo stepping stones
                const offsets = ['translate-x-0', '-translate-x-8', 'translate-x-0', 'translate-x-8'];
                const offsetClass = offsets[idx % offsets.length];
                const isSelected = selectedSubdeck?.id === sub.id;

                return (
                  <div
                    key={sub.id}
                    className={`flex flex-col items-center ${offsetClass} relative`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSubdeck(isSelected ? null : sub)
                      }
                      className={`w-16 h-14 rounded-full border-b-4 flex items-center justify-center font-extrabold text-base shadow-sm transition transform hover:scale-105 ${
                        (sub.masteryScore ?? 0) >= 80
                          ? 'bg-emerald-500 border-emerald-700 text-white'
                          : isSelected
                          ? 'bg-purple-600 border-purple-800 text-white ring-4 ring-purple-200'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-purple-50 hover:border-purple-300'
                      }`}
                    >
                      {sub.orderIndex}
                    </button>
                    <span className="mt-2 text-xs font-bold text-slate-700 max-w-[230px] text-center leading-snug">
                      {sub.title}
                    </span>

                    {/* Subdeck Node Popover (matching 19b-deck-subdeck-popover.png) */}
                    {isSelected && (
                      <div className="mt-3 w-80 p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-xl z-20">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-extrabold text-slate-900 truncate">
                            {sub.title}
                          </h3>
                          <span className="text-[11px] font-bold text-slate-400">
                            {sub.cards?.length ?? sub._count?.cards ?? 6} cards · {sub.masteryScore ?? 0}%
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => setSelectedStudyMode('LEARN')}
                            className={`p-2.5 rounded-2xl border text-center transition ${
                              selectedStudyMode === 'LEARN'
                                ? 'border-purple-600 bg-purple-50/70'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl">🦉</div>
                            <div className="text-[11px] font-extrabold text-slate-900 mt-1">
                              Learn
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedStudyMode('MEMORIZE')}
                            className={`p-2.5 rounded-2xl border text-center transition ${
                              selectedStudyMode === 'MEMORIZE'
                                ? 'border-purple-600 bg-purple-50/70'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl">🐘</div>
                            <div className="text-[11px] font-extrabold text-slate-900 mt-1">
                              Memorize
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedStudyMode('TEST')}
                            className={`p-2.5 rounded-2xl border text-center transition ${
                              selectedStudyMode === 'TEST'
                                ? 'border-purple-600 bg-purple-50/70'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl">📜</div>
                            <div className="text-[11px] font-extrabold text-slate-900 mt-1">
                              Test
                            </div>
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={startingQuiz}
                          onClick={() => launchQuizSession(sub.id, selectedStudyMode)}
                          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition"
                        >
                          {startingQuiz ? 'Loading quiz...' : 'Study'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: MATERIALS — Cards (91) & Notes / Imports (matching 18b & 19a) */}
        {activeTab === 'materials' && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setMaterialsSubTab('cards')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    materialsSubTab === 'cards'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Cards ({deck.cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialsSubTab('notes')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    materialsSubTab === 'notes'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Notes ({(deck.studyNotes || deck.notes || []).length + (deck.importMaterials || deck.imports || []).length})
                </button>
              </div>

              <Link
                href={`/add?deckId=${deck.id}`}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add material</span>
              </Link>
            </div>

            {materialsSubTab === 'cards' ? (
              <div className="space-y-8">
                {deck.subdecks.map((sub) => {
                  const subCards = deck.cards.filter((c) => c.subdeckId === sub.id);
                  if (subCards.length === 0) return null;
                  return (
                    <div key={sub.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {sub.orderIndex}. {sub.title}{' '}
                          <span className="text-slate-400 font-semibold">
                            ({subCards.length})
                          </span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => launchQuizSession(sub.id, 'MEMORIZE')}
                          className="text-xs font-bold text-purple-600 hover:underline"
                        >
                          Study section →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {subCards.map((card) => (
                          <div
                            key={card.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-2"
                          >
                            {editingCardId === card.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editQuestion}
                                  onChange={(e) => setEditQuestion(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                                />
                                <input
                                  type="text"
                                  value={editAnswer}
                                  onChange={(e) => setEditAnswer(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCardId(null)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedCard(card.id)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold"
                                  >
                                    Save Card
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {renderHighlightedClozeCard(card)}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCardId(card.id);
                                      setEditQuestion(card.question);
                                      setEditAnswer(card.answer);
                                    }}
                                    className="text-slate-400 hover:text-purple-600 font-bold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="text-slate-400 hover:text-rose-600 font-bold"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned cards if any */}
                {deck.cards.filter((c) => !c.subdeckId).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      General Cards
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {deck.cards
                        .filter((c) => !c.subdeckId)
                        .map((card) => (
                          <div
                            key={card.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
                          >
                            {renderHighlightedClozeCard(card)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Notes section (matching 18b-deck-materials-tab.png) */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Notes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {(deck.studyNotes || deck.notes || []).map((note) => (
                      <Link
                        key={note.id}
                        href={`/notes/${note.id}?deckId=${deck.id}`}
                        className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 hover:border-amber-400 transition flex items-start gap-3"
                      >
                        <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {note.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {note.summary}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Imports section */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Imports
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {(deck.importMaterials || deck.imports || []).map((imp) => (
                      <div
                        key={imp.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-md bg-rose-500 text-white text-[10px] font-extrabold">
                            {imp.sourceType}
                          </span>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">
                              {imp.filename}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              SHA256: {imp.fileHashSha256.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                        {(deck.aiTutorChats || deck.chats)?.[0] && (
                          <Link
                            href={`/chat/${(deck.aiTutorChats || deck.chats)![0].id}`}
                            className="text-xs font-bold text-purple-600 hover:underline"
                          >
                            AI Chat →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEADERBOARD — Weekly Reset Timer & Rankings (matching 18c-deck-leaderboard-tab.png) */}
        {activeTab === 'leaderboard' && (
          <div className="mt-6 space-y-6">
            <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200/70 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-500" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Deck Weekly Leaderboard
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Resets in 5 days</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchQuizSession(null, 'MEMORIZE')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-extrabold"
              >
                Study to climb ranks
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
              {leaderboard.map((row, i) => (
                <div
                  key={row.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        i === 0
                          ? 'bg-amber-400 text-slate-950'
                          : i === 1
                          ? 'bg-slate-200 text-slate-800'
                          : i === 2
                          ? 'bg-amber-700/20 text-amber-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xl">{row.avatarEmoji || '🦖'}</span>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {row.name}
                      </div>
                      <div className="text-xs text-slate-400">@{row.handle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-extrabold">
                    <span className="text-orange-500">🔥 {row.streakDays}d</span>
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                      ⚡ {row.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
