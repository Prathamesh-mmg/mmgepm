import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, mppApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  Plus, Search, FolderKanban, MapPin, Calendar,
  DollarSign, Users, ArrowRight, ChevronLeft, ChevronRight,
  Loader2, X, Globe, Building2, Upload, FileSpreadsheet,
  CheckCircle2, AlertCircle, ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_BADGE: Record<string, string> = {
  Planning:  'badge-blue',
  Active:    'badge-green',
  OnHold:    'badge-yellow',
  Completed: 'badge-gray',
  Cancelled: 'badge-red',
};

const STATUS_DOT: Record<string, string> = {
  Planning:  '#3B82F6',
  Active:    '#22C55E',
  OnHold:    '#F59E0B',
  Completed: '#6B7280',
  Cancelled: '#EF4444',
};

const PROJECT_TYPES = [
  'Infrastructure','Construction','Renovation','Industrial',
  'Commercial','Residential','Oil & Gas','Other'
];

const COUNTRIES = [
  'Tanzania','Zambia','Uganda','Kenya','Malawi','Rwanda',
  'UAE','India','South Africa','Other'
];

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

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<CreateForm>(emptyForm);
  const [formError, setFormError] = useState('');

  // MPP Import state
  const [mppProject, setMppProject]   = useState<any>(null); // project being targeted for MPP import
  const [mppFile, setMppFile]         = useState<File | null>(null);
  const [mppMode, setMppMode]         = useState<'replace' | 'append'>('replace');
  const [mppResult, setMppResult]     = useState<any>(null);
  const mppInputRef = useRef<HTMLInputElement>(null);

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
      toast.success('Project created successfully');
      setShowModal(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (e: any) => setFormError(
      e.response?.data?.message || e.response?.data?.inner || e.message || 'Failed to create project'
    ),
  });

  const mppMutation = useMutation({
    mutationFn: () => mppApi.importMpp(mppProject!.id, mppFile!, mppMode),
    onSuccess: (res: any) => {
      setMppResult(res.data);
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`MPP imported: ${res.data.tasksImported} tasks`);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'MPP import failed');
    },
  });

  const projects   = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total ?? 0;
  const canCreate  = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager');

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ─────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} project${total !== 1 ? 's' : ''} across MMG portfolio` : 'Manage all MMG projects across regions'}
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="card" style={{ padding: '14px 16px', borderRadius: '12px' }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="search-bar flex-1 min-w-[200px]">
            <Search className="search-icon w-4 h-4" />
            <input className="form-input pl-9" placeholder="Search projects by name, code, country..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select w-44" value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['Planning','Active','OnHold','Completed','Cancelled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button className="btn-ghost btn-sm flex items-center gap-1"
              onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Status Summary Pills */}
      {data && (
        <div className="flex flex-wrap gap-2">
          {['Active','Planning','OnHold','Completed','Cancelled'].map(s => {
            const count = data?.items?.filter((p: any) => p.status === s).length ?? 0;
            if (count === 0 && statusFilter !== s) return null;
            return (
              <button key={s}
                onClick={() => setStatus(statusFilter === s ? '' : s)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  statusFilter === s ? 'shadow-sm' : 'bg-white'
                )}
                style={{
                  borderColor: statusFilter === s ? STATUS_DOT[s] : 'var(--border)',
                  color: statusFilter === s ? STATUS_DOT[s] : 'var(--text-secondary)',
                  background: statusFilter === s ? `${STATUS_DOT[s]}12` : 'white'
                }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[s] }} />
                {s} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Project Grid ─────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ borderRadius: '14px' }}>
              <div className="space-y-3">
                <div className="skeleton h-5 w-3/4 rounded-lg" />
                <div className="skeleton h-3 w-1/2 rounded-lg" />
                <div className="skeleton h-2 w-full rounded-lg mt-4" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="skeleton h-8 rounded-lg" />
                  <div className="skeleton h-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-20" style={{ borderRadius: '16px' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(209,17,28,0.06)' }}>
            <FolderKanban className="w-8 h-8" style={{ color: 'var(--primary)', opacity: 0.5 }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {search || statusFilter ? 'No projects match your filters' : 'No projects yet'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {canCreate ? 'Create your first project to get started' : 'Projects will appear here once created'}
          </p>
          {canCreate && (
            <button className="btn-primary mx-auto" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p: any) => (
            <ProjectCard key={p.id} project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              onImportMpp={canCreate ? () => { setMppProject(p); setMppFile(null); setMppResult(null); } : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button className="btn-outline btn-sm flex items-center gap-1"
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pg = i + 1;
              return (
                <button key={pg}
                  onClick={() => setPage(pg)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-semibold transition-all',
                    pg === page
                      ? 'text-white shadow-sm'
                      : 'hover:bg-gray-100'
                  )}
                  style={{
                    background: pg === page ? 'var(--primary)' : 'transparent',
                    color: pg === page ? 'white' : 'var(--text-secondary)'
                  }}>
                  {pg}
                </button>
              );
            })}
          </div>
          <button className="btn-outline btn-sm flex items-center gap-1"
            disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── MPP Import Modal ─────────────────────── */}
      {mppProject && (
        <div className="modal-overlay" onClick={() => { setMppProject(null); setMppFile(null); setMppResult(null); }}>
          <div className="modal max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.10)' }}>
                  <FileSpreadsheet className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Import MS Project File</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{mppProject.name}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setMppProject(null); setMppFile(null); setMppResult(null); }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {mppResult ? (
                /* Success state */
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.10)' }}>
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Import Successful</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{mppResult.message}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Tasks', value: mppResult.tasksImported, color: '#3B82F6' },
                      { label: 'Resources', value: mppResult.resourcesImported, color: '#8B5CF6' },
                      { label: 'Assignments', value: mppResult.assignmentsImported, color: '#22C55E' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl p-3 text-center"
                        style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Drop zone */}
                  <div
                    className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
                    style={{
                      borderColor: mppFile ? '#3B82F6' : 'var(--border)',
                      background: mppFile ? 'rgba(59,130,246,0.04)' : 'var(--bg-secondary)',
                    }}
                    onClick={() => mppInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) setMppFile(f);
                    }}
                  >
                    <input
                      ref={mppInputRef}
                      type="file"
                      accept=".mpp,.xml,.mspdi"
                      className="hidden"
                      onChange={e => setMppFile(e.target.files?.[0] ?? null)}
                    />
                    {mppFile ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                          style={{ background: 'rgba(59,130,246,0.10)' }}>
                          <FileSpreadsheet className="w-5 h-5" style={{ color: '#3B82F6' }} />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mppFile.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(mppFile.size / 1024).toFixed(0)} KB — click to change
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Drop your .mpp file here
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          or click to browse — supports .mpp, .xml, .mspdi
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Import mode */}
                  <div className="form-group">
                    <label className="form-label">Import Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['replace', 'append'] as const).map(m => (
                        <button key={m} type="button"
                          className="rounded-xl p-3 text-left transition-all border"
                          style={{
                            borderColor: mppMode === m ? 'var(--primary)' : 'var(--border)',
                            background: mppMode === m ? 'rgba(209,17,28,0.05)' : 'var(--bg-secondary)',
                          }}
                          onClick={() => setMppMode(m)}
                        >
                          <div className="font-semibold text-sm capitalize" style={{ color: mppMode === m ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {m === 'replace' ? 'Replace' : 'Append'}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {m === 'replace' ? 'Clear existing tasks then import' : 'Add tasks alongside existing ones'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg p-3 flex gap-2"
                    style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.20)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#CA8A04' }} />
                    <p className="text-xs" style={{ color: '#92400E' }}>
                      {mppMode === 'replace'
                        ? 'Replace mode will permanently remove all existing tasks for this project before importing.'
                        : 'Append mode adds new tasks without removing existing ones. Duplicate tasks may be created if re-importing.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {mppResult ? (
                <>
                  <button className="btn-ghost" onClick={() => { setMppResult(null); setMppFile(null); }}>
                    Import Another
                  </button>
                  <button className="btn-primary" onClick={() => { navigate(`/projects/${mppProject.id}`); }}>
                    <ClipboardList className="w-4 h-4" /> View Tasks
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-ghost"
                    onClick={() => { setMppProject(null); setMppFile(null); }}>
                    Cancel
                  </button>
                  <button className="btn-primary"
                    disabled={!mppFile || mppMutation.isPending}
                    onClick={() => mppMutation.mutate()}
                  >
                    {mppMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                      : <><Upload className="w-4 h-4" /> Import MPP</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ─────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-light)' }}>
                  <FolderKanban className="w-4.5 h-4.5" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>New Project</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fill in the project details below</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); setFormError(''); createMutation.mutate(); }}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error mb-4">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Project Name *</label>
                    <input className="form-input" required placeholder="e.g. Dar es Salaam Highway Extension"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Project Code *</label>
                    <input className="form-input font-mono" required placeholder="MMG-TZA-001"
                      value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                    <p className="input-hint">Format: MMG-[COUNTRY]-[NUM]</p>
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
                    <select className="form-select" value={form.country}
                      onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / Site</label>
                    <input className="form-input" placeholder="e.g. Dar es Salaam" value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Client / Owner</label>
                    <input className="form-input" placeholder="Client name" value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Budget (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input type="number" className="form-input pl-9" placeholder="0.00" min="0" step="0.01"
                        value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-group md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea className="form-input textarea" rows={3}
                      placeholder="Briefly describe the project scope, objectives, and key deliverables..."
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost"
                  onClick={() => { setShowModal(false); setFormError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" /> Create Project</>
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

// ─── Project Card Component ────────────────────────────────────
function ProjectCard({ project: p, onClick, onImportMpp }: { project: any; onClick: () => void; onImportMpp?: () => void }) {
  const progress = p.overallProgress ?? 0;
  const isDelayed = p.status === 'Active' && p.expectedEndDate && new Date(p.expectedEndDate) < new Date();

  return (
    <div
      className="group cursor-pointer rounded-2xl transition-all duration-200 bg-white overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(209,17,28,0.25)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Progress bar top accent */}
      <div className="h-1 w-full" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="h-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: progress >= 100 ? '#22C55E' : progress > 60 ? '#3B82F6' : 'var(--primary)'
          }} />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: 'rgba(209,17,28,0.08)', color: 'var(--primary)' }}>
                {p.name?.charAt(0)?.toUpperCase()}
              </div>
              <h3 className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>
                {p.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {p.code}
              </span>
              {p.projectType && (
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.projectType}</span>
              )}
            </div>
          </div>
          <span className={`badge flex-shrink-0 ${STATUS_BADGE[p.status] || 'badge-gray'}`}>
            {p.status}
          </span>
        </div>

        {/* Description */}
        {p.description && (
          <p className="text-[12px] line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)', lineHeight: '1.55' }}>
            {p.description}
          </p>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span className="font-bold" style={{
              color: progress >= 100 ? '#22C55E' : progress >= 60 ? '#3B82F6' : 'var(--text-primary)'
            }}>{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, progress)}%`,
                background: progress >= 100 ? '#22C55E' : progress > 60 ? '#3B82F6' : 'linear-gradient(90deg, var(--primary), #E8323C)'
              }} />
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {p.country && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {p.country}{p.location ? ` · ${p.location}` : ''}
              </span>
            </div>
          )}
          {p.projectManagerName && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {p.projectManagerName}
              </span>
            </div>
          )}
          {(p.startDate || p.expectedEndDate) && (
            <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px]" style={{ color: isDelayed ? '#EF4444' : 'var(--text-secondary)' }}>
                {p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                {p.expectedEndDate ? ` → ${new Date(p.expectedEndDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}` : ''}
                {isDelayed && <span className="ml-1 font-semibold">(Delayed)</span>}
              </span>
            </div>
          )}
          {p.budget && (
            <div className="flex items-center gap-1.5 col-span-2">
              <DollarSign className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ${Number(p.budget).toLocaleString()} budget
              </span>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="flex items-center justify-between mt-3">
          {onImportMpp && (
            <button
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all"
              style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.06)' }}
              onClick={e => { e.stopPropagation(); onImportMpp(); }}
              title="Import tasks from MS Project .mpp file"
            >
              <Upload className="w-3 h-3" /> Import MPP
            </button>
          )}
          <span className="text-[11px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
            style={{ color: 'var(--primary)' }}>
            View details <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
