import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const CommercialTransactions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        特定商取引法に基づく表記
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">販売事業者名（商号）</div>
                            <div className="md:col-span-2">株式会社日本RCR</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">所在地</div>
                            <div className="md:col-span-2">〒102-0073 東京都千代田区九段北一丁目１０－３ animo kudan ６０１号</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">代表者名（運営責任者）</div>
                            <div className="md:col-span-2">和田直樹</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">連絡先メールアドレス</div>
                            <div className="md:col-span-2">factormaching@gmail.com</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">電話番号</div>
                            <div className="md:col-span-2">上記メールアドレスよりご請求いただければ、遅滞なく開示いたします。</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">支援金（投げ銭）の金額</div>
                            <div className="md:col-span-2">当サービスは原則無料でご利用いただけます。任意の支援機能をご利用の場合は、ユーザーがプラットフォーム上で決定した金額とします。</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">代金の支払時期および方法</div>
                            <div className="md:col-span-2">クレジットカード決済（Stripe）等、当サービスが定める支払い方法によるものとします。支払時期は各カード会社の規定によります。</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">サービスの提供時期</div>
                            <div className="md:col-span-2">決済完了後、直ちにご利用いただけます。</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                            <div className="font-bold text-slate-800 md:col-span-1">キャンセル・返金について</div>
                            <div className="md:col-span-2">サービスの性質上、決済完了後のキャンセルおよび返金はお受けしておりません。</div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
