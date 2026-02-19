import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

import { SellerDashboard } from './pages/SellerDashboard';
import { SellerInvoiceDetail } from './pages/SellerInvoiceDetail';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { BuyerInvoiceDetail } from './pages/BuyerInvoiceDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { BuyerList } from './pages/BuyerList';
import { ChatPage } from './pages/ChatPage';

import { DataProvider } from './contexts/DataContext';
import { MarketProvider } from './contexts/MarketContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardRedirector } from './components/DashboardRedirector';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MarketProvider>
          <DataProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<Layout />}>
                <Route path="/" element={<LandingPage />} />

                {/* Protected Routes: General */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardRedirector />} />
                </Route>

                {/* Protected Routes: Seller */}
                <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                  <Route path="/seller/dashboard" element={<SellerDashboard />} />
                  <Route path="/seller/invoices/:id" element={<SellerInvoiceDetail />} />
                  <Route path="/buyers" element={<BuyerList />} />
                </Route>

                {/* Protected Routes: Buyer */}
                <Route element={<ProtectedRoute allowedRoles={['buyer', 'admin']} />}>
                  <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
                  <Route path="/invoices" element={<BuyerDashboard />} />
                  <Route path="/market/invoices/:id" element={<BuyerInvoiceDetail />} />
                </Route>

                {/* Protected Routes: Shared/Admin */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/chat" element={<ChatPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </MarketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
