'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Sparkles,
  Plus,
  Check,
  FileText,
  ClipboardPaste,
  Presentation,
  Video,
  Camera,
  Mic,
  Layers,
  FileSpreadsheet,
  Globe,
  Upload,
} from 'lucide-react';

type DeckOption = {
  id: string;
  title: string;
  color: string;
};

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDeckId = searchParams.get('deckId') || '';

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [distractor1, setDistractor1] = useState('');
  const [distractor2, setDistractor2] = useState('');
  const [cardType, setCardType] = useState<'MCQ' | 'CLOZE'>('CLOZE');
  const [saving, setSaving] = useState(false);
  const [createdBanner, setCreatedBanner] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [modalSourceType, setModalSourceType] = useState<string | null>(
    searchParams.get('mode')?.toUpperCase() || null
  );
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');

  useEffect(() => {
    fetch('/api/decks?scope=mine')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.decks)) {
          setDecks(d.decks);
          if (!selectedDeckId && d.decks.length > 0) {
            setSelectedDeckId(d.decks[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveManualCard(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      let targetDeckId = selectedDeckId;
      if (!targetDeckId) {
        const createdDeckRes = await fetch('/api/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled' }),
        }).then((r) => r.json());
        if (createdDeckRes.ok) {
          targetDeckId = createdDeckRes.deck.id;
          setSelectedDeckId(targetDeckId);
        }
      }

      const options = [
        answer.trim(),
        distractor1.trim() || 'Recurrent sequential baseline',
        distractor2.trim() || 'Convolutional pooling layer',
      ];

      const res = await fetch(`/api/decks/${targetDeckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          options,
          cardType,
          clozeText: `${question.trim()} {{${answer.trim()}}}`,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreatedBanner(`Saved card to deck! "${question.trim()}"`);
        setQuestion('');
        setAnswer('');
        setDistractor1('');
        setDistractor2('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', 'PDF');
      if (selectedDeckId) formData.append('deckId', selectedDeckId);
      formData.append('createDeckImmediately', 'true');

      const res = await fetch('/api/magic-import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.deckId) {
        router.push(`/decks/${data.deckId}/path`);
      } else if (data.ok && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleInlineMagicImport(e: React.FormEvent) {
    e.preventDefault();
    if (!modalText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: modalTitle.trim() || `${modalSourceType || 'Imported'} Deck`,
          sourceType: modalSourceType || 'PASTE',
          text: modalText.trim(),
          deckId: selectedDeckId || undefined,
          createDeckImmediately: true,
        }),
      });
      const data = await res.json();
      setModalSourceType(null);
      if (data.ok && data.deckId) {
        router.push(`/decks/${data.deckId}/path`);
      } else if (data.ok && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    } finally {
      setImporting(false);
    }
  }

  const magicImportSources = [
    { id: 'PDF', label: 'PDF', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: FileText },
    { id: 'PASTE', label: 'Paste notes', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ClipboardPaste },
    { id: 'PPT', label: 'PowerPoint', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Presentation },
    { id: 'YOUTUBE', label: 'YouTube', color: 'bg-red-50 text-red-700 border-red-200', icon: Video },
    { id: 'PHOTO', label: 'Photograph your notes', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Camera },
    { id: 'LECTURE', label: 'Lecture recording', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: Mic },
    { id: 'QUIZLET', label: 'Quizlet', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers },
    { id: 'WORD', label: 'Word document', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: FileText },
    { id: 'AUDIO', label: 'Upload recording', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Upload },
    { id: 'ANKI', label: 'Anki', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Layers },
    { id: 'SHEETS', label: 'Sheets', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileSpreadsheet },
    { id: 'URL', label: 'Website link', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Globe },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.docx,.txt,.md,.csv"
          onChange={handlePdfUpload}
          className="hidden"
        />

        {/* Header with Target Deck Selector (matching 11-add-page.png & 21a-add-to-deck-page.png) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Adding to
            </span>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-sm font-extrabold text-slate-900"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
              {decks.length === 0 && <option value="">Untitled</option>}
            </select>
          </div>

          {selectedDeckId && (
            <button
              type="button"
              onClick={() => router.push(`/decks/${selectedDeckId}/path`)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
            >
              View Deck & Study →
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left/Center: Manual & Cloze Card Editor */}
          <div className="lg:col-span-6 space-y-4">
            <h1 className="text-lg font-extrabold text-slate-900">
              Create Flashcard or Cloze Card
            </h1>

            {createdBanner && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{createdBanner}</span>
              </div>
            )}

            <form
              onSubmit={handleSaveManualCard}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSaveManualCard(e);
                }
              }}
              className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Question / Cloze Sentence
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCardType('CLOZE')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        cardType === 'CLOZE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Cloze [ _ ]
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardType('MCQ')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        cardType === 'MCQ'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Multiple Choice
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. The Transformer replaces recurrence with _ to allow significantly more parallelization."
                  className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Correct Answer / Highlighted Key Term
                </label>
                <input
                  type="text"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. self-attention"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300 text-sm font-bold text-emerald-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Distractor Option 1 (optional)
                  </label>
                  <input
                    type="text"
                    value={distractor1}
                    onChange={(e) => setDistractor1(e.target.value)}
                    placeholder="Wrong choice A"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Distractor Option 2 (optional)
                  </label>
                  <input
                    type="text"
                    value={distractor2}
                    onChange={(e) => setDistractor2(e.target.value)}
                    placeholder="Wrong choice B"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">
                  Click and drag or use Cloze mode to highlight key terms
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition"
                >
                  {saving ? 'Saving...' : 'Save (Ctrl + ⏎)'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: 12 Magic Import Sources (matching 11-add-page.png) */}
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-extrabold text-slate-900">Magic import</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Automatically convert any academic PDF, lecture slides, YouTube video, or notes into flashcards and study paths.
            </p>

            {importing && (
              <div className="mb-4 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold animate-pulse">
                ✨ Generating Subdecks & Cloze Flashcards from your file...
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {magicImportSources.map((src) => {
                const Icon = src.icon;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => {
                      if (
                        src.id === 'PDF' ||
                        src.id === 'PPT' ||
                        src.id === 'WORD' ||
                        src.id === 'SHEETS' ||
                        src.id === 'AUDIO' ||
                        src.id === 'PHOTO'
                      ) {
                        fileInputRef.current?.click();
                      } else {
                        setModalSourceType(src.id);
                        setModalTitle(`${src.label} Import`);
                        setModalText('');
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition hover:shadow-xs flex flex-col justify-between h-28 ${src.color}`}
                  >
                    <span className="text-xs font-extrabold leading-snug">
                      {src.label}
                    </span>
                    <Icon className="w-6 h-6 self-end opacity-80" />
                  </button>
                );
              })}
            </div>

            {modalSourceType && (
              <form
                onSubmit={handleInlineMagicImport}
                className="mt-5 p-5 rounded-3xl bg-purple-50/60 border border-purple-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800">
                    Magic Import — {modalSourceType}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalSourceType(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Close
                  </button>
                </div>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Deck or Section Title"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                />
                <textarea
                  rows={4}
                  required
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={
                    modalSourceType === 'QUIZLET' || modalSourceType === 'ANKI'
                      ? 'Paste Term :: Definition or tab-separated flashcards...'
                      : modalSourceType === 'URL' || modalSourceType === 'YOUTUBE'
                      ? 'Paste URL (https://...) or video transcript...'
                      : 'Paste lecture notes or study material...'
                  }
                  className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs"
                />
                <button
                  type="submit"
                  disabled={importing}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
                >
                  {importing ? 'Synthesizing Cards...' : 'Import & Generate Study Path'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <AddPageInner />
    </Suspense>
  );
}
