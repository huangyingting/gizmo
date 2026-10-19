'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Trophy,
  BookOpen,
  Globe,
  Users,
  User,
  Plus,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  Flame,
  Gem,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

type DeckSummary = {
  id: string;
  title: string;
  color: string;
  icon: string;
  _count?: { cards: number };
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [userStats, setUserStats] = useState<{
    gems: number;
    streakDays: number;
    xp: number;
    role: string;
  }>({
    gems: 250,
    streakDays: 1,
    xp: 15,
    role: (session?.user as { role?: string } | undefined)?.role || 'USER',
  });

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/decks?scope=mine')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.decks)) {
          setDecks(d.decks);
        }
      })
      .catch(() => {});

    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.user) {
          setUserStats({
            gems: d.user.gems ?? 250,
            streakDays: d.user.streakDays ?? 1,
            xp: d.user.xp ?? 15,
            role: d.user.role || 'USER',
          });
        }
      })
      .catch(() => {});
  }, [session?.user, pathname]);

  const navItems = [
    { href: '/chat', label: 'Home', icon: Home },
    { href: '/progress', label: 'Social', icon: Trophy },
    { href: '/decks', label: 'My decks', icon: BookOpen },
    { href: '/decks/public', label: 'Public decks', icon: Globe },
    { href: '/conversations', label: 'Study groups', icon: Users },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const isAdmin =
    userStats.role === 'ADMIN' ||
    (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white z-30 select-none">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <Link href="/chat" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
              G
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Gizmo
            </span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/progress"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100"
              title="Daily Streak"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{userStats.streakDays}</span>
            </Link>
            <Link
              href="/shop"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100"
              title="Gems & Shop"
            >
              <Gem className="w-3.5 h-3.5 text-purple-600" />
              <span>{userStats.gems}</span>
            </Link>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/decks' && pathname?.startsWith(item.href)) ||
              (item.href === '/decks' &&
                pathname?.startsWith('/decks') &&
                !pathname?.startsWith('/decks/public'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? 'text-purple-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin/invitations"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                pathname?.startsWith('/admin')
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Invite Admin</span>
            </Link>
          )}
        </nav>

        {/* Primary Action CTAs: Study & + Add */}
        <div className="px-4 mt-4 space-y-2">
          <button
            onClick={() => {
              if (decks.length > 0) {
                router.push(`/decks/${decks[0].id}/path`);
              } else {
                router.push('/chat');
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Study</span>
          </button>
          <Link
            href="/add"
            className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </Link>
        </div>

        {/* My Decks Sidebar Tree */}
        <div className="mt-6 px-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>My decks</span>
            <Link
              href="/add"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Create deck or import"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {decks.map((deck) => {
              const isSelected = pathname?.includes(`/decks/${deck.id}`);
              return (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}/path`}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition ${
                    isSelected
                      ? 'bg-purple-50 text-purple-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: deck.color || '#7C3AED' }}
                  />
                  <span className="truncate flex-1">{deck.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </Link>
              );
            })}
            {decks.length === 0 && (
              <p className="text-xs text-slate-400 py-2">
                Upload a PDF or click + Add to create your first deck!
              </p>
            )}
          </div>
        </div>

        {/* Bottom Quick Links (Shop, Settings, Sign Out) */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/subscribe/benefits"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-purple-700 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gizmo Pro</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: '/sign-in' })}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8 min-h-screen flex flex-col">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-40"
      >
        {navItems.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] font-semibold ${
                active ? 'text-purple-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/add"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white shadow-md"
          aria-label="Add or Import"
        >
          <Plus className="w-5 h-5" />
        </Link>
        {navItems.slice(3, 6).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] font-semibold ${
                active ? 'text-purple-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
