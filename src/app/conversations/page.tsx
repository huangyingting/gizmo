'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Plus, Users, Send, MessageSquare } from 'lucide-react';

type StudyGroupItem = {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  members: {
    id: string;
    role: string;
    user: { name: string; handle: string; avatarEmoji: string };
  }[];
  messages: {
    id: string;
    authorName?: string;
    user?: { name: string | null; handle: string };
    content: string;
    createdAt: string;
  }[];
  _count?: { members: number; messages: number };
};

export default function StudyGroupsConversationsPage() {
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroupItem | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);

  function loadGroups() {
    fetch('/api/study-groups')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.groups)) {
          setGroups(d.groups);
          if (!selectedGroup && d.groups.length > 0) {
            setSelectedGroup(d.groups[0]);
          } else if (selectedGroup) {
            const updated = d.groups.find((g: StudyGroupItem) => g.id === selectedGroup.id);
            if (updated) setSelectedGroup(updated);
          }
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroup || !messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput('');
    const res = await fetch('/api/study-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_message',
        groupId: selectedGroup.id,
        content: text,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      loadGroups();
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const res = await fetch('/api/study-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        inviteCode: joinCode.trim(),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setJoinFeedback(`Joined ${data.group.name}!`);
      setJoinCode('');
      loadGroups();
    } else {
      setJoinFeedback(data.error || 'Group not found.');
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Header (matching 31-study-groups.png) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Study groups
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Share decks, discuss research papers, and compete with classmates
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <form onSubmit={handleJoinByCode} className="flex items-center gap-1.5">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Join code (e.g. NYP-AI-2026)"
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Join
              </button>
            </form>
            <Link
              href="/study-groups/create"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create study group</span>
            </Link>
          </div>
        </div>

        {joinFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold">
            {joinFeedback}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Study Groups List */}
          <div className="md:col-span-5 space-y-3">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`w-full p-4 rounded-2xl border text-left transition ${
                  selectedGroup?.id === g.id
                    ? 'border-purple-600 bg-purple-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {g.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-600">
                    {g.inviteCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {g.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {g._count?.members ?? g.members.length} members
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {g._count?.messages ?? g.messages.length} messages
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Right Column: Active Group Conversation */}
          <div className="md:col-span-7">
            {selectedGroup ? (
              <div className="rounded-3xl border border-slate-200 bg-white flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedGroup.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Invite code: <strong>{selectedGroup.inviteCode}</strong>
                    </p>
                  </div>
                  <Link
                    href="/live"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-extrabold"
                  >
                    ⚔️ Start Group Battle
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedGroup.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70"
                    >
                      <div className="text-xs font-extrabold text-purple-700">
                        {m.user?.name || m.authorName || 'Scholar'}
                      </div>
                      <p className="text-xs text-slate-800 mt-1">{m.content}</p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-100 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Share a deck or ask your study group..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-purple-600 text-white"
                    aria-label="Send group message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Select or create a study group to start collaborating
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
