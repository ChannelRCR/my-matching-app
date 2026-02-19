import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If roles are specified, check if user has one of them
    if (allowedRoles && profile) {
        if (!allowedRoles.includes(profile.role)) {
            // Unauthorized role - redirect to their own dashboard or home
            if (profile.role === 'seller') return <Navigate to="/seller/dashboard" replace />;
            if (profile.role === 'buyer') return <Navigate to="/buyer/dashboard" replace />;
            return <Navigate to="/" replace />;
        }
    }

    return <Outlet />;
};
