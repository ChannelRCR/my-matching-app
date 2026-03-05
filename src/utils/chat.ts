import type { Message } from '../types';

export const hasUnreadMessages = (dealId: string, messages: Message[], userId: string | undefined): boolean => {
    if (!userId) return false;

    return messages.some(m =>
        (m.dealId === dealId || (m as any).deal_id === dealId) &&
        ((m.receiverId === userId) || ((m as any).receiver_id === userId)) &&
        m.isRead === false
    );
};
