import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Send, User, ChevronLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MOCK_USERS } from '../data/mockData';
import { useData } from '../contexts/DataContext';
import { useMarket } from '../contexts/MarketContext';
import { Handshake } from 'lucide-react';
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
    const { deals, invoices, messages: allMessages, addMessage, updateDeal } = useData();
    const { completeDeal } = useMarket();

    const [deal, setDeal] = useState<Deal | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [counterpartName, setCounterpartName] = useState('');

    useEffect(() => {
        if (dealId) {
            const foundDeal = deals.find(d => d.id === dealId);
            if (foundDeal) {
                setDeal(foundDeal);
                const foundInvoice = invoices.find(i => i.id === foundDeal.invoiceId);
                setInvoice(foundInvoice || null);

                // ... role logic ...
                const myRole = localStorage.getItem('demoRole') || 'seller';
                const isBuyer = myRole === 'buyer';

                // Load messages for this deal
                const dealMessages = allMessages.filter(m => m.dealId === dealId);
                const chatMessages: ChatMessage[] = dealMessages.map(m => ({
                    id: m.id,
                    sender: m.senderId === 'buyer1' ? (isBuyer ? 'me' : 'other') : (isBuyer ? 'other' : 'me'),
                    text: m.content,
                    timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));

                setMessages(chatMessages);

                // Set counterpart name
                if (isBuyer) {
                    const seller = MOCK_USERS.find(u => u.id === foundDeal.sellerId);
                    setCounterpartName(seller?.companyName || '売却企業');
                } else {
                    const buyer = MOCK_USERS.find(u => u.id === foundDeal.buyerId);
                    setCounterpartName(buyer?.companyName || '投資家');
                }
            }
        }
    }, [dealId, deals, invoices, allMessages]);

    const handleSend = () => {
        if (!inputText.trim() || !deal) return;
        if (deal.status !== 'negotiating') return; // Prevent sending if closed

        const myRole = localStorage.getItem('demoRole') || 'seller';
        const myId = myRole === 'buyer' ? 'buyer1' : 'seller1';
        const receiverId = myRole === 'buyer' ? deal.sellerId : deal.buyerId;

        const newMessageContent = inputText;
        const now = new Date();

        addMessage({
            id: `msg_${Date.now()}`,
            dealId: deal.id,
            senderId: myId,
            receiverId: receiverId,
            content: newMessageContent,
            timestamp: now.toISOString()
        });

        updateDeal(deal.id, { lastMessageAt: now.toISOString() });
        setInputText('');
    };

    const handleCompleteDeal = () => {
        if (!deal || !invoice) return;

        if (window.confirm('この条件で取引を完了（契約成立）しますか？\n\n※この操作は取り消せません。')) {
            // 1. Update Deal Status
            updateDeal(deal.id, { status: 'agreed' });

            // 2. Update Market Stats
            completeDeal(invoice.amount, deal.currentAmount);

            // 3. System Message (Optional but good UX)
            const now = new Date();
            addMessage({
                id: `msg_sys_${now.getTime()}`,
                dealId: deal.id,
                senderId: 'system', // Mock system sender
                receiverId: 'all',
                content: '【システム】取引が成立しました。おめでとうございます！',
                timestamp: now.toISOString()
            });

            alert('取引が完了しました！');
        }
    };

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
                                <div className="text-sm font-normal text-slate-500">
                                    案件ID: {invoice.id} / 額面: ¥{invoice.amount.toLocaleString()}
                                </div>
                            </div>
                        </CardTitle>
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-slate-100 px-3 py-1 rounded text-sm text-slate-600">
                                希望: ¥{invoice.requestedAmount?.toLocaleString()}
                            </div>
                            {deal.status === 'negotiating' ? (
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleCompleteDeal}
                                >
                                    <Handshake className="w-4 h-4 mr-1" />
                                    取引を完了する
                                </Button>
                            ) : deal.status === 'agreed' ? (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                    取引成立済み
                                </span>
                            ) : deal.status === 'pending' ? (
                                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                                    オファー承諾待ち
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                    却下済み
                                </span>
                            )}
                        </div>
                    </div>
                    {deal.status === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2 text-sm text-yellow-800 flex items-center gap-2">
                            <div className="bg-yellow-100 p-1 rounded-full">
                                <User className="w-3 h-3 text-yellow-600" />
                            </div>
                            売り手がオファーを承諾するとチャットが可能になります。現在は待機中です。
                        </div>
                    )}
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl p-4 shadow-sm whitespace-pre-wrap ${msg.sender === 'me'
                                    ? 'bg-primary text-white rounded-br-none'
                                    : 'bg-white text-slate-900 rounded-bl-none border border-slate-100'
                                    }`}
                            >
                                <p>{msg.text}</p>
                                <div
                                    className={`text-xs mt-1 text-right ${msg.sender === 'me' ? 'text-blue-100' : 'text-slate-400'
                                        }`}
                                >
                                    {msg.timestamp}
                                </div>
                            </div>
                        </div>
                    ))}
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
                                    deal.status === 'pending' ? "売り手の承諾をお待ちください" :
                                        "取引終了のため送信できません"
                            }
                            className="flex-1"
                            disabled={deal.status !== 'negotiating'}
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
