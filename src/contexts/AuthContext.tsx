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
    signUp: (email: string, pass: string, role: UserRole, extraData: {
        name: string;
        companyName: string;
        tradeName: string;
        representativeName: string;
        contactPerson: string;
        address: string;
        bankAccountInfo: string;
        phoneNumber: string;
        emailAddress: string;
        privacySettings: Record<string, boolean>;
    }) => Promise<{ error: any }>;
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
            // 1. Fetch Basic User Info
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!userData) return;

            let profileData: any = { ...userData };

            // 2. Fetch Role-Specific Profile
            if (userData.role === 'seller') {
                const { data: sellerData, error: sellerError } = await supabase
                    .from('sellers')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (sellerData) {
                    profileData = { ...profileData, ...sellerData };
                } else if (sellerError && sellerError.code !== 'PGRST116') {
                    console.warn('Error fetching seller profile:', sellerError);
                }
            } else if (userData.role === 'buyer') {
                const { data: buyerData, error: buyerError } = await supabase
                    .from('buyers')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (buyerData) {
                    profileData = { ...profileData, ...buyerData };
                } else if (buyerError && buyerError.code !== 'PGRST116') {
                    console.warn('Error fetching buyer profile:', buyerError);
                }
            }

            setProfile({
                id: userData.id,
                name: userData.name,
                companyName: userData.company_name,
                role: userData.role as UserRole,
                avatarUrl: userData.avatar_url,
                budget: userData.budget,
                appealPoint: userData.appeal_point,
                status: userData.status,
                registeredAt: userData.registered_at,
                // Merged fields from sellers/buyers
                tradeName: profileData.trade_name,
                representativeName: profileData.representative_name,
                contactPerson: profileData.contact_person,
                address: profileData.address,
                bankAccountInfo: profileData.bank_account_info,
                phoneNumber: profileData.phone_number,
                emailAddress: profileData.email_address,
                privacySettings: profileData.privacy_settings,
            });
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

    const signUp = async (email: string, pass: string, role: UserRole, extraData: {
        name: string;
        companyName: string;
        tradeName: string;
        representativeName: string;
        contactPerson: string;
        address: string;
        bankAccountInfo: string;
        phoneNumber: string;
        emailAddress: string;
        privacySettings: Record<string, boolean>;
    }) => {
        // 1. Sign up to Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    role: role,
                    name: extraData.name,
                    company_name: extraData.companyName,
                }
            }
        });

        if (authError) return { error: authError };
        if (!authData.user) return { error: { message: 'User data missing' } };

        const userId = authData.user.id;

        // 2. Insert into Public Users Table (Common info)
        const commonUser = {
            id: userId,
            name: extraData.name,
            company_name: extraData.companyName,
            role: role,
            status: 'active',
            registered_at: new Date().toISOString(),
        };

        const { error: userDbError } = await supabase
            .from('users')
            .insert([commonUser]);

        if (userDbError) {
            console.error('Error creating public user record:', userDbError);
            return { error: { message: 'Account created but profile failed.', details: userDbError } };
        }

        // 3. Insert into Role-Specific Table
        let profileError = null;

        if (role === 'seller') {
            const sellerProfile = {
                id: userId,
                trade_name: extraData.tradeName,
                representative_name: extraData.representativeName,
                contact_person: extraData.contactPerson,
                address: extraData.address,
                bank_account_info: extraData.bankAccountInfo,
                phone_number: extraData.phoneNumber,
                email_address: extraData.emailAddress,
                privacy_settings: extraData.privacySettings,
            };
            const { error } = await supabase.from('sellers').insert([sellerProfile]);
            profileError = error;
        } else if (role === 'buyer') {
            const buyerProfile = {
                id: userId,
                trade_name: extraData.tradeName,
                representative_name: extraData.representativeName,
                contact_person: extraData.contactPerson,
                address: extraData.address,
                phone_number: extraData.phoneNumber,
                email_address: extraData.emailAddress,
                privacy_settings: extraData.privacySettings,
                // Buyers don't have bank_account_info in the form usually, but if they did...
                // Assuming buyers form doesn't strictly require bank info yet or we add it if needed.
                // Based on types, we have it in extraData.
            };
            const { error } = await supabase.from('buyers').insert([buyerProfile]);
            profileError = error;
        }

        if (profileError) {
            console.error('Error creating specific profile:', profileError);
            return { error: { message: 'User created but profile details failed.', details: profileError } };
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
