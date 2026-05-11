import { supabase } from '../lib/supabase';

// VITE_APP_URL があれば使用、なければ location.origin をフォールバックとして使用
const getAppUrl = () => {
    let url = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    return url;
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

        // デバッグログの追加
        const { data: { user } } = await supabase.auth.getUser();
        console.log(`[Email Debug] 現在のログインユーザーID: ${user?.id}, 送信先IDリスト: ${cleanTargets.join(', ')}`);
        
        let isSelfOnly = true;
        for (const targetId of cleanTargets) {
            if (targetId !== user?.id) {
                isSelfOnly = false;
                break;
            }
        }

        if (isSelfOnly) {
            console.log("[Email Debug] 送信先が自分自身（同一ユーザーID）のみですが、開発・テスト環境の仕様として通知をスキップせずそのまま送信します。");
        }

        console.log(`sendEmailNotification: Dispatching email to targets: ${cleanTargets.join(', ')}. Subject: ${subject}`);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("[Email Error] 最新のセッションが取得できませんでした。Edge Functionが401エラーを返す可能性があります。", sessionError);
        }

        const headers: Record<string, string> = {
            Authorization: `Bearer ${session?.access_token || ''}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        };

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
