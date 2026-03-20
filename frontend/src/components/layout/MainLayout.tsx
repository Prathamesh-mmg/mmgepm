import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as signalR from '@microsoft/signalr';
import {
  LayoutDashboard, FolderKanban, CheckSquare, FileText,
  ShoppingCart, Package, DollarSign, AlertTriangle,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  User, Menu, X, ChevronDown, Wrench, Users, CheckCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api, authApi, notificationsApi } from '../../lib/api';
import clsx from 'clsx';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',   to: '/dashboard',   icon: LayoutDashboard },
  { label: 'Projects',    to: '/projects',    icon: FolderKanban    },
  { label: 'My Tasks',    to: '/tasks',       icon: CheckSquare     },
  {
    label: 'Documents', to: '/documents', icon: FileText,
    children: [
      { label: 'Document Center', to: '/documents' },
      { label: 'Drawings',        to: '/documents?tab=drawings' },
      { label: 'Change Requests', to: '/documents?tab=changes'  },
    ]
  },
  { label: 'Procurement', to: '/procurement', icon: ShoppingCart    },
  { label: 'Inventory',   to: '/inventory',   icon: Package         },
  { label: 'Resources',   to: '/resources',   icon: Wrench          },
  { label: 'Budget',      to: '/budget',      icon: DollarSign      },
  { label: 'Risks',       to: '/risks',       icon: AlertTriangle   },
];

const adminNavItems: NavItem[] = [
  { label: 'Users',    to: '/admin/users',    icon: Users    },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, clearAuth, isAdmin } = useAuthStore(s => ({
    user: s.user, clearAuth: s.clearAuth, isAdmin: s.isAdmin,
  }));

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [expandedNav,  setExpandedNav]  = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);

  // Unread notification count
  const { data: unreadData, refetch: refetchCount } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Notification list (lazy)
  const { data: notifList = [], refetch: refetchList } = useQuery({
    queryKey: ['notif-list'],
    queryFn: () => api.get('/notifications', { params: { take: 15 } }).then(r => r.data),
    enabled: notifOpen,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => { refetchCount(); refetchList(); },
  });

  // SignalR real-time notifications
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/notifications', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('notification', () => { refetchCount(); });
    connection.start().catch(() => {/* silent fail in dev */});
    return () => { connection.stop(); };
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
    toast.success('Signed out');
  };

  const isAdminUser = isAdmin();

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={clsx(
        'fixed lg:relative z-30 h-full flex flex-col bg-dark-800 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-dark-700', collapsed && 'justify-center px-2')}>
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-dark-900">M</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-white font-bold text-sm leading-tight">MMG EPM</p>
              <p className="text-gray-500 text-[10px]">Enterprise PM</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {navItems.map(item => (
            <NavItemComponent key={item.to} item={item} collapsed={collapsed}
              expanded={expandedNav === item.label}
              onExpand={() => setExpandedNav(v => v === item.label ? null : item.label)} />
          ))}

          {isAdminUser && (
            <>
              <div className={clsx('mx-2 my-3 border-t border-dark-700', collapsed && 'mx-1')} />
              <p className={clsx('text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1', collapsed && 'hidden')}>
                Admin
              </p>
              {adminNavItems.map(item => (
                <NavItemComponent key={item.to} item={item} collapsed={collapsed} expanded={false} onExpand={() => {}} />
              ))}
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-dark-700">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center gap-3 px-4 flex-shrink-0 z-10">
          {/* Mobile menu toggle */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            onClick={() => setMobileOpen(v => !v)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / page title area */}
          <div className="flex-1" />

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-11 w-80 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-modal z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <span className="font-semibold text-sm">
                      Notifications {unreadCount > 0 && <span className="text-red-500">({unreadCount})</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllMutation.mutate()}
                          className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" /> All read
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)}>
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {(notifList as any[]).length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No notifications yet</p>
                      </div>
                    ) : (
                      (notifList as any[]).map((n: any) => (
                        <div key={n.id}
                          className={clsx(
                            'px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer',
                            !n.isRead && 'bg-brand-400/5'
                          )}
                          onClick={() => api.patch(`/notifications/${n.id}/read`).then(() => { refetchCount(); refetchList(); })}
                        >
                          <div className="flex items-start gap-2.5">
                            {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />}
                            <div className={clsx('flex-1 min-w-0', n.isRead && 'pl-4')}>
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{n.title}</p>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-400 flex items-center justify-center text-dark-900 text-xs font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium text-[var(--text-primary)] hidden md:block">
                    {user?.firstName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
                </>
              )}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-52 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-modal z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {user?.roles?.slice(0,2).map(r => (
                        <span key={r} className="text-[10px] bg-brand-400/15 text-brand-700 rounded px-1.5 py-0.5">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </button>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Nav Item ──────────────────────────────────────────────────
function NavItemComponent({
  item, collapsed, expanded, onExpand
}: {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  onExpand: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onExpand}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
            'text-gray-400 hover:bg-dark-700 hover:text-white',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="ml-4 pl-3 border-l border-dark-700 mb-1">
            {item.children!.map(child => (
              <NavLink key={child.to} to={child.to}
                className={({ isActive }) => clsx(
                  'flex items-center px-3 py-2 rounded-lg text-xs transition-colors mb-0.5',
                  isActive ? 'text-brand-400 bg-brand-400/10' : 'text-gray-400 hover:text-white hover:bg-dark-700'
                )}>
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
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
        isActive
          ? 'bg-brand-400/10 text-brand-400 font-medium'
          : 'text-gray-400 hover:bg-dark-700 hover:text-white',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}
