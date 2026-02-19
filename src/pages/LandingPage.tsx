import React from 'react';
import { TrendingUp, Wallet, Scale, LineChart, Handshake, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useMarket } from '../contexts/MarketContext';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
    const { stats } = useMarket();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Market Statistics Ticker */}
            <div className="bg-slate-900 text-white py-3 overflow-hidden border-b border-slate-700">
                <div className="container mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-mono tracking-wide">
                    <div className="flex items-center gap-2 text-green-400">
                        <TrendingUp size={16} />
                        <span className="text-slate-400">平均割引率:</span>
                        <span className="font-bold text-lg">{stats.averageDiscountRate}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400">
                        <DollarSign size={16} />
                        <span className="text-slate-400">今月の取引総額:</span>
                        <span className="font-bold text-lg">¥{stats.totalVolume.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400">
                        <Clock size={16} />
                        <span className="text-slate-400">平均資金化スピード:</span>
                        <span className="font-bold text-lg">{stats.avgFundingDays}日</span>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary to-accent text-white py-24 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
                <div className="container mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                        ビジネスの資金と投資家をつなぐ、<br />
                        <span className="text-[var(--color-gold)]">完全自由な債権流動化市場</span>
                    </h1>
                    <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
                        管理者は介入しない。手数料はゼロ。<br />
                        透明な情報と規律ある参加者によって作られる、次世代のエコシステム。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Button
                            size="lg"
                            className="bg-white text-primary hover:bg-slate-100 font-bold w-full sm:w-auto h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all"
                            onClick={() => navigate('/register?role=seller')}
                        >
                            売り手として登録（資金調達）
                        </Button>
                        <Button
                            size="lg"
                            className="bg-[var(--color-gold)] text-white hover:bg-amber-600 font-bold w-full sm:w-auto h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all border-none"
                            onClick={() => navigate('/register?role=buyer')}
                        >
                            買い手として登録（投資）
                        </Button>
                    </div>
                </div>
            </section>

            {/* Compliance & Enlightenment Section */}
            <section className="py-20 bg-slate-50 border-b border-slate-200">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-center mb-6">
                            <Scale size={48} className="text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-center mb-8 text-slate-800">
                            健全な市場のための「自律」と「責任」
                        </h2>
                        <div className="space-y-6 text-slate-700 leading-relaxed">
                            <p className="text-lg text-center font-medium">
                                当プラットフォームは、すべての参加者に<span className="text-primary font-bold">「法令遵守」</span>と<span className="text-primary font-bold">「自己責任」</span>を求めます。
                                運営者は取引に介入しません。
                            </p>
                            <div className="grid md:grid-cols-2 gap-8 mt-8">
                                <div className="bg-slate-50 p-6 rounded-lg">
                                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                        <ShieldCheck className="text-primary" size={24} />
                                        売り手・買い手双方の義務
                                    </h3>
                                    <ul className="list-disc list-inside space-y-2 text-sm">
                                        <li>正確かつ最新の情報を提供すること</li>
                                        <li>契約に基づく義務を誠実に履行すること</li>
                                        <li>関係法令および利用規約を遵守すること</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-lg">
                                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                        <Handshake className="text-primary" size={24} />
                                        自由で公平な取引環境
                                    </h3>
                                    <ul className="list-disc list-inside space-y-2 text-sm">
                                        <li>取引手数料は原則無料（寄付制）</li>
                                        <li>市場統計（平均割引率など）の完全公開</li>
                                        <li>透明性の高い直接取引</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Comparison Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-slate-900">
                        プラットフォームを利用するメリット
                    </h2>

                    <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Seller Benefits */}
                        <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <Wallet size={32} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">売り手（資金調達者）</h3>
                                    <p className="text-slate-500 font-medium">資金繰りを改善したい経営者様</p>
                                </div>
                            </div>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="bg-white p-2 h-fit rounded-lg shadow-sm text-primary font-bold min-w-[3rem] text-center">01</div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">手数料無料・低コスト</h4>
                                        <p className="text-slate-600">運営手数料は0円。かかるコストは投資家への割引料のみ。圧倒的な低コストで資金調達が可能です。</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="bg-white p-2 h-fit rounded-lg shadow-sm text-primary font-bold min-w-[3rem] text-center">02</div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">迅速な資金調達</h4>
                                        <p className="text-slate-600">オンライン完結のため、最短即日から数日でのスピーディーな資金化が可能です。</p>
                                    </div>
                                </li>
                            </ul>
                            <div className="mt-8 text-center">
                                <Button className="w-full bg-primary hover:bg-blue-700" onClick={() => navigate('/register?role=seller')}>売り手として登録する</Button>
                            </div>
                        </div>

                        {/* Buyer Benefits */}
                        <div className="bg-amber-50/50 rounded-2xl p-8 border border-amber-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-amber-100 p-3 rounded-full">
                                    <LineChart size={32} className="text-[var(--color-gold)]" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">買い手（投資家）</h3>
                                    <p className="text-slate-500 font-medium">新しい投資先をお探しの皆様</p>
                                </div>
                            </div>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="bg-white p-2 h-fit rounded-lg shadow-sm text-[var(--color-gold)] font-bold min-w-[3rem] text-center">01</div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">高い収益性</h4>
                                        <p className="text-slate-600">従来の金融商品とは異なる、魅力的な利回り（割引率）での運用が可能です。</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="bg-white p-2 h-fit rounded-lg shadow-sm text-[var(--color-gold)] font-bold min-w-[3rem] text-center">02</div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">短期・低ボラティリティ</h4>
                                        <p className="text-slate-600">原則1〜2ヶ月の短期運用。市場価格の変動がなく、債権回収リスクの管理に集中できます。</p>
                                    </div>
                                </li>
                            </ul>
                            <div className="mt-8 text-center">
                                <Button className="w-full bg-[var(--color-gold)] hover:bg-amber-600 border-none text-white" onClick={() => navigate('/register?role=buyer')}>買い手として登録する</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-slate-900 text-white text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-6">さあ、新しい資金の流れを作りましょう</h2>
                    <p className="text-xl opacity-80 mb-10">
                        登録は無料です。まずはアカウントを作成してください。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            className="bg-white text-slate-900 hover:bg-slate-100 px-8 w-full sm:w-auto"
                            onClick={() => navigate('/register?role=seller')}
                        >
                            売り手登録
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white text-white hover:bg-white/10 px-8 w-full sm:w-auto"
                            onClick={() => navigate('/register?role=buyer')}
                        >
                            買い手登録
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};
