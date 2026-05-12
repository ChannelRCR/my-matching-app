import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageCircle, FileText, Calendar, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

import { calculateAnnualYield } from '../utils/calculations';
import { translateCompanySize } from '../utils/translations';
import { supabase } from '../lib/supabase';


export const BuyerInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { invoices, deals, users, invoiceStats, sellerUncompletedCounts, createChatRoom } = useData();
    const { user } = useAuth();

    const invoice = (id && invoices.length > 0) ? invoices.find(i => i.id === id) || null : null;
    const existingDeal = (id && invoices.length > 0 && user) ? deals.find(d => d.invoiceId === id && d.buyerId === user.id) || null : null;

    if (!invoice) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    const seller = users.find(u => u.id === invoice.sellerId);
    
    // Use platform-wide stats for accurate representation of competition
    const stats = invoiceStats[invoice.id] || { offerCount: 0, maxOffer: 0 };
    const highestOffer = stats.maxOffer;
    const offerCount = stats.offerCount;
    const sellerUncompletedCount = sellerUncompletedCounts[invoice.sellerId] || 0;

    const handleViewEvidence = async () => {
        if (!invoice?.evidenceUrl) return;
        
        // 旧システムでのパブリックURLの場合はそのまま開く
        if (invoice.evidenceUrl.startsWith('http')) {
            window.open(invoice.evidenceUrl, '_blank');
            return;
        }

        // privateバケットからのSigned URL取得
        const { data, error } = await supabase.storage
            .from('invoice_evidences')
            .createSignedUrl(invoice.evidenceUrl, 60); // 60秒間有効

        if (error || !data) {
            console.error('Error fetching signed URL:', error);
            alert('証拠書類の取得に失敗しました。');
            return;
        }
        
        window.open(data.signedUrl, '_blank');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Button variant="ghost" className="mb-4" onClick={() => navigate('/buyer/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                マーケットプレイスに戻る
            </Button>

            <Card>
                <CardHeader className="bg-slate-50 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{invoice.industry}</span>
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{translateCompanySize(invoice.companySize)}</span>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${invoice.saleType === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {invoice.saleType === 'partial' ? '一部売却' : '全部売却'}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl">案件 #{invoice.id}</CardTitle>
                            {invoice.status === 'open' && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                    募集中
                                </span>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Partial Sale Alert Area (Only shows if partial) */}
                    {invoice.saleType === 'partial' && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
                            <h3 className="text-amber-800 font-bold mb-1">この案件は「一部売却」です</h3>
                            <p className="text-amber-700 text-sm">
                                請求書総額 <strong>¥{invoice.amount.toLocaleString()}</strong> のうち、
                                <strong className="text-lg underline underline-offset-2 mx-1">¥{invoice.requestedAmount?.toLocaleString()}</strong>分のみが売却対象となります。
                            </p>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 mb-1">売り手企業</h3>
                                <p className="text-lg font-bold text-slate-800">{seller?.companyName || seller?.name || '不明な売り手'}</p>
                            </div>
                            <div>
                                {sellerUncompletedCount > 1 ? (
                                    <div className="inline-flex text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200 items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> ⚠ 未決済の債権が存在します
                                    </div>
                                ) : (
                                    <div className="inline-flex text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap bg-green-50 text-green-700 border border-green-200 items-center gap-1">
                                        <CheckCircle className="w-3.5 h-3.5" /> その他未決済債権なし
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-slate-500 mb-1">最高買取希望額</h3>
                            <p className="text-lg font-bold text-green-600">
                                {highestOffer > 0 ? `¥${highestOffer.toLocaleString()}` : 'まだオファーはありません'}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />現在のオファー数
                            </h3>
                            <span className="text-lg font-bold text-blue-600">
                                {offerCount} 件
                            </span>
                        </div>
                    </div>

                    {/* Key Figures */}
                    <div className="grid md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col justify-center space-y-4">
                            <div>
                                <h3 className="flex items-center text-slate-500 font-medium mb-1">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    全体債権額
                                </h3>
                                <p className={`text-3xl font-bold ${invoice.saleType === 'partial' && invoice.requestedAmount !== invoice.amount ? 'text-slate-400 line-through text-2xl' : 'text-slate-900'}`}>
                                    ¥{invoice.amount.toLocaleString()}
                                </p>
                            </div>
                            {invoice.saleType === 'partial' && invoice.requestedAmount !== invoice.amount && (
                                <div className="pt-4 border-t border-slate-200">
                                    <h3 className="flex items-center text-amber-700 font-bold text-sm mb-1">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        譲渡対象金額
                                    </h3>
                                    <p className="text-3xl font-bold text-amber-600">
                                        ¥{invoice.requestedAmount?.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col justify-center">
                            <div>
                                <h3 className="flex items-center text-indigo-600 font-medium mb-2">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    希望売却額
                                </h3>
                                <p className="text-3xl font-bold text-indigo-700">¥{invoice.sellingAmount?.toLocaleString() || '未設定'}</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-indigo-200">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-indigo-900">想定利回り (年率)</span>
                                    <span className="text-xl font-bold text-green-600">
                                        {invoice.sellingAmount ?
                                            calculateAnnualYield(invoice.requestedAmount || invoice.amount, invoice.sellingAmount, invoice.dueDate).toFixed(1)
                                            : '0.0'}%
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-400 text-right mt-1">
                                    {invoice.saleType === 'partial' ? '※譲渡対象金額に対する年率 / ' : ''}期日までの日割り計算
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500 flex items-center gap-2"><Calendar size={16} /> 入金期日</span>
                                <span className="font-bold">{invoice.dueDate}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">取引先企業名</span>
                                <span className="font-bold">{invoice.isClientNamePublic ? (invoice.debtorName || '未設定') : '*** (非公開)'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">取引先郵便番号</span>
                                <span className="font-medium">{invoice.isClientAddressPublic ? (invoice.debtorPostalCode ? `〒 ${invoice.debtorPostalCode}` : '未設定') : '*** (非公開)'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">取引先所在地</span>
                                <span className="font-medium">{invoice.isClientAddressPublic ? (invoice.debtorAddress || '未設定') : '*** (非公開)'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">企業規模</span>
                                <span className="font-medium">{translateCompanySize(invoice.companySize)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-slate-500 font-medium block">信用情報 / 備考</span>
                            <div className="bg-slate-50 p-3 rounded text-slate-700 leading-relaxed">
                                {invoice.companyCredit}
                            </div>
                        </div>
                    </div>

                    {invoice.evidenceUrl && (
                        <div className="border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <FileText size={12} /> 証拠書類
                            </h4>
                            <button
                                onClick={handleViewEvidence}
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                                {invoice.evidenceName || '書類を表示 (プレビュー/ダウンロード)'}
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-6 border-t">
                        {existingDeal ? (
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-orange-800 text-lg mb-1">交渉中の案件です</h3>
                                    <p className="text-sm text-orange-600">
                                        現在の提示額: ¥{existingDeal.currentAmount?.toLocaleString() || 'なし'}
                                    </p>
                                </div>
                                <Button onClick={() => navigate(`/chat?dealId=${existingDeal.id}`)}>
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    チャットへ戻る
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center flex flex-col items-center gap-4">
                                <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full">
                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto px-12 bg-indigo-600 hover:bg-indigo-700"
                                        onClick={async () => {
                                            if (user && ['open', 'pending', 'negotiating'].includes(invoice.status)) {
                                                const newDeal = await createChatRoom(invoice.id, user.id);
                                                if (newDeal) {
                                                    navigate(`/chat?dealId=${newDeal.id}`);
                                                }
                                            }
                                        }}
                                        disabled={!['open', 'pending', 'negotiating'].includes(invoice.status)}
                                    >
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        {['open', 'pending', 'negotiating'].includes(invoice.status) ? '交渉を開始する（チャット画面へ遷移）' : 'この案件は終了しました'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};
