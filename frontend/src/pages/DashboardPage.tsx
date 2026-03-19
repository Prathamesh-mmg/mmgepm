// src/pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FolderKanban, CheckSquare, AlertTriangle, DollarSign,
  TrendingUp, Clock, AlertCircle, ArrowRight
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_COLORS: Record<number, string> = {
  1: '#6B7280', 2: '#3B82F6', 3: '#22C55E', 4: '#EF4444', 5: '#F59E0B'
};
const STATUS_LABELS: Record<number, string> = {
  1: 'Draft', 2: 'In Progress', 3: 'Completed', 4: 'Delayed', 5: 'On Hold'
};
const SEVERITY_COLORS: Record<string, string> = {
  High: '#EF4444', Medium: '#F59E0B', Low: '#22C55E'
};

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn:  () => dashboardApi.get().then(r => r.data),
  });

  const { data: myTasks } = useQuery({
    queryKey: ['dashboard-my-tasks'],
    queryFn:  () => dashboardApi.getMyTasks().then(r => r.data),
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {greeting()}, {user?.firstName} 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {format(new Date(), 'EEEE, dd MMMM yyyy')} · Here's what's happening
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={overview?.activeProjects ?? 0}
          icon={<FolderKanban className="w-5 h-5 text-blue-500" />}
          trend={overview?.projectsTrend}
          bg="bg-blue-50"
          link="/projects"
        />
        <StatCard
          label="My Open Tasks"
          value={myTasks?.actionable ?? 0}
          icon={<CheckSquare className="w-5 h-5 text-brand-500" />}
          trend={null}
          bg="bg-brand-50"
          link="/tasks?dashboard=actionable"
        />
        <StatCard
          label="Delayed Tasks"
          value={myTasks?.delayed ?? 0}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          bg="bg-red-50"
          highlight={myTasks?.delayed > 0}
          link="/tasks?dashboard=delayed"
        />
        <StatCard
          label="Open Risks (High)"
          value={overview?.highRisks ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          bg="bg-orange-50"
          highlight={overview?.highRisks > 0}
          link="/risks"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project status distribution */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Projects by Status</span>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={overview?.projectsByStatus ?? []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {(overview?.projectsByStatus ?? []).map((entry: any, idx: number) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? '#9CA3AF'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: string) => [val, name]}
                  labelFormatter={(label) => STATUS_LABELS[label] ?? label}
                />
                <Legend
                  formatter={(value) => STATUS_LABELS[parseInt(value)] ?? value}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly task completion */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <span className="font-medium text-sm">Task Completion — Last 6 Months</span>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview?.monthlyTaskStats ?? []} barSize={20} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#22C55E" name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed"   fill="#EF4444" name="Delayed"   radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-col: my tasks + recent projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Today's Tasks</span>
            <Link to="/tasks?dashboard=today" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {!myTasks?.todayTasks?.length
              ? <div className="empty-state py-10"><Clock className="empty-icon" /><p>No tasks due today</p></div>
              : myTasks.todayTasks.slice(0, 5).map((t: any) => (
                  <Link
                    key={t.taskId}
                    to={`/tasks/${t.taskId}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className={clsx(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      t.status === 3 ? 'bg-green-400' : t.status === 4 ? 'bg-red-400' : 'bg-blue-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.projectName}</p>
                    </div>
                    <span className={`status-chip status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                  </Link>
                ))
            }
          </div>
        </div>

        {/* Recent projects */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Recent Projects</span>
            <Link to="/projects" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {!overview?.recentProjects?.length
              ? <div className="empty-state py-10"><FolderKanban className="empty-icon" /><p>No projects yet</p></div>
              : overview.recentProjects.slice(0, 5).map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-600">
                        {p.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="progress-bar flex-1 h-1.5">
                          <div
                            className="progress-fill bg-brand-400"
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                          {p.progressPercent}%
                        </span>
                      </div>
                    </div>
                    <span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>

      {/* Risk & Budget summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Open Risks by Severity</span>
            <Link to="/risks" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4 text-center">
            {['High', 'Medium', 'Low'].map(sev => (
              <div key={sev} className={clsx(
                'rounded-xl p-4 flex flex-col gap-1',
                sev === 'High'   ? 'bg-red-50'    : '',
                sev === 'Medium' ? 'bg-orange-50' : '',
                sev === 'Low'    ? 'bg-green-50'  : '',
              )}>
                <p className="text-2xl font-bold" style={{ color: SEVERITY_COLORS[sev] }}>
                  {overview?.riskSummary?.[sev.toLowerCase()] ?? 0}
                </p>
                <p className="text-xs font-medium text-[var(--text-secondary)]">{sev} Severity</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget summary */}
        <div className="card">
          <div className="card-header">
            <span className="font-medium text-sm">Portfolio Budget</span>
            <Link to="/budget" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Total Budget',    value: overview?.totalBudget,    color: 'text-[var(--text-primary)]' },
              { label: 'Committed',       value: overview?.totalCommitted,  color: 'text-orange-600' },
              { label: 'Expended',        value: overview?.totalExpended,   color: 'text-red-600'    },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                <span className={clsx('text-sm font-semibold', color)}>
                  ${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            <div className="progress-bar h-2">
              <div
                className="progress-fill bg-red-400"
                style={{ width: `${Math.min(100, (overview?.totalExpended ?? 0) / Math.max(1, overview?.totalBudget ?? 1) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-right">
              {Math.min(100, Math.round((overview?.totalExpended ?? 0) / Math.max(1, overview?.totalBudget ?? 1) * 100))}% of budget expended
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable stat card ──
function StatCard({
  label, value, icon, bg, trend, highlight, link
}: {
  label: string; value: number; icon: React.ReactNode; bg: string;
  trend?: number | null; highlight?: boolean; link: string;
}) {
  return (
    <Link to={link} className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
          {icon}
        </div>
        {trend != null && (
          <span className={clsx('stat-change flex items-center gap-0.5', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            <TrendingUp className="w-3 h-3" />
            {Math.abs(trend)}%
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
