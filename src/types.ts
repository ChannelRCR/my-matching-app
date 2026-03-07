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
    // New Profile Fields
    representativeName?: string;
    contactPerson?: string;
    address?: string;
    bankAccountInfo?: string;
    phone?: string;
    email?: string; // For display/contact, separate from auth email
    privacySettings?: {
        companyName: boolean;
        representativeName: boolean;
        contactPerson: boolean;
        address: boolean;
        bankAccountInfo: boolean;
        phone: boolean;
        email: boolean;
    };
}

export interface Invoice {
    id: string;
    sellerId: string;
    amount: number;
    sellingAmount?: number; // 売却対象金額（一部売却の場合はamountより小さい。全額の場合はamountと同じ）
    dueDate: string; // YYYY-MM-DD
    debtorName?: string;
    debtorAddress?: string;
    isClientNamePublic?: boolean;
    isClientAddressPublic?: boolean;
    industry: string;
    companySize?: 'Listed' | 'Large' | 'SMB' | 'Individual'; // Updated enum
    companyCredit: string; // Credit info of the debtor company
    status: 'open' | 'negotiating' | 'pending' | 'sold';
    requestedAmount?: number;
    evidenceUrl?: string;
    evidenceName?: string;
    createdAt?: string; // mapped from created_at
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
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    isRead?: boolean;
}

export interface Deal {
    id: string;
    invoiceId: string;
    buyerId: string;
    sellerId: string;
    status: 'open' | 'pending' | 'negotiating' | 'agreed' | 'rejected' | 'concluded';
    initialOfferAmount: number;
    currentAmount: number; // legacy/general current amount, maybe obsolete but keep for BC
    currentSellerPrice?: number;
    currentBuyerPrice?: number;
    startedAt: string;
    lastMessageAt: string;
    sellerAgreedAt?: string;
    buyerAgreedAt?: string;
    contractDate?: string;
    sellerRevealedFields?: Record<string, boolean>;
    buyerRevealedFields?: Record<string, boolean>;
    paymentStatus?: 'pending' | 'paid' | 'completed';
}
