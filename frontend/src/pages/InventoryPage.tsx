// src/pages/InventoryPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, ArrowLeftRight, Loader2, X, Search } from 'lucide-react';
import { inventoryApi, projectsApi, api } from '../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

const ENTRY_TYPES = [
  { value: 'PO_Receipt',    label: 'PO Receipt (GRN)'   },
  { value: 'Task_Issue',    label: 'Issue to Task'       },
  { value: 'Return',        label: 'Return'              },
  { value: 'Adjustment',    label: 'Adjustment'          },
  { value: 'Opening',       label: 'Opening Balance'     },
];

export default function InventoryPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId]   = useState('');
  const [subTab,    setSubTab]       = useState<'stock' | 'ledger' | 'transfers'>('stock');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showIssue,    setShowIssue]    = useState(false);
  const [issueTarget,  setIssueTarget]  = useState<any>(null);  // the stock row being issued
  const [issueQty,     setIssueQty]     = useState('');
  const [issueNotes,   setIssueNotes]   = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [receiptForm, setReceiptForm] = useState({
    materialId: '', materialName: '', transactionType: 'PO_Receipt',
    quantity: '', unitCost: '', notes: '', referenceNo: ''
  });
  const [transferForm, setTransferForm] = useState({
    materialId: '', materialName: '',
    toProjectId: '', quantity: '', notes: ''
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: materials } = useQuery({
    queryKey: ['materials-search', materialSearch],
    queryFn:  () => inventoryApi.getMaterials({ search: materialSearch, pageSize: 50 }).then(r => r.data),
    enabled:  materialSearch.length >= 1 || showReceipt || showTransfer,
  });

  const { data: stockLedger, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ['stock-ledger', projectId],
    queryFn:  () => inventoryApi.getLedger({ projectId }).then(r => r.data),
    enabled:  !!projectId,
  });

  const { data: transfers, isLoading: transLoading } = useQuery({
    queryKey: ['transfers', projectId],
    queryFn:  () => inventoryApi.getTransfers(projectId).then(r => r.data),
    enabled:  !!projectId && subTab === 'transfers',
  });

  // Calculate stock summary from ledger
  const stockSummary = (() => {
    if (!stockLedger?.length) return [];
    const map: Record<string, any> = {};
    for (const entry of (stockLedger as any[])) {
      const key = entry.materialId || entry.materialName;
      if (!map[key]) map[key] = {
        materialId: entry.materialId, materialName: entry.materialName,
        unit: entry.unit, category: entry.category,
        received: 0, issued: 0, balance: 0,
      };
      const qty = Number(entry.quantity) || 0;
      if (['PO_Receipt','Return','Transfer_In','Opening','Adjustment'].includes(entry.transactionType)) {
        map[key].received += qty;
      } else {
        map[key].issued += qty;
      }
      map[key].balance = map[key].received - map[key].issued;
    }
    return Object.values(map);
  })();

  const issueMutation = useMutation({
    mutationFn: (data: any) => {
      // Validate balance
      if (Number(issueQty) > (issueTarget?.balance ?? 0)) {
        throw new Error(`Only ${issueTarget?.balance} ${issueTarget?.unit || ''} available`);
      }
      return api.post('/inventory/stock-entry', null, {
        params: {
          materialId: data.materialId,
          projectId,
          type:       'Task_Issue',
          qty:        Number(issueQty),
          notes:      issueNotes || undefined,
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      setShowIssue(false);
      setIssueQty(''); setIssueNotes(''); setIssueTarget(null);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Material issued — balance updated'));
    },
    onError: (e: any) => import('react-hot-toast').then(({ default: toast }) =>
      toast.error(e.message || e.response?.data?.message || 'Failed to issue material')),
  });

  const receiptMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/stock-entry', null, {
      params: {
        materialId:      data.materialId,
        projectId,
        type:            data.transactionType,
        qty:             Number(data.quantity),
        cost:            data.unitCost ? Number(data.unitCost) : undefined,
        notes:           data.notes || data.referenceNo || undefined,
      }
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      qc.invalidateQueries({ queryKey: ['materials-search'] });
      setShowReceipt(false);
      setReceiptForm({ materialId:'', materialName:'', transactionType:'PO_Receipt', quantity:'', unitCost:'', notes:'', referenceNo:'' });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Stock entry recorded'));
    },
    onError: (e: any) => import('react-hot-toast').then(({ default: toast }) =>
      toast.error(e.response?.data?.message || e.response?.data?.inner || 'Failed to record entry')),
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/site-transfers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setShowTransfer(false);
      setTransferForm({ materialId:'', materialName:'', toProjectId:'', quantity:'', notes:'' });
      import('react-hot-toast').then(({ default: toast }) => toast.success('Transfer initiated'));
    },
    onError: (e: any) => import('react-hot-toast').then(({ default: toast }) =>
      toast.error(e.response?.data?.message || 'Failed to initiate transfer')),
  });

  const matList: any[] = Array.isArray(materials) ? materials : (materials?.items ?? []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory Management</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>
            Stock ledger, receipts, issues and site transfers
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" onClick={() => setShowTransfer(true)}>
            <ArrowLeftRight className="w-4 h-4" /> Transfer
          </button>
          <button className="btn-primary btn-sm" onClick={() => setShowReceipt(true)}>
            <Plus className="w-4 h-4" /> Record Receipt
          </button>
        </div>
      </div>

      {/* Project selector */}
      <div className="card" style={{padding:'12px 16px'}}>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap" style={{color:'var(--text-secondary)'}}>
            Filter by Project:
          </label>
          <select className="form-select max-w-xs" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {(projects as any[] || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {projectId && (
            <span className="text-xs font-medium px-2 py-1 rounded" style={{background:'var(--primary-light)', color:'var(--primary)'}}>
              {stockSummary.length} materials
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Materials',  value: stockSummary.length,                                        color: 'var(--primary)' },
          { label: 'Low Stock Items',  value: stockSummary.filter((s:any) => s.balance <= 0).length,      color: '#DC2626' },
          { label: 'Total Receipts',   value: stockLedger ? (stockLedger as any[]).filter((e:any) => e.transactionType === 'PO_Receipt').length : 0, color: '#16A34A' },
          { label: 'Total Issues',     value: stockLedger ? (stockLedger as any[]).filter((e:any) => e.transactionType === 'Task_Issue').length : 0,  color: '#D97706' },
        ].map(kpi => (
          <div key={kpi.label} className="stat-card">
            <p className="stat-label">{kpi.label}</p>
            <p className="stat-value" style={{color: kpi.color}}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['stock','Stock Summary'],['ledger','Stock Ledger'],['transfers','Site Transfers']].map(([id,label]) => (
          <button key={id} className={clsx('tab-item', subTab === id && 'active')} onClick={() => setSubTab(id as any)}>
            {label}
          </button>
        ))}
      </div>

      {/* Stock Summary Tab */}
      {subTab === 'stock' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th><th>Category</th><th>Unit</th>
                <th className="text-right">Received</th>
                <th className="text-right">Issued</th>
                <th className="text-right">Balance</th>
                <th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading
                ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} /></td></tr>
                : !stockSummary.length
                  ? <tr><td colSpan={7} className="py-12 text-center" style={{color:'var(--text-secondary)'}}>
                      No stock entries yet. Click <strong>Record Receipt</strong> to add stock.
                    </td></tr>
                  : stockSummary.map((s: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium">{s.materialName}</td>
                      <td className="text-sm" style={{color:'var(--text-secondary)'}}>{s.category || '—'}</td>
                      <td className="text-sm">{s.unit}</td>
                      <td className="text-right font-medium text-green-600">{s.received}</td>
                      <td className="text-right text-orange-600">{s.issued}</td>
                      <td className={clsx('text-right font-bold', s.balance <= 0 ? 'text-red-500' : 'text-green-600')}>
                        {s.balance}
                      </td>
                      <td>
                        {s.balance <= 0
                          ? <span className="badge-red">Low Stock</span>
                          : <span className="badge-green">OK</span>
                        }
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Ledger Tab */}
      {subTab === 'ledger' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Material</th><th>Type</th>
                <th className="text-right">Qty</th><th className="text-right">Unit Cost</th>
                <th className="text-right">Balance After</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading
                ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} /></td></tr>
                : !(stockLedger as any[])?.length
                  ? <tr><td colSpan={7} className="py-10 text-center" style={{color:'var(--text-secondary)'}}>No ledger entries yet</td></tr>
                  : (stockLedger as any[]).map((e: any, i: number) => (
                    <tr key={i}>
                      <td className="text-xs" style={{color:'var(--text-secondary)'}}>
                        {e.transactionDate ? format(new Date(e.transactionDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="font-medium text-sm">{e.materialName}</td>
                      <td>
                        <span className={clsx('badge text-xs',
                          e.transactionType === 'PO_Receipt' ? 'badge-green' :
                          e.transactionType === 'Task_Issue' ? 'badge-orange' : 'badge-blue')}>
                          {ENTRY_TYPES.find(t => t.value === e.transactionType)?.label || e.transactionType}
                        </span>
                      </td>
                      <td className="text-right font-medium">{e.quantity}</td>
                      <td className="text-right" style={{color:'var(--text-secondary)'}}>{e.unitCost ? `$${e.unitCost}` : '—'}</td>
                      <td className="text-right font-bold">{e.balanceAfter ?? '—'}</td>
                      <td className="text-xs" style={{color:'var(--text-secondary)'}}>{e.notes || '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Transfers Tab */}
      {subTab === 'transfers' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Material</th><th>From Project</th>
                <th>To Project</th><th className="text-right">Qty</th>
                <th>Status</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transLoading
                ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{color:'var(--primary)'}} /></td></tr>
                : !(transfers as any[])?.length
                  ? <tr><td colSpan={7} className="py-10 text-center" style={{color:'var(--text-secondary)'}}>No transfers found</td></tr>
                  : (transfers as any[]).map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="text-xs">{t.transferDate ? format(new Date(t.transferDate), 'dd MMM yyyy') : '—'}</td>
                      <td className="font-medium">{t.materialName}</td>
                      <td className="text-sm">{t.fromProjectName}</td>
                      <td className="text-sm">{t.toProjectName}</td>
                      <td className="text-right font-bold">{t.quantity}</td>
                      <td><span className={clsx('badge text-xs',
                        t.status === 'Approved' ? 'badge-green' :
                        t.status === 'Pending' ? 'badge-yellow' : 'badge-gray')}>
                        {t.status}
                      </span></td>
                      <td className="text-xs" style={{color:'var(--text-secondary)'}}>{t.notes || '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* ── Record Receipt Modal ── */}
      {showReceipt && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReceipt(false)}>
          <div className="modal max-w-lg w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Record Stock Receipt (MRN)</h2>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              {!projectId && (
                <div className="p-3 rounded-lg text-sm" style={{background:'var(--primary-light)', color:'var(--primary)'}}>
                  ⚠ Please select a project first
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Transaction Type *</label>
                <select className="form-select"
                  value={receiptForm.transactionType}
                  onChange={e => setReceiptForm(f => ({...f, transactionType: e.target.value}))}>
                  {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Material * <span style={{color:'var(--text-muted)', fontWeight:400}}>(search or type name)</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:'var(--text-muted)'}} />
                  <input className="form-input pl-9" placeholder="Search material name..."
                    value={receiptForm.materialName}
                    onChange={e => {
                      setReceiptForm(f => ({...f, materialName: e.target.value, materialId:''}));
                      setMaterialSearch(e.target.value);
                    }} />
                </div>
                {matList.length > 0 && !receiptForm.materialId && receiptForm.materialName && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto" style={{background:'var(--bg-primary)', borderColor:'var(--border)'}}>
                    {matList.map((m: any) => (
                      <div key={m.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-[rgba(209,17,28,0.04)]"
                        onClick={() => { setReceiptForm(f => ({...f, materialId: m.id, materialName: m.name})); setMaterialSearch(''); }}>
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-2 text-xs" style={{color:'var(--text-muted)'}}>{m.materialCode} · {m.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!receiptForm.materialId && receiptForm.materialName && matList.length === 0 && (
                  <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                    No material found. Go to Materials Master to create it first.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input type="number" className="form-input" placeholder="0"
                    value={receiptForm.quantity}
                    onChange={e => setReceiptForm(f => ({...f, quantity: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Cost (USD)</label>
                  <input type="number" className="form-input" placeholder="0.00"
                    value={receiptForm.unitCost}
                    onChange={e => setReceiptForm(f => ({...f, unitCost: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reference / PO No.</label>
                <input className="form-input" placeholder="e.g. PO-2026-001"
                  value={receiptForm.referenceNo}
                  onChange={e => setReceiptForm(f => ({...f, referenceNo: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} placeholder="Additional notes..."
                  value={receiptForm.notes}
                  onChange={e => setReceiptForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowReceipt(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!receiptForm.materialId || !receiptForm.quantity || !projectId || receiptMutation.isPending}
                onClick={() => receiptMutation.mutate(receiptForm)}
              >
                {receiptMutation.isPending ? 'Recording…' : 'Record Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Site Transfer Modal ── */}
      {showTransfer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransfer(false)}>
          <div className="modal max-w-md w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Initiate Site Transfer</h2>
              <button className="modal-close" onClick={() => setShowTransfer(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Material *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:'var(--text-muted)'}} />
                  <input className="form-input pl-9" placeholder="Search material..."
                    value={transferForm.materialName}
                    onChange={e => {
                      setTransferForm(f => ({...f, materialName: e.target.value, materialId:''}));
                      setMaterialSearch(e.target.value);
                    }} />
                </div>
                {matList.length > 0 && !transferForm.materialId && transferForm.materialName && (
                  <div className="border rounded-lg mt-1 max-h-36 overflow-y-auto" style={{background:'var(--bg-primary)', borderColor:'var(--border)'}}>
                    {matList.map((m: any) => (
                      <div key={m.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-[rgba(209,17,28,0.04)]"
                        onClick={() => { setTransferForm(f => ({...f, materialId: m.id, materialName: m.name})); setMaterialSearch(''); }}>
                        {m.name} <span className="text-xs ml-2" style={{color:'var(--text-muted)'}}>{m.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">From Project</label>
                <input className="form-input" value={projectId ? (projects as any[] || []).find((p:any) => p.id === projectId)?.name || projectId : 'Not selected'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">To Project *</label>
                <select className="form-select" value={transferForm.toProjectId}
                  onChange={e => setTransferForm(f => ({...f, toProjectId: e.target.value}))}>
                  <option value="">Select destination project…</option>
                  {(projects as any[] || []).filter((p:any) => p.id !== projectId).map((p:any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input type="number" className="form-input" placeholder="0"
                  value={transferForm.quantity}
                  onChange={e => setTransferForm(f => ({...f, quantity: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={transferForm.notes}
                  onChange={e => setTransferForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowTransfer(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!transferForm.materialId || !transferForm.toProjectId || !transferForm.quantity || !projectId || transferMutation.isPending}
                onClick={() => transferMutation.mutate({
                  materialId:    transferForm.materialId,
                  fromProjectId: projectId,
                  toProjectId:   transferForm.toProjectId,
                  quantity:      Number(transferForm.quantity),
                  notes:         transferForm.notes || null,
                  transferDate:  new Date().toISOString(),
                })}
              >
                {transferMutation.isPending ? 'Submitting…' : 'Submit Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      {/* ── Issue Material Modal (TC-INV-005, TC-INV-006) ── */}
      {showIssue && issueTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowIssue(false)}>
          <div className="modal max-w-md w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Issue Material</h2>
              <button className="modal-close" onClick={() => setShowIssue(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="p-3 rounded-lg" style={{background:'var(--bg-secondary)'}}>
                <p className="text-sm font-medium">{issueTarget.materialName}</p>
                <p className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
                  Available balance: <strong style={{color: issueTarget.balance <= 0 ? 'var(--primary)' : '#16A34A'}}>
                    {issueTarget.balance} {issueTarget.unit}
                  </strong>
                </p>
              </div>
              {issueTarget.balance <= 0 && (
                <div className="p-3 rounded-lg text-sm" style={{background:'var(--primary-light)', color:'var(--primary)'}}>
                  ⚠ No stock available to issue
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Quantity to Issue *</label>
                <input
                  type="number" className="form-input"
                  placeholder={`Max: ${issueTarget.balance} ${issueTarget.unit}`}
                  min="0.001" max={issueTarget.balance} step="0.001"
                  value={issueQty}
                  onChange={e => setIssueQty(e.target.value)}
                />
                {issueQty && Number(issueQty) > issueTarget.balance && (
                  <p className="input-error">
                    ⚠ Only {issueTarget.balance} {issueTarget.unit} available — cannot issue {issueQty}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Notes / Task Reference</label>
                <input className="form-input" placeholder="e.g. Issued to Foundation Works - Task #12"
                  value={issueNotes} onChange={e => setIssueNotes(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowIssue(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={
                  !issueQty ||
                  Number(issueQty) <= 0 ||
                  Number(issueQty) > issueTarget.balance ||
                  issueMutation.isPending
                }
                onClick={() => issueMutation.mutate({ materialId: issueTarget.materialId })}
              >
                {issueMutation.isPending ? 'Processing…' : `Issue ${issueQty || '0'} ${issueTarget.unit}`}
              </button>
            </div>
          </div>
        </div>
      )}

  );
}
