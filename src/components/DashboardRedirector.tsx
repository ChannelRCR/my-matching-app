import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const DashboardRedirector: React.FC = () => {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            navigate('/login');
            return;
        }

        if (profile) {
            if (profile.role === 'seller') {
                navigate('/seller/dashboard');
            } else if (profile.role === 'buyer') {
                navigate('/buyer/dashboard');
            } else if (profile.role === 'admin') {
                navigate('/admin');
            } else {
                // Fallback
                navigate('/');
            }
        }
    }, [user, profile, loading, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
};
