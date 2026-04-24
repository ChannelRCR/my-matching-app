import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Briefcase, Wallet, LineChart, Building2, User } from 'lucide-react';
import type { UserRole } from '../types';
import { fetchAddressFromZip } from '../utils/zipcode';
import { INDUSTRY_OPTIONS } from '../utils/constants';

const RequiredBadge = () => <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">必須</span>;
const ConditionalBadge = ({ text = "案件登録に必須" }: { text?: string }) => <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">{text}</span>;
const OptionalBadge = () => <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">任意</span>;

export const RegisterPage: React.FC = () => {
    const { signUp, user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ログイン済みの場合のリダイレクトガード
    useEffect(() => {
        if (authLoading) return;
        if (user) {
            if (profile) {
                navigate('/dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, profile, authLoading, navigate]);

    // Default role from URL ?role=seller or ?role=buyer
    const defaultRole = (searchParams.get('role') as UserRole) || 'seller';

    const [role, setRole] = useState<UserRole>(defaultRole);

    // Auth fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Basic profile fields
    const [companyName, setCompanyName] = useState('');

    // Detailed profile fields
    const [formData, setFormData] = useState({
        entityType: 'corporate' as 'corporate' | 'individual',
        hasNoTradeName: false,
        postalCode: '',
        companyNameKana: '',
        representativeNameKana: '',
        representativeName: '',
        contactPerson: '',
        address: '',
        bankAccountInfo: '',
        phone: '',
        appealPoint: '',
        industry: '',
        industryOther: '',
        budget: '',
        corporateNumber: '',
        websiteUrl: '',
        idDocumentUrl: '',
        idDocumentFile: null as File | null,
    });

    const [privacySettings, setPrivacySettings] = useState({
        companyName: true,
        representativeName: true,
        contactPerson: false,
        address: false,
        bankAccountInfo: false,
        phone: false,
        email: false,
        corporateNumber: false,
        websiteUrl: false,
        idDocumentUrl: false,
        idDocumentFile: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleChange = (field: keyof typeof formData, value: string | boolean | File | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        handleChange('postalCode', val);

        // Only fetch if exactly 7 digits (with or without hyphen)
        const cleaned = val.replace(/[^\d]/g, '');
        if (cleaned.length === 7) {
            const fetchedAddress = await fetchAddressFromZip(cleaned);
            if (fetchedAddress) {
                handleChange('address', fetchedAddress);
            }
        }
    };

    const togglePrivacy = (field: keyof typeof privacySettings) => {
        setPrivacySettings(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        
        if ('checkValidity' in e.currentTarget) {
            const form = e.currentTarget as HTMLFormElement;
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
        }

        setLoading(true);
        setError(null);

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Pre-validation
        if (!email || !password || !companyName) {
            setError('必須項目（名称、メールアドレス、パスワード）が入力されていません。');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください');
            setLoading(false);
            return;
        }

        const { error: signUpError } = await signUp(email, password, role, {
            name: companyName, // Temporary reference name
            companyName: companyName,
        });

        if (signUpError) {
            console.error(signUpError);
            const errObj = signUpError as { message?: string, status?: number };
            if (errObj.message?.includes('already registered') || errObj.message?.includes('already in use') || errObj.status === 422) {
                setError('このメールアドレスは既に登録されています。ログインするか、別のアドレスを使用してください。');
            } else {
                setError(`登録に失敗しました: ${errObj.message}`);
            }
            setLoading(false);
        } else {
            // Success
            setSuccessMessage("ご入力いただいたメールアドレスに確認リンクを送信しました。メール内のリンクをクリックし、プロフィール設定（本登録）へお進みください。");
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-primary tracking-tight mb-8">
                <Briefcase className="h-8 w-8" />
                <span>FactorMatch</span>
            </Link>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-center">新規登録</CardTitle>
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
                        まずはアカウントを作成してください。本登録および詳細プロフィールの入力は、<strong>メール確認後の次のステップ</strong>でおこないます。
                    </div>

                    {successMessage ? (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-3xl">
                                ✉️
                            </div>
                            <h3 className="font-bold text-lg text-emerald-800">メールを確認してください</h3>
                            <p className="text-emerald-700 font-medium">
                                {successMessage}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700">基本情報（仮）</h3>
                            <Input
                                label={<>法人名または屋号／氏名 <RequiredBadge /></>}
                                placeholder="例 〇〇株式会社 / 〇〇商会 / 山田 太郎"
                                value={companyName}
                                maxLength={50}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="font-bold text-slate-700 mb-2">ログイン情報</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={<>メールアドレス <span className="text-xs text-slate-500 font-normal">※ログインIDとなります。</span><RequiredBadge /></>}
                                    type="email"
                                    value={email}
                                    maxLength={50}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <div className="space-y-2">
                                    <Input
                                        label={<>パスワード (6文字以上)<RequiredBadge /></>}
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        maxLength={100}
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

                        <Button type="submit" className={`w-full ${role === 'buyer' ? 'bg-[var(--color-gold)] hover:bg-amber-600 border-none' : ''}`} disabled={loading}>
                            {loading ? '処理中...' : 'アカウントを作成して確認メールを送信'}
                        </Button>
                    </form>
                    )}


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
