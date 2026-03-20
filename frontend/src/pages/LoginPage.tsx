import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      const { data } = await authApi.login(values);
      setAuth(data.accessToken, data.refreshToken, data.user);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#181410' }}>

      {/* ── Left panel — Brand visual ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background geometry */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1510 0%, #0e0b08 100%)' }} />
        {/* Red accent circle */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--primary)' }} />
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-5"
          style={{ background: '#FFCC00' }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <svg width="56" height="66" viewBox="0 0 56 66" fill="none">
              <path d="M28 3C28 3 4 27 4 43C4 55.15 14.75 65 28 65C41.25 65 52 55.15 52 43C52 27 28 3 28 3Z"
                fill="#FFCC00"/>
              <ellipse cx="20" cy="38" rx="5.5" ry="8" fill="white" opacity="0.40"
                transform="rotate(-20 20 38)"/>
            </svg>
            <div className="text-left">
              <div className="font-bold" style={{ fontSize: '36px', letterSpacing: '-0.5px', color: '#FFFFFF', lineHeight: '1' }}>
                <span style={{ color: '#D1111C' }}>m</span>eru
              </div>
              <div className="font-medium tracking-widest mt-0.5"
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>
                GROUP
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Enterprise Project Management</h2>
          <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)', fontSize: '14px' }}>
            Plan, execute and track projects across all Mount Meru operations — from Tanzania to UAE.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Project Planning','Gantt Charts','Risk Management','DPR Automation','Labour Tracking'].map(f => (
              <span key={f}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
            Tanzania · Zambia · Uganda · Kenya · Malawi · UAE · India
          </p>
        </div>
      </div>

      {/* ── Right panel — Login form ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12"
        style={{ backgroundColor: 'var(--bg-secondary)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
            <path d="M16 2C16 2 2 16 2 24C2 31.18 8.27 37 16 37C23.73 37 30 31.18 30 24C30 16 16 2 16 2Z"
              fill="#FFCC00"/>
            <ellipse cx="11.5" cy="21" rx="3" ry="4.5" fill="white" opacity="0.42"
              transform="rotate(-20 11.5 21)"/>
          </svg>
          <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--primary)' }}>m</span>eru EPM
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Sign in
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Access your project management workspace
            </p>
          </div>

          {/* Form card */}
          <div className="card" style={{ padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    {...register('email')}
                    type="email"
                    className="form-input pl-10"
                    placeholder="you@mtmerugroup.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="input-error">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    className="form-input pl-10 pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="input-error">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-2"
                style={{ height: '44px', fontSize: '15px' }}
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  : 'Sign in'
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Mount Meru Group — Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
