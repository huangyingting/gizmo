'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  Shield,
  Plus,
  Copy,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

type InvitationItem = {
  id: string;
  email: string;
  normalizedEmail: string;
  role: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};

type AuditLogItem = {
  id: string;
  action: string;
  targetEmail: string | null;
  metadataJson: string;
  createdAt: string;
  actorUser?: { email: string; name: string } | null;
};

type ManagedUserItem = {
  id: string;
  name: string | null;
  email: string;
  handle: string;
  role: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  schoolName: string;
  xp: number;
  gems: number;
  createdAt: string;
};

export default function AdminInvitationsGovernancePage() {
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<ManagedUserItem[]>([]);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [assignedRole, setAssignedRole] = useState<'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN'>('USER');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [latestRawToken, setLatestRawToken] = useState<string | null>(null);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState('');

  function loadGovernanceData() {
    fetch('/api/admin/invitations')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setInvitations(d.invitations || []);
          setAuditLogs(d.auditLogs || []);
          setUsers(d.users || []);
        } else {
          setErrorMsg(d.error || 'Admin access required.');
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadGovernanceData();
  }, []);

  async function handleIssueInvitation(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: invitedEmail.trim(),
        role: assignedRole,
        ttlHours: expiresInHours,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setLatestRawToken(data.token);
      setInvitedEmail('');
      loadGovernanceData();
    } else {
      setErrorMsg(data.error || 'Failed to issue invitation.');
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
    });
    const data = await res.json();
    if (data.ok) {
      loadGovernanceData();
    }
  }

  async function handleRotate(id: string) {
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rotate', ttlHours: 72 }),
    });
    const data = await res.json();
    if (data.ok) {
      setLatestRawToken(data.token);
      loadGovernanceData();
    }
  }

  async function handleUpdateUserGovernance(
    userId: string,
    patch: { role?: ManagedUserItem['role']; status?: ManagedUserItem['status'] }
  ) {
    const res = await fetch(`/api/admin/invitations/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_user', ...patch }),
    });
    const data = await res.json();
    if (data.ok) {
      loadGovernanceData();
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedBanner(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedBanner(null), 3000);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Invite-Only Admission & Audit Governance
              </h1>
              <p className="text-xs text-slate-500">
                Issue single-use SHA-256 hashed invitation codes, assign roles, revoke or rotate tokens, and inspect audit logs
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {copiedBanner && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold">
            {copiedBanner}
          </div>
        )}

        {/* Newly Issued Raw Token Banner (only shown once since DB stores SHA-256 hash) */}
        {latestRawToken && (
          <div
            data-testid="issued-invite-banner"
            className="mt-6 p-5 rounded-3xl bg-purple-50 border-2 border-purple-300 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                New Single-Use Invitation Token Issued (Copy Now — Stored as SHA-256 Hash)
              </div>
              <div
                data-testid="raw-invite-token"
                className="text-lg font-mono font-extrabold text-slate-900 mt-1"
              >
                {latestRawToken}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Invite URL: <code>/sign-up?token={latestRawToken}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(latestRawToken, 'invitation code')}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/sign-up?token=${latestRawToken}`,
                    'sign-up link'
                  )
                }
                className="px-4 py-2 rounded-xl bg-white border border-purple-300 text-purple-800 text-xs font-extrabold"
              >
                Copy Sign-Up URL
              </button>
            </div>
          </div>
        )}

        {/* Issue New Invitation Form */}
        <form
          onSubmit={handleIssueInvitation}
          className="mt-6 p-6 rounded-3xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
        >
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Target Email
            </label>
            <input
              type="email"
              required
              value={invitedEmail}
              onChange={(e) => setInvitedEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Assigned Role
            </label>
            <select
              value={assignedRole}
              onChange={(e) =>
                setAssignedRole(
                  e.target.value as 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN'
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            >
              <option value="USER">USER (Student)</option>
              <option value="CREATOR">CREATOR (Deck Author)</option>
              <option value="MODERATOR">MODERATOR (Community Mod)</option>
              <option value="ADMIN">ADMIN (Administrator)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Expires In
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            >
              <option value={24}>24 Hours</option>
              <option value={72}>72 Hours (3 Days)</option>
              <option value={168}>7 Days</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Invitation</span>
          </button>
        </form>

        {/* Active & Historical Invitations Table */}
        <div className="mt-8">
          <h2 className="text-base font-extrabold text-slate-900 mb-3">
            Issued Invitations ({invitations.length})
          </h2>
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-extrabold">
                    <th className="py-3 px-4">Code Hint</th>
                    <th className="py-3 px-4">Email Lock</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => {
                    const status = inv.revokedAt
                      ? 'REVOKED'
                      : inv.acceptedAt
                      ? 'CONSUMED'
                      : new Date(inv.expiresAt).getTime() <= Date.now()
                      ? 'EXPIRED'
                      : 'ACTIVE';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.id.slice(0, 10)}...
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inv.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px]">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : status === 'CONSUMED'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {status === 'ACTIVE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRotate(inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Rotate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Registered Users & Role/Status Governance Table */}
        <div className="mt-10">
          <h2 className="text-base font-extrabold text-slate-900 mb-3">
            Registered Accounts & Role Governance ({users.length})
          </h2>
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-extrabold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.name || u.handle}{' '}
                        <span className="text-slate-400 font-normal">@{u.handle}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUserGovernance(u.id, {
                              role: e.target.value as ManagedUserItem['role'],
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-[11px]"
                        >
                          <option value="USER">USER</option>
                          <option value="CREATOR">CREATOR</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUserGovernance(u.id, {
                              status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                            })
                          }
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Immutable Audit Log Viewer */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Security & Governance Audit Log ({auditLogs.length})
              </h2>
            </div>
            <input
              type="text"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              placeholder="Filter audit events by action or email..."
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs w-64"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {auditLogs
              .filter((log) =>
                !auditFilter.trim()
                  ? true
                  : `${log.action} ${log.actorUser?.email || ''} ${log.targetEmail || ''} ${log.metadataJson}`
                      .toLowerCase()
                      .includes(auditFilter.toLowerCase())
              )
              .map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-extrabold text-slate-800">
                    {log.action}
                  </span>
                  <span className="text-slate-600">
                    Actor:{' '}
                    <strong>{log.actorUser?.email || log.targetEmail || 'CLI / System'}</strong>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-md">
                    {log.metadataJson}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
