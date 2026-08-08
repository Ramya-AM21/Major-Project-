import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { CreateFoodListing } from './pages/CreateFoodListing';
import { FoodDetailPage } from './pages/FoodDetailPage';
import { VolunteerDashboard } from './pages/VolunteerDashboard';
import { VolunteerRoutes } from './pages/VolunteerRoutes';
import { AdminDashboard } from './pages/AdminDashboard';

// Protected Route Wrapper to enforce JWT and Role based permissions
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center space-y-2">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-650 animate-spin"></div>
        <span className="text-xs font-semibold text-gray-500">Checking auth token...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Unauthorized roles get redirected to landing page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Food Provider Dashboard Routes */}
          <Route 
            path="/provider/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <DashboardLayout>
                  <ProviderDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/provider/food" 
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <DashboardLayout>
                  <ProviderDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/provider/food/new" 
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <DashboardLayout>
                  <CreateFoodListing />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/provider/food/:id" 
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <DashboardLayout>
                  <FoodDetailPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Volunteer Commute Dashboard Routes */}
          <Route 
            path="/volunteer/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['VOLUNTEER']}>
                <DashboardLayout>
                  <VolunteerDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/volunteer/routes" 
            element={
              <ProtectedRoute allowedRoles={['VOLUNTEER']}>
                <DashboardLayout>
                  <VolunteerRoutes />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Administration Control Panel Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/anomalies" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/zones" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
