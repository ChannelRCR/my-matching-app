import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const DashboardRedirector: React.FC = () => {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            navigate('/login');
            return;
        }

        if (profile) {
            const redirectPath = sessionStorage.getItem('redirectPath');
            if (redirectPath) {
                sessionStorage.removeItem('redirectPath');
                navigate(redirectPath, { replace: true });
                return;
            }

            if (profile.role === 'seller') {
                navigate({ pathname: '/seller/dashboard', search: location.search }, { replace: true });
            } else if (profile.role === 'buyer') {
                navigate({ pathname: '/buyer/dashboard', search: location.search }, { replace: true });
            } else if (profile.role === 'admin') {
                navigate({ pathname: '/admin', search: location.search }, { replace: true });
            } else {
                // Fallback
                navigate({ pathname: '/onboarding', search: location.search }, { replace: true });
            }
        } else {
            navigate('/onboarding', { replace: true });
        }
    }, [user, profile, loading, navigate, location.search]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
};
