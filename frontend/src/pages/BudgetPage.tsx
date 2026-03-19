// src/pages/BudgetPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  DollarSign, Plus, X, Loader2, TrendingUp,
  ChevronRight, BarChart2, AlertCircle
} from 'lucide-react';
import { budgetApi, projectsApi } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

export default function BudgetPage() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'lines' | 'expenditures'>('overview');
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', selectedProjectId],
    queryFn:  () => budgetApi.getBudgets(selectedProjectId!).then(r => r.data),
    enabled:  !!selectedProjectId,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['budget-dashboard', selectedProjectId],
    queryFn:  () => budgetApi.getExpenditures(selectedProjectId!).then(r => r.data),
    enabled:  !!selectedProjectId,
  });

  const { data: expenditures } = useQuery({
    queryKey: ['expenditures', selectedProjectId],
    queryFn:  () => budgetApi.getExpenditures(selectedProjectId!).then(r => r.data),
    enabled:  subTab === 'expenditures' && !!selectedProjectId,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: (data: any) => budgetApi.addExpenditure(data),
    onSuccess: () => {
      toast.success('Budget line created');
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budget-dashboard'] });
      setShowCreate(false); reset();
    },
    onError: () => toast.error('Failed to create budget line'),
  });

  // Build chart data from budgets
  const chartData = (budgets ?? []).map((b: any) => ({
    name:      b.category.length > 10 ? b.category.slice(0, 10) + '…' : b.category,
    Budgeted:  Number(b.budgetedAmount  ?? 0),
    Committed: Number(b.committedTotal  ?? 0),
    Expended:  Number(b.expendedTotal   ?? 0),
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budget & Expense Tracking</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            L1 budget (BOQ/WBS), commitments and expenditure tracking
          </p>
        </div>
        {selectedProjectId && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add Budget Line
          </button>
        )}
      </div>

      {/* Project selector */}
      <select
        className="select max-w-xs"
        value={selectedProjectId ?? ''}
        onChange={e => setSelectedProjectId(e.target.value ? +e.target.value : null)}
      >
        <option value="">Select a project…</option>
        {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {!selectedProjectId
        ? (
          <div className="empty-state">
            <DollarSign className="empty-icon" />
            <p>Select a project to view budget</p>
          </div>
        )
        : (
          <>
            {/* Summary tiles */}
            {dashboard && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Budget',  value: dashboard.totalBudget,    color: 'text-[var(--text-primary)]' },
                  { label: 'Committed',     value: dashboard.totalCommitted,  color: 'text-orange-600' },
                  { label: 'Expended',      value: dashboard.totalExpended,   color: 'text-red-500'    },
                  { label: 'Balance',
                    value: (dashboard.totalBudget ?? 0) - (dashboard.totalExpended ?? 0),
                    color: ((dashboard.totalBudget ?? 0) - (dashboard.totalExpended ?? 0)) < 0 ? 'text-red-600' : 'text-green-600'
                  },
                ].map(item => (
                  <div key={item.label} className="card p-4">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{item.label}</p>
                    <p className={clsx('text-xl font-bold', item.color)}>
                      ${(item.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Utilisation alert */}
            {dashboard && dashboard.utilizationPercent >= 90 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>Budget utilisation is at <strong>{dashboard.utilizationPercent}%</strong>. Immediate review recommended.</p>
              </div>
            )}

            <div className="tabs">
              {[
                { id: 'overview',      label: 'Overview'    },
                { id: 'lines',         label: 'Budget Lines' },
                { id: 'expenditures',  label: 'Expenditures' },
              ].map(t => (
                <button key={t.id} className={clsx('tab-item', subTab === t.id && 'active')} onClick={() => setSubTab(t.id as any)}>
                  {t.label}
                </button>
              ))}
            </div>

            {subTab === 'overview' && (
              <div className="card">
                <div className="card-header"><span className="font-medium text-sm">Budget vs Committed vs Expended by Category</span></div>
                <div className="p-6">
                  {chartData.length === 0
                    ? <div className="empty-state py-8"><BarChart2 className="empty-icon" /><p>No budget lines yet</p></div>
                    : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} barSize={16} barGap={4}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                          <Bar dataKey="Budgeted"  fill="#6B7280" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Committed" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Expended"  fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            )}

            {subTab === 'lines' && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th><th>Sub-Category</th>
                      <th className="text-right">Budgeted (USD)</th>
                      <th className="text-right">Committed</th>
                      <th className="text-right">Expended</th>
                      <th className="text-right">Balance</th>
                      <th>Utilisation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetsLoading
                      ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-400" /></td></tr>
                      : !budgets?.length
                        ? <tr><td colSpan={8} className="text-center py-10 text-[var(--text-secondary)]">No budget lines yet</td></tr>
                        : budgets.map((b: any) => {
                          const balance = (b.budgetedAmount ?? 0) - (b.expendedTotal ?? 0);
                          const util    = b.budgetedAmount > 0 ? Math.round((b.expendedTotal ?? 0) / b.budgetedAmount * 100) : 0;
                          return (
                            <tr key={b.budgetId}>
                              <td className="font-medium">{b.category}</td>
                              <td className="text-sm text-[var(--text-secondary)]">{b.subCategory ?? '—'}</td>
                              <td className="text-right font-medium">${(b.budgetedAmount ?? 0).toLocaleString()}</td>
                              <td className="text-right text-orange-600">${(b.committedTotal ?? 0).toLocaleString()}</td>
                              <td className="text-right text-red-500">${(b.expendedTotal ?? 0).toLocaleString()}</td>
                              <td className={clsx('text-right font-medium', balance < 0 ? 'text-red-600' : 'text-green-600')}>
                                ${balance.toLocaleString()}
                              </td>
                              <td className="w-32">
                                <div className="flex items-center gap-1.5">
                                  <div className="progress-bar flex-1 h-1.5">
                                    <div
                                      className={clsx('progress-fill', util >= 90 ? 'bg-red-400' : util >= 70 ? 'bg-orange-400' : 'bg-green-400')}
                                      style={{ width: `${Math.min(100, util)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-[var(--text-secondary)] w-8">{util}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={b.isApproved ? 'badge-green' : 'badge-yellow'}>
                                  {b.isApproved ? 'Approved' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'expenditures' && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Payment Date</th><th>Description</th><th>Vendor</th><th>Payment Amount</th><th>Reference</th></tr>
                  </thead>
                  <tbody>
                    {!expenditures?.length
                      ? <tr><td colSpan={5} className="text-center py-10 text-[var(--text-secondary)]">No expenditures recorded</td></tr>
                      : expenditures.map((e: any, i: number) => (
                        <tr key={i}>
                          <td className="text-sm">{e.paymentDate ? new Date(e.paymentDate).toLocaleDateString() : '—'}</td>
                          <td className="text-sm">{e.description}</td>
                          <td className="text-sm text-[var(--text-secondary)]">{e.vendorName ?? '—'}</td>
                          <td className="font-medium">${(e.paymentAmount ?? 0).toLocaleString()}</td>
                          <td className="font-mono text-xs text-[var(--text-secondary)]">{e.paymentReference ?? '—'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      }

      {/* Create Budget Line Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal max-w-lg w-full">
            <div className="modal-header">
              <h2 className="font-semibold">Add Budget Line</h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="input-group col-span-2">
                  <label className="input-label">Category *</label>
                  <select className="select" {...register('category')}>
                    <option>Civil Works</option>
                    <option>Electrical Works</option>
                    <option>Mechanical Works</option>
                    <option>Procurement / Materials</option>
                    <option>Labour</option>
                    <option>Equipment</option>
                    <option>Professional Fees</option>
                    <option>Contingency</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Sub-Category</label>
                  <input className="input" placeholder="e.g. Foundation, Cabling…" {...register('subCategory')} />
                </div>
                <div className="input-group">
                  <label className="input-label">Budgeted Amount (USD) *</label>
                  <input className="input" type="number" step="0.01" placeholder="0.00" {...register('budgetedAmount', { valueAsNumber: true })} />
                </div>
                <div className="input-group col-span-2">
                  <label className="input-label">Description / Notes</label>
                  <textarea className="textarea" rows={2} {...register('description')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
