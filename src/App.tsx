import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Layout } from './components/Layout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';

import { SellerDashboard } from './pages/SellerDashboard';
import { SellerInvoiceDetail } from './pages/SellerInvoiceDetail';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { BuyerInvoiceDetail } from './pages/BuyerInvoiceDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { BuyerList } from './pages/BuyerList';
import { ChatPage } from './pages/ChatPage';
import { ContractPrintPage } from './pages/ContractPrintPage';
import { ProfilePage } from './pages/ProfilePage';
import { TermsOfService } from './pages/TermsOfService';
import { HelpPage } from './pages/HelpPage';

import { DataProvider } from './contexts/DataContext';
import { MarketProvider } from './contexts/MarketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { DashboardRedirector } from './components/DashboardRedirector';

function GlobalLoader({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

function GlobalQueryHandler({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasToastedRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let modified = false;

    const donationSuccess = searchParams.get('donation_success');
    if (donationSuccess === 'true') {
      if (!hasToastedRef.current) {
        toast.success('ご支援ありがとうございます！運営チームの励みになります🎉', {
          duration: 5000,
          style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            fontWeight: 'bold',
          },
          iconTheme: {
            primary: '#16a34a',
            secondary: '#fff',
          },
        });
        hasToastedRef.current = true;
      }
      searchParams.delete('donation_success');
      modified = true;
    }

    const payment = searchParams.get('payment');
    if (payment === 'cancel') {
        toast.error('決済処理がキャンセルされました。');
        searchParams.delete('payment');
        modified = true;
    } else if (payment === 'success') {
        // success message is already handled by donation_success
        searchParams.delete('payment');
        modified = true;
    }

    if (modified) {
      const newSearch = searchParams.toString();
      navigate({ pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' }, { replace: true });
    }
  }, [location, navigate]);

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <GlobalQueryHandler>
        <AuthProvider>
          <MarketProvider>
          <DataProvider>
            <GlobalLoader>
              <Toaster position="top-center" />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />

                  {/* Protected Routes: General */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardRedirector />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>

                  {/* Protected Routes: Seller */}
                  <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                    <Route path="/seller/dashboard" element={<SellerDashboard />} />
                    <Route path="/seller/invoices/:id" element={<SellerInvoiceDetail />} />
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
                    <Route path="/contract/:dealId" element={<ContractPrintPage />} />
                    <Route path="/buyers" element={<BuyerList />} />
                  </Route>

                  <Route element={<AdminProtectedRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </GlobalLoader>
          </DataProvider>
        </MarketProvider>
      </AuthProvider>
      </GlobalQueryHandler>
    </BrowserRouter>
  );
}

export default App;
