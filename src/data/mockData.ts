import type { User, Invoice, Offer, Message, Deal } from '../types';

export const MOCK_USERS: User[] = [
    {
        id: 'seller1',
        name: '田中 太郎',
        companyName: '株式会社テックソリューションズ',
        role: 'seller',
        status: 'active',
        registeredAt: '2025-12-01',
    },
    {
        id: 'buyer1',
        name: '田中 健太',
        companyName: '株式会社田中投資',
        role: 'buyer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        budget: '5,000万円',
        appealPoint: '建設業を中心に幅広く検討します。',
        status: 'active',
        registeredAt: '2026-01-15',
    },
];

export const MOCK_INVOICES: Invoice[] = [
    {
        id: 'inv1',
        sellerId: 'seller1',
        amount: 1000000,
        dueDate: '2026-03-31',
        industry: '建設業',
        companyCredit: '創業20年の安定企業。元請けは大手ゼネコン。',
        status: 'negotiating',
        requestedAmount: 950000,
    },
    {
        id: 'inv2',
        sellerId: 'seller1',
        amount: 500000,
        dueDate: '2026-04-15',
        industry: 'IT通信',
        companyCredit: '新興ベンチャーだが、過去3回の入金遅延なし。',
        status: 'open',
        requestedAmount: 470000,
    },
];

export const MOCK_OFFERS: Offer[] = [];

export const MOCK_DEALS: Deal[] = [
    {
        id: 'deal_init_1',
        invoiceId: 'inv1',
        buyerId: 'buyer1',
        sellerId: 'seller1',
        status: 'negotiating',
        initialOfferAmount: 950000,
        currentAmount: 950000,
        startedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    }
];

// Helper to create a deal (simulating backend logic)
export const createDeal = (invoiceId: string, buyerId: string, offerAmount: number, message: string): Deal => {
    const deal: Deal = {
        id: `deal_${Date.now()}`,
        invoiceId,
        buyerId,
        sellerId: MOCK_INVOICES.find(i => i.id === invoiceId)?.sellerId || 'seller1',
        status: 'negotiating',
        initialOfferAmount: offerAmount,
        currentAmount: offerAmount,
        startedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
    };
    MOCK_DEALS.push(deal);

    // Create initial message
    const initialMsg: Message = {
        id: `msg_${Date.now()}`,
        dealId: deal.id,
        senderId: buyerId,
        receiverId: deal.sellerId,
        content: message,
        timestamp: new Date().toISOString(),
    };
    MOCK_MESSAGES.push(initialMsg);

    // Update invoice status to negotiating
    const invoice = MOCK_INVOICES.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = 'negotiating';
    }

    return deal;
};

export const MOCK_MESSAGES: Message[] = [
    {
        id: 'msg_init_1',
        dealId: 'deal_init_1',
        senderId: 'buyer1',
        receiverId: 'seller1',
        content: '初めまして。こちらの案件に興味があります。95万円でいかがでしょうか？',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
    }
];

export const MOCK_ADMIN_STATS = {
    totalVolume: 154000000, // 1.54 Oku
    activeUsers: 142,
    pendingVerifications: 5,
    avgDiscountRate: 4.8, // %
    accidentRate: 0.2, // %
    avgFundingDays: 2.5, // days
};

export const MOCK_UNAPPROVED_USERS: User[] = [
    {
        id: 'new_seller1',
        name: '山田 建設',
        companyName: '山田建設株式会社',
        role: 'seller',
    },
    {
        id: 'new_buyer1',
        name: '投資 ファンドA',
        companyName: 'Alpha Capital',
        role: 'buyer',
    },
];
