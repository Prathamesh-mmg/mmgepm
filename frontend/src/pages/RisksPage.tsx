import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi, projectsApi, api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ShieldAlert, AlertTriangle, BarChart2, Clock, X } from 'lucide-react';
import clsx from 'clsx';

const RISK_STATUSES = ['Draft','DeptReview','Analysis','MitigationPlanning','MitigationInProgress','Closed','Accepted','Void'];
const PROBABILITY_OPTS = ['Low','Medium','High','VeryHigh'];
const IMPACT_OPTS = ['Low','Medium','High','VeryHigh'];
const CATEGORY_OPTS = ['Technical','Commercial','Environmental','Safety','Schedule','Resource','External'];
const STRATEGY_OPTS = ['Avoid','Mitigate','Transfer','Accept'];

const STATUS_COLORS: Record<string,string> = {
  Draft:'badge-gray', DeptReview:'badge-yellow', Analysis:'badge-blue',
  MitigationPlanning:'badge-blue', MitigationInProgress:'badge-orange',
  Closed:'badge-green', Accepted:'badge-green', Void:'badge-red',
};
const LEVEL_COLORS: Record<string,string> = {
  Low:'text-green-600 bg-green-50', Medium:'text-yellow-700 bg-yellow-50',
  High:'text-orange-600 bg-orange-50', Critical:'text-red-600 bg-red-50',
};
const CHART_COLORS = ['#22C55E','#F59E0B','#F97316','#EF4444','#9CA3AF','#3B82F6','#8B5CF6'];

// Lifecycle stepper stages
const STAGES = ['Draft','DeptReview','Analysis','MitigationPlanning','MitigationInProgress','Closed'];
const STAGE_LABELS: Record<string,string> = {
  Draft:'Raised', DeptReview:'Dept Review', Analysis:'Analysis',
  MitigationPlanning:'Mitigation Plan', MitigationInProgress:'In Mitigation',
  Closed:'Closed',
};
const NEXT_STATUS: Record<string,string> = {
  Draft:'DeptReview', DeptReview:'Analysis', Analysis:'MitigationPlanning',
  MitigationPlanning:'MitigationInProgress', MitigationInProgress:'Closed',
};

type Tab = 'register' | 'reports';

interface RiskForm {
  projectId:string; title:string; description:string; category:string;
  riskType:string; probability:string; impact:string; mitigationPlan:string;
  mitigationStrategy:string; contingencyPlan:string; contingencyBudget:string;
  riskOwnerId:string; reviewDate:string;
}
const emptyForm: RiskForm = {
  projectId:'', title:'', description:'', category:'Technical',
  riskType:'Threat', probability:'Medium', impact:'Medium',
  mitigationPlan:'', mitigationStrategy:'Mitigate',
  contingencyPlan:'', contingencyBudget:'', riskOwnerId:'', reviewDate:'',
};

export default function RisksPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [tab, setTab]               = useState<Tab>('register');
  const [projectId, setProjectId]   = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState<RiskForm>(emptyForm);
  const [selectedRisk, setSelected] = useState<any>(null);
  const [updateNote, setNote]       = useState('');
  const [newStatus, setNewStatus]   = useState('');
  const [showVoidModal, setVoidModal] = useState(false);
  const [voidRemarks, setVoidRemarks] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getAll({ pageSize:100 }).then(r => r.data.items),
  });

  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', projectId, statusFilter],
    queryFn: () => risksApi.getAll({
      projectId: projectId || undefined,
      status:    statusFilter || undefined,
    }).then(r => r.data),
    enabled: tab === 'register',
  });

  const { data: lifecycle } = useQuery({
    queryKey: ['risk-lifecycle', selectedRisk?.id],
    queryFn: () => api.get(`/risks/${selectedRisk.id}/lifecycle`).then(r => r.data),
    enabled: !!selectedRisk?.id,
  });

  const { data: updates } = useQuery({
    queryKey: ['risk-updates', selectedRisk?.id],
    queryFn: () => risksApi.getUpdates(selectedRisk.id).then(r => r.data),
    enabled: !!selectedRisk?.id,
  });

  const { data: reports } = useQuery({
    queryKey: ['risk-reports', projectId],
    queryFn: () => api.get('/risks/reports', { params: projectId ? { projectId } : {} }).then(r => r.data),
    enabled: tab === 'reports',
  });

  const createMutation = useMutation({
    mutationFn: () => risksApi.create({ ...form,
      contingencyBudget: form.contingencyBudget ? Number(form.contingencyBudget) : undefined,
      riskOwnerId: form.riskOwnerId || undefined,
      reviewDate: form.reviewDate || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['risks'] }); toast.success('Risk registered'); setShowModal(false); setForm(emptyForm); },
    onError: () => toast.error('Failed to create risk'),
  });

  const advanceMutation = useMutation({
    mutationFn: () => api.post(`/risks/${selectedRisk.id}/lifecycle/advance`,
      { status: newStatus || NEXT_STATUS[selectedRisk.status] || selectedRisk.status, notes: updateNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['risks'] });
      qc.invalidateQueries({ queryKey:['risk-lifecycle', selectedRisk?.id] });
      qc.invalidateQueries({ queryKey:['risk-updates', selectedRisk?.id] });
      toast.success('Risk advanced'); setNote(''); setNewStatus('');
      // Refresh selected risk
      const updated = risksData?.items?.find((r:any) => r.id === selectedRisk.id);
      if (updated) setSelected(updated);
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => api.post(`/risks/${selectedRisk.id}/lifecycle/void`, { remarks: voidRemarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['risks'] });
      qc.invalidateQueries({ queryKey:['risk-lifecycle', selectedRisk?.id] });
      toast.success('Risk marked as Void');
      setVoidModal(false); setVoidRemarks('');
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed to void risk'),
  });

  const canManage = hasRole('Admin') || hasRole('Project Manager') || hasRole('Planning Engineer') || hasRole('Site Engineer');
  const risks: any[] = risksData?.items ?? risksData ?? [];
  const totalOpen = risks.filter(r => r.status !== 'Closed' && r.status !== 'Void').length;

  return (
    <div className="page-container max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-sm text-gray-500 mt-1">Identify, assess, mitigate and track project risks</p>
        </div>
        {canManage && tab === 'register' && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Register Risk</button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs mb-5">
        <button className={`tab ${tab==='register'?'tab-active':''}`} onClick={() => setTab('register')}>
          <ShieldAlert className="w-4 h-4 inline mr-1.5" /> Risk Register
        </button>
        <button className={`tab ${tab==='reports'?'tab-active':''}`} onClick={() => setTab('reports')}>
          <BarChart2 className="w-4 h-4 inline mr-1.5" /> Reports & Charts
        </button>
      </div>

      {/* Project filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="form-select w-56" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All Projects</option>
          {(projects||[]).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {tab === 'register' && (
          <select className="form-select w-44" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {RISK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* ── Risk Register ── */}
      {tab === 'register' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label:'Open Risks',   value:risks.filter(r=>r.status!=='Closed'&&r.status!=='Void').length, color:'text-blue-600' },
              { label:'Critical',     value:risks.filter(r=>r.riskLevel==='Critical'&&r.status!=='Closed'&&r.status!=='Void').length, color:'text-red-600' },
              { label:'In Mitigation',value:risks.filter(r=>r.status?.includes('Mitigation')).length, color:'text-purple-600' },
              { label:'Closed/Void',  value:risks.filter(r=>r.status==='Closed'||r.status==='Void').length, color:'text-green-600' },
            ].map(s => (
              <div key={s.label} className="card text-center py-4">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Risk table */}
          <div className="card overflow-hidden p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : risks.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">🛡️</p>
                <p className="text-gray-500">No risks found</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Risk #</th><th>Title</th><th>Category</th>
                    <th>Level</th><th>Status</th><th>Owner</th><th>Project</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r:any) => (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                      <td className="font-mono text-xs font-medium text-gray-600">{r.riskNumber}</td>
                      <td className={clsx('font-medium text-gray-800 max-w-xs truncate', r.status==='Void'&&'line-through text-gray-400')}>{r.title}</td>
                      <td className="text-sm text-gray-500">{r.category||'—'}</td>
                      <td>
                        {r.riskLevel && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[r.riskLevel]||''}`}>
                            {r.riskLevel} ({r.riskScore})
                          </span>
                        )}
                      </td>
                      <td><span className={`badge ${STATUS_COLORS[r.status]||'badge-gray'}`}>{r.status}</span></td>
                      <td className="text-sm text-gray-500">{r.riskOwnerName||'—'}</td>
                      <td className="text-xs text-gray-400 max-w-[120px] truncate">{r.projectName}</td>
                      <td className="text-yellow-600 text-sm">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && reports && (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Open',   value:reports.totalOpen,   color:'text-blue-600'  },
              { label:'Critical',     value:reports.critical,    color:'text-red-600'   },
              { label:'High',         value:reports.high,        color:'text-orange-600'},
              { label:'Closed',       value:reports.totalClosed, color:'text-green-600' },
            ].map(k => (
              <div key={k.label} className="card text-center py-4">
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-sm text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Severity pie (RM2-EXT-3) */}
            <div className="card">
              <div className="card-header"><span className="font-medium text-sm">Severity-wise Risks</span></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={reports.bySeverity.filter((d:any)=>d.value>0)}
                      dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
                      {reports.bySeverity.map((_:any, i:number) => (
                        <Cell key={i} fill={['#22C55E','#F59E0B','#F97316','#EF4444'][i]||'#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip /><Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status donut (RM2-EXT-3) */}
            <div className="card">
              <div className="card-header"><span className="font-medium text-sm">Risk Status Overview</span></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={reports.byStatus.filter((d:any)=>d.value>0)}
                      dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
                      {reports.byStatus.map((_:any, i:number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip /><Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Owner bar chart (RM2-EXT-3) */}
            <div className="card">
              <div className="card-header"><span className="font-medium text-sm">Risk Owner Distribution</span></div>
              <div className="p-4">
                {reports.byOwner.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No owner data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={reports.byOwner} layout="vertical" barSize={14}>
                      <XAxis type="number" tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize:10 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" name="Risks" radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Risk Detail Panel ── */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-gray-500">{selectedRisk.riskNumber}</span>
                  <span className={`badge ${STATUS_COLORS[selectedRisk.status]||'badge-gray'}`}>{selectedRisk.status}</span>
                  {selectedRisk.riskLevel && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[selectedRisk.riskLevel]||''}`}>
                      {selectedRisk.riskLevel}
                    </span>
                  )}
                  {selectedRisk.status === 'Void' && (
                    <span className="badge badge-red text-xs">⚠️ VOID</span>
                  )}
                </div>
                <h2 className={clsx('text-lg font-semibold mt-1', selectedRisk.status==='Void'&&'line-through text-gray-400')}>
                  {selectedRisk.title}
                </h2>
                <p className="text-sm text-gray-500">{selectedRisk.projectName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Lifecycle stepper */}
              {selectedRisk.status !== 'Void' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lifecycle</p>
                  <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
                    {STAGES.map((stage, i) => {
                      const idx = STAGES.indexOf(selectedRisk.status);
                      const isDone = i < idx || selectedRisk.status === 'Closed';
                      const isCurrent = stage === selectedRisk.status;
                      return (
                        <div key={stage} className="flex items-center">
                          <div className={clsx(
                            'flex-shrink-0 text-center',
                            'w-20 md:w-24'
                          )}>
                            <div className={clsx(
                              'w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-1',
                              isDone  ? 'bg-green-500 text-white' :
                              isCurrent ? 'bg-yellow-400 text-gray-900 ring-2 ring-yellow-200' :
                              'bg-gray-200 text-gray-400'
                            )}>
                              {isDone ? '✓' : i+1}
                            </div>
                            <p className={clsx('text-[10px] leading-tight text-center',
                              isCurrent ? 'text-yellow-700 font-semibold' :
                              isDone    ? 'text-green-600' : 'text-gray-400')}>
                              {STAGE_LABELS[stage]}
                            </p>
                          </div>
                          {i < STAGES.length - 1 && (
                            <div className={clsx('h-0.5 w-3 flex-shrink-0',
                              i < idx ? 'bg-green-400' : 'bg-gray-200')} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lifecycle timestamps (RM2-EXT-2) */}
              {lifecycle && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Timeline
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label:'Raised On',           value:lifecycle.raisedOn },
                      { label:'Acknowledged On',     value:lifecycle.acknowledgedOn },
                      { label:'Analysis Completed',  value:lifecycle.analysisCompletedOn },
                      { label:'Closed On',           value:lifecycle.closedOnTimestamp },
                      { label:'Rejected/Void On',    value:lifecycle.rejectedOn },
                    ].map(t => t.value && (
                      <div key={t.label}>
                        <span className="text-gray-400">{t.label}: </span>
                        <span className="font-medium text-gray-700">{format(new Date(t.value), 'dd MMM yyyy HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                  {selectedRisk.status === 'Void' && lifecycle.voidRemarks && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                      <strong>Void Reason:</strong> {lifecycle.voidRemarks}
                    </div>
                  )}
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Category', selectedRisk.category],
                  ['Type', selectedRisk.riskType],
                  ['Probability', selectedRisk.probability],
                  ['Impact', selectedRisk.impact],
                  ['Risk Score', selectedRisk.riskScore],
                  ['Owner', selectedRisk.riskOwnerName||'—'],
                  ['Raised By', selectedRisk.raisedByName],
                  ['Review Date', selectedRisk.reviewDate ? format(new Date(selectedRisk.reviewDate),'dd MMM yyyy') : '—'],
                ].map(([k,v]) => (
                  <div key={String(k)}>
                    <dt className="text-gray-400 text-xs">{k}</dt>
                    <dd className="font-medium text-gray-800">{v||'—'}</dd>
                  </div>
                ))}
              </div>

              {selectedRisk.description && (
                <div><p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-600">{selectedRisk.description}</p></div>
              )}
              {selectedRisk.mitigationPlan && (
                <div><p className="text-xs font-semibold text-gray-500 mb-1">Mitigation Plan ({selectedRisk.mitigationStrategy})</p>
                <p className="text-sm text-gray-600">{selectedRisk.mitigationPlan}</p></div>
              )}

              {/* Advance status */}
              {canManage && selectedRisk.status !== 'Closed' && selectedRisk.status !== 'Void' && (
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Update Risk</p>
                  <div className="space-y-3">
                    <select className="form-select w-full text-sm" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      <option value="">
                        → Advance to: {STAGE_LABELS[NEXT_STATUS[selectedRisk.status]] || 'Next Stage'}
                      </option>
                      {RISK_STATUSES.filter(s => s !== selectedRisk.status && s !== 'Void').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <textarea className="form-input text-sm" rows={3}
                      placeholder="Update notes..." value={updateNote}
                      onChange={e => setNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm flex-1"
                        onClick={() => advanceMutation.mutate()}
                        disabled={advanceMutation.isPending || (!updateNote && !newStatus)}>
                        {advanceMutation.isPending ? 'Saving...' : `→ ${STAGE_LABELS[newStatus || NEXT_STATUS[selectedRisk.status]] || 'Save Update'}`}
                      </button>
                      <button className="btn-ghost text-sm text-red-500 border border-red-200 hover:bg-red-50"
                        onClick={() => setVoidModal(true)}>
                        Void Risk
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Update history */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Update History</p>
                {!updates?.length ? (
                  <p className="text-sm text-gray-400">No updates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(updates as any[]).map((u:any) => (
                      <div key={u.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span className="font-medium text-gray-600">{u.updatedByName}</span>
                          <span>{format(new Date(u.createdAt), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                        {u.newStatus && (
                          <p className="text-xs text-blue-600 mb-1">
                            Status → <strong>{u.newStatus}</strong>
                          </p>
                        )}
                        {u.notes && <p className="text-sm text-gray-600">{u.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal (RM2-EXT-1) */}
      {showVoidModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Mark Risk as Void</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will remove the risk from all active dashboards and DPR sections.
              Only Admin can reinstate a voided risk.
            </p>
            <textarea className="form-input w-full mb-4" rows={3}
              placeholder="Reason for voiding this risk (required)..."
              value={voidRemarks} onChange={e => setVoidRemarks(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setVoidModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => voidMutation.mutate()}
                disabled={!voidRemarks.trim() || voidMutation.isPending}
                className="btn-danger">
                {voidMutation.isPending ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Risk Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Register New Risk</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" required value={form.title}
                    onChange={e => setForm(f => ({...f, title: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select className="form-select" required value={form.projectId}
                    onChange={e => setForm(f => ({...f, projectId: e.target.value}))}>
                    <option value="">Select...</option>
                    {(projects||[]).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category}
                    onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                    {CATEGORY_OPTS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Type</label>
                  <select className="form-select" value={form.riskType}
                    onChange={e => setForm(f => ({...f, riskType: e.target.value}))}>
                    <option>Threat</option><option>Opportunity</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Probability</label>
                  <select className="form-select" value={form.probability}
                    onChange={e => setForm(f => ({...f, probability: e.target.value}))}>
                    {PROBABILITY_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Impact</label>
                  <select className="form-select" value={form.impact}
                    onChange={e => setForm(f => ({...f, impact: e.target.value}))}>
                    {IMPACT_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mitigation Strategy</label>
                  <select className="form-select" value={form.mitigationStrategy}
                    onChange={e => setForm(f => ({...f, mitigationStrategy: e.target.value}))}>
                    {STRATEGY_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={form.description}
                    onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Mitigation Plan</label>
                  <textarea className="form-input" rows={2} value={form.mitigationPlan}
                    onChange={e => setForm(f => ({...f, mitigationPlan: e.target.value}))} />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Contingency Plan</label>
                  <textarea className="form-input" rows={2} value={form.contingencyPlan}
                    onChange={e => setForm(f => ({...f, contingencyPlan: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contingency Budget (USD)</label>
                  <input type="number" className="form-input" min="0" value={form.contingencyBudget}
                    onChange={e => setForm(f => ({...f, contingencyBudget: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Review Date</label>
                  <input type="date" className="form-input" value={form.reviewDate}
                    onChange={e => setForm(f => ({...f, reviewDate: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registering...' : 'Register Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
