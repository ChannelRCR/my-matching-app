import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const AdminProtectedRoute: React.FC = () => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 md:w-12 md:h-12 border-primary border-t-transparent border-4 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profile?.isAdmin) {
        // Redirect non-admins to their respective dashboards
        return <Navigate to={`/${profile?.role || 'buyer'}-dashboard`} replace />;
    }

    return <Outlet />;
};
