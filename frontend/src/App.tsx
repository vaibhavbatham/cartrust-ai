import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddVehiclePage } from './pages/AddVehiclePage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { UploadPage } from './pages/UploadPage';
import { AssistantPage } from './pages/AssistantPage';
import { ComparePage } from './pages/ComparePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vehicles" element={<DashboardPage />} />
            <Route path="/vehicles/add" element={<AddVehiclePage />} />
            <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500 bg-slate-950">
          CarTrust AI • Used-Car Intelligence Platform • Grounded Evidence & Verification Architecture
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
