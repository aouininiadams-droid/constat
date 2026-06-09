import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TrackingProvider } from './contexts/TrackingContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DispatchDashboard from './pages/dispatch/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import LiveMap from './pages/dispatch/LiveMap';
import MissionHistory from './pages/dispatch/MissionHistory';
import MissionDetails from './pages/missions/MissionDetails';

const PrivateRoute: React.FC<{ children: React.ReactNode; role?: 'dispatch' | 'agent' }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen font-black text-slate-400 animate-pulse">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

const RootRedirect = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile?.role === 'dispatch') return <Navigate to="/dispatch" />;
  if (profile?.role === 'agent') return <Navigate to="/agent" />;
  return <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <TrackingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/dispatch" element={
              <PrivateRoute role="dispatch">
                <DispatchDashboard />
              </PrivateRoute>
            } />
            
            <Route path="/dispatch/map" element={
              <PrivateRoute role="dispatch">
                <LiveMap />
              </PrivateRoute>
            } />

            <Route path="/dispatch/history" element={
              <PrivateRoute role="dispatch">
                <MissionHistory />
              </PrivateRoute>
            } />

            <Route path="/agent" element={
              <PrivateRoute role="agent">
                <AgentDashboard />
              </PrivateRoute>
            } />

            <Route path="/missions/:id" element={
              <PrivateRoute>
                <MissionDetails />
              </PrivateRoute>
            } />

            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </TrackingProvider>
    </AuthProvider>
  );
}
