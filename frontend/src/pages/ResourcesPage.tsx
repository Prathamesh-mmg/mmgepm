// src/pages/ResourcesPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Users, Plus, Loader2, HardHat, Cpu } from 'lucide-react';
import { resourcesApi, projectsApi, api } from '../lib/api';
import clsx from 'clsx';

const RESOURCE_CATEGORIES = [
  { label: 'Human Resource',  category: 'Human',     icon: '👤' },
  { label: 'Equipment',       category: 'Equipment', icon: '🏗' },
  { label: 'Material',        category: 'Material',  icon: '📦' },
];

export default function ResourcesPage() {
  const qc = useQueryClient();
  const [projectId,  setProjectId]  = useState('');
  const [subTab,     setSubTab]     = useState<'pool'|'allocations'|'equipment'>('pool');
  const [showAdd,    setShowAdd]    = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployTarget, setDeployTarget] = useState<any>(null);
  const [deployProjectId, setDeployProjectId] = useState('');
  const [resForm,    setResForm]    = useState({
    name: '', code: '', category: 'Human',
    costPerHour: '', costPerDay: '', currency: 'USD',
    make: '', model: '', serialNumber: '', notes: ''
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: resourceTypes } = useQuery({
    queryKey: ['resource-types'],
    queryFn:  () => api.get('/resources/types').then(r => r.data).catch(() => []),
  });

  const { data: resourcesData, isLoading, refetch } = useQuery({
    queryKey: ['resources', subTab],
    queryFn:  () => resourcesApi.getAll({
      type: subTab === 'equipment' ? 'Equipment' : subTab === 'pool' ? 'Human' : undefined
    }).then(r => r.data),
  });

  const { data: allocations } = useQuery({
    queryKey: ['allocations', projectId],
    queryFn:  () => resourcesApi.getAllocations({ projectId }).then(r => r.data),
    enabled:  !!projectId && subTab === 'allocations',
  });

  const resources: any[] = Array.isArray(resourcesData) ? resourcesData
    : (resourcesData as any)?.items ?? [];

  const deployMutation = useMutation({
    mutationFn: ({ resourceId, projectId }: { resourceId: string; projectId: string }) =>
      api.patch(`/resources/${resourceId}/status`, { status: 'Allocated' }).then(() =>
        api.post('/resources/equipment-deployments', { resourceId, projectId, deployedFrom: new Date().toISOString() })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      setShowDeploy(false); setDeployTarget(null); setDeployProjectId('');
      import('react-hot-toast').then(({ default: toast }) => toast.success('Resource deployed to project'));
    },
    onError: (e: any) => import('react-hot-toast').then(({ default: toast }) =>
      toast.error(e.response?.data?.message || 'Failed to deploy resource')),
  });

  const releaseMutation = useMutation({
    mutationFn: (resourceId: string) =>
      api.patch(`/resources/${resourceId}/status`, { status: 'Available' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Resource released back to pool'));
    },
    onError: (e: any) => import('react-hot-toast').then(({ default: toast }) =>
      toast.error(e.response?.data?.message || 'Failed to release resource')),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/resources', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      setShowAdd(false);
      setResForm({ name:'', code:'', category:'Human', costPerHour:'', costPerDay:'',
                   currency:'USD', make:'', model:'', serialNumber:'', notes:'' });
      import('react-hot-toast').then(({default: toast}) => toast.success('Resource added to pool'));
    },
    onError: (e: any) => import('react-hot-toast').then(({default: toast}) =>
      toast.error(e.response?.data?.message || e.response?.data?.inner || 'Failed to add resource')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources'] });
      import('react-hot-toast').then(({default: toast}) => toast.success('Resource removed'));
    },
  });

  // KPI counts
  const available  = resources.filter(r => r.status === 'Available').length;
  const allocated  = resources.filter(r => r.status === 'Allocated').length;
  const equipment  = resources.filter(r => r.category === 'Equipment' || r.resourceType === 'Equipment').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resource Management</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>
            Manage resource pool, allocations and equipment deployment
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Resources', value: resources.length,  color: 'var(--primary)' },
          { label: 'Available',       value: available,         color: '#16A34A' },
          { label: 'Allocated',       value: allocated,         color: '#D97706' },
          { label: 'Equipment',       value: equipment,         color: '#2563EB' },
        ].map(kpi => (
          <div key={kpi.label} className="stat-card">
            <p className="stat-label">{kpi.label}</p>
            <p className="stat-value" style={{color: kpi.color}}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['pool','Resource Pool'],['equipment','Equipment'],['allocations','Allocations']].map(([id,label]) => (
          <button key={id} className={clsx('tab-item', subTab === id && 'active')}
            onClick={() => setSubTab(id as any)}>{label}</button>
        ))}
      </div>

      {subTab === 'allocations' && (
        <select className="form-select max-w-xs" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">Select a project…</option>
          {(projects as any[] || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {/* Resource Pool / Equipment Table */}
      {(subTab === 'pool' || subTab === 'equipment') && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Code</th><th>Type</th>
                <th className="text-right">Cost/Day</th>
                <th className="text-right">Cost/Hr</th>
                <th>Currency</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={8} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} />
                  </td></tr>
                : !resources.length
                  ? <tr><td colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Wrench className="w-10 h-10 opacity-20" />
                        <p style={{color:'var(--text-secondary)'}}>No resources in pool yet</p>
                        <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                          <Plus className="w-4 h-4" /> Add First Resource
                        </button>
                      </div>
                    </td></tr>
                  : resources.map((r: any) => (
                    <tr key={r.id || r.resourceId}>
                      <td className="font-medium">{r.name || r.resourceName}</td>
                      <td className="text-sm font-mono" style={{color:'var(--text-secondary)'}}>{r.code || '—'}</td>
                      <td className="text-sm">{r.resourceType || r.category || '—'}</td>
                      <td className="text-right">{r.costPerDay ? `$${r.costPerDay}` : '—'}</td>
                      <td className="text-right">{r.costPerHour ? `$${r.costPerHour}` : '—'}</td>
                      <td className="text-sm">{r.currency || 'USD'}</td>
                      <td>
                        <span className={clsx('badge text-xs',
                          r.status === 'Available' ? 'badge-green' :
                          r.status === 'Allocated' ? 'badge-orange' : 'badge-gray')}>
                          {r.status || 'Available'}
                        </span>
                      </td>
                      <td>
                        {(r.status === 'Available' || !r.status) && (
                          <button
                            className="text-xs px-2 py-1 rounded font-medium mr-1"
                            style={{background:'var(--secondary)', color:'#1F2937'}}
                            onClick={e => { e.stopPropagation(); setDeployTarget(r); setShowDeploy(true); }}
                            title="Deploy to project">
                            Deploy
                          </button>
                        )}
                        {r.status === 'Allocated' && (
                          <button
                            className="text-xs px-2 py-1 rounded font-medium mr-1"
                            style={{background:'var(--primary-light)', color:'var(--primary)'}}
                            onClick={e => { e.stopPropagation(); if(confirm('Release this resource back to pool?')) releaseMutation.mutate(r.id || r.resourceId); }}
                            title="Release resource">
                            Release
                          </button>
                        )}
                        <button className="btn-ghost btn-sm btn-icon"
                          onClick={() => { if (confirm('Remove this resource?')) deleteMutation.mutate(r.id || r.resourceId); }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Allocations Tab */}
      {subTab === 'allocations' && !projectId && (
        <div className="empty-state">
          <Users className="empty-icon" />
          <p className="empty-title">Select a Project</p>
          <p className="empty-text">Choose a project to view its resource allocations</p>
        </div>
      )}
      {subTab === 'allocations' && projectId && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Resource</th><th>Task</th><th>Start</th><th>End</th><th>Allocation %</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!(allocations as any[])?.length
                ? <tr><td colSpan={6} className="text-center py-10" style={{color:'var(--text-secondary)'}}>
                    No allocations for this project
                  </td></tr>
                : (allocations as any[]).map((a: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium">{a.resourceName}</td>
                    <td className="text-sm">{a.taskName}</td>
                    <td className="text-sm">{a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}</td>
                    <td className="text-sm">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}</td>
                    <td className="text-center">{a.allocationPercent}%</td>
                    <td><span className={clsx('badge text-xs', a.status === 'Active' ? 'badge-green' : 'badge-gray')}>{a.status}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Resource Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal max-w-lg w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Add Resource to Pool</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              {/* Category selector */}
              <div>
                <label className="form-label">Resource Category *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {RESOURCE_CATEGORIES.map(cat => (
                    <button key={cat.category} type="button"
                      className={clsx('p-3 rounded-lg border-2 text-sm font-medium transition-all',
                        resForm.category === cat.category
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                          : 'border-[var(--border)] hover:border-[var(--primary)]')}
                      onClick={() => setResForm(f => ({...f, category: cat.category}))}>
                      <div className="text-xl mb-1">{cat.icon}</div>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Name *</label>
                  <input className="form-input" placeholder="e.g. John Smith / CAT Excavator 320"
                    value={resForm.name} onChange={e => setResForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Code / ID</label>
                  <input className="form-input" placeholder="e.g. RES-001"
                    value={resForm.code} onChange={e => setResForm(f => ({...f, code: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={resForm.currency}
                    onChange={e => setResForm(f => ({...f, currency: e.target.value}))}>
                    <option>USD</option><option>TZS</option><option>KES</option>
                    <option>ZMW</option><option>UGX</option><option>AED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Per Day</label>
                  <input type="number" className="form-input" placeholder="0.00"
                    value={resForm.costPerDay} onChange={e => setResForm(f => ({...f, costPerDay: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Per Hour</label>
                  <input type="number" className="form-input" placeholder="0.00"
                    value={resForm.costPerHour} onChange={e => setResForm(f => ({...f, costPerHour: e.target.value}))} />
                </div>
              </div>

              {resForm.category === 'Equipment' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label">Make</label>
                    <input className="form-input" placeholder="e.g. CAT"
                      value={resForm.make} onChange={e => setResForm(f => ({...f, make: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input className="form-input" placeholder="e.g. 320"
                      value={resForm.model} onChange={e => setResForm(f => ({...f, model: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial No.</label>
                    <input className="form-input" placeholder="Serial number"
                      value={resForm.serialNumber} onChange={e => setResForm(f => ({...f, serialNumber: e.target.value}))} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} placeholder="Skills, certifications, or notes..."
                  value={resForm.notes} onChange={e => setResForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!resForm.name || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name:         resForm.name,
                  code:         resForm.code || null,
                  costPerDay:   resForm.costPerDay ? Number(resForm.costPerDay) : null,
                  costPerHour:  resForm.costPerHour ? Number(resForm.costPerHour) : null,
                  currency:     resForm.currency,
                  notes:        resForm.notes || null,
                  make:         resForm.make || null,
                  model:        resForm.model || null,
                  serialNumber: resForm.serialNumber || null,
                })}
              >
                {createMutation.isPending ? 'Adding…' : 'Add to Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deploy Resource Modal (TC-RES-004) ── */}
      {showDeploy && deployTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeploy(false)}>
          <div className="modal max-w-md w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Deploy Resource</h2>
              <button className="modal-close" onClick={() => setShowDeploy(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="p-3 rounded-lg" style={{background:'var(--bg-secondary)'}}>
                <p className="font-medium text-sm">{deployTarget.name || deployTarget.resourceName}</p>
                <p className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
                  {deployTarget.resourceType || deployTarget.category || 'Resource'} · Status:
                  <span className="ml-1 font-medium text-green-600">Available</span>
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to Project *</label>
                <select className="form-select" value={deployProjectId}
                  onChange={e => setDeployProjectId(e.target.value)}>
                  <option value="">Select project…</option>
                  {(projects as any[] || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowDeploy(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!deployProjectId || deployMutation.isPending}
                onClick={() => deployMutation.mutate({
                  resourceId: deployTarget.id || deployTarget.resourceId,
                  projectId:  deployProjectId,
                })}
              >
                {deployMutation.isPending ? 'Deploying…' : 'Deploy Resource'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
