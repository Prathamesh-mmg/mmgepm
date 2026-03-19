import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi, projectsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const PROBABILITY_OPTS = ['Low', 'Medium', 'High', 'VeryHigh'];
const IMPACT_OPTS      = ['Low', 'Medium', 'High', 'VeryHigh'];
const CATEGORY_OPTS    = ['Technical', 'Commercial', 'Environmental', 'Safety', 'Schedule', 'Resource', 'External'];
const STRATEGY_OPTS    = ['Avoid', 'Mitigate', 'Transfer', 'Accept'];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'badge-info', DeptReview: 'badge-warning', Analysis: 'badge-warning',
  MitigationPlanning: 'badge-primary', MitigationInProgress: 'badge-primary',
  Closed: 'badge-success', Accepted: 'badge-info',
};

const LEVEL_COLORS: Record<string, string> = {
  Low: 'text-green-600 bg-green-50', Medium: 'text-yellow-700 bg-yellow-50',
  High: 'text-orange-600 bg-orange-50', Critical: 'text-red-600 bg-red-50',
};

interface RiskForm {
  projectId: string; title: string; description: string;
  category: string; riskType: string; probability: string;
  impact: string; mitigationPlan: string; mitigationStrategy: string;
  contingencyPlan: string; contingencyBudget: string;
  riskOwnerId: string; reviewDate: string;
}

const emptyForm: RiskForm = {
  projectId: '', title: '', description: '', category: 'Technical',
  riskType: 'Threat', probability: 'Medium', impact: 'Medium',
  mitigationPlan: '', mitigationStrategy: 'Mitigate',
  contingencyPlan: '', contingencyBudget: '', riskOwnerId: '', reviewDate: '',
};

export default function RisksPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [projectId, setProjectId]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<RiskForm>(emptyForm);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [updateNote, setUpdateNote]   = useState('');
  const [newStatus, setNewStatus]     = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', projectId, statusFilter, categoryFilter],
    queryFn:  () => risksApi.getAll({
      projectId: projectId || undefined,
      status:    statusFilter || undefined,
      category:  categoryFilter || undefined,
    }).then(r => r.data),
  });

  const { data: updates } = useQuery({
    queryKey: ['risk-updates', selectedRisk?.id],
    queryFn:  () => risksApi.getUpdates(selectedRisk.id).then(r => r.data),
    enabled:  !!selectedRisk,
  });

  const createMutation = useMutation({
    mutationFn: () => risksApi.create({
      ...form,
      contingencyBudget: form.contingencyBudget ? Number(form.contingencyBudget) : undefined,
      riskOwnerId: form.riskOwnerId || undefined,
      reviewDate:  form.reviewDate  || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      toast.success('Risk registered');
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to create risk'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: () => risksApi.updateStatus(selectedRisk.id, newStatus || selectedRisk.status, updateNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['risk-updates', selectedRisk?.id] });
      toast.success('Risk updated');
      setUpdateNote('');
      setNewStatus('');
    },
  });

  const risks: any[] = risksData?.items ?? risksData ?? [];
  const totalCount = risksData?.totalCount ?? risks.length;

  // Stat cards
  const open     = risks.filter(r => r.status !== 'Closed').length;
  const critical = risks.filter(r => r.riskLevel === 'Critical').length;
  const high     = risks.filter(r => r.riskLevel === 'High').length;
  const mitigating = risks.filter(r => r.status?.includes('Mitigation')).length;

  const canCreate = hasRole('Admin') || hasRole('Project Manager') || hasRole('Planning Engineer') || hasRole('Site Engineer');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-sm text-gray-500 mt-1">Identify, assess and mitigate project risks</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Register Risk</button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open Risks',    value: open,       color: 'text-blue-600' },
          { label: 'Critical',      value: critical,   color: 'text-red-600' },
          { label: 'High',          value: high,       color: 'text-orange-600' },
          { label: 'In Mitigation', value: mitigating, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card text-center py-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <select className="form-select w-52" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">All Projects</option>
            {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="form-select w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['Draft','DeptReview','Analysis','MitigationPlanning','MitigationInProgress','Closed','Accepted'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="form-select w-44" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORY_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Risk Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading risks...</div>
        ) : risks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="text-gray-500 font-medium">No risks found</p>
            <p className="text-gray-400 text-sm mt-1">Register your first risk to start tracking</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Risk #</th><th>Title</th><th>Category</th>
                <th>Level</th><th>Prob.</th><th>Impact</th>
                <th>Status</th><th>Owner</th><th>Project</th><th></th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRisk(r)}>
                  <td className="font-mono text-xs font-medium text-gray-600">{r.riskNumber}</td>
                  <td className="font-medium text-gray-800 max-w-xs truncate">{r.title}</td>
                  <td className="text-sm text-gray-500">{r.category || '—'}</td>
                  <td>
                    {r.riskLevel && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[r.riskLevel] || ''}`}>
                        {r.riskLevel} ({r.riskScore})
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-gray-600">{r.probability}</td>
                  <td className="text-sm text-gray-600">{r.impact}</td>
                  <td><span className={`badge ${STATUS_COLORS[r.status] || 'badge-info'}`}>{r.status}</span></td>
                  <td className="text-sm text-gray-500">{r.riskOwnerName || '—'}</td>
                  <td className="text-xs text-gray-400 max-w-[120px] truncate">{r.projectName}</td>
                  <td className="text-yellow-600 text-sm">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedRisk(null)} />
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-gray-500">{selectedRisk.riskNumber}</span>
                  <span className={`badge ${STATUS_COLORS[selectedRisk.status] || 'badge-info'}`}>{selectedRisk.status}</span>
                  {selectedRisk.riskLevel && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[selectedRisk.riskLevel] || ''}`}>
                      {selectedRisk.riskLevel}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold mt-2">{selectedRisk.title}</h2>
                <p className="text-sm text-gray-500">{selectedRisk.projectName}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={() => setSelectedRisk(null)}>×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Category',   selectedRisk.category],
                  ['Type',       selectedRisk.riskType],
                  ['Probability',selectedRisk.probability],
                  ['Impact',     selectedRisk.impact],
                  ['Score',      selectedRisk.riskScore],
                  ['Owner',      selectedRisk.riskOwnerName || '—'],
                  ['Raised By',  selectedRisk.raisedByName],
                  ['Review Date',selectedRisk.reviewDate ? new Date(selectedRisk.reviewDate).toLocaleDateString() : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-800 mt-0.5">{v || '—'}</dd>
                  </div>
                ))}
              </div>

              {selectedRisk.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.description}</p>
                </div>
              )}
              {selectedRisk.mitigationPlan && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Mitigation Plan ({selectedRisk.mitigationStrategy})</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.mitigationPlan}</p>
                </div>
              )}
              {selectedRisk.contingencyPlan && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Contingency Plan</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.contingencyPlan}</p>
                  {selectedRisk.contingencyBudget && (
                    <p className="text-sm font-medium text-gray-700 mt-1">Budget: ${Number(selectedRisk.contingencyBudget).toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Add update */}
              {canCreate && (
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Update / Advance Status</h4>
                  <div className="space-y-3">
                    <select className="form-select w-full text-sm" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      <option value="">Keep current status ({selectedRisk.status})</option>
                      {['DeptReview','Analysis','MitigationPlanning','MitigationInProgress','Closed','Accepted'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <textarea className="form-input text-sm" rows={3} placeholder="Update notes..." value={updateNote} onChange={e => setUpdateNote(e.target.value)} />
                    <button
                      className="btn-primary text-sm"
                      onClick={() => updateStatusMutation.mutate()}
                      disabled={updateStatusMutation.isPending || (!updateNote && !newStatus)}
                    >
                      {updateStatusMutation.isPending ? 'Saving...' : 'Save Update'}
                    </button>
                  </div>
                </div>
              )}

              {/* Update history */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Update History</h4>
                {!updates?.length ? (
                  <p className="text-sm text-gray-400">No updates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((u: any) => (
                      <div key={u.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span className="font-medium text-gray-600">{u.updatedByName}</span>
                          <span>{new Date(u.createdAt).toLocaleString()}</span>
                        </div>
                        {u.newStatus && <p className="text-xs text-blue-600 mb-1">Status → {u.newStatus}</p>}
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

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Register New Risk</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group col-span-2">
                    <label className="form-label">Title *</label>
                    <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project *</label>
                    <select className="form-select" required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                      <option value="">Select...</option>
                      {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORY_OPTS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Risk Type</label>
                    <select className="form-select" value={form.riskType} onChange={e => setForm(f => ({ ...f, riskType: e.target.value }))}>
                      <option>Threat</option><option>Opportunity</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Probability</label>
                    <select className="form-select" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))}>
                      {PROBABILITY_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Impact</label>
                    <select className="form-select" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}>
                      {IMPACT_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mitigation Strategy</label>
                    <select className="form-select" value={form.mitigationStrategy} onChange={e => setForm(f => ({ ...f, mitigationStrategy: e.target.value }))}>
                      {STRATEGY_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Mitigation Plan</label>
                    <textarea className="form-input" rows={2} value={form.mitigationPlan} onChange={e => setForm(f => ({ ...f, mitigationPlan: e.target.value }))} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Contingency Plan</label>
                    <textarea className="form-input" rows={2} value={form.contingencyPlan} onChange={e => setForm(f => ({ ...f, contingencyPlan: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contingency Budget (USD)</label>
                    <input type="number" className="form-input" min="0" value={form.contingencyBudget} onChange={e => setForm(f => ({ ...f, contingencyBudget: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Date</label>
                    <input type="date" className="form-input" value={form.reviewDate} onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))} />
                  </div>
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
