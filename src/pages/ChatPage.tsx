import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Send, User, ChevronLeft, DollarSign, ChevronDown, ChevronUp, Paperclip, FileText as FileTextIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { setTransitioning } from '../utils/transitionState';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { getDisplayName } from '../utils/displayName';
import { translateCompanySize } from '../utils/translations';
import type { Deal, Invoice, User as UserType } from '../types';
import { Download, Handshake } from 'lucide-react';
import { DealStepper } from '../components/DealStepper';

interface ChatMessage {
    id: string;
    sender: 'me' | 'other';
    text: string;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    isSystemMessage?: boolean;
}

export const ChatPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dealId = searchParams.get('dealId');
    const { deals, invoices, messages: allMessages, users, addMessage, updateDeal, markMessagesAsRead, getUserTrackRecord } = useData();
    const { completeDeal } = useMarket();
    const { user } = useAuth(); // Use real auth user

    const [baseDeal, setBaseDeal] = useState<Deal | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [proposedPrice, setProposedPrice] = useState('');
    const [counterpartName, setCounterpartName] = useState('');
    const [hasViewedTerms, setHasViewedTerms] = useState(false);
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isPriceUnlocked, setIsPriceUnlocked] = useState(false);
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const hasSentMatchMessageRef = React.useRef(false);

    // --- CRITICAL FIX: Local Override State ---
    // This state forcibly overrides the deal state from DataContext to prevent WebSocket
    // lag from resetting the UI back to "Terms Approval" phase after clicking Agree.
    const [localDealOverride, setLocalDealOverride] = useState<Partial<Deal> | null>(null);

    // For mobile responsive accordion
    const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
        receivable: false,
        opponent: false,
        mine: false,
    });

    // Compute effective deal state combining global context and local overrides
    const deal = baseDeal ? { ...baseDeal, ...localDealOverride } as Deal : null;

    const isBuyer = user && deal ? user.id === deal.buyerId : false;
    const isPriceMatched = deal ? (deal.currentBuyerPrice || 0) > 0 && deal.currentBuyerPrice === deal.currentSellerPrice : false;
    const effectivelyMatched = isPriceMatched && !isPriceUnlocked;

    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = invoice?.dueDate ? invoice.dueDate < todayStr : false;
    const isDealExpired = isOverdue && !['concluded', 'agreed'].includes(deal?.status || '') && invoice?.status !== 'sold';

    const activeDealsForInvoice = deals.filter(d => d.invoiceId === invoice?.id && !['rejected', 'withdrawn', 'cancelled'].includes(d.status));
    const hasMultipleBuyers = activeDealsForInvoice.length > 1;

    const myProfile = isBuyer ? users.find(u => u.id === deal?.buyerId) : users.find(u => u.id === deal?.sellerId);
    const opponentProfile = isBuyer ? users.find(u => u.id === deal?.sellerId) : users.find(u => u.id === deal?.buyerId);

    const myRevealedFields = isBuyer ? (deal?.buyerRevealedFields || {}) : (deal?.sellerRevealedFields || {});
    const opponentRevealedFields = isBuyer ? (deal?.sellerRevealedFields || {}) : (deal?.buyerRevealedFields || {});

    // Temporarily added for user verification of profile data coming from DataContext
    useEffect(() => {
        if (myProfile || opponentProfile) {
            console.log("=== Debug: Full Profile Data ===", {
                myProfile,
                opponentProfile
            });
        }
    }, [myProfile, opponentProfile]);

    useEffect(() => {
        if (dealId && user) {
            const foundDeal = deals.find(d => d.id === dealId);
            if (foundDeal) {
                // If we have a local override that says we are agreed, but the incoming foundDeal
                // says we are NOT agreed yet, DO NOT accept the incoming state. It's stale.
                setLocalDealOverride(prev => {
                    if (!prev) return null; // No override active
                    
                    const isIncomingStale = 
                        (prev.buyerAgreedAt && !foundDeal.buyerAgreedAt) ||
                        (prev.sellerAgreedAt && !foundDeal.sellerAgreedAt) ||
                        (prev.status === 'concluded' && foundDeal.status !== 'concluded') ||
                        (prev.status === 'agreed' && foundDeal.status !== 'agreed');

                    if (isIncomingStale) {
                        console.log("ChatPage: Rejected stale deal update to prevent UI rollback.");
                        return prev; // Keep the strict local override
                    } else {
                        return null; // The incoming deal caught up to our override! Clear it.
                    }
                });

                setBaseDeal(foundDeal);
                const foundInvoice = invoices.find(i => i.id === foundDeal.invoiceId);
                setInvoice(foundInvoice || null);

                // Determine if I am buyer or seller based on Deal data
                // Note: deal.buyerId and deal.sellerId should be compared with user.id
                const isBuyer = user.id === foundDeal.buyerId;

                // Load messages for this deal
                const dealMessages = allMessages.filter(m => m.dealId === dealId);
                const chatMessages: ChatMessage[] = dealMessages.map(m => {
                    // Support both camelCase and snake_case for Supabase compatibility
                    const messageSenderId = m.senderId || (m as any).sender_id;
                    // Safe comparison ensuring both are strings
                    const isMe = String(messageSenderId) === String(user.id);
                    return {
                        id: m.id,
                        sender: isMe ? 'me' : 'other',
                        text: m.content,
                        timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        fileUrl: m.fileUrl || (m as any).file_url,
                        fileName: m.fileName || (m as any).file_name,
                        fileType: m.fileType || (m as any).file_type,
                        isSystemMessage: m.isSystemMessage || (m as any).is_system_message
                    };
                });

                setMessages(chatMessages);

                // Mark deal as read ONLY if there are actually unread messages for me
                const hasUnread = dealMessages.some(m => {
                    const receiverIdStr = String(m.receiverId || (m as any).receiver_id);
                    return receiverIdStr === String(user?.id) && m.isRead === false;
                });

                if (user && hasUnread) {
                    markMessagesAsRead(dealId, user.id);
                }

                // Set counterpart name
                if (isBuyer) {
                    const seller = users.find(u => u.id === foundDeal.sellerId);
                    setCounterpartName(getDisplayName(seller));
                } else {
                    const buyer = users.find(u => u.id === foundDeal.buyerId);
                    setCounterpartName(getDisplayName(buyer));
                }

                // Initialize input value based on current deal negotiation status,
                // ONLY if the proposedPrice state is currently completely empty to avoid overwriting typed input
                setProposedPrice(prev => {
                    if (prev !== '') return prev;
                    if (isBuyer && foundDeal.currentBuyerPrice) {
                        return String(foundDeal.currentBuyerPrice);
                    } else if (!isBuyer && foundDeal.currentSellerPrice) {
                        return String(foundDeal.currentSellerPrice);
                    }
                    return '';
                });
            }
        }
    }, [dealId, deals, invoices, allMessages, users, user]);

    // 1. 金額合致時の自動メッセージ
    useEffect(() => {
        if (!deal || !user || !isPriceMatched || deal.status === 'concluded') return;

        const matchedPriceMsg = `【システム通知】\n金額が ¥${deal.currentBuyerPrice?.toLocaleString()} で合致しました。`;
        const hasMatchedMsg = messages.some(m => m.text === matchedPriceMsg && m.isSystemMessage);

        if (!hasMatchedMsg && !hasSentMatchMessageRef.current) {
            hasSentMatchMessageRef.current = true;
            const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
            addMessage({
                id: `sys_match_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: receiverId,
                content: matchedPriceMsg,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            }).catch(err => {
                hasSentMatchMessageRef.current = false;
                console.error("Error sending match message:", err);
            });
        }
    }, [isPriceMatched, deal, messages, user, isBuyer, addMessage]);

    const handleTermsClick = async () => {
        if (!hasViewedTerms && deal && user) {
            setHasViewedTerms(true);
            const roleName = isBuyer ? '買い手' : '売り手';
            const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
            await addMessage({
                id: `sys_terms_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: receiverId,
                content: `【システム通知】\n${roleName}が、約款および債権譲渡契約条項を確認しました。`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !deal || !user) return;
        if (deal.status === 'rejected' || deal.paymentStatus === 'fully_settled') return;

        const myId = user.id;
        // Identify receiver: if I am buyer, receiver is seller, else buyer
        const receiverId = user.id === deal.buyerId ? deal.sellerId : deal.buyerId;

        const newMessageContent = inputText;
        const now = new Date();

        await addMessage({
            id: `msg_${Date.now()}`,
            dealId: deal.id,
            senderId: myId,
            receiverId: receiverId,
            content: newMessageContent,
            timestamp: now.toISOString()
        });

        await updateDeal(deal.id, { lastMessageAt: now.toISOString() });
        setInputText('');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !deal || !user) return;
        event.target.value = ''; // Reset input

        // Validation
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('5MB以下のファイルを選択してください。');
            return;
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('PDF、JPG、PNGのみアップロード可能です。');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${deal.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('chat_attachments')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('chat_attachments')
                .getPublicUrl(fileName);

            const fileUrl = publicUrlData.publicUrl;

            // Send message with file info
            const myId = user.id;
            const receiverId = user.id === deal.buyerId ? deal.sellerId : deal.buyerId;
            const now = new Date();

            await addMessage({
                id: `msg_${Date.now()}`,
                dealId: deal.id,
                senderId: myId,
                receiverId: receiverId,
                content: inputText.trim() || 'ファイルを送信しました',
                timestamp: now.toISOString(),
                fileUrl,
                fileName: file.name,
                fileType: file.type
            });

            await updateDeal(deal.id, { lastMessageAt: now.toISOString() });
            setInputText('');

        } catch (error) {
            console.error('File upload error:', error);
            alert('ファイルのアップロードに失敗しました。');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProposePrice = async () => {
        if (!deal || !user || !proposedPrice || !invoice) return;
        const numPrice = Number(proposedPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            alert("有効な金額を入力してください");
            return;
        }

        const maxAllowed = deal.currentSellerPrice || invoice.requestedAmount || invoice.amount;
        if (isBuyer && maxAllowed && numPrice > maxAllowed) {
            alert(`売主の提示額または希望額（¥${maxAllowed.toLocaleString()}）を超える金額は提示できません`);
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

        // Let's add an admin-like system message to chat as well
        const now = new Date();
        const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
        const proposerRole = isBuyer ? '買主' : '売主';
        await addMessage({
            id: `sys_${Date.now()}`,
            dealId: deal.id,
            senderId: user.id, // technically it's me sending the system prop
            receiverId: receiverId,
            content: `【システム通知】\n${proposerRole}の新しい提示金額: ¥${numPrice.toLocaleString()}`,
            timestamp: now.toISOString(),
            isSystemMessage: true
        });
    };

    const handleRevealField = async (fieldKey: string, fieldLabel: string) => {
        if (!deal || !user) return;
        if (!window.confirm(`「${fieldLabel}」の情報を開示しますか？`)) return;

        const updates: Partial<Deal> = {};
        if (isBuyer) {
            updates.buyerRevealedFields = { ...(deal.buyerRevealedFields || {}), [fieldKey]: true };
        } else {
            updates.sellerRevealedFields = { ...(deal.sellerRevealedFields || {}), [fieldKey]: true };
        }

        await updateDeal(deal.id, updates);

        const now = new Date();
        const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
        const myName = isBuyer ? '買い手' : '売り手';

        await addMessage({
            id: `sys_reveal_${Date.now()}`,
            dealId: deal.id,
            senderId: user.id,
            receiverId: receiverId,
            content: `【システム通知】\n${myName}がプロフィール項目「${fieldLabel}」を開示しました。`,
            timestamp: now.toISOString(),
            isSystemMessage: true
        });
    };

    const handleAgree = async () => {
        if (!deal || !invoice || !user) return;

        // --- 1. DBからの最新状態の直接取得 ---
        // WebSocket同期漏れ（切断）を防ぐため、合意ボタン押下時に確実に最新のDB状態を取得
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

        const isBuyer = user.id === deal.buyerId;
        
        // --- 2. 遷移条件の確実な評価 ---
        // ローカルステートではなく、確実なDBのデータをもとに相手が合意済みかを判定
        const willBeConcluded = (isBuyer && latestDeal.seller_agreed_at) || (!isBuyer && latestDeal.buyer_agreed_at);

        const confirmMsg = willBeConcluded
            ? '相手も合意済みのため、この操作で契約が成立します。よろしいですか？'
            : '契約内容に合意しますか？相手の合意をもって契約成立となります。';

        if (window.confirm(confirmMsg)) {
            const roleName = isBuyer ? '買い手' : '売り手';
            const now = new Date().toISOString();
            
            // --- ULTIMATE ESCAPE: 1. Block Realtime ---
            setTransitioning(true);

            // --- ULTIMATE ESCAPE: 2. Pure DOM Overlay (unaffected by React lifecycles) ---
            const overlay = document.createElement('div');
            overlay.id = 'ultimate-escape-overlay';
            overlay.innerHTML = `
                <div style="position: fixed; inset: 0; z-index: 99999; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 4px solid #3b82f6; border-top-color: transparent; animation: ultimate-spin 1s linear infinite; margin-bottom: 16px;"></div>
                    <h2 style="font-size: 1.25rem; font-weight: bold; color: #1e293b; font-family: sans-serif;">契約処理中...</h2>
                    <p style="font-size: 0.875rem; color: #64748b; margin-top: 8px; font-family: sans-serif;">このまま画面を閉じずにお待ちください。</p>
                    <style>@keyframes ultimate-spin { 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
            document.body.appendChild(overlay);

            // --- STRICT LOCAL STATE OVERRIDE ---
            setLocalDealOverride({
                buyerAgreedAt: isBuyer ? now : latestDeal.buyer_agreed_at,
                sellerAgreedAt: !isBuyer ? now : latestDeal.seller_agreed_at,
                status: willBeConcluded ? 'concluded' : 'agreed' // or contracting based on your flow
            });

            try {
                await addMessage({
                    id: `sys_agree_${Date.now()}`,
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: isBuyer ? deal.sellerId : deal.buyerId,
                    content: `【システム通知】\n${roleName}が契約締結の意思表示を行いました。`,
                    timestamp: now,
                    isSystemMessage: true
                });
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dbUpdates: any = {};
                if (isBuyer) {
                    dbUpdates.buyer_agreed_at = now;
                } else {
                    dbUpdates.seller_agreed_at = now;
                }
                if (willBeConcluded) {
                    const finalAmount = latestDeal.current_buyer_price || latestDeal.current_seller_price || latestDeal.current_amount || deal.currentBuyerPrice || deal.currentSellerPrice || deal.currentAmount || 0;
                    dbUpdates.status = 'concluded';
                    dbUpdates.contract_date = now;
                    dbUpdates.current_amount = finalAmount;
                }
                
                // デバッグ用ログ: DB更新直前のペイロード
                console.log('Update Payload Deals:', dbUpdates);

                // Bypass DataContext and execute direct DB update to have absolute control of timing
                const { error: updateError } = await supabase.from('deals').update(dbUpdates).eq('id', deal.id);
                if (updateError) throw updateError;
                
                if (willBeConcluded) {
                    // Determine the correct receiver ID correctly based on deal
                    const systemMsg = {
                        deal_id: deal.id,
                        sender_id: user.id,
                        receiver_id: isBuyer ? deal.sellerId : deal.buyerId,
                        content: "【システム】双方が合意し、契約が成立しました🎉",
                        is_system_message: true,
                        timestamp: new Date().toISOString()
                    };
                    const { error: msgInsertError } = await supabase.from('messages').insert([systemMsg]);
                    if (msgInsertError) throw msgInsertError;
                    
                    const { error: invoiceUpdateError } = await supabase.from('invoices').update({ status: 'sold' }).eq('id', deal.invoiceId);
                    if (invoiceUpdateError) throw invoiceUpdateError;
                    
                    completeDeal(invoice.amount, deal.currentAmount);
                }
                
                // 1. 強制遷移前のDBコミット待機（スリープ）
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // --- ULTIMATE ESCAPE: 3. Browser-level hard navigation ---
                // Navigating to the same url physically triggers a complete lifecycle destruction and pure page load, 
                // jumping directly to the correct concluded phase inside ChatPage on mount.
                window.location.href = window.location.pathname + window.location.search;

            } catch (error: any) {
                console.error('Supabase Error Details:', error);
                alert('合意処理に失敗しました: ' + (error.message || '不明なエラー'));
                
                // 失敗時はオーバーレイを削除し、遷移状態を解除
                const overlayElement = document.getElementById('ultimate-escape-overlay');
                if (overlayElement) overlayElement.remove();
                setTransitioning(false);
                setLocalDealOverride(null); // ローカルのオーバーライドも解除
            }
        }
    };

    const handleBuyerPaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("本当に振込を完了しましたか？売主に報告が行われます。")) {
            await updateDeal(deal.id, { paymentStatus: 'buyer_paid' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買い手が譲渡代金の振込完了を報告しました。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleSellerPaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、取引を継続しますか？この操作で買い手に実績が付与され、第三債務者からの回収フェーズに移行します。")) {
            await updateDeal(deal.id, { paymentStatus: 'seller_received' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売り手が譲渡代金の着金を確認しました。期日後の「回収・送金報告」をお待ちください。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleSellerRepaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("第三債務者からの回収および買い手への送金を完了しましたか？買い手に報告が行われます。")) {
            await updateDeal(deal.id, { paymentStatus: 'seller_repaid' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売り手が回収および買い手への送金完了を報告しました。着金をご確認ください。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleBuyerRepaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、全取引を完了しますか？この操作は取り消せず、売り手に実績が付与されます。")) {
            await updateDeal(deal.id, { paymentStatus: 'fully_settled' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買い手が着金を確認しました。これにて本取引は全て完了となります。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handlePrintContract = async () => {
        if (!deal || !invoice) return;
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
            alert(`PDF生成に失敗しました。\n詳細: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadChatHistory = () => {
        if (!deal || !invoice || !counterpartName || !user || messages.length === 0) return;

        let txtContent = `取引チャット履歴\n`;
        txtContent += `===================================\n`;
        
        const myProfile = users.find(u => u.id === user.id);
        const myName = myProfile ? (myProfile.companyName || myProfile.contactPerson || '名称未設定') : '名称未設定';
        
        txtContent += `ダウンロード実行者: ${myName}\n`;
        txtContent += `案件ID: ${invoice.id}\n`;
        txtContent += `取引相手: ${counterpartName}\n`;
        txtContent += `ダウンロード日時: ${new Date().toLocaleString()}\n`;
        txtContent += `===================================\n\n`;

        messages.forEach(msg => {
            const senderName = msg.isSystemMessage ? 'システム通知' : (msg.sender === 'me' ? 'あなた' : counterpartName);
            const time = msg.timestamp;
            
            txtContent += `[${time}] ${senderName}:\n`;
            if (msg.text) {
                txtContent += `${msg.text}\n`;
            }
            if (msg.fileName) {
                txtContent += `[添付ファイル: ${msg.fileName}]\n`;
            }
            txtContent += `\n`;
        });

        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `チャット履歴_案件${invoice.id}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleWithdraw = async () => {
        if (!deal || !invoice || !user) return;
        if (!window.confirm("本当にこの案件（交渉）を取り下げますか？\n※取り下げると以降のメッセージ送信や取引はできなくなります。")) return;

        try {
            const now = new Date().toISOString();
            
            // 1. Invoicesテーブルのステータス更新
            const { error: invoiceError } = await supabase
                .from('invoices')
                .update({ status: 'withdrawn' })
                .eq('id', invoice.id);
            if (invoiceError) throw invoiceError;

            // 2. システムメッセージの送信
            await addMessage({
                id: `sys_withdraw_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: isBuyer ? deal.sellerId : deal.buyerId,
                content: `【システム通知】\n売り手から案件の取り下げ（キャンセル）が行われました。\nこれ以降の取引およびメッセージの送信はできません。`,
                timestamp: now,
                isSystemMessage: true
            });

            alert("案件を取り下げました。");
            // リロードや遷移ですぐに反映させるか、リアルタイムサブスクリプションに任せる
            // window.location.reload(); 
        } catch (error: any) {
            console.error("Withdraw Error:", error);
            alert("取り下げ処理に失敗しました：" + (error.message || "不明なエラー"));
        }
    };

    const togglePanel = (key: string) => {
        setExpandedPanels(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderAccordionPanel = (key: string, title: string, content: React.ReactNode) => {
        const isExpanded = expandedPanels[key];
        return (
            <div className="bg-white rounded-md border border-slate-200 shadow-sm flex flex-col">
                <div
                    className={`flex justify-between items-center p-3 cursor-pointer sticky top-0 bg-white z-10 transition-colors hover:bg-slate-50`}
                    onClick={() => togglePanel(key)}
                >
                    <div className="text-sm font-bold text-slate-700">{title}</div>
                    <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
                <div className={`${isExpanded ? 'block' : 'hidden'} px-3 pb-3 border-t border-slate-100 max-h-[300px] overflow-y-auto`}>
                    <div className="flex flex-col pt-2">
                        {content}
                    </div>
                </div>
            </div>
        );
    };

    const PROFILE_FIELDS = [
        { key: 'companyName', label: '会社名' },
        { key: 'representativeName', label: '代表者名' },
        { key: 'contactPerson', label: '担当者名' },
        { key: 'address', label: '所在地' },
        { key: 'phone', label: '電話番号' },
        { key: 'email', label: 'メールアドレス' },
        { key: 'bankAccountInfo', label: '口座情報' },
        { key: 'appealPoint', label: '企業としてのアピールポイント' },
    ];

    const renderProfileField = (
        profile: UserType | undefined,
        field: { key: string, label: string },
        isMine: boolean,
        revealedFields: Record<string, boolean>
    ) => {
        if (!profile) return null;

        // 1. Get the actual value using the camelCase key (e.g., 'companyName', 'address')
        const rawValue = profile[field.key as keyof typeof profile];
        const isEmpty = rawValue === undefined || rawValue === null || rawValue === '';
        const valueStr = isEmpty ? '未設定' : String(rawValue);

        // 2. Evaluate Privacy Settings
        const privacySettingValue = profile.privacySettings?.[field.key as keyof typeof profile.privacySettings];
        const isPublic = privacySettingValue === true || privacySettingValue === undefined || privacySettingValue === null;
        const isRevealed = revealedFields[field.key] === true;

        let displayValue = '';
        let isMasked = false;
        let actionElement: React.ReactNode = null;

        // 3. Logic based on user instructions
        // If it's completely empty, it always shows as '未設定' (fallback before privacy evaluation for display)
        if (isEmpty) {
            displayValue = '未設定';
            isMasked = true; // treat as muted gray text visually
        } else {
            if (!isMine) {
                // Opponent's Profile (Value Exists)
                if (isPublic) {
                    displayValue = valueStr;
                } else if (!isPublic && isRevealed) {
                    displayValue = valueStr;
                } else {
                    displayValue = '非公開（***）';
                    isMasked = true;
                }
            } else {
                // My Profile (Value Exists)
                if (isPublic) {
                    displayValue = valueStr;
                } else if (!isPublic && isRevealed) {
                    displayValue = valueStr;
                    actionElement = <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-200">開示済み ✓</span>;
                } else {
                    displayValue = valueStr;
                    if (['open', 'pending', 'negotiating'].includes(deal?.status || '')) {
                        actionElement = (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                onClick={() => handleRevealField(field.key, field.label)}
                                disabled={invoice?.status === 'withdrawn' || isDealExpired}
                            >
                                開示する
                            </Button>
                        );
                    }
                }
            }
        }

        return (
            <div key={field.key} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-500 shrink-0 mr-2">{field.label}</span>
                <div className="flex-1 flex justify-end items-center gap-2 text-right">
                    <span className={`truncate ${isMasked || isEmpty ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                        {displayValue}
                    </span>
                    {actionElement}
                </div>
            </div>
        );
    };

    const renderMessages = () => (
        <div className="flex flex-col space-y-4 p-4">
            {messages.map((msg) => {
                if (msg.isSystemMessage) {
                    return (
                        <div key={msg.id} className="flex justify-center my-4" translate="no">
                            <div className="bg-slate-100 text-slate-600 text-[13px] px-5 py-3 rounded-lg text-left max-w-[90%] md:max-w-[75%] border border-slate-200 shadow-sm whitespace-pre-wrap font-medium flex items-start gap-3 leading-relaxed tracking-wide">
                                {/* SYSTEM MSG */}
                                <span className="text-slate-400 mt-0.5 shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                <div className="flex-1 pt-0.5">{msg.text.replace(/【システム(通知)?】\n?/g, '').trim()}</div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        translate="no"
                    >
                        <div className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                            <div
                                className={`rounded-2xl px-4 py-2 shadow-sm whitespace-pre-wrap text-sm md:text-base break-words ${msg.sender === 'me'
                                    ? 'bg-green-500 text-white rounded-tr-none'
                                    : 'bg-slate-200 text-slate-800 rounded-tl-none'
                                    }`}
                            >
                                {msg.fileUrl && (
                                    <div className="mb-2">
                                        {msg.fileType?.startsWith('image/') ? (
                                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block outline-none">
                                                <img src={msg.fileUrl} alt={msg.fileName || '添付画像'} className="max-w-full max-h-48 rounded-md object-cover hover:opacity-90 transition-opacity border border-white/20 shadow-sm" />
                                            </a>
                                        ) : (
                                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-md bg-white/20 hover:bg-white/30 transition-colors border border-white/30 text-current no-underline group block max-w-sm">
                                                <FileTextIcon className="w-5 h-5 opacity-80 shrink-0" />
                                                <span className="truncate text-xs font-medium">{msg.fileName || '添付ファイル'}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {msg.timestamp}
                            </span>
                        </div>
                    </div>
                );
            })}
            
            {invoice?.status === 'withdrawn' && (
                <div key="sys_withdrawn" className="flex justify-center my-5" translate="no">
                    <div className="bg-slate-100 text-slate-500 text-xs sm:text-sm px-5 py-2.5 rounded-md text-center max-w-[90%] md:max-w-[75%] border border-slate-300 shadow-sm font-bold flex items-center justify-center gap-2">
                        <span className="text-slate-400">⚠️</span> この案件は取り下げられました（メッセージの送信はできません）
                    </div>
                </div>
            )}
            {isDealExpired && invoice?.status !== 'withdrawn' && (
                <div key="sys_expired" className="flex justify-center my-5" translate="no">
                    <div className="bg-slate-100 text-slate-500 text-xs sm:text-sm px-5 py-2.5 rounded-md text-center max-w-[90%] md:max-w-[75%] border border-slate-300 shadow-sm font-bold flex items-center justify-center gap-2">
                        <span className="text-slate-400">⚠️</span> 入金期日が徒過したため、この取引の交渉は終了しました
                    </div>
                </div>
            )}
        </div>
    );

    if (!deal || !invoice) {
        return (
            <div className="p-8 text-center">
                <p>案件が見つかりません。ダッシュボードに戻ってください。</p>
                <Button onClick={() => navigate('/')} className="mt-4">ダッシュボードへ戻る</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto min-h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] flex flex-col relative">
            <div className="mb-1 md:mb-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-500 p-0 md:px-4 md:py-2">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    戻る
                </Button>
            </div>

            <Card className="flex-1 flex flex-col shadow-md md:overflow-hidden relative">
                <CardHeader className="border-b bg-slate-900 z-10 py-2.5 px-4 md:px-6 shadow-sm shrink-0">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-slate-800 p-2 rounded-md border border-slate-700 shrink-0 shadow-inner">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">取引相手・出品企業</div>
                                <div className="text-base text-white font-bold flex items-center gap-2 truncate">
                                    <span className="truncate">{counterpartName}</span>
                                    {opponentProfile && (
                                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600 shrink-0">
                                            {getUserTrackRecord(opponentProfile.id, opponentProfile.role === 'buyer' ? 'buyer' : 'seller') === 0 ? '🔰 初回' : `🏆 成約 ${getUserTrackRecord(opponentProfile.id, opponentProfile.role === 'buyer' ? 'buyer' : 'seller')}件`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex justify-center w-full xl:w-auto px-4 border-y xl:border-y-0 xl:border-x border-slate-800 py-2 xl:py-0">
                            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">対象債権額</span>
                                <span className="text-slate-100 font-mono font-bold tracking-wide">¥{invoice.amount.toLocaleString()}</span>
                                {invoice.sellingAmount && invoice.sellingAmount < invoice.amount && (
                                    <span className="text-emerald-400 text-xs font-bold font-mono">(売枠: ¥{invoice.sellingAmount.toLocaleString()})</span>
                                )}
                                <span className="text-slate-700 mx-2 hidden xl:inline">|</span>
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">期日</span>
                                <span className="text-slate-300 font-mono">{invoice.dueDate || '未設定'}</span>
                                <span className="text-slate-700 mx-2 hidden xl:inline">|</span>
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">ID</span>
                                <span className="text-slate-400 font-mono bg-slate-800 px-1.5 rounded">{invoice.id}</span>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between xl:justify-end gap-3 shrink-0 w-full xl:w-auto mt-1 xl:mt-0">
                            <div className="bg-slate-800 border-l-[3px] border-l-indigo-500 text-indigo-100 px-3 py-1 rounded-sm text-xs shadow-inner flex flex-col items-start xl:items-end w-28 shrink-0">
                                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-0">希望買取額</span>
                                <span className="font-mono font-bold tracking-wide">¥{invoice.requestedAmount?.toLocaleString() || '未設定'}</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!isBuyer && ['open', 'pending', 'negotiating'].includes(deal.status) && invoice.status !== 'withdrawn' && !isDealExpired && (
                                    <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors bg-transparent" onClick={handleWithdraw}>
                                        取り下げる
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors bg-transparent" onClick={handleDownloadChatHistory}>
                                    <Download className="w-3.5 h-3.5 mr-1.5" /> 履歴取得
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden bg-slate-100 p-2 gap-2">
                    {/* Negotiation Panel (Left Panel) */}
                    <Card className="md:w-[320px] lg:w-[380px] flex flex-col shadow-sm border-slate-200 shrink-0 md:h-full md:overflow-y-auto bg-slate-50">
                        <CardHeader className="border-b bg-white py-2.5 px-4 sticky top-0 z-10 shadow-sm">
                            <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-700 tracking-wide uppercase">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    取引ボード
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    isDealExpired || invoice.status === 'withdrawn' ? 'bg-slate-100 text-slate-500 border-slate-300' :
                                    (deal.status === 'open' || deal.status === 'pending' || deal.status === 'negotiating') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                    {invoice.status === 'withdrawn' ? '中止' : isDealExpired ? '期限切れ' : (deal.status === 'agreed' || deal.status === 'concluded') ? '成約済' : 'ACTIVE'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-4">
                            <div className={`flex flex-col gap-3 ${(isDealExpired || invoice.status === 'withdrawn') ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                {/* Trading Board Price Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                            Offer ({isBuyer ? 'Seller' : 'Buyer'})
                                        </div>
                                        <div className="text-lg font-bold text-slate-700">
                                            {isBuyer ?
                                                (deal.currentSellerPrice ? `¥${deal.currentSellerPrice.toLocaleString()}` : '未提示') :
                                                (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示')}
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-lg border shadow-sm flex flex-col justify-between ${effectivelyMatched ? 'bg-emerald-50 border-emerald-300' : 'bg-blue-50 border-blue-200'}`}>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${effectivelyMatched ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            Your Bid ({isBuyer ? 'Buyer' : 'Seller'})
                                        </div>
                                        <div className={`text-2xl font-black tracking-tight ${effectivelyMatched ? 'text-emerald-800' : 'text-blue-900'} leading-none`}>
                                            {isBuyer ?
                                                (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示') :
                                                (deal.currentSellerPrice ? `¥${deal.currentSellerPrice.toLocaleString()}` : '未提示')}
                                        </div>
                                    </div>
                                </div>

                                {/* Form */}
                                {['open', 'pending', 'negotiating'].includes(deal.status) && (invoice.status as string) !== 'withdrawn' && !isDealExpired && !effectivelyMatched && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                                        <div className="text-[11px] font-bold text-slate-600 tracking-wide">入札・金額提示</div>
                                        <form onSubmit={(e) => { e.preventDefault(); handleProposePrice(); }} className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={proposedPrice}
                                                onChange={(e) => setProposedPrice(e.target.value)}
                                                placeholder="金額を入力"
                                                className="flex-1 h-9 font-mono text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-300"
                                                min="1"
                                                disabled={isDealExpired || (invoice.status as string) === 'withdrawn'}
                                            />
                                            <Button type="submit" size="sm" className="h-9 bg-slate-800 hover:bg-slate-700 text-white shadow font-bold tracking-wide shrink-0 transition-colors px-4" disabled={!proposedPrice || isDealExpired || (invoice.status as string) === 'withdrawn'}>
                                                提示する
                                            </Button>
                                        </form>
                                    </div>
                                )}
                            </div>

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

                                            {!isBuyer && hasMultipleBuyers && !deal.sellerAgreedAt && (
                                                <div className="mb-4 text-center">
                                                    <p className="text-xs text-slate-500 mb-2">最高額オファーの買主が複数います。金額を再提示できます。</p>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={async () => {
                                                            setIsPriceUnlocked(true);
                                                            if (deal && user) {
                                                                await addMessage({
                                                                    id: `sys_unlock_${Date.now()}`,
                                                                    dealId: deal.id,
                                                                    senderId: user.id,
                                                                    receiverId: deal.buyerId,
                                                                    content: "【システム通知】買い手が同額で競合しました。売り手が提示額を再検討します。",
                                                                    timestamp: new Date().toISOString(),
                                                                    isSystemMessage: true
                                                                });
                                                            }
                                                        }}
                                                        className="text-slate-600 border-slate-300 hover:bg-slate-50"
                                                    >
                                                        相手の買主に対して、金額を再提示する。
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Check if you've already agreed */}
                                            {((isBuyer && deal.buyerAgreedAt) || (!isBuyer && deal.sellerAgreedAt)) ? (
                                                <Button size="sm" variant="secondary" disabled className="bg-slate-200 text-slate-500 w-full cursor-not-allowed">
                                                    相手の最終合意を待っています
                                                </Button>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {!hasViewedTerms ? (
                                                        <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
                                                            <p className="text-sm tracking-tight text-blue-800 mb-2 font-bold">
                                                                「約款および債権譲渡契約条項」を確認願います
                                                            </p>
                                                            <Link
                                                                to="/terms"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={handleTermsClick}
                                                                className="text-blue-600 hover:text-blue-800 underline font-bold"
                                                            >
                                                                約款および債権譲渡契約条項を読む
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 bg-white shadow-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={isTermsAgreed}
                                                                onChange={(e) => setIsTermsAgreed(e.target.checked)}
                                                                className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 shrink-0 cursor-pointer"
                                                            />
                                                            <span className="leading-snug select-none">
                                                                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-block mr-1">
                                                                    約款および債権譲渡契約条項
                                                                </Link>
                                                                を確認しました
                                                            </span>
                                                        </label>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        className={`w-full font-bold shadow-md transition-transform ${isTermsAgreed ? 'bg-green-600 hover:bg-green-700 hover:scale-[1.02] text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleAgree();
                                                        }}
                                                        disabled={!isTermsAgreed}
                                                    >
                                                        <Handshake className="w-5 h-5 mr-2" />
                                                        契約手続に進む（合意する）
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
                                                            const url = `/contract-print?dealId=${deal.id}`;
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

                                            {/* --- PAYMENT & PROCEDURE PANEL --- */}
                                            <div className="w-full mb-2">
                                                <DealStepper status={deal.status} paymentStatus={deal.paymentStatus} />
                                            </div>

                                            {isBuyer ? (
                                                <div className="w-full font-medium text-sm text-left">
                                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                                            <p className="font-bold text-blue-800 mb-2">
                                                                契約が成立しました。速やかに以下の口座へ譲渡代金（合意金額: ¥{(deal.currentAmount || deal.currentBuyerPrice || 0).toLocaleString()}）をお振込みください。
                                                            </p>
                                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                                <p><strong>振込先口座:</strong></p>
                                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。売主にお問い合わせください。'}</p>
                                                            </div>
                                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow" onClick={handleBuyerPaymentReport}>
                                                                振込を完了し、売り手に報告する
                                                            </Button>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'buyer_paid' && (
                                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                                            <p>振込完了を報告しました。売り手の着金確認をお待ちください。</p>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'seller_received' && (
                                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center text-blue-800 font-bold">
                                                            <p>売り手が着金を確認しました。期日の回収と送金をお待ちください。</p>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'seller_repaid' && (
                                                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm">
                                                            <p className="text-orange-800 font-bold mb-3 text-center">📢 売り手から回収・送金完了の報告がありました。</p>
                                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleBuyerRepaymentConfirm}>
                                                                着金を確認し、全取引を完了する
                                                            </Button>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'fully_settled' && (
                                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm text-center font-bold text-emerald-800">
                                                            <p>最終着金確認済み。全取引が完了しました。</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full font-medium text-sm text-left">
                                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center">
                                                            <p className="font-bold text-blue-800">契約が成立しました。買い手からの譲渡代金の入金をお待ちください。</p>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'buyer_paid' && (
                                                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm">
                                                            <p className="text-green-800 font-bold mb-3 text-center">✅ 買い手から譲渡代金の振込完了報告がありました。</p>
                                                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow" onClick={handleSellerPaymentConfirm}>
                                                                着金を確認し、取引を継続する
                                                            </Button>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'seller_received' && (
                                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                                            <p className="text-blue-800 font-bold mb-3 text-center">
                                                                最初の着金を確認済みです。期日に第三債務者から回収後、速やかに買い手へ送金してください。
                                                            </p>
                                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                                <p><strong>買主（送金先）口座:</strong></p>
                                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。買主にお問い合わせください。'}</p>
                                                            </div>
                                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleSellerRepaymentReport}>
                                                                回収完了および買い手への送金報告
                                                            </Button>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'seller_repaid' && (
                                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                                            <p>回収・買主への送金完了を報告しました。買主の最終着金確認をお待ちください。</p>
                                                        </div>
                                                    )}
                                                    
                                                    {deal.paymentStatus === 'fully_settled' && (
                                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm text-center font-bold text-emerald-800">
                                                            <p>買い手の最終着金確認済み。全取引が完了しました。</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-200">
                                            {deal.status === 'open' || deal.status === 'pending' ? 'オファー承諾待ち' : '取引終了'}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* --- Information Panels (Responsive Accordion) --- */}
                            <div className="space-y-4 mt-6">
                                {renderAccordionPanel('receivable', '対象債権情報', (
                                    <>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">請求書額面</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">¥{invoice.amount.toLocaleString()}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">売却対象額</span>
                                            <div className="flex-1 text-right font-medium text-blue-700">{invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : `¥${invoice.amount.toLocaleString()}`}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">入金期日</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.dueDate}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">企業名</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.isClientNamePublic ? (invoice.debtorName || '未設定') : '*** (非公開)'}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">所在地</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.isClientAddressPublic ? (invoice.debtorAddress || '未設定') : '*** (非公開)'}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">業種 / 規模</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.industry} / {invoice.companySize ? translateCompanySize(invoice.companySize) : '未設定'}</div>
                                        </div>
                                    </>
                                ))}
                                {renderAccordionPanel('opponent', '相手のプロフィール', (
                                    <>
                                        {PROFILE_FIELDS.map(f => renderProfileField(opponentProfile, f, false, opponentRevealedFields))}
                                    </>
                                ))}
                                {renderAccordionPanel('mine', 'あなたのプロフィール', (
                                    <>
                                        {PROFILE_FIELDS.map(f => renderProfileField(myProfile, f, true, myRevealedFields))}
                                    </>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chat Panel (Right Panel) */}
                    <Card className="flex-1 flex flex-col shadow-sm border-slate-200 md:h-full md:overflow-hidden relative">
                        {deal.status === 'rejected' && (
                            <div className="absolute top-0 left-0 right-0 z-20 bg-red-50 text-red-700 px-4 py-3 flex text-center justify-center items-center text-sm font-bold border-b border-red-200 shadow-sm">
                                ⚠️ この案件は他のお客様と成約したため、募集・交渉が終了しました。
                            </div>
                        )}
                        {invoice.status === 'withdrawn' && (
                            <div className="absolute top-0 left-0 right-0 z-20 bg-slate-100 text-slate-500 px-4 py-3 flex text-center justify-center items-center text-sm font-bold border-b border-slate-300 shadow-sm">
                                ⚠️ この案件は取り下げられました（メッセージの送信はできません）。
                            </div>
                        )}
                        {isDealExpired && invoice.status !== 'withdrawn' && (
                            <div className="absolute top-0 left-0 right-0 z-20 bg-slate-100 text-slate-500 px-4 py-3 flex text-center justify-center items-center text-sm font-bold border-b border-slate-300 shadow-sm">
                                ⚠️ 入金期日が徒過したため、この取引の交渉は終了しました（メッセージの送信はできません）。
                            </div>
                        )}
                        <CardContent className={`flex-1 md:overflow-y-auto p-0 bg-white min-h-[300px] md:min-h-0 relative ${deal.status === 'rejected' || invoice.status === 'withdrawn' || isDealExpired ? 'mt-12' : ''}`}>
                            <div className={deal.status === 'rejected' || invoice.status === 'withdrawn' || isDealExpired ? 'pt-12' : ''}>
                                {renderMessages()}
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50 border-t p-3 border-slate-200 sticky bottom-0 z-10 flex flex-col items-stretch gap-2">
                            <form
                                className="flex w-full gap-2 relative"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 w-10 shrink-0 border-slate-300 text-slate-500 hover:bg-slate-200 disabled:opacity-50 !p-0"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || invoice.status === 'withdrawn' || isDealExpired || isUploading}
                                    title="ファイルを添付する"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={
                                        invoice.status === 'withdrawn' ? "この案件は取り下げられました" :
                                        isDealExpired ? "入金期日の徒過により交渉終了" :
                                        (deal.status === 'rejected' || deal.paymentStatus === 'fully_settled') ?
                                            "取引が終了しました（メッセージの送信はできません）。" :
                                            "メッセージを入力..."
                                    }
                                    className="flex-1 bg-white h-10"
                                    disabled={deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || invoice.status === 'withdrawn' || isDealExpired || isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <Button type="submit" size="md" disabled={(!inputText.trim() && !isUploading) || deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || invoice.status === 'withdrawn' || isDealExpired || isUploading} className="h-10 px-5 shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center justify-center">
                                    {isUploading ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            送信
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            </Card>
        </div>
    );
};
