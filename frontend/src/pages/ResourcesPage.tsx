// src/pages/ResourcesPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench, Users, Plus, Loader2 } from 'lucide-react';
import { resourcesApi, projectsApi } from '../lib/api';
import clsx from 'clsx';

export default function ResourcesPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'pool' | 'allocations' | 'equipment'>('pool');

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn:  () => projectsApi.getAll({ pageSize: 100 }).then(r => r.data.items),
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn:  () => resourcesApi.getAll().then(r => r.data),
  });

  const { data: allocations } = useQuery({
    queryKey: ['allocations', selectedProjectId],
    queryFn:  () => resourcesApi.getAllocations({ projectId: selectedProjectId! }).then(r => r.data),
    enabled:  !!selectedProjectId && subTab === 'allocations',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resource Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage resource pool, allocations and equipment deployment
          </p>
        </div>
        <button className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Resource</button>
      </div>

      {subTab === 'allocations' && (
        <select
          className="select max-w-xs"
          value={selectedProjectId ?? ''}
          onChange={e => setSelectedProjectId(e.target.value ? +e.target.value : null)}
        >
          <option value="">Select a project…</option>
          {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <div className="tabs">
        {[{ id: 'pool', label: 'Resource Pool' }, { id: 'allocations', label: 'Allocations' }, { id: 'equipment', label: 'Equipment' }].map(t => (
          <button key={t.id} className={clsx('tab-item', subTab === t.id && 'active')} onClick={() => setSubTab(t.id as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'pool' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Category</th><th>Skills</th><th>Availability</th></tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
                : !resources?.length
                  ? <tr><td colSpan={5} className="text-center py-10 text-[var(--text-secondary)]">No resources in pool</td></tr>
                  : resources.map((r: any) => (
                    <tr key={r.resourceId}>
                      <td className="font-medium">{r.resourceName}</td>
                      <td className="text-sm">{r.resourceType}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{r.category ?? '—'}</td>
                      <td className="text-sm">{r.skills?.join(', ') ?? '—'}</td>
                      <td><span className={r.isAvailable ? 'badge-green' : 'badge-red'}>{r.isAvailable ? 'Available' : 'Deployed'}</span></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'allocations' && !selectedProjectId && (
        <div className="empty-state"><Users className="empty-icon" /><p>Select a project to view allocations</p></div>
      )}
    </div>
  );
}
