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
            if (profile.role === 'seller') {
                navigate({ pathname: '/seller/dashboard', search: location.search }, { replace: true });
            } else if (profile.role === 'buyer') {
                navigate({ pathname: '/buyer/dashboard', search: location.search }, { replace: true });
            } else if (profile.role === 'admin') {
                navigate({ pathname: '/admin', search: location.search }, { replace: true });
            } else {
                // Fallback
                navigate({ pathname: '/', search: location.search }, { replace: true });
            }
        }
    }, [user, profile, loading, navigate, location.search]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
};
