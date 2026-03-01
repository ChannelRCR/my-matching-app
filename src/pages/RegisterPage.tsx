import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Briefcase, Wallet, LineChart } from 'lucide-react';
import type { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Default role from URL ?role=seller or ?role=buyer
    const defaultRole = (searchParams.get('role') as UserRole) || 'seller';

    const [role, setRole] = useState<UserRole>(defaultRole);

    // Auth fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Basic profile fields
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');

    // Detailed profile fields
    const [formData, setFormData] = useState({
        tradeName: '',
        representativeName: '',
        contactPerson: '',
        address: '',
        bankAccountInfo: '',
        phoneNumber: '',
        emailAddress: '',
    });

    const [privacySettings, setPrivacySettings] = useState({
        tradeName: true,
        representativeName: true,
        contactPerson: true,
        address: true,
        bankAccountInfo: true,
        phoneNumber: true,
        emailAddress: true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const togglePrivacy = (field: string) => {
        // @ts-ignore
        setPrivacySettings(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Pre-validation
        if (!email || !password || !name || !companyName) {
            setError('必須項目（氏名、社名、メールアドレス、パスワード）が入力されていません。');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください');
            setLoading(false);
            return;
        }

        if (role === 'seller') {
            if (!formData.phoneNumber || !formData.address || !formData.bankAccountInfo) {
                setError('売り手（資金調達）として登録する場合、電話番号、住所、入金口座情報は必須項目です。');
                setLoading(false);
                return;
            }
        } else {
            if (!formData.phoneNumber) {
                setError('連絡先電話番号は必須項目です。');
                setLoading(false);
                return;
            }
        }

        if (!isConfirming) {
            setIsConfirming(true);
            setLoading(false);
            return;
        }

        const { error: signUpError } = await signUp(email, password, role, {
            name,
            companyName,
            ...formData,
            contactPerson: formData.contactPerson || name, // フォールバック: 空の場合は担当者氏名を使用
            privacySettings
        });

        if (signUpError) {
            console.error(signUpError);
            if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already in use') || signUpError.status === 422) {
                setError('このメールアドレスは既に登録されています。ログインするか、別のアドレスを使用してください。');
            } else {
                setError(signUpError.message || '登録に失敗しました。');
            }
            setLoading(false);
        } else {
            // Success
            alert('登録が完了しました！');
            if (role === 'seller') {
                navigate('/seller/dashboard');
            } else {
                navigate('/buyer/dashboard');
            }
        }
    };

    const renderInputWithPrivacy = (label: string, field: keyof typeof formData, placeholder: string = "", type: string = "text") => (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <div className="flex items-center gap-2 text-xs">
                    <span className={privacySettings[field] ? "text-blue-600 font-bold" : "text-slate-400"}>
                        {privacySettings[field] ? "公開" : "非公開"}
                    </span>
                    <button
                        type="button"
                        onClick={() => togglePrivacy(field as any)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${privacySettings[field] ? 'bg-primary' : 'bg-slate-200'
                            }`}
                    >
                        <span
                            className={`${privacySettings[field] ? 'translate-x-5' : 'translate-x-1'
                                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                </div>
            </div>
            <Input
                value={formData[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
                type={type}
                required
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-primary tracking-tight mb-8">
                <Briefcase className="h-8 w-8" />
                <span>FactorMatch</span>
            </Link>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-center">新規アカウント登録</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setRole('seller')}
                            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${role === 'seller'
                                ? 'border-primary bg-blue-50 text-primary'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                }`}
                        >
                            <Wallet size={24} />
                            <span className="font-bold text-sm">売り手 (資金調達)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('buyer')}
                            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${role === 'buyer'
                                ? 'border-[var(--color-gold)] bg-amber-50 text-amber-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                }`}
                        >
                            <LineChart size={24} />
                            <span className="font-bold text-sm">買い手 (投資)</span>
                        </button>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-sm text-yellow-800">
                        <strong>重要なお知らせ：</strong><br />
                        ご登録いただく連絡先や口座情報は、通常時はプロフィールの設定に従い公開/非公開が制御されます。<br />
                        <span className="font-bold text-red-600">なお、クロージング（契約締結）の際には、{role === 'seller' ? '買い手' : '売り手'}に全てオープンとなります。</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="氏名 (担当者名)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="会社名 / 屋号"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <h3 className="font-bold text-slate-700">詳細プロフィール情報</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderInputWithPrivacy("代表者名", "representativeName", "例: 山田 太郎")}
                                {renderInputWithPrivacy("連絡先電話番号", "phoneNumber", "例: 03-1234-5678", "tel")}
                            </div>

                            {renderInputWithPrivacy("住所", "address", "例: 東京都千代田区...")}
                            {renderInputWithPrivacy("入金口座（本人名義）", "bankAccountInfo", "例: ○○銀行 ××支店 普通 1234567")}
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="font-bold text-slate-700 mb-2">ログイン情報</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="メールアドレス (このメールアドレスがログインIDとなります)"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <div className="space-y-2">
                                    <Input
                                        label="パスワード (6文字以上)"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showPassword"
                                            checked={showPassword}
                                            onChange={(e) => setShowPassword(e.target.checked)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="showPassword" className="text-sm text-slate-600 cursor-pointer">
                                            ☑ パスワードを表示する
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        {isConfirming ? (
                            <div className="space-y-4 p-6 bg-blue-50 border border-blue-100 rounded-lg">
                                <h4 className="font-bold text-blue-800 text-center mb-4">以下の内容で登録しますか？</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="text-slate-500 font-medium">登録種別:</div>
                                    <div className="font-bold">{role === 'seller' ? '売り手 (資金調達)' : '買い手 (投資)'}</div>

                                    <div className="text-slate-500 font-medium">氏名:</div>
                                    <div className="font-bold">{name}</div>

                                    <div className="text-slate-500 font-medium">会社名 / 屋号:</div>
                                    <div className="font-bold">{companyName}</div>

                                    <div className="text-slate-500 font-medium mt-2">代表者名:</div>
                                    <div className="font-bold mt-2">{formData.representativeName || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.representativeName ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium">連絡先電話番号:</div>
                                    <div className="font-bold">{formData.phoneNumber || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.phoneNumber ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium mt-2">住所:</div>
                                    <div className="font-bold mt-2">{formData.address || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.address ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium">入金口座:</div>
                                    <div className="font-bold">{formData.bankAccountInfo || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.bankAccountInfo ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium mt-2">ログインID (Email):</div>
                                    <div className="font-bold mt-2">{email}</div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t border-blue-200 mt-4">
                                    <Button type="button" variant="ghost" onClick={() => setIsConfirming(false)} disabled={loading}>内容を修正する</Button>
                                    <Button type="button" className={`bg-primary hover:bg-primary/90 ${role === 'buyer' ? 'bg-[var(--color-gold)] hover:bg-amber-600' : ''}`} onClick={handleSubmit} disabled={loading}>
                                        {loading ? '登録処理中...' : 'この内容で登録する'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button type="submit" className={`w-full ${role === 'buyer' ? 'bg-[var(--color-gold)] hover:bg-amber-600 border-none' : ''}`}>
                                入力内容を確認する
                            </Button>
                        )}
                    </form>


                    <div className="mt-6 text-center text-sm text-slate-500">
                        すでにアカウントをお持ちの方は{' '}
                        <Link to="/login" className="text-primary font-bold hover:underline">
                            ログイン
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
