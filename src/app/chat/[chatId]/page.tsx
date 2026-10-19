'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  FileText,
  Sparkles,
  Send,
  BookOpen,
  CheckCircle2,
  X,
  ArrowRight,
  Settings,
} from 'lucide-react';

type LessonStep = {
  stepNumber: number;
  title: string;
  explanation: string;
  checkQuestion: string;
  checkOptions: string[];
  checkAnswer: string;
};

type ChatDetail = {
  id: string;
  title: string;
  summary: string;
  deckId: string | null;
  noteId: string | null;
  lessonStepsJson: string;
  importMaterial?: {
    filename: string;
    sourceType: string;
    fileHashSha256: string;
  } | null;
  messages: {
    id: string;
    role: string;
    content: string;
    attachmentName?: string | null;
    attachmentType?: string | null;
  }[];
};

export default function AiTutorChatDetailPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const chatId = params.chatId;

  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<'memorize' | 'note' | 'lesson'>(
    'memorize'
  );
  const [showSaveDeckModal, setShowSaveDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showLessonDrawer, setShowLessonDrawer] = useState(false);
  const [lessonStepIdx, setLessonStepIdx] = useState(0);
  const [selectedLessonOption, setSelectedLessonOption] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  useEffect(() => {
    fetch(`/api/chats/${chatId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.chat) {
          setChat(d.chat);
          setNewDeckName(d.chat.title || 'attention is all you need');
        }
      })
      .catch(() => {});
  }, [chatId]);

  const lessonSteps: LessonStep[] = React.useMemo(() => {
    if (!chat?.lessonStepsJson) return [];
    try {
      return JSON.parse(chat.lessonStepsJson);
    } catch {
      return [];
    }
  }, [chat?.lessonStepsJson]);

  async function handlePrimaryActionClick() {
    if (!chat) return;
    if (selectedActivity === 'memorize') {
      setShowSaveDeckModal(true);
      return;
    }
    if (selectedActivity === 'note') {
      setGenerating(true);
      try {
        const res = await fetch(`/api/chats/${chat.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_note' }),
        });
        const data = await res.json();
        if (data.ok && data.noteId) {
          router.push(`/notes/${data.noteId}?deckId=${data.deckId || ''}`);
          return;
        }
      } finally {
        setGenerating(false);
      }
    }
    if (selectedActivity === 'lesson') {
      setLessonStepIdx(0);
      setSelectedLessonOption(null);
      setShowLessonDrawer(true);
    }
  }

  async function handleSaveCardsIntoDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!chat) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_flashcards',
          deckName: newDeckName.trim() || chat.title,
        }),
      });
      const data = await res.json();
      if (data.ok && data.deckId) {
        setShowSaveDeckModal(false);
        router.push(`/decks/${data.deckId}/path`);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!chat || !replyInput.trim()) return;
    const text = replyInput.trim();
    setReplyInput('');
    const res = await fetch(`/api/chats/${chat.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', message: text }),
    });
    const data = await res.json();
    if (data.ok) {
      const refreshed = await fetch(`/api/chats/${chat.id}`).then((r) => r.json());
      if (refreshed.ok) setChat(refreshed.chat);
    }
  }

  if (!chat) {
    return (
      <AppShell>
        <div className="p-12 text-center text-sm text-slate-500">
          Loading AI Tutor study session...
        </div>
      </AppShell>
    );
  }

  const primaryButtonText =
    selectedActivity === 'memorize'
      ? 'Start memorizing'
      : selectedActivity === 'note'
      ? 'Generate note'
      : 'Start lesson';

  return (
    <AppShell>
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-8 pt-5 pb-10">
        {/* Top Header Bar (matching 12-pdf-upload-step-6.png) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              {chat.title}
            </h1>
          </div>
          {chat.deckId && (
            <Link
              href={`/decks/${chat.deckId}/path`}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100"
            >
              Open Deck →
            </Link>
          )}
        </div>

        {/* Uploaded Attachment Pill on the Right */}
        <div className="flex justify-end mt-6">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200">
            <div className="px-2 py-1 rounded-md bg-rose-500 text-white text-[10px] font-extrabold uppercase">
              {chat.importMaterial?.sourceType || 'PDF'}
            </div>
            <div className="text-xs font-bold text-slate-800">
              {chat.importMaterial?.filename || `${chat.title}.pdf`}
            </div>
          </div>
        </div>

        {/* Gizmo AI Tutor Response & 3 Study Activity Cards (matching 12-pdf-upload-step-6.png) */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-extrabold text-purple-700">Gizmo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Option 1: Memorize */}
            <button
              type="button"
              onClick={() => setSelectedActivity('memorize')}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                selectedActivity === 'memorize'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-emerald-700">Memorize</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Generate flashcards
                </div>
              </div>
              <div className="text-3xl mt-4 self-end">🐘</div>
            </button>

            {/* Option 2: Note */}
            <button
              type="button"
              onClick={() => setSelectedActivity('note')}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                selectedActivity === 'note'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-amber-700">Note</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Generate a note
                </div>
              </div>
              <div className="text-3xl mt-4 self-end">📜</div>
            </button>

            {/* Option 3: Step-by-step lesson */}
            <button
              type="button"
              onClick={() => setSelectedActivity('lesson')}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                selectedActivity === 'lesson'
                  ? 'border-purple-500 bg-purple-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-purple-700">
                  Step-by-step lesson
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                  {chat.title}
                </div>
              </div>
              <div className="text-3xl mt-4 self-end">🦉</div>
            </button>
          </div>

          {/* Primary Action Button ("Start memorizing" / "Generate note" / "Start lesson") */}
          <button
            type="button"
            disabled={generating}
            onClick={handlePrimaryActionClick}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-sm transition"
          >
            {generating ? 'Generating with Gizmo AI...' : primaryButtonText}
          </button>

          {/* AI Executive Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed">
            {chat.summary}
          </div>

          {/* If Note already exists, show "View note" card (matching 16b-flashcard-gen-1.png) */}
          {chat.noteId && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="text-xs font-bold text-amber-800">
                    You created a note
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {chat.title}
                  </div>
                </div>
              </div>
              <Link
                href={`/notes/${chat.noteId}?deckId=${chat.deckId || ''}`}
                className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-xs font-extrabold text-slate-800 hover:bg-amber-100 transition"
              >
                View note
              </Link>
            </div>
          )}

          {/* Conversation History */}
          <div className="space-y-3 pt-2">
            {chat.messages.slice(2).map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'bg-purple-600 text-white ml-auto max-w-lg'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 max-w-2xl'
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Chat Input ("I want to learn...") */}
        <form onSubmit={handleSendFollowUp} className="mt-auto pt-8">
          <div className="flex items-center gap-2 p-2.5 pl-4 rounded-2xl bg-slate-100 border border-slate-200">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="I want to learn..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* "Save cards into" Modal (matching 14-pdf-memorize-progress-1.png) */}
        {showSaveDeckModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => setShowSaveDeckModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Save cards into</span>
                </div>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  title="Card generation settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCardsIntoDeck} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    New deck name
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-3.5 h-3.5 rounded-sm bg-blue-500 shrink-0" />
                    <input
                      type="text"
                      required
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm shadow-sm transition"
                >
                  {generating ? 'Generating 15 Study Path steps...' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Interactive Step-by-Step AI Lesson Modal */}
        {showLessonDrawer && lessonSteps.length > 0 && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🦉</span>
                  <div>
                    <div className="text-xs font-bold text-purple-600 uppercase">
                      Step {lessonStepIdx + 1} of {lessonSteps.length}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {lessonSteps[lessonStepIdx].title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowLessonDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50 text-sm text-slate-700 leading-relaxed">
                {lessonSteps[lessonStepIdx].explanation}
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Check
                </p>
                <p className="text-sm font-bold text-slate-900 mb-3">
                  {lessonSteps[lessonStepIdx].checkQuestion}
                </p>
                <div className="space-y-2">
                  {lessonSteps[lessonStepIdx].checkOptions.map((opt) => {
                    const isSelected = selectedLessonOption === opt;
                    const isCorrect = opt === lessonSteps[lessonStepIdx].checkAnswer;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedLessonOption(opt)}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                          isSelected
                            ? isCorrect
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                              : 'border-rose-400 bg-rose-50 text-rose-900'
                            : 'border-slate-200 hover:border-purple-300 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  disabled={lessonStepIdx === 0}
                  onClick={() => {
                    setSelectedLessonOption(null);
                    setLessonStepIdx((i) => Math.max(0, i - 1));
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                >
                  Previous
                </button>
                {lessonStepIdx < lessonSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLessonOption(null);
                      setLessonStepIdx((i) => i + 1);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLessonDrawer(false);
                      setShowSaveDeckModal(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Finish & Create Flashcards
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
