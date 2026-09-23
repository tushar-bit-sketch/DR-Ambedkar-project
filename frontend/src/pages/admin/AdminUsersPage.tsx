import React from 'react';
import { Users, Shield, UserCheck, Key } from 'lucide-react';
import { UserRole } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const usersList = [
    { id: 1, name: 'National Archive Director', email: 'admin@ambedkar-archive.gov.in', role: 'SUPER_ADMIN', status: 'ACTIVE', lastLogin: '10 mins ago' },
    { id: 2, name: 'Lead Manuscripts Curator', email: 'archivist@ambedkar-archive.gov.in', role: 'ARCHIVIST', status: 'ACTIVE', lastLogin: '1 hour ago' },
    { id: 3, name: 'Senior Constitutional Scholar', email: 'researcher@ambedkar-archive.gov.in', role: 'RESEARCHER', status: 'ACTIVE', lastLogin: 'Yesterday' },
    { id: 4, name: 'Peer Review Panel Chair', email: 'reviewer@ambedkar-archive.gov.in', role: 'REVIEWER', status: 'ACTIVE', lastLogin: '3 days ago' },
    { id: 5, name: 'Public Research Visitor', email: 'visitor@public-domain.org', role: 'VISITOR', status: 'ACTIVE', lastLogin: 'Just now' },
  ];

  const roleDescriptions: Record<string, string> = {
    SUPER_ADMIN: 'Full institutional configuration, database schema management, and audit log access.',
    ARCHIVIST: 'Ingestion of master facsimiles, OCR pipeline validation, and Dublin Core cataloging.',
    RESEARCHER: 'Privileged access to unreleased high-resolution archival manuscripts and transcripts.',
    REVIEWER: 'Peer review and curatorial sign-off on verification status tags.',
    VISITOR: 'Read-only access to published and verified public records.',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
            Institutional User & RBAC Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage institutional access levels, OAuth2 credentials, and role-based access control.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded text-xs font-mono font-semibold">
          [PHASE 1 RBAC FOUNDATION]
        </div>
      </div>

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(roleDescriptions).map(([roleName, desc]) => (
          <div key={roleName} className="bg-white border border-stone-200 rounded-lg p-3.5 space-y-1.5 shadow-xs">
            <div className="font-mono text-xs font-bold text-heritage-700">
              {roleName}
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center text-xs">
          <span className="font-bold text-ink-900 uppercase tracking-wider font-mono">
            Registered Institutional Personnel ({usersList.length})
          </span>
          <span className="text-slate-500 font-mono">Authentication: JWT HS256</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1B2A4A] text-white uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Email / Identifier</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5">Last Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50 transition">
                  <td className="p-3.5 font-medium text-ink-900 font-serif font-bold">
                    {u.name}
                  </td>
                  <td className="p-3.5 font-mono text-slate-600">
                    {u.email}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-heritage-100 text-heritage-900 border border-heritage-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold text-[10px]">
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {u.lastLogin}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
