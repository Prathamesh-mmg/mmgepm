import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  FolderKanban, CheckSquare, AlertTriangle, AlertCircle,
  TrendingUp, Clock, ArrowRight, ShoppingCart, DollarSign
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  Planning: '#6B7280', Active: '#10B981', OnHold: '#F59E0B',
  Completed: '#3B82F6', Cancelled: '#EF4444',
};
const RISK_COLORS: Record<string, string> = {
  Low: '#22C55E', Medium: '#F59E0B', High: '#F97316', Critical: '#EF4444',
};
const TASK_COLORS: Record<string, string> = {
  NotStarted: '#9CA3AF', InProgress: '#3B82F6', Completed: '#22C55E',
  OnHold: '#F59E0B', Cancelled: '#EF4444',
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks-dashboard'],
    queryFn: () => api.get('/tasks', { params: { pageSize: 5 } }).then(r => r.data),
  });

  const { data: recentProjects } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: () => api.get('/projects', { params: { pageSize: 5 } }).then(r => r.data),
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}</div>
      </div>
    </div>
  );

  const taskList: any[] = Array.isArray(myTasks) ? myTasks.slice(0, 5) : (myTasks?.items ?? []).slice(0, 5);
  const projectList: any[] = recentProjects?.items?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {greeting()}, {user?.firstName} 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {format(new Date(), 'EEEE, dd MMMM yyyy')} · Here's your project overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Projects" value={stats?.activeProjects ?? 0} icon={<FolderKanban className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" link="/projects" trend={null} />
        <KpiCard label="Tasks In Progress" value={stats?.inProgressTasks ?? 0} icon={<CheckSquare className="w-5 h-5 text-yellow-500" />} bg="bg-yellow-50" link="/tasks" trend={null} />
        <KpiCard label="Delayed Tasks" value={stats?.delayedTasks ?? 0} icon={<AlertCircle className="w-5 h-5 text-red-500" />} bg="bg-red-50" link="/tasks" highlight={(stats?.delayedTasks ?? 0) > 0} trend={null} />
        <KpiCard label="Open Risks (High+)" value={(stats?.highRisks ?? 0) + (stats?.criticalRisks ?? 0)} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" link="/risks" highlight={(stats?.criticalRisks ?? 0) > 0} trend={null} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: stats?.totalProjects ?? 0, color: 'text-gray-700' },
          { label: 'Completed Tasks', value: stats?.completedTasks ?? 0, color: 'text-green-600' },
          { label: 'Pending MRs', value: stats?.pendingMRs ?? 0, color: 'text-blue-600' },
          { label: 'Budget Used', value: `${stats?.budgetUtilPct ?? 0}%`, color: stats?.budgetUtilPct > 80 ? 'text-red-500' : 'text-gray-700' },
        ].map(k => (
          <div key={k.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects by Status - Pie */}
        <div className="card">
          <div className="card-header"><span className="font-medium text-sm">Projects by Status</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={(stats?.projectsByStatus ?? []).filter((d: any) => d.value > 0)}
                  dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(stats?.projectsByStatus ?? []).map((entry: any) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[entry.label] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: string) => [v, n]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks by Status - Pie */}
        <div className="card">
          <div className="card-header"><span className="font-medium text-sm">Tasks by Status</span></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={(stats?.tasksByStatus ?? []).filter((d: any) => d.value > 0)}
                  dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(stats?.tasksByStatus ?? []).map((entry: any) => (
                    <Cell key={entry.label} fill={TASK_COLORS[entry.label] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risks by Severity */}
        <div className="card">
          <div className="card-header"><span className="font-medium text-sm">Open Risks by Severity</span></div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(stats?.risksBySeverity ?? []).map((r: any) => (
                <div key={r.label} className="text-center p-3 rounded-xl" style={{ background: `${RISK_COLORS[r.label]}18` }}>
                  <p className="text-2xl font-bold" style={{ color: RISK_COLORS[r.label] }}>{r.value}</p>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div className="card">
        <div className="card-header"><span className="font-medium text-sm">Monthly Task Activity — Last 6 Months</span></div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.monthlyProgress ?? []} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#22C55E" name="Completed" radius={[4,4,0,0]} />
              <Bar dataKey="created" fill="#3B82F6" name="Created" radius={[4,4,0,0]} />
              <Bar dataKey="delayed" fill="#EF4444" name="Delayed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: My Tasks + Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Recent Tasks</span>
            <Link to="/tasks" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {!taskList.length
              ? <div className="p-8 text-center text-gray-400"><Clock className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No tasks found</p></div>
              : taskList.map((t: any) => (
                <Link key={t.id} to={`/tasks/${t.id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    t.status === 'Completed' ? 'bg-green-400' : t.status === 'InProgress' ? 'bg-blue-400' : 'bg-gray-300')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.projectName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${t.status === 'Completed' ? 'badge-green' : t.status === 'InProgress' ? 'badge-blue' : 'badge-gray'}`}>{t.status}</span>
                    {t.endDate && <span className="text-xs text-gray-400">{format(new Date(t.endDate), 'dd MMM')}</span>}
                  </div>
                </Link>
              ))
            }
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Recent Projects</span>
            <Link to="/projects" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {!projectList.length
              ? <div className="p-8 text-center text-gray-400"><FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No projects yet</p></div>
              : projectList.map((p: any) => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(209,17,28,0.08)] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[var(--primary)]">{p.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="progress-bar flex-1 h-1.5">
                        <div className="progress-fill" style={{ width: `${p.overallProgress ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">{p.overallProgress ?? 0}%</span>
                    </div>
                  </div>
                  <span className={clsx('badge text-xs',
                    p.status === 'Active' ? 'badge-green' : p.status === 'Planning' ? 'badge-blue' :
                    p.status === 'OnHold' ? 'badge-yellow' : 'badge-gray')}>{p.status}</span>
                </Link>
              ))
            }
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      {(stats?.totalBudget ?? 0) > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Portfolio Budget</span>
            <Link to="/budget" className="text-xs text-[var(--primary)] hover:underline">View details</Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6 mb-4">
              {[
                { label: 'Total Budget', value: stats?.totalBudget, color: 'text-gray-900' },
                { label: 'Expended', value: stats?.totalExpended, color: 'text-red-600' },
                { label: 'Remaining', value: (stats?.totalBudget ?? 0) - (stats?.totalExpended ?? 0), color: 'text-green-600' },
              ].map(b => (
                <div key={b.label} className="text-center">
                  <p className={`text-xl font-bold ${b.color}`}>
                    ${(b.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{b.label}</p>
                </div>
              ))}
            </div>
            <div className="progress-bar h-3">
              <div className="progress-fill" style={{
                width: `${Math.min(100, stats?.budgetUtilPct ?? 0)}%`,
                background: (stats?.budgetUtilPct ?? 0) > 80 ? '#EF4444' : 'var(--primary)'
              }} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-right mt-1">{stats?.budgetUtilPct ?? 0}% utilized</p>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, bg, trend, highlight, link }: {
  label: string; value: number | string; icon: React.ReactNode; bg: string;
  trend?: number | null; highlight?: boolean; link: string;
}) {
  return (
    <Link to={link} className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>{icon}</div>
        {trend != null && (
          <span className={clsx('stat-change flex items-center gap-0.5', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            <TrendingUp className="w-3 h-3" />{Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className={clsx('stat-value', highlight && 'text-red-500')}>{value}</p>
        <p className="stat-label mt-0.5">{label}</p>
      </div>
    </Link>
  );
}
