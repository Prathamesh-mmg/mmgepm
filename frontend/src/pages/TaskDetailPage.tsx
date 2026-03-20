import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertTriangle, MessageSquare, Send, Trash2, Link } from 'lucide-react';
import DependencyManager from '../components/gantt/DependencyManager';

const STATUS_OPTIONS = ['NotStarted','InProgress','Completed','OnHold','Cancelled'];
const DELAY_TYPES = ['Weather','Material','Labour','Equipment','Client','Other'];
const STATUS_COLORS: Record<string, string> = {
  NotStarted: 'badge-info', InProgress: 'badge-warning',
  Completed: 'badge-success', OnHold: 'badge-danger', Cancelled: 'badge-danger',
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-green-600', Medium: 'text-[var(--primary)]', High: 'text-orange-600', Critical: 'text-red-600',
};

type Tab = 'details' | 'progress' | 'subtasks' | 'delays' | 'comments' | 'attachments' | 'dependencies';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole, user } = useAuthStore(s => ({ hasRole: s.hasRole, user: s.user }));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('details');
  const [progressNote, setNote] = useState('');
  const [progressPct, setPct] = useState(0);
  const [hoursLogged, setHours] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [delayType, setDelayType] = useState('Weather');
  const [delayHours, setDelayHours] = useState('');
  const [delayDesc, setDelayDesc] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo]       = useState<string | null>(null);
  const [showDepMgr, setShowDepMgr] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(id!).then(r => r.data),
    enabled: !!id,
  });

  const { data: progress } = useQuery({
    queryKey: ['task-progress', id],
    queryFn: () => tasksApi.getProgress(id!).then(r => r.data),
    enabled: tab === 'progress' && !!id,
  });

  const { data: subtasks } = useQuery({
    queryKey: ['task-subtasks', id],
    queryFn: () => api.get(`/tasks?parentId=${id}`).then(r => r.data),
    enabled: tab === 'subtasks' && !!id,
  });

  const { data: delays } = useQuery({
    queryKey: ['task-delays', id],
    queryFn: () => api.get(`/tasks/${id}/delays`).then(r => r.data),
    enabled: tab === 'delays' && !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['task-comments', id],
    queryFn: () => api.get(`/tasks/${id}/comments`).then(r => r.data),
    enabled: tab === 'comments' && !!id,
  });

  const { data: taskDeps } = useQuery({
    queryKey: ['task-deps', id],
    queryFn: () => api.get(`/tasks/${id}/dependencies`).then(r => r.data),
    enabled: tab === 'dependencies' && !!id,
  });

  const { data: siblingTasks } = useQuery({
    queryKey: ['sibling-tasks', task?.projectId],
    queryFn: () => api.get('/tasks', { params: { projectId: task?.projectId } }).then(r => r.data),
    enabled: (tab === 'dependencies' || showDepMgr) && !!task?.projectId,
  });

  const { data: attachments } = useQuery({
    queryKey: ['task-attachments', id],
    queryFn: () => tasksApi.getAttachments(id! as any).then(r => r.data),
    enabled: tab === 'attachments' && !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => tasksApi.updateStatus(id!, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); toast.success('Status updated'); },
  });

  const addProgressMutation = useMutation({
    mutationFn: () => tasksApi.addProgress(id!, {
      notes: progressNote, progressPercentage: progressPct,
      hoursLogged: hoursLogged ? Number(hoursLogged) : undefined,
    }, photos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-progress', id] });
      qc.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Progress saved');
      setNote(''); setPct(0); setHours(''); setPhotos([]);
    },
  });

  const addDelayMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${id}/delays`, {
      delayType, delayHours: Number(delayHours), description: delayDesc
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-delays', id] });
      toast.success('Delay logged');
      setDelayType('Weather'); setDelayHours(''); setDelayDesc('');
    },
    onError: () => toast.error('Failed to log delay'),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${id}/comments`, {
      content: commentText, parentCommentId: replyTo
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', id] });
      setCommentText(''); setReplyTo(null);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/tasks/${id}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', id] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => tasksApi.uploadAttachment(id! as any, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-attachments', id] }); toast.success('File uploaded'); },
  });

  if (isLoading) return <div className="page-container"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-2/5" /><div className="card h-64" /></div></div>;
  if (!task) return <div className="page-container"><p className="text-gray-500">Task not found.</p></div>;

  const canUpdate = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager') || hasRole('Site Engineer');
  const progressList: any[] = Array.isArray(progress) ? progress : [];
  const subtaskList: any[] = Array.isArray(subtasks) ? subtasks : (subtasks?.items ?? []);
  const delayList: any[] = Array.isArray(delays) ? delays : [];
  const commentList: any[] = Array.isArray(comments) ? comments : [];
  const attachmentList: any[] = Array.isArray(attachments) ? attachments : [];
  const totalDelayHours = delayList.reduce((sum: number, d: any) => sum + (d.delayHours || 0), 0);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'progress', label: 'Progress' },
    { key: 'subtasks', label: 'Sub-Tasks' },
    { key: 'delays', label: `Delays${delayList.length > 0 ? ` (${delayList.length})` : ''}` },
    { key: 'comments', label: `Comments${commentList.length > 0 ? ` (${commentList.length})` : ''}` },
    { key: 'attachments', label: 'Files' },
  ];

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/tasks')} className="hover:text-[var(--primary)]">Tasks</button>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{task.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{task.name}</h1>
            <span className={`badge ${STATUS_COLORS[task.status] || 'badge-info'}`}>{task.status}</span>
            {task.wbsCode && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{task.wbsCode}</span>}
            {task.isMilestone && <span className="badge badge-primary">🔷 Milestone</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">{task.projectName}</p>
        </div>
        {canUpdate && (
          <select className="form-select w-40" value={task.status} onChange={e => updateStatusMutation.mutate(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Progress bar */}
      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <div className="flex items-center gap-4">
            {totalDelayHours > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {totalDelayHours}h delayed
              </span>
            )}
            <span className="text-lg font-bold text-[var(--primary)]">{task.progressPercentage ?? 0}%</span>
          </div>
        </div>
        <div className="progress-bar h-3">
          <div className="progress-fill" style={{ width: `${task.progressPercentage ?? 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details ── */}
      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-gray-800 mb-4">Task Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Priority', <span className={`font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>],
                ['Assignee', task.assigneeName || '—'],
                ['Start Date', task.startDate ? format(new Date(task.startDate), 'dd MMM yyyy') : '—'],
                ['End Date', task.endDate ? format(new Date(task.endDate), 'dd MMM yyyy') : '—'],
                ['Estimated Hrs', task.estimatedHours ? `${task.estimatedHours}h` : '—'],
                ['Actual Hrs', task.actualHours ? `${task.actualHours}h` : '—'],
                ['Parent Task', task.parentTaskName || '—'],
                ['WBS Level', task.level || 1],
              ].map(([label, value]: any) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            {task.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </div>
          <div className="card h-fit text-sm space-y-2">
            <h3 className="font-semibold text-gray-800 mb-2">Quick Info</h3>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-medium">{task.projectName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{format(new Date(task.createdAt), 'dd MMM yyyy')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Updated</span><span>{format(new Date(task.updatedAt), 'dd MMM yyyy')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Delays</span>
              <span className={totalDelayHours > 0 ? 'text-red-500 font-medium' : 'text-gray-800'}>{totalDelayHours}h</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress ── */}
      {tab === 'progress' && (
        <div className="space-y-6">
          {canUpdate && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Log Work Progress</h3>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Progress % (current: {task.progressPercentage}%)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" step="5" value={progressPct}
                      onChange={e => setPct(Number(e.target.value))} className="flex-1" />
                    <span className="text-[var(--primary)] font-bold w-10">{progressPct}%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hours Logged</label>
                  <input type="number" className="form-input w-32" min="0" step="0.5"
                    placeholder="0.0" value={hoursLogged} onChange={e => setHours(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={3} placeholder="Describe the work completed..."
                    value={progressNote} onChange={e => setNote(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Site Photos</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photos.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded border" />
                        <button className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                          onClick={() => setPhotos(arr => arr.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                    <button className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:border-[var(--primary)] transition-colors"
                      onClick={() => fileInputRef.current?.click()}>
                      <span className="text-2xl">+</span><span className="text-xs">Photo</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => setPhotos(arr => [...arr, ...(e.target.files ? Array.from(e.target.files) : [])])} />
                  </div>
                </div>
                <button className="btn-primary" onClick={() => addProgressMutation.mutate()}
                  disabled={addProgressMutation.isPending || progressPct === 0}>
                  {addProgressMutation.isPending ? 'Saving...' : 'Save Progress Update'}
                </button>
              </div>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Progress History</h3>
            {progressList.length === 0
              ? <p className="text-gray-400 text-center py-6">No progress updates yet.</p>
              : <div className="space-y-4">
                {progressList.map((p: any) => (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{p.updatedByName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--primary)] font-bold">{p.progressPercentage}%</span>
                        {p.hoursLogged && <span className="text-xs text-gray-400">{p.hoursLogged}h</span>}
                        <span className="text-xs text-gray-400">{format(new Date(p.reportedAt), 'dd MMM, HH:mm')}</span>
                      </div>
                    </div>
                    {p.notes && <p className="text-sm text-gray-600">{p.notes}</p>}
                    {p.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.photos.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="w-20 h-20 object-cover rounded border hover:opacity-80" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── Delays ── */}
      {tab === 'delays' && (
        <div className="space-y-6">
          {canUpdate && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Log Delay</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Delay Type *</label>
                  <select className="form-select" value={delayType} onChange={e => setDelayType(e.target.value)}>
                    {DELAY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Delay Hours *</label>
                  <input type="number" className="form-input" min="0.5" step="0.5"
                    value={delayHours} onChange={e => setDelayHours(e.target.value)} placeholder="e.g. 4" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" value={delayDesc} onChange={e => setDelayDesc(e.target.value)}
                    placeholder="Brief description..." />
                </div>
              </div>
              <button className="btn-primary mt-2" onClick={() => addDelayMutation.mutate()}
                disabled={addDelayMutation.isPending || !delayHours}>
                {addDelayMutation.isPending ? 'Logging...' : 'Log Delay'}
              </button>
            </div>
          )}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Delay History</h3>
              {totalDelayHours > 0 && (
                <span className="text-sm text-red-500 font-medium">Total: {totalDelayHours}h lost</span>
              )}
            </div>
            {delayList.length === 0
              ? <p className="text-gray-400 text-center py-6">No delays recorded.</p>
              : <div className="space-y-2">
                {delayList.map((d: any) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-danger text-xs">{d.delayType}</span>
                        <span className="font-medium text-sm text-red-700">{d.delayHours}h</span>
                        <span className="text-xs text-gray-400 ml-auto">{d.loggedByName} · {format(new Date(d.createdAt), 'dd MMM')}</span>
                      </div>
                      {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── Comments ── */}
      {tab === 'comments' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:"var(--primary)"}}>
                {user?.firstName?.charAt(0)}
              </div>
              <div className="flex-1">
                {replyTo && (
                  <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                    Replying to comment
                    <button onClick={() => setReplyTo(null)} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                  </div>
                )}
                <textarea className="form-input" rows={3}
                  placeholder="Write a comment... Use @name to mention someone"
                  value={commentText} onChange={e => setCommentText(e.target.value)} />
                <button className="btn-primary btn-sm mt-2 flex items-center gap-1"
                  onClick={() => addCommentMutation.mutate()} disabled={!commentText.trim() || addCommentMutation.isPending}>
                  <Send className="w-3 h-3" /> Post Comment
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {commentList.length === 0
              ? <div className="card text-center py-8"><MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" /><p className="text-gray-400">No comments yet. Start the conversation!</p></div>
              : commentList.map((c: any) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {c.userName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.userName}</span>
                        <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'dd MMM, HH:mm')}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => setReplyTo(c.id)} className="text-xs text-blue-600 hover:underline">Reply</button>
                        {c.userId === user?.id && (
                          <button onClick={() => deleteCommentMutation.mutate(c.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                      {c.replies?.length > 0 && (
                        <div className="ml-6 mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                          {c.replies.map((r: any) => (
                            <div key={r.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {r.userName?.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs">{r.userName}</span>
                                  <span className="text-xs text-gray-400">{format(new Date(r.createdAt), 'dd MMM, HH:mm')}</span>
                                </div>
                                <p className="text-xs text-gray-700 mt-0.5">{r.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Dependencies ── */}
      {tab === 'dependencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Task Dependencies</h3>
              <p className="text-xs text-gray-500 mt-0.5">Tasks this task depends on (predecessors)</p>
            </div>
            {canUpdate && (
              <button onClick={() => setShowDepMgr(true)}
                className="btn-primary text-sm flex items-center gap-1.5">
                <Link className="w-4 h-4" /> Manage Dependencies
              </button>
            )}
          </div>
          <div className="card overflow-hidden p-0">
            {depList.length === 0 ? (
              <div className="p-10 text-center">
                <Link className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">No predecessors defined</p>
                <p className="text-xs text-gray-400 mt-1">Add dependencies to control task scheduling order</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Predecessor Task</th>
                    <th>Dependency Type</th>
                    <th>Lag Days</th>
                  </tr>
                </thead>
                <tbody>
                  {depList.map((d: any) => (
                    <tr key={d.id}>
                      <td className="font-medium text-sm">{d.predecessorName}</td>
                      <td>
                        <span className="badge badge-blue text-xs">{d.dependencyType}</span>
                      </td>
                      <td className="text-sm text-gray-500">
                        {d.lagDays > 0 ? `+${d.lagDays} days` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Dependency Manager Modal */}
      {showDepMgr && task && (
        <DependencyManager
          taskId={id!}
          taskName={task.name}
          allTasks={siblingList.map((t: any) => ({ id: t.id, name: t.name, wbsCode: t.wbsCode }))}
          onClose={() => setShowDepMgr(false)}
        />
      )}

      {/* ── Subtasks ── */}
      {tab === 'subtasks' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Sub-Tasks</h3>
            {canUpdate && (
              <button className="btn-primary text-sm" onClick={() => navigate(`/tasks?projectId=${task.projectId}`)}>
                + Add Sub-Task
              </button>
            )}
          </div>
          {subtaskList.length === 0
            ? <p className="text-gray-400 text-center py-8">No sub-tasks yet.</p>
            : <div className="space-y-2">
              {subtaskList.map((st: any) => (
                <div key={st.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/tasks/${st.id}`)}>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{st.name}</p>
                    {st.wbsCode && <p className="text-xs text-gray-400 font-mono">{st.wbsCode}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="progress-bar w-16"><div className="progress-fill" style={{ width: `${st.progressPercentage}%` }} /></div>
                    <span className="text-xs text-gray-500">{st.progressPercentage}%</span>
                    <span className={`badge ${STATUS_COLORS[st.status] || 'badge-info'}`}>{st.status}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── Attachments ── */}
      {tab === 'attachments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Attachments</h3>
            {canUpdate && (
              <label className="btn-primary text-sm cursor-pointer">
                + Upload File
                <input type="file" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]); }} />
              </label>
            )}
          </div>
          {attachmentList.length === 0
            ? <p className="text-gray-400 text-center py-8">No attachments yet.</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {attachmentList.map((a: any) => (
                <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 group">
                  <div className="w-10 h-10 bg-[rgba(209,17,28,0.08)] rounded-lg flex items-center justify-center text-[var(--primary)] font-bold text-xs flex-shrink-0">
                    {a.fileName?.split('.').pop()?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[var(--primary)]">{a.fileName}</p>
                    <p className="text-xs text-gray-400">{a.uploadedByName}</p>
                  </div>
                </a>
              ))}
            </div>
          }
        </div>
      )}
    </div>
  );
}
