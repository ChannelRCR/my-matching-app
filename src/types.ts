export type UserRole = 'seller' | 'buyer' | 'admin';

export interface User {
    id: string;
    name: string;
    companyName: string;
    role: UserRole;
    avatarUrl?: string;
    budget?: string | number;
    appealPoint?: string;
    status?: 'active' | 'suspended';
    registeredAt?: string;
}

export interface Invoice {
    id: string;
    sellerId: string;
    amount: number;
    dueDate: string; // YYYY-MM-DD
    industry: string;
    companySize?: string; // e.g. 'Listed', 'Large', 'SMB'
    companyCredit: string; // Credit info of the debtor company
    status: 'open' | 'negotiating' | 'sold';
    requestedAmount?: number;
    evidenceUrl?: string;
    evidenceName?: string;
}

export interface Offer {
    id: string;
    invoiceId: string;
    buyerId: string;
    offerAmount: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
    invoiceId?: string;
    dealId?: string;
}

export interface Deal {
    id: string;
    invoiceId: string;
    buyerId: string;
    sellerId: string;
    status: 'pending' | 'negotiating' | 'agreed' | 'rejected';
    initialOfferAmount: number;
    currentAmount: number;
    startedAt: string;
    lastMessageAt: string;
}
