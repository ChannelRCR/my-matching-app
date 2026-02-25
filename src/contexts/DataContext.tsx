import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Invoice, Deal, User, Message } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
    invoices: Invoice[];
    deals: Deal[];
    messages: Message[];
    users: User[];
    loading: boolean;
    addInvoice: (invoice: Invoice) => Promise<boolean>;
    addMessage: (message: Message) => Promise<void>;
    updateDeal: (dealId: string, updates: Partial<Deal>) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    createDeal: (invoiceId: string, buyerId: string, offerAmount: number, message: string) => Promise<Deal | null>;
    createChatRoom: (invoiceId: string, buyerId: string) => Promise<Deal | null>;
    acceptDeal: (deal: Deal) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchUsers(), fetchInvoices(), fetchDeals(), fetchMessages()]);
            } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setLoading(false);
            }
        };
        initialize();

        const dealsSub = supabase.channel('deals_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
                fetchDeals(); // Simplest way to keep sync without manual merging
            }).subscribe();

        const msgsSub = supabase.channel('msgs_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                fetchMessages();
            }).subscribe();

        return () => {
            supabase.removeChannel(dealsSub);
            supabase.removeChannel(msgsSub);
        };
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (data) {
            setUsers(data.map((u: any) => ({
                id: u.id, name: u.name, companyName: u.company_name, role: u.role,
                avatarUrl: u.avatar_url, budget: u.budget, appealPoint: u.appeal_point,
                status: u.status, registeredAt: u.registered_at,
            })));
        }
    };

    const updateUser = async (userId: string, updates: Partial<User>) => {
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
        if (error) alert('プロフィールの更新に失敗しました。');
    };

    const fetchInvoices = async () => {
        const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (data) {
            setInvoices(data.map((i: any) => ({
                id: i.id, sellerId: i.seller_id, amount: i.amount, sellingAmount: i.selling_amount,
                dueDate: i.due_date, industry: i.industry, companySize: i.company_size,
                companyCredit: i.company_credit, status: i.status, requestedAmount: i.requested_amount,
                evidenceUrl: i.evidence_url, evidenceName: i.evidence_name,
            })));
        }
    };

    const addInvoice = async (invoice: Invoice): Promise<boolean> => {
        if (!authUser) {
            alert('ユーザー情報が見つかりません。再読み込みしてください。');
            return false;
        }
        const dbInvoice = {
            seller_id: authUser.id,
            amount: invoice.amount,
            selling_amount: invoice.sellingAmount || invoice.amount,
            due_date: invoice.dueDate,
            industry: invoice.industry,
            company_size: invoice.companySize,
            company_credit: invoice.companyCredit,
            status: 'open',
            requested_amount: invoice.requestedAmount,
            evidence_url: invoice.evidenceUrl,
            evidence_name: invoice.evidenceName,
        };
        const { error } = await supabase.from('invoices').insert([dbInvoice]).select();
        if (error) {
            alert(`案件登録に失敗しました: ${error.message}`);
            return false;
        } else {
            fetchInvoices();
            return true;
        }
    };

    // --- Deals/Messages Real Implementation ---
    const fetchDeals = async () => {
        const { data } = await supabase.from('deals').select('*').order('started_at', { ascending: false });
        if (data) {
            setDeals(data.map((d: any) => ({
                id: d.id,
                invoiceId: d.invoice_id,
                buyerId: d.buyer_id,
                sellerId: d.seller_id,
                status: d.status,
                initialOfferAmount: d.initial_offer_amount,
                currentAmount: d.current_amount,
                startedAt: d.started_at,
                lastMessageAt: d.last_message_at,
            })));
        }
    };

    const fetchMessages = async () => {
        const { data } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
        if (data) {
            setMessages(data.map((m: any) => ({
                id: m.id,
                dealId: m.deal_id,
                senderId: m.sender_id,
                receiverId: m.receiver_id,
                content: m.content,
                timestamp: m.timestamp,
            })));
        }
    };

    const addMessage = async (message: Message) => {
        const dbMsg = {
            deal_id: message.dealId,
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            content: message.content
        };
        const { error } = await supabase.from('messages').insert([dbMsg]);
        if (error) console.error("Error sending message", error);
        else fetchMessages();
    };

    const updateDeal = async (dealId: string, updates: Partial<Deal>) => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
        if (updates.lastMessageAt) dbUpdates.last_message_at = updates.lastMessageAt;

        await supabase.from('deals').update(dbUpdates).eq('id', dealId);
        fetchDeals();
    };

    const createChatRoom = async (invoiceId: string, buyerId: string): Promise<Deal | null> => {
        const sellerId = invoices.find(i => i.id === invoiceId)?.sellerId;
        if (!sellerId) return null;

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'negotiating',
            initial_offer_amount: 0,
            current_amount: 0
        };

        const { data, error } = await supabase.from('deals').insert([dbDeal]).select().single();
        if (error || !data) return null;

        const newDeal: Deal = {
            id: data.id,
            invoiceId: data.invoice_id,
            buyerId: data.buyer_id,
            sellerId: data.seller_id,
            status: data.status,
            initialOfferAmount: data.initial_offer_amount,
            currentAmount: data.current_amount,
            startedAt: data.started_at,
            lastMessageAt: data.last_message_at,
        };

        const dbMsg = {
            deal_id: data.id,
            sender_id: buyerId,
            receiver_id: sellerId,
            content: "【システム】この案件について質問・交渉が開始されました。"
        };
        await supabase.from('messages').insert([dbMsg]);

        fetchDeals(); fetchMessages();
        return newDeal;
    };

    const createDeal = async (invoiceId: string, buyerId: string, offerAmount: number, message: string): Promise<Deal | null> => {
        const sellerId = invoices.find(i => i.id === invoiceId)?.sellerId;
        if (!sellerId) return null;

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'open',
            initial_offer_amount: offerAmount,
            current_amount: offerAmount
        };

        const { data, error } = await supabase.from('deals').insert([dbDeal]).select().single();
        if (error || !data) return null;

        const newDeal: Deal = {
            id: data.id,
            invoiceId: data.invoice_id,
            buyerId: data.buyer_id,
            sellerId: data.seller_id,
            status: data.status,
            initialOfferAmount: data.initial_offer_amount,
            currentAmount: data.current_amount,
            startedAt: data.started_at,
            lastMessageAt: data.last_message_at,
        };

        const dbMsg = {
            deal_id: data.id,
            sender_id: buyerId,
            receiver_id: sellerId,
            content: message
        };
        await supabase.from('messages').insert([dbMsg]);

        fetchDeals(); fetchMessages();
        return newDeal;
    };

    const acceptDeal = async (deal: Deal) => {
        await supabase.from('deals').update({ status: 'negotiating' }).eq('id', deal.id);
        await supabase.from('deals').update({ status: 'rejected' }).eq('invoice_id', deal.invoiceId).neq('id', deal.id);
        await supabase.from('invoices').update({ status: 'negotiating' }).eq('id', deal.invoiceId);

        fetchDeals(); fetchInvoices();
    };

    return (
        <DataContext.Provider value={{
            invoices, deals, messages, users, loading,
            addInvoice, addMessage, updateDeal, updateUser,
            createDeal, createChatRoom, acceptDeal
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
