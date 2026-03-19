import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  Planning: 'badge-info', Active: 'badge-success', OnHold: 'badge-warning',
  Completed: 'badge-primary', Cancelled: 'badge-danger',
};

const PROJECT_TYPES = ['Infrastructure','Construction','Renovation','Industrial','Commercial','Residential','Other'];

interface CreateForm {
  name: string; code: string; description: string; projectType: string;
  country: string; location: string; startDate: string; expectedEndDate: string;
  budget: string; clientName: string;
}

const emptyForm: CreateForm = {
  name: '', code: '', description: '', projectType: 'Infrastructure',
  country: '', location: '', startDate: '', expectedEndDate: '',
  budget: '', clientName: '',
};

export default function ProjectsPage() {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { hasRole } = useAuthStore();

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<CreateForm>(emptyForm);
  const [formError, setFormError]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter, page],
    queryFn:  () => projectsApi.getAll({ search, status: statusFilter, page, pageSize: 12 }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e: any) => setFormError(e.response?.data?.message || 'Failed to create project'),
  });

  const projects    = data?.items ?? [];
  const totalPages  = data?.totalPages ?? 1;
  const canCreate   = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all MMG projects across regions</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <input className="form-input flex-1 min-w-[200px]" placeholder="Search projects..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select w-44" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['Planning','Active','OnHold','Completed','Cancelled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-2 bg-gray-100 rounded w-full mb-2" />
              <div className="h-2 bg-gray-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">📁</p>
          <h3 className="text-gray-500 font-medium">No projects found</h3>
          {canCreate && (
            <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>Create First Project</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p: any) => (
            <div key={p.id}
              className="card cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-yellow-300"
              onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{p.code}{p.country ? ` · ${p.country}` : ''}</p>
                </div>
                <span className={`badge ${STATUS_COLORS[p.status] || 'badge-info'} ml-2 shrink-0`}>{p.status}</span>
              </div>

              {p.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.description}</p>
              )}

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{p.overallProgress ?? 0}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${p.overallProgress ?? 0}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span className="text-gray-400">Start</span>
                  <p className="font-medium text-gray-700">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">End</span>
                  <p className="font-medium text-gray-700">
                    {p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Manager</span>
                  <p className="font-medium text-gray-700 truncate">{p.projectManagerName || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Budget</span>
                  <p className="font-medium text-gray-700">
                    {p.budget ? `$${Number(p.budget).toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button className="btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Create New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); setFormError(''); createMutation.mutate(); }}>
              <div className="modal-body">
                {formError && <div className="alert-error mb-4">{formError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Project Name *</label>
                    <input className="form-input" required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Code *</label>
                    <input className="form-input font-mono" required placeholder="e.g. MMG-TZA-001"
                      value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Type</label>
                    <select className="form-select" value={form.projectType}
                      onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                      {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-input" required value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected End Date</label>
                    <input type="date" className="form-input" value={form.expectedEndDate}
                      onChange={e => setForm(f => ({ ...f, expectedEndDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" placeholder="e.g. Tanzania" value={form.country}
                      onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location / Site</label>
                    <input className="form-input" placeholder="e.g. Dar es Salaam" value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client Name</label>
                    <input className="form-input" value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget (USD)</label>
                    <input type="number" className="form-input" placeholder="0.00" min="0" value={form.budget}
                      onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows={3} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
