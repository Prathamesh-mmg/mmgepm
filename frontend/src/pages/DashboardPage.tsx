import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  FolderKanban, CheckSquare, AlertTriangle, AlertCircle,
  TrendingUp, TrendingDown, Clock, ArrowRight, DollarSign,
  Activity, Users, Package, ShoppingCart, CheckCheck,
  Zap, Target, BarChart3
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  Planning: '#8B5CF6', Active: '#10B981', OnHold: '#F59E0B',
  Completed: '#3B82F6', Cancelled: '#EF4444',
};
const RISK_COLORS: Record<string, string> = {
  Low: '#22C55E', Medium: '#F59E0B', High: '#F97316', Critical: '#EF4444',
};
const TASK_COLORS: Record<string, string> = {
  NotStarted: '#9CA3AF', InProgress: '#3B82F6', Completed: '#22C55E',
  OnHold: '#F59E0B', Cancelled: '#EF4444',
};

// Tooltip customizations
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#1F2937', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {label && <p className="font-semibold mb-1 text-gray-300">{label}</p>}
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-300">{p.name}:</span>
            <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
    queryFn: () => api.get('/tasks', { params: { pageSize: 6 } }).then(r => r.data),
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
      <div className="space-y-4">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  const taskList: any[] = Array.isArray(myTasks) ? myTasks.slice(0, 6) : (myTasks?.items ?? []).slice(0, 6);
  const projectList: any[] = recentProjects?.items?.slice(0, 5) ?? [];

  const kpis = [
    {
      label: 'Active Projects',
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      color: '#3B82F6',
      bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
      link: '/projects',
      sub: `${stats?.totalProjects ?? 0} total`,
    },
    {
      label: 'Tasks In Progress',
      value: stats?.inProgressTasks ?? 0,
      icon: Activity,
      color: '#F59E0B',
      bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      link: '/tasks',
      sub: `${stats?.completedTasks ?? 0} completed`,
    },
    {
      label: 'Delayed Tasks',
      value: stats?.delayedTasks ?? 0,
      icon: AlertCircle,
      color: (stats?.delayedTasks ?? 0) > 0 ? '#EF4444' : '#22C55E',
      bg: (stats?.delayedTasks ?? 0) > 0
        ? 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)'
        : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
      link: '/tasks',
      sub: (stats?.delayedTasks ?? 0) > 0 ? 'Action required' : 'On track',
      highlight: (stats?.delayedTasks ?? 0) > 0,
    },
    {
      label: 'Open Critical Risks',
      value: (stats?.highRisks ?? 0) + (stats?.criticalRisks ?? 0),
      icon: AlertTriangle,
      color: '#F97316',
      bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
      link: '/risks',
      sub: `${stats?.criticalRisks ?? 0} critical`,
      highlight: (stats?.criticalRisks ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* ── Welcome Header ───────────────────────── */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #14110D 0%, #1E1812 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Background elements */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FFCC00, transparent)' }} />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #D1111C, transparent)' }} />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {greeting()}, {user?.firstName} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {format(new Date(), 'EEEE, dd MMMM yyyy')} · Mount Meru Group EPM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Portfolio Health</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${100 - Math.min(100, ((stats?.delayedTasks ?? 0) / Math.max(1, stats?.inProgressTasks ?? 1)) * 100)}%`,
                      background: 'linear-gradient(90deg, #22C55E, #10B981)'
                    }} />
                </div>
                <span className="text-sm font-bold text-white">
                  {Math.max(0, 100 - Math.round(((stats?.delayedTasks ?? 0) / Math.max(1, stats?.inProgressTasks ?? 1)) * 100))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary KPIs ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Link key={k.label} to={k.link}
            className="group rounded-2xl p-5 transition-all duration-200 relative overflow-hidden"
            style={{
              background: k.bg,
              border: `1px solid ${k.color}20`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${k.color}20`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${k.color}18` }}>
                <k.icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: k.color }} />
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold" style={{ color: k.highlight ? '#DC2626' : '#111827', letterSpacing: '-1px' }}>
                {k.value}
              </p>
              <p className="text-xs font-700 mt-1 uppercase tracking-wide" style={{ color: '#6B7280', fontWeight: 600, letterSpacing: '0.05em' }}>
                {k.label}
              </p>
              {k.sub && (
                <p className="text-[11px] mt-1" style={{ color: k.highlight ? '#EF4444' : '#9CA3AF' }}>
                  {k.sub}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Secondary Stats ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Projects',  value: stats?.totalProjects ?? 0,  icon: Target,       color: '#6B7280' },
          { label: 'Completed Tasks', value: stats?.completedTasks ?? 0, icon: CheckCheck,   color: '#22C55E' },
          { label: 'Pending MRs',     value: stats?.pendingMRs ?? 0,     icon: ShoppingCart, color: '#3B82F6' },
          { label: 'Budget Used',     value: `${stats?.budgetUtilPct ?? 0}%`, icon: DollarSign, color: (stats?.budgetUtilPct ?? 0) > 80 ? '#EF4444' : '#8B5CF6' },
        ].map(k => (
          <div key={k.label} className="card py-4 px-5 text-center" style={{ borderRadius: '14px' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{ background: `${k.color}15` }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-extrabold" style={{ color: k.color, letterSpacing: '-0.5px' }}>{k.value}</p>
            <p className="text-[11px] mt-0.5 font-600" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Projects by Status - Donut */}
        <div className="card" style={{ borderRadius: '16px' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.10)' }}>
                <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="font-semibold text-[13px]">Projects by Status</span>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(stats?.projectsByStatus ?? []).filter((d: any) => d.value > 0)}
                  dataKey="value" nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={56} outerRadius={82}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {(stats?.projectsByStatus ?? []).map((entry: any) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[entry.label] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: '11px', color: '#6B7280' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks by Status - Donut */}
        <div className="card" style={{ borderRadius: '16px' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.10)' }}>
                <CheckSquare className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <span className="font-semibold text-[13px]">Tasks by Status</span>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(stats?.tasksByStatus ?? []).filter((d: any) => d.value > 0)}
                  dataKey="value" nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={56} outerRadius={82}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {(stats?.tasksByStatus ?? []).map((entry: any) => (
                    <Cell key={entry.label} fill={TASK_COLORS[entry.label] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: '11px', color: '#6B7280' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risks by Severity */}
        <div className="card" style={{ borderRadius: '16px' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.10)' }}>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <span className="font-semibold text-[13px]">Open Risks by Severity</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {(['Low','Medium','High','Critical'] as const).map(level => {
                const data = (stats?.risksBySeverity ?? []).find((r: any) => r.label === level);
                const count = data?.value ?? 0;
                return (
                  <div key={level} className="rounded-xl p-3.5 text-center relative overflow-hidden"
                    style={{ background: `${RISK_COLORS[level]}12`, border: `1px solid ${RISK_COLORS[level]}20` }}>
                    <p className="text-2xl font-extrabold" style={{ color: RISK_COLORS[level], letterSpacing: '-0.5px' }}>{count}</p>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: RISK_COLORS[level], opacity: 0.85 }}>{level}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Progress Chart ────────────────── */}
      <div className="card" style={{ borderRadius: '16px' }}>
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(209,17,28,0.08)' }}>
              <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="font-semibold text-[13px]">Monthly Task Activity — Last 6 Months</span>
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.monthlyProgress ?? []} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 0" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: '11px', color: '#6B7280' }}>{v}</span>} />
              <Bar dataKey="completed" fill="#22C55E" name="Completed" radius={[4,4,0,0]} />
              <Bar dataKey="created"   fill="#3B82F6" name="Created"   radius={[4,4,0,0]} />
              <Bar dataKey="delayed"   fill="#EF4444" name="Delayed"   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* My Tasks */}
        <div className="card overflow-hidden" style={{ borderRadius: '16px', padding: 0 }}>
          <div className="card-header" style={{ margin: 0, borderRadius: '16px 16px 0 0' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.10)' }}>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="font-semibold text-[13px]">Recent Tasks</span>
            </div>
            <Link to="/tasks" className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {!taskList.length ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                  <Clock className="w-6 h-6 opacity-25" />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No tasks yet</p>
              </div>
            ) : taskList.map((t: any, idx) => (
              <Link key={t.id} to={`/tasks/${t.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors border-b"
                style={{ borderColor: 'var(--border)', borderBottomWidth: idx === taskList.length - 1 ? 0 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                  t.status === 'Completed' ? 'bg-green-400' :
                  t.status === 'InProgress' ? 'bg-blue-400' :
                  t.status === 'OnHold' ? 'bg-yellow-400' : 'bg-gray-300'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.projectName}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={clsx('badge',
                    t.status === 'Completed' ? 'badge-green' :
                    t.status === 'InProgress' ? 'badge-blue' :
                    t.status === 'OnHold' ? 'badge-yellow' : 'badge-gray'
                  )}>{t.status}</span>
                  {t.endDate && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(t.endDate), 'dd MMM')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card overflow-hidden" style={{ borderRadius: '16px', padding: 0 }}>
          <div className="card-header" style={{ margin: 0, borderRadius: '16px 16px 0 0' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(209,17,28,0.08)' }}>
                <FolderKanban className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              </div>
              <span className="font-semibold text-[13px]">Recent Projects</span>
            </div>
            <Link to="/projects" className="flex items-center gap-1 text-xs font-semibold transition-opacity"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {!projectList.length ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                  <FolderKanban className="w-6 h-6 opacity-25" />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No projects yet</p>
              </div>
            ) : projectList.map((p: any, idx) => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors border-b"
                style={{ borderColor: 'var(--border)', borderBottomWidth: idx === projectList.length - 1 ? 0 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, rgba(209,17,28,0.10), rgba(209,17,28,0.06))', color: 'var(--primary)' }}>
                  {p.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="progress-bar flex-1 h-1.5">
                      <div className="progress-fill" style={{ width: `${p.overallProgress ?? 0}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {p.overallProgress ?? 0}%
                    </span>
                  </div>
                </div>
                <span className={clsx('badge',
                  p.status === 'Active' ? 'badge-green' :
                  p.status === 'Planning' ? 'badge-blue' :
                  p.status === 'OnHold' ? 'badge-yellow' :
                  p.status === 'Completed' ? 'badge-blue' : 'badge-gray'
                )}>{p.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Budget Summary ────────────────────────── */}
      {(stats?.totalBudget ?? 0) > 0 && (
        <div className="card" style={{ borderRadius: '16px' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.10)' }}>
                <DollarSign className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="font-semibold text-[13px]">Portfolio Budget Overview</span>
            </div>
            <Link to="/budget" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6 mb-5">
              {[
                { label: 'Total Budget',    value: stats?.totalBudget,   color: '#111827',  icon: '💰' },
                { label: 'Expended',        value: stats?.totalExpended, color: '#EF4444',  icon: '📤' },
                { label: 'Remaining',       value: (stats?.totalBudget ?? 0) - (stats?.totalExpended ?? 0), color: '#22C55E', icon: '✅' },
              ].map(b => (
                <div key={b.label} className="text-center">
                  <p className="text-xl font-extrabold" style={{ color: b.color, letterSpacing: '-0.5px' }}>
                    ${(b.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{b.label}</p>
                </div>
              ))}
            </div>
            <div className="relative">
              <div className="progress-bar h-3 rounded-full overflow-hidden" style={{ background: '#F0F0F0' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, stats?.budgetUtilPct ?? 0)}%`,
                    background: (stats?.budgetUtilPct ?? 0) > 85
                      ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                      : (stats?.budgetUtilPct ?? 0) > 65
                      ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                      : 'linear-gradient(90deg, #22C55E, #16A34A)'
                  }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>0%</p>
                <p className="text-[11px] font-bold" style={{ color: (stats?.budgetUtilPct ?? 0) > 80 ? '#EF4444' : 'var(--text-secondary)' }}>
                  {stats?.budgetUtilPct ?? 0}% utilized
                </p>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>100%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
