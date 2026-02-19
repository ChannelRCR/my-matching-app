import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Invoice, Deal, User, Message } from '../types';
import { MOCK_DEALS, MOCK_MESSAGES } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
    invoices: Invoice[];
    deals: Deal[];
    messages: Message[];
    users: User[];
    loading: boolean;
    addInvoice: (invoice: Invoice) => Promise<boolean>;
    addDeal: (deal: Deal) => void;
    addMessage: (message: Message) => void;
    updateDeal: (dealId: string, updates: Partial<Deal>) => void;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    createDeal: (invoiceId: string, buyerId: string, offerAmount: number, message: string) => Deal;
    acceptDeal: (deal: Deal) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Integrate AuthContext
    const { user: authUser } = useAuth();

    // State management
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Keep Deals and Messages as mocks for Phase 2
    const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

    // Initial Fetch
    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchUsers(), fetchInvoices()]);
            } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setLoading(false);
            }
        };
        initialize();
    }, []);

    // --- Users Logic ---
    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) {
            console.error('Error fetching users:', error);
            return;
        }
        if (data) {
            // Map raw DB data to User type
            const mappedUsers: User[] = data.map((u: any) => ({
                id: u.id,
                name: u.name,
                companyName: u.company_name,
                role: u.role,
                avatarUrl: u.avatar_url,
                budget: u.budget,
                appealPoint: u.appeal_point,
                status: u.status,
                registeredAt: u.registered_at,
            }));
            setUsers(mappedUsers);
        }
    };

    const updateUser = async (userId: string, updates: Partial<User>) => {
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));

        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.companyName) dbUpdates.company_name = updates.companyName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.budget) dbUpdates.budget = updates.budget;
        if (updates.appealPoint) dbUpdates.appeal_point = updates.appealPoint;
        if (updates.status) dbUpdates.status = updates.status;

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
        if (error) {
            console.error('Error updating user:', error);
            alert('プロフィールの更新に失敗しました。');
        }
    };

    // --- Invoices Logic ---
    const fetchInvoices = async () => {
        const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching invoices:', error);
            return;
        }
        if (data) {
            const mappedInvoices: Invoice[] = data.map((i: any) => ({
                id: i.id,
                sellerId: i.seller_id,
                amount: i.amount,
                dueDate: i.due_date,
                industry: i.industry,
                companySize: i.company_size,
                companyCredit: i.company_credit,
                status: i.status,
                requestedAmount: i.requested_amount,
                evidenceUrl: i.evidence_url,
                evidenceName: i.evidence_name,
            }));
            setInvoices(mappedInvoices);
        }
    };

    const addInvoice = async (invoice: Invoice): Promise<boolean> => {
        // Strict Mode: Check against AuthContext user
        console.log('Attempting to add invoice. AuthUser:', authUser?.id);

        if (!authUser) {
            console.error('AddInvoice failed: No authenticated user.');
            alert('ユーザー情報が見つかりません。再読み込みしてください。');
            return false;
        }

        const dbInvoice = {
            // Let Supabase generate ID
            seller_id: authUser.id, // Use strict auth ID
            amount: invoice.amount,
            due_date: invoice.dueDate,
            industry: invoice.industry,
            company_size: invoice.companySize,
            company_credit: invoice.companyCredit,
            status: 'open', // Always starts as open
            requested_amount: invoice.requestedAmount,
            evidence_url: invoice.evidenceUrl,
            evidence_name: invoice.evidenceName,
        };

        const { data, error } = await supabase
            .from('invoices')
            .insert([dbInvoice])
            .select();

        if (error) {
            console.error('Error adding invoice:', error.message, error.details, error.hint);
            alert(`案件登録に失敗しました: ${error.message}`);
            return false;
        } else {
            // Success
            console.log('Invoice added successfully:', data);
            fetchInvoices(); // Refresh list from DB
            return true;
        }
    };

    // --- Deals/Messages (Still Mocked) ---
    const addDeal = (deal: Deal) => {
        setDeals(prev => [...prev, deal]);
    };

    const addMessage = (message: Message) => {
        setMessages(prev => [...prev, message]);
    };

    const updateDeal = (dealId: string, updates: Partial<Deal>) => {
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
    };

    const createDeal = (invoiceId: string, buyerId: string, offerAmount: number, message: string): Deal => {
        const deal: Deal = {
            id: `deal_${Date.now()}`,
            invoiceId,
            buyerId,
            sellerId: invoices.find(i => i.id === invoiceId)?.sellerId || 'seller1',
            status: 'pending', // Initial status is pending acceptance
            initialOfferAmount: offerAmount,
            currentAmount: offerAmount,
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
        };

        // Update local state
        addDeal(deal);

        const initialMsg: Message = {
            id: `msg_${Date.now()}`,
            dealId: deal.id,
            senderId: buyerId,
            receiverId: deal.sellerId,
            content: message,
            timestamp: new Date().toISOString(),
        };
        addMessage(initialMsg);

        // NOTE: We do NOT update invoice status to 'negotiating' yet.
        // It stays 'open' until the seller accepts an offer.

        return deal;
    };

    const acceptDeal = (deal: Deal) => {
        // 1. Update the accepted deal to 'negotiating'
        updateDeal(deal.id, { status: 'negotiating' });

        // 2. Reject all OTHER deals for this invoice
        const otherDeals = deals.filter(d => d.invoiceId === deal.invoiceId && d.id !== deal.id);
        otherDeals.forEach(d => {
            updateDeal(d.id, { status: 'rejected' });
        });

        // 3. Update Invoice status to 'negotiating' (locks it from marketplace)
        setInvoices(prev => prev.map(inv => inv.id === deal.invoiceId ? { ...inv, status: 'negotiating' } : inv));
    };

    return (
        <DataContext.Provider value={{
            invoices,
            deals,
            messages,
            users,
            loading,
            addInvoice,
            addDeal,
            addMessage,
            updateDeal,
            updateUser,
            createDeal,
            acceptDeal
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
