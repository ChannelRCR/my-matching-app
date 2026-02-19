import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { User as PublicUser, UserRole } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: PublicUser | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string, role: UserRole, extraData: { name: string, companyName: string }) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Error fetching profile:', error); // Might happen if sync failed or delay
            }
            if (data) {
                setProfile({
                    id: data.id,
                    name: data.name,
                    companyName: data.company_name,
                    role: data.role as UserRole,
                    avatarUrl: data.avatar_url,
                    budget: data.budget,
                    appealPoint: data.appeal_point,
                    status: data.status,
                    registeredAt: data.registered_at,
                });
            }
        } catch (err) {
            console.error('Fetch profile exception:', err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        return { error };
    };

    const signUp = async (email: string, pass: string, role: UserRole, extraData: { name: string, companyName: string }) => {
        // 1. Sign up to Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    role: role, // Metadata for easy access
                    name: extraData.name,
                    company_name: extraData.companyName,
                }
            }
        });

        if (authError) return { error: authError };
        if (!authData.user) return { error: { message: 'User data missing' } };

        // 2. Insert into Public Users Table
        // Note: Using the SAME ID as auth.user
        const publicUser = {
            id: authData.user.id,
            name: extraData.name,
            company_name: extraData.companyName,
            role: role,
            status: 'active',
            registered_at: new Date().toISOString(),
        };

        const { error: dbError } = await supabase
            .from('users')
            .insert([publicUser]);

        if (dbError) {
            console.error('Error creating public profile:', dbError);
            // Ideally we should rollback auth signup here or have a trigger
            return { error: { message: 'Account created but profile failed. Please contact support.', details: dbError } };
        }

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        // Supabase listener will handle session/user update
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
