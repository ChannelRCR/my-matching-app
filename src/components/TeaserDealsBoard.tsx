import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Calendar, Building2, User, Lock, ArrowRight, ShieldCheck, DollarSign, TrendingUp, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateAnnualYield } from '../utils/calculations';
import { translateCompanySize } from '../utils/translations';

interface PublicOpenInvoice {
    id: string;
    masked_amount: number | null;
    masked_selling_amount: number | null;
    due_date: string | null;
    claim_type: string | null;
    debtor_industry: string | null;
    debtor_company_size: string | null;
    seller_region: string | null;
    seller_industry: string | null;
    status: string;
    created_at: string;
}

export const TeaserDealsBoard: React.FC = () => {
    const [invoices, setInvoices] = useState<PublicOpenInvoice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showRegistrationDialog, setShowRegistrationDialog] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('public_open_invoices_view')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching public open invoices view:', error);
            } else if (data) {
                setInvoices(data as PublicOpenInvoice[]);
            }
            setLoading(false);
        };
        fetchInvoices();
    }, []);

    const handleActionClick = () => {
        setShowRegistrationDialog(true);
    };

    const handleRegister = () => {
        navigate('/register?role=buyer');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                <Search className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                <p className="text-lg text-slate-600 font-bold mb-2">現在公開中の募集案件はありません</p>
                <p className="text-sm text-slate-500 mb-6">常に新しい案件が登録されています。無料登録して最新情報を受け取りましょう。</p>
                <Button onClick={handleRegister} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 shadow-md">
                    無料の買い手登録へ進む
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices.map((inv) => {
                    // Logic for displaying days remaining
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let daysLimit = 0;
                    if (inv.due_date) {
                        const dueDate = new Date(inv.due_date);
                        const diffTime = dueDate.getTime() - today.getTime();
                        daysLimit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    // Masked yield calculation (approximate)
                    let yieldEst = '---';
                    if (inv.masked_amount && inv.masked_selling_amount && inv.due_date) {
                        try {
                            const yi = calculateAnnualYield(inv.masked_amount, inv.masked_selling_amount, inv.due_date);
                            // Avoid showing exactly precise yield to maintain teasing, but close enough.
                            yieldEst = yi > 0 ? yi.toFixed(1) : '---';
                        } catch(e) {}
                    }

                    // Format amounts
                    const formatMaskedAmount = (amount: number | null) => {
                        if (!amount) return '非公開';
                        if (amount >= 10000) {
                            return `${Math.floor(amount / 10000).toLocaleString()}万円位`;
                        }
                        return `${amount.toLocaleString()}円位`;
                    };

                    return (
                        <Card key={inv.id} className="flex flex-col hover:shadow-xl transition-all duration-300 border-slate-200 group overflow-hidden bg-white relative">
                            {/* Blurry secure element on top corner */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100 to-transparent opacity-50 z-0"></div>
                            
                            <CardContent className="p-5 flex-1 flex flex-col z-10">
                                {/* Header / Labels */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded font-bold border border-blue-200">
                                            {inv.claim_type || '売掛金'}
                                        </span>
                                        <span className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded font-bold border border-green-200 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            審査済
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5"><Calendar className="w-3 h-3 inline mr-1"/>入金期日まで</span>
                                        <span className="text-sm font-black text-rose-600">残り {daysLimit > 0 ? daysLimit : 0} 日</span>
                                    </div>
                                </div>

                                {/* Masked Participants */}
                                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-4 space-y-3">
                                    {/* Seller */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 mb-0.5">資金調達者 (売主)</div>
                                            <div className="font-bold text-slate-800 text-sm truncate">
                                                {inv.seller_industry} <span className="text-slate-400 text-xs font-medium ml-1">({inv.seller_region})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-slate-200"></div>
                                    {/* Debtor */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 mb-0.5">取引先 (第三債務者)</div>
                                            <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                                                {inv.debtor_industry || '業種非公開'} 
                                                <span className="text-slate-400 text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {translateCompanySize(inv.debtor_company_size) || '規模非公開'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financials (Tease) */}
                                <div className="space-y-4 mb-5">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <span className="text-slate-500 text-sm font-medium">債権額面 (マスキング済)</span>
                                        <span className="font-bold text-slate-700 blur-[2px] transition-all duration-300 group-hover:blur-0 select-none">
                                            ¥{formatMaskedAmount(inv.masked_amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                                        <span className="text-indigo-800 font-bold text-sm flex items-center gap-1">
                                            <DollarSign className="w-4 h-4" />売却希望額
                                        </span>
                                        <span className="font-black text-indigo-700 text-lg blur-[2px] transition-all duration-300 group-hover:blur-0 select-none">
                                            ¥{formatMaskedAmount(inv.masked_selling_amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-slate-500 text-sm font-medium">想定利回り目安 (年率)</span>
                                        <span className="font-bold text-emerald-600 text-lg flex items-center gap-1 blur-[3px] transition-all duration-300 group-hover:blur-0 select-none">
                                            <TrendingUp className="w-4 h-4" />{yieldEst}%
                                        </span>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <div className="mt-auto">
                                    <Button 
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold shadow-md relative overflow-hidden" 
                                        onClick={handleActionClick}
                                    >
                                        <Lock className="w-4 h-4 mr-2 opacity-70" />
                                        詳細な情報を閲覧する
                                        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                                            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-[shimmer_2.5s_infinite]"></div>
                                        </div>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Registration Dialog */}
            {showRegistrationDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 text-center relative">
                            <button 
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                                onClick={() => setShowRegistrationDialog(false)}
                            >
                                ✕
                            </button>
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">詳細情報の閲覧は限定されています</h3>
                            <p className="text-sm text-slate-500 leading-relaxed text-left">
                                詳細な企業情報、正式な譲渡対象金額、エビデンス（契約書・請求書等）の閲覧、および購入のオファーを行うには、無料の会員登録が必要です。
                            </p>
                        </div>
                        <div className="p-6 bg-white space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> 登録ユーザーのメリット
                                </h4>
                                <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside px-1">
                                    <li>全案件の詳細情報が見放題</li>
                                    <li>プラットフォームを通じた安全な直接交渉</li>
                                    <li>透明な実績データの閲覧</li>
                                </ul>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                                <Button 
                                    size="lg" 
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full h-12 shadow-md"
                                    onClick={handleRegister}
                                >
                                    無料で買い手として登録する
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full font-bold text-slate-600 border-slate-300"
                                    onClick={() => setShowRegistrationDialog(false)}
                                >
                                    もう少し案件一覧を見る
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
            `}</style>
        </div>
    );
};
