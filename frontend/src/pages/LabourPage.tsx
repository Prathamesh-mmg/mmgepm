import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, CheckCircle, XCircle, Clock, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';

const APPROVAL_COLORS: Record<string, string> = {
  Pending:  'badge-yellow',
  Approved: 'badge-green',
  Rejected: 'badge-red',
};
const STATUS_COLORS: Record<string, string> = {
  Present:  'badge-green',
  Absent:   'badge-red',
  HalfDay:  'badge-yellow',
  Leave:    'badge-blue',
};
const TRADE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];

const DEFAULT_TRADES = [
  'Mason','Carpenter','Foreman','Supervisor','Helper',
  'Welder','Electrician','Plumber','Driver','Others'
];

type Tab = 'dashboard' | 'entry' | 'approvals' | 'records';

export default function LabourPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [tab, setTab]                 = useState<Tab>('dashboard');
  const [selectedProject, setProject] = useState('');
  const [entryDate, setEntryDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkEntries, setBulkEntries] = useState<Record<string, { planned: number; actual: number }>>({});
  const [showBulkForm, setShowBulk]   = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects', { params: { pageSize: 100 } }).then(r => r.data.items),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['labour-dashboard', selectedProject],
    queryFn: () => api.get('/labour/dashboard', {
      params: selectedProject ? { projectId: selectedProject } : {}
    }).then(r => r.data),
    enabled: tab === 'dashboard',
  });

  const { data: pending } = useQuery({
    queryKey: ['labour-pending', selectedProject],
    queryFn: () => api.get('/labour/pending-approvals', {
      params: selectedProject ? { projectId: selectedProject } : {}
    }).then(r => r.data),
    enabled: tab === 'approvals',
  });

  const { data: records } = useQuery({
    queryKey: ['labour-records', selectedProject, entryDate, tab],
    queryFn: () => api.get('/labour', {
      params: { projectId: selectedProject || undefined, date: entryDate }
    }).then(r => r.data),
    enabled: tab === 'records',
  });

  const bulkMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(bulkEntries)
        .filter(([_, v]) => v.planned > 0 || v.actual > 0)
        .map(([trade, v]) => ({
          tradeName: trade, plannedCount: v.planned, actualCount: v.actual
        }));
      return api.post('/labour/bulk', {
        projectId: selectedProject,
        attendanceDate: entryDate,
        entries,
      });
    },
    onSuccess: () => {
      toast.success('Labour entries submitted for approval');
      qc.invalidateQueries({ queryKey: ['labour-dashboard'] });
      qc.invalidateQueries({ queryKey: ['labour-records'] });
      setBulkEntries({});
      setShowBulk(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approve, remarks }: { id: string; approve: boolean; remarks?: string }) =>
      api.patch(`/labour/${id}/approve`, { approve, remarks }),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['labour-pending'] });
      qc.invalidateQueries({ queryKey: ['labour-dashboard'] });
    },
  });

  const canApprove = hasRole('Admin') || hasRole('Project Manager') || hasRole('Labour Manager');
  const canRecord  = hasRole('Admin') || hasRole('Site Engineer') || hasRole('Labour Manager') || hasRole('Project Manager');

  const pendingList: any[] = Array.isArray(pending) ? pending : [];
  const recordsList: any[] = records?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Labour Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Daily crew attendance, trade deployment and approval workflow
          </p>
        </div>
        {canRecord && tab === 'entry' && (
          <button onClick={() => setShowBulk(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Record Attendance
          </button>
        )}
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="select max-w-xs" value={selectedProject} onChange={e => setProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(tab === 'records' || tab === 'entry') && (
          <input type="date" className="input w-44" value={entryDate}
            onChange={e => setEntryDate(e.target.value)} />
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'entry',     label: '✏️ Record Entry' },
          { key: 'approvals', label: `✅ Approvals${pendingList.length > 0 ? ` (${pendingList.length})` : ''}` },
          { key: 'records',   label: '📋 Records' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.todayTotal ?? 0}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Workers Today (Actual)</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(209,17,28,0.04)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard?.pendingApprovals ?? 0}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Pending Approvals</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {dashboard?.todayPlanned > 0
                      ? `${Math.round((dashboard.todayTotal / dashboard.todayPlanned) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Deployment Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Weekly trend */}
            <div className="card">
              <div className="card-header">
                <span className="font-medium text-sm">Weekly Labour Trend (Last 7 Days)</span>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboard?.weeklyTrend ?? []} barSize={16} barGap={4}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#9CA3AF" name="Planned" radius={[3,3,0,0]} />
                    <Bar dataKey="actual"  fill="#3B82F6" name="Actual"  radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade distribution */}
            <div className="card">
              <div className="card-header">
                <span className="font-medium text-sm">Trade Distribution — Today</span>
              </div>
              {!dashboard?.tradeDistribution?.length ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data for today</div>
              ) : (
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={dashboard.tradeDistribution} dataKey="actual"
                        nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {dashboard.tradeDistribution.map((_: any, i: number) => (
                          <Cell key={i} fill={TRADE_COLORS[i % TRADE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Today's summary table */}
          {dashboard?.todaySummary?.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="card-header"><span className="font-medium text-sm">Today's Breakdown by Trade</span></div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Trade</th>
                    <th className="text-right">Planned</th>
                    <th className="text-right">Actual</th>
                    <th className="text-right">Variance</th>
                    <th className="text-right">Productivity</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.todaySummary.map((s: any) => (
                    <tr key={s.tradeName}>
                      <td className="font-medium">{s.tradeName}</td>
                      <td className="text-right">{s.totalPlanned}</td>
                      <td className="text-right text-blue-600 font-medium">{s.totalActual}</td>
                      <td className={clsx('text-right font-medium',
                        s.variance >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {s.variance >= 0 ? '+' : ''}{s.variance}
                      </td>
                      <td className="text-right">
                        <span className={clsx('font-medium',
                          s.productivityPct >= 90 ? 'text-green-600' :
                          s.productivityPct >= 70 ? 'text-[var(--primary)]' : 'text-red-500')}>
                          {s.productivityPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Record Entry ── */}
      {tab === 'entry' && (
        <div className="space-y-4">
          {!selectedProject ? (
            <div className="card p-10 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Select a project to record attendance</p>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden p-0">
                <div className="card-header">
                  <span className="font-medium text-sm">
                    Trade-wise Attendance — {format(new Date(entryDate), 'dd MMM yyyy')}
                  </span>
                  <button onClick={() => setShowBulk(v => !v)}
                    className="btn-primary btn-sm flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {showBulkForm ? 'Hide Form' : 'Enter Attendance'}
                  </button>
                </div>

                {showBulkForm && (
                  <div className="p-5">
                    <p className="text-xs text-gray-500 mb-4">
                      Enter planned and actual headcount for each trade. Leave both as 0 to skip.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Trade</th>
                            <th className="w-32 text-center">Planned Count</th>
                            <th className="w-32 text-center">Actual Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEFAULT_TRADES.map(trade => (
                            <tr key={trade}>
                              <td className="font-medium text-sm">{trade}</td>
                              <td>
                                <input type="number" min={0} max={999}
                                  className="input text-center w-24 mx-auto block"
                                  value={bulkEntries[trade]?.planned ?? 0}
                                  onChange={e => setBulkEntries(prev => ({
                                    ...prev,
                                    [trade]: { ...prev[trade] ?? { planned: 0, actual: 0 }, planned: Number(e.target.value) }
                                  }))} />
                              </td>
                              <td>
                                <input type="number" min={0} max={999}
                                  className="input text-center w-24 mx-auto block"
                                  value={bulkEntries[trade]?.actual ?? 0}
                                  onChange={e => setBulkEntries(prev => ({
                                    ...prev,
                                    [trade]: { ...prev[trade] ?? { planned: 0, actual: 0 }, actual: Number(e.target.value) }
                                  }))} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Total Planned: <strong>{Object.values(bulkEntries).reduce((s, v) => s + v.planned, 0)}</strong> &nbsp;
                        Total Actual: <strong className="text-blue-600">{Object.values(bulkEntries).reduce((s, v) => s + v.actual, 0)}</strong>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => { setBulkEntries({}); setShowBulk(false); }}
                          className="btn-ghost text-sm">Cancel</button>
                        <button onClick={() => bulkMutation.mutate()}
                          disabled={bulkMutation.isPending || Object.values(bulkEntries).every(v => v.planned === 0 && v.actual === 0)}
                          className="btn-primary text-sm">
                          {bulkMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Approvals ── */}
      {tab === 'approvals' && (
        <div className="space-y-3">
          {!canApprove ? (
            <div className="card p-8 text-center text-gray-400">
              <p>You don't have permission to approve labour entries.</p>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-3" />
              <p className="text-gray-500 font-medium">All caught up!</p>
              <p className="text-xs text-gray-400 mt-1">No pending labour entries to approve</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{pendingList.length} entries pending your approval</p>
              <div className="card overflow-hidden p-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Trade</th>
                      <th>Worker</th>
                      <th className="text-center">Planned</th>
                      <th className="text-center">Actual</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map((entry: any) => (
                      <tr key={entry.id}>
                        <td className="text-sm">{format(new Date(entry.attendanceDate), 'dd MMM yyyy')}</td>
                        <td>
                          <span className="badge badge-blue text-xs">{entry.tradeName || 'General'}</span>
                        </td>
                        <td className="text-sm font-medium">{entry.labourName}</td>
                        <td className="text-center text-sm">{entry.plannedCount ?? '—'}</td>
                        <td className="text-center text-sm font-medium text-blue-600">{entry.actualCount ?? '—'}</td>
                        <td className="text-xs text-gray-500">{entry.recordedByName}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => approveMutation.mutate({ id: entry.id, approve: true })}
                              disabled={approveMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors">
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const remarks = prompt('Rejection reason (optional):') ?? '';
                                approveMutation.mutate({ id: entry.id, approve: false, remarks });
                              }}
                              disabled={approveMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs font-medium transition-colors">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Records ── */}
      {tab === 'records' && (
        <div className="card overflow-hidden p-0">
          <div className="card-header">
            <span className="font-medium text-sm">
              Attendance Records — {format(new Date(entryDate), 'dd MMM yyyy')}
            </span>
            <span className="text-xs text-gray-400">{records?.totalCount ?? 0} entries</span>
          </div>
          {recordsList.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No records for this date/project</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Worker</th>
                  <th>Status</th>
                  <th className="text-center">Planned</th>
                  <th className="text-center">Actual</th>
                  <th>Approval</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {recordsList.map((r: any) => (
                  <tr key={r.id}>
                    <td><span className="badge badge-blue text-xs">{r.tradeName || '—'}</span></td>
                    <td className="font-medium text-sm">{r.labourName}</td>
                    <td><span className={`badge text-xs ${STATUS_COLORS[r.status] ?? 'badge-gray'}`}>{r.status}</span></td>
                    <td className="text-center text-sm">{r.plannedCount ?? '—'}</td>
                    <td className="text-center text-sm font-medium">{r.actualCount ?? '—'}</td>
                    <td>
                      <span className={`badge text-xs ${APPROVAL_COLORS[r.approvalStatus] ?? 'badge-gray'}`}>
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{r.recordedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
