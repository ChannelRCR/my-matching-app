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
    agreeToDeal: (dealId: string, isBuyer: boolean) => Promise<void>;
    markMessagesAsRead: (dealId: string, userId: string) => Promise<void>;
    getUserTrackRecord: (userId: string, role: 'buyer' | 'seller') => number;
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
        const { data: usersData } = await supabase.from('users').select('*');
        if (!usersData) return;

        // Fetch all sellers and buyers to merge data efficiently without N+1 queries
        const { data: sellersData } = await supabase.from('sellers').select('*');
        const { data: buyersData } = await supabase.from('buyers').select('*');

        const sellersMap = new Map((sellersData || []).map(s => [s.id, s]));
        const buyersMap = new Map((buyersData || []).map(b => [b.id, b]));

        setUsers(usersData.map((u: any) => {
            const roleData = u.role === 'seller' ? sellersMap.get(u.id) : buyersMap.get(u.id);
            // Fallback to empty object if no role data found yet
            const profile = roleData || {};

            return {
                id: u.id, name: u.name, companyName: u.company_name, role: u.role,
                avatarUrl: u.avatar_url, budget: u.budget, appealPoint: u.appeal_point,
                status: u.status, isAdmin: u.is_admin, registeredAt: u.registered_at,

                // Fields from specialized tables
                representativeName: profile.representative_name,
                contactPerson: profile.contact_person,
                address: profile.address,
                bankAccountInfo: profile.bank_account_info,
                phone: profile.phone_number,
                email: u.email,
                privacySettings: profile.privacy_settings || {
                    companyName: true,
                    representativeName: true,
                    contactPerson: true,
                    address: true,
                    bankAccountInfo: true,
                    phone: true,
                    email: true
                },
            };
        }));
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

    const getUserTrackRecord = (userId: string, role: 'buyer' | 'seller'): number => {
        if (role === 'buyer') {
            // Buyer track record: initial remittance confirmed by seller 
            // (or further steps completed)
            return deals.filter(d =>
                d.buyerId === userId &&
                ['seller_received', 'seller_repaid', 'fully_settled'].includes(d.paymentStatus || '')
            ).length;
        } else {
            // Seller track record: final repayment confirmed by buyer
            return deals.filter(d =>
                d.sellerId === userId &&
                d.paymentStatus === 'fully_settled'
            ).length;
        }
    };

    const fetchInvoices = async () => {
        const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (data) {
            setInvoices(data.map((i: any) => ({
                id: i.id, sellerId: i.seller_id, amount: i.amount, sellingAmount: i.selling_amount,
                dueDate: i.due_date, debtorName: i.debtor_name, debtorAddress: i.debtor_address,
                isClientNamePublic: i.is_client_name_public, isClientAddressPublic: i.is_client_address_public,
                industry: i.industry, companySize: i.company_size, companyCredit: i.company_credit, status: i.status, requestedAmount: i.requested_amount,
                evidenceUrl: i.evidence_url, evidenceName: i.evidence_name,
                createdAt: i.created_at,
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
            debtor_name: invoice.debtorName,
            debtor_address: invoice.debtorAddress,
            is_client_name_public: invoice.isClientNamePublic || false,
            is_client_address_public: invoice.isClientAddressPublic || false,
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
                currentSellerPrice: d.current_seller_price,
                currentBuyerPrice: d.current_buyer_price,
                startedAt: d.started_at,
                lastMessageAt: d.last_message_at,
                sellerAgreedAt: d.seller_agreed_at,
                buyerAgreedAt: d.buyer_agreed_at,
                contractDate: d.contract_date,
                sellerRevealedFields: d.seller_revealed_fields || {},
                buyerRevealedFields: d.buyer_revealed_fields || {},
                paymentStatus: d.payment_status || 'pending',
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
                fileUrl: m.file_url,
                fileName: m.file_name,
                fileType: m.file_type,
                isRead: m.is_read
            })));
        }
    };

    const markMessagesAsRead = async (dealId: string, userId: string) => {
        // Optimistically update local state so badges clear instantly
        let updated = false;
        setMessages(prev => prev.map(m => {
            const receiverIdStr = String(m.receiverId || (m as any).receiver_id);
            const dealIdStr = String(m.dealId || (m as any).deal_id);
            if (dealIdStr === dealId && receiverIdStr === userId && m.isRead === false) {
                updated = true;
                return { ...m, isRead: true, is_read: true };
            }
            return m;
        }));

        if (!updated) return; // Skip DB call if nothing was actually unread

        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('deal_id', dealId)
            .eq('receiver_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error("Error marking messages as read:", error);
            fetchMessages(); // Revert/sync on failure
        }
    };

    const addMessage = async (message: Message) => {
        const dbMsg: any = {
            deal_id: message.dealId,
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            content: message.content
        };
        if (message.fileUrl) dbMsg.file_url = message.fileUrl;
        if (message.fileName) dbMsg.file_name = message.fileName;
        if (message.fileType) dbMsg.file_type = message.fileType;
        const { error } = await supabase.from('messages').insert([dbMsg]);
        if (error) console.error("Error sending message", error);
        else fetchMessages();
    };

    const updateDeal = async (dealId: string, updates: Partial<Deal>) => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
        if (updates.currentSellerPrice !== undefined) dbUpdates.current_seller_price = updates.currentSellerPrice;
        if (updates.currentBuyerPrice !== undefined) dbUpdates.current_buyer_price = updates.currentBuyerPrice;
        if (updates.lastMessageAt) dbUpdates.last_message_at = updates.lastMessageAt;
        if (updates.sellerAgreedAt !== undefined) dbUpdates.seller_agreed_at = updates.sellerAgreedAt;
        if (updates.buyerAgreedAt !== undefined) dbUpdates.buyer_agreed_at = updates.buyerAgreedAt;
        if (updates.contractDate !== undefined) dbUpdates.contract_date = updates.contractDate;
        if (updates.sellerRevealedFields !== undefined) dbUpdates.seller_revealed_fields = updates.sellerRevealedFields;
        if (updates.buyerRevealedFields !== undefined) dbUpdates.buyer_revealed_fields = updates.buyerRevealedFields;
        if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;

        await supabase.from('deals').update(dbUpdates).eq('id', dealId);
        fetchDeals();
    };

    const createChatRoom = async (invoiceId: string, buyerId: string): Promise<Deal | null> => {
        const invoice = invoices.find(i => i.id === invoiceId);
        const sellerId = invoice?.sellerId;
        if (!sellerId) return null;

        const initialSellerPrice = invoice?.requestedAmount || invoice?.sellingAmount || invoice?.amount || 0;

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'negotiating',
            initial_offer_amount: 0,
            current_amount: 0,
            current_seller_price: initialSellerPrice,
            current_buyer_price: 0
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
            currentSellerPrice: data.current_seller_price,
            currentBuyerPrice: data.current_buyer_price,
            startedAt: data.started_at,
            lastMessageAt: data.last_message_at,
            sellerRevealedFields: data.seller_revealed_fields || {},
            buyerRevealedFields: data.buyer_revealed_fields || {},
            paymentStatus: data.payment_status || 'pending',
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
        const invoice = invoices.find(i => i.id === invoiceId);
        const sellerId = invoice?.sellerId;
        if (!sellerId) return null;

        const initialSellerPrice = invoice?.requestedAmount || invoice?.sellingAmount || invoice?.amount || 0;

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'open',
            initial_offer_amount: offerAmount,
            current_amount: offerAmount,
            current_seller_price: initialSellerPrice,
            current_buyer_price: offerAmount
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
            currentSellerPrice: data.current_seller_price,
            currentBuyerPrice: data.current_buyer_price,
            startedAt: data.started_at,
            lastMessageAt: data.last_message_at,
            sellerRevealedFields: data.seller_revealed_fields || {},
            buyerRevealedFields: data.buyer_revealed_fields || {},
            paymentStatus: data.payment_status || 'pending',
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

    const agreeToDeal = async (dealId: string, isBuyer: boolean) => {
        const deal = deals.find(d => d.id === dealId);
        if (!deal || !authUser) return;

        const now = new Date().toISOString();
        const updates: Partial<Deal> = {};

        if (isBuyer) {
            updates.buyerAgreedAt = now;
        } else {
            updates.sellerAgreedAt = now;
        }

        // Check if the other party has already agreed
        const willBeConcluded = (isBuyer && deal.sellerAgreedAt) || (!isBuyer && deal.buyerAgreedAt);

        if (willBeConcluded) {
            updates.status = 'concluded';
            updates.contractDate = now;
            updates.currentAmount = deal.currentBuyerPrice || deal.currentSellerPrice || deal.currentAmount;

            // Add a system message for contract conclusion
            const dbMsg = {
                deal_id: deal.id,
                sender_id: authUser.id, // Or use a system UUID if you have one
                receiver_id: isBuyer ? deal.sellerId : deal.buyerId,
                content: "【システム】双方が合意し、契約が成立しました🎉"
            };
            await supabase.from('messages').insert([dbMsg]);

            // Target Receivable becomes 'sold'
            await supabase.from('invoices').update({ status: 'sold' }).eq('id', deal.invoiceId);
            fetchInvoices();
        }

        await updateDeal(dealId, updates);
    };

    return (
        <DataContext.Provider value={{
            invoices, deals, messages, users, loading,
            addInvoice, addMessage, updateDeal, updateUser,
            createDeal, createChatRoom, acceptDeal, agreeToDeal,
            markMessagesAsRead, getUserTrackRecord
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
