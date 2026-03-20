import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, api } from '../lib/api';
import GanttChart from '../components/gantt/GanttChart';
import DependencyManager from '../components/gantt/DependencyManager';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  Planning: 'badge-info', Active: 'badge-success', OnHold: 'badge-warning',
  Completed: 'badge-primary', Cancelled: 'badge-danger',
};
const TASK_STATUS_COLORS: Record<string, string> = {
  NotStarted: 'badge-info', InProgress: 'badge-warning',
  Completed: 'badge-success', OnHold: 'badge-danger', Cancelled: 'badge-danger',
};

type Tab = 'overview' | 'tasks' | 'schedule' | 'dpr' | 'labour' | 'members';

export default function ProjectDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { hasRole } = useAuthStore();
  const [tab, setTab]                 = useState<Tab>('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole]   = useState('TeamMember');
  const [importFile, setImportFile]   = useState<File | null>(null);
  const [depTaskId, setDepTaskId]     = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => projectsApi.getById(id!).then(r => r.data),
    enabled:  !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn:  () => projectsApi.getTasks(id!).then(r => r.data),
    enabled:  tab === 'tasks' && !!id,
  });

  const { data: dprs } = useQuery({
    queryKey: ['project-dprs', id],
    queryFn:  () => projectsApi.getDPRs(id!).then(r => r.data),
    enabled:  tab === 'dpr' && !!id,
  });

  const { data: ganttData } = useQuery({
    queryKey: ['gantt', id],
    queryFn:  () => api.get(`/projects/${id}/gantt`).then(r => r.data),
    enabled:  tab === 'schedule' && !!id,
  });

  const { data: attendance } = useQuery({
    queryKey: ['project-attendance', id],
    queryFn:  () => projectsApi.getAttendance(id!).then(r => r.data),
    enabled:  tab === 'labour' && !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => projectsApi.updateStatus(id!, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => projectsApi.addMember(id!, { email: memberEmail, projectRole: memberRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Member added');
      setShowAddMember(false);
      setMemberEmail('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add member'),
  });

  const handleExport = async () => {
    const res = await tasksApi.export(id!);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'tasks.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const res = await tasksApi.import(id!, importFile);
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      toast.success(`Imported ${res.data.imported} tasks`);
      setImportFile(null);
    } catch { toast.error('Import failed'); }
  };

  if (isLoading) return (
    <div className="page-container">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="card h-48" />
      </div>
    </div>
  );
  if (!project) return <div className="page-container"><p className="text-gray-500">Project not found.</p></div>;

  const canManage = hasRole('Admin') || hasRole('Project Manager') || hasRole('Planning Engineer');
  const taskList: any[]  = Array.isArray(tasks) ? tasks : (tasks?.items ?? []);
  const dprList: any[]   = Array.isArray(dprs) ? dprs : [];
  const attendList: any[] = Array.isArray(attendance) ? attendance : [];
  const members: any[]   = project.members ?? [];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'schedule',  label: 'Gantt Schedule' },
    { key: 'tasks',    label: `Tasks (${project.totalTasks ?? 0})` },
    { key: 'dpr',      label: 'DPR' },
    { key: 'labour',   label: 'Labour' },
    { key: 'members',  label: `Members (${project.memberCount ?? 0})` },
  ];

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/projects')} className="hover:text-[var(--primary)]">Projects</button>
        <span>/</span>
        <span className="text-gray-800 font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`badge ${STATUS_COLORS[project.status] || 'badge-info'}`}>{project.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {project.code}{project.country ? ` · ${project.country}` : ''}{project.location ? ` · ${project.location}` : ''}
          </p>
        </div>
        {canManage && (
          <select className="form-select w-40" value={project.status}
            onChange={e => updateStatusMutation.mutate(e.target.value)}>
            {['Planning','Active','OnHold','Completed','Cancelled'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-lg font-bold text-[var(--primary)]">{project.overallProgress ?? 0}%</span>
        </div>
        <div className="progress-bar h-3">
          <div className="progress-fill" style={{ width: `${project.overallProgress ?? 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-gray-800 mb-4">Project Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Client',           project.clientName],
                ['Type',             project.projectType],
                ['Start Date',       project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'],
                ['End Date',         project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : '—'],
                ['Budget',           project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'],
                ['Project Manager',  project.projectManagerName  || '—'],
                ['Project Head',     project.projectHeadName     || '—'],
                ['Planning Engineer',project.planningEngineerName || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            {project.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>
            )}
          </div>
          <div className="card h-fit">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Stats</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Tasks',     value: project.totalTasks     ?? 0, color: 'text-blue-600' },
                { label: 'Completed Tasks', value: project.completedTasks ?? 0, color: 'text-green-600' },
                { label: 'Team Members',    value: project.memberCount    ?? 0, color: 'text-purple-600' },
                { label: 'Open Risks',      value: project.openRisks      ?? 0, color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{s.label}</span>
                  <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">Work Breakdown Structure</h3>
            <div className="flex gap-2">
              <button className="btn-ghost text-sm" onClick={handleExport}>↓ Export</button>
              {canManage && (
                <>
                  <label className="btn-ghost text-sm cursor-pointer">
                    ↑ Import
                    <input type="file" accept=".xlsx" className="hidden"
                      onChange={e => setImportFile(e.target.files?.[0] || null)} />
                  </label>
                  {importFile && (
                    <button className="btn-primary text-sm" onClick={handleImport}>
                      Import "{importFile.name}"
                    </button>
                  )}
                  <button className="btn-primary text-sm" onClick={() => navigate(`/tasks?projectId=${id}`)}>
                    + Add Task
                  </button>
                </>
              )}
            </div>
          </div>
          {taskList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No tasks yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>WBS</th><th>Task</th><th>Status</th><th>Progress</th><th>Assignee</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {taskList.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/tasks/${t.id}`)}>
                      <td className="font-mono text-xs text-gray-400">{t.wbsCode || '—'}</td>
                      <td>
                        <div style={{ paddingLeft: `${Math.max(0, (t.level - 1)) * 16}px` }}>
                          <span className="font-medium text-gray-800">{t.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${TASK_STATUS_COLORS[t.status] || 'badge-info'}`}>{t.status}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16"><div className="progress-fill" style={{ width: `${t.progressPercentage}%` }} /></div>
                          <span className="text-xs text-gray-500">{t.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-500">{t.assigneeName || '—'}</td>
                      <td className="text-xs text-gray-500">{t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule / Gantt ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Project Schedule — Gantt Chart</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Click any task bar to see details. Use zoom controls to change the view.
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => {
                  if (taskList.length > 0) setDepTaskId(taskList[0].id);
                }}
                className="btn-ghost text-sm flex items-center gap-1.5">
                🔗 Manage Dependencies
              </button>
            )}
          </div>

          {!ganttData ? (
            <div className="card p-12 text-center">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
                <div className="h-48 bg-gray-100 rounded" />
              </div>
            </div>
          ) : ganttData.tasks?.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-500 font-medium">No tasks with dates yet</p>
              <p className="text-gray-400 text-sm mt-1">Add tasks with start and end dates to see the Gantt chart</p>
              {canManage && (
                <button onClick={() => setTab('tasks')} className="btn-primary mt-4 text-sm">
                  + Add Tasks
                </button>
              )}
            </div>
          ) : (
            <GanttChart
              tasks={ganttData.tasks.map((t: any) => ({
                id: t.id,
                parentId: t.parentId,
                name: t.name,
                wbsCode: t.wbsCode,
                level: t.level,
                status: t.status,
                priority: t.priority,
                startDate: t.startDate,
                endDate: t.endDate,
                progress: t.progress,
                isMilestone: t.isMilestone,
                hasChildren: t.hasChildren,
                assigneeName: t.assigneeName,
                sortOrder: t.sortOrder,
                dependencies: t.dependencies ?? [],
                isCritical: t.isCritical,
              }))}
              projectStart={ganttData.projectStart}
              projectEnd={ganttData.projectEnd}
              readOnly={!canManage}
            />
          )}

          {/* Dependency summary */}
          {ganttData?.tasks && ganttData.tasks.some((t: any) => t.dependencies?.length > 0) && (
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Dependency Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ganttData.tasks
                  .filter((t: any) => t.dependencies?.length > 0)
                  .map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{t.name}</span>
                      <span className="text-gray-400 flex-shrink-0">← {t.dependencies.length}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dependency Manager Modal */}
      {depTaskId && (
        <DependencyManager
          taskId={depTaskId}
          taskName={taskList.find((t: any) => t.id === depTaskId)?.name ?? ''}
          allTasks={taskList.map((t: any) => ({ id: t.id, name: t.name, wbsCode: t.wbsCode }))}
          onClose={() => setDepTaskId(null)}
        />
      )}

      {/* ── DPR ── */}
      {tab === 'dpr' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Daily Progress Reports</h3>
            {canManage && <button className="btn-primary text-sm">+ New DPR</button>}
          </div>
          {dprList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No DPRs submitted yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Submitted By</th><th>Status</th><th>Work Completed</th></tr></thead>
              <tbody>
                {dprList.map((d: any) => (
                  <tr key={d.id}>
                    <td className="font-medium">{new Date(d.reportDate).toLocaleDateString()}</td>
                    <td>{d.submittedByName || '—'}</td>
                    <td>
                      <span className={`badge ${d.status === 'Approved' ? 'badge-success' : d.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600 max-w-xs truncate">{d.workCompleted || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Labour ── */}
      {tab === 'labour' && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Labour Attendance</h3>
          {attendList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No attendance records found.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Trade</th><th>Contractor</th><th>Status</th><th>Hours</th></tr></thead>
              <tbody>
                {attendList.map((a: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium">{a.labourName}</td>
                    <td>{a.tradeName || '—'}</td>
                    <td>{a.contractorName || 'Direct'}</td>
                    <td>
                      <span className={`badge ${a.status === 'Present' ? 'badge-success' : a.status === 'Absent' ? 'badge-danger' : 'badge-warning'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>{a.hoursWorked ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Members ── */}
      {tab === 'members' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Project Members</h3>
            {canManage && <button className="btn-primary text-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>}
          </div>
          {members.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No members assigned.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.userId}>
                    <td className="font-medium">{m.userName}</td>
                    <td className="text-gray-500">{m.email}</td>
                    <td><span className="badge badge-info">{m.projectRole}</span></td>
                    <td className="text-gray-500">{new Date(m.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Add Project Member</h2>
              <button className="modal-close" onClick={() => setShowAddMember(false)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">User Email</label>
                <input className="form-input" type="email" value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)} placeholder="user@mmgroup.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Project Role</label>
                <select className="form-select" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                  {['ProjectManager','PlanningEngineer','SiteEngineer','LabourManager','TeamMember','Viewer'].map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowAddMember(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => addMemberMutation.mutate()}
                disabled={!memberEmail || addMemberMutation.isPending}>
                {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
