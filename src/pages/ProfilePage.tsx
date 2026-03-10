import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Eye, EyeOff, Save, Loader2, Building2, User as UserIcon, MapPin, Phone, Mail, CreditCard, Activity, Target } from 'lucide-react';
import { fetchAddressFromZip } from '../utils/zipcode';
import { INDUSTRY_OPTIONS } from '../utils/constants';

export const ProfilePage: React.FC = () => {
    const { profile, updateProfile, loading: authLoading } = useAuth();
    const { getUserTrackRecord } = useData();

    // Form State
    const [formData, setFormData] = useState({
        entityType: 'corporate' as 'corporate' | 'individual',
        hasNoTradeName: false,
        postalCode: '',
        companyNameKana: '',
        representativeNameKana: '',
        companyName: '',
        representativeName: '',
        contactPerson: '',
        address: '',
        phone: '',
        email: '',
        bankAccountInfo: '',
        appealPoint: '',
        industry: '',
        industryOther: '',
    });

    // Privacy Settings State
    const [privacySettings, setPrivacySettings] = useState<any>({
        companyName: true,
        representativeName: true,
        contactPerson: false,
        address: false,
        phone: false,
        email: false,
        bankAccountInfo: false,
    });

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    // Initialize form from profile
    useEffect(() => {
        if (profile) {
            setFormData({
                entityType: profile.entityType || 'corporate',
                hasNoTradeName: profile.hasNoTradeName || false,
                postalCode: profile.postalCode || '',
                companyNameKana: profile.companyNameKana || '',
                representativeNameKana: profile.representativeNameKana || '',
                companyName: profile.companyName || '',
                representativeName: profile.representativeName || '',
                contactPerson: profile.contactPerson || '',
                address: profile.address || '',
                phone: profile.phone || '',
                email: profile.email || '',
                bankAccountInfo: profile.bankAccountInfo || '',
                appealPoint: profile.appealPoint || '',
                industry: profile.industry || '',
                industryOther: profile.industryOther || '',
            });

            if (profile.privacySettings) {
                setPrivacySettings((prev: any) => ({ ...prev, ...profile.privacySettings }));
            }
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, postalCode: val }));

        // Only fetch if exactly 7 digits (with or without hyphen)
        const cleaned = val.replace(/[^\d]/g, '');
        if (cleaned.length === 7) {
            const fetchedAddress = await fetchAddressFromZip(cleaned);
            if (fetchedAddress) {
                setFormData(prev => ({ ...prev, address: fetchedAddress }));
            }
        }
    };

    const handleTogglePrivacy = (field: string) => {
        setPrivacySettings((prev: any) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage({ text: '', type: '' });

        const updateData = {
            ...formData,
            privacySettings
        };

        const { error } = await updateProfile(updateData);

        setSaving(false);
        if (error) {
            setSaveMessage({ text: '保存に失敗しました: ' + error.message, type: 'error' });
        } else {
            setSaveMessage({ text: 'プロフィール情報を保存しました。', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        }
    };

    if (authLoading) return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
    if (!profile) return <div className="p-8 text-center text-slate-500">プロファイルが見つかりません。</div>;

    const renderField = (name: keyof typeof formData, label: string, icon: React.ReactNode, type = "text", isTextarea = false, customOnChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled?: boolean) => {
        const isPublic = privacySettings[name];
        const isPrivacyApplicable = name in privacySettings;

        return (
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className="sm:w-1/3 flex items-center gap-2 pt-2 text-slate-700 font-medium">
                    {icon}
                    <span>{label}</span>
                </div>

                <div className="sm:w-2/3 flex flex-col gap-3">
                    <div className="flex gap-3">
                        {isTextarea ? (
                            <textarea
                                name={name}
                                value={String(formData[name])}
                                onChange={handleChange}
                                disabled={disabled}
                                className={`flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none h-24 text-slate-800 ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                                placeholder={
                                    name === 'appealPoint'
                                        ? profile?.role === 'seller' ? "買い手に対するアピールポイントを一言お願いします。" : "売り手に対するアピールポイントや、希望する買取条件等をお願いします。"
                                        : `${label}を入力`
                                }
                            />
                        ) : (
                            <input
                                type={type}
                                name={name}
                                value={String(formData[name])}
                                onChange={customOnChange || handleChange}
                                disabled={disabled || (name === 'companyName' && formData.hasNoTradeName)}
                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                placeholder={`${label}を入力`}
                            />
                        )}

                        {isPrivacyApplicable && (
                            <button
                                type="button"
                                onClick={() => handleTogglePrivacy(name)}
                                className={`flex flex-col items-center justify-center w-16 h-10 sm:h-auto rounded-lg border transition-all ${isPublic
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                    : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                                    }`}
                                title={isPublic ? "公開中" : "非公開"}
                            >
                                {isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                                <span className="text-[10px] font-bold mt-1">{isPublic ? '公開' : '非公開'}</span>
                            </button>
                        )}
                    </div>
                    {disabled && name === 'email' && (
                        <span className="text-xs text-slate-400">ログインIDとして使用しているため変更できません。</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">プロフィール設定</h1>
                <p className="text-slate-500 mt-2">
                    登録情報および、買い手・売り手に対して公開する項目を設定できます。
                    <br />
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm mt-1 bg-emerald-50 px-2 py-0.5 rounded">
                        <Eye size={14} /> 「公開」に設定した項目のみ、取引相手の画面に表示されます。
                    </span>
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-primary" size={20} />
                        基本情報
                    </h2>
                    <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600">
                        {profile.role === 'seller' ? '売り手アカウント' : '買い手アカウント'}
                    </div>
                </div>

                <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Activity size={14} />
                            プラットフォーム取引実績
                        </span>
                        <span className="text-sm text-slate-600">
                            {profile.role === 'seller' ? '完了した売却取引数' : '完了した購入・回収取引数'}
                        </span>
                    </div>
                    <div className="text-2xl font-black text-blue-700 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                        {getUserTrackRecord(profile.id, profile.role === 'buyer' ? 'buyer' : 'seller')} <span className="text-sm font-medium text-slate-500">件</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <div className="sm:w-1/3 flex items-center gap-2 pt-2 text-slate-700 font-medium">
                            <Building2 size={18} className="text-slate-400" />
                            <span>事業者種別</span>
                        </div>
                        <div className="sm:w-2/3 flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all opacity-70 cursor-not-allowed ${formData.entityType === 'corporate' ? 'border-primary bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                <input type="radio" name="entityType" value="corporate" checked={formData.entityType === 'corporate'} disabled className="sr-only" />
                                <Building2 size={18} /> 法人
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all opacity-70 cursor-not-allowed ${formData.entityType === 'individual' ? 'border-primary bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                <input type="radio" name="entityType" value="individual" checked={formData.entityType === 'individual'} disabled className="sr-only" />
                                <UserIcon size={18} /> 個人/個人事業主
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <div className="sm:w-1/3 flex items-center gap-2 pt-2 text-slate-700 font-medium">
                            <Building2 size={18} className="text-slate-400" />
                            <span>{formData.entityType === 'corporate' ? '法人名' : '屋号'}</span>
                        </div>
                        <div className="sm:w-2/3 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.hasNoTradeName ? '屋号無し' : formData.companyName}
                                    onChange={handleChange}
                                    disabled={formData.hasNoTradeName}
                                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder={formData.entityType === 'corporate' ? "例 〇〇株式会社" : "例 〇〇商会"}
                                />
                                {formData.entityType === 'individual' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const noTrade = !formData.hasNoTradeName;
                                            setFormData(prev => ({ ...prev, hasNoTradeName: noTrade, companyName: noTrade ? '屋号無し' : '' }));
                                        }}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.hasNoTradeName ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        {formData.hasNoTradeName ? "取消" : "屋号無し"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleTogglePrivacy('companyName')}
                                    className={`flex flex-col items-center justify-center w-16 h-10 sm:h-auto rounded-lg border transition-all ${privacySettings.companyName
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                        : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                                        }`}
                                >
                                    {privacySettings.companyName ? <Eye size={18} /> : <EyeOff size={18} />}
                                    <span className="text-[10px] font-bold mt-1">{privacySettings.companyName ? '公開' : '非公開'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {formData.entityType === 'corporate' ? (
                        renderField('companyNameKana', '法人名（フリガナ）', <Building2 size={18} className="text-slate-400" />)
                    ) : (
                        renderField('companyNameKana', '屋号（フリガナ）', <UserIcon size={18} className="text-slate-400" />)
                    )}

                    {renderField('representativeName', formData.entityType === 'corporate' ? '代表者名' : '代表者名（個人名）', <UserIcon size={18} className="text-slate-400" />)}
                    {renderField('representativeNameKana', '代表者名（フリガナ）', <UserIcon size={18} className="text-slate-400" />)}

                    {formData.entityType === 'corporate' && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <div className="sm:w-1/3 flex items-center gap-2 pt-2 text-slate-700 font-medium">
                                <UserIcon size={18} className="text-slate-400" />
                                <span>担当者名</span>
                            </div>
                            <div className="sm:w-2/3 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800"
                                        placeholder="例 佐藤 花子"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, contactPerson: formData.representativeName }))}
                                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors"
                                    >
                                        代表者と共通
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTogglePrivacy('contactPerson')}
                                        className={`flex flex-col items-center justify-center w-16 h-10 sm:h-auto rounded-lg border transition-all ${privacySettings.contactPerson
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                            : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                                            }`}
                                    >
                                        {privacySettings.contactPerson ? <Eye size={18} /> : <EyeOff size={18} />}
                                        <span className="text-[10px] font-bold mt-1">{privacySettings.contactPerson ? '公開' : '非公開'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <div className="sm:w-1/3 flex items-center gap-2 pt-2 text-slate-700 font-medium">
                            <Building2 size={18} className="text-slate-400" />
                            <span>業種</span>
                        </div>
                        <div className="sm:w-2/3 flex flex-col gap-3">
                            <select
                                name="industry"
                                value={formData.industry}
                                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800"
                            >
                                <option value="" disabled>業種を選択してください</option>
                                {INDUSTRY_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            {formData.industry === 'その他' && (
                                <input
                                    type="text"
                                    name="industryOther"
                                    value={formData.industryOther}
                                    onChange={(e) => setFormData(prev => ({ ...prev, industryOther: e.target.value }))}
                                    placeholder="具体的な業種を入力してください"
                                    className="px-4 py-2 mt-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800"
                                />
                            )}
                        </div>
                    </div>

                    {renderField('postalCode', '郵便番号（7桁）', <MapPin size={18} className="text-slate-400" />, 'text', false, handlePostalCodeChange)}
                    {renderField('address', '所在地', <MapPin size={18} className="text-slate-400" />)}
                    {renderField('phone', '電話番号', <Phone size={18} className="text-slate-400" />, 'tel')}
                    {renderField('email', '連絡先メールアドレス', <Mail size={18} className="text-slate-400" />, 'email', false, undefined, true)}

                    {renderField(
                        'appealPoint',
                        profile?.role === 'seller' ? "買い手へのアピールポイント" : "売り手へのアピールポイント",
                        <Target size={18} className="text-slate-400" />,
                        'text',
                        true
                    )}

                    {profile.role === 'seller' && (
                        renderField('bankAccountInfo', '振込先口座情報', <CreditCard size={18} className="text-slate-400" />, 'text', true)
                    )}

                    <div className="p-6 bg-slate-50/50 flex flex-col items-end gap-3">
                        {saveMessage.text && (
                            <div className={`text-sm font-bold flex items-center gap-2 ${saveMessage.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                                {saveMessage.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                                {saveMessage.text}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    設定を保存する
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
