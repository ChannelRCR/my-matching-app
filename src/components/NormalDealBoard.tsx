import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileTextIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setTransitioning } from '../utils/transitionState';
import { useMarket } from '../contexts/MarketContext';
import { useAuth } from '../contexts/AuthContext';
import { DealStepper } from './DealStepper';
import { sendEmailNotification, getChatUrl } from '../utils/notification';
import { DonationModal } from './DonationModal';
import { isLineBrowser } from '../utils/browser';
import type { Deal, Invoice, User as UserType } from '../types';

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // fallback
        }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

interface NormalDealBoardProps {
    deal: Deal;
    invoice: Invoice;
    user: { id: string } | null;
    isBuyer: boolean;
    effectivelyMatched: boolean;
    isDealExpired: boolean;
    activeDealsForInvoice: Deal[];
    users: UserType[];
    addMessage: (msg: import('../types').Message) => Promise<void>;
    updateDeal: (dealId: string, updates: Partial<Deal>) => Promise<void>;
    proposedPrice: string;
    setProposedPrice: React.Dispatch<React.SetStateAction<string>>;
    isPriceUnlocked: boolean;
    setIsPriceUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
    handleTermsClick: () => Promise<void>;
}

export const NormalDealBoard: React.FC<NormalDealBoardProps> = ({
    deal,
    invoice,
    user,
    isBuyer,
    effectivelyMatched,
    isDealExpired,
    activeDealsForInvoice,
    users,
    addMessage,
    updateDeal,
    proposedPrice,
    setProposedPrice,
    setIsPriceUnlocked,
    handleTermsClick
}) => {
    const { completeDeal } = useMarket();
    const { profile: loggedInProfile } = useAuth();
    
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [donationContextType, setDonationContextType] = useState<'common' | 'seller_success' | 'buyer_success'>('common');
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const [signature, setSignature] = useState('');

    const isValidSignature = React.useMemo(() => {
        if (!signature || !loggedInProfile) return false;
        const inputStr = signature.replace(/[\s　]+/g, '');
        const repStr = (loggedInProfile.representativeName || '').replace(/[\s　]+/g, '');
        const nameStr = (loggedInProfile.name || '').replace(/[\s　]+/g, '');
        
        return (repStr && inputStr === repStr) || (nameStr && inputStr === nameStr);
    }, [signature, loggedInProfile]);

    const opponentProfile = isBuyer ? users.find(u => u.id === deal?.sellerId) : users.find(u => u.id === deal?.buyerId);
    const highestOfferAmount = activeDealsForInvoice.length > 0 ? Math.max(...activeDealsForInvoice.map(d => d.currentBuyerPrice || 0)) : 0;
    const highestBuyersCount = activeDealsForInvoice.filter(d => (d.currentBuyerPrice || 0) === highestOfferAmount && highestOfferAmount > 0).length;
    const hasMultipleHighestBuyers = highestBuyersCount > 1;

    const handleProposePrice = async () => {
        if (!deal || !user || !proposedPrice || !invoice) return;
        const numPrice = Number(proposedPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            alert("有効な金額を入力してください");
            return;
        }

        const maxAllowed = invoice.requestedAmount || invoice.amount;
        if (isBuyer && maxAllowed && numPrice > maxAllowed) {
            alert(`譲渡対象額を超えるオファーはできません`);
            return;
        }

        if (!window.confirm(`金額 ${numPrice.toLocaleString()}円 で提示しますか？`)) return;

        if (isBuyer) {
            await updateDeal(deal.id, { currentBuyerPrice: numPrice });
        } else {
            await updateDeal(deal.id, { currentSellerPrice: numPrice });
        }
        setProposedPrice('');
        setIsPriceUnlocked(false);

        const effectiveSellerPrice = (deal.currentSellerPrice && deal.currentSellerPrice !== invoice.requestedAmount && deal.currentSellerPrice !== invoice.amount) 
            ? deal.currentSellerPrice 
            : (invoice.sellingAmount || invoice.amount || 0);

        const isMatch = isBuyer ? (numPrice === effectiveSellerPrice) : (numPrice === deal.currentBuyerPrice);

        const now = new Date();
        const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
        const proposerRole = isBuyer ? '買主' : '売主';
        
        await addMessage({
            id: `sys_${Date.now()}`,
            dealId: deal.id,
            senderId: user.id,
            receiverId: receiverId,
            content: `【システム通知】\n${proposerRole}の新しい提示金額: ¥${numPrice.toLocaleString()}`,
            timestamp: now.toISOString(),
            isSystemMessage: true
        });

        if (isMatch) {
            // DBレベルでの重複送信防止チェック
            const { data: latestDealData } = await supabase.from('deals').select('match_notification_sent').eq('id', deal.id).single();
            if (latestDealData && !latestDealData.match_notification_sent) {
                // すぐにフラグを立てる
                await supabase.from('deals').update({ match_notification_sent: true }).eq('id', deal.id);

                const matchedPriceMsg = `【システム通知】\n金額が ¥${numPrice.toLocaleString()} で合致しました。`;
                await addMessage({
                    id: `sys_match_${Date.now()}`,
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: receiverId,
                    content: matchedPriceMsg,
                    timestamp: new Date().toISOString(),
                    isSystemMessage: true
                });

                const chatUrl = getChatUrl(deal.id);
                await sendEmailNotification(
                    [deal.buyerId, deal.sellerId],
                    "【金額の合致】自動取引システムより [FactorMatch]",
                    `<p>お互いの提示金額が合致しました！（¥${numPrice.toLocaleString()}）</p>
                    <p>速やかにチャット画面へアクセスし、対象債権の契約手続（合意）を行ってください。</p>
                    <p><a href="${chatUrl}">チャット画面を開く</a></p>`
                );
            }
        } else {
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [receiverId],
                "新着オファーのお知らせ [FactorMatch]",
                `<p>${proposerRole}様より新しい金額の提示（¥${numPrice.toLocaleString()}）がありました。</p>
                <p>FactorMatchのチャット画面より条件を確認し、検討をお願いいたします。</p>
                <p><a href="${chatUrl}">チャット画面を開く</a></p>`
            );
        }
    };

    const handleAgree = async () => {
        if (!deal || !invoice || !user) return;

        // 【修正】プロフィール入力チェック（公開・非公開の設定に関わらず、データベース上の文字列データが入力されていれば通す）
        if (!loggedInProfile?.companyName || !loggedInProfile?.representativeName || !loggedInProfile?.address || !loggedInProfile?.bankAccountInfo) {
            alert('契約手続に進む前に、プロフィール設定画面から「会社名」「代表者名」「所在地」「口座情報」をすべて登録してください。');
            return;
        }

        const { data: latestDeal, error: fetchError } = await supabase
            .from('deals')
            .select('buyer_agreed_at, seller_agreed_at, current_buyer_price, current_seller_price, current_amount')
            .eq('id', deal.id)
            .single();

        if (fetchError || !latestDeal) {
            console.error('Failed to fetch latest deal state:', fetchError);
            alert('最新の取引状態の取得に失敗しました。ネットワークを確認し、再度お試しください。');
            return;
        }

        const willBeConcluded = (isBuyer && latestDeal.seller_agreed_at) || (!isBuyer && latestDeal.buyer_agreed_at);

        const confirmMsg = willBeConcluded
            ? '相手も合意済みのため、この操作で契約が成立します。よろしいですか？'
            : '契約内容に合意しますか？相手の合意をもって契約成立となります。';

        if (window.confirm(confirmMsg)) {
            const roleName = isBuyer ? '買い手' : '売り手';
            const now = new Date().toISOString();
            
            // --- ULTIMATE ESCAPE: 1. Block Realtime ---
            setTransitioning(true);

            const loadingText = '契約処理中...';

            // --- ULTIMATE ESCAPE: 2. Pure DOM Overlay ---
            const overlay = document.createElement('div');
            overlay.id = 'ultimate-escape-overlay';
            overlay.innerHTML = `
                <div style="position: fixed; inset: 0; z-index: 99999; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 4px solid #3b82f6; border-top-color: transparent; animation: ultimate-spin 1s linear infinite; margin-bottom: 16px;"></div>
                    <h2 style="font-size: 1.25rem; font-weight: bold; color: #1e293b; font-family: sans-serif;">${loadingText}</h2>
                    <p style="font-size: 0.875rem; color: #64748b; margin-top: 8px; font-family: sans-serif;">このまま画面を閉じずにお待ちください。</p>
                    <style>@keyframes ultimate-spin { 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
            document.body.appendChild(overlay);

            try {
                // 1. 金額を変数として上位スコープに定義（ReferenceError修正）
                const finalAmount = latestDeal.current_buyer_price || latestDeal.current_seller_price || latestDeal.current_amount || deal.currentBuyerPrice || deal.currentSellerPrice || deal.currentAmount || 0;

                const dbUpdates: Partial<Deal> & Record<string, unknown> = {};
                if (isBuyer) {
                    dbUpdates.buyer_agreed_at = now;
                } else {
                    dbUpdates.seller_agreed_at = now;
                }
                
                if (willBeConcluded) {
                    dbUpdates.status = 'concluded';
                    dbUpdates.contract_date = now;
                    dbUpdates.current_amount = finalAmount;
                }
                
                // 2. 最も重要な deals テーブルの更新を先に実行（整合性担保）
                // 契約締結証明ログ（署名、IP、UA）も一緒に保存する
                let ipAddress = null;
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    if (response.ok) {
                        const data = await response.json();
                        ipAddress = data.ip;
                    }
                } catch (e) {
                    console.error("IP fetching failed:", e);
                }

                if (isBuyer) {
                    dbUpdates.buyer_signature_name = signature;
                    dbUpdates.buyer_ip_address = ipAddress;
                    dbUpdates.buyer_user_agent = navigator.userAgent;
                } else {
                    dbUpdates.seller_signature_name = signature;
                    dbUpdates.seller_ip_address = ipAddress;
                    dbUpdates.seller_user_agent = navigator.userAgent;
                }

                const { error: updateError } = await supabase.from('deals').update(dbUpdates).eq('id', deal.id);
                if (updateError) throw updateError;

                if (willBeConcluded) {
                    // 契約成立時: invoices テーブルの更新
                    const { error: invoiceUpdateError } = await supabase.from('invoices').update({ status: 'sold' }).eq('id', deal.invoiceId);
                    if (invoiceUpdateError) {
                        console.error("Invoice update failed, but deal is already concluded:", invoiceUpdateError);
                    }
                }

                // 3. メッセージの送信
                await addMessage({
                    id: generateUUID(),
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: isBuyer ? deal.sellerId : deal.buyerId,
                    content: `【システム通知】\n${roleName}が契約締結の意思表示を行いました。`,
                    timestamp: now,
                    isSystemMessage: true
                }).catch(e => console.error("System message (agree) failed:", e));
                
                if (willBeConcluded) {
                    // 契約成立時のシステムメッセージ（ID欠落エラー修正）
                    const systemMsg = {
                        id: generateUUID(),
                        deal_id: deal.id,
                        sender_id: user.id,
                        receiver_id: isBuyer ? deal.sellerId : deal.buyerId,
                        content: "【システム】双方が合意し、契約成立しました🎉",
                        is_system_message: true,
                        created_at: now
                    };
                    const { error: msgInsertError } = await supabase.from('messages').insert([systemMsg]);
                    if (msgInsertError) {
                        console.error("System message (concluded) insert failed but continuing contract creation:", msgInsertError);
                    }
                    
                    completeDeal(invoice.amount, deal.currentAmount);

                    const chatUrl = getChatUrl(deal.id);
                    
                    // 売主への通知
                    await sendEmailNotification(
                        [deal.sellerId],
                        "【重要】契約が締結されました（譲渡代金の支払待ち） [FactorMatch]",
                        `<p>対象案件（Deal ID: ${deal.id}）の債権譲渡契約が締結されました。</p>
                        <p>買主からの譲渡代金の振込をお待ちください。</p>
                        <p><a href="${chatUrl}">チャット画面で確認する（契約書PDFもこちらから）</a></p>`
                    );
                    
                    // 買主への通知
                    await sendEmailNotification(
                        [deal.buyerId],
                        "【重要】契約が締結されました（譲渡代金のお支払い手続き） [FactorMatch]",
                        `<p>対象案件（Deal ID: ${deal.id}）の債権譲渡契約が締結されました。</p>
                        <p>指定の口座へ速やかに譲渡代金（<strong>¥${finalAmount.toLocaleString()}</strong>）のお支払い（ご送金）を行ってください。</p>
                        <p><a href="${chatUrl}">チャット画面で確認する（契約書PDFもこちらから）</a></p>`
                    );
                    
                    const competingDealsToReject = activeDealsForInvoice.filter(d => d.id !== deal.id && !['rejected', 'withdrawn', 'cancelled'].includes(d.status));
                    const competitorBuyerIds = competingDealsToReject.map(d => d.buyerId);
                    if (competitorBuyerIds.length > 0) {
                        const dashboardUrl = `${import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/`;
                        await sendEmailNotification(
                            competitorBuyerIds,
                            "【お知らせ】交渉中の案件が他の方と成約・募集終了となりました [FactorMatch]",
                            `<p>誠に残念ながら、交渉いただいていた対象案件につきまして、売主様が他の方との契約に合意されたため、募集が終了（自動取り下げ）となりました。</p>
                            <p>またの機会にご利用をお待ちしております。</p>
                            <p><a href="${dashboardUrl}">ダッシュボードへ戻る</a></p>`
                        ).catch(err => console.error("Competitor rejection email failed:", err));
                    }
                } else {
                    const chatUrl = getChatUrl(deal.id);
                    const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
                    await sendEmailNotification(
                        [receiverId],
                        "お相手が契約に同意しました。最終合意をお願いします [FactorMatch]",
                        `<p>お相手が契約内容に同意しました。</p>
                        <p>あなたからの最終合意をもって契約成立となります。速やかにチャット画面より同意手続を行ってください。</p>
                        <p><a href="${chatUrl}">チャット画面を開く</a></p>`
                    );
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // --- ULTIMATE ESCAPE: 3. Browser-level hard navigation ---
                window.location.href = window.location.pathname + window.location.search;

            } catch (error: unknown) {
                console.error('Supabase Error Details:', error);
                const errMsg = error instanceof Error ? error.message : String(error);
                alert('合意処理に失敗しました: ' + errMsg);
                
                const overlayElement = document.getElementById('ultimate-escape-overlay');
                if (overlayElement) overlayElement.remove();
                setTransitioning(false);
            }
        }
    };

    const handlePrintContract = async () => {
        if (!deal || !invoice) return;
        if (isLineBrowser()) {
            alert("※LINEアプリ内ではPDFのダウンロードが制限されています。画面右上（または右下）のメニューから『デフォルトのブラウザで開く（Safari / Chrome等）』を選択し、標準ブラウザから再度お試しください。");
            return;
        }
        const buyer = users.find(u => u.id === deal.buyerId);
        const seller = users.find(u => u.id === deal.sellerId);
        if (!buyer || !seller) {
            alert("ユーザー情報が見つかりません。");
            return;
        }

        setIsGeneratingPdf(true);
        try {
            const { generateContractPDF } = await import('../utils/pdfGenerator');
            await generateContractPDF(deal, invoice, seller, buyer);
        } catch (e) {
            console.error("PDF Error:", e);
            if (e instanceof Error && e.message === "DOWNLOAD_FAILED") {
                alert("ダウンロードに失敗しました。標準ブラウザ（Safari等）でお試しください。");
            } else {
                alert(`PDF生成に失敗しました。\n詳細: ${e instanceof Error ? e.message : String(e)}`);
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Helpers for Time / Timer Logic
    const getJSTDate = (dateParam?: string | number | Date) => {
        const d = dateParam ? new Date(dateParam) : new Date();
        const jstStr = d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
        return new Date(jstStr);
    };

    const is24HoursPassed = (timestamp: string) => {
        const date = getJSTDate(timestamp);
        const now = getJSTDate();
        return (now.getTime() - date.getTime()) >= 24 * 60 * 60 * 1000;
    };

    const canSellerCancel = () => {
        if (!deal?.buyer_urged_at) return false;
        const urgedAt = getJSTDate(deal.buyer_urged_at);
        const now = getJSTDate();
        const urgedHour = urgedAt.getHours();

        if (urgedHour >= 16) {
            const nextDay9am = new Date(urgedAt);
            nextDay9am.setDate(nextDay9am.getDate() + 1);
            nextDay9am.setHours(9, 0, 0, 0);
            return now >= nextDay9am;
        } else {
            return (now.getTime() - urgedAt.getTime()) >= 2 * 60 * 60 * 1000;
        }
    };

    // Lazy Evaluation 24H auto confirm
    React.useEffect(() => {
        if (!deal || !user) return;
        const checkAutoConfirm = async () => {
            let shouldRefresh = false;
            // Phase 1 Auto
            if (deal.paymentStatus === 'buyer_paid' && deal.buyer_reported_at && is24HoursPassed(deal.buyer_reported_at) && !deal.buyer_urged_at) {
                await updateDeal(deal.id, { paymentStatus: 'seller_received' });
                await addMessage({
                    id: `sys_auto_${Date.now()}`,
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: deal.buyerId,
                    content: "【システム通知】買主の送金報告から24時間が経過したため、自動的に着金とみなしフェーズ2へ移行しました。",
                    timestamp: new Date().toISOString(),
                    isSystemMessage: true
                });
                const chatUrl = getChatUrl(deal.id);
                await sendEmailNotification(
                    [deal.buyerId, deal.sellerId],
                    "【自動移行】フェーズ2（回収・引渡し）へ進行しました [FactorMatch]",
                    `<p>買主様からの送金報告から24時間が経過したため、自動的にフェーズ2（回収待ち）へ移行しました。</p>
                    <p>対象案件の着金状況をご確認ください。</p>
                    <p><a href="${chatUrl}">チャット画面を開く</a></p>`
                );
                shouldRefresh = true;
            }
            // Phase 2 Auto
            if (deal.paymentStatus === 'seller_repaid' && deal.seller_reported_at && is24HoursPassed(deal.seller_reported_at) && !deal.seller_urged_at) {
                await updateDeal(deal.id, { paymentStatus: 'fully_settled' });
                await addMessage({
                    id: `sys_auto_${Date.now()}`,
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: deal.sellerId,
                    content: "【システム通知】売主の送金報告から24時間が経過したため、自動的に着金とみなし全取引を完了しました。",
                    timestamp: new Date().toISOString(),
                    isSystemMessage: true
                });
                const chatUrl = getChatUrl(deal.id);
                await sendEmailNotification(
                    [deal.buyerId, deal.sellerId],
                    "【自動完了】すべての取引が完了しました [FactorMatch]",
                    `<p>売主様からの送金報告から24時間が経過したため、自動的に着金確認とみなされ、すべての取引が完了いたしました。</p>
                    <p><a href="${chatUrl}">チャット画面を開く</a></p>`
                );
                shouldRefresh = true;
            }
            if (shouldRefresh) {
                window.location.reload();
            }
        };
        checkAutoConfirm();
    }, [deal?.paymentStatus, deal?.buyer_reported_at, deal?.seller_reported_at, deal?.buyer_urged_at, deal?.seller_urged_at]);

    // ===== Phase 1 Handlers (Buyer to Seller) =====
    const handleBuyerPaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("本当に送金を報告しますか？\n（24時間経過した場合は、自動で着金確認したものと処理されます）")) {
            await updateDeal(deal.id, { 
                paymentStatus: 'buyer_paid',
                buyer_reported_at: new Date().toISOString(),
                buyer_urged_at: null as unknown as string
            });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買主が譲渡代金の送金完了を報告しました。着金確認をお願いします。（なお、24時間経過した場合は自動で着金確認したものとみなします）",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.sellerId],
                "買主から送金報告がありました [FactorMatch]",
                `<p>買主から送金報告がありました。直ちに入金を確認し、「着金確認」操作を行ってください。</p>
                <p><a href="${chatUrl}">チャット画面を開く</a></p>`
            );
        }
    };

    const handleSellerUrgePayment = async () => {
        if (!deal || !user) return;
        if (window.confirm("買主に支払いの督促を行いますか？自動着金タイマーが中止され、警告が送信されます。")) {
            await updateDeal(deal.id, { buyer_urged_at: new Date().toISOString(), buyer_reported_at: null as unknown as string });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【警告】売主から未確認/督促がありました。直ちにお支払願います。支払がない場合、売主からキャンセルされる場合があります。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.buyerId],
                "【督促】売主様より譲渡代金の着金未確認の連絡がありました [FactorMatch]",
                `<p>対象案件（Deal ID: ${deal.id}）について、売主様が譲渡代金（<strong>¥${(deal.currentAmount || 0).toLocaleString()}</strong>）の着金を確認できていない旨の連絡がありました。</p>
                <p>至急送金状況をご確認いただき、未送金の場合は直ちにお手続きをお願いします。</p>
                <p><a href="${chatUrl}">チャット画面を開いて状況を確認する</a></p>`
            );
        }
    };

    const handleSellerCancel = async () => {
        if (!deal || !user) return;
        if (window.confirm("買主からの着金が確認できないため、この取引を強制キャンセルしますか？\n中止案件（Rejected）になり復旧できなくなります。")) {
            await updateDeal(deal.id, { status: 'rejected' });
            await supabase.from('invoices').update({ status: 'withdrawn' }).eq('id', deal.invoiceId);
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】督促後も支払いが確認できなかったため、売主が一方的なキャンセルを実行しました。取引は中止されました。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.buyerId],
                "【重要】取引がキャンセルされました [FactorMatch]",
                `<p>督促後も代金の確認ができなかったため、売主様により本案件の取引がキャンセル（中止）されました。</p>
                <p>本取引はこれ以上進行できません。</p>
                <p><a href="${chatUrl}">チャット画面を開く</a></p>`
            );
            window.location.reload();
        }
    };

    const handleSellerPaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、取引をフェーズ2（回収金の引渡し待ち）に進めますか？")) {
            await updateDeal(deal.id, { paymentStatus: 'seller_received', buyer_urged_at: null as unknown as string, buyer_reported_at: null as unknown as string });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売主が譲渡代金の着金を確認しました。期日後の最終回収金送金をお待ちください。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.buyerId],
                "【受領完了】売主様が譲渡代金の着金を確認しました [FactorMatch]",
                `<p>対象案件（Deal ID: ${deal.id}）について、譲渡代金（<strong>¥${(deal.currentAmount || 0).toLocaleString()}</strong>）の着金が確認され、債権譲渡手続が完了しました。</p>
                <p>期日後の売主様からの回収金額の送金をお待ちください。</p>
                <p><a href="${chatUrl}">チャット画面を開く</a></p>`
            );
        }
    };

    // ===== Phase 2 Handlers (Seller to Buyer) =====
    const handleSellerRepaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("第三債務者からの回収および買主への送金完了を報告しますか？")) {
            await updateDeal(deal.id, { 
                paymentStatus: 'seller_repaid',
                seller_reported_at: new Date().toISOString(),
                seller_urged_at: null as unknown as string
            });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売主が回収および送金完了を報告しました。着金確認をお願いします。（24時間後自動完了となります）",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.buyerId],
                "【報告】売主様より回収金送金の報告がありました [FactorMatch]",
                `<p>対象案件（Deal ID: ${deal.id}）について、第三債務者からの回収を買主様へ送金（報告）いたしました。</p>
                <p>至急ご自身の口座にて回収対象額（<strong>¥${(invoice.requestedAmount || invoice.amount).toLocaleString()}</strong>）着金を確認し、「着金確認」操作を行ってください。</p>
                <p><a href="${chatUrl}">チャット画面を開く</a></p>`
            );
        }
    };

    const handleBuyerUrgeRepayment = async () => {
        if (!deal || !user) return;
        if (window.confirm("売主に回収金の送金督促を行いますか？")) {
            await updateDeal(deal.id, { seller_urged_at: new Date().toISOString(), seller_reported_at: null as unknown as string });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【警告】買主から未確認/督促がありました。直ちに支払願います。支払がない場合、買主が直接第三債務者に問い合わせを行う場合があります。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.sellerId],
                "【督促】買主様より回収金の着金未確認の連絡がありました [FactorMatch]",
                `<p>対象案件（Deal ID: ${deal.id}）について、回収対象額（<strong>¥${(invoice.requestedAmount || invoice.amount).toLocaleString()}</strong>）の着金を現在も確認できていない旨の連絡が買主様からありました。</p>
                <p>至急送金手続きの状況を確認し、直ちにご対応ください。</p>
                <p><a href="${chatUrl}">チャット画面を開いて状況を確認する</a></p>`
            );
        }
    };

    const handleBuyerRepaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、全取引を完了しますか？この操作は取り消せません。")) {
            await updateDeal(deal.id, { paymentStatus: 'fully_settled', seller_urged_at: null as unknown as string, seller_reported_at: null as unknown as string });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買主が最終的な着金を確認しました。これにて本取引は全て完了となります。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            const chatUrl = getChatUrl(deal.id);
            await sendEmailNotification(
                [deal.sellerId, deal.buyerId],
                "🎊 すべての取引が完了しました [FactorMatch]",
                `<p>買主による最終着金確認が完了し、本案件のすべての取引プロセスが完了いたしました。</p>
                <p><a href="${chatUrl}">取引履歴として詳細を確認する</a></p>`
            );
        }
    };

    return (
        <div className={`flex flex-col gap-3 ${(isDealExpired || invoice.status === 'withdrawn') ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            {/* Trading Board Price Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        相手方の提示額
                    </div>
                    <div className="text-lg font-bold text-slate-700">
                        {isBuyer ?
                            (deal.currentSellerPrice && deal.currentSellerPrice !== invoice.requestedAmount && deal.currentSellerPrice !== invoice.amount ? `¥${deal.currentSellerPrice.toLocaleString()}` : (invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未提示')) :
                            (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示')}
                    </div>
                </div>
                <div className={`p-3 rounded-lg border shadow-sm flex flex-col justify-between ${effectivelyMatched ? 'bg-emerald-50 border-emerald-300' : 'bg-blue-50 border-blue-200'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${effectivelyMatched ? 'text-emerald-600' : 'text-blue-600'}`}>
                        当方の提示額
                    </div>
                    <div className={`text-2xl font-black tracking-tight ${effectivelyMatched ? 'text-emerald-800' : 'text-blue-900'} leading-none`}>
                        {isBuyer ?
                            (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示') :
                            (deal.currentSellerPrice && deal.currentSellerPrice !== invoice.requestedAmount && deal.currentSellerPrice !== invoice.amount ? `¥${deal.currentSellerPrice.toLocaleString()}` : (invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未提示'))}
                    </div>
                </div>
            </div>

            {/* Form */}
            {['open', 'pending', 'negotiating'].includes(deal.status) && (invoice.status as string) !== 'withdrawn' && !isDealExpired && !effectivelyMatched && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-slate-600 tracking-wide">入札・金額提示</div>
                    <form onSubmit={(e) => { e.preventDefault(); handleProposePrice(); }} className="flex gap-2">
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={proposedPrice ? Number(proposedPrice.replace(/,/g, '')).toLocaleString() : ''}
                            onChange={(e) => {
                                let val = e.target.value;
                                val = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, '');
                                setProposedPrice(val);
                            }}
                            placeholder="金額を入力"
                            className="flex-1 h-9 font-mono text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-300"
                            disabled={isDealExpired || (invoice.status as string) === 'withdrawn'}
                        />
                        <Button type="submit" size="sm" className="h-9 bg-slate-800 hover:bg-slate-700 text-white shadow font-bold tracking-wide shrink-0 transition-colors px-4" disabled={!proposedPrice || isDealExpired || (invoice.status as string) === 'withdrawn'}>
                            提示する
                        </Button>
                    </form>
                    <p className="text-[10px] text-slate-500 mt-0.5">※半角数字で入力してください</p>
                </div>
            )}

            {/* Agreement Logic */}
            {invoice.status === 'withdrawn' ? (
                <div className="mt-2 border-t border-slate-200 pt-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-300 shadow-sm">
                        案件取り下げ済み
                    </span>
                </div>
            ) : isDealExpired ? (
                <div className="mt-2 border-t border-slate-200 pt-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-300 shadow-sm">
                        入金期日が徒過したため、この取引の交渉は終了しました。
                    </span>
                </div>
            ) : ['open', 'pending', 'negotiating'].includes(deal.status) ? (
                <div className={`pt-2 ${(isDealExpired || (invoice.status as string) === 'withdrawn') ? 'opacity-50 pointer-events-none' : ''}`}>
                    {effectivelyMatched ? (
                        <>
                            <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4 font-bold text-center border border-green-200 shadow-sm">
                                🎉 金額が合致しました！
                            </div>

                            {!isBuyer && hasMultipleHighestBuyers && !deal.sellerAgreedAt && (
                                <div className="mb-4 text-center">
                                    <p className="text-xs text-slate-500 mb-2">最高額オファーの買主が複数います。金額を再提示できます。</p>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={async () => {
                                            setIsPriceUnlocked(true);
                                            if (deal && user) {
                                                const competingDeals = activeDealsForInvoice.filter(d => 
                                                    (d.currentBuyerPrice || 0) > 0 && d.currentBuyerPrice === deal.currentBuyerPrice
                                                );
                                                
                                                for (const cDeal of competingDeals) {
                                                    await addMessage({
                                                        id: `sys_unlock_${Date.now()}_${cDeal.id}`,
                                                        dealId: cDeal.id,
                                                        senderId: user.id,
                                                        receiverId: cDeal.buyerId,
                                                        content: "【システム通知】複数名の買い手が同額で競合しました。売り手が提示額を再検討し、順次再提示します。",
                                                        timestamp: new Date().toISOString(),
                                                        isSystemMessage: true
                                                    });
                                                    
                                                    await updateDeal(cDeal.id, { currentSellerPrice: null as unknown as number });
                                                    
                                                    const chatUrl = getChatUrl(cDeal.id);
                                                    await sendEmailNotification(
                                                        [cDeal.buyerId],
                                                        "【重要】売主様より条件の再提示（再オファー）のお願い [FactorMatch]",
                                                        `<p>現在、他の買主様と同額の最高額オファーとなっております。</p>
                                                        <p>売主様より、条件の再提示（金額の再検討）のお願いが届いています。チャット画面より新しいオファーをご提示ください。</p>
                                                        <p><a href="${chatUrl}">チャット画面を開いて再提示する</a></p>`
                                                    );
                                                }
                                                if (invoice?.sellingAmount) {
                                                    setProposedPrice(String(invoice.sellingAmount));
                                                }
                                            }
                                        }}
                                        className="text-slate-600 border-slate-300 hover:bg-slate-50"
                                    >
                                        相手の買主に対して、金額を再提示する。
                                    </Button>
                                </div>
                            )}

                            {((isBuyer && deal.buyerAgreedAt) || (!isBuyer && deal.sellerAgreedAt)) ? (
                                <Button size="sm" variant="secondary" disabled className="bg-slate-200 text-slate-500 w-full cursor-not-allowed">
                                    相手の最終合意を待っています
                                </Button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-3">
                                        <p className="text-sm font-bold text-slate-800 text-center">
                                            契約内容の最終確認
                                        </p>
                                        <div 
                                            className="bg-white border border-slate-300 p-4 h-64 overflow-y-auto text-xs text-slate-600 leading-relaxed rounded shadow-inner"
                                            onScroll={(e) => {
                                                const target = e.target as HTMLDivElement;
                                                // スクロール判定（20pxの遊びを設ける）
                                                if (target.scrollHeight - target.scrollTop - target.clientHeight <= 20) {
                                                    setIsScrolledToBottom(true);
                                                }
                                            }}
                                        >
                                            <h4 className="font-bold text-center mb-4 text-sm tracking-widest text-slate-800">重要事項説明書 兼 契約書（プレビュー）</h4>
                                            <p className="mb-4">譲渡人（以下「甲」という。）と、譲受人（以下「乙」という。）は、以下の通り債権譲渡に関して合意し、契約を締結する。</p>
                                            
                                            <h5 className="font-bold mb-2 border-b border-slate-400 pb-1 text-slate-800">1. 譲渡対象債権</h5>
                                            <ul className="list-disc pl-5 mb-4 space-y-1">
                                                <li><strong>債務者名:</strong> {invoice.debtorName || '記載なし'}</li>
                                                <li><strong>債務者住所:</strong> {invoice.debtorAddress || '記載なし'}</li>
                                                <li><strong>債権額面金額:</strong> {invoice.amount.toLocaleString()}円</li>
                                                <li><strong>支払期日:</strong> {invoice.dueDate ? `${new Date(invoice.dueDate).getFullYear()}年${new Date(invoice.dueDate).getMonth() + 1}月${new Date(invoice.dueDate).getDate()}日` : '未定'}</li>
                                            </ul>
                                            
                                            <h5 className="font-bold mb-2 border-b border-slate-400 pb-1 text-slate-800">2. 譲渡代金</h5>
                                            <p className="mb-4 pl-2">金 {(deal.currentBuyerPrice || deal.currentSellerPrice || deal.currentAmount || 0).toLocaleString()} 円</p>
                                            
                                            <h5 className="font-bold mb-2 border-b border-slate-400 pb-1 text-slate-800">3. 権利移転時期（所有権留保）</h5>
                                            <p className="mb-4 pl-2 font-bold text-black underline decoration-slate-300 underline-offset-4">譲渡対象債権の所有権は、乙が譲渡代金を完済した時に甲から乙へ移転するものとする。</p>
                                            
                                            <div className="bg-slate-100 p-3 mt-4 text-[10px] border border-slate-200">
                                                <strong>【約款の適用】</strong><br />
                                                本契約書に記載のない事項については、当プラットフォームの利用規約および債権譲渡約款（<Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline" onClick={handleTermsClick}>リンク</Link>）の定めるところによる。
                                            </div>
                                            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-400 font-bold">
                                                【プレビューの末尾】
                                            </div>
                                        </div>

                                        <label className={`flex items-start gap-2 text-sm p-3 rounded border shadow-sm transition-colors ${isScrolledToBottom ? 'cursor-pointer hover:bg-slate-50 border-slate-300 bg-white' : 'cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isTermsAgreed}
                                                onChange={(e) => setIsTermsAgreed(e.target.checked)}
                                                disabled={!isScrolledToBottom}
                                                className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 shrink-0 cursor-pointer disabled:opacity-50"
                                            />
                                            <span className="leading-snug select-none flex-1">
                                                <span className="font-bold">上記内容を十分に確認し、債権譲渡契約の締結に同意します</span>
                                                {!isScrolledToBottom && (
                                                    <span className="block text-[10px] text-red-500 mt-1 font-bold">※プレビューを最後までスクロールするとチェックできます</span>
                                                )}
                                            </span>
                                        </label>

                                        <div className="flex flex-col gap-1.5 mt-2 bg-white p-3 rounded border border-slate-200">
                                            <label className="text-xs font-bold text-slate-700">署名（フルネーム）</label>
                                            <Input 
                                                type="text" 
                                                value={signature} 
                                                onChange={(e) => setSignature(e.target.value)} 
                                                placeholder="例：山田 太郎"
                                                className="text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white h-9"
                                            />
                                            <p className="text-[10px] text-slate-500">※ご登録の氏名または代表者名を入力してください</p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        className={`w-full font-bold shadow-md transition-all h-10 ${
                                            isTermsAgreed && isValidSignature
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleAgree();
                                        }}
                                        disabled={!isTermsAgreed || !isValidSignature}
                                    >
                                        <FileTextIcon className="w-5 h-5 mr-2" />
                                        契約を締結してPDFを発行する
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-sm text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                            金額が合致するまで合意できません
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-2 border-t border-slate-200 pt-4 flex flex-col items-center gap-3">
                    {deal.status === 'agreed' ? (
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                            取引成立済み
                        </span>
                    ) : deal.status === 'concluded' ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                                契約成立🎉
                            </span>

                            <div className="w-full bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col items-center gap-3">
                                <p className="text-sm text-slate-600 font-bold mb-1">契約書（PDF）の確認・保存</p>
                                <div className="flex gap-2 w-full max-w-sm">
                                    <Button
                                        variant="outline"
                                        className="flex-1 flex items-center justify-center border-slate-300 hover:bg-slate-50 text-slate-700 font-bold shadow-sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const url = `/contract/${deal.id}`;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        }}
                                    >
                                        <FileTextIcon className="w-4 h-4 mr-2" /> Webで確認
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold shadow-sm"
                                        onClick={handlePrintContract}
                                        disabled={isGeneratingPdf}
                                    >
                                        <FileTextIcon className="w-4 h-4 mr-2" /> {isGeneratingPdf ? '生成中...' : 'PDF保存'}
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full mb-2">
                                <DealStepper status={deal.status} paymentStatus={deal.paymentStatus} />
                            </div>

                            {isBuyer ? (
                                <div className="w-full font-medium text-sm text-left flex flex-col gap-3">
                                    {/* PHASE 1 (支払い待ち) */}
                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                            <p className="font-bold text-blue-800 mb-2">
                                                契約が成立しました。速やかに以下の口座へ譲渡代金（合意金額: ¥{(deal.currentAmount || deal.currentBuyerPrice || 0).toLocaleString()}）をお振込みください。
                                            </p>
                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                <p><strong>振込先口座:</strong></p>
                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。売主にお問い合わせください。'}</p>
                                            </div>
                                            {deal.buyer_urged_at && (
                                                <div className="bg-red-50 border border-red-200 p-3 rounded mb-3 text-red-700 font-bold text-xs shadow-inner">
                                                    ⚠️ 売主から支払いの督促がありました。直ちに支払願います。支払がない場合、取引がキャンセルされる可能性があります。
                                                </div>
                                            )}
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-all" onClick={handleBuyerPaymentReport}>
                                                振込を完了し、売主に報告する
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'buyer_paid' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                            <p>売主の着金確認をお待ちください。（24時間経過で自動着金完了となります）</p>
                                            {deal.buyer_urged_at && (
                                                <div className="bg-red-50 border border-red-200 p-3 rounded mt-3 text-red-700 font-bold text-xs shadow-inner">
                                                    ⚠️ 売主が着金を確認できていません。支払い状況をご確認ください。
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* PHASE 2 (回収・手渡し待ち) */}
                                    {deal.paymentStatus === 'seller_received' && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center font-bold relative">
                                            <p className="text-blue-800 mb-2">フェーズ2: 売主の回収および送金をお待ちください。</p>
                                            <p className="text-xs text-blue-600 font-normal">引渡しの報告後、ここで最終確認を行います。</p>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_repaid' && (
                                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm flex flex-col gap-3">
                                            <p className="text-orange-800 font-bold text-center">📢 売主から引渡し/送金完了の報告がありました</p>
                                            <p className="text-xs text-orange-700 text-center">着金を確認し、全取引を完了するか、着金していない場合は督促してください。</p>
                                            <div className="flex gap-2 w-full mt-2">
                                                <Button className="flex-1 bg-white border-red-300 text-red-600 hover:bg-red-50 font-bold shadow-sm" variant="outline" onClick={handleBuyerUrgeRepayment}>
                                                    着金未確認 (督促する)
                                                </Button>
                                                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleBuyerRepaymentConfirm}>
                                                    すべて完了する
                                                </Button>
                                            </div>
                                            {deal.seller_urged_at && (
                                                <div className="mt-3 text-center border-t border-orange-200 pt-3">
                                                    <p className="text-xs text-red-600 font-bold mb-2">解決しない場合は仲裁チャットへ移行できます</p>
                                                    <Button variant="outline" className="w-full text-slate-600 border-slate-300 text-xs py-1 h-8" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                                        仲裁チャットを開く
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'fully_settled' && (
                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm text-center font-bold text-emerald-800">
                                            <p>最終着金確認済み。全取引が完了しました。</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full font-medium text-sm text-left flex flex-col gap-3">
                                    {/* PHASE 1 (支払い待ち) */}
                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center flex flex-col gap-3">
                                            <p className="font-bold text-blue-800 mb-2">フェーズ1: 買主の支払い待ち</p>
                                            <p className="text-xs text-blue-700">買主からの譲渡代金の入金をお待ちください。</p>
                                            <Button className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold shadow-sm mt-2" variant="outline" onClick={handleSellerUrgePayment}>
                                                着金未確認 (督促する)
                                            </Button>
                                            {canSellerCancel() && (
                                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm text-xs mt-1" onClick={handleSellerCancel}>
                                                    取引を強制キャンセルする
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'buyer_paid' && (
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm">
                                            <p className="text-green-800 font-bold mb-3 text-center">✅ 買主から送金報告がありました</p>
                                            <div className="flex gap-2 w-full">
                                                <Button className="flex-1 bg-white border-red-300 text-red-600 hover:bg-red-50 font-bold shadow-sm text-xs" variant="outline" onClick={handleSellerUrgePayment}>
                                                    未確認 (督促)
                                                </Button>
                                                <Button className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold shadow" onClick={handleSellerPaymentConfirm}>
                                                    着金を確認した
                                                </Button>
                                            </div>
                                            {canSellerCancel() && (
                                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm text-xs mt-3" onClick={handleSellerCancel}>
                                                    取引を強制キャンセルする
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* PHASE 2 (回収・手渡し待ち) */}
                                    {deal.paymentStatus === 'seller_received' && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                            <p className="text-blue-800 font-bold mb-3 text-center">
                                                フェーズ2へ移行しました：期日に第三債務者から回収後、速やかに買主へ引渡し（送金）してください。
                                            </p>
                                            {deal.seller_urged_at && (
                                                <div className="bg-red-50 border border-red-200 p-3 rounded mb-3 text-red-700 font-bold text-xs shadow-inner">
                                                    ⚠️ 買主から送金報告の督促がありました。直ちに支払願います。支払がない場合、買主が第三債務者に問い合わせる場合があります。
                                                </div>
                                            )}
                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                <p><strong>買主（送金先）口座:</strong></p>
                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。買主にお問い合わせください。'}</p>
                                            </div>
                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleSellerRepaymentReport}>
                                                買主へ送金し、報告する
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_repaid' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                            <p>引渡し（送金）を報告しました。買主の最終確認をお待ち下さい。</p>
                                            {deal.seller_urged_at && (
                                                <div className="bg-red-50 border border-red-200 p-3 rounded mt-3 text-red-700 font-bold text-xs shadow-inner">
                                                    ⚠️ 買主が着金を確認できていません。状況をご確認ください。
                                                    <div className="mt-2 text-center border-t border-red-200 pt-2">
                                                        <Button variant="outline" className="w-full bg-white text-slate-600 border-slate-300 text-xs py-1 h-8" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                                            仲裁チャットを開く
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!isBuyer && (deal.paymentStatus === 'seller_received' || deal.paymentStatus === 'seller_repaid' || deal.paymentStatus === 'fully_settled') && (
                                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg shadow-sm text-center font-bold text-rose-800 flex flex-col gap-3 mt-4">
                                            <p>🎉 無事に資金調達が完了しました！</p>
                                            <p className="text-xs font-normal text-slate-700 leading-relaxed">もしよろしければ、今後のサービス継続と向上のため、<br/>運営へのサポート（投げ銭）をお願いいたします。</p>
                                            <Button onClick={() => { setDonationContextType('seller_success'); setIsDonationModalOpen(true); }} className="bg-rose-600 text-white hover:bg-rose-700 w-full sm:w-auto mx-auto px-8 rounded-full shadow-md">
                                                運営をサポートする
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {isBuyer && deal.paymentStatus === 'fully_settled' && (
                                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg shadow-sm text-center font-bold text-rose-800 flex flex-col gap-3 mt-4">
                                            <p>🎉 無事に利益確定が完了しました！全取引が完了しました。</p>
                                            <p className="text-xs font-normal text-slate-700 leading-relaxed">もしよろしければ、今後のサービス継続と向上のため、<br/>運営へのサポート（投げ銭）をお願いいたします。</p>
                                            <Button onClick={() => { setDonationContextType('buyer_success'); setIsDonationModalOpen(true); }} className="bg-rose-600 text-white hover:bg-rose-700 w-full sm:w-auto mx-auto px-8 rounded-full shadow-md">
                                                運営をサポートする
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center w-full">
                                <Button onClick={() => { setDonationContextType('common'); setIsDonationModalOpen(true); }} className="bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 outline-none shadow-sm gap-2 rounded-full py-1.5 px-6 text-sm" variant="outline">
                                    💰 運営サポート（投げ銭）を贈る
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-200">
                            {deal.status === 'open' || deal.status === 'pending' ? 'オファー承諾待ち' : '取引終了'}
                        </span>
                    )}
                </div>
            )}
            
            <DonationModal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} dealId={deal.id} contextType={donationContextType} />
        </div>
    );
};
