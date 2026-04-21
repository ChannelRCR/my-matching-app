import React, { useState } from 'react';
import { ChevronDown, HelpCircle, X, Send } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// TODO: 後で運営の実際のアドレスに書き換えてください
const ADMIN_EMAIL = "TODO_ADMIN_ADDRESS";

const faqs = [
  {
    v: 'Q1',
    q: '利用料金や月額費用はかかりますか？',
    a: '本システムは、完全無料です。但し、サイト・プラットフォームの維持には、当然経費が発生しております。そこで、ご利用者からの任意の手数料をいただいております。是非とも、ご協力ください。'
  },
  {
    v: 'Q2',
    q: '個人情報や企業情報は安全に保護されますか？',
    a: 'はい、厳重に保護されます。一覧画面では企業名などをマスキングして公開し、取引の意思が確認できるまで詳細情報は開示されません。また、システムは最新のセキュリティ基準で守られています。'
  },
  {
    v: 'Q3',
    q: '万が一、取引相手との間でトラブルがあった場合は？',
    a: '本システムは、譲渡人と譲受人との契約締結の場を提供するものであり、運営者がトラブル解決にご協力することはできません。仲裁の場をシステムとしてご提供をしておりますので、先ずは双方で協議の上、解決願います。最終的な和解合意に至らない場合は、チャットの履歴、取引相手方から提示された資料、当プラットフォームの約款、契約書PDF、送金履歴等の資料に基づき、弁護士等の専門家にご相談ください。'
  },
  {
    v: 'Q4',
    q: '「ファクタリング」は「借金（貸金）」とは違うのですか？',
    a: 'はい、全く異なります。ファクタリングは「お持ちの売掛金（請求書）を売却して期日より前に現金化する」仕組みであり、借入（負債）ではありません。そのため信用情報への影響もなく、担保や保証人も不要です。'
  }
];

export const HelpPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    
    // Contact Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // 土台としてEdge Function呼び出しの構造を作成。
            // 実際のアドレス (ADMIN_EMAIL) 宛に送信するロジックを想定。
            /*
            await supabase.functions.invoke('send-inquiry', {
                body: {
                    to: ADMIN_EMAIL,
                    userName: name,
                    userEmail: email,
                    message: message,
                }
            });
            */
            
            // 現在はダミーの遅延を入れています
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setToastMessage('お問い合わせを受け付けました。順次返信いたします。');
            setTimeout(() => setToastMessage(null), 5000);
            
            // フォームリセット
            setName('');
            setEmail('');
            setMessage('');
            setIsContactModalOpen(false);
            
        } catch (error) {
            console.error('Error sending inquiry:', error);
            alert('送信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 min-h-[70vh] relative">
            {toastMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <span className="font-bold text-sm">{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70">
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-6 shadow-sm">
                    <HelpCircle className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight sm:text-4xl mb-4">よくあるご質問（FAQ）</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    ユーザーの皆様から多く寄せられるご質問をまとめました。<br className="hidden sm:block" />
                    サービスを安全・快適にご利用いただくための情報をご確認ください。
                </p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <Card key={index} className={`overflow-hidden border transition-all duration-300 ${isOpen ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                            <CardContent className="p-0">
                                <button
                                    onClick={() => toggleAccordion(index)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none bg-white"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`font-black text-xl w-8 shrink-0 ${isOpen ? 'text-blue-600' : 'text-slate-400'}`}>{faq.v}</span>
                                        <span className={`font-bold text-lg leading-snug ${isOpen ? 'text-blue-900' : 'text-slate-800'}`}>{faq.q}</span>
                                    </div>
                                    <ChevronDown
                                        className={`w-6 h-6 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
                                    />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <div className="px-6 pb-6 pt-2 pl-[4.5rem] bg-blue-50/30">
                                        <p className="text-slate-700 leading-relaxed font-medium">
                                            {faq.a}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-16 text-center bg-slate-50 flex flex-col items-center rounded-2xl p-8 border border-slate-200">
                <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold py-3 px-8 rounded-full transition-all shadow-sm flex items-center gap-2"
                >
                    お問い合わせはこちら
                </button>
            </div>

            {/* お問い合わせモーダル */}
            {isContactModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
                    <Card className="w-full max-w-lg bg-white relative">
                        <button 
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            onClick={() => setIsContactModalOpen(false)}
                        >
                            <X size={20} />
                        </button>
                        <CardContent className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Send className="w-5 h-5 text-primary" />
                                お問い合わせ
                            </h2>
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">お名前 <span className="text-red-500">*</span></label>
                                    <Input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required 
                                        placeholder="例：山田 太郎"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">返信用メールアドレス <span className="text-red-500">*</span></label>
                                    <Input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                        placeholder="例：yamada@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">お問い合わせ内容 <span className="text-red-500">*</span></label>
                                    <textarea 
                                        className="w-full rounded-md border border-slate-300 p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        placeholder="ご質問やご相談内容をご記入ください..."
                                    />
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    <Button type="button" variant="ghost" onClick={() => setIsContactModalOpen(false)}>
                                        キャンセル
                                    </Button>
                                    <Button type="submit" className="bg-primary px-6" disabled={isSubmitting}>
                                        {isSubmitting ? '送信中...' : '送信する'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
