import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Invoice, Deal, User, Message } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { isTransitioning } from '../utils/transitionState';
import { sendEmailNotification, getChatUrl } from '../utils/notification';

interface DataContextType {
    invoices: Invoice[];
    deals: Deal[];
    messages: Message[];
    users: User[];
    buyers: User[];
    sellers: User[];
    invoiceStats: Record<string, {offerCount: number, maxOffer: number}>;
    sellerUncompletedCounts: Record<string, number>;
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
    const { user: authUser, profile, loading: authLoading } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [buyers, setBuyers] = useState<User[]>([]);
    const [sellers, setSellers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [invoiceStats, setInvoiceStats] = useState<Record<string, {offerCount: number, maxOffer: number}>>({});
    const [sellerUncompletedCounts, setSellerUncompletedCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (authLoading) return;

        if (!authUser || !profile || !profile.role) {
            setInvoices([]);
            setDeals([]);
            setUsers([]);
            setBuyers([]);
            setSellers([]);
            setMessages([]);
            setSellerUncompletedCounts({});
            setInvoiceStats({});
            setLoading(false);
            return;
        }

        const initialize = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchUsers(), fetchInvoices(), fetchDeals(), fetchMessages(), fetchInvoiceStats(), fetchSellerStats()]);
            } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setLoading(false);
            }
        };
        initialize();

        const dealsSub = supabase.channel('deals_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
                if (isTransitioning) {
                    console.log("Ultimate Escape: Blocked realtime deal update.");
                    return;
                }
                fetchDeals(); fetchInvoiceStats(); fetchSellerStats();
            }).subscribe();

        const msgsSub = supabase.channel('msgs_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                if (isTransitioning) {
                    console.log("Ultimate Escape: Blocked realtime message update.");
                    return;
                }
                fetchMessages();
            }).subscribe();

        return () => {
            supabase.removeChannel(dealsSub);
            supabase.removeChannel(msgsSub);
        };
    }, [authUser?.id, profile?.id, authLoading]);

    const fetchUsers = async () => {
        const { data: usersData } = await supabase.from('users').select('*');
        if (!usersData) return;

        // Fetch all sellers and buyers to merge data efficiently without N+1 queries
        const { data: sellersData } = await supabase.from('sellers').select('*');
        const { data: buyersData } = await supabase.from('buyers').select('*');

        const sellersMap = new Map((sellersData || []).map(s => [s.id, s]));
        const buyersMap = new Map((buyersData || []).map(b => [b.id, b]));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedUsers = usersData.map((u: any) => {
            const roleData = u.role === 'seller' ? sellersMap.get(u.id) : buyersMap.get(u.id);
            // Fallback to empty object if no role data found yet
            const profile = roleData || {};

            return {
                id: u.id, name: u.name, companyName: u.company_name, role: u.role,
                avatarUrl: u.avatar_url, budget: u.budget, appealPoint: profile.appeal_point,
                status: u.status, isAdmin: u.is_admin, registeredAt: u.registered_at,

                // Fields from specialized tables
                representativeName: profile.representative_name,
                representativeNameKana: profile.representative_name_kana,
                contactPerson: profile.contact_person,
                address: profile.address,
                bankAccountInfo: profile.bank_account_info,
                phone: profile.phone_number,
                email: u.email,
                companyNameKana: profile.company_name_kana,
                corporateNumber: profile.corporate_number,
                postalCode: profile.postal_code,
                industry: profile.industry,
                entityType: profile.entity_type,
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
        });

        setUsers(processedUsers);
        setSellers(processedUsers.filter((u: User) => u.role === 'seller'));
        setBuyers(processedUsers.filter((u: User) => u.role === 'buyer'));
    };

    const updateUser = async (userId: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        setSellers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        setBuyers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));

        const dbUpdates: Record<string, unknown> = {};
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setInvoices(data.map((i: any) => ({
                id: i.id, sellerId: i.seller_id, amount: i.amount, sellingAmount: i.selling_amount,
                dueDate: i.due_date, debtorName: i.debtor_name, debtorAddress: i.debtor_address,
                isClientNamePublic: i.is_client_name_public, isClientAddressPublic: i.is_client_address_public,
                debtorEntityType: i.debtor_entity_type, debtorPostalCode: i.debtor_postal_code,
                industry: i.industry, industryOther: i.industry_other,
                companySize: i.company_size, companyCredit: i.company_credit,
                claimType: i.claim_type, claimTypeOther: i.claim_type_other,
                status: i.status, requestedAmount: i.requested_amount,
                evidenceUrl: i.evidence_url, evidenceName: i.evidence_name,
                saleType: i.sale_type,
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
            id: invoice.id || `inv_${Date.now()}`,
            seller_id: authUser.id,
            amount: invoice.amount,
            selling_amount: invoice.sellingAmount || invoice.amount,
            due_date: invoice.dueDate,
            debtor_name: invoice.debtorName,
            debtor_address: invoice.debtorAddress,
            is_client_name_public: invoice.isClientNamePublic || false,
            is_client_address_public: invoice.isClientAddressPublic || false,
            debtor_entity_type: invoice.debtorEntityType || 'corporate',
            debtor_postal_code: invoice.debtorPostalCode,
            industry: invoice.industry,
            industry_other: invoice.industryOther,
            company_size: invoice.companySize,
            company_credit: invoice.companyCredit,
            claim_type: invoice.claimType || '売掛金（商品代金）',
            claim_type_other: invoice.claimTypeOther,
            status: 'open',
            requested_amount: invoice.requestedAmount,
            evidence_url: invoice.evidenceUrl,
            evidence_name: invoice.evidenceName,
            sale_type: invoice.saleType || 'full',
        };
        const { error } = await supabase.from('invoices').insert([dbInvoice]).select();
        if (error) {
            console.error('addInvoice Error:', error);
            console.error('dbInvoice Data:', dbInvoice);
            alert(`案件登録に失敗しました: ${error.message} \n詳細はコンソールを確認してください。`);
            return false;
        } else {
            await fetchInvoices();
            await fetchSellerStats();
            return true;
        }
    };

    // --- Deals/Messages Real Implementation ---
    const fetchDeals = async () => {
        if (!authUser || !profile || !profile.role) return;
        const { data } = await supabase.from('deals')
            .select('*')
            .or(`seller_id.eq.${authUser.id},buyer_id.eq.${authUser.id}`)
            .order('started_at', { ascending: false });
        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                is_disputed: d.is_disputed,
                contract_url: d.contract_url,
                settlement_url: d.settlement_url,
            })));
        }
    };

    const fetchSellerStats = async () => {
        const { data } = await supabase.from('seller_uncompleted_stats').select('*');
        if (data) {
            const stats: Record<string, number> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((row: any) => {
                stats[row.seller_id] = Number(row.uncompleted_count);
            });
            setSellerUncompletedCounts(stats);
        }
    };

    const fetchInvoiceStats = async () => {
        const { data } = await supabase.from('invoice_offer_stats').select('*');
        if (data) {
            const stats: Record<string, {offerCount: number, maxOffer: number}> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((row: any) => {
                stats[row.invoice_id] = { offerCount: Number(row.offer_count), maxOffer: Number(row.max_offer) };
            });
            setInvoiceStats(stats);
        }
    };

    const fetchMessages = async () => {
        if (!authUser || !profile || !profile.role) return;
        const { data } = await supabase.from('messages')
            .select('*')
            .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
            .order('created_at', { ascending: true });
        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                isRead: m.is_read,
                isSystemMessage: m.is_system_message
            })));
        }
    };

    const markMessagesAsRead = async (dealId: string, userId: string) => {
        // Optimistically update local state so badges clear instantly
        let updated = false;
        setMessages(prev => prev.map(m => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const receiverIdStr = String(m.receiverId || (m as any).receiver_id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const dbMsg: Record<string, unknown> = {
            id: message.id || `msg_${Date.now()}`,
            deal_id: message.dealId,
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            content: message.content,
            is_system_message: message.isSystemMessage || false
        };
        if (message.fileUrl) dbMsg.file_url = message.fileUrl;
        if (message.fileName) dbMsg.file_name = message.fileName;
        if (message.fileType) dbMsg.file_type = message.fileType;
        const { error } = await supabase.from('messages').insert([dbMsg]);
        if (error) console.error("Error sending message", error);
        else fetchMessages();
    };

    const updateDeal = async (dealId: string, updates: Partial<Deal>) => {
        const dbUpdates: Record<string, unknown> = {};
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
        
        // Optimistic UI Update
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
        
        // Background sync
        fetchDeals();
        fetchSellerStats();
    };

    const createChatRoom = async (invoiceId: string, buyerId: string): Promise<Deal | null> => {
        const invoice = invoices.find(i => i.id === invoiceId);
        const sellerId = invoice?.sellerId;
        if (!sellerId) return null;

        // 【重複防止】既に同じ invoiceId と buyerId の Deal が存在するかチェック
        const existingLocalDeal = deals.find(d => d.invoiceId === invoiceId && d.buyerId === buyerId);
        if (existingLocalDeal) return existingLocalDeal;

        const { data: existingData } = await supabase.from('deals')
            .select('id, invoice_id, buyer_id, seller_id, status')
            .eq('invoice_id', invoiceId)
            .eq('buyer_id', buyerId)
            .maybeSingle();

        if (existingData) {
            fetchDeals(); // sync to get full deal obj
            return { id: existingData.id, invoiceId: existingData.invoice_id, buyerId: existingData.buyer_id, sellerId: existingData.seller_id, status: existingData.status } as Deal;
        }

        // 関連する単一のInvoiceのステータスを更新
        await supabase.from('invoices').update({ status: 'negotiating' }).eq('id', invoiceId);

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'negotiating',
            initial_offer_amount: 0,
            current_amount: 0,
            current_seller_price: null,
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
            is_disputed: data.is_disputed,
            contract_url: data.contract_url,
            settlement_url: data.settlement_url,
        };

        const dbMsg = {
            id: `msg_${Date.now()}`,
            deal_id: data.id,
            sender_id: buyerId,
            receiver_id: sellerId,
            content: "【システム】この案件について質問・交渉が開始されました。",
            is_system_message: true
        };
        await supabase.from('messages').insert([dbMsg]);

        fetchDeals(); fetchMessages(); fetchInvoices();
        
        // Edge Functionを利用して売り手へメール通知
        const myName = authUser?.user_metadata?.company_name || '買主';
        const chatUrl = getChatUrl(data.id);
        await sendEmailNotification(
            [sellerId],
            "【FactorMatch】新しい交渉が開始されました",
            `<p>ご登録の債権に対して、${myName}様より新しく交渉（チャット）が開始されました。</p>
             <p>FactorMatchのチャット画面よりご確認ください。</p>
             <p><a href="${chatUrl}">チャット画面を開く</a></p>`
        ).catch(err => console.error("Email notification failed:", err));

        return newDeal;
    };

    const createDeal = async (invoiceId: string, buyerId: string, offerAmount: number, message: string): Promise<Deal | null> => {
        const invoice = invoices.find(i => i.id === invoiceId);
        const sellerId = invoice?.sellerId;
        if (!sellerId) return null;

        // 【重複防止】既に同じ invoiceId と buyerId の Deal が存在するかチェック
        const existingLocalDeal = deals.find(d => d.invoiceId === invoiceId && d.buyerId === buyerId);
        if (existingLocalDeal) return existingLocalDeal;

        const { data: existingData } = await supabase.from('deals')
            .select('id, invoice_id, buyer_id, seller_id, status')
            .eq('invoice_id', invoiceId)
            .eq('buyer_id', buyerId)
            .maybeSingle();

        if (existingData) {
            fetchDeals(); // sync to get full deal obj
            return { id: existingData.id, invoiceId: existingData.invoice_id, buyerId: existingData.buyer_id, sellerId: existingData.seller_id, status: existingData.status } as Deal;
        }

        // 関連する単一のInvoiceのステータスを更新
        await supabase.from('invoices').update({ status: 'negotiating' }).eq('id', invoiceId);

        const dbDeal = {
            invoice_id: invoiceId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'open',
            initial_offer_amount: offerAmount,
            current_amount: offerAmount,
            current_seller_price: null,
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
            is_disputed: data.is_disputed,
            contract_url: data.contract_url,
            settlement_url: data.settlement_url,
        };

        const dbMsg = {
            id: `msg_${Date.now()}`,
            deal_id: data.id,
            sender_id: buyerId,
            receiver_id: sellerId,
            content: message,
            is_system_message: true
        };
        await supabase.from('messages').insert([dbMsg]);

        fetchDeals(); fetchMessages(); fetchInvoices();
        
        // Edge Functionを利用して売り手へメール通知
        const myName = authUser?.user_metadata?.company_name || '買主';
        const chatUrl = getChatUrl(data.id);
        await sendEmailNotification(
            [sellerId],
            "【FactorMatch】新しい交渉・オファーが開始されました",
            `<p>ご登録の債権に対して、${myName}様より新しくオファー（交渉）が届きました。</p>
             <p>提示額: ¥${offerAmount.toLocaleString()} 円</p>
             <p>FactorMatchのチャット画面よりご確認ください。</p>
             <p><a href="${chatUrl}">チャット画面を開く</a></p>`
        ).catch(err => console.error("Email notification failed:", err));

        return newDeal;
    };

    const acceptDeal = async (deal: Deal) => {
        await supabase.from('deals').update({ status: 'negotiating' }).eq('id', deal.id);
        await supabase.from('invoices').update({ status: 'negotiating' }).eq('id', deal.invoiceId);

        await fetchDeals(); await fetchInvoices();
    };

    const agreeToDeal = async (dealId: string, isBuyer: boolean) => {
        // Fetch fresh deal from DB to avoid race conditions!
        const { data: dbDeal, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
        if (error || !dbDeal || !authUser) return;

        const now = new Date().toISOString();
        const dbUpdates: Record<string, unknown> = {};
        const stateUpdates: Partial<Deal> = {};

        if (isBuyer) {
            dbUpdates.buyer_agreed_at = now;
            stateUpdates.buyerAgreedAt = now;
        } else {
            dbUpdates.seller_agreed_at = now;
            stateUpdates.sellerAgreedAt = now;
        }

        // Check if the other party has already agreed using fresh DB data
        const willBeConcluded = (isBuyer && dbDeal.seller_agreed_at) || (!isBuyer && dbDeal.buyer_agreed_at);

        if (willBeConcluded) {
            const finalAmount = dbDeal.current_buyer_price || dbDeal.current_seller_price || dbDeal.current_amount;
            dbUpdates.status = 'concluded';
            dbUpdates.contract_date = now;
            dbUpdates.current_amount = finalAmount;

            stateUpdates.status = 'concluded';
            stateUpdates.contractDate = now;
            stateUpdates.currentAmount = finalAmount;

            // Add a system message for contract conclusion
            const dbMsg = {
                id: `msg_${Date.now()}`,
                deal_id: dealId,
                sender_id: authUser.id,
                receiver_id: isBuyer ? dbDeal.seller_id : dbDeal.buyer_id,
                content: "【システム】双方が合意し、契約が成立しました🎉",
                is_system_message: true
            };
            await supabase.from('messages').insert([dbMsg]);

            // Target Receivable becomes 'sold'
            await supabase.from('invoices').update({ status: 'sold' }).eq('id', dbDeal.invoice_id);
            setInvoices(prev => prev.map(inv => inv.id === dbDeal.invoice_id ? { ...inv, status: 'sold' } : inv));
        }

        // Ensure database is updated immediately
        await supabase.from('deals').update(dbUpdates).eq('id', dealId);
        
        // INSTANT UI UPDATE (Optimistic / Manual state override with complete reconstruction)
        setDeals(prev => prev.map(d => {
            if (d.id === dealId) {
                return {
                    ...d,
                    ...stateUpdates,
                    buyerAgreedAt: isBuyer ? now : dbDeal.buyer_agreed_at,
                    sellerAgreedAt: !isBuyer ? now : dbDeal.seller_agreed_at,
                    status: willBeConcluded ? 'concluded' : dbDeal.status,
                    contractDate: willBeConcluded ? now : dbDeal.contract_date
                };
            }
            return d;
        }));

        // Re-fetch in background to ensure sync (does not block UI transition)
        fetchDeals();
        if (willBeConcluded) {
            fetchInvoices();
        }
    };

    return (
        <DataContext.Provider value={{
            invoices, deals, messages, users, buyers, sellers, invoiceStats, sellerUncompletedCounts, loading,
            addInvoice, addMessage, updateDeal, updateUser,
            createDeal, createChatRoom, acceptDeal, agreeToDeal,
            markMessagesAsRead, getUserTrackRecord
        }}>
            {children}
        </DataContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
