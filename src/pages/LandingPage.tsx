import React from 'react';
import {
    TrendingUp, LineChart, DollarSign, Clock, ShieldCheck,
    Zap, Layers, ArrowRight, UserPlus, Search,
    Handshake, CheckCircle2, Building2, Briefcase
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useMarket } from '../contexts/MarketContext';
import { useNavigate } from 'react-router-dom';
import { PublicDealsBoard } from '../components/PublicDealsBoard';
import { TeaserDealsBoard } from '../components/TeaserDealsBoard';

export const LandingPage: React.FC = () => {
    const { stats } = useMarket();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            {/* Market Statistics Ticker (Refined) */}
            <div className="bg-slate-900 text-slate-300 py-2.5 overflow-hidden border-b border-slate-800 text-xs sm:text-sm">
                <div className="container mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12 font-medium tracking-wide">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span>平均割引率:</span>
                        <span className="text-white font-bold">{stats.averageDiscountRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-blue-400" />
                        <span>今月の取引総額:</span>
                        <span className="text-white font-bold">¥{stats.totalVolume.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-400" />
                        <span>平均資金化スピード:</span>
                        <span className="text-white font-bold">{stats.avgFundingDays}日</span>
                    </div>
                </div>
            </div>

            {/* 1. Hero Section */}
            <section className="relative bg-slate-900 text-white py-24 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900/90 z-0"></div>
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <span className="inline-block py-1.5 px-3 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-sm font-semibold tracking-wider mb-6">
                            次世代の債権流動化プラットフォーム
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 leading-tight tracking-tight text-white drop-shadow-sm">
                            2者間ファクタリングに、<br className="hidden md:block" />
                            透明な市場原理を。
                        </h1>
                        <p className="text-lg md:text-xl mb-12 text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
                            取引先に知られない隠密性はそのままに。<br />
                            全国の優良な買い手との自由競争により、事業の粗利を圧迫しない『適正な割引率』での資金調達を実現します。
                        </p>
                        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full sm:w-auto h-14 px-8 text-base shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all rounded-xl"
                                onClick={() => navigate('/register?role=seller')}
                            >
                                売り手として無料登録
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button
                                size="lg"
                                className="bg-white hover:bg-slate-100 text-slate-900 font-bold w-full sm:w-auto h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all rounded-xl border border-slate-200"
                                onClick={() => navigate('/register?role=buyer')}
                            >
                                買い手として無料登録
                                <Briefcase className="ml-2 w-5 h-5 text-slate-500" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Features */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                            プラットフォームの3つの特徴
                        </h2>
                        <p className="text-lg text-slate-600">
                            テクノロジーと透明性が、B2B金融のこれまでの常識を変えます。
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Feature 1 */}
                        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">実績ベースの強固な信用モデル</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                従来の「足元を見る取引」を排除。プラットフォーム上での完遂履歴が強固な「信用（Track Record）」となり、システムがあなたを証明します。
                            </p>
                        </div>
                        {/* Feature 2 */}
                        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">柔軟で迅速な直接取引</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                当事者間での直接交渉や、取引先に知られない二社間ファクタリングを活用し、中間マージンを省いたスピーディな資金調達を実現します。
                            </p>
                        </div>
                        {/* Feature 3 */}
                        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Layers size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">多様な債権フォーマットに対応</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                一般的な売掛金から貸付金まで、幅広いアセットクラスの流動化をサポート。ビジネスの状況に応じた最適な資金化アプローチを選択できます。
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Benefits */}
            <section className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                            参加者それぞれのメリット
                        </h2>
                        <p className="text-lg text-slate-600">
                            売り手と買い手、双方がWin-Winとなるエコシステムを提供します。
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
                        {/* Seller Benefits */}
                        <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                                        <Building2 size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">売り手 (Seller) のメリット</h3>
                                </div>
                                <ul className="space-y-6">
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">最短即日の資金化</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">煩雑な手続きをシステム化し、マッチング後すぐに資金を調達可能。</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">取引先に知られない二社間契約</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">売却の事実を取引先に通知しない二社間ファクタリングで、信用不安を防ぎます。</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">透明性の高い手数料</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">運営手数料はゼロ。投資家との直接交渉による割引料のみがコストとなり、非常に透明です。</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Buyer Benefits */}
                        <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
                                        <LineChart size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">買い手 (Buyer) のメリット</h3>
                                </div>
                                <ul className="space-y-6">
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">優良な債権への直接投資</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">従来は金融機関に限られていた魅力的なアセットに、法人・個人問わず直接投資できます。</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">システムが証明する確かな取引実績</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">売り手の過去の完済履歴や遅延スコアがシステムに刻まれるため、信用度を客観的に判断できます。</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 items-start">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg mb-1">短い運用期間での資産運用</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">売掛金は通常1〜2ヶ月で決済されるため、短期で資金を回転させることが可能です。</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. How it works */}
            <section className="py-24 bg-white border-t border-slate-200 overflow-hidden">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                            簡単な利用の流れ
                        </h2>
                        <p className="text-lg text-slate-600">
                            登録から取引完了まで、セキュアでスムーズなプロセス。
                        </p>
                    </div>

                    <div className="relative">
                        {/* Connecting Line (Hidden on mobile) */}
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                                    <UserPlus className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2">1. 会員登録</h4>
                                <p className="text-sm text-slate-500 px-2">簡単なフォーム入力でアカウントを作成</p>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                                    <Search className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2">2. 案件の登録・検索</h4>
                                <p className="text-sm text-slate-500 px-2">債権の出品、または投資したい案件を探索</p>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                                    <Handshake className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2">3. 条件交渉</h4>
                                <p className="text-sm text-slate-500 px-2">専用チャットで買取条件や日程を調整</p>
                            </div>

                            {/* Step 4 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all duration-300">
                                    <ShieldCheck className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2">4. マッチング</h4>
                                <p className="text-sm text-slate-500 px-2">条件合意後、オンラインで契約締結</p>
                            </div>

                            {/* Step 5 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-16 h-16 bg-blue-600 border-2 border-blue-600 rounded-full flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform duration-300">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-blue-700 mb-2">5. 決済・実績獲得</h4>
                                <p className="text-sm text-slate-500 px-2">資金移動と同時に、プラットフォーム上の実績として蓄積</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Teaser Deals Section (Open Invoices) */}
            <section className="py-24 bg-slate-100 border-t border-slate-200">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            現在募集中の優良案件
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            当プラットフォームで現在買い手を募集している案件の一部を公開しています。<br />
                            詳細な情報や購入交渉を進めるには、無料の買い手登録が必要です。
                        </p>
                    </div>

                    <TeaserDealsBoard />
                </div>
            </section>

            {/* Public Deals Board Section */}
            <section className="py-24 bg-white border-t border-slate-200">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            実績が証明する、確かな取引市場
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            当プラットフォームで成立した案件のトランザクションを公開しています。<br />
                            自由競争による適正なディスカウントと、参加者の透明な「信用」をご確認ください。
                        </p>
                    </div>

                    <PublicDealsBoard />

                    <div className="mt-16 text-center">
                        <p className="text-slate-500 mb-6">すべての募集案件や詳細情報を閲覧するには、無料のアカウント登録が必要です。</p>
                        <Button
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 h-14 rounded-xl shadow-md transition-all"
                            onClick={() => navigate('/register?role=seller')}
                        >
                            今すぐプラットフォームに参加する
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

