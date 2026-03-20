// src/pages/ProcurementPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, ChevronRight, Loader2, X, ArrowRight } from 'lucide-react';
import { procurementApi, projectsApi, api } from '../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

const MR_STATUS: Record<number, { label: string; cls: string; next?: string }> = {
  1: { label: 'Draft',             cls: 'badge-gray',   next: 'Submit'           },
  2: { label: 'Submitted',         cls: 'badge-yellow', next: 'PM Approve'       },
  3: { label: 'PM Approved',       cls: 'badge-blue',   next: 'Send to Purchase' },
  4: { label: 'Sent to Purchase',  cls: 'badge-blue',   next: 'Mark Quotation'   },
  5: { label: 'Quotation Received',cls: 'badge-blue',   next: 'Create PO'        },
  6: { label: 'PO Generated',      cls: 'badge-green',  next: 'Mark Delivered'   },
  7: { label: 'Part Delivered',    cls: 'badge-orange', next: 'Full Delivery'     },
  8: { label: 'Delivered',         cls: 'badge-green',  next: 'Close'            },
  9: { label: 'Closed',            cls: 'badge-gray'                             },
};
const getNextAction = (status: string): string => {
  const flow: Record<string, string> = {
    Draft: 'Submit', Submitted: 'PMApprove', PMApproved: 'SendToPurchase',
    SentToPurchase: 'QuotationReceived', QuotationReceived: 'GeneratePO',
    POGenerated: 'PartDelivery', PartDelivered: 'FullDelivery', Delivered: 'Close',
  };
  return flow[status] ?? 'Close';
};



export default function ProcurementPage() {
  const [subTab, setSubTab] = useState<'mr' | 'po' | 'quotes' | 'negotiate'>('mr');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMR, setSelectedMR] = useState<any>(null);
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: mrs, isLoading: mrsLoading } = useQuery({
    queryKey: ['material-requests', subTab],
    queryFn:  () => procurementApi.getMRs().then(r => r.data),
    enabled:  subTab === 'mr',
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/procurement/vendors').then(r => r.data),
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes', selectedMRForQuotes],
    queryFn: () => api.get('/quotations', { params: { mrId: selectedMRForQuotes } }).then(r => r.data),
    enabled: subTab === 'quotes' && !!selectedMRForQuotes,
  });

  const { data: negotiations } = useQuery({
    queryKey: ['negotiations', selectedMRForQuotes],
    queryFn: () => api.get('/negotiations', { params: { mrId: selectedMRForQuotes } }).then(r => r.data),
    enabled: subTab === 'negotiate' && !!selectedMRForQuotes,
  });

  const addQuoteMutation = useMutation({
    mutationFn: () => api.post('/quotations', {
      materialRequestId: selectedMRForQuotes,
      vendorId: newQuote.vendorId,
      unitPrice: Number(newQuote.unitPrice),
      leadTimeDays: newQuote.leadDays ? Number(newQuote.leadDays) : undefined,
      paymentTerms: newQuote.paymentTerms || undefined,
    }),
    onSuccess: () => { toast.success('Quotation added'); qc.invalidateQueries({ queryKey:['quotes'] }); setNewQuote({vendorId:'',unitPrice:'',leadDays:'',paymentTerms:''}); },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const selectVendorMutation = useMutation({
    mutationFn: ({ quoteId, justification }: { quoteId:string; justification?:string }) =>
      api.post(`/quotations/${quoteId}/select`, { justification }),
    onSuccess: () => { toast.success('Vendor selected'); qc.invalidateQueries({ queryKey:['quotes'] }); },
  });

  const addNegMutation = useMutation({
    mutationFn: () => api.post('/negotiations', {
      materialRequestId: newNeg.mrId || selectedMRForQuotes,
      vendorId: newNeg.vendorId,
      negotiatedPrice: Number(newNeg.price),
      initialPrice: newNeg.initial ? Number(newNeg.initial) : undefined,
      notes: newNeg.notes || undefined,
    }),
    onSuccess: () => { toast.success('Negotiation round logged'); qc.invalidateQueries({ queryKey:['negotiations'] }); setNewNeg({mrId:'',vendorId:'',price:'',initial:'',notes:''}); },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const { data: pos, isLoading: posLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn:  () => procurementApi.getPOs().then(r => r.data),
    enabled:  subTab === 'po',
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createMR(data),
    onSuccess: () => {
      toast.success('Material request created');
      qc.invalidateQueries({ queryKey: ['material-requests'] });
      setShowCreate(false); reset();
    },
    onError: () => toast.error('Failed to create request'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => procurementApi.advanceMR(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['material-requests'] });
      setSelectedMR(null);
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Procurement Tracker</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Track material requests through the 9-stage procurement workflow
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New MR
        </button>
      </div>

      {/* Workflow legend */}
      <div className="card p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Procurement Workflow</p>
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(MR_STATUS).map(([id, s], idx) => (
            <div key={id} className="flex items-center gap-1">
              <span className={clsx(s.cls, 'text-[10px]')}>{s.label}</span>
              {idx < 8 && <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="tabs">
        <button className={clsx('tab-item', subTab === 'mr' && 'active')} onClick={() => setSubTab('mr')}>
          Material Requests {mrs?.length > 0 && `(${mrs.length})`}
        </button>
        <button className={clsx('tab-item', subTab === 'po' && 'active')} onClick={() => setSubTab('po')}>
          Purchase Orders {pos?.length > 0 && `(${pos.length})`}
        </button>
      </div>

      {subTab === 'mr' && (
        <div className="table-wrap">
          <table className="table table-clickable">
            <thead>
              <tr>
                <th>MR Number</th><th>Project</th><th>Description</th>
                <th>Priority</th><th>Requested By</th><th>Date</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {mrsLoading
                ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                : !mrs?.length
                  ? <tr><td colSpan={8} className="text-center py-12 text-[var(--text-secondary)]">No material requests yet</td></tr>
                  : mrs.map((mr: any) => (
                    <tr key={mr.id} onClick={() => setSelectedMR(mr)}>
                      <td className="font-mono text-xs font-medium">{mr.mrNumber}</td>
                      <td className="text-sm">{mr.projectName}</td>
                      <td className="text-sm max-w-52">
                        <p className="truncate">{mr.description}</p>
                      </td>
                      <td>
                        <span className={mr.priority === 'High' ? 'badge-red' : mr.priority === 'Medium' ? 'badge-yellow' : 'badge-gray'}>
                          {mr.priority}
                        </span>
                      </td>
                      <td className="text-sm">{mr.requestedByName}</td>
                      <td className="text-xs text-[var(--text-secondary)]">
                        {mr.requestDate ? format(new Date(mr.requestDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td><span className={MR_STATUS[mr.status]?.cls ?? 'badge-gray'}>{MR_STATUS[mr.status]?.label}</span></td>
                      <td><ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" /></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'po' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>PO Number</th><th>Vendor</th><th>Project</th><th>Amount (USD)</th><th>Issued Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {posLoading
                ? <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                : !pos?.length
                  ? <tr><td colSpan={6} className="text-center py-12 text-[var(--text-secondary)]">No purchase orders yet</td></tr>
                  : pos.map((po: any) => (
                    <tr key={po.poId}>
                      <td className="font-mono text-xs font-medium">{po.poNumber}</td>
                      <td className="text-sm">{po.vendorName}</td>
                      <td className="text-sm">{po.projectName}</td>
                      <td className="font-medium">${(po.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="text-xs text-[var(--text-secondary)]">
                        {po.issueDate ? format(new Date(po.issueDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td><span className="badge-blue">{po.statusLabel}</span></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Quotation Comparison Tab */}
      {subTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="select flex-1 max-w-xs"
              value={selectedMRForQuotes} onChange={e => setMRForQuotes(e.target.value)}>
              <option value="">Select an MR to view/add quotations...</option>
              {(mrs || []).map((mr: any) => (
                <option key={mr.id} value={mr.id}>{mr.mrNumber} — {mr.title || 'MR'}</option>
              ))}
            </select>
          </div>

          {selectedMRForQuotes && (
            <>
              {/* Add quotation form */}
              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Add Vendor Quotation</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Vendor *</label>
                    <select className="select w-full mt-1 text-sm"
                      value={newQuote.vendorId} onChange={e => setNewQuote(q => ({...q, vendorId: e.target.value}))}>
                      <option value="">Select vendor...</option>
                      {((vendors as any[]) || []).map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Unit Price (USD) *</label>
                    <input type="number" className="input w-full mt-1 text-sm"
                      placeholder="0.00" min="0" value={newQuote.unitPrice}
                      onChange={e => setNewQuote(q => ({...q, unitPrice: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Lead Time (days)</label>
                    <input type="number" className="input w-full mt-1 text-sm"
                      placeholder="0" min="0" value={newQuote.leadDays}
                      onChange={e => setNewQuote(q => ({...q, leadDays: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Payment Terms</label>
                    <input className="input w-full mt-1 text-sm"
                      placeholder="e.g. Net 30" value={newQuote.paymentTerms}
                      onChange={e => setNewQuote(q => ({...q, paymentTerms: e.target.value}))} />
                  </div>
                </div>
                <button className="btn-primary text-sm mt-3"
                  disabled={!newQuote.vendorId || !newQuote.unitPrice || addQuoteMutation.isPending}
                  onClick={() => addQuoteMutation.mutate()}>
                  {addQuoteMutation.isPending ? 'Adding...' : 'Add Quotation'}
                </button>
              </div>

              {/* Comparison table */}
              {(quotes as any[] || []).length === 0 ? (
                <div className="card p-8 text-center text-gray-400">
                  No quotations yet for this MR. Add vendor quotes above.
                </div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <div className="card-header">
                    <span className="font-medium text-sm">Vendor Comparison</span>
                    <span className="text-xs text-gray-400">⭐ = Recommended (lowest price)</span>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-center">Lead Time</th>
                        <th>Payment Terms</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(quotes as any[]).sort((a: any, b: any) => a.unitPrice - b.unitPrice).map((q: any) => (
                        <tr key={q.id} className={q.isSelected ? 'bg-green-50' : q.isRecommended ? 'bg-[rgba(209,17,28,0.04)]' : ''}>
                          <td className="font-medium">
                            {q.isRecommended && <span className="text-yellow-500 mr-1">⭐</span>}
                            {q.vendorName}
                          </td>
                          <td className="text-right font-bold text-gray-800">
                            ${q.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-center text-sm">{q.leadTimeDays ? `${q.leadTimeDays}d` : '—'}</td>
                          <td className="text-sm text-gray-600">{q.paymentTerms || '—'}</td>
                          <td>
                            {q.isSelected
                              ? <span className="badge badge-green text-xs">✓ Selected</span>
                              : q.isRecommended
                              ? <span className="badge badge-yellow text-xs">Recommended</span>
                              : <span className="badge badge-gray text-xs">Pending</span>
                            }
                          </td>
                          <td>
                            {!q.isSelected && (
                              <button
                                onClick={() => {
                                  const j = prompt('Justification for selecting this vendor (optional):') ?? '';
                                  selectVendorMutation.mutate({ quoteId: q.id, justification: j });
                                }}
                                className="btn-primary btn-sm text-xs">
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Negotiations Tab */}
      {subTab === 'negotiate' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="select flex-1 max-w-xs"
              value={selectedMRForQuotes} onChange={e => setMRForQuotes(e.target.value)}>
              <option value="">Select an MR...</option>
              {(mrs || []).map((mr: any) => (
                <option key={mr.id} value={mr.id}>{mr.mrNumber}</option>
              ))}
            </select>
          </div>

          {selectedMRForQuotes && (
            <>
              <div className="card p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Log Negotiation Round</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Vendor *</label>
                    <select className="select w-full mt-1 text-sm"
                      value={newNeg.vendorId} onChange={e => setNewNeg(n => ({...n, vendorId: e.target.value}))}>
                      <option value="">Select vendor...</option>
                      {((vendors as any[]) || []).map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Initial Quote Price</label>
                    <input type="number" className="input w-full mt-1 text-sm"
                      placeholder="Original price" value={newNeg.initial}
                      onChange={e => setNewNeg(n => ({...n, initial: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Negotiated Price *</label>
                    <input type="number" className="input w-full mt-1 text-sm"
                      placeholder="After negotiation" value={newNeg.price}
                      onChange={e => setNewNeg(n => ({...n, price: e.target.value}))} />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-xs text-gray-500">Notes</label>
                    <input className="input w-full mt-1 text-sm"
                      placeholder="Terms agreed, conditions..." value={newNeg.notes}
                      onChange={e => setNewNeg(n => ({...n, notes: e.target.value}))} />
                  </div>
                </div>
                <button className="btn-primary text-sm mt-3"
                  disabled={!newNeg.vendorId || !newNeg.price || addNegMutation.isPending}
                  onClick={() => addNegMutation.mutate()}>
                  {addNegMutation.isPending ? 'Logging...' : 'Log Negotiation'}
                </button>
              </div>

              {(negotiations as any[] || []).length === 0 ? (
                <div className="card p-8 text-center text-gray-400">No negotiations logged yet</div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <table className="table">
                    <thead>
                      <tr><th>Vendor</th><th>Round</th><th>Initial Price</th><th>Negotiated</th><th>Saving</th><th>Notes</th><th>Logged By</th></tr>
                    </thead>
                    <tbody>
                      {(negotiations as any[]).map((n: any) => (
                        <tr key={n.id}>
                          <td className="font-medium">{n.vendorName}</td>
                          <td className="text-center"><span className="badge badge-blue text-xs">Round {n.round}</span></td>
                          <td className="text-sm">{n.initialPrice ? `$${n.initialPrice.toLocaleString()}` : '—'}</td>
                          <td className="font-medium text-blue-600">${n.negotiatedPrice.toLocaleString()}</td>
                          <td>
                            {n.saving != null && (
                              <span className={n.saving > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
                                {n.saving > 0 ? '-' : '+'} ${Math.abs(n.saving).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="text-sm text-gray-500 max-w-xs truncate">{n.notes || '—'}</td>
                          <td className="text-xs text-gray-400">{n.loggedByName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create MR Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal max-w-xl w-full">
            <div className="modal-header">
              <h2 className="font-semibold text-base">New Material Request</h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="input-group col-span-2">
                  <label className="input-label">Project *</label>
                  <select className="select" {...register('projectId', { valueAsNumber: true })}>
                    <option value="">Select project…</option>
                    {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="input-group col-span-2">
                  <label className="input-label">Description *</label>
                  <textarea className="textarea" rows={2} placeholder="What materials are required?" {...register('description')} />
                </div>
                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <select className="select" {...register('priority')}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Required By Date</label>
                  <input type="date" className="input" {...register('requiredByDate')} />
                </div>
                <div className="input-group col-span-2">
                  <label className="input-label">Specifications / Notes</label>
                  <textarea className="textarea" rows={2} placeholder="Technical specs, quantity, brand…" {...register('specifications')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating…' : 'Submit MR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MR Detail Modal */}
      {selectedMR && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedMR(null)}>
          <div className="modal max-w-lg w-full">
            <div className="modal-header">
              <div>
                <h2 className="font-semibold">{selectedMR.mrNumber}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedMR.projectName}</p>
              </div>
              <button className="btn-icon btn-ghost" onClick={() => setSelectedMR(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status</span>
                <span className={MR_STATUS[selectedMR.status]?.cls ?? 'badge-gray'}>
                  {MR_STATUS[selectedMR.status]?.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Description</p>
                <p className="text-sm bg-[var(--bg-secondary)] rounded-lg p-3">{selectedMR.description}</p>
              </div>
              {selectedMR.status !== "Closed" && (
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1"
                    onClick={() => statusMutation.mutate({ id: selectedMR.id, action: getNextAction(selectedMR.status) })}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'Updating…' : `→ ${MR_STATUS[selectedMR.status]?.next}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
