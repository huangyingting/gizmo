'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  X,
  Lightbulb,
  Heart,
  Zap,
  Sparkles,
  CheckCircle2,
  XCircle,
  Send,
  Trophy,
} from 'lucide-react';

type QuizCard = {
  id: string;
  question: string;
  answer: string;
  optionsJson: string;
  explanation: string;
  cardType: string;
};

type QuizSessionData = {
  id: string;
  deckId: string;
  subdeckId: string | null;
  mode: string;
  heartsRemaining: number;
  hintsRemaining: number;
  xpEarned: number;
  totalQuestions: number;
  correctCount: number;
  currentIndex: number;
  status: string;
};

export default function QuizGameplayPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [quizSession, setQuizSession] = useState<QuizSessionData | null>(null);
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Explain AI Tutor Modal State (matching 22f-quiz-explain-modal.png)
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainMessages, setExplainMessages] = useState<
    { role: 'ai' | 'user'; text: string }[]
  >([]);
  const [explainSuggestions, setExplainSuggestions] = useState<string[]>([
    'Explain it more simply',
    'Help me memorize this',
    'How does this fit into the broader topic?',
  ]);
  const [explainInput, setExplainInput] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.session || d.quizSession;
        if (d.ok && s) {
          setQuizSession({
            ...s,
            hintsRemaining: d.userBalances?.hints ?? s.hintsRemaining ?? 5,
          });
          setCards(d.cards || []);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const currentCard = cards[currentIdx] || null;

  const parsedOptions: string[] = React.useMemo(() => {
    if (!currentCard) return [];
    try {
      const arr = JSON.parse(currentCard.optionsJson);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {}
    return [
      currentCard.answer,
      'Recurrent hidden state bottleneck',
      'Fixed kernel convolution',
      'Unscaled inner product',
    ];
  }, [currentCard]);

  async function handleUseHint() {
    if (!quizSession || !currentCard || isEvaluated) return;
    const wrongOptions = parsedOptions.filter(
      (opt) => opt !== currentCard.answer && !eliminatedOptions.includes(opt)
    );
    if (wrongOptions.length === 0) return;
    const toEliminate = wrongOptions[0];
    setEliminatedOptions((prev) => [...prev, toEliminate]);

    const res = await fetch(`/api/quiz/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'use_hint' }),
    });
    const data = await res.json();
    const s = data.session || data.quizSession;
    if (data.ok && s) {
      setQuizSession({
        ...s,
        hintsRemaining: data.hintsRemaining ?? s.hintsRemaining ?? 4,
      });
    }
  }

  async function handleSelectOption(opt: string, usedReveal = false) {
    if (!currentCard || isEvaluated) return;
    setSelectedAnswer(opt);
    const correct = opt.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();
    setWasCorrect(correct);
    setIsEvaluated(true);

    const res = await fetch(`/api/quiz/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'attempt',
        cardId: currentCard.id,
        selectedAnswer: opt,
        isCorrect: correct,
        usedHint: eliminatedOptions.length > 0,
        usedReveal,
      }),
    });
    const data = await res.json();
    const s = data.session || data.quizSession;
    if (data.ok && s) {
      setQuizSession((prev) => ({
        ...s,
        hintsRemaining: prev?.hintsRemaining ?? 5,
      }));
    }
  }

  async function handleRevealAnswer() {
    if (!currentCard || isEvaluated) return;
    await handleSelectOption(currentCard.answer, true);
  }

  async function handleOpenExplainModal(promptText?: string) {
    if (!currentCard) return;
    setShowExplainModal(true);
    setLoadingExplain(true);
    if (promptText) {
      setExplainMessages((prev) => [...prev, { role: 'user', text: promptText }]);
    }
    try {
      const res = await fetch(`/api/quiz/${sessionId}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          customQuery: promptText || '',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setExplainMessages((prev) => [
          ...prev,
          { role: 'ai', text: data.explanation },
        ]);
        if (Array.isArray(data.suggestions)) {
          setExplainSuggestions(
            data.suggestions.map((s: string | { label: string }) =>
              typeof s === 'string' ? s : s.label
            )
          );
        }
      }
    } finally {
      setLoadingExplain(false);
    }
  }

  async function handleContinueNext() {
    if (!quizSession) return;
    if (currentIdx + 1 < cards.length) {
      setCurrentIdx((i) => i + 1);
      setEliminatedOptions([]);
      setSelectedAnswer(null);
      setIsEvaluated(false);
      setShowExplainModal(false);
      setExplainMessages([]);
    } else {
      const res = await fetch(`/api/quiz/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const data = await res.json();
      const s = data.session || data.quizSession;
      if (data.ok && s) {
        setQuizSession((prev) => ({
          ...s,
          hintsRemaining: prev?.hintsRemaining ?? 5,
        }));
      }
    }
  }

  if (!quizSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sm text-slate-500">
        Loading interactive quiz...
      </div>
    );
  }

  // Completed State Summary Screen
  if (quizSession.status === 'COMPLETED' || !currentCard) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Lesson Complete!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            You mastered this study step and earned bonus XP & streak rewards.
          </p>

          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
              <div className="text-xs font-bold text-purple-600">XP Earned</div>
              <div className="text-lg font-extrabold text-purple-900 mt-0.5">
                ⚡ +{quizSession.xpEarned}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-bold text-emerald-600">Correct</div>
              <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                {quizSession.correctCount}/{cards.length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-xs font-bold text-rose-600">Hearts</div>
              <div className="text-lg font-extrabold text-rose-900 mt-0.5">
                ❤️ {quizSession.heartsRemaining}
              </div>
            </div>
          </div>

          <Link
            href={`/decks/${quizSession.deckId}/path`}
            className="block w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm shadow-sm transition"
          >
            Continue to Study Path
          </Link>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((currentIdx + (isEvaluated ? 1 : 0)) / Math.max(1, cards.length)) * 100);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Quiz HUD (matching 22a-quiz-question-1.png) */}
      <header className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push(`/decks/${quizSession.deckId}/path`)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
            aria-label="Exit quiz"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>

          {/* Hints, Hearts, XP Counters */}
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"
              title="Hints remaining"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{quizSession.hintsRemaining}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600"
              title="Hearts remaining"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{quizSession.heartsRemaining}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700"
              title="XP earned"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>{quizSession.xpEarned}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Question & Options Card */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 flex flex-col justify-center">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">
            Question {currentIdx + 1} of {cards.length}
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-relaxed">
            {currentCard.question.includes('_') ? (
              <>
                {currentCard.question.split('_')[0]}
                <span className="inline-block px-4 py-0.5 mx-1 rounded-lg bg-purple-100 border-b-2 border-purple-500 text-purple-900">
                  {isEvaluated ? currentCard.answer : '_____'}
                </span>
                {currentCard.question.split('_').slice(1).join('_')}
              </>
            ) : (
              currentCard.question
            )}
          </h2>
        </div>

        {/* Multiple-Choice / Cloze Options */}
        <div className="mt-6 space-y-3">
          {parsedOptions.map((opt) => {
            const isEliminated = eliminatedOptions.includes(opt);
            const isSelected = selectedAnswer === opt;
            const isCorrectOption =
              opt.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();

            let styleClass =
              'border-slate-200 bg-white hover:border-purple-400 text-slate-800';
            if (isEliminated) {
              styleClass =
                'border-slate-100 bg-slate-50 text-slate-300 line-through pointer-events-none';
            } else if (isEvaluated) {
              if (isCorrectOption) {
                styleClass =
                  'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200';
              } else if (isSelected && !isCorrectOption) {
                styleClass = 'border-rose-500 bg-rose-50 text-rose-950';
              } else {
                styleClass = 'border-slate-200 bg-white opacity-60';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={isEliminated || isEvaluated}
                onClick={() => handleSelectOption(opt)}
                className={`w-full p-4 rounded-2xl border-2 text-left text-sm font-bold transition flex items-center justify-between ${styleClass}`}
              >
                <span>{opt}</span>
                {isEvaluated && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                {isEvaluated && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint & Reveal Controls (before evaluation, matching 22a & 22c) */}
        {!isEvaluated && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleUseHint}
              className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Hint</span>
            </button>

            <button
              type="button"
              onClick={handleRevealAnswer}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition"
            >
              Reveal
            </button>
          </div>
        )}
      </main>

      {/* Post-Answer Bottom Feedback Bar with "Explain" & "Continue" (matching 22d & 22e) */}
      {isEvaluated && (
        <footer
          className={`border-t p-4 sm:p-6 ${
            wasCorrect
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}
        >
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {wasCorrect ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-600" />
              )}
              <div>
                <div
                  className={`text-sm font-extrabold ${
                    wasCorrect ? 'text-emerald-950' : 'text-rose-950'
                  }`}
                >
                  {wasCorrect ? 'Awesome! Correct answer' : `Correct answer: ${currentCard.answer}`}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                  {currentCard.explanation}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenExplainModal()}
                className="px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Explain</span>
              </button>
              <button
                type="button"
                onClick={handleContinueNext}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition"
              >
                Continue
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* "Explain" AI Tutor Slide-Up Modal (matching 22f-quiz-explain-modal.png) */}
      {showExplainModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Explain
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {explainMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white ml-auto max-w-xs font-semibold'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loadingExplain && (
                <div className="text-xs text-purple-600 font-bold animate-pulse">
                  Gizmo AI is thinking...
                </div>
              )}

              {/* 3 Follow-Up Suggestion Pills */}
              <div className="pt-2 flex flex-wrap gap-2">
                {explainSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleOpenExplainModal(sug)}
                    className="px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!explainInput.trim()) return;
                const q = explainInput.trim();
                setExplainInput('');
                handleOpenExplainModal(q);
              }}
              className="pt-3 border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={explainInput}
                onChange={(e) => setExplainInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-purple-600 text-white"
                aria-label="Send question"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
