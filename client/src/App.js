import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const LazyOverview = React.lazy(() => import('./pages/Overview'));
  const LazyScanEvents = React.lazy(() => import('./pages/ScanEvents'));
  const LazyFraudCases = React.lazy(() => import('./pages/FraudCases'));
  const LazyUniversities = React.lazy(() => import('./pages/Universities'));
  const LazyDocumentTypes = React.lazy(() => import('./pages/DocumentTypes'));
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyOverview />
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/scan-events" element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyScanEvents />
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/fraud-cases" element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyFraudCases />
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/universities" element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyUniversities />
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/document-types" element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyDocumentTypes />
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
