import type { Message } from '../types';

export const hasUnreadMessages = (dealId: string, messages: Message[], userId: string | undefined): boolean => {
    if (!userId) return false;
    const key = `chat_read_timestamps_${userId}`;
    const stored = localStorage.getItem(key);
    const timestamps = stored ? JSON.parse(stored) : {};
    const lastRead = timestamps[dealId] || 0;

    const dealMsgs = messages.filter(m => m.dealId === dealId || (m as any).deal_id === dealId);
    if (dealMsgs.length === 0) return false;

    const sortedMsgs = [...dealMsgs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMsg = sortedMsgs[sortedMsgs.length - 1];

    const messageSenderId = lastMsg.senderId || (lastMsg as any).sender_id;
    return String(messageSenderId) !== String(userId) && new Date(lastMsg.timestamp).getTime() > lastRead;
};

export const markDealAsRead = (dealId: string, userId: string | undefined) => {
    if (!userId) return;
    const key = `chat_read_timestamps_${userId}`;
    const stored = localStorage.getItem(key);
    const timestamps = stored ? JSON.parse(stored) : {};
    timestamps[dealId] = Date.now();
    localStorage.setItem(key, JSON.stringify(timestamps));
};
