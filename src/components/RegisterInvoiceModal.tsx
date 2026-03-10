import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import type { Invoice } from '../types';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { translateCompanySize } from '../utils/translations';
import { INDUSTRY_OPTIONS, CLAIM_TYPE_OPTIONS } from '../utils/constants';
import { fetchAddressFromZip } from '../utils/zipcode';

interface RegisterInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RegisterInvoiceModal: React.FC<RegisterInvoiceModalProps> = ({ isOpen, onClose }) => {
    const { addInvoice } = useData();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [saleMode, setSaleMode] = useState<'full' | 'partial'>('full');
    const [formData, setFormData] = useState({
        amount: '',
        sellingAmount: '',
        dueDate: '',
        debtorEntityType: 'corporate' as 'corporate' | 'individual',
        debtorPostalCode: '',
        debtorName: '',
        debtorAddress: '',
        isClientNamePublic: false,
        isClientAddressPublic: false,
        industry: '',
        industryOther: '',
        companySize: 'SMB', // Default
        companyCredit: '',
        claimType: '売掛金（商品代金）',
        claimTypeOther: '',
        requestedAmount: '', // Manual input
    });
    const [evidenceFile, setEvidenceFile] = useState<{ file: File, url: string } | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Convert full-width numbers to half-width numbers
        const halfWidthValue = value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
        const rawValue = halfWidthValue.replace(/[^0-9]/g, '');
        const formatted = rawValue ? Number(rawValue).toLocaleString() : '';
        setFormData(prev => ({ ...prev, [name]: formatted }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setEvidenceFile({ file, url });
        }
    };

    const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, debtorPostalCode: val }));

        const cleaned = val.replace(/[^\d]/g, '');
        if (cleaned.length === 7) {
            const fetchedAddress = await fetchAddressFromZip(cleaned);
            if (fetchedAddress) {
                setFormData(prev => ({ ...prev, debtorAddress: fetchedAddress }));
            }
        }
    };

    const handleRemoveFile = () => {
        if (evidenceFile) {
            URL.revokeObjectURL(evidenceFile.url);
            setEvidenceFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check
        if (!formData.amount || !formData.dueDate || !formData.debtorName || !formData.industry) {
            alert('必須項目を入力してください');
            return;
        }

        const amountNum = Number(formData.amount.replace(/,/g, ''));
        const sellingAmountNum = Number(formData.sellingAmount.replace(/,/g, ''));
        const requestedAmountNum = Number(formData.requestedAmount.replace(/,/g, ''));

        const actualSellingAmount = saleMode === 'full' ? amountNum : sellingAmountNum;

        if (saleMode === 'partial' && actualSellingAmount > amountNum) {
            alert('売却対象金額は額面金額以下に設定してください');
            return;
        }

        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        // Upload evidence to Supabase Storage if present
        let finalEvidenceUrl = undefined;
        let finalEvidenceName = undefined;

        if (evidenceFile && user) {
            // Upload to Supabase bucket 'evidence'
            const fileExt = evidenceFile.file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('evidences')
                .upload(filePath, evidenceFile.file);

            if (uploadError) {
                console.error("Upload Error:", uploadError);
                alert(`アップロードに失敗しました: ${uploadError.message || '不明なエラー'}`);
                setIsConfirming(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('evidences')
                .getPublicUrl(filePath);

            finalEvidenceUrl = publicUrlData.publicUrl;
            finalEvidenceName = evidenceFile.file.name;
        }

        const newInvoice: Invoice = {
            id: `inv_${Date.now()}`,
            // sellerId will be added by addInvoice in DataContext
            sellerId: '',
            amount: amountNum,
            sellingAmount: actualSellingAmount,
            dueDate: formData.dueDate,
            debtorEntityType: formData.debtorEntityType as any,
            debtorPostalCode: formData.debtorPostalCode,
            debtorName: formData.debtorName,
            debtorAddress: formData.debtorAddress,
            isClientNamePublic: formData.isClientNamePublic,
            isClientAddressPublic: formData.isClientAddressPublic,
            industry: formData.industry,
            industryOther: formData.industryOther,
            companySize: formData.companySize as any,
            companyCredit: formData.companyCredit,
            claimType: formData.claimType,
            claimTypeOther: formData.claimTypeOther,
            status: 'open',
            requestedAmount: requestedAmountNum, // Manual input
            evidenceUrl: finalEvidenceUrl,
            evidenceName: finalEvidenceName,
        };

        const success = await addInvoice(newInvoice);

        if (success) {
            // Reset and close
            setSaleMode('full');
            setFormData({
                amount: '',
                sellingAmount: '',
                dueDate: '',
                debtorEntityType: 'corporate',
                debtorPostalCode: '',
                debtorName: '',
                debtorAddress: '',
                isClientNamePublic: false,
                isClientAddressPublic: false,
                industry: '',
                industryOther: '',
                companySize: 'SMB',
                companyCredit: '',
                claimType: '売掛金（商品代金）',
                claimTypeOther: '',
                requestedAmount: '',
            });
            setEvidenceFile(null);
            setIsConfirming(false);
            onClose();
            alert('案件を登録しました！');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>新規売掛金の登録</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="請求書額面 (円) *"
                                    name="amount"
                                    type="text"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    placeholder="例: 1,000,000"
                                    required
                                />
                                <p className="text-xs text-red-500 mt-1 font-bold">※ 金額は半角数字で入力してください。</p>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 block">売却対象</label>
                                <div className="flex items-center gap-6 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="saleMode"
                                            value="full"
                                            checked={saleMode === 'full'}
                                            onChange={() => setSaleMode('full')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">全額売却</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="saleMode"
                                            value="partial"
                                            checked={saleMode === 'partial'}
                                            onChange={() => setSaleMode('partial')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">一部売却</span>
                                    </label>
                                </div>
                                {saleMode === 'partial' && (
                                    <div className="w-1/2">
                                        <Input
                                            label="売却対象金額 (円) *"
                                            name="sellingAmount"
                                            type="text"
                                            value={formData.sellingAmount}
                                            onChange={handleAmountChange}
                                            placeholder="例: 500,000"
                                            required={saleMode === 'partial'}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">※額面より小さい金額を設定してください</p>
                                        <p className="text-xs text-red-500 mt-1 font-bold">※ 金額は半角数字で入力してください。</p>
                                    </div>
                                )}
                            </div>

                            <Input
                                label="入金期日 *"
                                name="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={handleInputChange}
                                required
                            />

                            <div className="space-y-4 md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-lg mt-2 mb-2">
                                <h4 className="font-bold text-slate-700 text-sm mb-2">取引先（売掛先）情報</h4>

                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="debtorEntityType" value="corporate" checked={formData.debtorEntityType === 'corporate'} onChange={handleInputChange} className="text-primary focus:ring-primary" />
                                        <span className="text-sm font-medium">法人</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="debtorEntityType" value="individual" checked={formData.debtorEntityType === 'individual'} onChange={handleInputChange} className="text-primary focus:ring-primary" />
                                        <span className="text-sm font-medium">個人（個人事業主）</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <Input
                                            label={formData.debtorEntityType === 'corporate' ? "取引先企業名 *" : "取引先屋号/氏名 *"}
                                            name="debtorName"
                                            value={formData.debtorName}
                                            onChange={handleInputChange}
                                            placeholder={formData.debtorEntityType === 'corporate' ? "例: 株式会社○○..." : "例: 山田 太郎"}
                                            required
                                        />
                                        <div className="mt-2 flex items-center">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="isClientNamePublic"
                                                    checked={formData.isClientNamePublic}
                                                    onChange={handleInputChange}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <span className="text-sm text-slate-600 font-medium">企業名/氏名を全体に公開する</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Input
                                                label="取引先郵便番号"
                                                name="debtorPostalCode"
                                                value={formData.debtorPostalCode}
                                                onChange={handlePostalCodeChange}
                                                placeholder="例: 1000001"
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                label="取引先所在地"
                                                name="debtorAddress"
                                                value={formData.debtorAddress}
                                                onChange={handleInputChange}
                                                placeholder="例: 東京都千代田区..."
                                            />
                                            <div className="mt-2 flex items-center">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="isClientAddressPublic"
                                                        checked={formData.isClientAddressPublic}
                                                        onChange={handleInputChange}
                                                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                                    />
                                                    <span className="text-sm text-slate-600 font-medium">所在地を全体に公開する</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">債権の種類 *</label>
                                        <select
                                            name="claimType"
                                            value={formData.claimType}
                                            onChange={handleInputChange}
                                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            {CLAIM_TYPE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        {formData.claimType === 'その他' && (
                                            <Input name="claimTypeOther" value={formData.claimTypeOther} onChange={handleInputChange} placeholder="具体的な債権の種類を入力" required />
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">取引先企業の業種 *</label>
                                        <select
                                            name="industry"
                                            value={formData.industry}
                                            onChange={handleInputChange}
                                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            required
                                        >
                                            <option value="" disabled>業種を選択してください</option>
                                            {INDUSTRY_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        {formData.industry === 'その他' && (
                                            <Input name="industryOther" value={formData.industryOther} onChange={handleInputChange} placeholder="具体的な業種を入力" required />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">取引先企業の規模</label>
                                <select
                                    name="companySize"
                                    value={formData.companySize}
                                    onChange={handleInputChange}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="Listed">上場企業</option>
                                    <option value="Large">大手企業（資本金1億以上、従業員1000人以上）</option>
                                    <option value="SMB">中小企業</option>
                                    <option value="Individual">個人（企業）</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">※売却対象の取引先企業について選択してください</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    売却希望額 (円) *
                                    <span className="ml-2 text-xs font-normal text-red-500">※粗利を前提に無理のない設定としましょう。</span>
                                </label>
                                <Input
                                    name="requestedAmount"
                                    type="text"
                                    value={formData.requestedAmount}
                                    onChange={handleAmountChange}
                                    placeholder="例: 900,000"
                                    required
                                />
                                <p className="text-xs text-red-500 mt-1 font-bold">※ 金額は半角数字で入力してください。</p>
                            </div>
                        </div>

                        {/* Evidence Upload Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">証拠書類（請求書等）のアップロード</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="evidence-upload"
                                />
                                {!evidenceFile ? (
                                    <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <div className="p-3 bg-blue-50 text-primary rounded-full">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">クリックしてファイルをアップロード</p>
                                        <p className="text-xs text-slate-500">PDF, JPG, PNG (最大 10MB)</p>
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {evidenceFile.file.type.startsWith('image/') ? (
                                                <img src={evidenceFile.url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                                            ) : (
                                                <div className="p-2 bg-red-50 text-red-500 rounded">
                                                    <FileText size={20} />
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{evidenceFile.file.name}</p>
                                                <p className="text-xs text-slate-500">{(evidenceFile.file.size / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">アピールポイント・信用情報</label>
                            <textarea
                                name="companyCredit"
                                value={formData.companyCredit}
                                onChange={handleInputChange}
                                placeholder="取引先の事業規模や過去の取引実績など（例：過去に3回取引があり、支払い遅延なし）"
                                className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {isConfirming ? (
                            <div className="space-y-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <h4 className="font-bold text-blue-800 text-center mb-4">以下の内容で登録しますか？</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-slate-500 font-medium">請求書額面:</div>
                                    <div className="font-bold">{formData.amount} 円</div>

                                    <div className="text-slate-500 font-medium">売却対象金額:</div>
                                    <div className="font-bold">{saleMode === 'full' ? formData.amount : formData.sellingAmount} 円 ({saleMode === 'full' ? '全額' : '一部'})</div>

                                    <div className="text-slate-500 font-medium">入金期日:</div>
                                    <div className="font-bold">{formData.dueDate}</div>

                                    <div className="text-slate-500 font-medium">取引先企業名:</div>
                                    <div className="font-bold">
                                        {formData.debtorName}
                                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${formData.isClientNamePublic ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {formData.isClientNamePublic ? '公開' : '非公開'}
                                        </span>
                                    </div>

                                    <div className="text-slate-500 font-medium">取引先所在地:</div>
                                    <div className="font-bold">
                                        {formData.debtorAddress || '（未入力）'}
                                        {formData.debtorAddress && (
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${formData.isClientAddressPublic ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {formData.isClientAddressPublic ? '公開' : '非公開'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-slate-500 font-medium">業種 / 企業規模:</div>
                                    <div className="font-bold">{formData.industry} / {translateCompanySize(formData.companySize)}</div>

                                    <div className="text-slate-500 font-medium mt-2">売却希望額:</div>
                                    <div className="font-bold text-red-600 mt-2">{formData.requestedAmount} 円</div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => setIsConfirming(false)}>内容を修正する</Button>
                                    <Button type="button" className="bg-primary hover:bg-primary/90" onClick={handleSubmit}>この内容で登録する</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={onClose}>キャンセル</Button>
                                <Button type="submit">出品内容を確認する</Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
