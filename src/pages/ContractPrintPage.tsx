import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ChevronLeft, Printer } from 'lucide-react';

export const ContractPrintPage: React.FC = () => {
    const { dealId } = useParams<{ dealId: string }>();
    const navigate = useNavigate();
    const { deals, invoices, users } = useData();
    const { user: authUser } = useAuth();

    const deal = (dealId && authUser) ? deals.find(d => d.id === dealId) || null : null;
    const invoice = deal ? invoices.find(i => i.id === deal.invoiceId) || null : null;
    const seller = deal ? users.find(u => u.id === deal.sellerId) || null : null;
    const buyer = deal ? users.find(u => u.id === deal.buyerId) || null : null;

    if (!deal || !invoice || !seller || !buyer) {
        return <div className="p-8 text-center">読み込み中...またはデータが見つかりません。</div>;
    }

    if (deal.status !== 'concluded') {
        return <div className="p-8 text-center">この案件はまだ契約が成立していません。</div>;
    }

    const finalPrice = deal.currentAmount || deal.currentBuyerPrice || deal.currentSellerPrice || 0;

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '未定';
        const d = new Date(dateString);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return '未定';
        const d = new Date(dateString);
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} JST`;
    };

    return (
        <div className="bg-slate-50 min-h-screen py-8 print:bg-white print:py-0">
            <div className="max-w-4xl mx-auto px-4 print:max-w-none print:px-0">
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

                <div className="bg-white p-12 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
                    <h1 className="text-2xl font-bold text-center mb-10 tracking-widest">個別債権譲渡契約</h1>

                    <p className="mb-6 leading-relaxed">
                        本契約の当事者である売主（譲渡人　以下「甲」といいます）と、買主（譲受人　以下「乙」といいます）は、当プラットフォームを通じて、以下の通り債権譲渡契約（以下「本契約」といいます）を締結しました。なお、当事者の詳細は末尾当事者目録記載の通りです。
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">第1条（債権の譲渡）</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        甲は乙に対し、甲が末尾債権目録記載の取引先（債務者）に対して有する売掛債権（以下「本件債権」といいます）を譲渡し、乙はこれを譲り受けました。<br />
                        <strong>【対象債権】（末尾債権目録参照）</strong>
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">第2条（譲渡代金および支払い方法）</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        乙は甲に対し、本件債権の譲受代金として金 {finalPrice.toLocaleString()} 円を、別途当事者間で合意した銀行口座（末尾当事者目録の甲の振込先口座情報を参照）に振り込む方法により支払います。なお、振込手数料は乙の負担とします。
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">第3条（権利移転時期および対抗要件）</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        1. 本件債権の権利は、乙が甲に対して前条の譲渡代金全額を支払い、甲がこれを受領した時点で、甲から乙へ移転するものとします。<br />
                        2. 甲は、乙の請求があるときは、本件債権の譲渡について、原債務者に対する確定日付のある証書による譲渡通知、または原債務者の承諾を取得するための手続きに協力するものとします。
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">第4条（表明および保証）</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        甲は乙に対し、本契約締結日時点において以下の事項が真実かつ正確であることを表明し、保証します。<br />
                        (1) 本件債権が有効に存在し、第三者の担保権、差押え等の負担が付着していないこと。<br />
                        (2) 甲の知る限りにおいて、取引先（債務者）の信用不安は発生していないこと。
                    </p>

                    <h2 className="text-lg font-bold mb-3 border-b border-black pb-1">第5条（その他約款の適用）</h2>
                    <p className="mb-6 leading-relaxed pl-4">
                        本契約に定めのない事項、または本契約の解釈に疑義が生じた事項については、当プラットフォームの「債権譲渡基本約款」の規定が適用されるものとし、当事者間で誠実に協議のうえ解決するものとします。
                    </p>

                    <p className="mb-12 leading-relaxed">
                        本契約の成立を証するため、本電磁的記録を作成し、甲および乙は各々保有するものとします。なお、本電磁的記録（契約締結証明書）をプリントアウトした書面をもって、民事訴訟法228条4項の「真正に成立した」ものとの推定が生じるものとします。
                    </p>

                    <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '40px' }} />

                    <h2 className="text-xl font-bold text-center mb-8 border-b-2 border-black pb-2">当事者目録</h2>
                    
                    <div className="mb-8">
                        <h3 className="font-bold text-lg mb-4">【甲】（譲渡人・売主）</h3>
                        <table className="w-full border-collapse border border-slate-300">
                            <tbody>
                                <tr><th className="border border-slate-300 p-2 bg-slate-50 w-1/3 text-left">氏名（法人の場合は名称及び代表者）</th><td className="border border-slate-300 p-2">{seller.entityType === 'corporate' ? `${seller.companyName} 代表者 ${seller.representativeName}` : seller.name}</td></tr>
                                <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">住所（所在地）</th><td className="border border-slate-300 p-2">{seller.address || '（未登録）'}</td></tr>
                                <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">振込先口座情報</th><td className="border border-slate-300 p-2">{seller.bankAccountInfo || '（別途合意）'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-12">
                        <h3 className="font-bold text-lg mb-4">【乙】（譲受人・買主）</h3>
                        <table className="w-full border-collapse border border-slate-300">
                            <tbody>
                                <tr><th className="border border-slate-300 p-2 bg-slate-50 w-1/3 text-left">氏名（法人の場合は名称及び代表者）</th><td className="border border-slate-300 p-2">{buyer.entityType === 'corporate' ? `${buyer.companyName} 代表者 ${buyer.representativeName}` : buyer.name}</td></tr>
                                <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">住所（所在地）</th><td className="border border-slate-300 p-2">{buyer.address || '（未登録）'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '40px' }} />

                    <h2 className="text-xl font-bold text-center mb-8 border-b-2 border-black pb-2">債権目録</h2>

                    <table className="w-full border-collapse border border-slate-300 mb-12">
                        <tbody>
                            <tr><th className="border border-slate-300 p-2 bg-slate-50 w-1/3 text-left">取引先（債務者）名称</th><td className="border border-slate-300 p-2">{invoice.debtorName || '記載なし'}</td></tr>
                            <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">取引先（債務者）住所</th><td className="border border-slate-300 p-2">{invoice.debtorAddress || '記載なし'}</td></tr>
                            <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">債権の種類</th><td className="border border-slate-300 p-2">売掛金請求権</td></tr>
                            <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">債権額面金額</th><td className="border border-slate-300 p-2">{invoice.amount.toLocaleString()}円</td></tr>
                            <tr><th className="border border-slate-300 p-2 bg-slate-50 text-left">支払期日</th><td className="border border-slate-300 p-2">{formatDate(invoice.dueDate)}</td></tr>
                        </tbody>
                    </table>

                    <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '40px' }} />

                    <h2 className="text-xl font-bold text-center mb-8 border-b-2 border-black pb-2">契約締結証明書</h2>
                    
                    <p className="mb-6">
                        本件債権譲渡契約は、以下の日時および当事者の電磁的記録（電子署名に代わる措置）により、当プラットフォーム上で適法かつ有効に成立したことを証明します。
                    </p>

                    <table className="w-full border-collapse border border-slate-300 text-sm">
                        <tbody>
                            <tr>
                                <th className="border border-slate-300 p-3 bg-slate-50 w-1/4 text-left">契約成立日時</th>
                                <td className="border border-slate-300 p-3 font-mono">{formatDateTime(deal.contractDate)}</td>
                            </tr>
                            <tr>
                                <th className="border border-slate-300 p-3 bg-slate-50 text-left">案件ID</th>
                                <td className="border border-slate-300 p-3 font-mono text-xs">{deal.id}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-8 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 border border-slate-300 p-4 bg-slate-50/50">
                            <h4 className="font-bold border-b border-slate-300 pb-2 mb-3">譲渡人（甲）</h4>
                            <p className="text-sm mb-1"><strong>署名名:</strong> {deal.sellerSignatureName || (seller.entityType === 'corporate' ? seller.representativeName : seller.name) || '記録なし'}</p>
                            <p className="text-xs text-slate-500 mb-1 break-all"><strong>IPアドレス:</strong> {deal.sellerIP || '記録なし'}</p>
                            <p className="text-xs text-slate-500 break-all"><strong>UserAgent:</strong> {deal.sellerUA || '記録なし'}</p>
                        </div>
                        <div className="flex-1 border border-slate-300 p-4 bg-slate-50/50">
                            <h4 className="font-bold border-b border-slate-300 pb-2 mb-3">譲受人（乙）</h4>
                            <p className="text-sm mb-1"><strong>署名名:</strong> {deal.buyerSignatureName || (buyer.entityType === 'corporate' ? buyer.representativeName : buyer.name) || '記録なし'}</p>
                            <p className="text-xs text-slate-500 mb-1 break-all"><strong>IPアドレス:</strong> {deal.buyerIP || '記録なし'}</p>
                            <p className="text-xs text-slate-500 break-all"><strong>UserAgent:</strong> {deal.buyerUA || '記録なし'}</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-sm text-slate-500">
                        プラットフォーム提供事業者: 株式会社日本RCR
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
