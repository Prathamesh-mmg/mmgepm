// src/pages/InventoryPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, ArrowLeftRight, Loader2 } from 'lucide-react';
import { inventoryApi, projectsApi } from '../lib/api';
import clsx from 'clsx';

export default function InventoryPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'stock' | 'ledger' | 'transfers'>('stock');

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: stock, isLoading } = useQuery({
    queryKey: ['inventory-stock', selectedProjectId],
    queryFn:  () => inventoryApi.getLedger({ projectId: String(selectedProjectId!) }).then(r => r.data),
    enabled:  !!selectedProjectId,
  });

  const { data: stockReport } = useQuery({
    queryKey: ['stock-report', selectedProjectId],
    queryFn:  () => inventoryApi.getLedger({ projectId: String(selectedProjectId!) }).then(r => r.data),
    enabled:  !!selectedProjectId && subTab === 'stock',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Stock ledger, receipts, issues and site transfers
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm"><ArrowLeftRight className="w-4 h-4" /> Transfer</button>
          <button className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Record Receipt</button>
        </div>
      </div>

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
            <Package className="empty-icon" />
            <p>Select a project to view inventory</p>
          </div>
        )
        : (
          <>
            <div className="tabs">
              {[
                { id: 'stock',     label: 'Stock Summary'  },
                { id: 'ledger',    label: 'Stock Ledger'   },
                { id: 'transfers', label: 'Transfers'      },
              ].map(t => (
                <button key={t.id} className={clsx('tab-item', subTab === t.id && 'active')} onClick={() => setSubTab(t.id as any)}>
                  {t.label}
                </button>
              ))}
            </div>

            {subTab === 'stock' && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material</th><th>Category</th><th>Unit</th>
                      <th className="text-right">Received</th>
                      <th className="text-right">Issued</th>
                      <th className="text-right">Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                      : !stock?.length
                        ? <tr><td colSpan={7} className="text-center py-10 text-[var(--text-secondary)]">No stock entries</td></tr>
                        : stock.map((s: any, i: number) => {
                          const balance = (s.receivedQty ?? 0) - (s.issuedQty ?? 0);
                          const isLow   = balance < (s.minimumQty ?? 0);
                          return (
                            <tr key={i}>
                              <td className="font-medium">{s.materialName}</td>
                              <td className="text-sm text-[var(--text-secondary)]">{s.category}</td>
                              <td className="text-sm">{s.unit}</td>
                              <td className="text-right font-medium">{s.receivedQty ?? 0}</td>
                              <td className="text-right text-orange-600">{s.issuedQty ?? 0}</td>
                              <td className={clsx('text-right font-bold', isLow ? 'text-red-500' : 'text-green-600')}>
                                {balance}
                              </td>
                              <td>
                                {isLow
                                  ? <span className="badge-red">Low Stock</span>
                                  : <span className="badge-green">OK</span>
                                }
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'ledger' && (
              <div className="empty-state">
                <Package className="empty-icon" />
                <p>Select a material to view its ledger</p>
              </div>
            )}
          </>
        )
      }
    </div>
  );
}
