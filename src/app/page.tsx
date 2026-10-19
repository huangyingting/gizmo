import Link from 'next/link';
import {
  Sparkles,
  FileText,
  Gamepad2,
  Trophy,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/70 via-white to-white text-slate-900">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            G
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Gizmo</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/decks/public"
            className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Public decks
          </Link>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-xl text-sm font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 transition"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition"
          >
            Invite Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section (matching 01-marketing-landing-desktop.png) */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Study Hub · Academic PDF Magic Import · Invite-Only Workspace</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
          The easiest way to remember everything you learn
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Gizmo uses AI to turn your academic PDFs, lecture notes, and YouTube videos into structured study notes, Duolingo-style study paths, and fun quizzes you&apos;ll remember forever.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/chat"
            className="px-7 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-lg shadow-purple-500/20 flex items-center gap-2 transition"
          >
            <span>Open AI Study Hub</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/decks/public"
            className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-base shadow-sm flex items-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Explore Public Decks</span>
          </Link>
        </div>

        {/* Social proof banner */}
        <div className="mt-14 pt-8 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            Loved by over 3 million learners at top institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-slate-400">
            <span>Nanyang Polytechnic</span>
            <span>University of Cambridge</span>
            <span>Stanford University</span>
            <span>Imperial College London</span>
            <span>MIT</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Magic Import from PDF
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Upload any research paper (like <em>Attention Is All You Need</em>), slides, or notes. Gizmo extracts formulas, key points, and 15+ subdeck steps automatically.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center mb-4">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Adaptive Study Path & Quiz
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Master cards with Cloze fill-in-the-blanks, multiple choice, Hints that cross out distractors, and an on-demand AI Explain tutor.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
            <Trophy className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Belt Road & Gizmonsters
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Build daily streaks, advance from White Belt to Black Belt, hatch collectible Gizmonsters, and battle friends in Gizmo Live.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Invite-Only Governance
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Enterprise-grade single-use expiring invitations, SHA-256 token hashing, role-based access control, CLI admin bootstrap, and audit logs.
          </p>
        </div>
      </section>
    </div>
  );
}
