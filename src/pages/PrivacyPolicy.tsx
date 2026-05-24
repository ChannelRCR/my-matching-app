import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        プライバシーポリシー
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
                        
                        <p>
                            株式会社日本RCR（以下「当社」といいます）は、当社の提供するサービス（以下「本サービス」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
                        </p>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">1. 事業者情報</h2>
                            <div className="space-y-2 pl-4">
                                <p><strong>法人名：</strong>株式会社日本RCR</p>
                                <p><strong>所在地：</strong>〒102-0073 東京都千代田区九段北一丁目１０－３ animo kudan ６０１号</p>
                                <p><strong>代表者：</strong>お問い合わせフォームよりご請求いただければ遅滞なく開示いたします。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">2. 個人情報の収集方法</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、クレジットカード番号などの個人情報をお尋ねすることがあります。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">3. 個人情報を収集・利用する目的</h2>
                            <div className="space-y-2 pl-4">
                                <p>当社が個人情報を収集・利用する目的は、以下のとおりです。</p>
                                <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-2 marker:text-primary">
                                    <li>当社サービスの提供・運営のため</li>
                                    <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                                    <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">4. お問い合わせ窓口</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本ポリシーに関するお問い合わせは、本サービス内のお問い合わせフォームよりお願いいたします。
                                </p>
                            </div>
                        </section>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
