import React, { useState } from 'react';
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
        contactPerson: true,
        address: true,
        bankAccountInfo: true,
        phone: true,
        email: true,
        corporateNumber: true,
        websiteUrl: true,
        idDocumentUrl: true,
        idDocumentFile: true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const handleChange = (field: string, value: any) => {
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

    const togglePrivacy = (field: string) => {
        // @ts-ignore
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

        // Pre-validation
        if (!email || !password || !companyName || !formData.industry) {
            setError('必須項目（社名/屋号、業種、メールアドレス、パスワード）が入力されていません。');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください');
            setLoading(false);
            return;
        }

        if (role === 'seller') {
            if (!formData.phone || !formData.address) {
                setError('売り手（資金調達）として登録する場合、電話番号、住所は必須項目です。');
                setLoading(false);
                return;
            }
        } else {
            if (!formData.phone) {
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
            name: companyName, // Dummy name field for internal auth since it's deprecated
            companyName,
            ...formData,
            idDocumentFile: formData.idDocumentFile || undefined,
            email: email, // Set email derived from auth fields
            contactPerson: formData.contactPerson || (formData.entityType === 'corporate' ? companyName : formData.representativeName), // フォールバック: 法人の場合は法人名、個人の場合は代表者名を使用
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

    const renderInputWithPrivacy = (label: React.ReactNode, field: keyof typeof formData, placeholder: string = "", type: string = "text", customOnChange?: (e: React.ChangeEvent<HTMLInputElement>) => void) => {
        let maxLength = 50;
        if (field === 'appealPoint') maxLength = 1000;
        if (field === 'address' || field === 'bankAccountInfo') maxLength = 200;
        if (field === 'postalCode') maxLength = 8;

        return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                {(field in privacySettings) && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className={(privacySettings as any)[field] ? "text-blue-600 font-bold" : "text-slate-400"}>
                            {(privacySettings as any)[field] ? "公開" : "非公開"}
                        </span>
                        <button
                            type="button"
                            onClick={() => togglePrivacy(field as any)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${(privacySettings as any)[field] ? 'bg-primary' : 'bg-slate-200'
                                }`}
                        >
                            <span
                                className={`${(privacySettings as any)[field] ? 'translate-x-5' : 'translate-x-1'
                                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>
                )}
            </div>
            {type === 'textarea' ? (
                <textarea
                    value={String(formData[field] || '')}
                    maxLength={maxLength}
                    onChange={(e) => handleChange(field as string, e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none h-24 text-slate-800"
                />
            ) : type === 'file' ? (
                <div className="flexflex-col gap-2">
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (customOnChange) {
                                // @ts-ignore
                                customOnChange(e);
                            } else {
                                handleChange(field as string, file);
                            }
                        }}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {formData[field] && formData[field] instanceof File && (
                        <div className="text-xs text-slate-600 truncate mt-1">選択済み: {(formData[field] as any as File).name}</div>
                    )}
                </div>
            ) : (
                <Input
                    value={String(formData[field] || '')}
                    maxLength={maxLength}
                    onChange={customOnChange || ((e) => handleChange(field as string, e.target.value))}
                    placeholder={placeholder}
                    type={type}
                    required={field !== 'appealPoint' && field !== 'postalCode' && field !== 'companyNameKana' && field !== 'representativeNameKana' && field !== 'contactPerson' && field !== 'bankAccountInfo' && field !== 'corporateNumber' && field !== 'websiteUrl' && field !== 'idDocumentUrl' && field !== 'idDocumentFile'}
                />
            )}
        </div>
        );
    };

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

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                type="button"
                                onClick={() => handleChange('entityType', 'corporate')}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${formData.entityType === 'corporate'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                    }`}
                            >
                                <Building2 size={24} />
                                <span className="font-bold text-sm">法人 ({role === 'seller' ? '企業' : '法人投資家'})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleChange('entityType', 'individual');
                                    // Reset non-applicable fields
                                    handleChange('companyNameKana', '');
                                }}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${formData.entityType === 'individual'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                                    }`}
                            >
                                <User size={24} />
                                <span className="font-bold text-sm">個人 / 個人事業主</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.entityType === 'corporate' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700">法人名<RequiredBadge /></label>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={privacySettings.companyName ? "text-blue-600 font-bold" : "text-slate-400"}>
                                                    {privacySettings.companyName ? "公開" : "非公開"}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePrivacy('companyName')}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${privacySettings.companyName ? 'bg-primary' : 'bg-slate-200'}`}
                                                >
                                                    <span className={`${privacySettings.companyName ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                                </button>
                                            </div>
                                        </div>
                                        <Input
                                            placeholder="例 〇〇株式会社"
                                            value={companyName}
                                            maxLength={50}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Input
                                        label={<>法人名（フリガナ）<OptionalBadge /></>}
                                        placeholder="例 マルマル カブシキガイシャ"
                                        value={formData.companyNameKana}
                                        maxLength={50}
                                        onChange={(e) => handleChange('companyNameKana', e.target.value)}
                                    />
                                    <div className="space-y-1 mt-2">
                                        {renderInputWithPrivacy(<>法人番号（13桁）<OptionalBadge /></>, "corporateNumber", "例: 1234567890123")}
                                        <div className="text-xs text-slate-500 pb-2">
                                            ※国税庁指定の13桁の法人番号をご入力ください。（商業登記の会社法人等番号とは異なります）
                                            <a href="https://www.houjin-bangou.nta.go.jp/" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">
                                                [法人番号公表サイトで確認する]
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700">屋号<RequiredBadge /></label>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={privacySettings.companyName ? "text-blue-600 font-bold" : "text-slate-400"}>
                                                    {privacySettings.companyName ? "公開" : "非公開"}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePrivacy('companyName')}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${privacySettings.companyName ? 'bg-primary' : 'bg-slate-200'}`}
                                                >
                                                    <span className={`${privacySettings.companyName ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="例 〇〇商会"
                                                    value={formData.hasNoTradeName ? '屋号無し' : companyName}
                                                    maxLength={50}
                                                    onChange={(e) => setCompanyName(e.target.value)}
                                                    required
                                                    disabled={formData.hasNoTradeName}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const noTrade = !formData.hasNoTradeName;
                                                    handleChange('hasNoTradeName', noTrade);
                                                    if (noTrade) {
                                                        setCompanyName('屋号無し');
                                                        handleChange('companyNameKana', ''); // 屋号なしの場合はカナもクリア
                                                    } else {
                                                        setCompanyName('');
                                                    }
                                                }}
                                                className={`mb-[2px] whitespace-nowrap ${formData.hasNoTradeName ? "bg-slate-200 border-slate-300 hover:bg-slate-300" : ""}`}
                                            >
                                                {formData.hasNoTradeName ? "屋号を入れる" : "屋号なしで登録"}
                                            </Button>
                                        </div>
                                        <span className="text-xs text-slate-500 block mt-1">※屋号がない場合は「屋号なしで登録」を選択してください</span>
                                    </div>
                                    <Input
                                        label={<>屋号（フリガナ）<OptionalBadge /></>}
                                        placeholder="例 マルマル ショウカイ"
                                        value={formData.companyNameKana}
                                        maxLength={50}
                                        onChange={(e) => handleChange('companyNameKana', e.target.value)}
                                        disabled={formData.hasNoTradeName}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <h3 className="font-bold text-slate-700">詳細プロフィール情報</h3>

                            <div className="space-y-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">業種<RequiredBadge /></label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => handleChange('industry', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="" disabled>業種を選択してください</option>
                                        {INDUSTRY_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                {formData.industry === 'その他' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">業種（その他）<RequiredBadge /></label>
                                        <Input
                                            value={formData.industryOther}
                                            maxLength={50}
                                            onChange={(e) => handleChange('industryOther', e.target.value)}
                                            placeholder="具体的な業種を入力してください"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {renderInputWithPrivacy(<>{formData.entityType === 'corporate' ? "代表者名" : "代表者名（個人名）"}<RequiredBadge /></>, "representativeName", "例: 山田 太郎")}
                                    {renderInputWithPrivacy(<>代表者名（フリガナ）<OptionalBadge /></>, "representativeNameKana", "例: ヤマダ タロウ")}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-end gap-2">
                                        <div className="flex-1">
                                            {renderInputWithPrivacy(<>担当者名<OptionalBadge /></>, "contactPerson", "例: 佐藤 花子")}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mb-[2px]"
                                            onClick={() => {
                                                handleChange('contactPerson', formData.representativeName);
                                            }}
                                        >
                                            代表者名と同じ
                                        </Button>
                                    </div>
                                </div>

                                {renderInputWithPrivacy(<>連絡先電話番号<RequiredBadge /></>, "phone", "例: 03-1234-5678", "tel")}
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-1/3 flex items-end gap-1">
                                    <div className="flex-1">
                                        {renderInputWithPrivacy(<>郵便番号（7桁）<OptionalBadge /></>, "postalCode", "例: 1000001", "text", handlePostalCodeChange)}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mb-[2px] h-10 px-2 text-xs shrink-0 whitespace-nowrap"
                                        onClick={async () => {
                                            const cleaned = formData.postalCode.replace(/[^\d]/g, '');
                                            if (cleaned.length === 7) {
                                                const fetchedAddress = await fetchAddressFromZip(cleaned);
                                                if (fetchedAddress) handleChange('address', fetchedAddress);
                                                else alert('入力された郵便番号から住所が見つかりませんでした。');
                                            } else {
                                                alert('7桁の郵便番号を入力してください。');
                                            }
                                        }}
                                    >
                                        住所検索
                                    </Button>
                                </div>
                                <div className="w-2/3">
                                    {renderInputWithPrivacy(<>所在地{role === 'seller' ? <RequiredBadge /> : <OptionalBadge />}</>, "address", "例: 東京都千代田区...")}
                                </div>
                            </div>

                            {renderInputWithPrivacy(
                                <>{formData.entityType === 'corporate' ? "自社のアピールポイント（最大400文字）" : "貴殿のアピールポイント"}<OptionalBadge /></>,
                                "appealPoint",
                                role === 'buyer'
                                    ? "売り手に対するアピールポイントや、希望する買取条件等をお願いします。"
                                    : "買い手に対するアピールポイントを一言お願いします。",
                                "textarea"
                            )}

                            {role === 'buyer' && renderInputWithPrivacy(
                                <>想定買取可能額（予算）<OptionalBadge /></>,
                                "budget",
                                "例: 〜1,000万円"
                            )}

                            {renderInputWithPrivacy(<>自社ホームページURL<OptionalBadge /></>, "websiteUrl", "例: https://example.com/ (任意)", "url")}

                            {renderInputWithPrivacy(<>本人確認書類 (登記簿、身分証明書等)<ConditionalBadge text={role === 'seller' ? '案件登録に必須' : '取引に必須'} /></>, "idDocumentFile", "ファイルをアップロード", "file")}

                            {renderInputWithPrivacy(<>入金口座（本人名義）<ConditionalBadge text={role === 'seller' ? '案件登録に必須' : '取引に必須'} /></>, "bankAccountInfo", "例: ○○銀行 ××支店 普通 1234567")}
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

                        {isConfirming ? (
                            <div className="space-y-4 p-6 bg-blue-50 border border-blue-100 rounded-lg">
                                <h4 className="font-bold text-blue-800 text-center mb-4">以下の内容で登録しますか？</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="text-slate-500 font-medium">登録種別:</div>
                                    <div className="font-bold">
                                        {role === 'seller' ? '売り手 (資金調達)' : '買い手 (投資)'}
                                        ({formData.entityType === 'corporate' ? '法人' : '個人事業主'})
                                    </div>

                                    <div className="text-slate-500 font-medium">{formData.entityType === 'corporate' ? '法人名' : '屋号'}:</div>
                                    <div className="font-bold">
                                        {companyName}
                                        <span className="text-xs text-slate-400 font-normal ml-2">({privacySettings.companyName ? '公開' : '非公開'})</span>
                                    </div>

                                    <div className="text-slate-500 font-medium mt-2">代表者名:</div>
                                    <div className="font-bold mt-2">
                                        {formData.representativeName || '-'}
                                        {formData.representativeNameKana && <span className="text-xs text-slate-500 block">({formData.representativeNameKana})</span>}
                                        <span className="text-xs text-slate-400 font-normal">({privacySettings.representativeName ? '公開' : '非公開'})</span>
                                    </div>

                                    <div className="text-slate-500 font-medium">連絡先電話番号:</div>
                                    <div className="font-bold">{formData.phone || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.phone ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium mt-2">住所:</div>
                                    <div className="font-bold mt-2">{formData.address || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.address ? '公開' : '非公開'})</span></div>

                                    <div className="text-slate-500 font-medium">入金口座:</div>
                                    <div className="font-bold">{formData.bankAccountInfo || '-'} <span className="text-xs text-slate-400 font-normal">({privacySettings.bankAccountInfo ? '公開' : '非公開'})</span></div>

                                    {role === 'buyer' && (
                                        <>
                                            <div className="text-slate-500 font-medium mt-2">想定買取可能額（予算）:</div>
                                            <div className="font-bold mt-2">{formData.budget || '-'} <span className="text-xs text-slate-400 font-normal">({(privacySettings as any).budget === false ? '非公開' : '公開'})</span></div>
                                        </>
                                    )}

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
