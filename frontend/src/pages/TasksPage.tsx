import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, projectsApi, dashboardApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['NotStarted', 'InProgress', 'Completed', 'OnHold', 'Cancelled'];
const PRIORITY_OPTS  = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_COLORS: Record<string, string> = {
  NotStarted: 'badge-info', InProgress: 'badge-warning',
  Completed: 'badge-success', OnHold: 'badge-danger', Cancelled: 'badge-danger',
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-green-600', Medium: 'text-[var(--primary)]', High: 'text-orange-600', Critical: 'text-red-600',
};

interface TaskForm {
  projectId: string; name: string; wbsCode: string; parentTaskId: string;
  startDate: string; endDate: string; priority: string;
  estimatedHours: string; description: string;
}

export default function TasksPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuthStore();

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [projectFilter, setProject] = useState(searchParams.get('projectId') || '');
  const [showModal, setShowModal]   = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'All'|'Actionable'|'Today'|'Active'|'Completed'|'Delayed'>('All');
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
      wbsCode:        form.wbsCode  || undefined,
      parentTaskId:   form.parentTaskId || undefined,
      startDate:      form.startDate || undefined,
      endDate:        form.endDate   || undefined,
      priority:       form.priority,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      description:    form.description   || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to create task'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Task deleted'));
    },
    onError: () => import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to delete task')),
  });;

  const handleImport = async () => {
    if (!importFile || !projectFilter) { toast.error('Select a project first'); return; }
    setImportLoading(true);
    try {
      const res = await tasksApi.import(projectFilter, importFile);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Imported ${res.data.imported} tasks`);
      setImportFile(null);
    } catch { toast.error('Import failed'); }
    finally { setImportLoading(false); }
  };

  const handleExport = async () => {
    if (!projectFilter) { toast.error('Select a project to export'); return; }
    const res = await tasksApi.export(projectFilter);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url;
    a.download = 'tasks.xlsx'; a.click(); URL.revokeObjectURL(url);
  };

  const allTasks: any[] = Array.isArray(tasks) ? tasks : (tasks?.items ?? []);
  const taskList: any[] = activeTab === 'All' ? allTasks
    : activeTab === 'Actionable' ? allTasks.filter((t: any) => t.status === 'InProgress' || t.status === 'NotStarted')
    : activeTab === 'Today' ? allTasks.filter((t: any) => t.endDate && new Date(t.endDate).toDateString() === new Date().toDateString())
    : activeTab === 'Active' ? allTasks.filter((t: any) => t.status === 'InProgress')
    : activeTab === 'Completed' ? allTasks.filter((t: any) => t.status === 'Completed')
    : allTasks.filter((t: any) => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'Completed');
  const canManage = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager') || hasRole('Site Engineer');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Work Breakdown Structure — 7-Level Hierarchy</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button className="btn-ghost text-sm" onClick={handleExport}>↓ Export</button>
          {canManage && (
            <>
              <label className="btn-ghost text-sm cursor-pointer">
                ↑ Import Excel
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </label>
              {importFile && (
                <button className="btn-primary text-sm" onClick={handleImport} disabled={importLoading}>
                  {importLoading ? 'Importing...' : `Import "${importFile.name}"`}
                </button>
              )}
              <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Task</button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <input className="form-input flex-1 min-w-[180px]" placeholder="Search tasks..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select w-44" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select w-52" value={projectFilter} onChange={e => { setProject(e.target.value); setForm(f => ({ ...f, projectId: e.target.value })); }}>
            <option value="">All Projects</option>
            {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs mb-0">
        {(['All','Actionable','Today','Active','Completed','Delayed'] as const).map(tab => {
          const count = tab === 'All' ? taskList.length
            : tab === 'Actionable' ? taskList.filter((t: any) => t.status === 'InProgress' || t.status === 'NotStarted').length
            : tab === 'Today' ? taskList.filter((t: any) => t.endDate && new Date(t.endDate).toDateString() === new Date().toDateString()).length
            : tab === 'Active' ? taskList.filter((t: any) => t.status === 'InProgress').length
            : tab === 'Completed' ? taskList.filter((t: any) => t.status === 'Completed').length
            : taskList.filter((t: any) => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'Completed').length;
          return (
            <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab} {count > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${tab === 'Delayed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Task table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading tasks...</div>
        ) : taskList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 font-medium">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">
              {canManage ? 'Create a task or import from Excel' : 'No tasks match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>WBS</th><th>Task Name</th><th>Status</th>
                  <th>Priority</th><th>Progress</th><th>Assignee</th>
                  <th>Due Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {taskList.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs text-gray-400">{t.wbsCode || '—'}</td>
                    <td>
                      <div style={{ paddingLeft: `${Math.max(0, (t.level - 1)) * 20}px` }}>
                        <span
                          className="font-medium text-gray-800 cursor-pointer hover:text-[var(--primary)]"
                          onClick={() => navigate(`/tasks/${t.id}`)}
                        >
                          {t.hasChildren && <span className="text-gray-300 mr-1">▸</span>}
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          value={t.status}
                          onChange={e => updateStatusMutation.mutate({ id: t.id, status: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`badge ${STATUS_COLORS[t.status] || 'badge-info'}`}>{t.status}</span>
                      )}
                    </td>
                    <td className={`text-sm font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>{t.priority}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div className="progress-fill" style={{ width: `${t.progressPercentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{t.progressPercentage}%</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">{t.assigneeName || '—'}</td>
                    <td className="text-sm text-gray-500">
                      {t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-[var(--primary)] hover:underline font-medium"
                          onClick={() => navigate(`/tasks/${t.id}`)}>
                          View
                        </button>
                        {canManage && (
                          <button
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(`Delete task "${t.name}"?`)) deleteTaskMutation.mutate(t.id);
                            }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Create Task</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group col-span-2">
                    <label className="form-label">Task Name *</label>
                    <input className="form-input" required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
                    <input className="form-input font-mono" placeholder="e.g. 1.2.3" value={form.wbsCode}
                      onChange={e => setForm(f => ({ ...f, wbsCode: e.target.value }))} />
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
                    <input type="number" className="form-input" min="0" value={form.estimatedHours}
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
                    <textarea className="form-input" rows={3} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
