import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  FolderOpen, FileText, Upload, Download, Plus, ChevronRight,
  RefreshCw, GitBranch, Send, Eye, Search, Filter
} from 'lucide-react';
import clsx from 'clsx';

type Tab = 'center' | 'drawings' | 'changes';

const DRAWING_CATS   = ['Civil','Mechanical','Electrical','Architectural','Structural'];
const CR_STAGES      = ['Draft','UnderReview','EvaluateImpact','PrepareChangeOrder','ReviewByHOD','UpdateProjectPlan','MakeChange','ChangeCompleted','ProjectIssueLog'];
const CR_STAGE_LABEL: Record<string,string> = {
  Draft:'Draft', UnderReview:'Under Review', EvaluateImpact:'Evaluate Impact',
  PrepareChangeOrder:'Prepare CO', ReviewByHOD:'HOD Review',
  UpdateProjectPlan:'Update Plan', MakeChange:'Make Change',
  ChangeCompleted:'Completed', ProjectIssueLog:'Issue Log',
};
const CR_NEXT: Record<string,string> = {
  Draft:'UnderReview', UnderReview:'EvaluateImpact',
  EvaluateImpact:'PrepareChangeOrder', PrepareChangeOrder:'ReviewByHOD',
  ReviewByHOD:'UpdateProjectPlan', UpdateProjectPlan:'MakeChange',
  MakeChange:'ChangeCompleted',
};
const STATUS_COLORS: Record<string,string> = {
  'Release Drawings':'badge-yellow', 'Site Drawings':'badge-green',
  Draft:'badge-gray', ChangeCompleted:'badge-green', ProjectIssueLog:'badge-red',
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]             = useState<Tab>('center');
  const [projectId, setProjectId] = useState('');
  const [search, setSearch]       = useState('');
  const [selectedFolder, setFolder] = useState('');
  const [folderPath, setFolderPath] = useState<{id:string;name:string}[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName]   = useState('');
  const [selectedDrawing, setDrawing] = useState<any>(null);
  const [showVersions, setVersions]     = useState(false);
  const [showDrawingForm, setShowDrawingForm] = useState(false);
  const [selectedCR, setCR]           = useState<any>(null);
  const [crAdvanceNote, setCrNote]    = useState('');
  const [drawingForm, setDrawingForm2] = useState({
    name:'', subProjectId:'', category:'Civil', revision:'R0',
    receivedFrom:'', remarks:'', file: null as File|null,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects', { params: { pageSize:100 } }).then(r => r.data.items),
  });

  const { data: folders } = useQuery({
    queryKey: ['folders', projectId, selectedFolder],
    queryFn:  () => api.get('/documents/folders', {
      params: { projectId: projectId||undefined, parentId: selectedFolder||undefined }
    }).then(r => r.data),
    enabled: tab === 'center',
  });

  const { data: docs } = useQuery({
    queryKey: ['docs', projectId, selectedFolder, search],
    queryFn:  () => api.get('/documents', {
      params: { projectId: projectId||undefined, folderId: selectedFolder||undefined, search: search||undefined }
    }).then(r => r.data),
    enabled: tab === 'center',
  });

  const { data: drawings } = useQuery({
    queryKey: ['drawings', projectId, search],
    queryFn:  () => api.get('/documents', {
      params: { projectId: projectId||undefined, type:'Drawing', search: search||undefined }
    }).then(r => r.data),
    enabled: tab === 'drawings',
  });

  const { data: drawingVersions } = useQuery({
    queryKey: ['drawing-versions', selectedDrawing?.id],
    queryFn:  () => api.get(`/drawings/${selectedDrawing.id}/versions`).then(r => r.data),
    enabled:  showVersions && !!selectedDrawing?.id,
  });

  const { data: changes } = useQuery({
    queryKey: ['changes', projectId, search],
    queryFn:  () => api.get('/documents/change-requests', {
      params: { projectId: projectId||undefined }
    }).then(r => r.data),
    enabled: tab === 'changes',
  });

  const { data: crLog } = useQuery({
    queryKey: ['cr-log', selectedCR?.id],
    queryFn:  () => api.get(`/change-requests/${selectedCR.id}/lifecycle/log`).then(r => r.data),
    enabled:  !!selectedCR?.id,
  });

  const createFolderMutation = useMutation({
    mutationFn: () => api.post('/documents/folders', {
      name: folderName, parentId: selectedFolder||undefined, projectId: projectId||undefined
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['folders'] });
      toast.success('Folder created');
      setNewFolder(false); setFolderName('');
    },
    onError: () => toast.error('Failed to create folder'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      if (projectId) fd.append('projectId', projectId);
      if (selectedFolder) fd.append('folderId', selectedFolder);
      return api.post('/documents/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['docs'] });
      toast.success('File uploaded');
    },
  });

  const createDrawingMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('name', drawingForm.name);
      fd.append('category', drawingForm.category);
      fd.append('revision', drawingForm.revision);
      fd.append('receivedFrom', drawingForm.receivedFrom);
      fd.append('remarks', drawingForm.remarks);
      if (projectId) fd.append('projectId', projectId);
      if (drawingForm.file) fd.append('file', drawingForm.file);
      return api.post('/documents/drawings', fd, { headers:{'Content-Type':'multipart/form-data'} });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['drawings'] });
      toast.success('Drawing registered');
      setDrawingForm({ name:'', subProjectId:'', category:'Civil', revision:'R0', receivedFrom:'', remarks:'', file:null });
      setDrawingForm(f => ({...f}));
      setDrawingForm({ name:'', subProjectId:'', category:'Civil', revision:'R0', receivedFrom:'', remarks:'', file:null });
    },
    onError: () => toast.error('Failed to create drawing'),
  });

  const releaseDrawingMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/documents/drawings/${id}/release`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['drawings'] });
      toast.success('Drawing released to site team');
    },
  });

  const advanceCRMutation = useMutation({
    mutationFn: ({ id, toState }: { id:string; toState:string }) =>
      api.post(`/change-requests/${id}/lifecycle/advance`, { toState, comments: crAdvanceNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['changes'] });
      qc.invalidateQueries({ queryKey:['cr-log'] });
      toast.success('Change Request advanced');
      setCrNote('');
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const canManage = hasRole('Admin') || hasRole('Project Manager') || hasRole('Planning Engineer');
  const docList: any[]     = Array.isArray(docs)     ? docs     : (docs?.items ?? []);
  const drawList: any[]    = Array.isArray(drawings)  ? drawings : (drawings?.items ?? []);
  const changeList: any[]  = Array.isArray(changes)   ? changes  : (changes?.items ?? []);
  const folderList: any[]  = Array.isArray(folders)   ? folders  : [];
  const versionList: any[] = Array.isArray(drawingVersions) ? drawingVersions : [];

  const navigateFolder = (id: string, name: string) => {
    setFolder(id);
    setFolderPath(p => [...p, { id, name }]);
  };
  const navigateBreadcrumb = (idx: number) => {
    if (idx < 0) { setFolder(''); setFolderPath([]); return; }
    const item = folderPath[idx];
    setFolder(item.id);
    setFolderPath(p => p.slice(0, idx + 1));
  };

  return (
    <div className="page-container max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Document Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Documents, drawings, change requests and document centre
          </p>
        </div>
      </div>

      {/* Top filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="form-select max-w-xs" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All Projects</option>
          {(projects||[]).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="form-input pl-9 w-full" placeholder="Search documents..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          ['center',   '📁 Document Centre'],
          ['drawings', '📐 Drawings'],
          ['changes',  '🔄 Change Requests'],
        ] as [Tab,string][]).map(([k,label]) => (
          <button key={k} className={`tab ${tab===k?'tab-active':''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {/* ── Document Centre (DM-EXT-6, 7, 8) ── */}
      {tab === 'center' && (
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => navigateBreadcrumb(-1)}
              className={clsx('hover:text-yellow-600', !selectedFolder && 'font-semibold text-yellow-600')}>
              📁 Root
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <button onClick={() => navigateBreadcrumb(i)}
                  className={clsx('hover:text-yellow-600', i === folderPath.length-1 && 'font-semibold text-yellow-600')}>
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={() => setNewFolder(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" /> New Subfolder
              </button>
              <label className="btn-primary text-sm flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4" /> Upload File
                <input type="file" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]); }} />
              </label>
            </div>
          )}

          {/* New folder form */}
          {showNewFolder && (
            <div className="card p-4 flex items-center gap-3">
              <input className="form-input flex-1" placeholder="Folder name (e.g. 1.4 Drawings)"
                value={folderName} onChange={e => setFolderName(e.target.value)} />
              <button onClick={() => createFolderMutation.mutate()}
                disabled={!folderName || createFolderMutation.isPending}
                className="btn-primary text-sm">Done</button>
              <button onClick={() => { setNewFolder(false); setFolderName(''); }} className="btn-ghost text-sm">Cancel</button>
            </div>
          )}

          {/* Folder grid */}
          {folderList.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folderList.map((f:any) => (
                <button key={f.id} onClick={() => navigateFolder(f.id, f.name)}
                  className="card p-3 flex flex-col items-center gap-1.5 hover:border-yellow-400 hover:bg-yellow-50 transition-all text-center">
                  <FolderOpen className="w-8 h-8 text-yellow-400" />
                  <span className="text-xs text-gray-700 font-medium line-clamp-2">{f.name}</span>
                  {f.fileCount > 0 && <span className="text-[10px] text-gray-400">{f.fileCount} files</span>}
                </button>
              ))}
            </div>
          )}

          {/* Document list */}
          {docList.length > 0 ? (
            <div className="card overflow-hidden p-0">
              <table className="table">
                <thead>
                  <tr><th>File Name</th><th>Type</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {docList.map((d:any) => (
                    <tr key={d.id}>
                      <td className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium truncate max-w-xs">{d.fileName || d.title}</span>
                      </td>
                      <td><span className="badge badge-blue text-xs">{d.documentType || d.type || 'Doc'}</span></td>
                      <td className="text-xs text-gray-500">{d.uploadedByName}</td>
                      <td className="text-xs text-gray-500">{d.uploadedAt ? format(new Date(d.uploadedAt),'dd MMM yyyy') : '—'}</td>
                      <td>
                        {d.fileUrl && (
                          <a href={d.fileUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              {selectedFolder ? 'No files in this folder.' : 'No documents found.'}
            </div>
          )}
        </div>
      )}

      {/* ── Drawings (DM-EXT-1, 2, 3) ── */}
      {tab === 'drawings' && (
        <div className="space-y-4">
          {canManage && !showDrawingForm && (
            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => { setDrawingForm2({ name:'', subProjectId:'', category:'Civil', revision:'R0', receivedFrom:'', remarks:'', file:null }); setShowDrawingForm(true); }}>
              <Plus className="w-4 h-4" /> + Drawing
            </button>
          )}

          {/* Drawing registration form (DM-EXT-1) */}
          {showDrawingForm && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Register Drawing (DM-EXT-1)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="form-group col-span-2 md:col-span-1">
                  <label className="form-label">Drawing Name *</label>
                  <input className="form-input" value={drawingForm.name}
                    onChange={e => setDrawingForm2(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {DRAWING_CATS.map(c => (
                      <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="cat" value={c} checked={drawingForm.category===c}
                          onChange={() => setDrawingForm2(f=>({...f,category:c}))} />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Drawing Revision</label>
                  <input className="form-input" placeholder="e.g. R0"
                    value={drawingForm.revision}
                    onChange={e => setDrawingForm2(f=>({...f,revision:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Received From</label>
                  <input className="form-input" placeholder="Architect / Consultant name"
                    value={drawingForm.receivedFrom}
                    onChange={e => setDrawingForm2(f=>({...f,receivedFrom:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attachment *</label>
                  <input type="file" className="form-input text-sm"
                    onChange={e => setDrawingForm2(f=>({...f,file:e.target.files?.[0]||null}))} />
                </div>
                <div className="form-group col-span-2 md:col-span-3">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={2}
                    value={drawingForm.remarks}
                    onChange={e => setDrawingForm2(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-3">
                <button onClick={() => setShowDrawingForm(false)} className="btn-ghost">Cancel</button>
                <button onClick={() => createDrawingMutation.mutate()}
                  disabled={!drawingForm.name || createDrawingMutation.isPending}
                  className="btn-primary">
                  {createDrawingMutation.isPending ? 'Registering...' : 'Register Drawing'}
                </button>
              </div>
            </div>
          )}

          {/* Drawings table */}
          <div className="card overflow-hidden p-0">
            <div className="card-header">
              <span className="font-medium text-sm">Drawing Register</span>
              <span className="text-xs text-gray-400">{drawList.length} drawings</span>
            </div>
            {drawList.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No drawings found.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Drawing Name</th><th>Category</th><th>Revision</th>
                    <th>State</th><th>Received From</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drawList.map((d:any) => (
                    <tr key={d.id}>
                      <td className="font-medium text-sm">{d.name || d.title}</td>
                      <td><span className="badge badge-blue text-xs">{d.category}</span></td>
                      <td className="font-mono text-xs font-medium text-gray-600">{d.revision || 'R0'}</td>
                      <td>
                        <span className={`badge text-xs ${STATUS_COLORS[d.state||d.status]||'badge-gray'}`}>
                          {d.state || d.status || 'Draft'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{d.receivedFrom || '—'}</td>
                      <td className="text-xs text-gray-400">{d.createdAt ? format(new Date(d.createdAt),'dd MMM yyyy') : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {d.fileUrl && (
                            <a href={d.fileUrl} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Download">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {/* DM-EXT-3: versions */}
                          <button onClick={() => { setDrawing(d); setVersions(true); }}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Version history">
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                          {/* DM-EXT-2: release */}
                          {canManage && (d.state === 'Release Drawings' || !d.state) && (
                            <button onClick={() => releaseDrawingMutation.mutate(d.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium">
                              <Send className="w-3 h-3" /> Release
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Version history modal */}
          {showVersions && selectedDrawing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h3 className="font-semibold">Version History</h3>
                    <p className="text-xs text-gray-500">{selectedDrawing.name || selectedDrawing.title}</p>
                  </div>
                  <button onClick={() => setVersions(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                <div className="p-4">
                  {versionList.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No version history yet.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr><th>Version</th><th>Revision</th><th>Status</th><th>By</th><th>Date</th><th></th></tr>
                      </thead>
                      <tbody>
                        {versionList.map((v:any) => (
                          <tr key={v.id}>
                            <td className="font-mono text-sm">v{v.versionNumber}</td>
                            <td className="font-mono text-xs font-medium">{v.revision}</td>
                            <td>
                              <span className={`badge text-xs ${v.status==='Current'?'badge-green':'badge-gray'}`}>
                                {v.status}
                              </span>
                            </td>
                            <td className="text-xs text-gray-500">{v.revisedByName}</td>
                            <td className="text-xs text-gray-400">{format(new Date(v.createdAt),'dd MMM yyyy')}</td>
                            <td>
                              {v.fileUrl && (
                                <a href={v.fileUrl} target="_blank" rel="noreferrer"
                                  className="text-xs text-blue-600 hover:underline">
                                  <Download className="w-3 h-3 inline" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Change Requests (DM-EXT-4, 5) ── */}
      {tab === 'changes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* CR list */}
          <div className="lg:col-span-2 card overflow-hidden p-0">
            <div className="card-header">
              <span className="font-medium text-sm">Change Requests</span>
              {canManage && (
                <button className="btn-primary btn-sm flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> New CR
                </button>
              )}
            </div>
            {changeList.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No change requests found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {changeList.map((cr:any) => (
                  <div key={cr.id} onClick={() => setCR(cr)}
                    className={clsx('p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                      selectedCR?.id === cr.id && 'bg-yellow-50')}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm truncate">{cr.changeRequestNumber || cr.title}</span>
                          <span className={`badge text-xs ${STATUS_COLORS[cr.status]||'badge-blue'}`}>
                            {CR_STAGE_LABEL[cr.status] || cr.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{cr.details || cr.description}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{cr.projectName} · {cr.createdByName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CR detail + lifecycle */}
          {selectedCR ? (
            <div className="card space-y-4">
              <div>
                <p className="font-semibold text-gray-800">{selectedCR.changeRequestNumber || selectedCR.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedCR.projectName}</p>
              </div>

              {/* Stage stepper (DM-EXT-5) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lifecycle</p>
                <div className="space-y-1.5">
                  {['Draft','UnderReview','EvaluateImpact','PrepareChangeOrder','ReviewByHOD','UpdateProjectPlan','MakeChange','ChangeCompleted'].map((stage, i) => {
                    const stageIdx  = CR_STAGES.indexOf(selectedCR.status);
                    const thisIdx   = CR_STAGES.indexOf(stage);
                    const isDone    = thisIdx < stageIdx;
                    const isCurrent = stage === selectedCR.status;
                    return (
                      <div key={stage} className={clsx('flex items-center gap-2 text-xs p-1.5 rounded',
                        isCurrent && 'bg-yellow-50 text-yellow-700 font-medium')}>
                        <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0',
                          isDone  ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-yellow-400 text-gray-900' : 'bg-gray-200 text-gray-400')}>
                          {isDone ? '✓' : i+1}
                        </div>
                        {CR_STAGE_LABEL[stage] || stage}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advance CR */}
              {canManage && CR_NEXT[selectedCR.status] && (
                <div className="border-t pt-3">
                  <textarea className="form-input text-sm w-full" rows={2}
                    placeholder="Comments / notes..."
                    value={crAdvanceNote} onChange={e => setCrNote(e.target.value)} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => advanceCRMutation.mutate({ id:selectedCR.id, toState:CR_NEXT[selectedCR.status] })}
                      disabled={advanceCRMutation.isPending}
                      className="btn-primary text-xs flex-1">
                      → {CR_STAGE_LABEL[CR_NEXT[selectedCR.status]]}
                    </button>
                    <button onClick={() => advanceCRMutation.mutate({ id:selectedCR.id, toState:'ProjectIssueLog' })}
                      className="btn-ghost text-xs text-red-500 border border-red-200">
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Audit log */}
              {(crLog as any[])?.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Activity Log</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(crLog as any[]).map((l:any) => (
                      <div key={l.id} className="text-xs">
                        <span className="text-gray-400">{format(new Date(l.changedAt),'dd MMM HH:mm')} · {l.changedByName}</span>
                        <p className="text-gray-700">{l.fromState} → <strong>{l.toState}</strong></p>
                        {l.comments && <p className="text-gray-500 italic">{l.comments}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              <p className="text-sm">Select a change request to view its lifecycle</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
