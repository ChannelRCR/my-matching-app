import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Calendar, Building2, User, CheckCircle2, ArrowRight } from 'lucide-react';

type TabType = 'contracted' | 'completed';

interface PublicDeal {
    id: string;
    status: string;
    payment_status: string | null;
    invoice_amount: number | null;
    current_amount: number | null;
    seller_name: string | null;
    buyer_name: string | null;
    started_at: string;
    last_message_at: string | null;
    updated_at: string;
}

export const PublicDealsBoard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('contracted');
    const [publicDeals, setPublicDeals] = useState<PublicDeal[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPublicDeals = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('public_deals_view').select('*');
            if (error) {
                console.error('Error fetching public deals view:', error);
            } else if (data) {
                setPublicDeals(data as PublicDeal[]);
            }
            setLoading(false);
        };
        fetchPublicDeals();
    }, []);

    // 成約案件（決済待ち or 支払い待ち等）
    const contractedDeals = useMemo(() => {
        const statuses = ['contract_agreed', 'settlement_pending', 'repayment_pending', 'agreed', 'pending'];
        return publicDeals
            .filter(d => statuses.includes(d.status) || statuses.includes(d.payment_status || ''))
            .sort((a, b) => new Date(b.last_message_at || b.started_at).getTime() - new Date(a.last_message_at || a.started_at).getTime());
    }, [publicDeals]);

    // 完了案件（完全決済済み）
    const completedDeals = useMemo(() => {
        return publicDeals
            .filter(d => d.payment_status === 'fully_settled' || d.status === 'concluded')
            .sort((a, b) => new Date(b.last_message_at || b.started_at).getTime() - new Date(a.last_message_at || a.started_at).getTime());
    }, [publicDeals]);

    const displayDeals = activeTab === 'contracted' ? contractedDeals : completedDeals;

    const formatDate = (dateString: string) => {
        if (!dateString) return '未定';
        const date = new Date(dateString);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return (
        <Card className="w-full bg-white shadow-xl rounded-2xl border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6 border-b border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-blue-400">Public Board</span>
                            <span>公開取引台帳</span>
                        </CardTitle>
                        <p className="text-slate-400 text-sm mt-2">
                            ※システムが証明する取引実績（Track Record）。第三債務者情報は一切公開されません。
                        </p>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('contracted')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'contracted'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            成約案件
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'completed'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            完了案件
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">取引ステータス</th>
                                <th className="px-6 py-4">資金調達者 (売り手)</th>
                                <th className="px-6 py-4">投資家 (買い手)</th>
                                <th className="px-6 py-4 hidden sm:table-cell">取引金額 (債権額 ➔ 売却額)</th>
                                <th className="px-6 py-4">取引成約日</th>
                                {activeTab === 'completed' && <th className="px-6 py-4 hidden md:table-cell">取引完了日</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        案件データを読み込み中...
                                    </td>
                                </tr>
                            ) : displayDeals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        現在表示できる案件データはありません。
                                    </td>
                                </tr>
                            ) : (
                                displayDeals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {activeTab === 'contracted' ? (
                                                <div className="flex items-center gap-2">
                                                    {deal.started_at && (new Date().getTime() - new Date(deal.started_at).getTime() < 24 * 60 * 60 * 1000) && (
                                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold border border-red-200">NEW</span>
                                                    )}
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                                        成約・決済進行中
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 w-fit">
                                                    <CheckCircle2 size={12} />
                                                    取引完了
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                                            <Building2 size={16} className="text-slate-400 hidden sm:block" />
                                            {deal.seller_name || '不明な売り手'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <User size={16} className="text-slate-400 hidden sm:block" />
                                                <span className={!deal.buyer_name || deal.buyer_name === '非公開の投資家' ? 'italic text-slate-500' : 'font-medium'}>
                                                    {deal.buyer_name || '非公開の投資家'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-slate-400 line-through text-xs">
                                                    ¥{(deal.invoice_amount || 0).toLocaleString()}
                                                </span>
                                                <ArrowRight size={14} className="text-slate-300" />
                                                <span className="font-mono font-bold text-slate-800 text-sm">
                                                    ¥{(deal.current_amount || deal.invoice_amount || 0).toLocaleString()}
                                                </span>
                                                {(deal.invoice_amount || 0) > 0 && deal.current_amount && deal.current_amount < deal.invoice_amount! ? (
                                                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 ml-1 py-0 px-1.5 text-[10px]">
                                                        -{((1 - deal.current_amount / deal.invoice_amount!) * 100).toFixed(1)}%
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {formatDate(deal.started_at)}
                                        </td>
                                        {activeTab === 'completed' && (
                                            <td className="px-6 py-4 text-slate-800 font-medium hidden md:table-cell">
                                                {formatDate(deal.updated_at || deal.last_message_at || deal.started_at)}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
