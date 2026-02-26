import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ChevronLeft, Printer } from 'lucide-react';
import type { Deal, Invoice, User } from '../types';

export const ContractPrintPage: React.FC = () => {
    const { dealId } = useParams<{ dealId: string }>();
    const navigate = useNavigate();
    const { deals, invoices, users } = useData();
    const { user: authUser } = useAuth();

    const [deal, setDeal] = useState<Deal | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [seller, setSeller] = useState<User | null>(null);
    const [buyer, setBuyer] = useState<User | null>(null);

    useEffect(() => {
        if (dealId && authUser) {
            const foundDeal = deals.find(d => d.id === dealId);
            if (foundDeal) {
                setDeal(foundDeal);
                setInvoice(invoices.find(i => i.id === foundDeal.invoiceId) || null);
                setSeller(users.find(u => u.id === foundDeal.sellerId) || null);
                setBuyer(users.find(u => u.id === foundDeal.buyerId) || null);
            }
        }
    }, [dealId, deals, invoices, users, authUser]);

    if (!deal || !invoice || !seller || !buyer) {
        return <div className="p-8 text-center">読み込み中...またはデータが見つかりません。</div>;
    }

    if (deal.status !== 'concluded') {
        return <div className="p-8 text-center">この案件はまだ契約が成立していません。</div>;
    }

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '未定';
        const d = new Date(dateString);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };

    return (
        <div className="bg-slate-50 min-h-screen py-8 print:bg-white print:py-0">
            <div className="max-w-4xl mx-auto px-4 print:max-w-none print:px-0">
                {/* Controls - Hidden when printing */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-500">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        チャットに戻る
                    </Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        PDFとして保存 / 印刷
                    </Button>
                </div>

                {/* Contract Document - A4 Paper Style */}
                <div className="bg-white p-12 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
                    <h1 className="text-2xl font-bold text-center mb-10 tracking-widest">重要事項説明書 兼 契約書</h1>

                    <p className="mb-6 leading-relaxed">
                        譲渡人（以下「甲」という。）と、譲受人（以下「乙」という。）は、以下の通り債権譲渡に関して合意し、契約を締結する。
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">1. 譲渡対象債権</h2>
                    <div className="bg-slate-50 border border-slate-200 p-6 mb-6 pl-8">
                        <ul className="list-disc leading-loose">
                            <li><strong>債務者名:</strong> {invoice.debtorName || '記載なし'}</li>
                            <li><strong>債務者住所:</strong> {invoice.debtorAddress || '記載なし'}</li>
                            <li><strong>債権額面金額:</strong> {invoice.amount.toLocaleString()}円</li>
                            <li><strong>支払期日:</strong> {formatDate(invoice.dueDate)}</li>
                        </ul>
                    </div>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">2. 譲渡代金</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        金 {deal.currentAmount.toLocaleString()} 円
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">3. 権利移転時期（所有権留保）</h2>
                    <p className="mb-6 leading-relaxed pl-4 font-bold decoration-2 underline-offset-4 decoration-slate-400 text-black">
                        譲渡対象債権の所有権は、乙が譲渡代金を完済した時に甲から乙へ移転するものとする。
                    </p>

                    <div className="bg-slate-100 border border-slate-300 p-4 mt-12 mb-8 text-sm text-slate-700">
                        <strong>【約款の適用】</strong><br />
                        本契約書に記載のない事項については、当プラットフォームの利用規約および債権譲渡約款（ <a href="https://example.com/terms" className="text-blue-600 underline">https://example.com/terms</a> ）の定めるところによる。
                    </div>

                    <div className="mt-16 text-right mb-10">
                        <p className="text-lg">契約締結日: {formatDate(deal.contractDate)}</p>
                    </div>

                    <div className="flex justify-between border-t-2 border-slate-800 pt-8 mt-12 gap-8">
                        <div className="flex-1">
                            <p className="mb-4 font-bold">【甲】（譲渡人・売り手）</p>
                            <p className="mb-2">住所: {seller.address || '（未登録）'}</p>
                            <p className="mb-2">会社名: {seller.companyName}</p>
                            <p className="mb-2">代表者: {seller.representativeName || seller.name}</p>
                            <div className="mt-8 border-b border-slate-300 w-32 ml-auto">（印）</div>
                        </div>
                        <div className="flex-1">
                            <p className="mb-4 font-bold">【乙】（譲受人・買い手）</p>
                            <p className="mb-2">住所: {buyer.address || '（未登録）'}</p>
                            <p className="mb-2">会社名: {buyer.companyName}</p>
                            <p className="mb-2">代表者: {buyer.representativeName || buyer.name}</p>
                            <div className="mt-8 border-b border-slate-300 w-32 ml-auto">（印）</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};
