import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as signalR from '@microsoft/signalr';
import {
  LayoutDashboard, FolderKanban, FileText,
  ShoppingCart, Package, DollarSign, AlertTriangle,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  User, Menu, X, ChevronDown, Wrench, Users,
  CheckCheck, HardHat, Search, BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api, authApi } from '../../lib/api';
import clsx from 'clsx';

// ─── Nav structure ─────────────────────────────────────────────
interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
  children?: { label: string; to: string }[];
}

// ── 8 Modules per MMG EPM Requirement Documents ─────────────────
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Projects',  to: '/projects',  icon: FolderKanban,
    children: [
      { label: 'All Projects', to: '/projects' },
      { label: 'My Tasks',     to: '/tasks'    },
      { label: 'DPR',          to: '/dpr'      },
    ]
  },
  { label: 'Labour',      to: '/labour',      icon: HardHat      },
  {
    label: 'Documents', to: '/documents', icon: FileText,
    children: [
      { label: 'Document Centre', to: '/documents?tab=center'   },
      { label: 'Drawings',        to: '/documents?tab=drawings' },
      { label: 'Change Requests', to: '/documents?tab=changes'  },
    ]
  },
  { label: 'Procurement', to: '/procurement', icon: ShoppingCart  },
  { label: 'Inventory',   to: '/inventory',   icon: Package       },
  { label: 'Resources',   to: '/resources',   icon: Wrench        },
  { label: 'Budget',      to: '/budget',      icon: DollarSign    },
  { label: 'Risks',       to: '/risks',       icon: AlertTriangle },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Users',    to: '/admin/users',    icon: Users    },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

// ─── Logo ──────────────────────────────────────────────────────
function MeruLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={clsx('flex items-center transition-all duration-300', collapsed ? 'justify-center' : 'gap-3')}>
      <div className="relative flex-shrink-0">
        <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
          <path d="M17 2C17 2 3 17 3 26C3 33.73 9.27 39 17 39C24.73 39 31 33.73 31 26C31 17 17 2 17 2Z"
            fill="#FFCC00"/>
          <path d="M17 2C17 2 3 17 3 26C3 33.73 9.27 39 17 39C24.73 39 31 33.73 31 26C31 17 17 2 17 2Z"
            fill="url(#logoGrad)" opacity="0.3"/>
          <ellipse cx="12" cy="22" rx="3.5" ry="5.5" fill="white" opacity="0.45"
            transform="rotate(-20 12 22)"/>
          <defs>
            <linearGradient id="logoGrad" x1="3" y1="2" x2="31" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#000" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
        </svg>
        {/* Red accent dot */}
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{ background: 'var(--primary)', boxShadow: '0 0 6px rgba(209,17,28,0.8)' }} />
      </div>
      {!collapsed && (
        <div>
          <div className="font-bold" style={{ fontSize: '19px', letterSpacing: '-0.3px', color: '#FFFFFF', lineHeight: '1.1' }}>
            <span style={{ color: '#D1111C' }}>m</span>eru
          </div>
          <div className="font-semibold tracking-widest" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', marginTop: '1px' }}>
            EPM SYSTEM
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav Item ──────────────────────────────────────────────────
function NavItemComponent({
  item, collapsed, expanded, onExpand
}: {
  item: NavItem; collapsed: boolean; expanded: boolean; onExpand: () => void;
}) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  const isGroupActive = hasChildren && item.children!.some(c => {
    const childPath = c.to.split('?')[0];
    return location.pathname === childPath || location.pathname.startsWith(childPath + '/');
  });

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onExpand}
          title={collapsed ? item.label : undefined}
          className={clsx(
            'w-full text-left sidebar-item',
            isGroupActive && !expanded ? 'sidebar-item-active' : '',
            collapsed ? 'justify-center px-0' : ''
          )}
        >
          <item.icon className="w-[18px] h-[18px] flex-shrink-0 opacity-75" />
          {!collapsed && (
            <>
              <span className="flex-1 text-[13px]">{item.label}</span>
              <ChevronDown className={clsx(
                'w-3.5 h-3.5 transition-transform duration-250 flex-shrink-0 opacity-50',
                expanded && 'rotate-180'
              )} />
            </>
          )}
        </button>

        {!collapsed && expanded && (
          <div className="mt-0.5 mb-1.5">
            {item.children!.map(child => {
              const childPath = child.to.split('?')[0];
              const isChildActive = location.pathname === childPath ||
                (location.pathname.startsWith(childPath + '/') && childPath !== '/');
              return (
                <NavLink key={child.to} to={child.to}
                  className={clsx(
                    'sidebar-child-item',
                    isChildActive && 'active'
                  )}>
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => clsx(
        'sidebar-item',
        isActive ? 'sidebar-item-active' : '',
        collapsed ? 'justify-center px-0' : ''
      )}
    >
      <item.icon className="w-[18px] h-[18px] flex-shrink-0 opacity-75" />
      {!collapsed && <span className="text-[13px]">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--primary)', color: 'white', lineHeight: 1 }}>
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

// ─── Notification Bell ─────────────────────────────────────────
function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: countData, refetch: refetchCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: notifList = [] } = useQuery({
    queryKey: ['notif-list'],
    queryFn: () => api.get('/notifications', { params: { take: 15 } }).then(r => r.data),
    enabled: open,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => { refetchCount(); qc.invalidateQueries({ queryKey: ['notif-list'] }); },
  });

  const unread = countData?.count ?? 0;

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/notifications', { accessTokenFactory: () => token })
      .withAutomaticReconnect().build();
    conn.on('notification', () => refetchCount());
    conn.start().catch(() => {});
    return () => { conn.stop(); };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all"
        style={{ color: 'var(--text-secondary)', background: open ? 'var(--bg-tertiary)' : 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = open ? 'var(--bg-tertiary)' : 'transparent')}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="notif-dot" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-[340px] z-50 rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)' }}>
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                {unread > 0 && (
                  <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => markAllMutation.mutate()}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium"
                    style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {(notifList as any[]).length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <Bell className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>You're all caught up</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No notifications at this time</p>
                </div>
              ) : (notifList as any[]).map((n: any) => (
                <div key={n.id}
                  className="px-5 py-3.5 cursor-pointer transition-colors border-b"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: !n.isRead ? 'rgba(209,17,28,0.025)' : undefined
                  }}
                  onClick={() => api.patch(`/notifications/${n.id}/read`).then(() => { refetchCount(); qc.invalidateQueries({ queryKey: ['notif-list'] }); })}
                >
                  <div className="flex items-start gap-3">
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 6px rgba(209,17,28,0.4)' }} />
                    )}
                    <div className={clsx('flex-1 min-w-0', n.isRead && 'pl-5')}>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                      <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────
export default function MainLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, clearAuth, isAdmin } = useAuthStore(s => ({
    user: s.user, clearAuth: s.clearAuth, isAdmin: s.isAdmin,
  }));

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);

  const getAutoExpand = (path: string): string | null => {
    if (path.startsWith('/projects') || path.startsWith('/tasks') || path.startsWith('/dpr'))
      return 'Projects';
    if (path.startsWith('/documents'))
      return 'Documents';
    return null;
  };

  const [expandedNav, setExpandedNav] = useState<string | null>(() =>
    getAutoExpand(location.pathname)
  );

  useEffect(() => {
    const group = getAutoExpand(location.pathname);
    if (group) setExpandedNav(group);
  }, [location.pathname]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/login');
    toast.success('Signed out successfully');
  };

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const sidebarWidth = collapsed ? 68 : 260;

  // Get current page label for topbar
  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/dashboard') return 'Dashboard';
    if (p.startsWith('/projects')) return 'Project Management';
    if (p.startsWith('/tasks')) return 'My Tasks';
    if (p.startsWith('/dpr')) return 'Daily Progress Reports';
    if (p.startsWith('/labour')) return 'Labour Management';
    if (p.startsWith('/documents')) return 'Document Management';
    if (p.startsWith('/procurement')) return 'Procurement Tracker';
    if (p.startsWith('/inventory')) return 'Inventory Management';
    if (p.startsWith('/resources')) return 'Resource Management';
    if (p.startsWith('/budget')) return 'Budget Tracking';
    if (p.startsWith('/risks')) return 'Risk Management';
    if (p.startsWith('/admin/users')) return 'User Management';
    if (p.startsWith('/admin/settings')) return 'Settings';
    if (p.startsWith('/profile')) return 'My Profile';
    return 'MMG EPM';
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className={clsx(
          'sidebar flex flex-col overflow-hidden',
          collapsed ? 'w-[68px]' : 'w-[260px]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ position: 'fixed', zIndex: 30 }}
      >
        {/* Logo Area */}
        <div className="sidebar-logo-area flex items-center flex-shrink-0"
          style={{ minHeight: '68px' }}>
          <div className={clsx('w-full flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <MeruLogo collapsed={collapsed} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ paddingBottom: '8px', scrollbarWidth: 'none' }}>

          {/* Main Navigation */}
          {!collapsed && (
            <div className="sidebar-section-label">Navigation</div>
          )}

          {NAV_ITEMS.map(item => (
            <NavItemComponent
              key={item.to}
              item={item}
              collapsed={collapsed}
              expanded={expandedNav === item.label}
              onExpand={() => setExpandedNav(v => v === item.label ? null : item.label)}
            />
          ))}

          {/* Admin Section */}
          {isAdmin() && (
            <>
              <div className="mx-3 my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
              {!collapsed && (
                <div className="sidebar-section-label">Administration</div>
              )}
              {ADMIN_NAV.map(item => (
                <NavItemComponent
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  expanded={false}
                  onExpand={() => {}}
                />
              ))}
            </>
          )}
        </nav>

        {/* User quick info at bottom */}
        {!collapsed && (
          <div className="px-3 py-3 mx-2 mb-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5">
              <div className="avatar avatar-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), #9E0D15)' }}>
                {initials || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {user?.roles?.[0] ?? 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.30)' }}
                title="Sign out"
                onMouseEnter={e => (e.currentTarget.style.color = '#FF6B6B')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-xs font-medium">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ marginLeft: `${sidebarWidth}px`, transition: 'margin-left 0.3s ease' }}
      >
        {/* TOPBAR */}
        <header
          className="flex items-center gap-3 px-5 flex-shrink-0 z-10"
          style={{
            height: 'var(--topbar-height)',
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(v => !v)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title / breadcrumb */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div>
              <h1 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                {getPageTitle()}
              </h1>
              <p className="text-[11px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Actions right */}
          <div className="flex items-center gap-1.5">

            {/* Notification Bell */}
            <NotificationBell />

            {/* Divider */}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                style={{
                  background: userMenuOpen ? 'var(--bg-tertiary)' : 'transparent',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
                onMouseLeave={e => {
                  if (!userMenuOpen) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }
                }}
              >
                <div className="avatar avatar-sm">
                  {initials || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {user?.roles?.[0] ?? 'User'}
                  </p>
                </div>
                <ChevronDown className={clsx(
                  'w-3.5 h-3.5 hidden md:block transition-transform duration-200',
                  userMenuOpen && 'rotate-180'
                )} style={{ color: 'var(--text-muted)' }} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-60 z-50 rounded-2xl overflow-hidden animate-scale-in"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>

                    {/* User info header */}
                    <div className="px-4 py-4"
                      style={{ background: 'linear-gradient(135deg, rgba(209,17,28,0.04) 0%, rgba(255,204,0,0.03) 100%)', borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-md flex-shrink-0">
                          {initials || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {user?.roles?.slice(0, 2).map(r => (
                              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="py-1.5">
                      <button
                        onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                        className="dropdown-item">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--bg-secondary)' }}>
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>My Profile</span>
                      </button>

                      <div className="dropdown-divider" />

                      <button onClick={handleLogout} className="dropdown-item danger mx-1.5 mb-1 rounded-lg px-2.5"
                        style={{ color: '#DC2626' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: '#FEE2E2' }}>
                          <LogOut className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />
                        </div>
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
