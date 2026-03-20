import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as signalR from '@microsoft/signalr';
import {
  LayoutDashboard, FolderKanban, CheckSquare, FileText,
  ShoppingCart, Package, DollarSign, AlertTriangle,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  User, Menu, X, ChevronDown, Wrench, Users,
  CheckCheck, HardHat, ClipboardList, BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api, authApi } from '../../lib/api';
import clsx from 'clsx';

// ─── Nav structure ─────────────────────────────────────────────
interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  children?: { label: string; to: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   to: '/dashboard',   icon: LayoutDashboard },
  { label: 'Projects',    to: '/projects',    icon: FolderKanban    },
  { label: 'My Tasks',    to: '/tasks',       icon: CheckSquare     },
  {
    label: 'Documents',   to: '/documents',   icon: FileText,
    children: [
      { label: 'Document Centre', to: '/documents'              },
      { label: 'Drawings',        to: '/documents?tab=drawings' },
      { label: 'Change Requests', to: '/documents?tab=changes'  },
    ]
  },
  { label: 'Procurement', to: '/procurement', icon: ShoppingCart  },
  { label: 'Inventory',   to: '/inventory',   icon: Package       },
  { label: 'Resources',   to: '/resources',   icon: Wrench        },
  { label: 'Budget',      to: '/budget',      icon: DollarSign    },
  { label: 'Risks',       to: '/risks',       icon: AlertTriangle },
  { label: 'Labour',      to: '/labour',      icon: HardHat       },
  { label: 'DPR',         to: '/dpr',         icon: ClipboardList },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Users',    to: '/admin/users',    icon: Users    },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

// ─── Logo component ────────────────────────────────────────────
function MeruLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2.5 transition-all', collapsed && 'justify-center')}>
      {/* Oil drop icon */}
      <svg width="32" height="38" viewBox="0 0 32 38" fill="none" className="flex-shrink-0">
        <path d="M16 2C16 2 2 16 2 24C2 31.18 8.27 37 16 37C23.73 37 30 31.18 30 24C30 16 16 2 16 2Z"
          fill="#FFCC00"/>
        <ellipse cx="11.5" cy="21" rx="3" ry="4.5" fill="white" opacity="0.42"
          transform="rotate(-20 11.5 21)"/>
      </svg>
      {!collapsed && (
        <div>
          <span className="text-white font-bold tracking-tight" style={{ fontSize: '20px', letterSpacing: '-0.3px' }}>
            <span style={{ color: '#D1111C', fontSize: '22px' }}>m</span>eru
          </span>
          <p className="text-xs leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.40)', fontSize: '10px', letterSpacing: '0.06em' }}>
            EPM SYSTEM
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Nav Item Component ────────────────────────────────────────
function NavItem({
  item, collapsed, expanded, onExpand
}: {
  item: NavItem; collapsed: boolean; expanded: boolean; onExpand: () => void;
}) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  // Check if this item or any child is active
  const isActive = !hasChildren
    ? location.pathname === item.to || location.pathname.startsWith(item.to + '/')
    : item.children!.some(c => location.pathname.startsWith(c.to));

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onExpand}
          title={collapsed ? item.label : undefined}
          className={clsx(
            'w-full text-left sidebar-item',
            isActive && !expanded && 'sidebar-item-active',
            collapsed && 'justify-center'
          )}
        >
          <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-sm">{item.label}</span>
              <ChevronDown className={clsx(
                'w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0',
                expanded && 'rotate-180'
              )} />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="mt-0.5 mb-1 ml-4 pl-3"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.10)' }}>
            {item.children!.map(child => (
              <NavLink key={child.to} to={child.to}
                className={({ isActive }) => clsx(
                  'block px-3 py-2 rounded-lg text-xs transition-colors duration-150 my-0.5',
                  isActive
                    ? 'text-white font-medium bg-[rgba(209,17,28,0.15)]'
                    : 'hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                )}
                style={({ isActive }) => ({ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' })}>
                {child.label}
              </NavLink>
            ))}
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
        collapsed && 'justify-center'
      )}
    >
      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!collapsed && <span className="text-sm">{item.label}</span>}
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

  // SignalR
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
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full font-bold text-white text-[10px] min-w-[16px] h-4 px-1"
            style={{ background: 'var(--primary)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 z-50 rounded-xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Notifications {unread > 0 && <span style={{ color: 'var(--primary)' }}>({unread})</span>}
              </span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => markAllMutation.mutate()}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--primary)' }}>
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {(notifList as any[]).length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                </div>
              ) : (notifList as any[]).map((n: any) => (
                <div key={n.id}
                  className="px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: !n.isRead ? 'rgba(209,17,28,0.03)' : undefined
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = !n.isRead ? 'rgba(209,17,28,0.03)' : 'transparent')}
                  onClick={() => api.patch(`/notifications/${n.id}/read`).then(() => { refetchCount(); qc.invalidateQueries({ queryKey: ['notif-list'] }); })}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: 'var(--primary)' }} />
                    )}
                    <div className={clsx('flex-1 min-w-0', n.isRead && 'pl-4')}>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
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
  const [expandedNav,  setExpandedNav]  = useState<string | null>(() => {
    // Auto-expand Documents if on documents route
    if (location.pathname.startsWith('/documents')) return 'Documents';
    return null;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/login');
    toast.success('Signed out');
  };

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className={clsx('sidebar transition-all duration-300 ease-in-out', collapsed ? 'w-16' : 'w-60')}
        style={{
          transform: mobileOpen ? 'translateX(0)' : undefined,
          position: 'fixed',
        }}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center px-4 py-5 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <MeruLogo collapsed={collapsed} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={collapsed}
              expanded={expandedNav === item.label}
              onExpand={() => setExpandedNav(v => v === item.label ? null : item.label)}
            />
          ))}

          {isAdmin() && (
            <>
              <div className="mx-2 my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Admin
                </p>
              )}
              {ADMIN_NAV.map(item => (
                <NavItem
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

        {/* Collapse toggle */}
        <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.40)'; }}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ marginLeft: collapsed ? '64px' : '240px', transition: 'margin-left 0.3s ease' }}
      >
        {/* TOPBAR — Brand spec: 56px, white, border-bottom */}
        <header
          className="flex items-center gap-3 px-6 flex-shrink-0 z-10"
          style={{
            height: 'var(--topbar-height)',
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(v => !v)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Notification Bell */}
          <NotificationBell />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
            >
              {/* Avatar — Meru Red */}
              <div className="avatar avatar-sm" style={{ background: 'var(--primary)' }}>
                {initials || 'U'}
              </div>
              <span className="text-sm font-medium hidden md:block" style={{ color: 'var(--text-primary)' }}>
                {user?.firstName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 hidden md:block" style={{ color: 'var(--text-muted)' }} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-12 w-56 z-50 rounded-xl overflow-hidden animate-slide-up"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                  {/* User info */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {user?.roles?.slice(0, 2).map(r => (
                        <span key={r} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                      className="dropdown-item"
                    >
                      <User className="w-4 h-4" /> My Profile
                    </button>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item danger">
                      <LogOut className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--primary)' }}>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
