'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Crown, CheckCircle2, Sparkles, Heart, FileText, ChevronLeft } from 'lucide-react';

export default function SubscribeBenefitsPage() {
  const [activated, setActivated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.user?.isPro) {
          setActivated(true);
        }
      })
      .catch(() => {});
  }, []);

  async function handleActivatePro() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPro: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setActivated(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/shop"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Gizmo Pro Benefits
          </h1>
        </div>

        {/* Hero Card (matching 36-gizmo-pro.png) */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 text-white shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold mb-4">
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Gizmo Pro Academic Pass</span>
          </div>
          <h2 className="text-3xl font-extrabold">
            Supercharge your exam prep with Unlimited AI
          </h2>
          <p className="text-sm text-purple-100 mt-2 max-w-xl">
            Upload unlimited academic PDFs, unlock infinite quiz hearts, and get 24/7 step-by-step AI Tutor explanations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-xs">
              <Heart className="w-6 h-6 text-rose-300 mb-2" />
              <div className="text-sm font-extrabold">Infinite Hearts</div>
              <p className="text-xs text-purple-100 mt-1">
                Never run out of lives during intensive study path sessions.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-xs">
              <FileText className="w-6 h-6 text-amber-300 mb-2" />
              <div className="text-sm font-extrabold">Unlimited PDF Uploads</div>
              <p className="text-xs text-purple-100 mt-1">
                Convert entire textbooks and arXiv papers into structured study notes.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-xs">
              <Sparkles className="w-6 h-6 text-emerald-300 mb-2" />
              <div className="text-sm font-extrabold">Unlimited AI Tutor</div>
              <p className="text-xs text-purple-100 mt-1">
                Deep Socratic explanations on every single quiz question.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/20">
            <div>
              <div className="text-xs text-purple-100">Campus Edition Status</div>
              <div className="text-lg font-extrabold">
                Included with Invite-Only Academic Access
              </div>
            </div>
            <button
              type="button"
              disabled={saving || activated}
              onClick={handleActivatePro}
              className="px-6 py-3 rounded-2xl bg-white text-purple-800 text-xs font-extrabold shadow-md hover:bg-purple-50 disabled:opacity-90 transition"
            >
              {activated
                ? '✓ Pro Benefits Active'
                : saving
                ? 'Activating...'
                : 'Activate Free Trial'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
