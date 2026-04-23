// src/pages/ProcurementPage.tsx — Full 9-stage MR workflow, detail panel, PO tab
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, ChevronRight, Loader2, X, ArrowRight, Trash2, CheckCircle } from 'lucide-react';
import { procurementApi, projectsApi, api } from '../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

// ── 9-stage workflow definition ───────────────────────────────
const STAGES: Record<string, { label: string; badge: string; action?: string; actionLabel?: string }> = {
  Draft:             { label: 'Draft',              badge: 'badge-gray',   action: 'Submit',            actionLabel: 'Submit MR'          },
  Submitted:         { label: 'Submitted',           badge: 'badge-yellow', action: 'PMApprove',         actionLabel: 'PM Approve'         },
  PMApproved:        { label: 'PM Approved',         badge: 'badge-blue',   action: 'SendToPurchase',    actionLabel: 'Send to Purchase'   },
  SentToPurchase:    { label: 'Sent to Purchase',    badge: 'badge-blue',   action: 'QuotationReceived', actionLabel: 'Mark Quotation Rcvd'},
  QuotationReceived: { label: 'Quotation Received',  badge: 'badge-blue',   action: 'GeneratePO',        actionLabel: 'Generate PO'        },
  POGenerated:       { label: 'PO Generated',        badge: 'badge-green',  action: 'PartDelivery',      actionLabel: 'Mark Part Delivered'},
  PartDelivered:     { label: 'Part Delivered',      badge: 'badge-orange', action: 'FullDelivery',      actionLabel: 'Mark Delivered'     },
  Delivered:         { label: 'Delivered',           badge: 'badge-green',  action: 'Close',             actionLabel: 'Close MR'           },
  Closed:            { label: 'Closed',              badge: 'badge-gray'                                                                   },
};
const STAGE_ORDER = ['Draft','Submitted','PMApproved','SentToPurchase','QuotationReceived','POGenerated','PartDelivered','Delivered','Closed'];


export default function ProcurementPage() {
  const qc = useQueryClient();
  const [subTab,      setSubTab]      = useState<'mr' | 'po'>('mr');
  const [showCreate,  setShowCreate]  = useState(false);
  const [selectedMR,  setSelectedMR]  = useState<any>(null);
  const [filterStatus,setFilterStatus]= useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: mrs, isLoading: mrsLoading } = useQuery({
    queryKey: ['material-requests'],
    queryFn:  () => procurementApi.getMRs({ page: 1 }).then(r => r.data),
    enabled:  subTab === 'mr',
  });

  const { data: pos, isLoading: posLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn:  () => procurementApi.getPOs().then(r => r.data),
    enabled:  subTab === 'po',
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>();

  const [advanceRemark, setAdvanceRemark] = useState('');

  // Create MR mutation
  const createMutation = useMutation({
    mutationFn: (d: any) => procurementApi.createMR({
      projectId:    d.projectId,
      title:        d.description,
      justification:d.specifications || null,
      requiredDate: d.requiredByDate || null,
      priority:     'Normal',   // default, field hidden from UI per obs #14
      items: [{ description: d.description, unit: d.unit || 'Nos', quantity: d.quantity || 1, estimatedCost: null }],
    }),
    onSuccess: () => {
      toast.success('Material Request created — status: Draft');
      qc.invalidateQueries({ queryKey: ['material-requests'] });
      setShowCreate(false); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.response?.data?.inner || 'Failed to create MR'),
  });

  // Advance MR status mutation
  const advanceMutation = useMutation({
    mutationFn: ({ id, action, remark }: { id: string; action: string; remark?: string }) =>
      procurementApi.advanceMR(id, action, remark),
    onSuccess: (res) => {
      toast.success(`MR advanced to: ${STAGES[res.data?.status]?.label || 'next stage'}`);
      qc.invalidateQueries({ queryKey: ['material-requests'] });
      setAdvanceRemark('');
      // Refresh selected MR with updated data
      if (selectedMR) setSelectedMR((prev: any) => ({ ...prev, ...res.data }));
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to advance MR'),
  });

  // Delete MR mutation
  const deleteMRMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/procurement/material-requests/${id}`),
    onSuccess: () => {
      toast.success('Material Request deleted');
      qc.invalidateQueries({ queryKey: ['material-requests'] });
      setSelectedMR(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete MR'),
  });

  const mrList: any[] = Array.isArray(mrs) ? mrs : (mrs as any)?.items ?? [];
  const poList: any[] = Array.isArray(pos) ? pos : (pos as any)?.items ?? [];

  // Filter MRs
  const filteredMRs = filterStatus
    ? mrList.filter((mr: any) => mr.status === filterStatus)
    : mrList;

  // Current stage index for stepper
  const currentStageIdx = (status: string) => STAGE_ORDER.indexOf(status);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Procurement Tracker</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>
            Track material requests through the 9-stage procurement workflow
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New MR
        </button>
      </div>

      {/* 9-stage workflow banner */}
      <div className="card" style={{padding:'12px 16px'}}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:'var(--text-secondary)'}}>
          Procurement Workflow — 9 Stages
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {STAGE_ORDER.map((stage, idx) => (
            <div key={stage} className="flex items-center gap-1">
              <span className={clsx(STAGES[stage].badge, 'text-[10px] whitespace-nowrap')}>
                {idx + 1}. {STAGES[stage].label}
              </span>
              {idx < 8 && <ArrowRight className="w-3 h-3 flex-shrink-0" style={{color:'var(--text-muted)'}} />}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={clsx('tab-item', subTab === 'mr' && 'active')} onClick={() => setSubTab('mr')}>
          Material Requests {mrList.length > 0 && `(${mrList.length})`}
        </button>
        <button className={clsx('tab-item', subTab === 'po' && 'active')} onClick={() => setSubTab('po')}>
          Purchase Orders {poList.length > 0 && `(${poList.length})`}
        </button>
      </div>

      {/* MR Tab */}
      {subTab === 'mr' && (
        <>
          {/* Status filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{color:'var(--text-secondary)'}}>Filter by status:</label>
            <select className="form-select w-48" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGES[s].label}</option>)}
            </select>
            {filterStatus && (
              <button className="text-xs" style={{color:'var(--primary)'}} onClick={() => setFilterStatus('')}>Clear</button>
            )}
          </div>

          <div className="table-wrap">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>MR Number</th><th>Title</th><th>Project</th>
                  <th>Required By</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {mrsLoading
                  ? <tr><td colSpan={6} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} />
                    </td></tr>
                  : !filteredMRs.length
                    ? <tr><td colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <ShoppingCart className="w-10 h-10 opacity-20" />
                          <p style={{color:'var(--text-secondary)'}}>
                            {filterStatus ? `No MRs with status "${STAGES[filterStatus]?.label}"` : 'No material requests yet'}
                          </p>
                          {!filterStatus && (
                            <button className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                              <Plus className="w-4 h-4" /> Create First MR
                            </button>
                          )}
                        </div>
                      </td></tr>
                    : filteredMRs.map((mr: any) => (
                      <tr key={mr.id} onClick={() => setSelectedMR(mr)}>
                        <td className="font-mono text-xs font-bold" style={{color:'var(--primary)'}}>{mr.mrNumber}</td>
                        <td className="font-medium text-sm max-w-xs">
                          <p className="truncate">{mr.title || mr.description}</p>
                        </td>
                        <td className="text-sm">{mr.projectName}</td>
                        <td className="text-xs" style={{color:'var(--text-secondary)'}}>
                          {mr.requiredDate ? format(new Date(mr.requiredDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td>
                          <span className={clsx(STAGES[mr.status]?.badge || 'badge-gray', 'text-xs')}>
                            {STAGES[mr.status]?.label || mr.status}
                          </span>
                        </td>
                        <td><ChevronRight className="w-4 h-4" style={{color:'var(--text-muted)'}} /></td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* PO Tab */}
      {subTab === 'po' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th><th>Vendor</th><th>Project</th>
                <th className="text-right">Total Amount</th><th>Currency</th>
                <th>PO Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {posLoading
                ? <tr><td colSpan={7} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} />
                  </td></tr>
                : !poList.length
                  ? <tr><td colSpan={7} className="py-12 text-center" style={{color:'var(--text-secondary)'}}>
                      No purchase orders yet. MRs must reach "Quotation Received" stage to generate POs.
                    </td></tr>
                  : poList.map((po: any) => (
                    <tr key={po.id}>
                      <td className="font-mono text-xs font-bold" style={{color:'var(--primary)'}}>{po.poNumber}</td>
                      <td className="font-medium">{po.vendorName}</td>
                      <td className="text-sm">{po.projectName}</td>
                      <td className="text-right font-bold">{po.totalAmount?.toLocaleString()}</td>
                      <td className="text-sm">{po.currency}</td>
                      <td className="text-xs" style={{color:'var(--text-secondary)'}}>
                        {po.poDate ? format(new Date(po.poDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>
                        <span className={clsx(
                          po.status === 'FullDelivery' || po.status === 'Closed' ? 'badge-green' :
                          po.status === 'PartialDelivery' ? 'badge-orange' : 'badge-blue', 'text-xs')}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create MR Modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal max-w-lg w-full">
            <div className="modal-header">
              <h2 className="font-semibold">New Material Request</h2>
              <button className="modal-close" onClick={() => { setShowCreate(false); reset(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Project *</label>
                  <select className="form-select" {...register('projectId', { required: 'Project is required' })}>
                    <option value="">Select project…</option>
                    {(projects as any[] || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Description / Title *</label>
                  <textarea className="form-input" rows={2}
                    placeholder="What materials are required? (required)"
                    {...register('description', { required: 'Description is required' })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" min="1" className="form-input" defaultValue={1}
                    {...register('quantity', { valueAsNumber: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input type="text" className="form-input" defaultValue="Nos"
                    placeholder="e.g. Nos, kg, m" {...register('unit')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Required By Date</label>
                  <input type="date" className="form-input" {...register('requiredByDate')} />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Specifications / Justification</label>
                  <textarea className="form-input" rows={2}
                    placeholder="Technical specs, brand preference, justification…"
                    {...register('specifications')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Submit MR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MR Detail Panel ── */}
      {selectedMR && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedMR(null)}>
          <div className="modal max-w-2xl w-full">
            <div className="modal-header">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base" style={{color:'var(--primary)'}}>{selectedMR.mrNumber}</h2>
                  <span className={clsx(STAGES[selectedMR.status]?.badge || 'badge-gray', 'text-xs')}>
                    {STAGES[selectedMR.status]?.label || selectedMR.status}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{color:'var(--text-secondary)'}}>
                  {selectedMR.projectName} · {selectedMR.requestedByName}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedMR(null)}>✕</button>
            </div>

            <div className="modal-body space-y-5">

              {/* 9-stage workflow stepper */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:'var(--text-secondary)'}}>
                  Workflow Progress
                </p>
                <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
                  {STAGE_ORDER.map((stage, idx) => {
                    const stageIdx   = currentStageIdx(selectedMR.status);
                    const isDone     = idx < stageIdx;
                    const isCurrent  = idx === stageIdx;
                    const isPending  = idx > stageIdx;
                    return (
                      <div key={stage} className="flex items-center gap-0.5 flex-shrink-0">
                        <div className={clsx(
                          'flex flex-col items-center gap-1',
                          isCurrent ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-40'
                        )}>
                          <div className={clsx(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                            isDone    ? 'bg-green-500 text-white' :
                            isCurrent ? 'text-white'              : 'bg-gray-200 text-gray-500'
                          )} style={isCurrent ? {background:'var(--primary)'} : {}}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <p className="text-[9px] text-center max-w-[52px] leading-tight" style={{color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)'}}>
                            {STAGES[stage].label}
                          </p>
                        </div>
                        {idx < 8 && (
                          <div className="w-4 h-px flex-shrink-0 mt-[-10px]"
                            style={{background: isDone ? '#16A34A' : 'var(--border)'}} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MR Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-xs font-medium mb-1" style={{color:'var(--text-secondary)'}}>Title / Description</p>
                  <p className="font-medium">{selectedMR.title || selectedMR.description || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{color:'var(--text-secondary)'}}>Required By</p>
                  <p>{selectedMR.requiredDate ? format(new Date(selectedMR.requiredDate), 'dd MMM yyyy') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{color:'var(--text-secondary)'}}>Created</p>
                  <p>{selectedMR.createdAt ? format(new Date(selectedMR.createdAt), 'dd MMM yyyy') : '—'}</p>
                </div>
                {selectedMR.justification && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium mb-1" style={{color:'var(--text-secondary)'}}>Justification / Specs</p>
                    <p className="p-2 rounded-lg text-sm" style={{background:'var(--bg-secondary)'}}>
                      {selectedMR.justification}
                    </p>
                  </div>
                )}
                {selectedMR.lastRemark && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium mb-1" style={{color:'var(--text-secondary)'}}>Last Remark</p>
                    <p className="p-2 rounded-lg text-sm border border-yellow-200 bg-yellow-50 text-yellow-800">
                      💬 {selectedMR.lastRemark}
                    </p>
                  </div>
                )}
              </div>

              {/* Line items */}
              {selectedMR.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:'var(--text-secondary)'}}>
                    Line Items ({selectedMR.items.length})
                  </p>
                  <div className="table-wrap" style={{maxHeight:'150px', overflowY:'auto'}}>
                    <table className="table">
                      <thead>
                        <tr><th>Description</th><th>Unit</th><th className="text-right">Qty</th><th className="text-right">Est. Cost</th></tr>
                      </thead>
                      <tbody>
                        {selectedMR.items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td>{item.description}</td>
                            <td>{item.unit}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">{item.estimatedCost ? `$${item.estimatedCost}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer flex-col gap-3 items-stretch">
              {/* Advance remark — shown when there is an action available */}
              {selectedMR.status !== 'Closed' && STAGES[selectedMR.status]?.action && (
                <textarea
                  className="form-input w-full text-sm resize-none"
                  rows={2}
                  placeholder="Remark (optional)"
                  value={advanceRemark}
                  onChange={e => setAdvanceRemark(e.target.value)}
                />
              )}

              <div className="flex items-center gap-2 w-full">
                {/* Delete button — only for Draft */}
                {selectedMR.status === 'Draft' && (
                  <button
                    className="btn-outline mr-auto"
                    style={{borderColor:'var(--primary)', color:'var(--primary)'}}
                    onClick={() => {
                      if (confirm(`Delete MR "${selectedMR.mrNumber}"? This cannot be undone.`)) {
                        deleteMRMutation.mutate(selectedMR.id);
                      }
                    }}
                    disabled={deleteMRMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleteMRMutation.isPending ? 'Deleting…' : 'Delete MR'}
                  </button>
                )}

                <button className="btn-outline ml-auto" onClick={() => setSelectedMR(null)}>Close</button>

                {/* Advance button — hidden for Closed */}
                {selectedMR.status !== 'Closed' && STAGES[selectedMR.status]?.action && (
                  <button
                    className="btn-primary"
                    onClick={() => advanceMutation.mutate({
                      id:     selectedMR.id,
                      action: STAGES[selectedMR.status].action!,
                      remark: advanceRemark,
                    })}
                    disabled={advanceMutation.isPending}
                  >
                    {advanceMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                      : <><CheckCircle className="w-4 h-4" /> {STAGES[selectedMR.status].actionLabel}</>
                    }
                  </button>
                )}

                {selectedMR.status === 'Closed' && (
                  <span className="badge-gray px-3 py-1.5 text-sm font-medium">
                    ✓ Closed — no further action
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
