import { supabase } from '../lib/supabase';

// VITE_APP_URL があれば使用、なければ location.origin をフォールバックとして使用
const getAppUrl = () => {
    return import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
};

export const getChatUrl = (dealId: string) => {
    return `${getAppUrl()}/chat?dealId=${dealId}`;
};

export const sendEmailNotification = async (
    targetUserIds: string[],
    subject: string,
    messageHtml: string
) => {
    try {
        const cleanTargets = (targetUserIds || []).filter(id => id && typeof id === 'string' && id.trim() !== '');
        
        if (cleanTargets.length === 0) {
            console.warn("sendEmailNotification: targetUserIds empty or contained only invalid values. Skipping notification.", targetUserIds);
            return;
        }

        console.log(`sendEmailNotification: Dispatching email to targets: ${cleanTargets.join(', ')}. Subject: ${subject}`);

        // セッショントークンを取得し、確実にAuthorizationヘッダーを付与する
        const { data: { session } } = await supabase.auth.getSession();
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': anonKey
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
            headers['Authorization'] = `Bearer ${anonKey}`;
        }

        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                type: 'custom',
                targetUserIds: cleanTargets,
                subject,
                messageHtml
            },
            headers
        });

        if (error) {
            console.warn("sendEmailNotification: Function invocation error:", error.message);
        } else {
            console.log("sendEmailNotification: Notification sent via Edge Function.");
        }
    } catch (err: unknown) {
        console.warn("sendEmailNotification: Failed to invoke send-email correctly.", err);
    }
};
