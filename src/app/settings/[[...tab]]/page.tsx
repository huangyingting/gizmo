'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { AppShell } from '@/components/AppShell';
import {
  ChevronLeft,
  User,
  Bell,
  BookOpen,
  Palette,
  LogOut,
  Check,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const [name, setName] = useState('Jack Huang');
  const [schoolName, setSchoolName] = useState('Nanyang Polytechnic');
  const [dailyGoalQuizzes, setDailyGoalQuizzes] = useState(3);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [themePreference, setThemePreference] = useState('light');
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.user) {
          setName(d.user.name);
          setSchoolName(d.user.schoolName);
          setDailyGoalQuizzes(d.user.dailyGoalQuizzes ?? 3);
          setSoundEffects(Boolean(d.user.soundEffects));
          setNotificationsEnabled(Boolean(d.user.notificationsEnabled));
          setThemePreference(d.user.themePreference || 'light');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        schoolName,
        dailyGoalQuizzes,
        soundEffects,
        notificationsEnabled,
        themePreference,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        {/* Header (matching 35-settings.png) */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
          </div>

          <Link
            href="/admin/invitations"
            className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-extrabold flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Invite Admin</span>
          </Link>
        </div>

        {savedBanner && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Preferences saved!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="mt-6 space-y-6">
          {/* Account Section */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <User className="w-4 h-4 text-purple-600" />
              <span>Account & School</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  School / Institution
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Study & Notifications */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Study & Quiz Preferences</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-800">
                  Daily Quiz Goal
                </div>
                <div className="text-[11px] text-slate-500">
                  Number of quizzes per day for streak targets
                </div>
              </div>
              <select
                value={dailyGoalQuizzes}
                onChange={(e) => setDailyGoalQuizzes(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value={1}>Casual (1 quiz)</option>
                <option value={3}>Regular (3 quizzes)</option>
                <option value={5}>Intense (5 quizzes)</option>
              </select>
            </div>

            <label className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-800">
                Quiz Sound Effects
              </span>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="rounded border-slate-300"
              />
            </label>

            <label className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                Streak Reminder Notifications
              </span>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-300"
              />
            </label>
          </div>

          {/* Theme Section */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Appearance Theme</span>
            </div>
            <select
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
            >
              <option value="light">Light Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
