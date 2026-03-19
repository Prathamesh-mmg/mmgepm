import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['NotStarted','InProgress','Completed','OnHold','Cancelled'];
const STATUS_COLORS: Record<string, string> = {
  NotStarted: 'badge-info', InProgress: 'badge-warning',
  Completed: 'badge-success', OnHold: 'badge-danger', Cancelled: 'badge-danger',
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-green-600', Medium: 'text-yellow-600', High: 'text-orange-600', Critical: 'text-red-600',
};

type Tab = 'details' | 'progress' | 'subtasks' | 'attachments';

export default function TaskDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const { hasRole } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]               = useState<Tab>('details');
  const [progressNote, setNote]     = useState('');
  const [progressPct, setPct]       = useState(0);
  const [hoursLogged, setHours]     = useState('');
  const [photos, setPhotos]         = useState<File[]>([]);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn:  () => tasksApi.getById(id!).then(r => r.data),
    enabled:  !!id,
  });

  const { data: progress } = useQuery({
    queryKey: ['task-progress', id],
    queryFn:  () => tasksApi.getProgress(id!).then(r => r.data),
    enabled:  tab === 'progress' && !!id,
  });

  const { data: subtasks } = useQuery({
    queryKey: ['task-subtasks', id],
    queryFn:  () => tasksApi.getSubtasks(id! as any).then(r => r.data),
    enabled:  tab === 'subtasks' && !!id,
  });

  const { data: attachments } = useQuery({
    queryKey: ['task-attachments', id],
    queryFn:  () => tasksApi.getAttachments(id! as any).then(r => r.data),
    enabled:  tab === 'attachments' && !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => tasksApi.updateStatus(id!, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task', id] }); toast.success('Status updated'); },
  });

  const addProgressMutation = useMutation({
    mutationFn: () => tasksApi.addProgress(id!, {
      notes: progressNote,
      progressPercentage: progressPct,
      hoursLogged: hoursLogged ? Number(hoursLogged) : undefined,
    }, photos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-progress', id] });
      qc.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Progress saved');
      setNote(''); setPct(0); setHours(''); setPhotos([]);
    },
    onError: () => toast.error('Failed to save progress'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => tasksApi.uploadAttachment(id! as any, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-attachments', id] }); toast.success('File uploaded'); },
  });

  if (isLoading) return (
    <div className="page-container">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-2/5" />
        <div className="card h-64" />
      </div>
    </div>
  );
  if (!task) return <div className="page-container"><p className="text-gray-500">Task not found.</p></div>;

  const canUpdate = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager') || hasRole('Site Engineer');
  const progressList: any[]   = Array.isArray(progress) ? progress : [];
  const subtaskList: any[]    = Array.isArray(subtasks) ? subtasks : [];
  const attachmentList: any[] = Array.isArray(attachments) ? attachments : [];

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/tasks')} className="hover:text-yellow-600">Tasks</button>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{task.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{task.name}</h1>
            <span className={`badge ${STATUS_COLORS[task.status] || 'badge-info'}`}>{task.status}</span>
            {task.wbsCode && (
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{task.wbsCode}</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{task.projectName}</p>
        </div>
        {canUpdate && (
          <select className="form-select w-40" value={task.status}
            onChange={e => updateStatusMutation.mutate(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Progress bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Task Progress</span>
          <span className="text-lg font-bold text-yellow-600">{task.progressPercentage ?? 0}%</span>
        </div>
        <div className="progress-bar h-3">
          <div className="progress-fill" style={{ width: `${task.progressPercentage ?? 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {(['details','progress','subtasks','attachments'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
                ['Priority',       <span className={`font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>],
                ['Assignee',       task.assigneeName || '—'],
                ['Start Date',     task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'],
                ['End Date',       task.endDate   ? new Date(task.endDate).toLocaleDateString()   : '—'],
                ['Estimated Hrs',  task.estimatedHours ? `${task.estimatedHours}h` : '—'],
                ['Actual Hrs',     task.actualHours    ? `${task.actualHours}h`    : '—'],
                ['Parent Task',    task.parentTaskName || '—'],
                ['WBS Level',      task.level || 1],
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
            <h3 className="font-semibold text-gray-800 mb-2">Info</h3>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-medium text-right max-w-[150px] truncate">{task.projectName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Updated</span><span>{new Date(task.updatedAt).toLocaleDateString()}</span></div>
            {task.isMilestone && <div className="mt-2"><span className="badge badge-primary">Milestone</span></div>}
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
                    <span className="text-yellow-600 font-bold w-10">{progressPct}%</span>
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
                    <button
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:border-yellow-400 hover:text-yellow-500 transition-colors"
                      onClick={() => fileInputRef.current?.click()}>
                      <span className="text-2xl">+</span>
                      <span className="text-xs">Photo</span>
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
            {progressList.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No progress updates yet.</p>
            ) : (
              <div className="space-y-4">
                {progressList.map((p: any) => (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{p.updatedByName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-600 font-bold">{p.progressPercentage}%</span>
                        {p.hoursLogged && <span className="text-xs text-gray-400">{p.hoursLogged}h</span>}
                        <span className="text-xs text-gray-400">{new Date(p.reportedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {p.notes && <p className="text-sm text-gray-600 mb-3">{p.notes}</p>}
                    {p.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {p.photos.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="w-20 h-20 object-cover rounded border hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
          {subtaskList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No sub-tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {subtaskList.map((st: any) => (
                <div key={st.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
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
          )}
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
          {attachmentList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No attachments yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {attachmentList.map((a: any) => (
                <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 group">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-xs shrink-0">
                    {a.fileName?.split('.').pop()?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-yellow-700">{a.fileName}</p>
                    <p className="text-xs text-gray-400">{a.uploadedByName} · {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
