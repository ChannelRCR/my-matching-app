import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Send, User, ChevronLeft, DollarSign } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { Handshake, FileText } from 'lucide-react';
import type { Deal, Invoice, User as UserType } from '../types';
import { markDealAsRead } from '../utils/chat';

interface ChatMessage {
    id: string;
    sender: 'me' | 'other';
    text: string;
    timestamp: string;
}

export const ChatPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dealId = searchParams.get('dealId');
    const { deals, invoices, messages: allMessages, users, addMessage, updateDeal, agreeToDeal } = useData();
    const { completeDeal } = useMarket();
    const { user } = useAuth(); // Use real auth user

    const [deal, setDeal] = useState<Deal | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [proposedPrice, setProposedPrice] = useState('');
    const [counterpartName, setCounterpartName] = useState('');
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const isBuyer = user && deal ? user.id === deal.buyerId : false;
    const isPriceMatched = deal ? (deal.currentBuyerPrice || 0) > 0 && deal.currentBuyerPrice === deal.currentSellerPrice : false;

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
                setDeal(foundDeal);
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
                        timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                });

                setMessages(chatMessages);

                // Mark deal as read
                if (user) {
                    markDealAsRead(dealId, user.id);
                }

                // Set counterpart name
                if (isBuyer) {
                    const seller = users.find(u => u.id === foundDeal.sellerId);
                    setCounterpartName(seller?.companyName || '売却企業');
                } else {
                    const buyer = users.find(u => u.id === foundDeal.buyerId);
                    setCounterpartName(buyer?.companyName || '投資家');
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

    const handleSend = async () => {
        if (!inputText.trim() || !deal || !user) return;
        if (!['open', 'pending', 'negotiating'].includes(deal.status)) return;

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

    const handleProposePrice = async () => {
        if (!deal || !user || !proposedPrice) return;
        const numPrice = Number(proposedPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            alert("有効な金額を入力してください");
            return;
        }

        if (isBuyer) {
            await updateDeal(deal.id, { currentBuyerPrice: numPrice });
        } else {
            await updateDeal(deal.id, { currentSellerPrice: numPrice });
        }
        setProposedPrice('');

        // Let's add an admin-like system message to chat as well
        const now = new Date();
        const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
        await addMessage({
            id: `sys_${Date.now()}`,
            dealId: deal.id,
            senderId: user.id, // technically it's me sending the system prop
            receiverId: receiverId,
            content: `【システム通知】\n新しい提示金額: ¥${numPrice.toLocaleString()}`,
            timestamp: now.toISOString()
        });
    };

    const handleRevealField = async (fieldKey: string, fieldLabel: string) => {
        if (!deal || !user) return;

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
            timestamp: now.toISOString()
        });
    };

    const handleAgree = async () => {
        if (!deal || !invoice || !user) return;

        const isBuyer = user.id === deal.buyerId;
        const willBeConcluded = (isBuyer && deal.sellerAgreedAt) || (!isBuyer && deal.buyerAgreedAt);

        const confirmMsg = willBeConcluded
            ? '相手も合意済みのため、この操作で契約が成立します。よろしいですか？'
            : '契約内容に合意しますか？相手の合意をもって契約成立となります。';

        if (window.confirm(confirmMsg)) {
            await agreeToDeal(deal.id, isBuyer);
            if (willBeConcluded) {
                // Update market stats only if the deal becomes concluded here
                completeDeal(invoice.amount, deal.currentAmount);
            }
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

    const PROFILE_FIELDS = [
        { key: 'companyName', label: '会社名' },
        { key: 'representativeName', label: '代表者名' },
        { key: 'contactPerson', label: '担当者名' },
        { key: 'address', label: '所在地' },
        { key: 'phone', label: '電話番号' },
        { key: 'email', label: 'メールアドレス' },
        { key: 'bankAccountInfo', label: '口座情報' },
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
                                className="h-6 text-[10px] px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleRevealField(field.key, field.label)}
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
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    translate="no"
                >
                    <div className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        <div
                            className={`rounded-2xl px-4 py-2 shadow-sm whitespace-pre-wrap text-sm md:text-base ${msg.sender === 'me'
                                ? 'bg-green-500 text-white rounded-tr-none'
                                : 'bg-slate-200 text-slate-800 rounded-tl-none'
                                }`}
                        >
                            {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {msg.timestamp}
                        </span>
                    </div>
                </div>
            ))}
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
        <div className="max-w-4xl mx-auto min-h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-1 md:mb-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-500 p-0 md:px-4 md:py-2">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    戻る
                </Button>
            </div>

            <Card className="flex-1 flex flex-col shadow-md md:overflow-hidden relative">
                <CardHeader className="border-b bg-white z-10 py-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <div className="text-lg">{counterpartName}</div>
                                <div className="text-sm font-normal text-slate-500 flex flex-wrap gap-2 items-center mt-1">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 border border-slate-200">ID: {invoice.id}</span>
                                    <span>額面: ¥{invoice.amount.toLocaleString()}</span>
                                    {invoice.sellingAmount && invoice.sellingAmount < invoice.amount && (
                                        <span className="text-blue-600 font-medium">
                                            (売却対象: ¥{invoice.sellingAmount.toLocaleString()})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardTitle>
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded font-bold text-sm border border-indigo-100 shadow-sm">
                                希望買取額: ¥{invoice.requestedAmount?.toLocaleString() || '未設定'}
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden bg-slate-100 p-2 gap-2">
                    {/* Negotiation Panel (Left Panel) */}
                    <Card className="md:w-1/3 flex flex-col shadow-sm border-slate-200 shrink-0 md:h-full md:overflow-y-auto">
                        <CardHeader className="border-b bg-white py-3 px-4 sticky top-0 z-10">
                            <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                条件交渉
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 mb-1">相手の提示額</div>
                                <div className="text-xl font-bold text-slate-800">
                                    {isBuyer ?
                                        (deal.currentSellerPrice ? `¥${deal.currentSellerPrice.toLocaleString()}` : '未提示') :
                                        (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示')}
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 shadow-sm">
                                <div className="text-xs font-bold text-blue-800/70 mb-1">あなたの提示額</div>
                                <div className="text-xl font-bold text-blue-900 mb-3">
                                    {isBuyer ?
                                        (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示') :
                                        (deal.currentSellerPrice ? `¥${deal.currentSellerPrice.toLocaleString()}` : '未提示')}
                                </div>
                                {['open', 'pending', 'negotiating'].includes(deal.status) && !isPriceMatched && (
                                    <form onSubmit={(e) => { e.preventDefault(); handleProposePrice(); }} className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={proposedPrice}
                                                onChange={(e) => setProposedPrice(e.target.value)}
                                                placeholder="金額を入力"
                                                className="flex-1 bg-white h-9"
                                                min="1"
                                            />
                                            <Button type="submit" size="sm" variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 h-9 shrink-0">
                                                提示する
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* --- Profile Panels --- */}
                            <div className="space-y-4 pt-2">
                                <div className="bg-white p-3 rounded-md border border-slate-200 shadow-sm max-h-[250px] overflow-y-auto">
                                    <div className="text-sm font-bold text-slate-700 mb-2 border-b pb-1 sticky top-0 bg-white z-10">相手のプロフィール</div>
                                    <div className="flex flex-col">
                                        {PROFILE_FIELDS.map(f => renderProfileField(opponentProfile, f, false, opponentRevealedFields))}
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-md border border-slate-200 shadow-sm max-h-[250px] overflow-y-auto">
                                    <div className="text-sm font-bold text-slate-700 mb-2 border-b pb-1 sticky top-0 bg-white z-10">あなたのプロフィール</div>
                                    <div className="flex flex-col">
                                        {PROFILE_FIELDS.map(f => renderProfileField(myProfile, f, true, myRevealedFields))}
                                    </div>
                                </div>
                            </div>

                            {/* Agreement Logic */}
                            {['open', 'pending', 'negotiating'].includes(deal.status) ? (
                                <div className="mt-6 border-t border-slate-200 pt-4">
                                    {isPriceMatched ? (
                                        <>
                                            <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4 font-bold text-center border border-green-200 shadow-sm">
                                                🎉 金額が合致しました！
                                            </div>

                                            {/* Check if you've already agreed */}
                                            {((isBuyer && deal.buyerAgreedAt) || (!isBuyer && deal.sellerAgreedAt)) ? (
                                                <Button size="sm" variant="secondary" disabled className="bg-slate-200 text-slate-500 w-full cursor-not-allowed">
                                                    相手の最終合意を待っています
                                                </Button>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 bg-white shadow-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={isTermsAgreed}
                                                            onChange={(e) => setIsTermsAgreed(e.target.checked)}
                                                            className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 shrink-0"
                                                        />
                                                        <span className="leading-snug">利用規約および債権譲渡約款に同意する</span>
                                                    </label>
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
                                                        この条件で契約に合意する
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
                                <div className="mt-6 border-t border-slate-200 pt-4 flex flex-col items-center gap-3">
                                    {deal.status === 'agreed' ? (
                                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                                            取引成立済み
                                        </span>
                                    ) : deal.status === 'concluded' ? (
                                        <div className="flex flex-col items-center gap-3 w-full">
                                            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                                                契約成立🎉
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-green-600 text-green-700 hover:bg-green-50 w-full shadow-sm"
                                                onClick={handlePrintContract}
                                                disabled={isGeneratingPdf}
                                            >
                                                <FileText className="w-4 h-4 mr-2" />
                                                {isGeneratingPdf ? "PDF生成中..." : "契約書（PDF）を保存"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-200">
                                            {deal.status === 'open' || deal.status === 'pending' ? 'オファー承諾待ち' : '取引終了'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chat Panel (Right Panel) */}
                    <Card className="flex-1 flex flex-col shadow-sm border-slate-200 md:h-full md:overflow-hidden">
                        <CardContent className="flex-1 md:overflow-y-auto p-0 bg-white min-h-[300px] md:min-h-0">
                            {renderMessages()}
                        </CardContent>

                        <CardFooter className="bg-slate-50 border-t p-3 border-slate-200 sticky bottom-0 z-10">
                            <form
                                className="flex w-full gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                            >
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={
                                        ['open', 'pending', 'negotiating'].includes(deal.status) ? "メッセージを入力..." :
                                            deal.status === 'concluded' ? "契約が完成しました。" :
                                                "取引が終了しました"
                                    }
                                    className="flex-1 bg-white h-10"
                                    disabled={!['open', 'pending', 'negotiating'].includes(deal.status)}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <Button type="submit" size="md" disabled={!['open', 'pending', 'negotiating'].includes(deal.status)} className="h-10 px-5 shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm">
                                    <Send className="h-4 w-4 mr-2" />
                                    送信
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            </Card>
        </div>
    );
};
