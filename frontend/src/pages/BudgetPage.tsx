import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { budgetApi, projectsApi, api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import {
  DollarSign, Plus, TrendingUp, BarChart2,
  Lock, Unlock, ChevronRight, CheckCircle, XCircle, FileText
} from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['Labour','Material','Subcontractor','Equipment','Overhead','Contingency','Other'];
const LABOUR_SUB  = ['Skilled','Unskilled','Supervisory','Management'];
const STATE_COLORS: Record<string,string> = {
  Draft:'badge-gray', Active:'badge-green', Inactive:'badge-red', Revised:'badge-yellow',
};
const CHART_COLORS = ['#3B82F6','#F59E0B','#EF4444','#10B981','#8B5CF6','#EC4899'];

type Tab = 'overview' | 'lines' | 'committed' | 'expenditures';

export default function BudgetPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const [projectId,   setProjectId]   = useState('');
  const [tab,         setTab]         = useState<Tab>('overview');
  const [selectedBudget, setSelBudget]= useState<any>(null);
  const [selectedLine,   setSelLine]  = useState<any>(null);
  const [showCreateBudget, setShowCB] = useState(false);
  const [showAddLine,      setShowAL] = useState(false);
  const [showAddCommit,    setShowAC] = useState(false);
  const [showAddExp,       setShowAE] = useState(false);
  const [lineForm, setLineForm] = useState({
    wbsCode:'', category:'Material', subCategory:'', area:'', detail:'', budgetedAmount:'',
  });
  const [commitForm, setCommitForm] = useState({
    commitmentDate: format(new Date(),'yyyy-MM-dd'), amount:'', notes:'',
  });
  const [expForm, setExpForm] = useState({
    paymentDate: format(new Date(),'yyyy-MM-dd'), paymentAmount:'',
    transactionRef:'', notes:'',
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize:100 }).then(r => r.data.items),
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets', projectId],
    queryFn:  () => budgetApi.getBudgets(projectId).then(r => r.data),
    enabled:  !!projectId,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['budget-dashboard', projectId],
    queryFn:  () => api.get('/budget/dashboard', { params:{ projectId } }).then(r => r.data),
    enabled:  !!projectId && tab === 'overview',
  });

  const { data: lineItems } = useQuery({
    queryKey: ['budget-lines', selectedBudget?.id],
    queryFn:  () => api.get(`/budget/${selectedBudget.id}/lines`).then(r => r.data),
    enabled:  !!selectedBudget?.id && tab === 'lines',
  });

  const { data: commitments } = useQuery({
    queryKey: ['commitments', selectedLine?.id],
    queryFn:  () => api.get(`/budget/lines/${selectedLine.id}/commitments`).then(r => r.data),
    enabled:  !!selectedLine?.id && tab === 'committed',
  });

  const { data: expenditures } = useQuery({
    queryKey: ['expenditures', selectedLine?.id],
    queryFn:  () => api.get(`/budget/lines/${selectedLine.id}/expenditures`).then(r => r.data),
    enabled:  !!selectedLine?.id && tab === 'expenditures',
  });

  const [budgetForm, setBudgetForm] = useState({ totalAmount: '', currency: 'USD', notes: '' });

  const createBudgetMutation = useMutation({
    mutationFn: (data: any) => api.post('/budget', data),
    onSuccess: (res) => {
      toast.success('Budget created successfully');
      qc.invalidateQueries({ queryKey: ['budgets', projectId] });
      setShowCB(false);
      setBudgetForm({ totalAmount: '', currency: 'USD', notes: '' });
      if (res.data) setSelBudget(res.data);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.response?.data?.inner || 'Failed to create budget'),
  });

  const stateMutation = useMutation({
    mutationFn: ({ id, newState }: { id:string; newState:string }) =>
      api.post(`/budget/${id}/state`, { newState }),
    onSuccess: () => {
      toast.success('Budget state updated');
      qc.invalidateQueries({ queryKey:['budgets'] });
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const addLineMutation = useMutation({
    mutationFn: () => api.post('/budget/lines', {
      projectBudgetId: selectedBudget?.id,
      ...lineForm,
      budgetedAmount: Number(lineForm.budgetedAmount),
    }),
    onSuccess: () => {
      toast.success('Line item added');
      qc.invalidateQueries({ queryKey:['budget-lines'] });
      qc.invalidateQueries({ queryKey:['budgets', projectId] });
      setShowAL(false);
      setLineForm({ wbsCode:'', category:'Material', subCategory:'', area:'', detail:'', budgetedAmount:'' });
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed to add line'),
  });

  const addCommitMutation = useMutation({
    mutationFn: () => api.post(`/budget/lines/${selectedLine?.id}/commitments`, {
      ...commitForm, amount: Number(commitForm.amount),
    }),
    onSuccess: () => {
      toast.success('Commitment recorded');
      qc.invalidateQueries({ queryKey:['commitments', selectedLine?.id] });
      qc.invalidateQueries({ queryKey:['budget-lines'] });
      qc.invalidateQueries({ queryKey:['budgets', projectId] });
      setShowAC(false);
      setCommitForm({ commitmentDate: format(new Date(),'yyyy-MM-dd'), amount:'', notes:'' });
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const addExpMutation = useMutation({
    mutationFn: () => api.post(`/budget/lines/${selectedLine?.id}/expenditures`, {
      ...expForm, paymentAmount: Number(expForm.paymentAmount),
    }),
    onSuccess: () => {
      toast.success('Expenditure recorded');
      qc.invalidateQueries({ queryKey:['expenditures', selectedLine?.id] });
      qc.invalidateQueries({ queryKey:['budget-lines'] });
      qc.invalidateQueries({ queryKey:['budgets', projectId] });
      qc.invalidateQueries({ queryKey:['budget-dashboard', projectId] });
      setShowAE(false);
      setExpForm({ paymentDate: format(new Date(),'yyyy-MM-dd'), paymentAmount:'', transactionRef:'', notes:'' });
    },
    onError: (e:any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const canManage = hasRole('Admin') || hasRole('Project Manager') || hasRole('Finance');
  const budgetList: any[] = Array.isArray(budgets) ? budgets : (budgets?.items ?? []);
  const lineList:   any[] = Array.isArray(lineItems) ? lineItems : [];
  const commitList: any[] = Array.isArray(commitments) ? commitments : [];
  const expList:    any[] = Array.isArray(expenditures) ? expenditures : [];
  const totalBudgeted   = lineList.reduce((s,l) => s + (l.budgetedAmount||0), 0);
  const totalCommitted  = lineList.reduce((s,l) => s + (l.committedAmount||0), 0);
  const totalExpended   = lineList.reduce((s,l) => s + (l.expendedAmount||0), 0);
  const totalBalance    = totalBudgeted - totalExpended;

  return (
    <div className="page-container max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Budget Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            WBS-based budget planning, commitments and expenditure tracking
          </p>
        </div>
      </div>

      {/* Project selector */}
      <select className="form-select max-w-xs" value={projectId} onChange={e => { setProjectId(e.target.value); setSelBudget(null); setSelLine(null); }}>
        <option value="">Select a project...</option>
        {(projects||[]).map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {!projectId ? (
        <div className="card p-12 text-center text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Select a project to manage its budget</p>
        </div>
      ) : (
        <>
          {/* Budget selector + state badge */}
          {budgetList.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <select className="form-select max-w-xs" value={selectedBudget?.id || ''}
                onChange={e => setSelBudget(budgetList.find(b => b.id === e.target.value) || null)}>
                <option value="">Select budget version...</option>
                {budgetList.map((b:any) => (
                  <option key={b.id} value={b.id}>{b.budgetVersion} — {b.status}</option>
                ))}
              </select>

              {selectedBudget && (
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATE_COLORS[selectedBudget.status]||'badge-gray'}`}>
                    {selectedBudget.status === 'Active' ? <Lock className="w-3 h-3 inline mr-1" /> : <Unlock className="w-3 h-3 inline mr-1" />}
                    {selectedBudget.status}
                  </span>
                  {/* BM-EXT-1 state transitions */}
                  {canManage && selectedBudget.status === 'Draft' && (
                    <button onClick={() => stateMutation.mutate({ id: selectedBudget.id, newState: 'Active' })}
                      disabled={stateMutation.isPending}
                      className="btn-primary btn-sm flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Move to Active
                    </button>
                  )}
                  {canManage && selectedBudget.status === 'Active' && (
                    <button onClick={() => stateMutation.mutate({ id: selectedBudget.id, newState: 'Inactive' })}
                      disabled={stateMutation.isPending}
                      className="btn-ghost btn-sm text-red-500 border border-red-200">
                      <XCircle className="w-3.5 h-3.5 inline mr-1" /> Deactivate
                    </button>
                  )}
                  {canManage && selectedBudget.status === 'Inactive' && (
                    <button onClick={() => stateMutation.mutate({ id: selectedBudget.id, newState: 'Active' })}
                      disabled={stateMutation.isPending}
                      className="btn-primary btn-sm">
                      Re-Activate
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          {selectedBudget && (
            <>
              <div className="tabs">
                {[
                  { key:'overview',     label:'📊 Overview'     },
                  { key:'lines',        label:`📋 Line Items (${lineList.length})`  },
                  { key:'committed',    label:`💼 Commitments${selectedLine ? ` — ${selectedLine.category}` : ''}` },
                  { key:'expenditures', label:`💰 Expenditures${selectedLine ? ` — ${selectedLine.category}` : ''}` },
                ].map(t => (
                  <button key={t.key} className={`tab ${tab===t.key?'tab-active':''}`}
                    onClick={() => setTab(t.key as Tab)}>{t.label}</button>
                ))}
              </div>

              {/* ── Overview ── */}
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label:'Total Budget',   value:totalBudgeted,  color:'text-gray-800'  },
                      { label:'Committed',       value:totalCommitted, color:'text-orange-600'},
                      { label:'Expended',        value:totalExpended,  color:'text-red-500'   },
                      { label:'Balance',         value:totalBalance,   color: totalBalance < 0 ? 'text-red-600' : 'text-green-600' },
                    ].map(k => (
                      <div key={k.label} className="card text-center py-4">
                        <p className={`text-2xl font-bold ${k.color}`}>
                          ${k.value.toLocaleString(undefined,{maximumFractionDigits:0})}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* TC-BUD-009/010: Utilization bar */}
                  {totalBudgeted > 0 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Budget Utilization</span>
                        <span className={clsx('text-sm font-bold',
                          (totalExpended/totalBudgeted*100) > 80 ? 'text-red-600' : 'text-green-600')}>
                          {((totalExpended/totalBudgeted)*100).toFixed(1)}%
                          {(totalExpended/totalBudgeted*100) > 80 && (
                            <span className="ml-2 text-xs badge-red">⚠ Over 80%</span>
                          )}
                        </span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden" style={{background:'var(--bg-secondary)'}}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100,(totalExpended/totalBudgeted)*100).toFixed(1)}%`,
                            background: (totalExpended/totalBudgeted*100) > 80 ? '#EF4444' : '#16A34A',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs" style={{color:'var(--text-secondary)'}}>
                        <span>Expended: ${totalExpended.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                        <span>Budget: ${totalBudgeted.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                      </div>
                    </div>
                  )}

                  {lineList.length > 0 && (
                    <div className="card">
                      <div className="card-header"><span className="font-medium text-sm">Budget vs Committed vs Expended by Category</span></div>
                      <div className="p-5">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={
                            CATEGORIES.map(cat => ({
                              name: cat,
                              Budget:    lineList.filter(l=>l.category===cat).reduce((s,l)=>s+(l.budgetedAmount||0),0),
                              Committed: lineList.filter(l=>l.category===cat).reduce((s,l)=>s+(l.committedAmount||0),0),
                              Expended:  lineList.filter(l=>l.category===cat).reduce((s,l)=>s+(l.expendedAmount||0),0),
                            })).filter(d => d.Budget > 0)
                          } barSize={16} barGap={2}>
                            <XAxis dataKey="name" tick={{ fontSize:11 }} />
                            <YAxis tick={{ fontSize:11 }} tickFormatter={(v:number) => `$${(v/1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v:any) => `$${Number(v).toLocaleString()}`} />
                            <Bar dataKey="Budget" fill="#3B82F6" radius={[3,3,0,0]} />
                            <Bar dataKey="Committed" fill="#F59E0B" radius={[3,3,0,0]} />
                            <Bar dataKey="Expended" fill="#EF4444" radius={[3,3,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Burn rate */}
                  {totalBudgeted > 0 && (
                    <div className="card p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Budget Utilisation</span>
                        <span className={clsx('text-lg font-bold', totalExpended/totalBudgeted > 0.9 ? 'text-red-500' : 'text-gray-800')}>
                          {Math.round(totalExpended/totalBudgeted*100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, totalExpended/totalBudgeted*100)}%`,
                            background: totalExpended/totalBudgeted > 0.9 ? '#EF4444' : '#3B82F6'
                          }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>$0</span>
                        <span className="text-orange-500">{Math.round(totalCommitted/totalBudgeted*100)}% committed</span>
                        <span>${totalBudgeted.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Line Items (BM-EXT-2) ── */}
              {tab === 'lines' && (
                <div className="space-y-4">
                  {canManage && (
                    <div className="flex justify-end">
                      <button onClick={() => setShowAL(true)} className="btn-primary flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Add Line Item
                      </button>
                    </div>
                  )}

                  {/* Add Line Item form */}
                  {showAddLine && (
                    <div className="card p-5">
                      <h3 className="font-semibold text-gray-800 mb-4">Add Budget Line Item</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="form-group">
                          <label className="form-label">WBS Code</label>
                          <input className="form-input" placeholder="e.g. 1.2.3"
                            value={lineForm.wbsCode} onChange={e => setLineForm(f=>({...f,wbsCode:e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Category *</label>
                          <select className="form-select" value={lineForm.category}
                            onChange={e => setLineForm(f=>({...f,category:e.target.value,subCategory:''}))}>
                            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        {lineForm.category === 'Labour' && (
                          <div className="form-group">
                            <label className="form-label">Sub-Category</label>
                            <select className="form-select" value={lineForm.subCategory}
                              onChange={e => setLineForm(f=>({...f,subCategory:e.target.value}))}>
                              <option value="">Select...</option>
                              {LABOUR_SUB.map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="form-group">
                          <label className="form-label">Area / Zone</label>
                          <input className="form-input" placeholder="e.g. Block A"
                            value={lineForm.area} onChange={e => setLineForm(f=>({...f,area:e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Detail Description</label>
                          <input className="form-input" placeholder="Short description"
                            value={lineForm.detail} onChange={e => setLineForm(f=>({...f,detail:e.target.value}))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Budgeted Amount (USD) *</label>
                          <input type="number" className="form-input" min="0" placeholder="0.00"
                            value={lineForm.budgetedAmount} onChange={e => setLineForm(f=>({...f,budgetedAmount:e.target.value}))} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button onClick={() => setShowAL(false)} className="btn-ghost">Cancel</button>
                        <button onClick={() => addLineMutation.mutate()}
                          disabled={!lineForm.budgetedAmount || addLineMutation.isPending}
                          className="btn-primary">
                          {addLineMutation.isPending ? 'Adding...' : 'Add Line Item'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Line items table */}
                  {lineList.length === 0 ? (
                    <div className="card p-10 text-center text-gray-400">
                      <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No line items yet. Add the first budget line above.</p>
                    </div>
                  ) : (
                    <div className="card overflow-hidden p-0">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>WBS</th><th>Category</th><th>Sub-Cat</th><th>Area</th><th>Detail</th>
                            <th className="text-right">Budgeted</th>
                            <th className="text-right">Committed</th>
                            <th className="text-right">Expended</th>
                            <th className="text-right">Balance</th>
                            <th className="text-right">Variance</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineList.map((l:any) => (
                            <tr key={l.id} className={clsx('hover:bg-gray-50', selectedLine?.id===l.id && 'bg-[rgba(209,17,28,0.04)]')}>
                              <td className="font-mono text-xs">{l.wbsCode||'—'}</td>
                              <td><span className="badge badge-blue text-xs">{l.category}</span></td>
                              <td className="text-sm text-gray-500">{l.subCategory||'—'}</td>
                              <td className="text-sm text-gray-500">{l.area||'—'}</td>
                              <td className="text-sm text-gray-700 max-w-[120px] truncate">{l.detail||'—'}</td>
                              <td className="text-right font-medium">${(l.budgetedAmount||0).toLocaleString()}</td>
                              <td className="text-right text-orange-600">${(l.committedAmount||0).toLocaleString()}</td>
                              <td className="text-right text-red-500">${(l.expendedAmount||0).toLocaleString()}</td>
                              <td className={clsx('text-right font-bold', (l.balanceByPayment||0)<0 ? 'text-red-600' : 'text-green-600')}>
                                ${(l.balanceByPayment||0).toLocaleString()}
                              </td>
                              <td className={clsx('text-right font-semibold',
                                ((l.budgetedAmount||0)-(l.expendedAmount||0)) < 0 ? 'text-red-600' : 'text-green-600')}>
                                ${((l.budgetedAmount||0)-(l.expendedAmount||0)).toLocaleString()}
                              </td>
                              <td>
                                <button onClick={() => { setSelLine(l); setTab('committed'); }}
                                  className="text-xs text-[var(--primary)] hover:underline whitespace-nowrap">
                                  View →
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold text-sm">
                            <td colSpan={5} className="text-right text-gray-500">TOTAL</td>
                            <td className="text-right">${totalBudgeted.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                            <td className="text-right text-orange-600">${totalCommitted.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                            <td className="text-right text-red-500">${totalExpended.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                            <td className={clsx('text-right', totalBalance < 0 ? 'text-red-600' : 'text-green-600')}>
                              ${totalBalance.toLocaleString(undefined,{maximumFractionDigits:0})}
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Commitments (BM-EXT-3) ── */}
              {tab === 'committed' && (
                <div className="space-y-4">
                  {!selectedLine ? (
                    <div className="card p-8 text-center text-gray-400">
                      Select a line item from the Line Items tab to view commitments.
                    </div>
                  ) : (
                    <>
                      <div className="card p-4 bg-[rgba(209,17,28,0.04)] border border-[rgba(209,17,28,0.25)] flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedLine.category} {selectedLine.subCategory ? `— ${selectedLine.subCategory}` : ''} {selectedLine.area ? `· ${selectedLine.area}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Budgeted: ${(selectedLine.budgetedAmount||0).toLocaleString()} &nbsp;|&nbsp;
                            Balance: <span className={selectedLine.balanceByCommitted < 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                              ${(selectedLine.balanceByCommitted||0).toLocaleString()}
                            </span>
                          </p>
                        </div>
                        {canManage && (
                          <button onClick={() => setShowAC(true)} className="btn-primary btn-sm flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add Commitment
                          </button>
                        )}
                      </div>

                      {showAddCommit && (
                        <div className="card p-4">
                          <h3 className="font-semibold text-sm mb-3">Record Commitment (BM-EXT-3)</h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">Commitment Date *</label>
                              <input type="date" className="form-input w-full mt-1 text-sm"
                                value={commitForm.commitmentDate}
                                onChange={e => setCommitForm(f=>({...f,commitmentDate:e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Committed Amount (USD) *</label>
                              <input type="number" className="form-input w-full mt-1 text-sm"
                                placeholder="0.00" min="0"
                                value={commitForm.amount}
                                onChange={e => setCommitForm(f=>({...f,amount:e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Notes / Ref (PO/Contract)</label>
                              <input className="form-input w-full mt-1 text-sm"
                                placeholder="e.g. PO-2024-001"
                                value={commitForm.notes}
                                onChange={e => setCommitForm(f=>({...f,notes:e.target.value}))} />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 justify-end">
                            <button onClick={() => setShowAC(false)} className="btn-ghost text-sm">Cancel</button>
                            <button onClick={() => addCommitMutation.mutate()}
                              disabled={!commitForm.amount || addCommitMutation.isPending}
                              className="btn-primary text-sm">
                              {addCommitMutation.isPending ? 'Saving...' : 'Save Commitment'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="card overflow-hidden p-0">
                        <div className="card-header">
                          <span className="font-medium text-sm">Commitments</span>
                          <span className="text-xs text-gray-400">{commitList.length} records</span>
                        </div>
                        {commitList.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 text-sm">No commitments yet</div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Commitment Date</th><th>Reference</th>
                                <th className="text-right">Amount</th><th>Created By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commitList.map((c:any) => (
                                <tr key={c.id}>
                                  <td className="text-sm">{format(new Date(c.commitmentDate),'dd MMM yyyy')}</td>
                                  <td className="text-sm text-gray-600">{c.notes||'—'}</td>
                                  <td className="text-right font-medium text-orange-600">${(c.amount||0).toLocaleString()}</td>
                                  <td className="text-xs text-gray-400">{c.createdByName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Expenditures (BM-EXT-4) ── */}
              {tab === 'expenditures' && (
                <div className="space-y-4">
                  {!selectedLine ? (
                    <div className="card p-8 text-center text-gray-400">
                      Select a line item from the Line Items tab to record expenditures.
                    </div>
                  ) : (
                    <>
                      <div className="card p-4 bg-blue-50 border border-blue-200 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedLine.category} — {selectedLine.detail || selectedLine.area || 'Line Item'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Balance (by Payment): <span className={clsx('font-medium', (selectedLine.balanceByPayment||0) < 0 ? 'text-red-500' : 'text-green-600')}>
                              ${(selectedLine.balanceByPayment||0).toLocaleString()}
                            </span>
                          </p>
                        </div>
                        {canManage && (
                          <button onClick={() => setShowAE(true)} className="btn-primary btn-sm flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Record Payment
                          </button>
                        )}
                      </div>

                      {showAddExp && (
                        <div className="card p-4">
                          <h3 className="font-semibold text-sm mb-3">Record Actual Expenditure (BM-EXT-4)</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">Payment Date *</label>
                              <input type="date" className="form-input w-full mt-1 text-sm"
                                value={expForm.paymentDate}
                                onChange={e => setExpForm(f=>({...f,paymentDate:e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Payment Amount (USD) *</label>
                              <input type="number" className="form-input w-full mt-1 text-sm"
                                placeholder="0.00" min="0"
                                value={expForm.paymentAmount}
                                onChange={e => setExpForm(f=>({...f,paymentAmount:e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Transaction Ref *</label>
                              <input className="form-input w-full mt-1 text-sm"
                                placeholder="Invoice/UTR/PO No."
                                value={expForm.transactionRef}
                                onChange={e => setExpForm(f=>({...f,transactionRef:e.target.value}))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Notes</label>
                              <input className="form-input w-full mt-1 text-sm"
                                placeholder="Optional notes"
                                value={expForm.notes}
                                onChange={e => setExpForm(f=>({...f,notes:e.target.value}))} />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 justify-end">
                            <button onClick={() => setShowAE(false)} className="btn-ghost text-sm">Cancel</button>
                            <button onClick={() => addExpMutation.mutate()}
                              disabled={!expForm.paymentAmount || Number(expForm.paymentAmount) <= 0 || !expForm.transactionRef || addExpMutation.isPending}
                              className="btn-primary text-sm">
                              {addExpMutation.isPending ? 'Recording...' : 'Record Payment'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="card overflow-hidden p-0">
                        <div className="card-header">
                          <span className="font-medium text-sm">Expenditure History</span>
                          <span className="font-medium text-red-500 text-sm">
                            Total: ${expList.reduce((s:number,e:any)=>s+(e.paymentAmount||0),0).toLocaleString()}
                          </span>
                        </div>
                        {expList.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Payment Date</th><th>Transaction Ref</th>
                                <th className="text-right">Amount</th><th>Notes</th><th>Recorded By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expList.map((e:any) => (
                                <tr key={e.id}>
                                  <td className="text-sm">{format(new Date(e.paymentDate),'dd MMM yyyy')}</td>
                                  <td className="font-mono text-xs text-blue-600">{e.transactionRef}</td>
                                  <td className="text-right font-bold text-red-500">${(e.paymentAmount||0).toLocaleString()}</td>
                                  <td className="text-sm text-gray-500">{e.notes||'—'}</td>
                                  <td className="text-xs text-gray-400">{e.createdByName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* No budget yet */}
          {projectId && budgetList.length === 0 && (
            <div className="card p-10 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No budget created yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Create a WBS-based budget to track costs for this project</p>
              {canManage && (
                <button className="btn-primary" onClick={() => setShowCB(true)}>+ Create Budget</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
      {/* ── Create Budget Modal ── */}
      {showCreateBudget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCB(false)}>
          <div className="modal max-w-md w-full">
            <div className="modal-header">
              <h2 className="font-semibold text-base">Create Project Budget</h2>
              <button className="modal-close" onClick={() => setShowCB(false)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Total Approved Budget *</label>
                <input
                  type="number" className="form-input" placeholder="e.g. 500000"
                  value={budgetForm.totalAmount}
                  onChange={e => setBudgetForm(f => ({...f, totalAmount: e.target.value}))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select"
                  value={budgetForm.currency}
                  onChange={e => setBudgetForm(f => ({...f, currency: e.target.value}))}>
                  <option>USD</option><option>TZS</option><option>KES</option>
                  <option>ZMW</option><option>UGX</option><option>AED</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} placeholder="Budget notes or version description..."
                  value={budgetForm.notes}
                  onChange={e => setBudgetForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowCB(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!budgetForm.totalAmount || createBudgetMutation.isPending}
                onClick={() => createBudgetMutation.mutate({
                  projectId,
                  totalAmount: Number(budgetForm.totalAmount),
                  currency: budgetForm.currency,
                  notes: budgetForm.notes || null,
                })}
              >
                {createBudgetMutation.isPending ? 'Creating…' : 'Create Budget'}
              </button>
            </div>
          </div>
        </div>
      )}

  );
}
