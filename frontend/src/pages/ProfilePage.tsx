// src/pages/ProfilePage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore(s => ({ user: s.user, setUser: s.setUser }));
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const pwMutation = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed'); pwForm.reset(); },
    onError:   () => toast.error('Failed to change password'),
  });

  const onPwSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      pwForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    pwMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">My Profile</h1>

      {/* Avatar + name */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-400 flex items-center justify-center text-2xl font-bold text-dark-900">
          {user?.firstName?.charAt(0) ?? 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {user?.roles?.map(r => <span key={r} className="badge-yellow text-xs">{r}</span>)}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <User className="w-4 h-4 inline mr-1.5" />Profile
        </button>
        <button className={`tab-item ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
          <Lock className="w-4 h-4 inline mr-1.5" />Change Password
        </button>
      </div>

      {tab === 'profile' && (
        <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-[var(--text-secondary)] mb-0.5">Full Name</p><p className="font-medium">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'}</p></div>
          <div><p className="text-xs text-[var(--text-secondary)] mb-0.5">Email</p><p className="font-medium">{user?.email ?? '—'}</p></div>
          <div><p className="text-xs text-[var(--text-secondary)] mb-0.5">Designation</p><p className="font-medium">{user?.designation ?? '—'}</p></div>
          <div><p className="text-xs text-[var(--text-secondary)] mb-0.5">Department</p><p className="font-medium">{user?.department ?? '—'}</p></div>
        </div>
      )}

      {tab === 'password' && (
        <div className="card">
          <div className="card-header"><span className="font-medium text-sm">Change Password</span></div>
          <form onSubmit={pwForm.handleSubmit(onPwSubmit)} className="card-body space-y-4">
            <div className="input-group">
              <label className="input-label">Current Password</label>
              <input type="password" className="input" {...pwForm.register('currentPassword', { required: true })} />
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input type="password" className="input" {...pwForm.register('newPassword', { required: true, minLength: 8 })} />
              <p className="input-hint">At least 8 characters with uppercase, number and special character</p>
            </div>
            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input type="password" className="input" {...pwForm.register('confirmPassword', { required: true })} />
              {pwForm.formState.errors.confirmPassword && (
                <p className="input-error">{pwForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" disabled={pwMutation.isPending} className="btn-primary">
              {pwMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <><Save className="w-4 h-4" /> Update Password</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
