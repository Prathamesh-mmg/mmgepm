// src/pages/admin/UsersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Users, Plus, X, Loader2, Shield, CheckCircle, Ban } from 'lucide-react';
import { usersApi } from '../../lib/api';
import clsx from 'clsx';

const createUserSchema = z.object({
  firstName:   z.string().min(2),
  lastName:    z.string().min(2),
  email:       z.string().email(),
  password:    z.string().min(8, 'Min 8 characters'),
  department:  z.string().optional(),
  designation: z.string().optional(),
  employeeId:  z.string().optional(),
  roleIds:     z.array(z.string()).min(1, 'Assign at least one role'),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [search,      setSearch]      = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [editUser,    setEditUser]    = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn:  () => usersApi.getAll({ search }).then(r => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn:  () => usersApi.getRoles().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { roleIds: [] },
  });

  const watchedRoles = watch('roleIds') ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => usersApi.create({
      firstName:  data.firstName,
      lastName:   data.lastName,
      email:      data.email,
      password:   data.password,
      department: data.department || null,
      jobTitle:   data.designation || null,
      roles:      data.roleIds,   // backend expects List<string> Roles
    }),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create user'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => usersApi.update(id, { isActive }),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleRole = (roleName: string) => {
    const current = watchedRoles;
    setValue(
      'roleIds',
      current.includes(roleName) ? current.filter(r => r !== roleName) : [...current, roleName]
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {users?.length ?? 0} users · Manage accounts and role assignments
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Search users…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Department</th><th>Designation</th>
              <th>Roles</th><th>Last Login</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" /></td></tr>
              : !users?.length
                ? <tr><td colSpan={8} className="text-center py-10 text-[var(--text-secondary)]">No users found</td></tr>
                : users.map((u: any) => (
                  <tr key={u.userId}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)] text-xs">
                          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">{u.email}</td>
                    <td className="text-sm">{u.department ?? '—'}</td>
                    <td className="text-sm">{u.designation ?? '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map((r: any) => (
                          <span key={r.roleId} className="badge-yellow text-[10px]">{r.roleCode}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td>
                      <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className={clsx('btn-icon btn-sm', u.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-600')}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActiveMutation.mutate({ id: u.userId, isActive: !u.isActive })}
                        >
                          {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal max-w-2xl w-full">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="font-semibold">Create New User</h2>
              </div>
              <button className="btn-icon btn-ghost" onClick={() => { setShowCreate(false); reset(); }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input className="input" {...register('firstName')} />
                  {errors.firstName && <p className="input-error">{errors.firstName.message}</p>}
                </div>
                <div className="input-group">
                  <label className="input-label">Last Name *</label>
                  <input className="input" {...register('lastName')} />
                  {errors.lastName && <p className="input-error">{errors.lastName.message}</p>}
                </div>
                <div className="input-group">
                  <label className="input-label">Email *</label>
                  <input className="input" type="email" {...register('email')} />
                  {errors.email && <p className="input-error">{errors.email.message}</p>}
                </div>
                <div className="input-group">
                  <label className="input-label">Password *</label>
                  <input className="input" type="password" {...register('password')} />
                  {errors.password && <p className="input-error">{errors.password.message}</p>}
                </div>
                <div className="input-group">
                  <label className="input-label">Employee ID</label>
                  <input className="input" {...register('employeeId')} />
                </div>
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <input className="input" placeholder="e.g. Engineering" {...register('department')} />
                </div>
                <div className="input-group col-span-2">
                  <label className="input-label">Designation</label>
                  <input className="input" placeholder="e.g. Senior Project Manager" {...register('designation')} />
                </div>
                {/* Role assignment */}
                <div className="input-group col-span-2">
                  <label className="input-label">Roles * (select one or more)</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {roles?.map((r: any) => (
                      <button
                        key={r.roleId}
                        type="button"
                        onClick={() => toggleRole(r.name)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          watchedRoles.includes(r.name)
                            ? 'bg-[var(--primary)] text-[#0e0b08] border-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
                        )}
                      >
                        {r.roleName}
                      </button>
                    ))}
                  </div>
                  {errors.roleIds && <p className="input-error">{errors.roleIds.message}</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
