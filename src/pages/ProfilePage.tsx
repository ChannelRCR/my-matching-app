import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Eye, EyeOff, Save, Loader2, Building2, User as UserIcon, MapPin, Phone, Mail, CreditCard, Activity } from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const { profile, updateProfile, loading: authLoading } = useAuth();
    const { getUserTrackRecord } = useData();

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        representativeName: '',
        contactPerson: '',
        address: '',
        phone: '',
        email: '',
        bankAccountInfo: '',
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
                companyName: profile.companyName || '',
                representativeName: profile.representativeName || '',
                contactPerson: profile.contactPerson || '',
                address: profile.address || '',
                phone: profile.phone || '',
                email: profile.email || '',
                bankAccountInfo: profile.bankAccountInfo || '',
            });

            if (profile.privacySettings) {
                setPrivacySettings((prev: any) => ({ ...prev, ...profile.privacySettings }));
            }
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const renderField = (name: keyof typeof formData, label: string, icon: React.ReactNode, type = "text", isTextarea = false) => {
        const isPublic = privacySettings[name];

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
                                value={formData[name]}
                                onChange={handleChange as any}
                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none h-24 text-slate-800"
                                placeholder={`${label}を入力`}
                            />
                        ) : (
                            <input
                                type={type}
                                name={name}
                                value={formData[name]}
                                onChange={handleChange}
                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-800"
                                placeholder={`${label}を入力`}
                            />
                        )}

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
                    </div>
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
                    {renderField('companyName', '法人名 / 屋号', <Building2 size={18} className="text-slate-400" />)}
                    {renderField('representativeName', '代表者名', <UserIcon size={18} className="text-slate-400" />)}
                    {renderField('contactPerson', '担当者名', <UserIcon size={18} className="text-slate-400" />)}
                    {renderField('address', '所在地', <MapPin size={18} className="text-slate-400" />)}
                    {renderField('phone', '電話番号', <Phone size={18} className="text-slate-400" />, 'tel')}
                    {renderField('email', '連絡先メールアドレス', <Mail size={18} className="text-slate-400" />, 'email')}

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
