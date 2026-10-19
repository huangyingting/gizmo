'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';

function SignUpFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';

  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('Nanyang Polytechnic');
  const [password, setPassword] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    role?: string;
    email?: string;
    reason?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token.trim()) {
      setInviteInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/invitations/verify?token=${encodeURIComponent(token.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.valid && data.invitation) {
            setInviteInfo({
              valid: true,
              role: data.invitation.role,
              email: data.invitation.email,
            });
            if (!email) {
              setEmail(data.invitation.email);
            }
          } else {
            setInviteInfo({
              valid: false,
              reason: data.reason || 'Invalid or expired invitation code.',
            });
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          email: email.trim(),
          name: name.trim(),
          password,
          schoolName: schoolName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invitation registration failed.');
        setLoading(false);
        return;
      }

      // Sign in automatically after consuming the single-use invitation
      await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
      });
      router.push('/chat');
      router.refresh();
    } catch {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="font-extrabold text-xl">Gizmo</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full w-fit mx-auto mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Invite-Only Registration</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 text-center">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1">
          Enter your single-use invitation code to join Gizmo.
        </p>

        {inviteInfo && inviteInfo.valid && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Valid invitation for <strong>{inviteInfo.email}</strong> (Role:{' '}
              <strong>{inviteInfo.role}</strong>)
            </span>
          </div>
        )}

        {inviteInfo && !inviteInfo.valid && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{inviteInfo.reason}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Invitation Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste single-use invitation code"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Invited Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition"
          >
            {loading ? 'Creating account...' : 'Accept Invite & Sign Up'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-bold text-purple-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <SignUpFormInner />
    </Suspense>
  );
}
