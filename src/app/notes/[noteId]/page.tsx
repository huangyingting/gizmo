'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Sparkles,
  Gamepad2,
  Share2,
  MoreHorizontal,
  Mic,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Sigma,
  Table,
  ChevronRight,
  Check,
} from 'lucide-react';

type NoteData = {
  id: string;
  deckId: string | null;
  title: string;
  summary: string;
  contentMarkdown: string;
  sourceType: string;
  sourceFilename?: string | null;
  deck?: {
    id: string;
    title: string;
    _count?: { cards: number; subdecks: number };
  } | null;
};

export default function StudyNoteEditorPage() {
  const params = useParams<{ noteId: string }>();
  const router = useRouter();
  const noteId = params.noteId;

  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingCards, setCreatingCards] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    fetch(`/api/notes/${noteId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.note) {
          setNote(d.note);
          setTitle(d.note.title);
          setMarkdown(d.note.contentMarkdown);
        }
      })
      .catch(() => {});
  }, [noteId]);

  async function handleSaveNote() {
    if (!note) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, contentMarkdown: markdown }),
      });
      const data = await res.json();
      if (data.ok) {
        setNote(data.note);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCardsFromNote() {
    if (!note) return;
    setCreatingCards(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_cards', deckName: title }),
      });
      const data = await res.json();
      if (data.ok && data.deckId) {
        router.push(`/decks/${data.deckId}/path`);
      }
    } finally {
      setCreatingCards(false);
    }
  }

  function insertFormatting(snippet: string) {
    setMarkdown((prev) => `${prev}\n${snippet}`);
  }

  if (!note) {
    return (
      <AppShell>
        <div className="p-12 text-center text-sm text-slate-500">
          Loading Study Note...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-4 pb-24">
        {/* Top Breadcrumb & Action Bar (matching 15b-pdf-note-generated.png) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <Link
              href={note.deckId ? `/decks/${note.deckId}/materials` : '/decks'}
              className="inline-flex items-center gap-1.5 hover:text-purple-700"
            >
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
              <span>{note.deck?.title || title}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {note.deckId && (
              <Link
                href={`/decks/${note.deckId}/path`}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Study</span>
              </Link>
            )}
            <button
              type="button"
              disabled={creatingCards}
              onClick={handleCreateCardsFromNote}
              className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{creatingCards ? 'Creating cards...' : 'Create cards'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
            >
              {savedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
              <span>{saving ? 'Saving...' : savedToast ? 'Saved' : 'Save'}</span>
            </button>
            <button
              type="button"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              title="Share Note"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Title & Quick AI Actions ("Record", "Generate notes") */}
        <div className="mt-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-3xl font-extrabold text-slate-900 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={() =>
                insertFormatting(
                  '\n### Recorded Lecture Summary\n- Self-attention connects all sequence tokens with $O(1)$ path length.'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <Mic className="w-3.5 h-3.5 text-rose-500" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={() =>
                insertFormatting(
                  '\n### AI Expanded Mathematical Detail\n- Scaled Dot-Product Attention: $\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$\n- LayerNorm residual wrapper: $\\text{LayerNorm}(x + \\text{Sublayer}(x))$'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Generate notes</span>
            </button>
            {note.sourceFilename && (
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                Source: {note.sourceFilename}
              </span>
            )}
          </div>
        </div>

        {/* Rendered & Editable Academic Note Body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Structured Formatted Preview (matching 15b-pdf-note-generated.png) */}
          <div className="p-6 rounded-3xl bg-amber-50/40 border border-amber-200/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                Generated notes
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Markdown + LaTeX
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed">
              {markdown}
            </div>
          </div>

          {/* Live Markdown / Formula Editor */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Edit Study Note Markdown & Formulas
            </label>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={22}
              className="flex-1 w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Floating Rich-Text Formatting Toolbar at Bottom (matching 15b-pdf-note-generated.png) */}
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-lg rounded-2xl px-3 py-2 flex items-center gap-1.5 z-30">
          <span className="px-2.5 py-1 text-xs font-bold text-slate-700 border-r border-slate-200">
            Text ▾
          </span>
          <button
            type="button"
            onClick={() => insertFormatting('**Bold concept**')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*Italic emphasis*')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('<u>Underlined term</u>')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('~~Strikethrough~~')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- Key bullet point')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('1. Numbered step')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              insertFormatting(
                '$$\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$'
              )
            }
            className="p-1.5 rounded-lg hover:bg-slate-100 text-purple-600"
            title="Insert LaTeX Formula"
          >
            <Sigma className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              insertFormatting(
                '| Layer Type | Complexity | Sequential Ops |\n|---|---|---|\n| Self-Attention | O(n^2 d) | O(1) |'
              )
            }
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            title="Insert Table"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
