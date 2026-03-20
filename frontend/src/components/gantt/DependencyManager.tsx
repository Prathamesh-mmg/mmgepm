import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { Link, Unlink, Plus, X, AlertCircle } from 'lucide-react';

interface Task { id: string; name: string; wbsCode?: string; }

interface DependencyManagerProps {
  taskId: string;
  taskName: string;
  allTasks: Task[];
  onClose: () => void;
}

const DEP_TYPES = [
  { value: 'FS', label: 'Finish → Start', desc: 'Task starts after predecessor finishes' },
  { value: 'SS', label: 'Start → Start',  desc: 'Task starts when predecessor starts'   },
  { value: 'FF', label: 'Finish → Finish', desc: 'Task finishes when predecessor finishes' },
  { value: 'SF', label: 'Start → Finish',  desc: 'Task finishes when predecessor starts'  },
];

export default function DependencyManager({
  taskId, taskName, allTasks, onClose
}: DependencyManagerProps) {
  const qc = useQueryClient();
  const [selectedPred, setSelectedPred] = useState('');
  const [depType, setDepType]           = useState('FS');
  const [lagDays, setLagDays]           = useState(0);

  const { data: existing = [] } = useQuery({
    queryKey: ['task-deps', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/dependencies`).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/dependencies`, {
      predecessorId: selectedPred, dependencyType: depType, lagDays,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-deps', taskId] });
      toast.success('Dependency added');
      setSelectedPred('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add dependency'),
  });

  const removeMutation = useMutation({
    mutationFn: (depId: string) => api.delete(`/tasks/${taskId}/dependencies/${depId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-deps', taskId] });
      toast.success('Dependency removed');
    },
  });

  // Filter out tasks that are already predecessors or the task itself
  const existingPredIds = new Set((existing as any[]).map((d: any) => d.predecessorId));
  const available = allTasks.filter(t => t.id !== taskId && !existingPredIds.has(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Link className="w-4 h-4 text-[var(--secondary)]" /> Task Dependencies
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">"{taskName}"</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing dependencies */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Current Predecessors ({(existing as any[]).length})
          </p>
          {(existing as any[]).length === 0 ? (
            <div className="text-sm text-gray-400 py-3 text-center border border-dashed rounded-lg">
              No dependencies yet
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(existing as any[]).map((dep: any) => (
                <div key={dep.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[rgba(209,17,28,0.08)] flex items-center justify-center">
                      <Link className="w-3 h-3 text-[var(--primary)]" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{dep.predecessorName}</p>
                      <p className="text-xs text-gray-500">
                        {DEP_TYPES.find(d => d.value === dep.dependencyType)?.label}
                        {dep.lagDays > 0 && ` + ${dep.lagDays}d lag`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(dep.id)}
                    className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove dependency">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new dependency */}
        <div className="px-5 py-3 border-t bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Add Predecessor
          </p>
          <div className="space-y-3">
            {/* Task selector */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Predecessor Task *</label>
              <select className="form-select w-full text-sm" value={selectedPred}
                onChange={e => setSelectedPred(e.target.value)}>
                <option value="">Select a task…</option>
                {available.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.wbsCode ? `${t.wbsCode} — ` : ''}{t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Dependency type */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select className="form-select w-full text-sm" value={depType}
                  onChange={e => setDepType(e.target.value)}>
                  {DEP_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              {/* Lag days */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lag Days</label>
                <input type="number" className="form-input w-full text-sm" min={0} max={365}
                  value={lagDays} onChange={e => setLagDays(Number(e.target.value))}
                  placeholder="0" />
              </div>
            </div>

            {/* Type description */}
            {depType && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {DEP_TYPES.find(d => d.value === depType)?.desc}
              </p>
            )}

            {/* Add button */}
            <button
              onClick={() => addMutation.mutate()}
              disabled={!selectedPred || addMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              {addMutation.isPending ? 'Adding…' : 'Add Dependency'}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t">
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
