import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type Tab = 'center' | 'drawings' | 'changes';

const DOCTYPE_ICONS: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', docx: '📝', doc: '📝',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', dwg: '📐', default: '📎',
};

function getIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return DOCTYPE_ICONS[ext] || DOCTYPE_ICONS.default;
}

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [tab, setTab] = useState<Tab>('center');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [showCRModal, setShowCRModal] = useState(false);
  const [crForm, setCrForm] = useState({ title: '', description: '', projectId: '', reason: '', impact: '' });

  const { data: folders } = useQuery({
    queryKey: ['doc-folders'],
    queryFn: () => api.get('/documents/folders').then(r => r.data),
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', selectedFolder, search, tab],
    queryFn: () => api.get('/documents', { params: { folderId: selectedFolder, search, type: tab === 'drawings' ? 'Drawing' : undefined } }).then(r => r.data),
  });

  const { data: changeRequests, isLoading: crLoading } = useQuery({
    queryKey: ['change-requests'],
    queryFn: () => api.get('/documents/change-requests').then(r => r.data),
    enabled: tab === 'changes',
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects', { params: { pageSize: 100 } }).then(r => r.data.items),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) return Promise.reject('No file');
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('folderId', selectedFolder || '');
      fd.append('description', uploadDesc);
      fd.append('projectId', uploadProjectId);
      return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); setShowUpload(false); setUploadFile(null); setUploadDesc(''); },
  });

  const createCRMutation = useMutation({
    mutationFn: () => api.post('/documents/change-requests', crForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-requests'] }); setShowCRModal(false); },
  });

  const canUpload = hasRole('Admin') || hasRole('Planning Engineer') || hasRole('Project Manager') || hasRole('Site Engineer');

  const docs: any[] = documents || [];
  const crs: any[] = changeRequests || [];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-sm text-gray-500 mt-1">Central repository for all project documents</p>
        </div>
        <div className="flex gap-2">
          {tab === 'changes' ? (
            <button className="btn-primary" onClick={() => setShowCRModal(true)}>+ Change Request</button>
          ) : canUpload ? (
            <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Upload Document</button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {([['center', 'Document Center'], ['drawings', 'Drawings'], ['changes', 'Change Requests']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'tab-active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {/* Document Center & Drawings */}
      {(tab === 'center' || tab === 'drawings') && (
        <div className="flex gap-6">
          {/* Folder sidebar */}
          {tab === 'center' && (
            <div className="w-56 shrink-0">
              <div className="card p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Folders</p>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedFolder ? 'bg-yellow-100 text-yellow-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  onClick={() => setSelectedFolder(null)}
                >
                  📁 All Documents
                </button>
                {(folders || []).map((f: any) => (
                  <button
                    key={f.id}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${selectedFolder === f.id ? 'bg-yellow-100 text-yellow-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                    onClick={() => setSelectedFolder(f.id)}
                  >
                    {f.isExpanded ? '📂' : '📁'} {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document list */}
          <div className="flex-1">
            <div className="mb-4">
              <input className="form-input" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="card overflow-hidden p-0">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : docs.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-gray-400">No documents found</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Name</th><th>Project</th><th>Uploaded By</th><th>Date</th><th>Size</th><th>Rev</th></tr>
                  </thead>
                  <tbody>
                    {docs.map((d: any) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td>
                          <a href={d.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-800 hover:text-yellow-700">
                            <span className="text-lg">{getIcon(d.fileName)}</span>
                            <div>
                              <p className="font-medium text-sm">{d.title || d.fileName}</p>
                              {d.description && <p className="text-xs text-gray-400 truncate max-w-xs">{d.description}</p>}
                            </div>
                          </a>
                        </td>
                        <td className="text-sm text-gray-600">{d.projectName || '—'}</td>
                        <td className="text-sm text-gray-600">{d.uploadedByName}</td>
                        <td className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                        <td className="text-xs text-gray-400">{formatBytes(d.fileSize)}</td>
                        <td className="text-xs font-mono text-gray-500">{d.revisionNumber || 'v1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Requests */}
      {tab === 'changes' && (
        <div className="card overflow-hidden p-0">
          {crLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : crs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400">No change requests yet</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>CR #</th><th>Title</th><th>Project</th><th>Submitted By</th><th>Date</th><th>Status</th><th>Impact</th></tr>
              </thead>
              <tbody>
                {crs.map((cr: any) => (
                  <tr key={cr.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs text-gray-500">{cr.crNumber}</td>
                    <td className="font-medium text-sm">{cr.title}</td>
                    <td className="text-sm text-gray-600">{cr.projectName}</td>
                    <td className="text-sm text-gray-600">{cr.submittedByName}</td>
                    <td className="text-xs text-gray-400">{new Date(cr.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${
                        cr.status === 'Approved' ? 'badge-success' :
                        cr.status === 'Rejected' ? 'badge-danger' :
                        cr.status === 'UnderReview' ? 'badge-warning' : 'badge-info'
                      }`}>{cr.status}</span>
                    </td>
                    <td className="text-xs text-gray-500 max-w-xs truncate">{cr.impact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button className="modal-close" onClick={() => setShowUpload(false)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">File *</label>
                <input type="file" className="form-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={uploadProjectId} onChange={e => setUploadProjectId(e.target.value)}>
                  <option value="">Select project...</option>
                  {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showCRModal && (
        <div className="modal-overlay" onClick={() => setShowCRModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">New Change Request</h2>
              <button className="modal-close" onClick={() => setShowCRModal(false)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={crForm.title} onChange={e => setCrForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={crForm.projectId} onChange={e => setCrForm(f => ({ ...f, projectId: e.target.value }))}>
                  <option value="">Select project...</option>
                  {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Description</label>
                <textarea className="form-input" rows={3} value={crForm.description} onChange={e => setCrForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Impact Assessment</label>
                <textarea className="form-input" rows={2} placeholder="Cost, time, scope impact..." value={crForm.impact} onChange={e => setCrForm(f => ({ ...f, impact: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCRModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => createCRMutation.mutate()} disabled={!crForm.title || createCRMutation.isPending}>
                {createCRMutation.isPending ? 'Submitting...' : 'Submit CR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
