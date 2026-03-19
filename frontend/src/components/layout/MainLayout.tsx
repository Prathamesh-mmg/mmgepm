// src/components/layout/MainLayout.tsx
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as signalR from '@microsoft/signalr';
import {
  LayoutDashboard, FolderKanban, CheckSquare, FileText,
  ShoppingCart, Package, Users, DollarSign, AlertTriangle,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut,
  User, Menu, X, ChevronDown, Search, Wrench
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi, notificationsApi } from '../../lib/api';
import clsx from 'clsx';

interface NavItem {
  label:   string;
  to:      string;
  icon:    React.ElementType;
  badge?:  number;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    to: '/dashboard',    icon: LayoutDashboard },
  { label: 'Projects',     to: '/projects',     icon: FolderKanban    },
  { label: 'My Tasks',     to: '/tasks',        icon: CheckSquare     },
  {
    label: 'Documents',
    to:    '/documents',
    icon:  FileText,
    children: [
      { label: 'Document Center', to: '/documents/center'   },
      { label: 'Drawings',        to: '/documents/drawings' },
      { label: 'Change Requests', to: '/documents/cr'       },
    ]
  },
  { label: 'Procurement',  to: '/procurement',  icon: ShoppingCart    },
  { label: 'Inventory',    to: '/inventory',    icon: Package         },
  { label: 'Resources',    to: '/resources',    icon: Wrench          },
  { label: 'Budget',       to: '/budget',       icon: DollarSign      },
  { label: 'Risks',        to: '/risks',        icon: AlertTriangle   },
];

const adminNavItems: NavItem[] = [
  { label: 'Users',        to: '/admin/users',    icon: Users     },
  { label: 'Settings',     to: '/admin/settings', icon: Settings  },
];

export default function MainLayout() {
  const navigate     = useNavigate();
  const { user, clearAuth, isAdmin } = useAuthStore(s => ({
    user:     s.user,
    clearAuth: s.clearAuth,
    isAdmin:  s.isAdmin,
  }));

  const [collapsed,      setCollapsed]      = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [userOpen,       setUserOpen]       = useState(false);

  // Fetch unread notifications count
  const { data: unreadNotifs, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn:  () => notificationsApi.getUnread().then(r => r.data),
    refetchInterval: 60_000,
  });

  // SignalR for real-time notifications
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_WS_URL ?? 'http://localhost:5000'}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (notif) => {
      toast.custom((t) => (
        <div className={clsx('card p-3 max-w-sm shadow-lg border-l-4 border-brand-400', t.visible ? 'animate-slide-in' : '')}>
          <p className="font-medium text-sm">{notif.title}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{notif.message}</p>
        </div>
      ), { duration: 5000 });
      refetchNotifs();
    });

    connection.start().catch(console.error);
    return () => { connection.stop(); };
  }, []);

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate('/login');
  };

  const toggleGroup = (label: string) =>
    setExpandedGroups(p => ({ ...p, [label]: !p[label] }));

  const SidebarItem = ({ item }: { item: NavItem }) => {
    const hasChildren = !!item.children?.length;
    const isExpanded  = expandedGroups[item.label];
    const Icon        = item.icon;

    if (hasChildren) {
      return (
        <div>
          <button
            className="sidebar-item w-full"
            onClick={() => toggleGroup(item.label)}
          >
            <Icon className="icon" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
              </>
            )}
          </button>
          {isExpanded && !collapsed && (
            <div className="ml-7 mt-1 space-y-0.5 border-l border-dark-600 pl-3">
              {item.children?.map(child => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) =>
                    clsx('block py-1.5 px-2 text-sm rounded transition-colors',
                      isActive ? 'text-brand-400 font-medium' : 'text-gray-500 hover:text-gray-300')}
                >
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
        className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="icon" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full
                               bg-brand-400 text-dark-900 text-[10px] font-bold">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const Sidebar = () => (
    <div className={clsx(
      'fixed left-0 top-0 h-screen bg-dark-800 border-r border-dark-600 flex flex-col z-30 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center h-16 px-4 border-b border-dark-600', !collapsed && 'gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-dark-900">M</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-semibold text-sm">MMG EPM</div>
            <div className="text-gray-500 text-xs">Project Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 scrollbar-thin">
        {navItems.map(item => (
          <SidebarItem key={item.to} item={item} />
        ))}

        {isAdmin() && (
          <>
            <div className={clsx('px-4 pt-4 pb-1', collapsed && 'hidden')}>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Administration</p>
            </div>
            {adminNavItems.map(item => (
              <SidebarItem key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-dark-600">
        <button
          className="w-full flex items-center justify-center p-2 rounded-lg
                     text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
          onClick={() => setCollapsed(v => !v)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-dark-800 border-r border-dark-600 flex flex-col z-50">
            {/* Same sidebar content — extracted as component above */}
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className={clsx(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        collapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        {/* Top bar */}
        <header className="h-16 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center px-4 gap-4 sticky top-0 z-20">
          {/* Mobile menu */}
          <button
            className="lg:hidden btn-icon btn-ghost"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Global search */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="search"
              placeholder="Search projects, tasks…"
              className="input pl-9 py-1.5 text-sm bg-[var(--bg-secondary)]"
            />
          </div>

          <div className="flex-1 lg:flex-none" />

          {/* Notifications */}
          <div className="relative">
            <button
              className="btn-icon btn-ghost relative"
              onClick={() => setNotifOpen(v => !v)}
            >
              <Bell className="w-5 h-5" />
              {(unreadNotifs?.length ?? 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-400" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 card shadow-modal z-50 animate-slide-up">
                <div className="card-header py-3">
                  <span className="font-medium text-sm">Notifications</span>
                  <button
                    className="text-xs text-[var(--text-secondary)] hover:text-brand-500"
                    onClick={() => notificationsApi.markAllRead().then(() => refetchNotifs())}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!unreadNotifs?.length
                    ? <div className="p-6 text-center text-sm text-[var(--text-secondary)]">All caught up!</div>
                    : unreadNotifs.map((n: any) => (
                      <div key={n.notificationId} className="px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border)] last:border-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-tertiary)] transition-colors"
              onClick={() => setUserOpen(v => !v)}
            >
              <div className="w-8 h-8 rounded-full bg-brand-400 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-dark-900">
                  {user?.firstName?.charAt(0) ?? 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-tight">{user?.roles?.[0]}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] hidden sm:block" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 card shadow-modal z-50 animate-fade-in py-1">
                <NavLink to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--bg-secondary)]">
                  <User className="w-4 h-4" /> My Profile
                </NavLink>
                <NavLink to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--bg-secondary)]">
                  <Settings className="w-4 h-4" /> Settings
                </NavLink>
                <hr className="my-1 border-[var(--border)]" />
                <button
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
