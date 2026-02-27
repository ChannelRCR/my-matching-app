import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Send, User, ChevronLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { Handshake, FileText } from 'lucide-react';
import type { Deal, Invoice } from '../types';

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
    const [counterpartName, setCounterpartName] = useState('');
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

                // Set counterpart name
                if (isBuyer) {
                    const seller = users.find(u => u.id === foundDeal.sellerId);
                    setCounterpartName(seller?.companyName || '売却企業');
                } else {
                    const buyer = users.find(u => u.id === foundDeal.buyerId);
                    setCounterpartName(buyer?.companyName || '投資家');
                }
            }
        }
    }, [dealId, deals, invoices, allMessages, users, user]);

    const handleSend = async () => {
        if (!inputText.trim() || !deal || !user) return;
        if (deal.status !== 'negotiating') return;

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
            console.error(e);
            alert("PDF生成に失敗しました。");
        } finally {
            setIsGeneratingPdf(false);
        }
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
        <div className="max-w-4xl mx-auto h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-1 md:mb-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-500 p-0 md:px-4 md:py-2">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    戻る
                </Button>
            </div>

            <Card className="flex-1 flex flex-col shadow-md overflow-hidden relative">
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
                            {(() => {
                                if (deal.status === 'concluded') {
                                    return (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                                契約成立🎉
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                                onClick={handlePrintContract}
                                                disabled={isGeneratingPdf}
                                            >
                                                <FileText className="w-4 h-4 mr-1" />
                                                {isGeneratingPdf ? "PDF生成中..." : "📝 契約書（PDF）をダウンロード"}
                                            </Button>
                                        </div>
                                    );
                                } else if (deal.status === 'agreed') {
                                    return (
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                            取引成立済み
                                        </span>
                                    );
                                } else if (deal.status === 'negotiating') {
                                    const isBuyer = user?.id === deal.buyerId;
                                    const hasIAgreed = isBuyer ? !!deal.buyerAgreedAt : !!deal.sellerAgreedAt;

                                    if (hasIAgreed) {
                                        return (
                                            <Button size="sm" variant="secondary" disabled className="bg-slate-200 text-slate-500">
                                                相手の合意待ちです
                                            </Button>
                                        );
                                    } else {
                                        return (
                                            <div className="flex flex-col items-end gap-2">
                                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={isTermsAgreed}
                                                        onChange={(e) => setIsTermsAgreed(e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                    />
                                                    <span>利用規約および債権譲渡約款に同意する</span>
                                                </label>
                                                <Button
                                                    size="sm"
                                                    className={`text-white w-full ${isTermsAgreed ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                                    onClick={handleAgree}
                                                    disabled={!isTermsAgreed}
                                                >
                                                    <Handshake className="w-4 h-4 mr-1" />
                                                    この条件で契約に合意する
                                                </Button>
                                            </div>
                                        );
                                    }
                                } else if (deal.status === 'pending' || deal.status === 'open') {
                                    return (
                                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                                            オファー承諾待ち
                                        </span>
                                    );
                                } else {
                                    return (
                                        <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                            却下済み
                                        </span>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50">
                    {renderMessages()}
                </CardContent>

                <CardFooter className="bg-white border-t p-4">
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
                                deal.status === 'negotiating' ? "メッセージを入力..." :
                                    deal.status === 'concluded' ? "契約が成立しました" :
                                        (deal.status === 'pending' || deal.status === 'open') ? "売り手の承諾をお待ちください" :
                                            "取引終了のため送信できません"
                            }
                            className="flex-1"
                            disabled={deal.status !== 'negotiating'}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <Button type="submit" size="md" disabled={deal.status !== 'negotiating'}>
                            <Send className="h-4 w-4 mr-2" />
                            送信
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
};
