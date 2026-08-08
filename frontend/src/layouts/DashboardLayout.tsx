import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Menu, X, Bell, User as UserIcon, Shield, 
  MapPin, Truck, Utensils, BarChart3, AlertTriangle, Layers, Route
} from 'lucide-react';

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

  // Demo notifications state
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'New route match detected', desc: 'A 35-meal donation is close to your route.', time: '5m ago', read: false },
    { id: '2', title: 'Pickup OTP verified', desc: ' Rahul verified pickup successfully.', time: '1h ago', read: true },
  ]);

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
          { label: 'Find Matches', path: '/volunteer/tasks', icon: <Layers className="w-5 h-5" /> },
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
    <div className="min-h-screen bg-[#FAF9F6] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-150">
          <Link to="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
              E
            </span>
            <span className="font-display font-bold text-gray-900 tracking-tight">E-Meal Logistics</span>
          </Link>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-gray-100 bg-brand-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-medium text-sm text-gray-900 truncate">{user.name}</h4>
              <span className="text-xs text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full font-medium inline-block mt-0.5">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Nav Links */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-150">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex items-center">
            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 mr-2"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()} Dashboard
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-gray-650 hover:bg-gray-50 relative border border-gray-100"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-550 border-2 border-white rounded-full bg-red-600"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <span className="font-semibold text-sm text-gray-800">Notifications</span>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-xs text-brand-600 font-medium hover:underline"
                    >
                      Clear unread
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 text-left ${n.read ? 'bg-white' : 'bg-brand-50/20'}`}>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-gray-900">{n.title}</span>
                          <span className="text-[10px] text-gray-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile display */}
            <div className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 rounded-full border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-medium text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-gray-700 hidden sm:inline-block">
                {user.name.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation Link Screen popup */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl p-4">
            <div className="flex justify-between items-center mb-6">
              <span className="font-display font-bold text-gray-900">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span className="mr-3 text-gray-400">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-auto flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
