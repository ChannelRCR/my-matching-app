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
        representativeName: string;
        contactPerson: string;
        address: string;
        bankAccountInfo: string;
        phone: string;
        email: string;
        entityType: 'corporate' | 'individual';
        hasNoTradeName: boolean;
        postalCode: string;
        companyNameKana: string;
        representativeNameKana: string;
        industry: string;
        industryOther: string;
        appealPoint: string;
        corporateNumber?: string;
        websiteUrl?: string;
        idDocumentUrl?: string;
        idDocumentFile?: File;
        privacySettings: Record<string, boolean>;
    }) => Promise<{ error: any }>;
    updateProfile: (data: Partial<PublicUser>) => Promise<{ error: any }>;
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
                .maybeSingle();

            if (userError) throw userError;
            if (!userData) return;

            let profileData: any = { ...userData };

            // 2. Fetch Role-Specific Profile
            if (userData.role === 'seller') {
                const { data: sellerData, error: sellerError } = await supabase
                    .from('sellers')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (sellerData) {
                    profileData = { ...profileData, ...sellerData };
                } else if (sellerError && sellerError.code !== 'PGRST116' && sellerError.code !== '406') {
                    console.warn('Error fetching seller profile:', sellerError);
                }
            } else if (userData.role === 'buyer') {
                const { data: buyerData, error: buyerError } = await supabase
                    .from('buyers')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (buyerData) {
                    profileData = { ...profileData, ...buyerData };
                } else if (buyerError && buyerError.code !== 'PGRST116' && buyerError.code !== '406') {
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
                appealPoint: profileData.appeal_point, // Fix: Read from role-specific table instead of users
                status: userData.status,
                registeredAt: userData.registered_at,
                isAdmin: userData.is_admin,
                // Merged fields from sellers/buyers
                representativeName: profileData.representative_name,
                contactPerson: profileData.contact_person,
                address: profileData.address,
                bankAccountInfo: profileData.bank_account_info,
                phone: profileData.phone_number,
                email: profileData.email || userData.email, // DB column mappings
                entityType: profileData.entity_type,
                hasNoTradeName: profileData.has_no_trade_name,
                postalCode: profileData.postal_code,
                companyNameKana: profileData.company_name_kana,
                representativeNameKana: profileData.representative_name_kana,
                industry: profileData.industry,
                industryOther: profileData.industry_other,
                corporateNumber: profileData.corporate_number,
                websiteUrl: profileData.website_url,
                idDocumentUrl: profileData.id_document_url,
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
        representativeName: string;
        contactPerson: string;
        address: string;
        bankAccountInfo: string;
        phone: string;
        email: string; // The profile email, usually the same as auth email
        entityType: 'corporate' | 'individual';
        hasNoTradeName: boolean;
        postalCode: string;
        companyNameKana: string;
        representativeNameKana: string;
        industry: string;
        industryOther: string;
        appealPoint: string;
        corporateNumber?: string;
        websiteUrl?: string;
        idDocumentUrl?: string;
        idDocumentFile?: File;
        budget?: string | number;
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

        let finalIdDocumentUrl = extraData.idDocumentUrl || null;
        if (extraData.idDocumentFile) {
            const fileExt = extraData.idDocumentFile.name.split('.').pop() || 'tmp';
            const fileName = `${Date.now()}_id.${fileExt}`;
            const filePath = `${userId}/${fileName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('kyc_documents').upload(filePath, extraData.idDocumentFile);
            if (uploadError) {
                console.error('Error uploading KYC document:', uploadError);
                return { error: { message: '本人確認書類のアップロードに失敗しました。', details: uploadError } };
            }
            if (uploadData) {
                finalIdDocumentUrl = uploadData.path;
            }
        }

        // 2. Insert into Public Users Table (Common info)
        const commonUser = {
            id: userId,
            name: extraData.name,
            company_name: extraData.companyName,
            role: role,
            email: email, // Fix email missing
            budget: extraData.budget || null,
            status: 'active',
            registered_at: new Date().toISOString(),
        };

        const { error: userDbError } = await supabase
            .from('users')
            .insert([commonUser]);

        if (userDbError) {
            console.error('Error creating public user record:', userDbError);
            return { error: { message: `アカウントIDは作成されましたが、基本プロフィールの保存に失敗しました。エラー内容を確認してください: ${userDbError.message || '不明なエラー'}`, details: userDbError } };
        }

        // 3. Insert into Role-Specific Table
        let profileError = null;

        if (role === 'seller') {
            const sellerProfile = {
                id: userId,
                company_name: extraData.companyName,
                representative_name: extraData.representativeName,
                contact_person: extraData.contactPerson,
                address: extraData.address,
                bank_account_info: extraData.bankAccountInfo,
                phone_number: extraData.phone,
                entity_type: extraData.entityType,
                has_no_trade_name: extraData.hasNoTradeName,
                postal_code: extraData.postalCode,
                company_name_kana: extraData.companyNameKana,
                representative_name_kana: extraData.representativeNameKana,
                industry: extraData.industry,
                industry_other: extraData.industryOther,
                appeal_point: extraData.appealPoint,
                corporate_number: extraData.corporateNumber,
                website_url: extraData.websiteUrl,
                id_document_url: finalIdDocumentUrl,
                privacy_settings: extraData.privacySettings,
            };
            const { error } = await supabase.from('sellers').insert([sellerProfile]);
            profileError = error;
        } else if (role === 'buyer') {
            const buyerProfile = {
                id: userId,
                company_name: extraData.companyName,
                representative_name: extraData.representativeName,
                contact_person: extraData.contactPerson,
                address: extraData.address,
                bank_account_info: extraData.bankAccountInfo, // Fix bank account missing
                phone_number: extraData.phone,
                entity_type: extraData.entityType,
                has_no_trade_name: extraData.hasNoTradeName,
                postal_code: extraData.postalCode,
                company_name_kana: extraData.companyNameKana,
                representative_name_kana: extraData.representativeNameKana,
                industry: extraData.industry,
                industry_other: extraData.industryOther,
                appeal_point: extraData.appealPoint,
                corporate_number: extraData.corporateNumber,
                website_url: extraData.websiteUrl,
                id_document_url: extraData.idDocumentUrl,
                privacy_settings: extraData.privacySettings,
            };
            const { error } = await supabase.from('buyers').insert([buyerProfile]);
            profileError = error;
        }

        if (profileError) {
            console.error('Error creating specific profile:', profileError);
            return { error: { message: `アカウントIDは作成されましたが、詳細プロフィールの保存に失敗しました。エラー内容を確認してください: ${profileError.message || '不明なエラー'}`, details: profileError } };
        }

        return { error: null };
    };

    const updateProfile = async (data: Partial<PublicUser>) => {
        if (!user || !profile) return { error: new Error('User not logged in') };

        try {
            // Update users table for basic fields
            const commonData: any = {};
            if (data.name !== undefined) commonData.name = data.name;
            if (data.companyName !== undefined) commonData.company_name = data.companyName;
            if (data.budget !== undefined) commonData.budget = data.budget;

            if (Object.keys(commonData).length > 0) {
                const { error: userError } = await supabase.from('users').update(commonData).eq('id', user.id);
                if (userError) throw userError;
            }

            // Update role-specific table
            const specificData: any = {};
            if (data.companyName !== undefined) specificData.company_name = data.companyName;
            if (data.representativeName !== undefined) specificData.representative_name = data.representativeName;
            if (data.contactPerson !== undefined) specificData.contact_person = data.contactPerson;
            if (data.address !== undefined) specificData.address = data.address;
            if (data.phone !== undefined) specificData.phone_number = data.phone;
            if (data.entityType !== undefined) specificData.entity_type = data.entityType;
            if (data.hasNoTradeName !== undefined) specificData.has_no_trade_name = data.hasNoTradeName;
            if (data.postalCode !== undefined) specificData.postal_code = data.postalCode;
            if (data.companyNameKana !== undefined) specificData.company_name_kana = data.companyNameKana;
            if (data.representativeNameKana !== undefined) specificData.representative_name_kana = data.representativeNameKana;
            if (data.industry !== undefined) specificData.industry = data.industry;
            if (data.industryOther !== undefined) specificData.industry_other = data.industryOther;
            if (data.appealPoint !== undefined) specificData.appeal_point = data.appealPoint;
            if (data.corporateNumber !== undefined) specificData.corporate_number = data.corporateNumber;
            if (data.websiteUrl !== undefined) specificData.website_url = data.websiteUrl;
            if (data.idDocumentUrl !== undefined) specificData.id_document_url = data.idDocumentUrl;
            if (data.idDocumentFile) {
                const fileExt = data.idDocumentFile.name.split('.').pop() || 'tmp';
                const fileName = `${Date.now()}_id.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('kyc_documents').upload(filePath, data.idDocumentFile);
                if (uploadError) {
                    console.error('Error uploading KYC document:', uploadError);
                    return { error: uploadError };
                }
                if (uploadData) {
                    specificData.id_document_url = uploadData.path;
                }
            }
            if (data.privacySettings !== undefined) specificData.privacy_settings = data.privacySettings;

            if (profile.role === 'seller') {
                if (data.bankAccountInfo !== undefined) specificData.bank_account_info = data.bankAccountInfo;
                if (Object.keys(specificData).length > 0) {
                    const { error } = await supabase.from('sellers').update(specificData).eq('id', user.id);
                    if (error) throw error;
                }
            } else if (profile.role === 'buyer') {
                if (data.bankAccountInfo !== undefined) specificData.bank_account_info = data.bankAccountInfo;
                if (Object.keys(specificData).length > 0) {
                    const { error } = await supabase.from('buyers').update(specificData).eq('id', user.id);
                    if (error) throw error;
                }
            }

            // Refresh local profile state
            await fetchProfile(user.id);
            return { error: null };
        } catch (error) {
            console.error('Error updating profile:', error);
            return { error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        // Supabase listener will handle session/user update
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, updateProfile, signOut }}>
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
