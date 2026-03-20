import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  FileText, Plus, CheckCircle, XCircle, RefreshCw,
  Download, Eye, ChevronRight, Calendar, CloudRain, Sun
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  Draft:     'badge-gray',
  Submitted: 'badge-blue',
  Approved:  'badge-green',
  Rejected:  'badge-red',
};

export default function DprPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [selectedProject, setProject] = useState('');
  const [selectedDpr, setSelectedDpr] = useState<any>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [viewMode, setViewMode]       = useState<'list' | 'detail'>('list');
  const [form, setForm] = useState({
    locationOfWork: '', weatherCondition: '', weatherType: 'Normal',
    workCompleted: '', plannedForTomorrow: '', issues: '', safetyObservations: '',
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects', { params: { pageSize: 100 } }).then(r => r.data.items),
  });

  const { data: dprs, isLoading } = useQuery({
    queryKey: ['dprs', selectedProject],
    queryFn: () => api.get('/dpr', {
      params: { projectId: selectedProject || undefined, pageSize: 30 }
    }).then(r => r.data),
  });

  const { data: dprDetail } = useQuery({
    queryKey: ['dpr-detail', selectedDpr?.id],
    queryFn: () => api.get(`/dpr/${selectedDpr.id}`).then(r => r.data),
    enabled: !!selectedDpr?.id && viewMode === 'detail',
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/dpr', {
      projectId: selectedProject,
      ...form,
    }),
    onSuccess: () => {
      toast.success('DPR created');
      qc.invalidateQueries({ queryKey: ['dprs'] });
      setShowCreate(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create DPR'),
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/dpr/${id}/generate`),
    onSuccess: (_, id) => {
      toast.success('DPR generated and submitted');
      qc.invalidateQueries({ queryKey: ['dprs'] });
      qc.invalidateQueries({ queryKey: ['dpr-detail', id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      api.patch(`/dpr/${id}/approve`, { approve, reason }),
    onSuccess: () => {
      toast.success('DPR updated');
      qc.invalidateQueries({ queryKey: ['dprs'] });
      if (selectedDpr) qc.invalidateQueries({ queryKey: ['dpr-detail', selectedDpr.id] });
    },
  });

  const resetForm = () => setForm({
    locationOfWork: '', weatherCondition: '', weatherType: 'Normal',
    workCompleted: '', plannedForTomorrow: '', issues: '', safetyObservations: '',
  });

  const handleExport = (id: string) => {
    window.open(`http://localhost:5000/api/dpr/${id}/export`, '_blank');
  };

  const canManage  = hasRole('Admin') || hasRole('Project Manager');
  const canApprove = hasRole('Admin') || hasRole('Project Head') || hasRole('Management');
  const dprList: any[] = dprs?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Daily Progress Reports</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Auto-generated at 11:00 AM daily · Review, complete and approve
          </p>
        </div>
        {canManage && !showCreate && viewMode === 'list' && (
          <div className="flex gap-2">
            <button onClick={() => qc.invalidateQueries({ queryKey: ['dprs'] })}
              className="btn-ghost text-sm flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Create DPR
            </button>
          </div>
        )}
        {viewMode === 'detail' && (
          <button onClick={() => { setViewMode('list'); setSelectedDpr(null); }}
            className="btn-ghost text-sm">← Back to list</button>
        )}
      </div>

      {/* Project filter */}
      <select className="select max-w-xs" value={selectedProject}
        onChange={e => { setProject(e.target.value); setViewMode('list'); setSelectedDpr(null); }}>
        <option value="">All Projects</option>
        {(projects ?? []).map((p: any) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Create DPR Form */}
      {showCreate && (
        <div className="card">
          <div className="card-header">
            <span className="font-medium">Create Daily Progress Report</span>
            <button onClick={() => { setShowCreate(false); resetForm(); }}
              className="btn-ghost text-sm">Cancel</button>
          </div>
          <div className="p-5 space-y-4">
            {!selectedProject && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                ⚠️ Please select a project first
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Location of Work</label>
                <input className="form-input" placeholder="e.g., Block A – Foundation"
                  value={form.locationOfWork} onChange={e => setForm(f => ({ ...f, locationOfWork: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Weather Condition</label>
                <input className="form-input" placeholder="e.g., Partly cloudy, 28°C"
                  value={form.weatherCondition} onChange={e => setForm(f => ({ ...f, weatherCondition: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Weather Type</label>
                <div className="flex gap-2 mt-1">
                  {['Normal', 'Rainy'].map(w => (
                    <button key={w} type="button"
                      onClick={() => setForm(f => ({ ...f, weatherType: w }))}
                      className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors',
                        form.weatherType === w
                          ? 'bg-yellow-400 border-yellow-500 text-gray-900 font-medium'
                          : 'border-gray-200 hover:bg-gray-50')}>
                      {w === 'Normal' ? <Sun className="w-4 h-4" /> : <CloudRain className="w-4 h-4" />}
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Work Completed Today</label>
              <textarea className="form-input" rows={3}
                placeholder="Describe the work activities completed today..."
                value={form.workCompleted} onChange={e => setForm(f => ({ ...f, workCompleted: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Planned for Tomorrow</label>
              <textarea className="form-input" rows={2}
                placeholder="What is planned for the next working day..."
                value={form.plannedForTomorrow} onChange={e => setForm(f => ({ ...f, plannedForTomorrow: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Issues / Concerns</label>
                <textarea className="form-input" rows={2}
                  placeholder="Any issues blocking progress..."
                  value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Safety Observations</label>
                <textarea className="form-input" rows={2}
                  placeholder="Safety incidents, near-misses, observations..."
                  value={form.safetyObservations} onChange={e => setForm(f => ({ ...f, safetyObservations: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="btn-ghost">Cancel</button>
              <button onClick={() => createMutation.mutate()}
                disabled={!selectedProject || createMutation.isPending}
                className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create DPR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DPR List */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden p-0">
          <div className="card-header">
            <span className="font-medium text-sm">DPR History</span>
            <span className="text-xs text-gray-400">{dprList.length} reports</span>
          </div>
          {isLoading ? (
            <div className="p-10 text-center"><RefreshCw className="w-6 h-6 mx-auto animate-spin text-gray-300" /></div>
          ) : dprList.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No DPRs yet</p>
              <p className="text-xs text-gray-400 mt-1">DPRs are auto-generated at 11:00 AM daily for active projects</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Weather</th>
                  <th className="text-center">Labour</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dprList.map((dpr: any) => (
                  <tr key={dpr.id} className="hover:bg-gray-50">
                    <td className="font-medium text-sm">
                      {format(new Date(dpr.reportDate), 'dd MMM yyyy')}
                    </td>
                    <td className="text-sm">{dpr.projectName}</td>
                    <td className="text-sm text-gray-600 max-w-xs truncate">
                      {dpr.locationOfWork || '—'}
                    </td>
                    <td className="text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        {dpr.weatherType === 'Rainy'
                          ? <CloudRain className="w-3 h-3 text-blue-400" />
                          : <Sun className="w-3 h-3 text-yellow-400" />}
                        {dpr.weatherCondition || dpr.weatherType || '—'}
                      </span>
                    </td>
                    <td className="text-center font-medium">{dpr.labourCount ?? '—'}</td>
                    <td>
                      <span className={`badge text-xs ${STATUS_COLORS[dpr.status] ?? 'badge-gray'}`}>
                        {dpr.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">
                      {dpr.isAutoGenerated ? '🤖 Auto' : '✍️ Manual'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedDpr(dpr); setViewMode('detail'); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="View details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {dpr.status === 'Draft' && canManage && (
                          <button
                            onClick={() => generateMutation.mutate(dpr.id)}
                            disabled={generateMutation.isPending}
                            className="p-1.5 rounded hover:bg-yellow-100 text-gray-500 hover:text-yellow-600"
                            title="Generate & Submit DPR">
                            <RefreshCw className={clsx('w-3.5 h-3.5', generateMutation.isPending && 'animate-spin')} />
                          </button>
                        )}
                        {(dpr.status === 'Submitted' || dpr.status === 'Approved') && (
                          <button
                            onClick={() => handleExport(dpr.id)}
                            className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600"
                            title="Export as HTML/PDF">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {dpr.status === 'Submitted' && canApprove && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate({ id: dpr.id, approve: true })}
                              className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600"
                              title="Approve">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason:') ?? '';
                                approveMutation.mutate({ id: dpr.id, approve: false, reason });
                              }}
                              className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                              title="Reject">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DPR Detail View */}
      {viewMode === 'detail' && selectedDpr && (
        <div className="space-y-5">
          {/* Header card */}
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-semibold text-lg">
                    DPR — {format(new Date(selectedDpr.reportDate), 'dd MMMM yyyy')}
                  </h2>
                  <span className={`badge ${STATUS_COLORS[selectedDpr.status] ?? 'badge-gray'}`}>
                    {selectedDpr.status}
                  </span>
                  {selectedDpr.isAutoGenerated && (
                    <span className="badge badge-blue text-xs">🤖 Auto-Generated</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedDpr.projectName}</p>
              </div>
              <div className="flex gap-2">
                {selectedDpr.status === 'Draft' && canManage && (
                  <button onClick={() => generateMutation.mutate(selectedDpr.id)}
                    disabled={generateMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5">
                    <RefreshCw className={clsx('w-4 h-4', generateMutation.isPending && 'animate-spin')} />
                    Generate & Submit
                  </button>
                )}
                {(selectedDpr.status === 'Submitted' || selectedDpr.status === 'Approved') && (
                  <button onClick={() => handleExport(selectedDpr.id)}
                    className="btn-ghost text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> Export HTML
                  </button>
                )}
                {selectedDpr.status === 'Submitted' && canApprove && (
                  <>
                    <button onClick={() => approveMutation.mutate({ id: selectedDpr.id, approve: true })}
                      className="btn-primary text-sm flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Approve DPR
                    </button>
                    <button onClick={() => {
                      const reason = prompt('Rejection reason:') ?? '';
                      approveMutation.mutate({ id: selectedDpr.id, approve: false, reason });
                    }} className="btn-ghost text-sm text-red-500 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Site Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t text-sm">
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="font-medium">{selectedDpr.locationOfWork || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Weather</p>
                <p className="font-medium flex items-center gap-1">
                  {selectedDpr.weatherType === 'Rainy'
                    ? <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                    : <Sun className="w-3.5 h-3.5 text-yellow-400" />}
                  {selectedDpr.weatherCondition || selectedDpr.weatherType || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Labour Count</p>
                <p className="font-medium text-blue-600">{selectedDpr.labourCount ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Submitted By</p>
                <p className="font-medium">{selectedDpr.submittedByName || '—'}</p>
              </div>
            </div>
          </div>

          {/* Compiled sections from dprDetail */}
          {dprDetail && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Work Progress */}
              <SectionCard title="🏗️ Work Progress" items={dprDetail.workProgressSection}
                headers={['Task', 'Progress', 'Status', 'Remarks']}
                renderRow={(r: any) => [r.taskName, `${r.progressPercent?.toFixed(0)}%`, r.status, r.remarks || '—']}
              />

              {/* Labour */}
              <SectionCard title="👷 Labour Deployment" items={dprDetail.labourSection}
                headers={['Trade', 'Planned', 'Actual', 'Variance']}
                renderRow={(r: any) => [
                  r.tradeName,
                  r.planned,
                  <span className="text-blue-600 font-medium">{r.actual}</span>,
                  <span className={r.variance >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {r.variance >= 0 ? '+' : ''}{r.variance}
                  </span>
                ]}
              />

              {/* Delays */}
              <SectionCard title="⚠️ Delays" items={dprDetail.delaySection}
                headers={['Task', 'Type', 'Hours', 'Description']}
                renderRow={(r: any) => [
                  r.taskName,
                  <span className="badge badge-red text-xs">{r.delayType}</span>,
                  `${r.hours}h`,
                  r.description || '—'
                ]}
              />

              {/* Risks */}
              <SectionCard title="🛡️ Active High/Critical Risks" items={dprDetail.riskSection}
                headers={['Risk #', 'Title', 'Severity', 'Owner']}
                renderRow={(r: any) => [
                  r.riskNumber,
                  r.title,
                  <span className={`badge text-xs ${r.severity === 'Critical' ? 'badge-red' : 'badge-orange'}`}>{r.severity}</span>,
                  r.owner || '—'
                ]}
              />
            </div>
          )}

          {/* Free-text sections */}
          {[
            { label: '✅ Work Completed', value: selectedDpr.workCompleted },
            { label: '📋 Planned for Tomorrow', value: selectedDpr.plannedForTomorrow },
            { label: '🚨 Issues & Concerns', value: selectedDpr.issues },
            { label: '🦺 Safety Observations', value: selectedDpr.safetyObservations },
          ].filter(s => s.value).map(s => (
            <div key={s.label} className="card p-4">
              <p className="font-medium text-sm text-gray-700 mb-2">{s.label}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────
function SectionCard({ title, items, headers, renderRow }: {
  title: string;
  items: any[] | null | undefined;
  headers: string[];
  renderRow: (item: any) => any[];
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="font-medium text-sm">{title}</span>
        {items && <span className="ml-2 text-xs text-gray-400">({items.length})</span>}
      </div>
      {!items || items.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">No data recorded</div>
      ) : (
        <table className="table">
          <thead>
            <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                {renderRow(item).map((cell, j) => (
                  <td key={j} className="text-sm">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
