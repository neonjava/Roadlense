import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLanding from './pages/MobileLanding';
import MobileReport from './pages/MobileReport';
import UserReports from './pages/UserReports';
import AdminDashboard from './pages/AdminDashboard';
import EngineerDashboard from './pages/EngineerDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MobileLanding />} />
          <Route path="/report" element={<MobileReport />} />
          <Route path="/my-reports" element={<UserReports />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/engineer" element={<EngineerDashboard />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;