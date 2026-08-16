import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Menu, X, Bell, User as UserIcon, Shield, 
  MapPin, Truck, Utensils, BarChart3, AlertTriangle, Layers, Route, Award
} from 'lucide-react';
import axios from 'axios';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Real Notification State
  interface SystemNotification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt?: string;
  }

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const fetchNotifications = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      const res = await axios.get('/api/v1/notifications', {
        headers: { Authorization: authHeader }
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.warn("Failed to load user notifications:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      await axios.post('/api/v1/notifications/read-all', {}, {
        headers: { Authorization: authHeader }
      });
      fetchNotifications();
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  const handleMarkOneRead = async (nid: string) => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      await axios.post(`/api/v1/notifications/${nid}/read`, {}, {
        headers: { Authorization: authHeader }
      });
      fetchNotifications();
    } catch (err) {
      console.warn("Failed to mark single notification read:", err);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const diff = new Date().getTime() - new Date(timeStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(timeStr).toLocaleDateString();
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8081/ws/tracking`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.topic === 'NOTIFICATION' || data.type === 'NOTIFICATION')) {
            fetchNotifications();
          }
        } catch (err) {
          // ignore
        }
      };
    } catch (e) {
      console.warn("WebSocket notification listener failed:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user]);

  if (!user) return null;

  // Build role-specific menus
  const getSidebarItems = (): SidebarItem[] => {
    switch (user.role) {
      case 'PROVIDER':
        return [
          { label: 'Dashboard', path: '/provider/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Listings', path: '/provider/food', icon: <Utensils className="w-5 h-5" /> },
          { label: 'Add Surplus', path: '/provider/food/new', icon: <MapPin className="w-5 h-5" /> },
        ];
      case 'VOLUNTEER':
        return [
          { label: 'Dashboard', path: '/volunteer/dashboard', icon: <Truck className="w-5 h-5" /> },
          { label: 'Travel Routes', path: '/volunteer/routes', icon: <Route className="w-5 h-5" /> },
          { label: 'Find Matching Food', path: '/volunteer/matching', icon: <Layers className="w-5 h-5" /> },
          { label: 'Redeem Rewards', path: '/volunteer/rewards', icon: <Award className="w-5 h-5" /> },
        ];
      case 'COORDINATOR':
        return [
          { label: 'Dashboard', path: '/coordinator/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Shelter Status', path: '/coordinator/zones', icon: <MapPin className="w-5 h-5" /> },
        ];
      case 'ADMIN':
        return [
          { label: 'Overview', path: '/admin/dashboard', icon: <Shield className="w-5 h-5" /> },
          { label: 'Anomalies Review', path: '/admin/anomalies', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Manage Zones', path: '/admin/zones', icon: <MapPin className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const menuItems = getSidebarItems();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text flex organic-pattern">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-natural-border shadow-xs">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-natural-border bg-white">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <span className="font-display font-black text-sm tracking-tighter">eM</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-xs text-natural-text tracking-tight uppercase leading-none">E-Meal</span>
              <span className="text-[8px] font-bold text-brand-500 uppercase tracking-widest leading-none mt-0.5 font-mono">Route Rescue</span>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-natural-border bg-white">
          <div className="flex items-center space-x-3 p-3 rounded-xl border border-natural-border bg-brand-50/40">
            <div className="w-9 h-9 rounded-full bg-brand-600/10 text-brand-600 border border-brand-200 flex items-center justify-center font-display font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden text-left">
              <h4 className="font-bold text-xs text-natural-text truncate font-display">{user.name}</h4>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-brand-100 text-brand-700 text-[8px] font-bold font-mono tracking-wider uppercase mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                {user.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto bg-white">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-sm font-black transform scale-[1.02]' 
                    : 'text-natural-muted hover:bg-brand-50/60 hover:text-brand-700'
                }`}
              >
                <span className="mr-3 stroke-[2.5]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-natural-border bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-natural-border flex items-center justify-between px-6 z-10 shadow-xs">
          <div className="flex items-center">
            {/* Mobile Menu Trigger (hidden on mobile if bottom nav exists, or keep as a drawer) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-natural-muted hover:bg-brand-50 mr-2 border border-natural-border bg-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xs font-bold text-natural-text uppercase tracking-wider hidden md:block">
              {user.role} console
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-natural-muted hover:bg-natural-bg relative border border-natural-border bg-white transition-colors duration-200"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full border border-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-natural-border rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-natural-border flex justify-between items-center bg-[#FAF9F5]">
                    <span className="font-bold text-xs uppercase tracking-wider text-natural-text font-display">System Notifications</span>
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] uppercase font-bold text-brand-600 hover:text-brand-850 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="divide-y divide-natural-border max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-natural-muted text-xs font-semibold">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => !n.read && handleMarkOneRead(n.id)}
                          className={`p-3.5 text-left transition-all cursor-pointer ${n.read ? 'bg-white hover:bg-natural-bg' : 'bg-brand-50/20 hover:bg-brand-50/40'}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[11px] font-bold text-natural-text">{n.title}</span>
                            <span className="text-[9px] text-natural-muted font-bold font-mono">{formatTime(n.createdAt)}</span>
                          </div>
                          <p className="text-xs text-natural-muted mt-1 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile display */}
            <div className="flex items-center space-x-2 bg-[#FAF9F5] py-1 px-3 rounded-lg border border-natural-border">
              <div className="w-6 h-6 rounded bg-brand-600 text-white flex items-center justify-center font-display font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-natural-text hidden sm:inline-block">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAF9F5] ${user.role === 'VOLUNTEER' ? 'pb-24 md:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* Conditional Mobile Bottom Navigation Bar for Volunteers */}
      {user.role === 'VOLUNTEER' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-natural-border flex items-center justify-around z-40 px-2 shadow-lg">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-all ${
                  isActive ? 'text-brand-600 scale-105' : 'text-natural-muted'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-brand-50' : ''}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-5 h-5 stroke-[2.5]' })}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{item.label.replace('Find ', '').replace('Travel ', '').replace('Redeem ', '')}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Mobile Drawer Navigation Link Screen popup */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl p-4 border-r border-natural-border animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center mb-6">
              <span className="font-display font-black text-natural-text text-xs uppercase tracking-wider">Navigation Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-brand-50 border border-natural-border bg-[#FAF9F5] text-natural-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      isActive ? 'bg-brand-50 text-brand-700 font-extrabold border-l-4 border-brand-600' : 'text-natural-muted hover:bg-brand-50'
                    }`}
                  >
                    <span className="mr-3 text-natural-muted">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-auto flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold text-red-650 hover:bg-red-50 transition-colors uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
