// src/pages/ProcurementPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, ChevronRight, Loader2, X, ArrowRight } from 'lucide-react';
import { procurementApi, projectsApi } from '../lib/api';
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
  const [subTab, setSubTab] = useState<'mr' | 'po'>('mr');
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
                ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-400" /></td></tr>
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
                ? <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-400" /></td></tr>
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
