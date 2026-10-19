'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Upload,
  ClipboardPaste,
  Video,
  Mic,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Send,
  Sparkles,
  FileText,
  Globe,
  BookOpen,
  Table,
  Layers,
} from 'lucide-react';

type PublicDeckCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  owner?: { name: string; handle: string; schoolName: string };
  _count?: { cards: number; subdecks: number };
};

export default function HomeChatHubPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [modalMode, setModalMode] = useState<string | null>(null);
  const [modalInputText, setModalInputText] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [publicDecks, setPublicDecks] = useState<PublicDeckCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/decks?scope=public')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.decks)) {
          setPublicDecks(d.decks);
        }
      })
      .catch(() => {});
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(`Uploading ${file.name} and analyzing with Gizmo AI...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', 'PDF');
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else {
        setImportStatus(data.error || 'Upload failed.');
        setImporting(false);
      }
    } catch {
      setImportStatus('Upload failed.');
      setImporting(false);
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalInputText.trim()) return;
    setImporting(true);
    setImportStatus(`Analyzing ${modalMode} material...`);
    try {
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: modalTitle.trim() || `${modalMode} Study Material`,
          sourceType: modalMode || 'PASTE',
          text: modalInputText.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else {
        setImporting(false);
      }
    } catch {
      setImporting(false);
    }
  }

  async function handleFreeformPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setImporting(true);
    setImportStatus(`Creating AI Tutor session for "${promptInput.trim()}"...`);
    try {
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: promptInput.trim(),
          sourceType: 'PROMPT',
          text: promptInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else {
        setImporting(false);
      }
    } catch {
      setImporting(false);
    }
  }

  const filteredPublicDecks = publicDecks.filter((d) =>
    !searchQuery.trim()
      ? true
      : d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 pb-16">
        {/* Top Bar with Gizmo Live & Notifications */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <Link
            href="/live"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-extrabold transition"
          >
            <Gamepad2 className="w-4 h-4 text-purple-600" />
            <span>Gizmo Live</span>
          </Link>
        </div>

        {/* Hidden File Input for PDF / PPT / Word / CSV */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.rtf,.html,.epub"
          onChange={handleFileSelected}
          className="hidden"
          data-testid="pdf-file-input"
        />

        {/* Hero Section: "What shall we Study?" (matching 09-authed-home-chat.png) */}
        <div className="text-center mt-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            What shall we{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Study?
            </span>
          </h1>
          {importing && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-sm font-bold animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Primary Import Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">Upload file</div>
              <div className="text-xs text-slate-500">PDF, PPT...</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('PASTE');
              setModalTitle('');
              setModalInputText('');
            }}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 text-left transition"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">Paste</div>
              <div className="text-xs text-slate-500">Paste any text</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('YOUTUBE');
              setModalTitle('YouTube Lecture');
              setModalInputText('');
            }}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 text-left transition"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">YouTube</div>
              <div className="text-xs text-slate-500">Paste a link</div>
            </div>
          </button>
        </div>

        {/* Expanded Options when "See more options" is clicked (matching 10-home-see-more-options.png) */}
        {showMoreOptions && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto mt-3.5">
            <button
              type="button"
              onClick={() => {
                setModalMode('LECTURE');
                setModalTitle('Recorded Lecture Notes');
                setModalInputText(
                  'Professor lecture transcript on Transformer self-attention and encoder-decoder stacks.'
                );
              }}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Record</div>
                <div className="text-xs text-slate-500">Record a lecture</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('QUIZLET');
                setModalTitle('Quizlet Imported Set');
                setModalInputText('');
              }}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Quizlet</div>
                <div className="text-xs text-slate-500">Paste a link</div>
              </div>
            </button>

            <Link
              href="/decks"
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Select a deck</div>
                <div className="text-xs text-slate-500">From your library</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setModalMode('ANKI');
                setModalTitle('Anki Imported Deck');
                setModalInputText('');
              }}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Anki</div>
                <div className="text-xs text-slate-500">Import deck</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('SHEETS');
                setModalTitle('Spreadsheet Flashcards');
                setModalInputText('');
              }}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Sheets</div>
                <div className="text-xs text-slate-500">CSV / Excel</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('URL');
                setModalTitle('Website Article');
                setModalInputText('');
              }}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 text-left transition"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Website link</div>
                <div className="text-xs text-slate-500">Import webpage</div>
              </div>
            </button>
          </div>
        )}

        {/* See more / See less toggle */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => setShowMoreOptions((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
          >
            {showMoreOptions ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>See less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>See more options</span>
              </>
            )}
          </button>
        </div>

        {/* Freeform AI Prompt Input ("I want to study...") */}
        <form onSubmit={handleFreeformPrompt} className="max-w-2xl mx-auto mt-6">
          <div className="flex items-center gap-2 p-2.5 pl-4 rounded-2xl bg-slate-100 border border-slate-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white transition">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm text-lg font-bold"
              title="Attach PDF or file"
            >
              +
            </button>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="I want to study..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-sm transition"
              aria-label="Send study prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Play Gizmo Live Banner */}
        <div className="max-w-2xl mx-auto mt-8">
          <Link
            href="/live"
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-purple-50 to-pink-50 border border-purple-200/70 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="text-3xl">⚔️</div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Play Gizmo Live
                </div>
                <div className="text-xs text-slate-500">
                  10,380,862 players · Challenge classmates in real time
                </div>
              </div>
            </div>
            <span className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">
              Play now
            </span>
          </Link>
        </div>

        {/* Popular at Nanyang Polytechnic & Public Decks */}
        <div className="max-w-2xl mx-auto mt-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Popular at Nanyang Polytechnic
              </h2>
              <p className="text-xs text-slate-500">
                Top community & academic decks studied by your peers
              </p>
            </div>
            <Link
              href="/decks/public"
              className="text-xs font-bold text-purple-600 hover:underline"
            >
              See all
            </Link>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 5 billion flashcards..."
            className="w-full px-4 py-2.5 mb-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredPublicDecks.map((deck) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}/path`}
                className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white hover:shadow-sm transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{deck.icon || '📘'}</span>
                    <span className="text-sm font-extrabold text-slate-900 truncate">
                      {deck.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {deck.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>
                    {deck._count?.subdecks ?? 1} steps · {deck._count?.cards ?? 0} cards
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {deck.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Paste / YouTube / URL / Lecture Import Modal */}
        {modalMode && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Magic Import — {modalMode}
                </h3>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-lg"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Deck / Topic Title
                  </label>
                  <input
                    type="text"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Attention Is All You Need"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {modalMode === 'YOUTUBE' || modalMode === 'URL' || modalMode === 'QUIZLET'
                      ? 'Paste Link or Transcript'
                      : 'Paste Notes or Study Content'}
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={modalInputText}
                    onChange={(e) => setModalInputText(e.target.value)}
                    placeholder="Paste your text, link, or lecture notes here..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Generate with AI
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
