import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Send, User, ChevronLeft, DollarSign, ChevronDown, ChevronUp, Paperclip, FileText as FileTextIcon, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { getDisplayName } from '../utils/displayName';
import { translateCompanySize } from '../utils/translations';
import type { Deal, Invoice, User as UserType, Dispute } from '../types';
import { DisputeBoard } from '../components/DisputeBoard';
import { NormalDealBoard } from '../components/NormalDealBoard';

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
    const { user } = useAuth(); // Use real auth user

    const [baseDeal, setBaseDeal] = useState<Deal | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [proposedPrice, setProposedPrice] = useState('');
    const [counterpartName, setCounterpartName] = useState('');
    const [hasViewedTerms, setHasViewedTerms] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isPriceUnlocked, setIsPriceUnlocked] = useState(false);
    
    // Dispute state
    const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
    
    // Dispute Modal state
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    const [selectedDisputeType, setSelectedDisputeType] = useState('buyer_payment_delay');
    const [isReportingDispute, setIsReportingDispute] = useState(false);
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const hasSentMatchMessageRef = React.useRef(false);

    // --- CRITICAL FIX: Permanent Dispute State Latch ---
    // 一度でも事故状態が検出された場合、以降のチャット送信等の再フェッチや古い状態のプッシュで
    // 画面がリセットされないよう、完全に true でラッチ（固定）するステート
    const [isDisputedLocal, setIsDisputedLocal] = useState(false);

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

    const dealIsDisputed = deal?.is_disputed === true || deal?.isDisputed === true || isDisputedLocal === true;

    const isBuyer = user && deal ? user.id === deal.buyerId : false;
    const effectiveSellerPrice = (deal?.currentSellerPrice && deal.currentSellerPrice !== invoice?.requestedAmount && deal.currentSellerPrice !== invoice?.amount) 
        ? deal.currentSellerPrice 
        : (invoice?.sellingAmount || invoice?.amount || 0);
    const isPriceMatched = deal ? (deal.currentBuyerPrice || 0) > 0 && deal.currentBuyerPrice === effectiveSellerPrice : false;
    const effectivelyMatched = isPriceMatched && !isPriceUnlocked;

    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = invoice?.dueDate ? invoice.dueDate < todayStr : false;
    const isDealExpired = isOverdue && !['concluded', 'agreed'].includes(deal?.status || '') && invoice?.status !== 'sold';

    const activeDealsForInvoice = deals.filter(d => d.invoiceId === invoice?.id && !['rejected', 'withdrawn', 'cancelled'].includes(d.status));

    const myProfile = isBuyer ? users.find(u => u.id === deal?.buyerId) : users.find(u => u.id === deal?.sellerId);
    const opponentProfile = isBuyer ? users.find(u => u.id === deal?.sellerId) : users.find(u => u.id === deal?.buyerId);

    const myRevealedFields = isBuyer ? (deal?.buyerRevealedFields || {}) : (deal?.sellerRevealedFields || {});
    const opponentRevealedFields = isBuyer ? (deal?.sellerRevealedFields || {}) : (deal?.buyerRevealedFields || {});

    // Force fetch is_disputed directly to bypass context sync/caching issues
    useEffect(() => {
        if (!dealId) return;
        const checkDisputeStatus = async () => {
            const { data, error } = await supabase.from('deals').select('is_disputed').eq('id', dealId).single();
            if (!error && data?.is_disputed) {
                setIsDisputedLocal(true);
            }
        };
        checkDisputeStatus();
    }, [dealId]);

    // Fetch dispute info
    useEffect(() => {
        if (deal && dealIsDisputed) {
            const fetchDispute = async () => {
                const { data, error } = await supabase
                    .from('disputes')
                    .select('*')
                    .eq('deal_id', deal.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (data && !error) {
                    setActiveDispute(data);
                }
            };
            fetchDispute();
        }
    }, [deal?.id, dealIsDisputed]);

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
                // もし親から渡されたステートが事故状態なら、確実にローカルにラッチする（降格を防ぐ）
                if (foundDeal.is_disputed || foundDeal.isDisputed) {
                    setIsDisputedLocal(true);
                }

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
                    } else if (!isBuyer) {
                        // Use explicit propose value if it's not the old system default
                        if (foundDeal.currentSellerPrice && foundDeal.currentSellerPrice !== foundInvoice?.requestedAmount && foundDeal.currentSellerPrice !== foundInvoice?.amount) {
                            return String(foundDeal.currentSellerPrice);
                        }
                        if (foundInvoice?.sellingAmount) return String(foundInvoice.sellingAmount);
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

    const handleReportDispute = async () => {
        if (!deal || !user || isReportingDispute) return;
        
        setIsReportingDispute(true);
        try {
            // 1. Update deal
            const { error: dealError } = await supabase.from('deals').update({ is_disputed: true }).eq('id', deal.id);
            if (dealError) throw dealError;
            
            // 2. Insert into disputes
            const { error: disputeError } = await supabase.from('disputes').insert([{
                deal_id: deal.id,
                reporter_id: user.id,
                dispute_type: selectedDisputeType,
                status: 'open'
            }]);
            if (disputeError) throw disputeError;
            
            // 3. Add system message
            const myProfileData = isBuyer ? users.find(u => u.id === deal.buyerId) : users.find(u => u.id === deal.sellerId);
            const myName = myProfileData?.companyName || myProfileData?.contactPerson || 'ユーザー';
            
            await addMessage({
                id: `sys_dispute_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: isBuyer ? deal.sellerId : deal.buyerId,
                content: `⚠️ 【システム通知】${myName}より交渉システムへの移行が選択されました。これ以降は、本画面にて当事者間での和解・解決に向けた協議を行ってください。`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
            
            // 4. Update local state and fallback to full reload to guarantee clean layout
            setIsDisputedLocal(true);
            setLocalDealOverride(prev => ({ ...prev, is_disputed: true, isDisputed: true }));
            setIsDisputeModalOpen(false);
            
            // Allow DB a moment to settle, then force a clean window reload
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.reload();
            
        } catch (error) {
            console.error("Error reporting dispute:", error);
            alert("交渉システムへの移行に失敗しました。");
            setIsReportingDispute(false);
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
                <CardHeader className={`border-b z-10 py-2.5 px-4 md:px-6 shadow-sm shrink-0 ${dealIsDisputed ? 'bg-red-900 border-red-700' : 'bg-slate-900'}`}>
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-slate-800 p-2 rounded-md border border-slate-700 shrink-0 shadow-inner">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${dealIsDisputed ? 'text-red-300' : 'text-slate-500'}`}>
                                    {dealIsDisputed ? `🚨 事故案件（仲裁チャット） - ${activeDispute?.dispute_type || '係争中'}` : '取引相手・出品企業'}
                                </div>
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
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">額面</span>
                                <span className="text-slate-100 font-mono font-bold tracking-wide">¥{invoice.amount.toLocaleString()}</span>
                                {((invoice.saleType === 'partial' || invoice.requestedAmount !== invoice.amount) && invoice.requestedAmount) ? (
                                    <>
                                        <span className="text-slate-700 mx-2 hidden xl:inline">|</span>
                                        <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">譲渡対象額</span>
                                        <span className="text-emerald-400 text-xs font-bold font-mono">¥{invoice.requestedAmount.toLocaleString()}</span>
                                    </>
                                ) : null}
                                <span className="text-slate-700 mx-2 hidden xl:inline">|</span>
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">期日</span>
                                <span className="text-slate-300 font-mono">{invoice.dueDate || '未設定'}</span>
                                <span className="text-slate-700 mx-2 hidden xl:inline">|</span>
                                <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">ID</span>
                                <span className="text-slate-400 font-mono bg-slate-800 px-1.5 rounded">{invoice.id}</span>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between xl:justify-end gap-3 shrink-0 w-full xl:w-auto mt-1 xl:mt-0">
                            <div className="bg-slate-800 border-l-[3px] border-l-indigo-500 text-indigo-100 px-3 py-1 rounded-sm text-xs shadow-inner flex flex-col items-start xl:items-end w-max shrink-0 gap-0.5">
                                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-0">
                                    {isBuyer ? '売主の希望売却額' : '買主の提示額'}
                                </span>
                                <span className="font-mono font-bold tracking-wide">
                                    {isBuyer 
                                        ? (invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未設定') 
                                        : (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示')}
                                </span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!dealIsDisputed && deal.status !== 'rejected' && deal.paymentStatus !== 'fully_settled' && (
                                    <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-orange-500/50 text-orange-500 hover:bg-orange-900/40 hover:text-orange-400 transition-colors bg-transparent shadow-sm" onClick={() => setIsDisputeModalOpen(true)}>
                                        ⚠️ 交渉システムに移行する
                                    </Button>
                                )}
                                {!isBuyer && ['open', 'pending', 'negotiating'].includes(deal.status) && invoice.status !== 'withdrawn' && !isDealExpired && !dealIsDisputed && (
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
                        <CardHeader className={`border-b py-2.5 px-4 sticky top-0 z-10 shadow-sm ${dealIsDisputed ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                            <CardTitle className={`text-sm font-bold flex items-center justify-between tracking-wide uppercase ${dealIsDisputed ? 'text-red-800' : 'text-slate-700'}`}>
                                <div className="flex items-center gap-2">
                                    <DollarSign className={`w-4 h-4 ${dealIsDisputed ? 'text-red-600' : 'text-emerald-600'}`} />
                                    {dealIsDisputed ? '和解計算ボード' : '取引ボード'}
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    dealIsDisputed ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' :
                                    isDealExpired || invoice.status === 'withdrawn' ? 'bg-slate-100 text-slate-500 border-slate-300' :
                                    (deal.status === 'open' || deal.status === 'pending' || deal.status === 'negotiating') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                    {dealIsDisputed ? '仲裁中' : invoice.status === 'withdrawn' ? '中止' : isDealExpired ? '期限切れ' : (deal.status === 'agreed' || deal.status === 'concluded') ? '成約済' : 'ACTIVE'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-4">
                            {dealIsDisputed ? (
                                <DisputeBoard
                                    deal={deal}
                                    invoice={invoice}
                                    user={user}
                                    isBuyer={isBuyer}
                                    activeDispute={activeDispute}
                                    setActiveDispute={setActiveDispute}
                                    messages={messages}
                                    addMessage={addMessage}
                                    users={users}
                                />
                            ) : (
                                <NormalDealBoard
                                    deal={deal}
                                    invoice={invoice}
                                    user={user}
                                    isBuyer={isBuyer}
                                    effectivelyMatched={effectivelyMatched}
                                    isDealExpired={isDealExpired}
                                    activeDealsForInvoice={activeDealsForInvoice}
                                    users={users}
                                    addMessage={addMessage}
                                    updateDeal={updateDeal}
                                    proposedPrice={proposedPrice}
                                    setProposedPrice={setProposedPrice}
                                    isPriceUnlocked={isPriceUnlocked}
                                    setIsPriceUnlocked={setIsPriceUnlocked}
                                    hasViewedTerms={hasViewedTerms}
                                    handleTermsClick={handleTermsClick}
                                />
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
                                            <span className="text-slate-500 shrink-0 mr-2">譲渡対象額</span>
                                            <div className="flex-1 text-right font-medium text-blue-700">{(invoice.saleType === 'partial' || (invoice.requestedAmount && invoice.requestedAmount !== invoice.amount)) ? `¥${invoice.requestedAmount?.toLocaleString()}` : `全額（¥${invoice.amount.toLocaleString()}）`}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">売主の希望売却額</span>
                                            <div className="flex-1 text-right font-medium text-indigo-700">{invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未設定'}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">入金期日</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.dueDate}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">企業名</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.isClientNamePublic || (!isBuyer ? true : opponentRevealedFields['debtorInfo']) ? (invoice.debtorName || '未設定') : '*** (非公開)'}</div>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                                            <span className="text-slate-500 shrink-0 mr-2">所在地</span>
                                            <div className="flex-1 text-right font-medium text-slate-800">{invoice.isClientAddressPublic || (!isBuyer ? true : opponentRevealedFields['debtorInfo']) ? (invoice.debtorAddress || '未設定') : '*** (非公開)'}</div>
                                        </div>
                                        {!isBuyer && !invoice.isClientNamePublic && !myRevealedFields['debtorInfo'] && (
                                            <div className="pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    disabled={invoice?.status === 'withdrawn' || isDealExpired}
                                                    onClick={() => handleRevealField('debtorInfo', '案件の売掛先 企業名と所在地')}
                                                >
                                                    企業名と所在地を公開する
                                                </Button>
                                            </div>
                                        )}
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
                        {!dealIsDisputed && invoice.status === 'withdrawn' && (
                            <div className="absolute top-0 left-0 right-0 z-20 bg-slate-100 text-slate-500 px-4 py-3 flex text-center justify-center items-center text-sm font-bold border-b border-slate-300 shadow-sm">
                                ⚠️ この案件は取り下げられました（メッセージの送信はできません）。
                            </div>
                        )}
                        {!dealIsDisputed && isDealExpired && invoice.status !== 'withdrawn' && (
                            <div className="absolute top-0 left-0 right-0 z-20 bg-slate-100 text-slate-500 px-4 py-3 flex text-center justify-center items-center text-sm font-bold border-b border-slate-300 shadow-sm">
                                ⚠️ 入金期日が徒過したため、この取引の交渉は終了しました（メッセージの送信はできません）。
                            </div>
                        )}
                        <CardContent className={`flex-1 md:overflow-y-auto p-0 bg-white min-h-[300px] md:min-h-0 relative ${deal.status === 'rejected' || (!dealIsDisputed && (invoice.status === 'withdrawn' || isDealExpired)) ? 'mt-12' : ''}`}>
                            <div className={deal.status === 'rejected' || (!dealIsDisputed && (invoice.status === 'withdrawn' || isDealExpired)) ? 'pt-12' : ''}>
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
                                    disabled={deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || (!dealIsDisputed && (invoice.status === 'withdrawn' || isDealExpired)) || isUploading}
                                    title="ファイルを添付する"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={
                                        dealIsDisputed ? "事故解決に向けたメッセージを入力..." :
                                        invoice.status === 'withdrawn' ? "この案件は取り下げられました" :
                                        isDealExpired ? "入金期日の徒過により交渉終了" :
                                        (deal.status === 'rejected' || deal.paymentStatus === 'fully_settled') ?
                                            "取引が終了しました（メッセージの送信はできません）。" :
                                            "メッセージを入力..."
                                    }
                                    className="flex-1 bg-white h-10"
                                    disabled={deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || (!dealIsDisputed && (invoice.status === 'withdrawn' || isDealExpired)) || isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <Button type="submit" size="md" disabled={(!inputText.trim() && !isUploading) || deal.status === 'rejected' || deal.paymentStatus === 'fully_settled' || (!dealIsDisputed && (invoice.status === 'withdrawn' || isDealExpired)) || isUploading} className="h-10 px-5 shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center justify-center">
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

            {/* Dispute Report Modal */}
            {isDisputeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
                        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                                ⚠️
                            </div>
                            <h3 className="text-lg font-bold text-orange-800">交渉システムへの移行（当事者間解決）</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-bold text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-inner">
                                一度交渉システムに移行すると、通常の取引画面には戻れず、当事者間での和解・再交渉を行う専用モードに切り替わります。※運営が直接トラブルの仲裁を行うものではありません。本当によろしいですか？
                            </p>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">現在のトラブル・状況を選択してください</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-orange-500 focus:border-orange-500 font-medium text-slate-700 outline-none cursor-pointer"
                                    value={selectedDisputeType}
                                    onChange={(e) => setSelectedDisputeType(e.target.value)}
                                >
                                    <option value="buyer_payment_delay">買主の代金未払</option>
                                    <option value="seller_receipt_unconfirmed">売主の着金未確認</option>
                                    <option value="seller_repayment_delay">売主の回収金未送金</option>
                                    <option value="buyer_receipt_unconfirmed">買主の着金未確認</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button variant="outline" className="text-slate-600 font-bold" onClick={() => setIsDisputeModalOpen(false)} disabled={isReportingDispute}>
                                キャンセル
                            </Button>
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-sm shadow-orange-600/20 flex items-center justify-center gap-2" onClick={handleReportDispute} disabled={isReportingDispute}>
                                {isReportingDispute ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                                        処理中...
                                    </>
                                ) : (
                                    '確定して移行する'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
