import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Loader2, ChevronDown } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof schema>;

const DEMO_CREDS = [
  { role: 'Admin',               email: 'admin@mountmerugroup.com',         pwd: 'Admin@1234', color: '#D1111C' },
  { role: 'Project Manager',     email: 'pm@mountmerugroup.com',            pwd: 'MMG@2026',   color: '#3B82F6' },
  { role: 'Planning Engineer',   email: 'planning@mountmerugroup.com',      pwd: 'MMG@2026',   color: '#8B5CF6' },
  { role: 'Site Engineer',       email: 'siteeng@mountmerugroup.com',       pwd: 'MMG@2026',   color: '#F59E0B' },
  { role: 'Procurement Mgr',     email: 'procurement@mountmerugroup.com',   pwd: 'MMG@2026',   color: '#10B981' },
  { role: 'Store Manager',       email: 'store@mountmerugroup.com',         pwd: 'MMG@2026',   color: '#F97316' },
  { role: 'Finance',             email: 'finance@mountmerugroup.com',       pwd: 'MMG@2026',   color: '#06B6D4' },
  { role: 'Labour Manager',      email: 'labour@mountmerugroup.com',        pwd: 'MMG@2026',   color: '#EC4899' },
  { role: 'Document Controller', email: 'doccontrol@mountmerugroup.com',    pwd: 'MMG@2026',   color: '#6366F1' },
  { role: 'Risk Manager',        email: 'risk@mountmerugroup.com',          pwd: 'MMG@2026',   color: '#EF4444' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const [showPwd,   setShowPwd]   = useState(false);
  const [showDemo,  setShowDemo]  = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#0D0B08' }}>

      {/* ── Left Panel — Brand Visual ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #111009 0%, #0A0808 100%)' }}>

        {/* Geometric background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large yellow circle */}
          <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{ background: '#FFCC00' }} />
          {/* Red accent */}
          <div className="absolute top-20 -left-20 w-[300px] h-[300px] rounded-full opacity-[0.06]"
            style={{ background: '#D1111C' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }} />
          {/* Diagonal red line accent */}
          <div className="absolute top-0 left-0 w-full h-1"
            style={{ background: 'linear-gradient(90deg, var(--primary), transparent)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md px-12 text-center">

          {/* Logo */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="relative">
              <svg width="68" height="80" viewBox="0 0 68 80" fill="none">
                <path d="M34 4C34 4 6 34 6 52C6 67.46 18.54 79 34 79C49.46 79 62 67.46 62 52C62 34 34 4 34 4Z"
                  fill="#FFCC00"/>
                <path d="M34 4C34 4 6 34 6 52C6 67.46 18.54 79 34 79C49.46 79 62 67.46 62 52C62 34 34 4 34 4Z"
                  fill="url(#grad1)" opacity="0.4"/>
                <ellipse cx="24" cy="46" rx="7" ry="11" fill="white" opacity="0.40"
                  transform="rotate(-20 24 46)"/>
                <defs>
                  <linearGradient id="grad1" x1="6" y1="4" x2="62" y2="79" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFF" stopOpacity="0.4"/>
                    <stop offset="1" stopColor="#000" stopOpacity="0.15"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Red dot */}
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2"
                style={{ background: '#D1111C', borderColor: '#0D0B08', boxShadow: '0 0 12px rgba(209,17,28,0.6)' }} />
            </div>
            <div className="text-left">
              <div className="font-bold" style={{ fontSize: '44px', letterSpacing: '-1px', color: '#FFFFFF', lineHeight: '1' }}>
                <span style={{ color: '#D1111C' }}>m</span>eru
              </div>
              <div className="font-semibold tracking-widest mt-1"
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.22em' }}>
                GROUP
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.5px' }}>
              Enterprise Project<br/>Management
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '15px', lineHeight: '1.6' }}>
              Unified platform for planning, executing and tracking
              projects across all Mount Meru Group operations.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { label: 'Project Planning', icon: '📋' },
              { label: 'Gantt Charts',     icon: '📊' },
              { label: 'Risk Management',  icon: '🛡️' },
              { label: 'DPR Automation',   icon: '📝' },
              { label: 'Labour Tracking',  icon: '👷' },
              { label: 'Procurement',      icon: '🛒' },
              { label: 'Budget Control',   icon: '💰' },
              { label: 'Documents',        icon: '📁' },
            ].map(f => (
              <span key={f.label}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.52)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {f.icon} {f.label}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            {[
              { value: '8', label: 'Modules' },
              { value: '10+', label: 'Countries' },
              { value: '100%', label: 'Integrated' },
            ].map(s => (
              <div key={s.label} className="rounded-xl py-3 px-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xl font-bold" style={{ color: '#FFCC00' }}>{s.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 w-full text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Tanzania · Zambia · Uganda · Kenya · Malawi · Rwanda · UAE · India
          </p>
        </div>
      </div>

      {/* ── Right Panel — Login Form ────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto"
        style={{ backgroundColor: '#F4F5F7' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <svg width="36" height="42" viewBox="0 0 36 42" fill="none">
            <path d="M18 2C18 2 3 18 3 27C3 35.28 9.72 41 18 41C26.28 41 33 35.28 33 27C33 18 18 2 18 2Z"
              fill="#FFCC00"/>
            <ellipse cx="12.5" cy="23" rx="3.5" ry="5.5" fill="white" opacity="0.42"
              transform="rotate(-20 12.5 23)"/>
          </svg>
          <span className="font-bold text-2xl" style={{ color: '#111827', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#D1111C' }}>m</span>eru EPM
          </span>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Form heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827', letterSpacing: '-0.4px' }}>
              Sign in to your account
            </h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Access the Mount Meru EPM workspace
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E4E6EA', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>

            <form onSubmit={handleSubmit(onSubmit)} className="p-7 space-y-5">

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#9CA3AF' }} />
                  <input
                    {...register('email')}
                    type="email"
                    className="form-input pl-10"
                    placeholder="you@mountmerugroup.com"
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
                    style={{ color: '#9CA3AF' }} />
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
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#6B7280')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
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
                className="btn-primary w-full btn-lg"
                style={{ marginTop: '4px' }}
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  : 'Sign in'
                }
              </button>
            </form>
          </div>

          {/* Demo Credentials */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-medium"
              style={{
                color: '#6B7280',
                background: showDemo ? 'rgba(0,0,0,0.05)' : 'transparent',
                border: '1px dashed #D1D5DB'
              }}
            >
              <span>Demo credentials</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDemo ? 'rotate-180' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-3 rounded-2xl overflow-hidden animate-slide-down"
                style={{ border: '1px solid #E4E6EA', background: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div className="px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase"
                  style={{ background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)', color: '#9CA3AF', borderBottom: '1px solid #E4E6EA' }}>
                  Click a role to auto-fill credentials
                </div>
                <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                  {DEMO_CREDS.map(c => (
                    <button
                      key={c.role}
                      type="button"
                      onClick={() => { setValue('email', c.email); setValue('password', c.pwd); setShowDemo(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b"
                      style={{ borderColor: '#F3F4F6' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ background: c.color }}>
                        {c.role.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: '#111827' }}>{c.role}</p>
                        <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{c.email}</p>
                      </div>
                      <span className="text-[11px] font-mono font-semibold flex-shrink-0 px-2 py-0.5 rounded"
                        style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        {c.pwd}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-xs" style={{ color: '#9CA3AF' }}>
            © {new Date().getFullYear()} Mount Meru Group · Confidential · EPM System
          </p>
        </div>
      </div>
    </div>
  );
}
