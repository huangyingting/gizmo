'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Gamepad2, Trophy, Users, Play, CheckCircle2 } from 'lucide-react';

type LiveRoom = {
  id: string;
  roomCode: string;
  deckId: string;
  status: string;
  participantsJson: string;
  deck?: {
    title: string;
    icon: string;
    cards?: {
      id: string;
      question: string;
      answer: string;
      optionsJson: string;
    }[];
  } | null;
};

type Participant = {
  name: string;
  avatar: string;
  score: number;
};

export default function GizmoLivePage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [roundAnswered, setRoundAnswered] = useState<string | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);

  function loadRooms() {
    fetch('/api/live')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.rooms)) {
          setRooms(d.rooms);
          if (!activeRoom && d.rooms.length > 0) {
            setActiveRoom(d.rooms[0]);
          }
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function handleHostNewRoom() {
    const res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    });
    const data = await res.json();
    if (data.ok && data.room) {
      setActiveRoom(data.room);
      loadRooms();
    }
  }

  async function handleJoinByPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinInput.trim()) return;
    const res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', roomCode: pinInput.trim() }),
    });
    const data = await res.json();
    if (data.ok && data.room) {
      setActiveRoom(data.room);
    }
  }

  async function handleAnswerLiveRound(option: string, correct: boolean) {
    setRoundAnswered(option);
    if (!activeRoom) return;
    const res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'score',
        roomCode: activeRoom.roomCode,
        points: correct ? 150 : 25,
      }),
    });
    const data = await res.json();
    if (data.ok && data.room) {
      setActiveRoom(data.room);
    }
  }

  const currentLiveQuestion = React.useMemo(() => {
    const cards = activeRoom?.deck?.cards || [];
    if (cards.length > 0) {
      const card = cards[questionIdx % cards.length];
      let parsedOpts: string[] = [];
      try {
        parsedOpts = JSON.parse(card.optionsJson);
      } catch {}
      const opts =
        Array.isArray(parsedOpts) && parsedOpts.length >= 2
          ? parsedOpts
          : [
              card.answer,
              'To increase sequential recurrent hidden state bottlenecks',
              'To replace positional encodings with fixed kernels',
            ];
      return {
        deckTitle: activeRoom?.deck?.title || 'Attention Is All You Need',
        question: card.question,
        answer: card.answer,
        options: opts.map((text) => ({
          text,
          correct: text.trim().toLowerCase() === card.answer.trim().toLowerCase(),
        })),
      };
    }
    return {
      deckTitle: 'Attention Is All You Need',
      question:
        'Why does Scaled Dot-Product Attention divide the dot products by √d_k?',
      answer:
        'To prevent large dot products from pushing softmax into regions with tiny gradients',
      options: [
        {
          text: 'To prevent large dot products from pushing softmax into regions with tiny gradients',
          correct: true,
        },
        {
          text: 'To increase the number of sequential recurrent hidden states',
          correct: false,
        },
        {
          text: 'To replace positional encodings with convolutional kernels',
          correct: false,
        },
      ],
    };
  }, [activeRoom, questionIdx]);

  const participants: Participant[] = React.useMemo(() => {
    if (!activeRoom?.participantsJson) return [];
    try {
      return JSON.parse(activeRoom.participantsJson);
    } catch {
      return [];
    }
  }, [activeRoom?.participantsJson]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Top Hero Banner (matching 39-gizmo-live.png) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-fuchsia-600 text-white shadow-lg flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-extrabold mb-3">
              <Gamepad2 className="w-4 h-4" />
              <span>Real-Time Multiplayer Flashcard Arena</span>
            </div>
            <h1 className="text-3xl font-extrabold">Gizmo Live ⚔️</h1>
            <p className="text-xs text-purple-100 mt-1 max-w-md">
              Host a live quiz battle from any deck or enter a 6-digit room PIN to compete with classmates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <form onSubmit={handleJoinByPin} className="flex items-center gap-2">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 6-digit PIN..."
                className="px-3.5 py-2.5 rounded-xl bg-white/95 text-slate-900 text-xs font-extrabold placeholder:text-slate-400 focus:outline-none w-36"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold"
              >
                Join PIN
              </button>
            </form>
            <button
              type="button"
              onClick={handleHostNewRoom}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Host New Arena</span>
            </button>
          </div>
        </div>

        {activeRoom && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Live Round Question */}
            <div className="md:col-span-7 p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-extrabold">
                  Room PIN: {activeRoom.roomCode}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  ● Live Battle Active
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Speed Round #{questionIdx + 1} — {currentLiveQuestion.deckTitle}
                </div>
                <p className="text-base font-extrabold text-slate-900">
                  {currentLiveQuestion.question}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {currentLiveQuestion.options.map((opt) => (
                  <button
                    key={opt.text}
                    type="button"
                    onClick={() => handleAnswerLiveRound(opt.text, opt.correct)}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition flex items-center justify-between ${
                      roundAnswered === opt.text
                        ? opt.correct
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                          : 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-slate-200 hover:border-purple-400 text-slate-800'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {roundAnswered === opt.text && opt.correct && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {roundAnswered && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">
                    +15 XP & +10 Gems awarded!
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRoundAnswered(null);
                      setQuestionIdx((i) => i + 1);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition"
                  >
                    Next Speed Round →
                  </button>
                </div>
              )}
            </div>

            {/* Live Arena Standings */}
            <div className="md:col-span-5 p-6 rounded-3xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-extrabold text-slate-900">
                    Arena Standings
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length} players
                </span>
              </div>

              <div className="space-y-3">
                {participants
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div
                      key={p.name}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-extrabold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xl">{p.avatar}</span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-purple-700">
                        ⚡ {p.score} pts
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
