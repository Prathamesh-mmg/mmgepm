import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, projectsApi, api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  Plus, Search, Download, Upload, Trash2, Eye, ChevronRight,
  Clock, CheckCircle, AlertCircle, Activity, Zap, X, Loader2,
  Filter, Calendar
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

const STATUS_OPTIONS  = ['NotStarted','InProgress','Completed','OnHold','Cancelled'];
const PRIORITY_OPTS   = ['Low','Medium','High','Critical'];

const STATUS_BADGE: Record<string,string> = {
  NotStarted: 'badge-gray', InProgress: 'badge-blue',
  Completed: 'badge-green', OnHold: 'badge-yellow', Cancelled: 'badge-red',
};
const PRIORITY_COLOR: Record<string,string> = {
  Low: '#22C55E', Medium: '#F59E0B', High: '#F97316', Critical: '#EF4444',
};
const PRIORITY_BG: Record<string,string> = {
  Low: '#F0FDF4', Medium: '#FFFBEB', High: '#FFF7ED', Critical: '#FEF2F2',
};

type TabKey = 'All' | 'Actionable' | 'Today' | 'Active' | 'Completed' | 'Delayed';

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'All',        label: 'All Tasks',   icon: Filter,       color: '#6B7280' },
  { key: 'Actionable', label: 'Actionable',  icon: Zap,          color: '#8B5CF6' },
  { key: 'Today',      label: "Due Today",   icon: Calendar,     color: '#3B82F6' },
  { key: 'Active',     label: 'In Progress', icon: Activity,     color: '#F59E0B' },
  { key: 'Completed',  label: 'Completed',   icon: CheckCircle,  color: '#22C55E' },
  { key: 'Delayed',    label: 'Delayed',     icon: AlertCircle,  color: '#EF4444' },
];

interface TaskForm {
  projectId: string; name: string; wbsCode: string; parentTaskId: string;
  startDate: string; endDate: string; priority: string;
  estimatedHours: string; description: string;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

function filterByTab(tasks: any[], tab: TabKey): any[] {
  switch (tab) {
    case 'Actionable': return tasks.filter(t => t.status === 'InProgress' || t.status === 'NotStarted');
    case 'Today':      return tasks.filter(t => t.endDate && new Date(t.endDate).toDateString() === today.toDateString());
    case 'Active':     return tasks.filter(t => t.status === 'InProgress');
    case 'Completed':  return tasks.filter(t => t.status === 'Completed');
    case 'Delayed':    return tasks.filter(t => t.endDate && new Date(t.endDate) < today && t.status !== 'Completed' && t.status !== 'Cancelled');
    default:           return tasks;
  }
}

export default function TasksPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuthStore();

  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatus]        = useState('');
  const [projectFilter, setProject]       = useState(searchParams.get('projectId') || '');
  const [showModal,     setShowModal]     = useState(false);
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab,     setActiveTab]     = useState<TabKey>('All');
  const [form, setForm] = useState<TaskForm>({
    projectId: projectFilter, name: '', wbsCode: '', parentTaskId: '',
    startDate: '', endDate: '', priority: 'Medium', estimatedHours: '', description: '',
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectFilter, statusFilter, search],
    queryFn:  () => tasksApi.getAll({
      projectId: projectFilter || undefined,
      status:    statusFilter  || undefined,
      search:    search        || undefined,
    }).then(r => r.data),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const createMutation = useMutation({
    mutationFn: () => tasksApi.create({
      projectId:      form.projectId,
      name:           form.name,
      wbsCode:        form.wbsCode        || undefined,
      parentTaskId:   form.parentTaskId   || undefined,
      startDate:      form.startDate      || undefined,
      endDate:        form.endDate        || undefined,
      priority:       form.priority,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      description:    form.description    || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to create task'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const handleImport = async () => {
    if (!importFile || !projectFilter) { toast.error('Select a project first'); return; }
    setImportLoading(true);
    try {
      const res = await tasksApi.import(projectFilter, importFile);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Imported ${res.data.imported} tasks`);
      setImportFile(null);
    } catch { toast.error('Import failed — check file format'); }
    finally   { setImportLoading(false); }
  };

  const handleExport = async () => {
    if (!projectFilter) { toast.error('Select a project to export'); return; }
    try {
      const res = await tasksApi.export(projectFilter);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'tasks.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const allTasks: any[] = Array.isArray(tasks) ? tasks : (tasks?.items ?? []);
  const taskList = filterByTab(allTasks, activeTab);
  const canManage = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager') || hasRole('Site Engineer');

  // Compute counts from allTasks (not taskList)
  const tabCounts: Record<TabKey, number> = {
    All:        allTasks.length,
    Actionable: filterByTab(allTasks, 'Actionable').length,
    Today:      filterByTab(allTasks, 'Today').length,
    Active:     filterByTab(allTasks, 'Active').length,
    Completed:  filterByTab(allTasks, 'Completed').length,
    Delayed:    filterByTab(allTasks, 'Delayed').length,
  };

  return (
    <div className="space-y-5 max-w-full animate-fade-in">

      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">Work Breakdown Structure — 7-Level Hierarchy</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button className="btn-outline btn-sm flex items-center gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {canManage && (
            <>
              <label className="btn-outline btn-sm cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Import Excel
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </label>
              {importFile && (
                <button className="btn-secondary btn-sm" onClick={handleImport} disabled={importLoading}>
                  {importLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                    : `Import "${importFile.name}"`
                  }
                </button>
              )}
              <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" /> New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────── */}
      <div className="card" style={{ padding: '12px 16px', borderRadius: '12px' }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="search-bar flex-1 min-w-[180px]">
            <Search className="search-icon w-4 h-4" />
            <input className="form-input pl-9" placeholder="Search tasks..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select w-44" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select w-52" value={projectFilter}
            onChange={e => { setProject(e.target.value); setForm(f => ({ ...f, projectId: e.target.value })); }}>
            <option value="">All Projects</option>
            {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Status Summary Cards ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TAB_CONFIG.map(({ key, label, icon: Icon, color }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            className="rounded-xl p-3.5 text-left transition-all relative overflow-hidden"
            style={{
              background: activeTab === key ? `${color}12` : '#FFFFFF',
              border: `1.5px solid ${activeTab === key ? color + '40' : 'var(--border)'}`,
              boxShadow: activeTab === key ? `0 4px 16px ${color}15` : '0 1px 3px rgba(0,0,0,0.04)',
              transform: activeTab === key ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              {activeTab === key && (
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              )}
            </div>
            <p className="text-lg font-extrabold" style={{ color: activeTab === key ? color : '#111827', letterSpacing: '-0.5px' }}>
              {tabCounts[key]}
            </p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: activeTab === key ? color : '#9CA3AF' }}>
              {label}
            </p>
          </button>
        ))}
      </div>

      {/* ── Task Table ───────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--primary)', opacity: 0.5 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading tasks...</p>
          </div>
        ) : taskList.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <CheckCircle className="w-7 h-7 opacity-25" />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {activeTab === 'Delayed' ? 'No delayed tasks — great work!' :
               activeTab === 'Today' ? 'No tasks due today' :
               'No tasks found'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {canManage ? 'Create a task or import from Excel to get started' : 'No tasks match your current filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-20">WBS</th>
                  <th>Task Name</th>
                  <th className="w-32">Status</th>
                  <th className="w-24">Priority</th>
                  <th className="w-32">Progress</th>
                  <th className="w-28">Assignee</th>
                  <th className="w-28">Due Date</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taskList.map((t: any) => {
                  const isDelayed = t.endDate && new Date(t.endDate) < today && t.status !== 'Completed' && t.status !== 'Cancelled';
                  return (
                    <tr key={t.id}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      style={{ borderBottom: '1px solid var(--border)' }}>

                      {/* WBS Code */}
                      <td onClick={e => e.stopPropagation()}>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          {t.wbsCode || '—'}
                        </span>
                      </td>

                      {/* Name with hierarchy indent */}
                      <td>
                        <div style={{ paddingLeft: `${Math.max(0, ((t.level || 1) - 1)) * 20}px` }}
                          className="flex items-center gap-2">
                          {t.level > 1 && (
                            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          )}
                          <div>
                            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {t.hasChildren && <span className="mr-1 opacity-40">▸</span>}
                              {t.name}
                            </span>
                            {t.projectName && (
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.projectName}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td onClick={e => e.stopPropagation()}>
                        {canManage ? (
                          <select
                            className="text-[11px] border rounded-lg px-2 py-1 font-semibold cursor-pointer"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            value={t.status}
                            onChange={e => updateStatusMutation.mutate({ id: t.id, status: e.target.value })}
                            onClick={e => e.stopPropagation()}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: PRIORITY_BG[t.priority] || '#F9FAFB', color: PRIORITY_COLOR[t.priority] || '#6B7280' }}>
                          <span className="w-1.5 h-1.5 rounded-full"
                            style={{ background: PRIORITY_COLOR[t.priority] || '#9CA3AF' }} />
                          {t.priority}
                        </span>
                      </td>

                      {/* Progress */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${t.progressPercentage || 0}%`,
                                background: (t.progressPercentage || 0) >= 100 ? '#22C55E' : 'var(--primary)'
                              }} />
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {t.progressPercentage || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td>
                        {t.assigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ background: 'var(--primary)' }}>
                              {t.assigneeName.charAt(0)}
                            </div>
                            <span className="text-[12px] truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
                              {t.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td>
                        {t.endDate ? (
                          <span className={clsx('text-[12px] font-medium', isDelayed && 'font-semibold')}
                            style={{ color: isDelayed ? '#EF4444' : 'var(--text-secondary)' }}>
                            {format(new Date(t.endDate), 'dd MMM yyyy')}
                            {isDelayed && <span className="block text-[10px]">Overdue</span>}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            title="View task"
                            style={{ color: 'var(--primary)' }}
                            onClick={() => navigate(`/tasks/${t.id}`)}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <button
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              title="Delete task"
                              style={{ color: '#9CA3AF' }}
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm(`Delete "${t.name}"?`)) deleteTaskMutation.mutate(t.id);
                              }}
                              onMouseEnter={e => { (e.currentTarget.style.color = '#EF4444'); (e.currentTarget.style.backgroundColor = '#FEF2F2'); }}
                              onMouseLeave={e => { (e.currentTarget.style.color = '#9CA3AF'); (e.currentTarget.style.backgroundColor = 'transparent'); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {!isLoading && taskList.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Showing {taskList.length} of {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}
              {activeTab !== 'All' && ` (filtered: ${activeTab})`}
            </p>
          </div>
        )}
      </div>

      {/* ── Create Task Modal ─────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-light)' }}>
                  <Plus className="w-4.5 h-4.5" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Create New Task</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add to the Work Breakdown Structure</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group col-span-2">
                    <label className="form-label">Task Name *</label>
                    <input className="form-input" required placeholder="e.g. Foundation excavation"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project *</label>
                    <select className="form-select" required value={form.projectId}
                      onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                      <option value="">Select project...</option>
                      {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">WBS Code</label>
                    <input className="form-input font-mono" placeholder="e.g. 1.2.3"
                      value={form.wbsCode} onChange={e => setForm(f => ({ ...f, wbsCode: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Hours</label>
                    <input type="number" className="form-input" min="0" placeholder="0"
                      value={form.estimatedHours}
                      onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Description</label>
                    <textarea className="form-input textarea" rows={3} placeholder="Describe this task..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" /> Create Task</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
