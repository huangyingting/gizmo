import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="text-6xl mb-4">🌀</div>
      <h1 className="text-3xl font-extrabold text-slate-900">
        This screen doesn&apos;t exist.
      </h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        The deck, note, or route you are looking for may have moved or been archived.
      </p>
      <Link
        href="/chat"
        className="mt-6 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition"
      >
        Go to home screen!
      </Link>
    </div>
  );
}
